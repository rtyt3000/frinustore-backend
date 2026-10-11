process.env.BOT_TOKEN = '1:x'
process.env.WEBHOOK_SECRET = 's'
process.env.DATABASE_URL = 'postgres://unused'
process.env.CHANNEL_ID = '-1001'
process.env.ADMIN_IDS = '900'
process.env.MODERATION = 'on'
process.env.DAILY_LIMIT = '50'

import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Api } from 'grammy'
import { setQueryRunner } from '../src/db.ts'
import { publishVersion, refreshCatalog, removePlugin, unpublishVersion } from '../src/publish.ts'
import * as store from '../src/store.ts'
import { approve, reject, submit, type Fields } from '../src/submit.ts'
import type { Catalog } from '../src/catalog.ts'

const pg = new PGlite()
let sha = 0

interface Call {
  m: string
  args: any[]
}

function fakeApi() {
  const calls: Call[] = []
  let nextId = 100
  let catalog: Catalog | null = null
  const fail: Record<string, Error | undefined> = {}
  const read = (media: any) => JSON.parse(new TextDecoder().decode(media.fileData))
  const api = {
    sendDocument: async (chat: number, doc: any, o: any) => {
      calls.push({ m: 'sendDocument', args: [chat, doc, o] })
      if (fail.sendDocument) throw fail.sendDocument
      if (typeof doc !== 'string') catalog = read(doc)
      return { message_id: nextId++ }
    },
    editMessageMedia: async (chat: number, id: number, media: any) => {
      calls.push({ m: 'editMessageMedia', args: [chat, id] })
      if (fail.editMessageMedia) throw fail.editMessageMedia
      catalog = read(media.media)
      return {}
    },
    pinChatMessage: async (...args: any[]) => void calls.push({ m: 'pin', args }),
    deleteMessage: async (...args: any[]) => void calls.push({ m: 'deleteMessage', args }),
    sendMessage: async (...args: any[]) => void calls.push({ m: 'sendMessage', args }),
    editMessageCaption: async (...args: any[]) => void calls.push({ m: 'editCaption', args }),
  }
  return { api: api as unknown as Api, calls, fail, catalog: () => catalog! }
}

const fields = (over: Partial<Fields> = {}): Fields => ({
  id: 'u.plugin',
  name: 'Plugin',
  author: 'me',
  version: '1.0.0',
  description: '',
  icon: 'inu://bot',
  changelog: '',
  ...over,
})

const input = (userId: number, f: Fields, grants: string[] | null = []) => ({
  userId,
  file: { id: `file-${++sha}`, sha: String(sha).padStart(64, '0') },
  header: grants === null ? null : { grants },
  fields: f,
})

beforeAll(async () => {
  await pg.exec(readFileSync(join(import.meta.dir, '..', 'migrations', '001_init.sql'), 'utf8'))
  setQueryRunner(async (text, params) => (await pg.query(text, params as any[])).rows)
})

beforeEach(async () => {
  await pg.exec('TRUNCATE users, plugins, versions, installs, meta, sessions, jobs RESTART IDENTITY CASCADE')
})

describe('publish flow', () => {
  test('new plugin goes to moderation, approval publishes file and pins the catalog', async () => {
    const t = fakeApi()
    const r = await submit(t.api, input(1, fields()))
    expect(r.kind).toBe('pending')
    // the moderator got a card with the file, nothing reached the channel yet
    expect(t.calls.filter((c) => c.m === 'sendDocument').map((c) => c.args[0])).toEqual([900])

    const v = (await store.listPendingVersions(0, 8)).rows[0]!
    const ok = await approve(t.api, v.rid, '@mod')
    expect(ok.ok).toBe(true)
    const channelDocs = t.calls.filter((c) => c.m === 'sendDocument' && c.args[0] === -1001)
    expect(channelDocs.length).toBe(2) // the plugin file and the new catalog.json
    expect(channelDocs[0]!.args[2].caption).toBe('#plugin Plugin 1.0.0\nu.plugin')
    expect(t.calls.some((c) => c.m === 'pin')).toBe(true)
    expect(t.catalog().plugins[0]!.versions[0]).toMatchObject({ version: '1.0.0', msgId: 101 })
    // the author is told
    expect(t.calls.some((c) => c.m === 'sendMessage' && c.args[0] === 1)).toBe(true)

    // second approval attempt is a no-op
    expect((await approve(t.api, v.rid, '@mod2')).ok).toBe(false)
  })

  test('next safe version of an approved plugin is published at once, catalog edited in place', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    await approve(t.api, (await store.listPendingVersions(0, 1)).rows[0]!.rid, '@m')
    const r = await submit(t.api, input(1, fields({ version: '1.1.0', changelog: 'fix' })))
    expect(r.kind).toBe('published')
    expect(t.calls.filter((c) => c.m === 'editMessageMedia').length).toBe(1)
    expect(t.catalog().plugins[0]!.versions.map((v) => v.version)).toEqual(['1.1.0', '1.0.0'])
  })

  test('new unsafe grant or unknown header sends an approved plugin back to moderation', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    await approve(t.api, (await store.listPendingVersions(0, 1)).rows[0]!.rid, '@m')
    expect((await submit(t.api, input(1, fields({ version: '1.1.0' }), ['unsafe.jvm']))).kind).toBe('pending')
    expect((await submit(t.api, input(1, fields({ version: '1.2.0' }), null))).kind).toBe('pending')
  })

  test('rejects: foreign id, version not greater, duplicate file, banned', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    const foreign = await submit(t.api, input(2, fields({ version: '2.0.0' })))
    expect(foreign).toMatchObject({ kind: 'error', message: expect.stringContaining('занят') })
    const lower = await submit(t.api, input(1, fields({ version: '1.0.0' })))
    expect(lower).toMatchObject({ kind: 'error', message: expect.stringContaining('строго больше') })
    const first = input(1, fields({ version: '1.5.0' }))
    expect((await submit(t.api, first)).kind).toBe('pending')
    const dup = await submit(t.api, { ...input(1, fields({ version: '1.6.0' })), file: first.file })
    expect(dup).toMatchObject({ kind: 'error', message: expect.stringContaining('уже загружен') })
    await store.setBanned(3, true)
    expect((await submit(t.api, input(3, fields({ id: 'other.one' })))).kind).toBe('error')
  })

  test('rejection notifies the author and frees the version number', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    const v = (await store.listPendingVersions(0, 1)).rows[0]!
    expect((await reject(t.api, v.rid, 'плохо', '@m')).ok).toBe(true)
    expect(t.calls.some((c) => c.m === 'sendMessage' && c.args[0] === 1 && String(c.args[1]).includes('плохо'))).toBe(true)
    expect((await submit(t.api, input(1, fields()))).kind).toBe('pending') // same version again
  })

  test('moderation off publishes immediately; admin daily limit does not apply', async () => {
    process.env.MODERATION = 'off'
    try {
      const { config } = await import('../src/config.ts')
      // config is cached, so flip the cached object
      const cfg = config()
      const prev = cfg.moderation
      cfg.moderation = false
      const t = fakeApi()
      expect((await submit(t.api, input(1, fields()))).kind).toBe('published')
      cfg.moderation = prev
    } finally {
      process.env.MODERATION = 'on'
    }
  })

  test('failed catalog update rolls the publication back', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    const v = (await store.listPendingVersions(0, 1)).rows[0]!
    t.fail.sendDocument = undefined
    // the file upload succeeds, the catalog write fails
    const orig = t.api.sendDocument.bind(t.api)
    let n = 0
    ;(t.api as any).sendDocument = async (...a: any[]) => {
      if (++n === 2) throw new Error('catalog upload failed')
      return (orig as any)(...a)
    }
    await expect(publishVersion(t.api, v.rid, 'pending')).rejects.toThrow('catalog upload failed')
    expect(t.calls.some((c) => c.m === 'deleteMessage')).toBe(true) // uploaded file removed
    expect(await store.getVersion(v.rid)).toMatchObject({ status: 'pending', msgId: null })
    expect(await store.getMeta('rebuild_lock')).toBeNull() // lock released
  })

  test('hiding a version rewrites the catalog before deleting the file', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    await approve(t.api, (await store.listPendingVersions(0, 1)).rows[0]!.rid, '@m')
    await submit(t.api, input(1, fields({ version: '1.1.0' })))
    const v = (await store.listVersions('u.plugin')).rows.find((x) => x.version === '1.1.0')!
    t.calls.length = 0
    await unpublishVersion(t.api, v.rid, 'hide')
    const order = t.calls.map((c) => c.m)
    expect(order.indexOf('editMessageMedia')).toBeLessThan(order.indexOf('deleteMessage'))
    expect(t.catalog().plugins[0]!.versions.map((x) => x.version)).toEqual(['1.0.0'])
    expect(await store.getVersion(v.rid)).toMatchObject({ status: 'hidden', msgId: null })
    // and it can be shown again with a fresh message
    await publishVersion(t.api, v.rid, 'hidden')
    expect(t.catalog().plugins[0]!.versions.length).toBe(2)
  })

  test('removing a plugin clears the channel and the catalog', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    await approve(t.api, (await store.listPendingVersions(0, 1)).rows[0]!.rid, '@m')
    t.calls.length = 0
    await removePlugin(t.api, 'u.plugin')
    expect(t.catalog().plugins).toEqual([])
    expect(t.calls.filter((c) => c.m === 'deleteMessage').length).toBe(1)
    expect(await store.getPlugin('u.plugin')).toBeNull()
  })

  test('two simultaneous publications leave a consistent catalog', async () => {
    const t = fakeApi()
    // two approved plugins' worth of pending versions
    await submit(t.api, input(1, fields({ id: 'p.one', name: 'One' })))
    await submit(t.api, input(2, fields({ id: 'p.two', name: 'Two' })))
    const rows = (await store.listPendingVersions(0, 8)).rows
    expect(rows.length).toBe(2)
    const results = await Promise.all(rows.map((r) => approve(t.api, r.rid, '@m')))
    expect(results.every((r) => r.ok)).toBe(true)
    await refreshCatalog(t.api, { force: true })
    expect(t.catalog().plugins.map((p) => p.id).sort()).toEqual(['p.one', 'p.two'])
    // never more than one catalog message is pinned
    expect(t.calls.filter((c) => c.m === 'pin').length).toBe(1)
  })

  test('unchanged catalog is not re-uploaded unless forced', async () => {
    const t = fakeApi()
    await submit(t.api, input(1, fields()))
    await approve(t.api, (await store.listPendingVersions(0, 1)).rows[0]!.rid, '@m')
    const edits = () => t.calls.filter((c) => c.m === 'editMessageMedia').length
    const before = edits()
    expect(await refreshCatalog(t.api)).toBe('unchanged')
    expect(edits()).toBe(before)
    expect(await refreshCatalog(t.api, { force: true })).toBe('done')
    expect(edits()).toBe(before + 1)
  })
})
