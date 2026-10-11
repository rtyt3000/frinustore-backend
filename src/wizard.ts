import { createHash } from 'node:crypto'
import { InlineKeyboard, type Context } from 'grammy'
import { config } from './config.ts'
import { analyzeGrants, decodeText, MAX_FILE_BYTES, parseHeader, type PluginHeader } from './plugin-header.ts'
import { compareSemver, maxSemver } from './semver.ts'
import * as store from './store.ts'
import { checkTarget, needsModeration, submit, type Fields } from './submit.ts'
import { esc, grantsBlock } from './text.ts'
import { nav, screen, showHome, Stale } from './ui.ts'
import {
  validateChangelog,
  validateDescription,
  validateIcon,
  validateId,
  validateName,
  validateVersion,
} from './validate.ts'

type Step = 'id' | 'name' | 'version' | 'description' | 'icon' | 'changelog'

interface Wiz {
  file: { id: string; sha: string; size: number; name: string }
  header: PluginHeader | null
  existing: boolean
  steps: Step[]
  i: number
  awaiting: boolean
  /** raw text of every field; validated again on use */
  f: Partial<Record<Step | 'author', string>>
}

const NEW_STEPS: Step[] = ['id', 'name', 'version', 'description', 'icon', 'changelog']
const EXISTING_STEPS: Step[] = ['id', 'version', 'changelog']

const LABEL: Record<Step, string> = {
  id: 'id плагина',
  name: 'Название',
  version: 'Версия',
  description: 'Описание',
  icon: 'Иконка',
  changelog: 'Changelog',
}

const HINT: Record<Step, string> = {
  id: 'Уникальный id в маркете: 3–64 символа [a-z0-9._-]. Лучше такой же, как @id в файле.',
  name: 'До 40 символов.',
  version: 'semver, например 1.2.0. Для нового выпуска должна быть строго больше текущей.',
  description: 'До 500 символов. Можно по языкам: строки «ru: …» и «en: …». Пустое описание допустимо.',
  icon: 'inu://имя, tg://emoji?id=… или tg://addstickers?set=…',
  changelog: 'До 300 символов, необязательно.',
}

/** field may be empty */
const OPTIONAL: Step[] = ['description', 'changelog']

// ---- entry points

export async function startPublish(ctx: Context, pluginRid?: number): Promise<void> {
  const uid = ctx.from!.id
  let title = '<b>Публикация плагина</b>'
  if (pluginRid !== undefined) {
    const p = await store.getPluginByRid(pluginRid)
    if (!p || (p.owner !== uid)) throw new Stale()
    title = `<b>Новая версия:</b> ${esc(p.name)}`
  }
  await store.setSession(uid, 'await_file', { pluginRid })
  await screen(
    ctx,
    `${title}\n\nПришлите файл <code>*.inu.js</code> документом (UTF-8, до 5 МБ).`,
    new InlineKeyboard().text('Отмена', 'w:cancel'),
  )
}

export async function cancelWizard(ctx: Context): Promise<void> {
  await store.clearSession(ctx.from!.id)
  await showHome(ctx)
}

export async function onDocument(ctx: Context): Promise<void> {
  const uid = ctx.from!.id
  const doc = ctx.message!.document!
  const session = await store.getSession(uid)
  const pluginRid = session?.state === 'await_file' ? (session.payload.pluginRid as number | undefined) : undefined

  const reject = (msg: string) => ctx.reply(`❌ ${msg}`, { reply_markup: nav(new InlineKeyboard()) })

  if (!/\.inu\.js$/i.test(doc.file_name ?? '')) return void (await reject('Нужен файл с расширением .inu.js'))
  if ((doc.file_size ?? 0) > MAX_FILE_BYTES) return void (await reject('Файл больше 5 МБ'))

  let buf: Uint8Array
  try {
    const f = await ctx.api.getFile(doc.file_id)
    const res = await fetch(`https://api.telegram.org/file/bot${config().botToken}/${f.file_path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    buf = new Uint8Array(await res.arrayBuffer())
  } catch {
    return void (await reject('Не удалось скачать файл, попробуйте ещё раз'))
  }
  if (buf.byteLength > MAX_FILE_BYTES) return void (await reject('Файл больше 5 МБ'))
  const text = decodeText(buf)
  if (!text.ok) return void (await reject(text.error))

  const sha = createHash('sha256').update(buf).digest('hex')
  const dup = await store.findBySha(sha)
  if (dup) return void (await reject(`Этот файл уже загружен: ${dup.pluginName} ${dup.version}`))

  const header = parseHeader(text.text)
  const profile = ctx.from!.username ?? ctx.from!.first_name
  const w: Wiz = {
    file: { id: doc.file_id, sha, size: buf.byteLength, name: doc.file_name! },
    header,
    existing: false,
    steps: NEW_STEPS,
    i: 0,
    awaiting: false,
    f: {
      id: header?.id,
      name: header?.name,
      author: header?.author ?? profile,
      version: header?.version,
      description: header?.description,
      icon: header?.icon ?? 'inu://bot',
    },
  }

  if (pluginRid !== undefined) {
    const p = await store.getPluginByRid(pluginRid)
    if (!p || p.owner !== uid) return void (await reject('Плагин не найден'))
    await adoptExisting(w, p)
    w.i = 1 // id is fixed
  }

  await ctx.reply(
    header
      ? '📄 Файл принят, заголовок разобран — подставил значения из него.'
      : '📄 Файл принят. Заголовок <code>==InuPlugin==</code> не разобран — заполните поля вручную; заявка пойдёт на ручную модерацию.',
    { parse_mode: 'HTML' },
  )
  await renderStep(ctx, w)
}

async function adoptExisting(w: Wiz, p: store.Plugin): Promise<void> {
  w.existing = true
  w.steps = EXISTING_STEPS
  w.f.id = p.id
  w.f.name = p.name
  w.f.author = p.author
  const top = maxSemver(await store.liveVersionStrings(p.id))
  const hv = w.header?.version
  w.f.version = hv && validateVersion(hv).ok && (!top || compareSemver(hv, top) > 0) ? hv : undefined
}

// ---- steps

async function save(ctx: Context, w: Wiz): Promise<void> {
  await store.setSession(ctx.from!.id, 'wiz', w)
}

async function renderStep(ctx: Context, w: Wiz, notice?: string): Promise<void> {
  const step = w.steps[w.i]
  if (!step) return renderCard(ctx, w)
  const value = w.f[step]
  const optional = OPTIONAL.includes(step)
  const prompt = !value && !optional ? true : w.awaiting
  if (prompt && !w.awaiting) w.awaiting = true

  const head = `<b>Шаг ${w.i + 1}/${w.steps.length}: ${LABEL[step]}</b>`
  let text = `${notice ? `⚠️ ${esc(notice)}\n\n` : ''}${head}\n${HINT[step]}`
  if (step === 'version' && w.existing) {
    const top = maxSemver(await store.liveVersionStrings(w.f.id!))
    if (top) text += `\nТекущая версия: <code>${esc(top)}</code>`
  }
  if (value) text += `\n\nТекущее значение:\n<code>${esc(value)}</code>`

  const kb = new InlineKeyboard()
  if (w.awaiting) {
    text += '\n\n✍️ Пришлите значение сообщением.'
    if (optional && !value) kb.text('Пропустить', 'w:skip')
  } else if (step === 'changelog') {
    kb.text('Добавить changelog', 'w:edit').text('Пропустить', 'w:skip')
  } else {
    kb.text('Оставить', 'w:keep').text('Изменить', 'w:edit')
  }
  kb.row().text('Отмена', 'w:cancel')
  await save(ctx, w)
  await screen(ctx, text, kb)
}

/** validates and stores one field; may switch the wizard to "new version of my plugin" mode */
async function applyStep(ctx: Context, w: Wiz, step: Step, raw: string): Promise<string | null> {
  const uid = ctx.from!.id
  switch (step) {
    case 'id': {
      const v = validateId(raw)
      if (!v.ok) return v.error
      const problem = await checkTarget(uid, v.value, null)
      if (problem) return problem
      w.f.id = v.value
      const own = await store.getPlugin(v.value)
      if (own && !w.existing) {
        await adoptExisting(w, own)
        return null
      }
      return null
    }
    case 'name': {
      const v = validateName(raw)
      if (!v.ok) return v.error
      w.f.name = v.value
      return null
    }
    case 'version': {
      const v = validateVersion(raw)
      if (!v.ok) return v.error
      const problem = await checkTarget(uid, w.f.id!, v.value)
      if (problem) return problem
      w.f.version = v.value
      return null
    }
    case 'description': {
      const v = validateDescription(raw)
      if (!v.ok) return v.error
      w.f.description = raw.trim()
      return null
    }
    case 'icon': {
      const v = validateIcon(raw)
      if (!v.ok) return v.error
      w.f.icon = v.value
      return null
    }
    case 'changelog': {
      const v = validateChangelog(raw)
      if (!v.ok) return v.error
      w.f.changelog = v.value
      return null
    }
  }
}

async function load(ctx: Context): Promise<Wiz> {
  const s = await store.getSession(ctx.from!.id)
  if (!s || s.state !== 'wiz') throw new Stale()
  return s.payload as Wiz
}

export async function wizAction(ctx: Context, action: string): Promise<string | void> {
  const w = await load(ctx)
  const step = w.steps[w.i]
  switch (action) {
    case 'keep': {
      if (!step) throw new Stale()
      const err = await applyStep(ctx, w, step, w.f[step] ?? '')
      if (err) {
        w.awaiting = true
        return renderStep(ctx, w, err)
      }
      w.i++
      w.awaiting = false
      return renderStep(ctx, w)
    }
    case 'edit': {
      w.awaiting = true
      return renderStep(ctx, w)
    }
    case 'skip': {
      if (!step || !OPTIONAL.includes(step)) throw new Stale()
      w.f[step] = ''
      w.i++
      w.awaiting = false
      return renderStep(ctx, w)
    }
    case 'go':
      return publish(ctx, w)
    default:
      throw new Stale()
  }
}

/** free text while the wizard waits for a value */
export async function wizText(ctx: Context, payload: Wiz, text: string): Promise<void> {
  const w = payload
  const step = w.steps[w.i]
  if (!step || !w.awaiting) {
    await ctx.reply('Используйте кнопки под сообщением мастера или /cancel.')
    return
  }
  const err = await applyStep(ctx, w, step, text)
  if (err) return renderStep(ctx, w, err)
  w.i++
  w.awaiting = false
  return renderStep(ctx, w)
}

// ---- card and publishing

function compose(w: Wiz): Fields {
  const description = validateDescription(w.f.description ?? '')
  return {
    id: w.f.id!,
    name: w.f.name!,
    author: w.f.author!,
    version: w.f.version!,
    description: description.ok ? description.value : '',
    icon: w.f.icon!,
    changelog: w.f.changelog ?? '',
  }
}

async function renderCard(ctx: Context, w: Wiz): Promise<void> {
  const f = compose(w)
  const grants = w.header ? w.header.grants : null
  const risk = analyzeGrants(grants)
  const warnings: string[] = []
  if (w.header?.id && w.header.id !== f.id)
    warnings.push(`@id в файле («${w.header.id}») не совпадает с id в маркете: приложение поставит это как другой плагин, а не обновит старый.`)
  if (w.header?.version && w.header.version !== f.version) warnings.push(`версия в файле («${w.header.version}») отличается от введённой.`)

  const decision = needsModeration({
    grants,
    hasApproved: await store.hasApproved(f.id),
    previousGrants: await store.approvedGrants(f.id),
  })

  const lines = [
    '<b>Проверьте публикацию</b>',
    `${w.existing ? 'Новая версия плагина' : 'Новый плагин'}: <b>${esc(f.name)}</b> <code>${esc(f.version)}</code>`,
    `id: <code>${esc(f.id)}</code>`,
    `автор: ${esc(f.author)}`,
    `иконка: <code>${esc(f.icon)}</code>`,
    w.f.description ? `описание: ${esc(w.f.description)}` : '',
    f.changelog ? `changelog: ${esc(f.changelog)}` : '',
    grantsBlock(grants, risk),
    ...warnings.map((x) => `⚠️ ${esc(x)}`),
    decision.required ? `\n🛡 Заявка уйдёт на модерацию (${esc(decision.reasons.join('; '))}).` : '\nВерсия будет опубликована сразу.',
  ]
  w.awaiting = false
  await save(ctx, w)
  await screen(
    ctx,
    lines.filter(Boolean).join('\n'),
    new InlineKeyboard().text('✅ Опубликовать', 'w:go').text('Отмена', 'w:cancel'),
  )
}

async function publish(ctx: Context, w: Wiz): Promise<string | void> {
  const uid = ctx.from!.id
  // the delete decides who got the click first, so a double tap cannot submit twice
  if (!(await store.clearSession(uid))) throw new Stale()
  await screen(ctx, '⏳ Публикую…')
  const f = compose(w)
  const result = await submit(ctx.api, { userId: uid, file: { id: w.file.id, sha: w.file.sha }, header: w.header, fields: f })
  const kb = new InlineKeyboard().text('📦 Мои плагины', 'p:list:0').row().text('⌂ Меню', 'm:home')
  if (result.kind === 'published') {
    await screen(
      ctx,
      `✅ <b>${esc(f.name)}</b> ${esc(f.version)} опубликован в @${config().channelUsername}.${result.queued ? '\nКаталог обновится в течение нескольких минут.' : ''}`,
      kb,
    )
  } else if (result.kind === 'pending') {
    await screen(ctx, `⏳ <b>${esc(f.name)}</b> ${esc(f.version)} отправлен на модерацию. Я сообщу о решении.`, kb)
  } else {
    await screen(ctx, `❌ ${esc(result.message)}`, kb)
  }
}

export type { Wiz }
