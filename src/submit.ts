import { InlineKeyboard, type Api } from 'grammy'
import { config, isAdmin } from './config.ts'
import { now } from './db.ts'
import { log } from './log.ts'
import { analyzeGrants, newUnsafe, type PluginHeader } from './plugin-header.ts'
import { publishVersion, errText } from './publish.ts'
import { compareSemver, maxSemver } from './semver.ts'
import * as store from './store.ts'
import { esc, grantsBlock } from './text.ts'
import type { Description } from './validate.ts'

export interface Fields {
  id: string
  name: string
  author: string
  version: string
  description: Description
  icon: string
  changelog: string
}

export interface SubmitInput {
  userId: number
  file: { id: string; sha: string }
  header: PluginHeader | null
  fields: Fields
}

export type SubmitResult =
  | { kind: 'published'; queued: boolean }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }

/** why a (id, version) pair cannot be submitted by this user, or null */
export async function checkTarget(userId: number, id: string, ver: string | null): Promise<string | null> {
  const existing = await store.getPlugin(id)
  if (existing && existing.owner !== userId) return `id «${id}» уже занят другим автором`
  if (existing && ver) {
    const top = maxSemver(await store.liveVersionStrings(id))
    if (top && compareSemver(ver, top) <= 0) return `версия должна быть строго больше текущей (${top})`
  }
  return null
}

export function needsModeration(opts: {
  grants: string[] | null
  hasApproved: boolean
  previousGrants: string[][]
}): { required: boolean; reasons: string[] } {
  if (!config().moderation) return { required: false, reasons: [] }
  const reasons: string[] = []
  if (!opts.hasApproved) reasons.push('новый плагин')
  if (opts.grants === null) reasons.push('гранты неизвестны')
  const fresh = newUnsafe(opts.grants, opts.previousGrants)
  if (fresh.length) reasons.push(`новые опасные гранты: ${fresh.join(', ')}`)
  return { required: reasons.length > 0, reasons }
}

export async function submit(api: Api, input: SubmitInput): Promise<SubmitResult> {
  const { userId, file, header, fields: f } = input
  if (await store.isBanned(userId)) return { kind: 'error', message: 'Вы заблокированы' }

  if (!isAdmin(userId)) {
    const used = await store.countSubmissionsSince(userId, now() - 86400)
    if (used >= config().dailyLimit) return { kind: 'error', message: `Лимит: не больше ${config().dailyLimit} публикаций в сутки` }
  }

  const dup = await store.findBySha(file.sha)
  if (dup) return { kind: 'error', message: `Этот файл уже загружен: ${dup.pluginName} ${dup.version}` }

  const problem = await checkTarget(userId, f.id, f.version)
  if (problem) return { kind: 'error', message: problem }

  const created = await store.createPlugin({
    id: f.id,
    owner: userId,
    name: f.name,
    author: f.author,
    description: f.description,
    icon: f.icon,
  })
  if (!created && (await store.getPlugin(f.id))?.owner !== userId) return { kind: 'error', message: `id «${f.id}» уже занят другим автором` }

  const grants = header ? header.grants : null
  let version: store.Version
  try {
    version = await store.createVersion({
      pluginId: f.id,
      version: f.version,
      changelog: f.changelog,
      grants,
      sha256: file.sha,
      fileId: file.id,
      submitter: userId,
    })
  } catch (e) {
    if (created) await store.deletePlugin(f.id).catch(() => {})
    return { kind: 'error', message: /unique/i.test(errText(e)) ? 'Такая версия уже существует' : errText(e) }
  }

  const decision = needsModeration({
    grants,
    hasApproved: await store.hasApproved(f.id),
    previousGrants: await store.approvedGrants(f.id),
  })
  if (decision.required) {
    await notifyModerators(api, version, decision.reasons)
    return { kind: 'pending' }
  }

  try {
    const { queued } = await publishVersion(api, version.rid, 'pending')
    return { kind: 'published', queued }
  } catch (e) {
    await store.deleteVersion(version.rid).catch(() => {})
    if (created) await store.deletePlugin(f.id).catch(() => {})
    await alertAdmins(api, `Ошибка публикации ${f.id} ${f.version}: ${errText(e)}`)
    return { kind: 'error', message: errText(e) }
  }
}

export function modCard(v: store.Version, p: store.Plugin, reasons: string[]): string {
  const risk = analyzeGrants(v.grants)
  return [
    `📥 <b>Заявка:</b> ${esc(p.name)} <code>${esc(v.version)}</code>`,
    `id: <code>${esc(p.id)}</code> · автор: ${esc(p.author)} (<code>${v.submitter}</code>)`,
    reasons.length ? `Причина проверки: ${esc(reasons.join('; '))}` : '',
    grantsBlock(v.grants, risk),
    v.changelog ? `Changelog: ${esc(v.changelog)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function modKeyboard(rid: number): InlineKeyboard {
  return new InlineKeyboard().text('✅ Одобрить', `a:ok:${rid}`).text('❌ Отклонить', `a:no:${rid}`)
}

export async function notifyModerators(api: Api, v: store.Version, reasons: string[]): Promise<void> {
  const p = await store.getPlugin(v.pluginId)
  if (!p) return
  const cfg = config()
  const targets = cfg.modChatId ? [cfg.modChatId] : cfg.adminIds
  const sent: store.ModMsg[] = []
  for (const chat of targets) {
    try {
      const m = await api.sendDocument(chat, v.fileId, {
        caption: modCard(v, p, reasons),
        parse_mode: 'HTML',
        reply_markup: modKeyboard(v.rid),
      })
      sent.push({ chat, msg: m.message_id })
    } catch (e) {
      log('warn', 'cannot notify moderator', { chat, error: errText(e) })
    }
  }
  await store.setModMsgs(v.rid, sent)
  if (!sent.length) log('error', 'no moderator reachable', { rid: v.rid })
}

export async function alertAdmins(api: Api, text: string): Promise<void> {
  log('error', text)
  for (const id of config().adminIds) await api.sendMessage(id, `⚠️ ${text}`).catch(() => {})
}

/** replaces the keyboard of every moderator copy of a card with the final status */
export async function closeModCards(api: Api, v: store.Version, status: string): Promise<void> {
  const p = await store.getPlugin(v.pluginId)
  const base = p ? modCard(v, p, []) : ''
  for (const m of v.modMsgs) {
    await api
      .editMessageCaption(m.chat, m.msg, {
        caption: `${base}\n\n${status}`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      })
      .catch(() => {})
  }
}

export async function approve(api: Api, rid: number, modName: string): Promise<{ ok: boolean; message: string }> {
  const v = await store.getVersion(rid)
  if (!v || v.status !== 'pending') return { ok: false, message: 'Заявка уже обработана' }
  try {
    await publishVersion(api, rid, 'pending')
  } catch (e) {
    await alertAdmins(api, `Не удалось опубликовать ${v.pluginId} ${v.version}: ${errText(e)}`)
    return { ok: false, message: errText(e) }
  }
  await closeModCards(api, v, `✅ Одобрено ${esc(modName)}`)
  await api.sendMessage(v.submitter, `✅ Ваша версия ${v.pluginId} ${v.version} одобрена и опубликована.`).catch(() => {})
  return { ok: true, message: 'Одобрено' }
}

export async function reject(api: Api, rid: number, reason: string, modName: string): Promise<{ ok: boolean; message: string }> {
  const v = await store.getVersion(rid)
  if (!v || v.status !== 'pending') return { ok: false, message: 'Заявка уже обработана' }
  await store.setVersionStatus(rid, 'rejected', { rejectReason: reason })
  await closeModCards(api, v, `❌ Отклонено ${esc(modName)}: ${esc(reason)}`)
  await api
    .sendMessage(v.submitter, `❌ Версия ${v.pluginId} ${v.version} отклонена.\nПричина: ${reason}`)
    .catch(() => {})
  return { ok: true, message: 'Отклонено' }
}
