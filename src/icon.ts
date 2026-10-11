import type { Result } from './validate.ts'

// A plugin icon is `inu://name`, `tg://emoji?id=<custom emoji id>` or `tg://addstickers?set=<set name>`.
// Instead of asking the author to dig the id out of Telegram, the bot reads it from a message
// that carries a sticker or a custom emoji.

interface StickerLike {
  custom_emoji_id?: string
  set_name?: string
}

interface EntityLike {
  type: string
  custom_emoji_id?: string
}

/** a custom emoji sticker gives an emoji icon, any other sticker gives its whole sticker set */
export function iconFromSticker(sticker: StickerLike): Result<string> {
  if (sticker.custom_emoji_id) return { ok: true, value: `tg://emoji?id=${sticker.custom_emoji_id}` }
  if (sticker.set_name) return { ok: true, value: `tg://addstickers?set=${sticker.set_name}` }
  return { ok: false, error: 'у этого стикера нет набора — пришлите стикер из набора или кастомный эмодзи' }
}

/** the first custom emoji of a text message, or null when there is none */
export function iconFromEntities(text: string, entities: EntityLike[] | undefined): string | null {
  void text
  const e = entities?.find((x) => x.type === 'custom_emoji' && x.custom_emoji_id)
  return e ? `tg://emoji?id=${e.custom_emoji_id}` : null
}
