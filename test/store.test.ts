import { beforeAll, describe, expect, test } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setQueryRunner } from '../src/db.ts'
import * as store from '../src/store.ts'

// the real migration and the real queries, on an in-process Postgres
const pg = new PGlite()

beforeAll(async () => {
  await pg.exec(readdirSync(join(import.meta.dir, '..', 'migrations')).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(join(import.meta.dir, '..', 'migrations', f), 'utf8')).join('\n'))
  setQueryRunner(async (text, params) => (await pg.query(text, params as any[])).rows)
})

const sha = (n: number) => String(n).padStart(64, '0')
const newVersion = (pluginId: string, version: string, n: number, grants: string[] | null = []) =>
  store.createVersion({ pluginId, version, changelog: null, grants, sha256: sha(n), fileId: `f${n}`, submitter: 1 })

describe('store on postgres', () => {
  test('plugin ownership and ids', async () => {
    expect(await store.createPlugin({ id: 'a.b.c', owner: 1, name: 'A', author: 'me', description: { ru: 'x' }, icon: 'inu://bot', repoUrl: 'https://github.com/o/r', repoWarning: null })).toBe(true)
    expect(await store.createPlugin({ id: 'a.b.c', owner: 2, name: 'B', author: 'x', description: '', icon: 'inu://bot', repoUrl: 'https://github.com/o/r', repoWarning: null })).toBe(false)
    const p = await store.getPlugin('a.b.c')
    expect(p?.owner).toBe(1)
    expect(p?.description).toEqual({ ru: 'x' })
    expect((await store.getPluginByRid(p!.rid))?.id).toBe('a.b.c')
    await store.updatePlugin('a.b.c', { description: 'plain', author: 'new' })
    expect(await store.getPlugin('a.b.c')).toMatchObject({ description: 'plain', author: 'new', repoUrl: 'https://github.com/o/r' })
    await store.updatePlugin('a.b.c', { repoUrl: 'https://github.com/o/r2', repoWarning: 'w' })
    expect(await store.getPlugin('a.b.c')).toMatchObject({ repoUrl: 'https://github.com/o/r2', repoWarning: 'w' })
    await store.updatePlugin('a.b.c', { repoUrl: 'https://github.com/o/r', repoWarning: null })
  })

  test('repo changes: one pending per plugin, decided exactly once', async () => {
    const a = await store.createRepoChange('a.b.c', 'https://github.com/o/new', null, 1)
    expect(a?.status).toBe('pending')
    expect(await store.createRepoChange('a.b.c', 'https://github.com/o/other', null, 1)).toBeNull()
    expect((await store.pendingRepoChange('a.b.c'))?.repoUrl).toBe('https://github.com/o/new')
    expect((await store.listPendingRepoChanges(0, 8)).total).toBe(1)
    const [x, y] = await Promise.all([store.decideRepoChange(a!.id, 'approved'), store.decideRepoChange(a!.id, 'rejected', 'no')])
    expect([x, y].filter(Boolean).length).toBe(1)
    expect(await store.pendingRepoChange('a.b.c')).toBeNull()
    expect(await store.createRepoChange('a.b.c', 'https://github.com/o/again', null, 1)).not.toBeNull() // decided requests free the slot
    await store.decideRepoChange((await store.pendingRepoChange('a.b.c'))!.id, 'rejected', 'cleanup')
  })

  test('version lifecycle: claim is exclusive', async () => {
    const v = await newVersion('a.b.c', '1.0.0', 1)
    expect(v.status).toBe('pending')
    const [a, b] = await Promise.all([store.claimVersion(v.rid, 'pending'), store.claimVersion(v.rid, 'pending')])
    expect([a, b].filter(Boolean).length).toBe(1)
    await store.setVersionStatus(v.rid, 'approved', { msgId: 42, date: 123 })
    expect(await store.getVersion(v.rid)).toMatchObject({ status: 'approved', msgId: 42, date: 123 })
    await store.setVersionStatus(v.rid, 'hidden', { msgId: null, rejectReason: 'mod' })
    expect(await store.getVersion(v.rid)).toMatchObject({ status: 'hidden', msgId: null, rejectReason: 'mod' })
    await store.setVersionStatus(v.rid, 'approved', { msgId: 43 })
    expect((await store.getVersion(v.rid))?.rejectReason).toBe('mod') // untouched when not passed
  })

  test('versions: duplicates, sha lookup, rejected retry', async () => {
    await expect(newVersion('a.b.c', '1.0.0', 2)).rejects.toThrow()
    expect((await store.findBySha(sha(1)))?.pluginName).toBe('A')
    const r = await newVersion('a.b.c', '1.1.0', 3)
    await store.setVersionStatus(r.rid, 'rejected', { rejectReason: 'no' })
    expect(await store.findBySha(sha(3))).toBeNull() // rejected files do not block a resubmit
    expect(await store.liveVersionStrings('a.b.c')).toEqual(['1.0.0'])
    const again = await newVersion('a.b.c', '1.1.0', 4)
    expect(again.status).toBe('pending')
    expect(await store.hasApproved('a.b.c')).toBe(true)
  })

  test('grants roundtrip, including unknown (null)', async () => {
    const v = await newVersion('a.b.c', '1.2.0', 5, ['fetch(x.com)', 'unsafe.jvm'])
    expect(v.grants).toEqual(['fetch(x.com)', 'unsafe.jvm'])
    const u = await newVersion('a.b.c', '1.3.0', 6, null)
    expect(u.grants).toBeNull()
  })

  test('pending queue and pagination queries', async () => {
    const { rows, total } = await store.listPendingVersions(0, 8)
    expect(total).toBe(rows.length)
    expect(total).toBeGreaterThan(0)
    const page = await store.listVersions('a.b.c', { offset: 0, limit: 2 })
    expect(page.rows.length).toBe(2)
    expect(page.total).toBeGreaterThan(2)
    expect((await store.listPlugins({ owner: 1, offset: 0, limit: 8 })).total).toBe(1)
    expect((await store.listPlugins({ owner: 99, offset: 0, limit: 8 })).total).toBe(0)
  })

  test('installs: one per user, only for approved versions, banned users ignored', async () => {
    expect(await store.recordInstall(10, 'a.b.c', '1.0.0')).toBe(true)
    expect(await store.recordInstall(10, 'a.b.c', '1.0.0')).toBe(false) // same user again
    expect(await store.recordInstall(11, 'a.b.c', '9.9.9')).toBe(false) // unknown version
    expect(await store.recordInstall(11, 'a.b.c', '1.2.0')).toBe(false) // pending, not approved
    expect(await store.recordInstall(11, 'no.such', '1.0.0')).toBe(false)
    await store.setBanned(12, true)
    expect(await store.recordInstall(12, 'a.b.c', '1.0.0')).toBe(false)
    expect(await store.recordInstall(13, 'a.b.c', '1.0.0')).toBe(true)
    expect((await store.installCounts()).get('a.b.c')).toBe(2)
    expect(await store.installCount('a.b.c')).toBe(2)
  })

  test('users and bans', async () => {
    await store.touchUser(20, 'bob')
    expect(await store.isBanned(20)).toBe(false)
    await store.setBanned(20, true)
    expect(await store.isBanned(20)).toBe(true)
    expect((await store.listBanned(0, 8)).rows.map((r) => r.id)).toContain(20)
    await store.setBanned(20, false)
    expect(await store.isBanned(20)).toBe(false)
  })

  test('rebuild lease lock is exclusive, expires, and is released by its owner only', async () => {
    expect(await store.acquireLock('l', 60, 'A')).toBe(true)
    expect(await store.acquireLock('l', 60, 'B')).toBe(false)
    await store.releaseLock('l', 'B')
    expect(await store.acquireLock('l', 60, 'C')).toBe(false)
    await store.releaseLock('l', 'A')
    expect(await store.acquireLock('l', 60, 'B')).toBe(true)
    await store.releaseLock('l', 'B')
    expect(await store.acquireLock('x', -5, 'A')).toBe(true) // instantly expired lease
    expect(await store.acquireLock('x', 60, 'B')).toBe(true)
  })

  test('sessions: set, get, expire, single clear', async () => {
    await store.setSession(30, 'wiz', { a: 1 })
    expect(await store.getSession(30)).toEqual({ state: 'wiz', payload: { a: 1 } })
    expect(await store.clearSession(30)).toBe(true)
    expect(await store.clearSession(30)).toBe(false) // second click sees nothing
    await store.setSession(31, 'wiz', {})
    await pg.query('UPDATE sessions SET updated_at = 1 WHERE user_id = 31')
    expect(await store.getSession(31)).toBeNull()
  })

  test('processed updates dedupe, jobs coalesce', async () => {
    expect(await store.markUpdateProcessed(555)).toBe(true)
    expect(await store.markUpdateProcessed(555)).toBe(false)
    await store.enqueueJob('rebuild')
    await store.enqueueJob('rebuild')
    const jobs = await store.pendingJobs()
    expect(jobs.length).toBe(1)
    await store.finishJob(jobs[0]!.id)
    expect((await store.pendingJobs()).length).toBe(0)
    await store.enqueueJob('rebuild')
    expect((await store.pendingJobs()).length).toBe(1)
  })

  test('daily limit counter, stuck publishing release, meta, dump, delete', async () => {
    expect(await store.countSubmissionsSince(1, 0)).toBeGreaterThan(3)
    expect(await store.countSubmissionsSince(1, 2 ** 40)).toBe(0)
    const v = await newVersion('a.b.c', '2.0.0', 7)
    await store.claimVersion(v.rid, 'pending')
    await pg.query('UPDATE versions SET updated_at = 1 WHERE rid = $1', [v.rid])
    expect(await store.releaseStuckVersions(300)).toBe(1)
    expect((await store.getVersion(v.rid))?.status).toBe('pending')
    await store.setMeta('k', '1')
    await store.setMeta('k', '2')
    expect(await store.getMeta('k')).toBe('2')
    expect(Object.keys(await store.dumpAll())).toContain('plugins')
    await store.deletePlugin('a.b.c')
    expect(await store.getPlugin('a.b.c')).toBeNull()
    expect((await store.listVersions('a.b.c')).total).toBe(0) // cascade
    expect(await store.installCount('a.b.c')).toBe(0)
  })
})

describe('screenshots in postgres', () => {
  const P = 'shots.plugin'
  beforeAll(async () => {
    await store.createPlugin({ id: P, owner: 5, name: 'S', author: 'a', description: '', icon: 'inu://bot', repoUrl: 'https://github.com/o/r', repoWarning: null })
  })

  test('append keeps order, rejects duplicates and the 9th photo', async () => {
    for (let i = 0; i < 8; i++) expect((await store.addScreenshot(P, `f${i}`, `u${i}`)).ok).toBe(true)
    expect(await store.addScreenshot(P, 'x', 'u3')).toEqual({ ok: false, reason: 'duplicate' })
    expect(await store.addScreenshot(P, 'x', 'u99')).toEqual({ ok: false, reason: 'full' })
    expect((await store.listScreenshots(P)).map((s) => s.fileId)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'])
  })

  test('only published photos are listed for the catalog, in order', async () => {
    const list = await store.listScreenshots(P)
    await store.setScreenshotMsg(list[2]!.id, 30)
    await store.setScreenshotMsg(list[0]!.id, 10)
    expect((await store.publishedScreenshots()).get(P)).toEqual([10, 30])
  })

  test('move swaps neighbours and stops at the edges', async () => {
    const before = (await store.listScreenshots(P)).map((s) => s.id)
    expect(await store.moveScreenshot(P, before[0]!, -1)).toBe(false)
    expect(await store.moveScreenshot(P, before[7]!, 1)).toBe(false)
    expect(await store.moveScreenshot(P, before[2]!, -1)).toBe(true)
    const after = (await store.listScreenshots(P)).map((s) => s.id)
    expect(after).toEqual([before[0], before[2], before[1], ...before.slice(3)])
    expect((await store.publishedScreenshots()).get(P)).toEqual([10, 30]) // photo 2 (30) moved before photo 1, order of published stays 10, 30
  })

  test('remove renumbers, restore puts the photo back where it was', async () => {
    const list = await store.listScreenshots(P)
    const removed = (await store.removeScreenshot(list[1]!.id))!
    expect((await store.listScreenshots(P)).map((s) => s.position)).toEqual([0, 1, 2, 3, 4, 5, 6])
    await store.restoreScreenshot(removed)
    expect((await store.listScreenshots(P)).map((s) => s.fileId)).toEqual(list.map((s) => s.fileId))
    expect(await store.removeScreenshot(999999)).toBeNull()
  })

  test('staged photos are dropped only when the plugin has no live version', async () => {
    const staged = () => store.listScreenshots(P).then((l) => l.filter((x) => x.msgId === null).length)
    await newVersion(P, '1.0.0', 900)
    await store.dropPendingScreenshots(P)
    expect(await staged()).toBe(6) // a pending version is still waiting: keep the photos
    await store.deleteVersion((await store.listVersions(P)).rows[0]!.rid)
    await store.dropPendingScreenshots(P)
    expect(await staged()).toBe(0) // nothing left to publish them with
    expect((await store.listScreenshots(P)).length).toBe(2) // published ones are not touched here
  })

  test('wizard photos: parallel appends all land, limit and duplicates hold', async () => {
    await store.setSession(77, 'wiz', { steps: [], i: 0 })
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => store.appendWizardShot(77, { id: `f${i}`, u: `u${i}` })))
    expect(results.filter((r) => r.ok).length).toBe(8)
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.reason === 'full')).toBe(true)
    const s = (await store.getSession(77))!
    expect(s.payload.shots.length).toBe(8)
    expect(new Set(s.payload.shots.map((x: any) => x.u)).size).toBe(8)
    expect(await store.appendWizardShot(77, { id: 'f0', u: 'u0' })).toMatchObject({ ok: false })
    expect(await store.appendWizardShot(78, { id: 'f0', u: 'u0' })).toEqual({ ok: false, reason: 'gone' })
  })

  test('saving the wizard never loses photos added meanwhile', async () => {
    await store.saveWizard(77, { steps: ['icon'], i: 3, stale: true })
    const s = (await store.getSession(77))!
    expect(s.payload).toMatchObject({ i: 3, stale: true })
    expect(s.payload.shots.length).toBe(8)
    await store.setSession(79, 'edit', { field: 'x' })
    await store.saveWizard(79, { i: 0 }) // a leftover session of another kind does not leak its fields
    expect((await store.getSession(79))!.payload.shots).toEqual([])
  })
})
