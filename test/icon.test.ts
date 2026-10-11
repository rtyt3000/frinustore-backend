import { describe, expect, test } from 'bun:test'
import { iconFromEntities, iconFromSticker } from '../src/icon.ts'
import { validateIcon } from '../src/validate.ts'

describe('icon from a sticker or custom emoji', () => {
  test('a custom emoji sticker becomes tg://emoji', () => {
    expect(iconFromSticker({ custom_emoji_id: '5368324170671202286', set_name: 'SomePack' })).toEqual({ ok: true, value: 'tg://emoji?id=5368324170671202286' })
  })

  test('a regular sticker becomes its whole set', () => {
    expect(iconFromSticker({ set_name: 'AnimatedEmojies' })).toEqual({ ok: true, value: 'tg://addstickers?set=AnimatedEmojies' })
  })

  test('a sticker with neither is refused with a reason', () => {
    const r = iconFromSticker({})
    expect(r.ok).toBe(false)
  })

  test('the first custom emoji entity of a text is used', () => {
    const entities = [{ type: 'bold' }, { type: 'custom_emoji', custom_emoji_id: '111' }, { type: 'custom_emoji', custom_emoji_id: '222' }]
    expect(iconFromEntities('x 👍 y', entities)).toBe('tg://emoji?id=111')
  })

  test('plain text, ordinary emoji and missing entities give nothing', () => {
    expect(iconFromEntities('inu://bot', undefined)).toBeNull()
    expect(iconFromEntities('👍', [{ type: 'bold' }])).toBeNull()
    expect(iconFromEntities('x', [{ type: 'custom_emoji' }])).toBeNull() // no id: nothing to build a link from
  })

  test('every generated link passes the icon validator', () => {
    for (const link of ['tg://emoji?id=5368324170671202286', 'tg://addstickers?set=Some_Pack_by_bot']) expect(validateIcon(link).ok).toBe(true)
  })
})
