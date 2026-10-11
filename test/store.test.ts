import { beforeAll, describe, expect, test } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setQueryRunner } from '../src/db.ts'
import * as store from '../src/store.ts'

// the real migration and the real queries, on an in-process Postgres
const pg = new PGlite()

beforeAll(async () => {
  await pg.exec(readFileSync(join(import.meta.dir, '..', 'migrations', '001_init.sql'), 'utf8'))
  setQueryRunner(async (text, params) => (await pg.query(text, params as any[])).rows)
})

const sha = (n: number) => String(n).padStart(64, '0')
const newVersion = (pluginId: string, version: string, n: number, grants: string[] | null = []) =>
  store.createVersion({ pluginId, version, changelog: null, grants, sha256: sha(n), fileId: `f${n}`, submitter: 1 })

describe('store on postgres', () => {
  test('plugin ownership and ids', async () => {
    expect(await store.createPlugin({ id: 'a.b.c', owner: 1, name: 'A', author: 'me', description: { ru: 'x' }, icon: 'inu://bot' })).toBe(true)
    expect(await store.createPlugin({ id: 'a.b.c', owner: 2, name: 'B', author: 'x', description: '', icon: 'inu://bot' })).toBe(false)
    const p = await store.getPlugin('a.b.c')
    expect(p?.owner).toBe(1)
    expect(p?.description).toEqual({ ru: 'x' })
    expect((await store.getPluginByRid(p!.rid))?.id).toBe('a.b.c')
    await store.updatePlugin('a.b.c', { description: 'plain', author: 'new' })
    expect(await store.getPlugin('a.b.c')).toMatchObject({ description: 'plain', author: 'new' })
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
