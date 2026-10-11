import { InlineKeyboard, type Api } from 'grammy'
import { config } from './config.ts'
import { log } from './log.ts'
import { errText, refreshCatalog } from './publish.ts'
import { checkRepo, normalizeRepo, repoWarningText, type CheckDeps } from './repo.ts'
import * as store from './store.ts'
import { esc } from './text.ts'

export type RepoChangeResult =
  | { kind: 'error'; message: string }
  /** the host answered 404: ask the author to confirm */
  | { kind: 'confirm'; url: string; message: string }
  | { kind: 'applied' }
  | { kind: 'pending' }

/**
 * Replaces the repository of an existing plugin. With moderation on, a plugin that already has a
 * repository keeps it in the catalog until a moderator approves the new one. The link can only
 * be replaced, never removed.
 */
export async function requestRepoChange(
  api: Api,
  plugin: store.Plugin,
  raw: string,
  submitter: number,
  opts: { confirmed?: boolean; check?: CheckDeps } = {},
): Promise<RepoChangeResult> {
  const v = normalizeRepo(raw)
  if (!v.ok) return { kind: 'error', message: v.error }
  if (v.value === plugin.repoUrl) return { kind: 'error', message: 'Этот репозиторий уже указан' }
  if (await store.pendingRepoChange(plugin.id)) return { kind: 'error', message: 'Заявка на смену репозитория уже на рассмотрении' }

  let warning: string | null = null
  const status = await checkRepo(v.value, opts.check)
  if (status.status === 'not_found') {
    if (!opts.confirmed) return { kind: 'confirm', url: v.value, message: 'Репозиторий не найден (404). Точно эта ссылка?' }
    warning = 'репозиторий не найден (404), автор подтвердил ссылку'
  } else {
    warning = repoWarningText(status)
  }

  // first repository of a legacy plugin, or moderation switched off: nothing to protect, apply at once
  if (!plugin.repoUrl || !config().moderation) {
    await store.updatePlugin(plugin.id, { repoUrl: v.value, repoWarning: warning })
    await refreshCatalog(api).catch((e) => log('warn', 'catalog refresh after repo change failed', { error: errText(e) }))
    return { kind: 'applied' }
  }

  const change = await store.createRepoChange(plugin.id, v.value, warning, submitter)
  if (!change) return { kind: 'error', message: 'Заявка на смену репозитория уже на рассмотрении' }
  await notifyModerators(api, change, plugin)
  return { kind: 'pending' }
}

export function repoChangeCard(c: store.RepoChange, plugin: store.Plugin): string {
  return [
    `🔗 <b>Смена репозитория:</b> ${esc(plugin.name)}`,
    `id: <code>${esc(plugin.id)}</code> · автор: ${esc(plugin.author)} (<code>${c.submitter}</code>)`,
    `было: ${plugin.repoUrl ? `<a href="${esc(plugin.repoUrl)}">${esc(plugin.repoUrl)}</a>` : '—'}`,
    `станет: <a href="${esc(c.repoUrl)}">${esc(c.repoUrl)}</a>`,
    c.warning ? `⚠️ ${esc(c.warning)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export const repoChangeKeyboard = (id: number) => new InlineKeyboard().text('✅ Одобрить', `a:rok:${id}`).text('❌ Отклонить', `a:rno:${id}`)

async function notifyModerators(api: Api, c: store.RepoChange, plugin: store.Plugin): Promise<void> {
  const cfg = config()
  const sent: store.ModMsg[] = []
  for (const chat of cfg.modChatId ? [cfg.modChatId] : cfg.adminIds) {
    try {
      const m = await api.sendMessage(chat, repoChangeCard(c, plugin), {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: repoChangeKeyboard(c.id),
      })
      sent.push({ chat, msg: m.message_id })
    } catch (e) {
      log('warn', 'cannot notify moderator about repo change', { chat, error: errText(e) })
    }
  }
  await store.setRepoChangeMods(c.id, sent)
}

async function closeCards(api: Api, c: store.RepoChange, plugin: store.Plugin, status: string): Promise<void> {
  for (const m of c.modMsgs) {
    await api
      .editMessageText(m.chat, m.msg, `${repoChangeCard(c, plugin)}\n\n${status}`, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: { inline_keyboard: [] },
      })
      .catch(() => {})
  }
}

export async function approveRepoChange(api: Api, id: number, modName: string): Promise<{ ok: boolean; message: string }> {
  const c = await store.decideRepoChange(id, 'approved')
  if (!c) return { ok: false, message: 'Заявка уже обработана' }
  const plugin = await store.getPlugin(c.pluginId)
  if (!plugin) return { ok: false, message: 'Плагин удалён' }
  await store.updatePlugin(plugin.id, { repoUrl: c.repoUrl, repoWarning: c.warning })
  await refreshCatalog(api).catch((e) => log('warn', 'catalog refresh after repo approval failed', { error: errText(e) }))
  await closeCards(api, c, plugin, `✅ Одобрено ${esc(modName)}`)
  await api.sendMessage(c.submitter, `✅ Новый репозиторий плагина ${plugin.name} одобрен:\n${c.repoUrl}`).catch(() => {})
  return { ok: true, message: 'Одобрено' }
}

export async function rejectRepoChange(api: Api, id: number, reason: string, modName: string): Promise<{ ok: boolean; message: string }> {
  const c = await store.decideRepoChange(id, 'rejected', reason)
  if (!c) return { ok: false, message: 'Заявка уже обработана' }
  const plugin = await store.getPlugin(c.pluginId)
  if (plugin) await closeCards(api, c, plugin, `❌ Отклонено ${esc(modName)}: ${esc(reason)}`)
  await api
    .sendMessage(c.submitter, `❌ Смена репозитория плагина ${plugin?.name ?? c.pluginId} отклонена.\nПричина: ${reason}\nВ каталоге остаётся прежняя ссылка.`)
    .catch(() => {})
  return { ok: true, message: 'Отклонено' }
}
