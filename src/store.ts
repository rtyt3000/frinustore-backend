import { one, q, now } from './db.ts'
import type { Description } from './validate.ts'

// bigint columns come back as strings from the driver, hence the Number() mappers.

export type VersionStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'publishing'

export interface Plugin {
  rid: number
  id: string
  owner: number
  name: string
  author: string
  description: Description
  icon: string
  /** null only for plugins created before the repository became mandatory */
  repoUrl: string | null
  repoWarning: string | null
  hidden: boolean
  createdAt: number
}

export interface RepoChange {
  id: number
  pluginId: string
  repoUrl: string
  warning: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitter: number
  rejectReason: string | null
  modMsgs: ModMsg[]
  createdAt: number
}

export interface ModMsg {
  chat: number
  msg: number
}

export interface Version {
  rid: number
  pluginId: string
  version: string
  msgId: number | null
  date: number
  changelog: string | null
  grants: string[] | null
  status: VersionStatus
  sha256: string
  fileId: string
  submitter: number
  rejectReason: string | null
  modMsgs: ModMsg[]
  createdAt: number
}

const plugin = (r: any): Plugin => ({
  rid: Number(r.rid),
  id: r.id,
  owner: Number(r.owner_user_id),
  name: r.name,
  author: r.author,
  description: r.description_json,
  icon: r.icon,
  repoUrl: r.repo_url ?? null,
  repoWarning: r.repo_warning ?? null,
  hidden: r.hidden,
  createdAt: Number(r.created_at),
})

const repoChange = (r: any): RepoChange => ({
  id: Number(r.id),
  pluginId: r.plugin_id,
  repoUrl: r.repo_url,
  warning: r.warning,
  status: r.status,
  submitter: Number(r.submitter_id),
  rejectReason: r.reject_reason,
  modMsgs: r.mod_msgs ?? [],
  createdAt: Number(r.created_at),
})

const version = (r: any): Version => ({
  rid: Number(r.rid),
  pluginId: r.plugin_id,
  version: r.version,
  msgId: r.msg_id === null ? null : Number(r.msg_id),
  date: Number(r.date),
  changelog: r.changelog,
  grants: r.grants_json,
  status: r.status,
  sha256: r.file_sha256,
  fileId: r.file_id,
  submitter: Number(r.submitter_id),
  rejectReason: r.reject_reason,
  modMsgs: r.mod_msgs ?? [],
  createdAt: Number(r.created_at),
})

// ---- users

export async function touchUser(id: number, name: string | null): Promise<void> {
  await q(
    `INSERT INTO users (id, name, created_at) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)`,
    [id, name, now()],
  )
}

export async function isBanned(id: number): Promise<boolean> {
  return !!(await one('SELECT 1 FROM users WHERE id = $1 AND banned', [id]))
}

export async function setBanned(id: number, banned: boolean): Promise<void> {
  await q(
    `INSERT INTO users (id, banned, created_at) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET banned = EXCLUDED.banned`,
    [id, banned, now()],
  )
}

export async function listBanned(offset: number, limit: number): Promise<{ rows: { id: number; name: string | null }[]; total: number }> {
  const total = Number((await one<any>('SELECT count(*) AS n FROM users WHERE banned'))!.n)
  const rows = await q<any>('SELECT id, name FROM users WHERE banned ORDER BY id LIMIT $1 OFFSET $2', [limit, offset])
  return { rows: rows.map((r) => ({ id: Number(r.id), name: r.name })), total }
}

// ---- plugins

export async function getPlugin(id: string): Promise<Plugin | null> {
  const r = await one('SELECT * FROM plugins WHERE id = $1', [id])
  return r && plugin(r)
}

export async function getPluginByRid(rid: number): Promise<Plugin | null> {
  const r = await one('SELECT * FROM plugins WHERE rid = $1', [rid])
  return r && plugin(r)
}

export async function createPlugin(p: Omit<Plugin, 'rid' | 'createdAt' | 'hidden'> & { repoUrl: string }): Promise<boolean> {
  const r = await q(
    `INSERT INTO plugins (id, owner_user_id, name, author, description_json, icon, repo_url, repo_warning, repo_checked_at, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $9) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [p.id, p.owner, p.name, p.author, JSON.stringify(p.description), p.icon, p.repoUrl, p.repoWarning, now()],
  )
  return r.length > 0
}

export async function updatePlugin(
  id: string,
  patch: Partial<Pick<Plugin, 'name' | 'author' | 'description' | 'icon' | 'hidden' | 'repoUrl' | 'repoWarning'>>,
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = [id]
  const add = (col: string, v: unknown, cast = '') => {
    params.push(v)
    sets.push(`${col} = $${params.length}${cast}`)
  }
  if (patch.name !== undefined) add('name', patch.name)
  if (patch.author !== undefined) add('author', patch.author)
  if (patch.description !== undefined) add('description_json', JSON.stringify(patch.description), '::jsonb')
  if (patch.icon !== undefined) add('icon', patch.icon)
  if (patch.hidden !== undefined) add('hidden', patch.hidden)
  if (patch.repoUrl !== undefined) {
    add('repo_url', patch.repoUrl)
    add('repo_checked_at', now())
  }
  if (patch.repoWarning !== undefined) add('repo_warning', patch.repoWarning)
  if (sets.length) await q(`UPDATE plugins SET ${sets.join(', ')} WHERE id = $1`, params)
}

export async function deletePlugin(id: string): Promise<void> {
  await q('DELETE FROM plugins WHERE id = $1', [id])
}

export async function listPlugins(opts: { owner?: number; offset: number; limit: number }): Promise<{ rows: Plugin[]; total: number }> {
  const where = opts.owner === undefined ? '' : 'WHERE owner_user_id = $1'
  const args = opts.owner === undefined ? [] : [opts.owner]
  const total = Number((await one<any>(`SELECT count(*) AS n FROM plugins ${where}`, args))!.n)
  const rows = await q(
    `SELECT * FROM plugins ${where} ORDER BY created_at DESC, rid DESC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, opts.limit, opts.offset],
  )
  return { rows: rows.map(plugin), total }
}

export async function allPlugins(): Promise<Plugin[]> {
  return (await q('SELECT * FROM plugins ORDER BY rid')).map(plugin)
}

// ---- repository changes

export async function createRepoChange(pluginId: string, repoUrl: string, warning: string | null, submitter: number): Promise<RepoChange | null> {
  const r = await one(
    `INSERT INTO repo_changes (plugin_id, repo_url, warning, status, submitter_id, created_at)
     VALUES ($1, $2, $3, 'pending', $4, $5) ON CONFLICT (plugin_id) WHERE status = 'pending' DO NOTHING RETURNING *`,
    [pluginId, repoUrl, warning, submitter, now()],
  )
  return r && repoChange(r)
}

export async function getRepoChange(id: number): Promise<RepoChange | null> {
  const r = await one('SELECT * FROM repo_changes WHERE id = $1', [id])
  return r && repoChange(r)
}

export async function pendingRepoChange(pluginId: string): Promise<RepoChange | null> {
  const r = await one("SELECT * FROM repo_changes WHERE plugin_id = $1 AND status = 'pending'", [pluginId])
  return r && repoChange(r)
}

/** atomically takes a pending request; null if someone decided first */
export async function decideRepoChange(id: number, status: 'approved' | 'rejected', reason?: string): Promise<RepoChange | null> {
  const r = await one("UPDATE repo_changes SET status = $2, reject_reason = $3 WHERE id = $1 AND status = 'pending' RETURNING *", [id, status, reason ?? null])
  return r && repoChange(r)
}

export async function setRepoChangeMods(id: number, msgs: ModMsg[]): Promise<void> {
  await q('UPDATE repo_changes SET mod_msgs = $2::jsonb WHERE id = $1', [id, JSON.stringify(msgs)])
}

export async function listPendingRepoChanges(offset: number, limit: number): Promise<{ rows: (RepoChange & { pluginName: string })[]; total: number }> {
  const total = Number((await one<any>("SELECT count(*) AS n FROM repo_changes WHERE status = 'pending'"))!.n)
  const rows = await q<any>(
    `SELECT c.*, p.name AS plugin_name FROM repo_changes c JOIN plugins p ON p.id = c.plugin_id
     WHERE c.status = 'pending' ORDER BY c.created_at, c.id LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
  return { rows: rows.map((r) => ({ ...repoChange(r), pluginName: r.plugin_name })), total }
}

// ---- versions

export async function getVersion(rid: number): Promise<Version | null> {
  const r = await one('SELECT * FROM versions WHERE rid = $1', [rid])
  return r && version(r)
}

export async function listVersions(pluginId: string, opts?: { offset: number; limit: number }): Promise<{ rows: Version[]; total: number }> {
  const total = Number((await one<any>('SELECT count(*) AS n FROM versions WHERE plugin_id = $1', [pluginId]))!.n)
  const rows = opts
    ? await q('SELECT * FROM versions WHERE plugin_id = $1 ORDER BY date DESC, rid DESC LIMIT $2 OFFSET $3', [pluginId, opts.limit, opts.offset])
    : await q('SELECT * FROM versions WHERE plugin_id = $1 ORDER BY date DESC, rid DESC', [pluginId])
  return { rows: rows.map(version), total }
}

export async function allVersions(): Promise<Version[]> {
  return (await q('SELECT * FROM versions ORDER BY rid')).map(version)
}

/** versions that count as "current": everything except rejected ones */
export async function liveVersionStrings(pluginId: string): Promise<string[]> {
  return (await q<any>("SELECT version FROM versions WHERE plugin_id = $1 AND status <> 'rejected'", [pluginId])).map((r) => r.version)
}

export async function approvedGrants(pluginId: string): Promise<string[][]> {
  const rows = await q<any>(
    "SELECT grants_json FROM versions WHERE plugin_id = $1 AND status IN ('approved', 'hidden') AND grants_json IS NOT NULL",
    [pluginId],
  )
  return rows.map((r) => r.grants_json)
}

export async function hasApproved(pluginId: string): Promise<boolean> {
  return !!(await one("SELECT 1 FROM versions WHERE plugin_id = $1 AND status IN ('approved', 'hidden')", [pluginId]))
}

export async function findBySha(sha: string): Promise<(Version & { pluginName: string }) | null> {
  const r = await one<any>(
    `SELECT v.*, p.name AS plugin_name FROM versions v JOIN plugins p ON p.id = v.plugin_id
     WHERE v.file_sha256 = $1 AND v.status <> 'rejected' LIMIT 1`,
    [sha],
  )
  return r && { ...version(r), pluginName: r.plugin_name }
}

export async function countSubmissionsSince(userId: number, since: number): Promise<number> {
  return Number((await one<any>('SELECT count(*) AS n FROM versions WHERE submitter_id = $1 AND created_at >= $2', [userId, since]))!.n)
}

export async function createVersion(v: {
  pluginId: string
  version: string
  changelog: string | null
  grants: string[] | null
  sha256: string
  fileId: string
  submitter: number
}): Promise<Version> {
  // a rejected attempt at the same version may be retried
  await q("DELETE FROM versions WHERE plugin_id = $1 AND version = $2 AND status = 'rejected'", [v.pluginId, v.version])
  const t = now()
  const r = await one(
    `INSERT INTO versions (plugin_id, version, date, changelog, grants_json, status, file_sha256, file_id, submitter_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', $6, $7, $8, $3, $3) RETURNING *`,
    [v.pluginId, v.version, t, v.changelog || null, v.grants ? JSON.stringify(v.grants) : null, v.sha256, v.fileId, v.submitter],
  )
  return version(r)
}

/** atomically takes a version for publishing; null when someone else got it first */
export async function claimVersion(rid: number, from: VersionStatus): Promise<Version | null> {
  const r = await one('UPDATE versions SET status = $3, updated_at = $2 WHERE rid = $1 AND status = $4 RETURNING *', [rid, now(), 'publishing', from])
  return r && version(r)
}

export async function setVersionStatus(
  rid: number,
  status: VersionStatus,
  extra: { msgId?: number | null; rejectReason?: string | null; date?: number } = {},
): Promise<void> {
  await q(
    `UPDATE versions SET status = $2, updated_at = $3,
       msg_id = CASE WHEN $4 THEN $5::int ELSE msg_id END,
       reject_reason = CASE WHEN $6 THEN $7 ELSE reject_reason END,
       date = COALESCE($8::bigint, date)
     WHERE rid = $1`,
    [
      rid,
      status,
      now(),
      extra.msgId !== undefined,
      extra.msgId ?? null,
      extra.rejectReason !== undefined,
      extra.rejectReason ?? null,
      extra.date ?? null,
    ],
  )
}

export async function setModMsgs(rid: number, msgs: ModMsg[]): Promise<void> {
  await q('UPDATE versions SET mod_msgs = $2::jsonb WHERE rid = $1', [rid, JSON.stringify(msgs)])
}

export async function deleteVersion(rid: number): Promise<void> {
  await q('DELETE FROM versions WHERE rid = $1', [rid])
}

export async function listPendingVersions(offset: number, limit: number): Promise<{ rows: (Version & { pluginName: string })[]; total: number }> {
  const total = Number((await one<any>("SELECT count(*) AS n FROM versions WHERE status = 'pending'"))!.n)
  const rows = await q<any>(
    `SELECT v.*, p.name AS plugin_name FROM versions v JOIN plugins p ON p.id = v.plugin_id
     WHERE v.status = 'pending' ORDER BY v.created_at, v.rid LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
  return { rows: rows.map((r) => ({ ...version(r), pluginName: r.plugin_name })), total }
}

/** versions stuck in `publishing` after a crashed invocation go back to the queue */
export async function releaseStuckVersions(olderThanSec: number): Promise<number> {
  const r = await q("UPDATE versions SET status = 'pending', updated_at = $2 WHERE status = 'publishing' AND updated_at < $1 RETURNING rid", [
    now() - olderThanSec,
    now(),
  ])
  return r.length
}

// ---- installs

export async function recordInstall(userId: number, pluginId: string, ver: string): Promise<boolean> {
  const r = await q(
    `INSERT INTO installs (plugin_id, user_id, created_at)
     SELECT p.id, $2::bigint, $4::bigint FROM plugins p
     WHERE p.id = $1 AND NOT p.hidden
       AND EXISTS (SELECT 1 FROM versions v WHERE v.plugin_id = p.id AND v.version = $3 AND v.status = 'approved')
       AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = $2::bigint AND u.banned)
     ON CONFLICT DO NOTHING RETURNING plugin_id`,
    [pluginId, userId, ver, now()],
  )
  return r.length > 0
}

export async function installCounts(): Promise<Map<string, number>> {
  const rows = await q<any>('SELECT plugin_id, count(*) AS n FROM installs GROUP BY plugin_id')
  return new Map(rows.map((r) => [r.plugin_id, Number(r.n)]))
}

export async function installCount(pluginId: string): Promise<number> {
  return Number((await one<any>('SELECT count(*) AS n FROM installs WHERE plugin_id = $1', [pluginId]))!.n)
}

// ---- meta

export async function getMeta(key: string): Promise<string | null> {
  return (await one<any>('SELECT value FROM meta WHERE key = $1', [key]))?.value ?? null
}

export async function setMeta(key: string, value: string): Promise<void> {
  await q('INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value])
}

// ---- rebuild lock (a lease: works over the stateless HTTP driver, unlike advisory locks)

export async function acquireLock(name: string, ttlSec: number, token: string): Promise<boolean> {
  const t = Date.now()
  const r = await q(
    `INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
     WHERE split_part(meta.value, ':', 1)::bigint < $3 RETURNING key`,
    [name, `${t + ttlSec * 1000}:${token}`, t],
  )
  return r.length > 0
}

export async function releaseLock(name: string, token: string): Promise<void> {
  await q('DELETE FROM meta WHERE key = $1 AND value LIKE $2', [name, `%:${token}`])
}

// ---- sessions

export const SESSION_TTL_SEC = 15 * 60

export interface Session {
  state: string
  payload: any
}

export async function getSession(userId: number): Promise<Session | null> {
  const r = await one<any>('SELECT state, payload_json, updated_at FROM sessions WHERE user_id = $1', [userId])
  if (!r) return null
  if (Number(r.updated_at) < now() - SESSION_TTL_SEC) {
    await clearSession(userId)
    return null
  }
  return { state: r.state, payload: r.payload_json }
}

export async function setSession(userId: number, state: string, payload: unknown = {}): Promise<void> {
  await q(
    `INSERT INTO sessions (user_id, state, payload_json, updated_at) VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, payload_json = EXCLUDED.payload_json, updated_at = EXCLUDED.updated_at`,
    [userId, state, JSON.stringify(payload), now()],
  )
}

/** true if a session existed (lets callers treat double clicks as stale) */
export async function clearSession(userId: number): Promise<boolean> {
  return (await q('DELETE FROM sessions WHERE user_id = $1 RETURNING user_id', [userId])).length > 0
}

// ---- updates / jobs

export async function markUpdateProcessed(updateId: number): Promise<boolean> {
  const r = await q('INSERT INTO processed_updates (update_id, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING update_id', [updateId, now()])
  return r.length > 0
}

export async function enqueueJob(type: string): Promise<void> {
  await q("INSERT INTO jobs (type, created_at) VALUES ($1, $2) ON CONFLICT (type) WHERE status = 'pending' DO NOTHING", [type, now()])
}

export async function pendingJobs(): Promise<{ id: number; type: string }[]> {
  return (await q<any>("SELECT id, type FROM jobs WHERE status = 'pending' ORDER BY id")).map((r) => ({ id: Number(r.id), type: r.type }))
}

export async function finishJob(id: number, error?: string): Promise<void> {
  await q('UPDATE jobs SET status = $2, done_at = $3, error = $4 WHERE id = $1', [id, error ? 'failed' : 'done', now(), error ?? null])
}

export async function cleanup(): Promise<void> {
  await q('DELETE FROM processed_updates WHERE created_at < $1', [now() - 7 * 86400])
  await q('DELETE FROM sessions WHERE updated_at < $1', [now() - SESSION_TTL_SEC])
  await q("DELETE FROM jobs WHERE status <> 'pending' AND done_at < $1", [now() - 7 * 86400])
}

// ---- backup

export async function dumpAll(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {}
  for (const t of ['users', 'plugins', 'versions', 'repo_changes', 'installs', 'meta', 'sessions']) {
    out[t] = await q(`SELECT * FROM ${t}`)
  }
  return out
}
