import { InputFile, type Api } from 'grammy'
import { buildCatalog, catalogFingerprint, serializeCatalog } from './catalog.ts'
import { config } from './config.ts'
import { now } from './db.ts'
import { log } from './log.ts'
import * as store from './store.ts'

const LOCK = 'rebuild_lock'
const LOCK_TTL_SEC = 55

export const errText = (e: unknown): string =>
  (e as { description?: string })?.description ?? (e instanceof Error ? e.message : String(e))

const gone = (e: unknown) => /message to (edit|delete) not found|MESSAGE_ID_INVALID|message can't be deleted/i.test(errText(e))
const notModified = (e: unknown) => /message is not modified/i.test(errText(e))

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function writeCatalogMessage(api: Api, json: string): Promise<void> {
  const chat = config().channelId
  const media = () => new InputFile(new TextEncoder().encode(json), 'catalog.json')
  const id = await store.getMeta('catalog_msg_id')
  if (id) {
    try {
      await api.editMessageMedia(chat, Number(id), { type: 'document', media: media(), caption: '#catalog' })
      return
    } catch (e) {
      if (notModified(e)) return
      if (!gone(e)) throw e
    }
  }
  const sent = await api.sendDocument(chat, media(), { caption: '#catalog', disable_notification: true })
  await api.pinChatMessage(chat, sent.message_id, { disable_notification: true })
  await store.setMeta('catalog_msg_id', String(sent.message_id))
}

/** rebuilds catalog.json from the DB and edits the pinned message; the caller must hold the lock */
async function rebuildLocked(api: Api, force: boolean): Promise<boolean> {
  const [plugins, versions, installs] = await Promise.all([store.allPlugins(), store.allVersions(), store.installCounts()])
  const catalog = buildCatalog(
    plugins.map((p) => ({ id: p.id, name: p.name, author: p.author, description: p.description, icon: p.icon, hidden: p.hidden })),
    versions.map((v) => ({
      pluginId: v.pluginId,
      version: v.version,
      msgId: v.msgId,
      date: v.date,
      changelog: v.changelog,
      grants: v.grants,
      status: v.status,
    })),
    installs,
    now(),
  )
  const fingerprint = catalogFingerprint(catalog)
  if (!force && (await store.getMeta('catalog_hash')) === fingerprint && (await store.getMeta('catalog_msg_id'))) return false
  await writeCatalogMessage(api, serializeCatalog(catalog))
  await store.setMeta('catalog_hash', fingerprint)
  return true
}

export type RefreshResult = 'done' | 'unchanged' | 'queued'

/**
 * Serialized catalog rebuild. Waits up to `waitMs` for the lock; if it stays busy the rebuild is
 * queued as a coalesced job (the lock holder or the cron picks it up) and 'queued' is returned.
 */
export async function refreshCatalog(api: Api, opts: { force?: boolean; waitMs?: number } = {}): Promise<RefreshResult> {
  const token = crypto.randomUUID()
  const deadline = Date.now() + (opts.waitMs ?? 8000)
  while (!(await store.acquireLock(LOCK, LOCK_TTL_SEC, token))) {
    if (Date.now() >= deadline) {
      await store.enqueueJob('rebuild')
      return 'queued'
    }
    await sleep(400)
  }
  try {
    return (await rebuildLocked(api, !!opts.force)) ? 'done' : 'unchanged'
  } finally {
    await store.releaseLock(LOCK, token).catch(() => {})
  }
}

/** drains the coalesced job queue; used by cron */
export async function runJobs(api: Api): Promise<string[]> {
  const ran: string[] = []
  for (const job of await store.pendingJobs()) {
    if (job.type !== 'rebuild') {
      await store.finishJob(job.id, 'unknown job type')
      continue
    }
    const r = await refreshCatalog(api, { waitMs: 0 })
    if (r === 'queued') continue // lock busy; stays pending
    await store.finishJob(job.id)
    ran.push(`rebuild:${r}`)
  }
  return ran
}

const caption = (name: string, version: string, id: string) => `#plugin ${name} ${version}\n${id}`

export class PublishError extends Error {}

/**
 * Sends the stored file to the channel and rewrites the catalog. Atomic: on any failure the
 * uploaded file is deleted and the version goes back to `from`.
 */
export async function publishVersion(api: Api, rid: number, from: 'pending' | 'hidden'): Promise<{ queued: boolean }> {
  const v = await store.claimVersion(rid, from)
  if (!v) throw new PublishError('Версия уже обработана или недоступна')
  const p = await store.getPlugin(v.pluginId)
  if (!p) {
    await store.setVersionStatus(rid, from)
    throw new PublishError('Плагин не найден')
  }
  const chat = config().channelId
  let msgId: number | undefined
  try {
    const sent = await api.sendDocument(chat, v.fileId, { caption: caption(p.name, v.version, p.id), disable_notification: true })
    msgId = sent.message_id
    await store.setVersionStatus(rid, 'approved', { msgId, date: now() })
    const r = await refreshCatalog(api)
    return { queued: r === 'queued' }
  } catch (e) {
    log('error', 'publish failed', { rid, error: errText(e) })
    if (msgId !== undefined) await api.deleteMessage(chat, msgId).catch(() => {})
    await store.setVersionStatus(rid, from, { msgId: null }).catch(() => {})
    throw new PublishError(`Не удалось опубликовать: ${errText(e)}`)
  }
}

async function deleteChannelMessage(api: Api, msgId: number | null): Promise<void> {
  if (msgId === null) return
  try {
    await api.deleteMessage(config().channelId, msgId)
  } catch (e) {
    if (!gone(e)) throw e
  }
}

/**
 * Takes an approved version out of the channel and the catalog (hide or delete).
 * The catalog is rewritten first: it must never reference a deleted file.
 */
export async function unpublishVersion(api: Api, rid: number, mode: 'hide' | 'delete'): Promise<void> {
  const v = await store.getVersion(rid)
  if (!v) return
  if (v.status !== 'approved') {
    // never reached the channel: nothing to take down
    if (mode === 'delete') await store.deleteVersion(rid)
    else await store.setVersionStatus(rid, 'hidden')
    return
  }
  await store.setVersionStatus(rid, 'hidden')
  const r = await refreshCatalog(api, { waitMs: 20000 })
  if (r === 'queued') {
    await store.setVersionStatus(rid, 'approved')
    throw new PublishError('Каталог сейчас обновляется, попробуйте через минуту')
  }
  await deleteChannelMessage(api, v.msgId)
  await store.setVersionStatus(rid, 'hidden', { msgId: null })
  if (mode === 'delete') await store.deleteVersion(rid)
}

export async function removePlugin(api: Api, pluginId: string): Promise<void> {
  const p = await store.getPlugin(pluginId)
  if (!p) return
  const { rows } = await store.listVersions(pluginId)
  await store.updatePlugin(pluginId, { hidden: true })
  const r = await refreshCatalog(api, { waitMs: 20000 })
  if (r === 'queued') {
    await store.updatePlugin(pluginId, { hidden: p.hidden })
    throw new PublishError('Каталог сейчас обновляется, попробуйте через минуту')
  }
  for (const v of rows) await deleteChannelMessage(api, v.msgId)
  await store.deletePlugin(pluginId)
}

/** edits that change catalog fields (description, icon, author, plugin visibility) */
export async function refreshAfterEdit(api: Api): Promise<RefreshResult> {
  return refreshCatalog(api)
}
