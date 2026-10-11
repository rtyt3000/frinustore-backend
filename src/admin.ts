import { InlineKeyboard, InputFile, type Context } from 'grammy'
import { isAdmin } from './config.ts'
import { analyzeGrants } from './plugin-header.ts'
import { errText, refreshCatalog } from './publish.ts'
import * as store from './store.ts'
import { approve, modCard, modKeyboard, reject } from './submit.ts'
import { esc } from './text.ts'
import { PAGE_SIZE, Stale, clampPage, nav, pagerRow, screen } from './ui.ts'

const num = (s: string | undefined): number => {
  const n = Number(s)
  if (!Number.isSafeInteger(n)) throw new Stale()
  return n
}

const nameOf = (ctx: Context) => (ctx.from!.username ? `@${ctx.from!.username}` : ctx.from!.first_name)

export async function handleAdmin(ctx: Context, action: string, arg?: string): Promise<string | void> {
  switch (action) {
    case 'home':
      return showAdminHome(ctx)
    case 'q':
      return showQueue(ctx, num(arg ?? '0'))
    case 'card':
      return showCard(ctx, num(arg))
    case 'file': {
      const v = await store.getVersion(num(arg))
      if (!v) throw new Stale()
      await ctx.replyWithDocument(v.fileId)
      return
    }
    case 'ok': {
      const r = await approve(ctx.api, num(arg), nameOf(ctx))
      if (!r.ok) return r.message
      // a card in a moderator chat is already rewritten by approve(); a menu screen goes back to the queue
      if (!ctx.callbackQuery?.message || !('document' in ctx.callbackQuery.message)) return showQueue(ctx, 0)
      return
    }
    case 'no': {
      const v = await store.getVersion(num(arg))
      if (!v || v.status !== 'pending') return 'Заявка уже обработана'
      await store.setSession(ctx.from!.id, 'await_reject', { rid: v.rid })
      if (ctx.chat?.type !== 'private') return 'Откройте бота в личке и пришлите причину отклонения'
      return screen(ctx, `Пришлите причину отклонения для <code>${esc(v.pluginId)} ${esc(v.version)}</code>.`, new InlineKeyboard().text('Отмена', `a:card:${v.rid}`))
    }
    case 'all':
      return showAllPlugins(ctx, num(arg ?? '0'))
    case 'bans':
      return showBans(ctx, num(arg ?? '0'))
    case 'banadd':
      await store.setSession(ctx.from!.id, 'await_ban', {})
      return screen(ctx, 'Пришлите Telegram user id, которого нужно заблокировать.', new InlineKeyboard().text('Отмена', 'a:bans:0'))
    case 'banask':
      return askBan(ctx, num(arg))
    case 'banok':
      await store.setBanned(num(arg), true)
      return showBans(ctx, 0)
    case 'unban':
      await store.setBanned(num(arg), false)
      return showBans(ctx, 0)
    case 'svc':
      return showService(ctx)
    case 'rebuild':
      return doRebuild(ctx)
    case 'backup':
      return doBackup(ctx)
    case 'hook':
      return showWebhook(ctx)
  }
  throw new Stale()
}

export async function onAdminText(ctx: Context, s: store.Session, text: string): Promise<void> {
  if (!isAdmin(ctx.from!.id)) throw new Stale()
  if (s.state === 'await_reject') {
    const reason = text.trim().slice(0, 300)
    if (!reason) return void (await ctx.reply('Причина не может быть пустой.'))
    await store.clearSession(ctx.from!.id)
    const r = await reject(ctx.api, s.payload.rid, reason, nameOf(ctx))
    await ctx.reply(r.ok ? '❌ Отклонено, автору отправлено уведомление.' : r.message, { reply_markup: nav(new InlineKeyboard().text('Очередь', 'a:q:0').row()) })
    return
  }
  if (s.state === 'await_ban') {
    const id = Number(text.trim())
    if (!Number.isSafeInteger(id) || id <= 0) return void (await ctx.reply('Нужен числовой user id.'))
    await store.clearSession(ctx.from!.id)
    return askBan(ctx, id)
  }
  throw new Stale()
}

// ---- screens

async function showAdminHome(ctx: Context): Promise<void> {
  const [{ total: pending }, { total: plugins }] = await Promise.all([store.listPendingVersions(0, 1), store.listPlugins({ offset: 0, limit: 1 })])
  const kb = new InlineKeyboard()
    .text(`📥 Очередь заявок (${pending})`, 'a:q:0')
    .row()
    .text(`📚 Все плагины (${plugins})`, 'a:all:0')
    .row()
    .text('🚫 Баны', 'a:bans:0')
    .row()
    .text('🛠 Сервис', 'a:svc')
    .row()
  nav(kb)
  await screen(ctx, '<b>Модерация</b>', kb)
}

async function showQueue(ctx: Context, page: number): Promise<void> {
  const first = await store.listPendingVersions(0, 1)
  const p = clampPage(page, first.total)
  const { rows, total } = await store.listPendingVersions(p * PAGE_SIZE, PAGE_SIZE)
  const kb = new InlineKeyboard()
  for (const v of rows) kb.text(`${v.pluginName} ${v.version}`, `a:card:${v.rid}`).row()
  pagerRow(kb, 'a:q', p, total)
  nav(kb, 'a:home')
  await screen(ctx, total ? `<b>Очередь заявок</b> (${total})` : '<b>Очередь заявок</b>\nПусто.', kb)
}

async function showCard(ctx: Context, rid: number): Promise<void> {
  const v = await store.getVersion(rid)
  const p = v && (await store.getPlugin(v.pluginId))
  if (!v || !p) throw new Stale()
  const kb = new InlineKeyboard().text('📎 Файл', `a:file:${rid}`).row()
  if (v.status === 'pending') {
    const risk = analyzeGrants(v.grants)
    const reasons = [risk.unknown ? 'гранты неизвестны' : '', risk.unsafe.length ? 'unsafe-гранты' : ''].filter(Boolean)
    for (const b of modKeyboard(rid).inline_keyboard[0]!) kb.text(b.text, (b as { callback_data: string }).callback_data)
    kb.row()
    nav(kb, 'a:q:0')
    return screen(ctx, modCard(v, p, reasons), kb)
  }
  nav(kb, 'a:q:0')
  await screen(ctx, `${modCard(v, p, [])}\n\nСтатус: ${v.status}`, kb)
}

async function showAllPlugins(ctx: Context, page: number): Promise<void> {
  const first = await store.listPlugins({ offset: 0, limit: 1 })
  const p = clampPage(page, first.total)
  const { rows, total } = await store.listPlugins({ offset: p * PAGE_SIZE, limit: PAGE_SIZE })
  const kb = new InlineKeyboard()
  for (const pl of rows) kb.text(`${pl.hidden ? '🙈 ' : ''}${pl.name}`, `p:open:${pl.rid}`).row()
  pagerRow(kb, 'a:all', p, total)
  nav(kb, 'a:home')
  await screen(ctx, `<b>Все плагины</b> (${total})`, kb)
}

async function showBans(ctx: Context, page: number): Promise<void> {
  const first = await store.listBanned(0, 1)
  const p = clampPage(page, first.total)
  const { rows, total } = await store.listBanned(p * PAGE_SIZE, PAGE_SIZE)
  const kb = new InlineKeyboard()
  for (const u of rows) kb.text(`Разбанить ${u.name ?? u.id}`, `a:unban:${u.id}`).row()
  pagerRow(kb, 'a:bans', p, total)
  kb.text('➕ Забанить по id', 'a:banadd').row()
  nav(kb, 'a:home')
  await screen(ctx, `<b>Баны</b> (${total})`, kb)
}

export async function askBan(ctx: Context, userId: number): Promise<void> {
  await screen(
    ctx,
    `Заблокировать пользователя <code>${userId}</code>? Он не сможет публиковать плагины.`,
    new InlineKeyboard().text('Да, забанить', `a:banok:${userId}`).text('Нет', 'a:bans:0'),
  )
}

async function showService(ctx: Context): Promise<void> {
  const kb = new InlineKeyboard()
    .text('🔄 Пересобрать каталог', 'a:rebuild')
    .row()
    .text('💾 Бэкап', 'a:backup')
    .row()
    .text('📡 Статус webhook', 'a:hook')
    .row()
  nav(kb, 'a:home')
  await screen(ctx, '<b>Сервис</b>', kb)
}

export async function doRebuild(ctx: Context): Promise<string | void> {
  try {
    const r = await refreshCatalog(ctx.api, { force: true, waitMs: 15000 })
    return r === 'queued' ? 'Пересборка поставлена в очередь' : 'Каталог пересобран'
  } catch (e) {
    return `Ошибка: ${errText(e)}`.slice(0, 190)
  }
}

export async function doBackup(ctx: Context): Promise<string | void> {
  const dump = JSON.stringify(await store.dumpAll(), null, 1)
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  await ctx.replyWithDocument(new InputFile(new TextEncoder().encode(dump), `backup-${stamp}.json`))
}

async function showWebhook(ctx: Context): Promise<void> {
  const i = await ctx.api.getWebhookInfo()
  const text = [
    '<b>Webhook</b>',
    `url: <code>${esc(i.url || '—')}</code>`,
    `в очереди: ${i.pending_update_count}`,
    i.last_error_message ? `⚠️ последняя ошибка: ${esc(i.last_error_message)}` : '✅ ошибок нет',
  ].join('\n')
  await screen(ctx, text, nav(new InlineKeyboard(), 'a:svc'))
}
