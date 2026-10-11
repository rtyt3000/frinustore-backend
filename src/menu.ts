import { InlineKeyboard, type Context } from 'grammy'
import { config, isAdmin } from './config.ts'
import { handleAdmin, onAdminText } from './admin.ts'
import { canManage } from './perms.ts'
import { requestRepoChange } from './repo-change.ts'
import { log } from './log.ts'
import { analyzeGrants } from './plugin-header.ts'
import { buildPreview } from './preview.ts'
import { addScreenshot, checkPhoto, deleteScreenshot, moveScreenshot } from './screenshots.ts'
import { PublishError, publishVersion, refreshAfterEdit, removePlugin, unpublishVersion, errText } from './publish.ts'
import * as store from './store.ts'
import { STATUS_ICON, STATUS_NAME, esc, grantsBlock, when } from './text.ts'
import { PAGE_SIZE, Stale, btn, clampPage, label, nav, pagerRow, screen, showHome } from './ui.ts'
import { cancelWizard, startPublish, wizAction, wizPhoto, wizText } from './wizard.ts'
import { descriptionToText, pickDescription, validateAuthor, validateDescription, validateIcon } from './validate.ts'

const num = (s: string | undefined): number => {
  const n = Number(s)
  if (!Number.isInteger(n)) throw new Stale()
  return n
}

/** owner of the plugin or a moderator; checked on every callback, not only when the button is drawn */
async function accessible(ctx: Context, rid: number): Promise<{ plugin: store.Plugin; owner: boolean }> {
  const plugin = await store.getPluginByRid(rid)
  const uid = ctx.from!.id
  if (!plugin) throw new Stale()
  const { allowed, owner } = canManage(uid, plugin.owner, isAdmin(uid))
  if (!allowed) throw new Stale()
  return { plugin, owner }
}

async function versionAccess(ctx: Context, vrid: number) {
  const v = await store.getVersion(vrid)
  if (!v) throw new Stale()
  const plugin = await store.getPlugin(v.pluginId)
  if (!plugin) throw new Stale()
  const uid = ctx.from!.id
  const { allowed, owner } = canManage(uid, plugin.owner, isAdmin(uid))
  if (!allowed) throw new Stale()
  return { v, plugin, owner }
}

export const modName = (ctx: Context): string => (ctx.from!.username ? `@${ctx.from!.username}` : ctx.from!.first_name)

// ---- router

/** returns an alert text to show on the callback, if any */
export async function handleCallback(ctx: Context): Promise<string | void> {
  const [scr, action, a1, a2] = ctx.callbackQuery!.data!.split(':')
  const uid = ctx.from!.id
  if (scr === 'x') return
  // opening any screen other than the wizard abandons a pending text/file prompt: no stuck states
  if (scr !== 'w' && !(scr === 'p' && action === 'repoyes')) await store.clearSession(uid)

  switch (scr) {
    case 'm':
      if (action === 'home') return showHome(ctx)
      if (action === 'help') return showHelp(ctx)
      break
    case 'w':
      if (action === 'pub') return startPublish(ctx)
      if (action === 'cancel') return cancelWizard(ctx)
      return wizAction(ctx, action!)
    case 'p':
      return pluginRoute(ctx, action!, a1, a2)
    case 'v':
      return versionRoute(ctx, action!, num(a1))
    case 's':
      return shotRoute(ctx, action!, num(a1), a2)
    case 'a':
      if (!isAdmin(uid)) throw new Stale()
      return handleAdmin(ctx, action!, a1)
  }
  throw new Stale()
}

async function pluginRoute(ctx: Context, action: string, a1?: string, a2?: string): Promise<string | void> {
  switch (action) {
    case 'list':
      return showMyPlugins(ctx, num(a1))
    case 'open':
      return showPlugin(ctx, num(a1))
    case 'newv': {
      const { plugin, owner } = await accessible(ctx, num(a1))
      if (!owner) throw new Stale()
      return startPublish(ctx, plugin.rid)
    }
    case 'desc':
    case 'icon':
    case 'auth': {
      const { plugin, owner } = await accessible(ctx, num(a1))
      if (!owner) throw new Stale()
      const field = action === 'desc' ? 'description' : action === 'icon' ? 'icon' : 'author'
      await store.setSession(ctx.from!.id, 'edit', { field, rid: plugin.rid })
      const current = field === 'description' ? descriptionToText(plugin.description) : field === 'icon' ? plugin.icon : plugin.author
      const hint =
        field === 'description'
          ? 'Пришлите описание (до 500 символов) или строки «ru: …» / «en: …».'
          : field === 'icon'
            ? 'Пришлите иконку: inu://имя, tg://emoji?id=… или tg://addstickers?set=…'
            : 'Пришлите отображаемое имя автора (до 40 символов).'
      return screen(
        ctx,
        `<b>${esc(plugin.name)}</b>\n${hint}${current ? `\n\nСейчас:\n<code>${esc(current)}</code>` : ''}`,
        new InlineKeyboard().text('Отмена', `p:open:${plugin.rid}`),
      )
    }
    case 'shots':
      return showShots(ctx, num(a1))
    case 'preview':
      return sendPreview(ctx, num(a1))
    case 'repo':
      return showRepo(ctx, num(a1))
    case 'repoedit': {
      const { plugin, owner } = await accessible(ctx, num(a1))
      if (!owner) throw new Stale()
      await store.setSession(ctx.from!.id, 'edit', { field: 'repo', rid: plugin.rid })
      const now = plugin.repoUrl ? `\n\nСейчас:\n${esc(plugin.repoUrl)}` : ''
      const note = plugin.repoUrl ? '\nУдалить ссылку нельзя, только заменить.' : ''
      return screen(
        ctx,
        `<b>${esc(plugin.name)}</b>\nПришлите ссылку на публичный репозиторий: https://github.com/автор/репозиторий (GitHub, GitLab, Codeberg, Bitbucket, SourceHut, Gitea).${note}${now}`,
        new InlineKeyboard().text('Отмена', `p:repo:${plugin.rid}`),
      )
    }
    case 'repoyes': {
      const { plugin, owner } = await accessible(ctx, num(a1))
      const s = await store.getSession(ctx.from!.id)
      if (!owner || !s || s.state !== 'repo_confirm' || s.payload.rid !== plugin.rid) throw new Stale()
      await store.clearSession(ctx.from!.id)
      return finishRepoChange(ctx, plugin, s.payload.url, true)
    }
    case 'vers':
      return showVersions(ctx, num(a1), num(a2 ?? '0'))
    case 'del': {
      const { plugin } = await accessible(ctx, num(a1))
      return screen(
        ctx,
        `Удалить плагин <b>${esc(plugin.name)}</b>?\nВсе версии пропадут из канала и каталога, счётчик установок обнулится.`,
        new InlineKeyboard().add(btn('Да, удалить', `p:delok:${plugin.rid}`, 'danger')).text('Нет', `p:open:${plugin.rid}`),
      )
    }
    case 'delok': {
      const { plugin } = await accessible(ctx, num(a1))
      try {
        await removePlugin(ctx.api, plugin.id)
      } catch (e) {
        if (e instanceof PublishError) return e.message
        throw e
      }
      return showMyPlugins(ctx, 0)
    }
    case 'hide': {
      if (!isAdmin(ctx.from!.id)) throw new Stale()
      const { plugin } = await accessible(ctx, num(a1))
      await store.updatePlugin(plugin.id, { hidden: !plugin.hidden })
      await refreshAfterEdit(ctx.api)
      return showPlugin(ctx, plugin.rid)
    }
  }
  throw new Stale()
}

async function versionRoute(ctx: Context, action: string, vrid: number): Promise<string | void> {
  const { v, plugin, owner } = await versionAccess(ctx, vrid)
  const mod = isAdmin(ctx.from!.id)
  switch (action) {
    case 'open':
      return showVersion(ctx, vrid)
    case 'hide':
    case 'show': {
      try {
        if (action === 'hide') {
          if (v.status !== 'approved') throw new Stale()
          await unpublishVersion(ctx.api, vrid, 'hide')
          // a moderator hiding someone else's version: the author cannot undo it
          if (!owner && mod) await store.setVersionStatus(vrid, 'hidden', { rejectReason: 'mod' })
        } else {
          if (v.status !== 'hidden') throw new Stale()
          if (v.rejectReason === 'mod' && !mod) return 'Версия скрыта модератором'
          await publishVersion(ctx.api, vrid, 'hidden')
        }
      } catch (e) {
        if (e instanceof PublishError) return e.message
        throw e
      }
      return showVersion(ctx, vrid)
    }
    case 'del':
      return screen(
        ctx,
        `Удалить версию <b>${esc(plugin.name)} ${esc(v.version)}</b>? Файл будет удалён из канала.`,
        new InlineKeyboard().add(btn('Да, удалить', `v:delok:${vrid}`, 'danger')).text('Нет', `v:open:${vrid}`),
      )
    case 'delok': {
      try {
        await unpublishVersion(ctx.api, vrid, 'delete')
      } catch (e) {
        if (e instanceof PublishError) return e.message
        throw e
      }
      return showVersions(ctx, plugin.rid, 0)
    }
  }
  throw new Stale()
}

// ---- screens

async function showHelp(ctx: Context): Promise<void> {
  const text = [
    '<b>Как опубликовать плагин</b>',
    '1. «Опубликовать плагин» → пришлите файл <code>*.inu.js</code> (UTF-8, до 5 МБ).',
    '2. Подтвердите id, название, версию, описание, иконку и changelog. Значения подставляются из заголовка файла, если он разобран.',
    '3. Новые плагины и версии с новыми <code>unsafe.*</code> грантами проверяет модератор.',
    '',
    '<b>Заголовок файла</b>',
    '<pre>// ==InuPlugin==\n// @name    My plugin\n// @id      me.myplugin\n// @version 1.0.0\n// @grant   fetch(example.com)\n// ==/InuPlugin==</pre>',
    '',
    '<b>Правила</b>',
    '<blockquote expandable>' +
      [
        '• Версия должна быть строго больше предыдущей (semver).',
        '• id занят первым автором; чужой id публиковать нельзя.',
        '• У каждого плагина должна быть ссылка на публичный репозиторий.',
        '• Скриншоты — до 8 фото, меньшая сторона от 320 px.',
        '• Держите <code>@id</code> в файле неизменным — по нему приложение решает, обновить плагин или поставить новый.',
        '• Гранты показывает само приложение при установке; в каталоге они только справочные.',
      ].join('\n') +
      '</blockquote>',
  ].join('\n')
  await screen(ctx, text, nav(new InlineKeyboard().url('📣 Открыть канал', `https://t.me/${config().channelUsername}`).row()))
}

export async function showMyPlugins(ctx: Context, page: number): Promise<void> {
  const uid = ctx.from!.id
  const first = await store.listPlugins({ owner: uid, offset: 0, limit: 1 })
  const p = clampPage(page, first.total)
  const { rows, total } = await store.listPlugins({ owner: uid, offset: p * PAGE_SIZE, limit: PAGE_SIZE })
  const kb = new InlineKeyboard()
  for (const pl of rows) kb.text(`${pl.hidden ? '🙈 ' : ''}${pl.name}`, `p:open:${pl.rid}`).row()
  pagerRow(kb, 'p:list', p, total)
  kb.add(btn('📤 Опубликовать плагин', 'w:pub', 'primary')).row()
  nav(kb)
  await screen(ctx, total ? `<b>Мои плагины</b> (${total})` : '<b>Мои плагины</b>\nПока пусто — опубликуйте первый.', kb)
}

export async function showPlugin(ctx: Context, rid: number): Promise<void> {
  const { plugin, owner } = await accessible(ctx, rid)
  const [{ rows, total }, installs] = await Promise.all([store.listVersions(plugin.id, { offset: 0, limit: 5 }), store.installCount(plugin.id)])
  const desc = pickDescription(plugin.description)
  const lines = [
    `<b>${esc(plugin.name)}</b>${plugin.hidden ? ' 🙈 скрыт' : ''}`,
    `id: <code>${esc(plugin.id)}</code>`,
    `автор: ${esc(plugin.author)}${owner ? '' : ` (<code>${plugin.owner}</code>)`}`,
    `установки: ${installs}`,
    plugin.repoUrl ? `репозиторий: ${esc(plugin.repoUrl)}` : '⚠️ репозиторий не указан — плагина нет в каталоге',
    desc ? `\n<blockquote expandable>${esc(desc)}</blockquote>` : '',
    '',
    total ? '<b>Версии</b>' : 'Версий пока нет.',
    ...rows.map((v) => `${STATUS_ICON[v.status] ?? '•'} <code>${esc(v.version)}</code> · ${STATUS_NAME[v.status] ?? v.status} · ${when(v.date)}`),
    total > rows.length ? `… и ещё ${total - rows.length}` : '',
  ]
  const kb = new InlineKeyboard()
  if (owner) {
    kb.text('Новая версия', `p:newv:${rid}`).text('Описание', `p:desc:${rid}`).row()
    kb.text('Иконка', `p:icon:${rid}`).text('Автор', `p:auth:${rid}`).row()
    kb.text('🔗 Репозиторий', `p:repo:${rid}`).text('🖼 Скриншоты', `p:shots:${rid}`).row()
    kb.text('👁 Предпросмотр', `p:preview:${rid}`).row()
  }
  if (!owner) kb.text('🖼 Скриншоты', `p:shots:${rid}`).row()
  kb.text('Версии', `p:vers:${rid}:0`).text('Удалить', `p:del:${rid}`).row()
  if (isAdmin(ctx.from!.id)) kb.text(plugin.hidden ? '👁 Показать плагин' : '🙈 Скрыть плагин', `p:hide:${rid}`).row()
  nav(kb, owner ? 'p:list:0' : 'a:all:0')
  await screen(ctx, lines.join('\n').replace(/\n{3,}/g, '\n\n'), kb)
}

async function shotRoute(ctx: Context, action: string, rid: number, arg?: string): Promise<string | void> {
  const { plugin, owner } = await accessible(ctx, rid)
  const shotOf = async () => {
    const shot = await store.getScreenshot(num(arg))
    if (!shot || shot.pluginId !== plugin.id) throw new Stale()
    return shot
  }
  switch (action) {
    case 'add': {
      if (!owner) throw new Stale()
      const count = (await store.listScreenshots(plugin.id)).length
      if (count >= store.MAX_SCREENSHOTS) return `Уже ${store.MAX_SCREENSHOTS} скриншотов — это максимум`
      await store.setSession(ctx.from!.id, 'shots', { rid })
      return screen(
        ctx,
        `<b>${esc(plugin.name)}</b>\nПришлите скриншоты как фото (не файлом): до 10 МБ, меньшая сторона не менее 320 px. Можно несколько подряд. Сейчас ${count}/${store.MAX_SCREENSHOTS}.`,
        new InlineKeyboard().text('Готово', `p:shots:${rid}`),
      )
    }
    case 'view': {
      const list = await store.listScreenshots(plugin.id)
      if (!list.length) return 'Скриншотов нет'
      if (list.length === 1) await ctx.replyWithPhoto(list[0]!.fileId)
      else await ctx.replyWithMediaGroup(list.map((s) => ({ type: 'photo' as const, media: s.fileId })))
      return
    }
    case 'left':
    case 'right': {
      if (!owner) throw new Stale()
      const shot = await shotOf()
      await moveScreenshot(ctx.api, plugin, shot.id, action === 'left' ? -1 : 1)
      return showShots(ctx, rid)
    }
    case 'del': {
      const shot = await shotOf()
      return screen(
        ctx,
        `Удалить скриншот №${shot.position + 1} плагина <b>${esc(plugin.name)}</b>? Фото будет удалено из канала.`,
        new InlineKeyboard().add(btn('Да, удалить', `s:delok:${rid}:${shot.id}`, 'danger')).text('Нет', `p:shots:${rid}`),
      )
    }
    case 'delok': {
      const shot = await shotOf()
      try {
        await deleteScreenshot(ctx.api, shot)
      } catch (e) {
        if (e instanceof PublishError) return e.message
        throw e
      }
      return showShots(ctx, rid)
    }
  }
  throw new Stale()
}

async function showShots(ctx: Context, rid: number): Promise<void> {
  const { plugin, owner } = await accessible(ctx, rid)
  const list = await store.listScreenshots(plugin.id)
  const lines = [
    `<b>${esc(plugin.name)}</b> — скриншоты (${list.length}/${store.MAX_SCREENSHOTS})`,
    list.length ? list.map((s, i) => `${i + 1}. ${s.msgId !== null ? '✅ в канале' : '⏳ ждёт одобрения плагина'}`).join('\n') : 'Скриншотов пока нет.',
  ]
  const kb = new InlineKeyboard()
  list.forEach((s, i) => {
    kb.add(label(`#${i + 1}`))
    if (owner && i > 0) kb.text('◀', `s:left:${rid}:${s.id}`)
    if (owner && i < list.length - 1) kb.text('▶', `s:right:${rid}:${s.id}`)
    kb.add(btn('🗑', `s:del:${rid}:${s.id}`, 'danger')).row()
  })
  if (owner && list.length < store.MAX_SCREENSHOTS) kb.text('➕ Добавить', `s:add:${rid}`)
  if (list.length) kb.text('👁 Показать', `s:view:${rid}`)
  kb.row()
  nav(kb, `p:open:${rid}`)
  await screen(ctx, lines.join('\n'), kb)
}

/** the plugin as a rich message; falls back to a plain summary where rich messages are unavailable */
async function sendPreview(ctx: Context, rid: number): Promise<string | void> {
  const { plugin } = await accessible(ctx, rid)
  const [{ rows }, shots, installs] = await Promise.all([store.listVersions(plugin.id), store.listScreenshots(plugin.id), store.installCount(plugin.id)])
  const rich = buildPreview({ plugin, installs, versions: rows, screenshots: shots, channelUsername: config().channelUsername })
  try {
    await ctx.api.sendRichMessage(ctx.chat!.id, rich)
  } catch (e) {
    log('warn', 'rich preview failed', { error: errText(e) })
    if (shots.length) await ctx.replyWithMediaGroup(shots.map((s) => ({ type: 'photo' as const, media: s.fileId }))).catch(() => {})
    return 'Предпросмотр недоступен в этом клиенте'
  }
}

async function showRepo(ctx: Context, rid: number): Promise<void> {
  const { plugin, owner } = await accessible(ctx, rid)
  const pending = await store.pendingRepoChange(plugin.id)
  const lines = [
    `<b>${esc(plugin.name)}</b> — репозиторий`,
    plugin.repoUrl ? esc(plugin.repoUrl) : '⚠️ Не указан. Без него плагина нет в каталоге.',
    plugin.repoWarning ? `⚠️ ${esc(plugin.repoWarning)}` : '',
    pending ? `\n⏳ На модерации: ${esc(pending.repoUrl)}` : '',
  ]
  const kb = new InlineKeyboard()
  if (owner && !pending) kb.text(plugin.repoUrl ? 'Изменить' : 'Указать', `p:repoedit:${rid}`).row()
  nav(kb, `p:open:${rid}`)
  await screen(ctx, lines.filter(Boolean).join('\n'), kb)
}

/** shared tail of the text flow and of the «Оставить» button */
async function finishRepoChange(ctx: Context, plugin: store.Plugin, url: string, confirmed: boolean): Promise<void> {
  const r = await requestRepoChange(ctx.api, plugin, url, ctx.from!.id, { confirmed })
  if (r.kind === 'error') {
    await store.setSession(ctx.from!.id, 'edit', { field: 'repo', rid: plugin.rid })
    await ctx.reply(`⚠️ ${r.message}\nПопробуйте ещё раз или откройте меню.`)
    return
  }
  if (r.kind === 'confirm') {
    await store.setSession(ctx.from!.id, 'repo_confirm', { rid: plugin.rid, url: r.url })
    await screen(
      ctx,
      `⚠️ ${esc(r.message)}\n${esc(r.url)}`,
      new InlineKeyboard().text('Оставить', `p:repoyes:${plugin.rid}`).text('Изменить', `p:repoedit:${plugin.rid}`),
    )
    return
  }
  if (r.kind === 'pending') await ctx.reply('⏳ Новый репозиторий отправлен на модерацию. До решения в каталоге остаётся прежняя ссылка.')
  await showRepo(ctx, plugin.rid)
}

async function showVersions(ctx: Context, rid: number, page: number): Promise<void> {
  const { plugin } = await accessible(ctx, rid)
  const first = await store.listVersions(plugin.id, { offset: 0, limit: 1 })
  const p = clampPage(page, first.total)
  const { rows, total } = await store.listVersions(plugin.id, { offset: p * PAGE_SIZE, limit: PAGE_SIZE })
  const kb = new InlineKeyboard()
  for (const v of rows) kb.text(`${STATUS_ICON[v.status] ?? '•'} ${v.version}`, `v:open:${v.rid}`).row()
  pagerRow(kb, `p:vers:${rid}`, p, total)
  nav(kb, `p:open:${rid}`)
  await screen(ctx, `<b>${esc(plugin.name)}</b> — версии (${total})`, kb)
}

async function showVersion(ctx: Context, vrid: number): Promise<void> {
  const { v, plugin } = await versionAccess(ctx, vrid)
  const lines = [
    `<b>${esc(plugin.name)}</b> <code>${esc(v.version)}</code>`,
    `${STATUS_ICON[v.status] ?? ''} ${STATUS_NAME[v.status] ?? v.status} · ${when(v.date)}`,
    v.rejectReason && v.status === 'rejected' ? `Причина: ${esc(v.rejectReason)}` : '',
    v.changelog ? `Changelog: ${esc(v.changelog)}` : '',
    grantsBlock(v.grants, analyzeGrants(v.grants)),
  ]
  const kb = new InlineKeyboard()
  if (v.status === 'approved') kb.text('🙈 Скрыть', `v:hide:${vrid}`)
  if (v.status === 'hidden') kb.text('👁 Показать', `v:show:${vrid}`)
  kb.text('Удалить', `v:del:${vrid}`).row()
  nav(kb, `p:vers:${plugin.rid}:0`)
  await screen(ctx, lines.filter(Boolean).join('\n'), kb)
}

// ---- photos

export async function handlePhoto(ctx: Context): Promise<void> {
  const uid = ctx.from!.id
  const s = await store.getSession(uid)
  if (s?.state === 'wiz') return wizPhoto(ctx, s.payload)
  if (s?.state === 'shots') {
    const { plugin, owner } = await accessible(ctx, s.payload.rid)
    if (!owner) throw new Stale()
    const check = checkPhoto(ctx.message!.photo)
    if (!check.ok) return void (await ctx.reply(`❌ ${check.error}`))
    const r = await addScreenshot(ctx.api, plugin, check)
    if (r.kind === 'error') return void (await ctx.reply(`⚠️ ${r.message}`))
    await store.setSession(uid, 'shots', s.payload) // keeps the 15 minute window open while photos keep coming
    await ctx.reply(
      `✅ Добавлено (${r.count}/${store.MAX_SCREENSHOTS})${r.published ? '' : ' — появится в канале после одобрения плагина'}.`,
      { reply_markup: new InlineKeyboard().text('Готово', `p:shots:${plugin.rid}`) },
    )
    return
  }
  await ctx.reply('Скриншоты добавляются в мастере публикации или в экране плагина → «Скриншоты».', {
    reply_markup: new InlineKeyboard().text('⌂ Меню', 'm:home'),
  })
}

// ---- free text

export async function handleText(ctx: Context): Promise<void> {
  const uid = ctx.from!.id
  const text = ctx.message!.text!
  const s = await store.getSession(uid)
  if (!s) {
    await ctx.reply('Не понял. Откройте меню:', { reply_markup: new InlineKeyboard().text('⌂ Меню', 'm:home') })
    return
  }
  switch (s.state) {
    case 'wiz':
      return wizText(ctx, s.payload, text)
    case 'await_file':
      await ctx.reply('Пришлите файл <code>.inu.js</code> документом или нажмите «Отмена» в меню.', { parse_mode: 'HTML' })
      return
    case 'edit':
      return applyEdit(ctx, s.payload.field, s.payload.rid, text)
    default:
      return onAdminText(ctx, s, text)
  }
}

async function applyEdit(ctx: Context, field: 'description' | 'icon' | 'author' | 'repo', rid: number, text: string): Promise<void> {
  const { plugin, owner } = await accessible(ctx, rid)
  if (!owner) throw new Stale()
  if (field === 'repo') {
    await store.clearSession(ctx.from!.id)
    return finishRepoChange(ctx, plugin, text, false)
  }
  const err = async (m: string) => void (await ctx.reply(`⚠️ ${m}\nПопробуйте ещё раз или откройте меню.`))
  if (field === 'description') {
    const v = validateDescription(text)
    if (!v.ok) return err(v.error)
    await store.updatePlugin(plugin.id, { description: v.value })
  } else if (field === 'icon') {
    const v = validateIcon(text)
    if (!v.ok) return err(v.error)
    await store.updatePlugin(plugin.id, { icon: v.value })
  } else {
    const v = validateAuthor(text)
    if (!v.ok) return err(v.error)
    await store.updatePlugin(plugin.id, { author: v.value })
  }
  await store.clearSession(ctx.from!.id)
  try {
    await refreshAfterEdit(ctx.api)
  } catch (e) {
    await ctx.reply(`Сохранено, но каталог не обновился: ${errText(e)}`)
  }
  await showPlugin(ctx, rid)
}
