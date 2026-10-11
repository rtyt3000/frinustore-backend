import { describe, expect, test } from 'bun:test'
import { buildCatalog, catalogFingerprint, serializeCatalog, type PluginRow, type VersionRow } from '../src/catalog.ts'
import { canManage } from '../src/perms.ts'
import { checkPhoto } from '../src/screenshots.ts'
import { analyzeGrants, decodeText, newUnsafe, parseHeader } from '../src/plugin-header.ts'
import { compareSemver, maxSemver, parseSemver } from '../src/semver.ts'
import { pageCount, clampPage } from '../src/ui.ts'
import { validateDescription, validateIcon, validateId, validateName, validateVersion } from '../src/validate.ts'

describe('semver', () => {
  test('parse', () => {
    expect(parseSemver('1.2.3')).toMatchObject({ major: 1, minor: 2, patch: 3 })
    expect(parseSemver('1.2')).toBeNull()
    expect(parseSemver('v1.2.3')).toBeNull()
    expect(parseSemver('1.2.3-beta.1+build5')?.pre).toEqual(['beta', '1'])
  })
  test('compare', () => {
    expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0)
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0)
    expect(compareSemver('1.9.0', '1.10.0')).toBeLessThan(0)
    expect(compareSemver('1.0.0-rc.1', '1.0.0')).toBeLessThan(0)
    expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0)
    expect(compareSemver('1.0.0-alpha.2', '1.0.0-alpha.10')).toBeLessThan(0)
    expect(compareSemver('1.0.0-1', '1.0.0-a')).toBeLessThan(0)
    expect(compareSemver('1.0.0+a', '1.0.0+b')).toBe(0)
    expect(() => compareSemver('x', '1.0.0')).toThrow()
  })
  test('max', () => {
    expect(maxSemver(['1.0.0', '1.10.0', '1.2.0'])).toBe('1.10.0')
    expect(maxSemver([])).toBeNull()
  })
})

const HEADER = `// ==InuPlugin==
// @name         Plugin market
// @id           rtyt3000.frinumarket
// @author       rtyt3000
// @version      0.1.0
// @description  Catalog of Inugram plugins
// @icon         inu://bot
// @grant        account.read(peers)
// @grant        unsafe.jvm
// @plugin-api   1
// ==/InuPlugin==
console.log(1)`

describe('plugin header', () => {
  test('parses fields and grants', () => {
    const h = parseHeader(HEADER)!
    expect(h.id).toBe('rtyt3000.frinumarket')
    expect(h.name).toBe('Plugin market')
    expect(h.version).toBe('0.1.0')
    expect(h.grants).toEqual(['account.read(peers)', 'unsafe.jvm'])
  })
  test('handles CRLF', () => {
    expect(parseHeader(HEADER.replace(/\n/g, '\r\n'))?.id).toBe('rtyt3000.frinumarket')
  })
  test('missing or broken header is null, not an error', () => {
    expect(parseHeader('console.log(1)')).toBeNull()
    expect(parseHeader('// ==InuPlugin==\n// @id x')).toBeNull()
  })
  test('header without grants has an empty list (known), not null', () => {
    expect(parseHeader('// ==InuPlugin==\n// @id a.b.c\n// ==/InuPlugin==')?.grants).toEqual([])
  })
  test('decodeText rejects binaries and non-utf8', () => {
    expect(decodeText(new Uint8Array([0x61, 0, 0x62])).ok).toBe(false)
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x41])).ok).toBe(false)
    expect(decodeText(new TextEncoder().encode('привет')).ok).toBe(true)
  })
})

describe('grants', () => {
  test('unknown header', () => {
    expect(analyzeGrants(null).unknown).toBe(true)
  })
  test('flags unsafe and bare fetch/invokeRpc', () => {
    const r = analyzeGrants(['unsafe.xposed', 'fetch', 'invokeRpc', 'fetch(example.com)', 'invokeRpc(messages.search)'])
    expect(r.unsafe).toEqual(['unsafe.xposed'])
    expect(r.risky).toEqual(['fetch', 'invokeRpc'])
  })
  test('only new unsafe grants need review', () => {
    expect(newUnsafe(['unsafe.jvm', 'unsafe.xposed'], [['unsafe.jvm']])).toEqual(['unsafe.xposed'])
    expect(newUnsafe(['unsafe.jvm'], [['unsafe.jvm']])).toEqual([])
    expect(newUnsafe(null, [])).toEqual([])
  })
})

describe('validation', () => {
  test('id', () => {
    expect(validateId('rtyt3000.frinumarket').ok).toBe(true)
    expect(validateId('ab').ok).toBe(false)
    expect(validateId('Has Caps').ok).toBe(false)
    expect(validateId('a'.repeat(65)).ok).toBe(false)
  })
  test('name, version, icon', () => {
    expect(validateName('x'.repeat(41)).ok).toBe(false)
    expect(validateVersion('1.0').ok).toBe(false)
    expect(validateIcon('inu://bot').ok).toBe(true)
    expect(validateIcon('tg://emoji?id=123').ok).toBe(true)
    expect(validateIcon('https://x.y/a.png').ok).toBe(false)
  })
  test('description: plain and localized', () => {
    expect(validateDescription('hello')).toEqual({ ok: true, value: 'hello' })
    expect(validateDescription('ru: привет\nen: hello')).toEqual({ ok: true, value: { ru: 'привет', en: 'hello' } })
    expect(validateDescription('text\nru: x').ok).toBe(false)
    expect(validateDescription('x'.repeat(501)).ok).toBe(false)
    expect(validateDescription('')).toEqual({ ok: true, value: '' })
  })
})

const plugin = (id: string, over: Partial<PluginRow> = {}): PluginRow => ({
  id,
  name: id,
  author: 'a',
  description: '',
  icon: 'inu://bot',
  repo: 'https://github.com/o/r',
  hidden: false,
  ...over,
})
const ver = (pluginId: string, version: string, over: Partial<VersionRow> = {}): VersionRow => ({
  pluginId,
  version,
  msgId: 10,
  date: 100,
  changelog: null,
  grants: null,
  status: 'approved',
  ...over,
})

describe('catalog', () => {
  test('only approved versions of visible plugins, ordered by installs then date', () => {
    const c = buildCatalog(
      [plugin('a'), plugin('b'), plugin('c', { hidden: true }), plugin('d'), plugin('e')],
      [
        ver('a', '1.0.0', { date: 100 }),
        ver('b', '1.0.0', { date: 200, msgId: 11 }),
        ver('b', '1.1.0', { date: 300, msgId: 12, changelog: 'fix', grants: ['x'] }),
        ver('b', '0.9.0', { status: 'hidden' }),
        ver('c', '1.0.0'),
        ver('d', '1.0.0', { status: 'pending', msgId: null }),
        ver('e', '1.0.0', { date: 50 }),
      ],
      new Map([['e', 5]]),
      999,
    )
    expect(c.schema).toBe(1)
    expect(c.updatedAt).toBe(999)
    expect(c.plugins.map((p) => p.id)).toEqual(['e', 'b', 'a'])
    const b = c.plugins.find((p) => p.id === 'b')!
    expect(b.versions.map((v) => v.version)).toEqual(['1.1.0', '1.0.0'])
    expect(b.versions[0]).toEqual({ version: '1.1.0', msgId: 12, date: 300, changelog: 'fix', grants: ['x'] })
    expect(b.versions[1]).toEqual({ version: '1.0.0', msgId: 11, date: 200 })
    expect(c.plugins[0]!.installs).toBe(5)
  })
  test('a plugin without a repository is never listed', () => {
    const c = buildCatalog([plugin('a', { repo: null }), plugin('b')], [ver('a', '1.0.0'), ver('b', '1.0.0')], new Map(), 1)
    expect(c.plugins.map((p) => p.id)).toEqual(['b'])
    expect(c.plugins[0]!.repo).toBe('https://github.com/o/r')
  })
  test('field order follows the client schema: icon, repo, installs', () => {
    const c = buildCatalog([plugin('a')], [ver('a', '1.0.0')], new Map(), 1)
    expect(Object.keys(c.plugins[0]!)).toEqual(['id', 'name', 'author', 'description', 'icon', 'repo', 'installs', 'versions'])
  })
  test('a version without a file message is never listed', () => {
    const c = buildCatalog([plugin('a')], [ver('a', '1.0.0', { msgId: null })], new Map(), 1)
    expect(c.plugins).toEqual([])
  })
  test('compact json under 1 MB, fingerprint ignores updatedAt', () => {
    const a = buildCatalog([plugin('a')], [ver('a', '1.0.0')], new Map(), 1)
    const b = buildCatalog([plugin('a')], [ver('a', '1.0.0')], new Map(), 2)
    expect(serializeCatalog(a)).not.toContain('\n')
    expect(catalogFingerprint(a)).toBe(catalogFingerprint(b))
    const big = buildCatalog([plugin('a', { description: 'x'.repeat(2_000_000) })], [ver('a', '1.0.0')], new Map(), 1)
    expect(() => serializeCatalog(big)).toThrow()
  })
})

describe('pagination', () => {
  test('page count and clamping for 0, 1, 8, 9 and 50 items', () => {
    expect([0, 1, 8, 9, 50].map(pageCount)).toEqual([1, 1, 1, 2, 7])
    expect(clampPage(5, 0)).toBe(0)
    expect(clampPage(-1, 50)).toBe(0)
    expect(clampPage(99, 50)).toBe(6)
    expect(clampPage(NaN, 8)).toBe(0)
  })
})

describe('permissions', () => {
  test('only the owner or a moderator can manage a plugin', () => {
    expect(canManage(1, 1, false)).toEqual({ allowed: true, owner: true })
    expect(canManage(2, 1, false)).toEqual({ allowed: false, owner: false })
    expect(canManage(2, 1, true)).toEqual({ allowed: true, owner: false })
  })
})

describe('screenshots in the catalog', () => {
  test('listed in order after repo, capped at 8, omitted when empty', () => {
    const shots = new Map([['a', [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]])
    const c = buildCatalog([plugin('a'), plugin('b')], [ver('a', '1.0.0'), ver('b', '1.0.0')], new Map(), 1, shots)
    const a = c.plugins.find((p) => p.id === 'a')!
    const b = c.plugins.find((p) => p.id === 'b')!
    expect(a.screenshots).toEqual([5, 6, 7, 8, 9, 10, 11, 12])
    expect(Object.keys(a)).toEqual(['id', 'name', 'author', 'description', 'icon', 'repo', 'screenshots', 'installs', 'versions'])
    expect('screenshots' in b).toBe(false)
    expect(buildCatalog([plugin('b')], [ver('b', '1.0.0')], new Map(), 1, new Map([['b', []]])).plugins[0]).not.toHaveProperty('screenshots')
  })
})

describe('checkPhoto', () => {
  const size = (width: number, height: number, file_size?: number) => ({ file_id: `f${width}`, file_unique_id: `u${width}`, width, height, file_size })
  test('takes the largest size and enforces the limits', () => {
    expect(checkPhoto([size(90, 90), size(1280, 720, 200_000), size(320, 180)])).toEqual({ ok: true, fileId: 'f1280', uniqueId: 'u1280' })
    expect(checkPhoto(undefined).ok).toBe(false)
    expect(checkPhoto([]).ok).toBe(false)
    expect(checkPhoto([size(1280, 300)]).ok).toBe(false) // short side below 320
    expect(checkPhoto([size(320, 320)]).ok).toBe(true)
    expect(checkPhoto([size(2000, 2000, 10 * 1024 * 1024 + 1)]).ok).toBe(false)
    expect(checkPhoto([size(2000, 2000, 10 * 1024 * 1024)]).ok).toBe(true)
  })
})
