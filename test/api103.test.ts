import { describe, expect, test } from 'bun:test'
import { InlineKeyboard } from 'grammy'
import { ADMIN_COMMANDS, DESCRIPTION, SHORT_DESCRIPTION, USER_COMMANDS } from '../src/commands.ts'
import { buildPreview } from '../src/preview.ts'
import type { Plugin, Screenshot, Version } from '../src/store.ts'
import { when } from '../src/text.ts'
import { btn, label, pagerRow } from '../src/ui.ts'

describe('buttons (Bot API 9.4 styles, 10.3 disabled)', () => {
  test('btn carries a style only when asked', () => {
    expect(btn('ok', 'a:b')).toEqual({ text: 'ok', callback_data: 'a:b' })
    expect(btn('ok', 'a:b', 'danger')).toEqual({ text: 'ok', callback_data: 'a:b', style: 'danger' })
  })

  test('label is a disabled button without callback data', () => {
    expect(label('2/5')).toEqual({ text: '2/5', disabled: {} })
  })

  test('the pager shows the page as a disabled button and keeps real arrows', () => {
    const rows = pagerRow(new InlineKeyboard(), 'p:list', 1, 30).inline_keyboard
    expect(rows[0]).toEqual([
      { text: '‹', callback_data: 'p:list:0' },
      { text: '2/4', disabled: {} },
      { text: '›', callback_data: 'p:list:2' },
    ])
    expect(pagerRow(new InlineKeyboard(), 'p:list', 0, 5).inline_keyboard.flat()).toEqual([]) // one page: no pager at all
  })

  test('every callback_data in the new keyboards stays within 64 bytes', () => {
    const data = [`s:delok:${2_000_000}:${2_000_000}`, `a:rcard:${2_000_000}`, `p:repoyes:${2_000_000}`].map((d) => (btn('x', d) as { callback_data: string }).callback_data)
    for (const d of data) expect(new TextEncoder().encode(d).length).toBeLessThanOrEqual(64)
  })
})

describe('dates (Bot API 9.5 date_time)', () => {
  test('rendered as a tg-time tag with an ISO fallback', () => {
    expect(when(1760000000)).toBe('<tg-time unix="1760000000" format="d">2025-10-09</tg-time>')
  })
})

describe('bot commands', () => {
  const all = [...USER_COMMANDS, ...ADMIN_COMMANDS]
  test('names and descriptions satisfy the Bot API limits', () => {
    for (const c of all) {
      expect(c.command).toMatch(/^[a-z0-9_]{1,32}$/)
      expect(c.description.length).toBeGreaterThanOrEqual(3)
      expect(c.description.length).toBeLessThanOrEqual(256)
    }
    expect(new Set(all.map((c) => c.command)).size).toBe(all.length)
    expect(SHORT_DESCRIPTION.length).toBeLessThanOrEqual(120)
    expect(DESCRIPTION.length).toBeLessThanOrEqual(512)
  })
  test('every command is actually handled by the bot', async () => {
    const src = await Bun.file(new URL('../src/bot.ts', import.meta.url)).text()
    for (const c of all) expect(src).toContain(`'${c.command}'`)
  })
})

const plugin: Plugin = {
  rid: 1,
  id: 'a.b',
  owner: 1,
  name: 'Fancy',
  author: 'me',
  description: { ru: 'Описание' },
  icon: 'inu://bot',
  repoUrl: 'https://github.com/o/r',
  repoWarning: null,
  hidden: false,
  createdAt: 1,
}
const version = (v: string, over: Partial<Version> = {}): Version => ({
  rid: 1,
  pluginId: 'a.b',
  version: v,
  msgId: 5,
  date: 100,
  changelog: null,
  grants: [],
  status: 'approved',
  sha256: '',
  fileId: 'f',
  submitter: 1,
  rejectReason: null,
  modMsgs: [],
  createdAt: 1,
  ...over,
})
const shot = (n: number): Screenshot => ({ id: n, pluginId: 'a.b', position: n, msgId: null, fileId: `photo-${n}`, uniqueId: `u${n}` })

describe('rich preview (Bot API 10.1+)', () => {
  const build = (over: Partial<Parameters<typeof buildPreview>[0]> = {}) =>
    buildPreview({ plugin, installs: 3, versions: [version('1.1.0', { grants: ['unsafe.jvm', 'fetch'] }), version('1.0.0')], screenshots: [shot(0), shot(1)], channelUsername: 'frinu_store', ...over })

  test('slideshow uses the stored file ids, so unpublished plugins can be previewed', () => {
    const blocks = build().blocks!
    const show = blocks.find((b) => b.type === 'slideshow') as any
    expect(show.blocks.map((b: any) => b.photo.media)).toEqual(['photo-0', 'photo-1'])
  })

  test('has heading, description, versions, grants and the repository button', () => {
    const blocks = build().blocks!
    expect(blocks[0]).toMatchObject({ type: 'heading', text: 'Fancy' })
    expect(JSON.stringify(blocks)).toContain('Описание')
    expect(JSON.stringify(blocks)).toContain('1.1.0')
    const buttons = blocks.find((b) => b.type === 'buttons') as any
    expect(buttons.buttons[0]).toMatchObject({ text: 'Исходный код', url: 'https://github.com/o/r' })
    expect(buttons.buttons.length).toBeLessThanOrEqual(8)
  })

  test('risky grants are flagged and the block opens by itself for unsafe ones', () => {
    const details = build().blocks!.filter((b) => b.type === 'details') as any[]
    const grants = details.find((d) => JSON.stringify(d.summary).includes('Гранты'))
    expect(grants.is_open).toBe(true)
    expect(JSON.stringify(grants)).toContain('🚨 unsafe.jvm')
    expect(JSON.stringify(grants)).toContain('⚠️ fetch')
  })

  test('without screenshots and with unknown grants nothing breaks', () => {
    const blocks = build({ screenshots: [], versions: [version('1.0.0', { grants: null })] }).blocks!
    expect(blocks.some((b) => b.type === 'slideshow')).toBe(false)
    expect(JSON.stringify(blocks)).toContain('Гранты неизвестны')
  })

  test('rejected versions are not shown', () => {
    expect(JSON.stringify(build({ versions: [version('9.9.9', { status: 'rejected' }), version('1.0.0')] }).blocks)).not.toContain('9.9.9')
  })
})
