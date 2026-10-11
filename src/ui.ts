import { InlineKeyboard, type Context } from 'grammy'
import { isAdmin } from './config.ts'
import { errText } from './publish.ts'

export const PAGE_SIZE = 8

/** thrown by handlers when a button no longer applies (old message, deleted plugin, no rights) */
export class Stale extends Error {
  constructor(message = 'Устарело, откройте меню заново') {
    super(message)
  }
}

export const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE))
export const clampPage = (page: number, total: number) => Math.min(Math.max(0, Number.isFinite(page) ? page : 0), pageCount(total) - 1)

/** ‹ 1/3 › row; `prefix` is the callback data up to the page number, e.g. `p:list` */
export function pagerRow(kb: InlineKeyboard, prefix: string, page: number, total: number): InlineKeyboard {
  const pages = pageCount(total)
  if (pages <= 1) return kb
  if (page > 0) kb.text('‹', `${prefix}:${page - 1}`)
  kb.text(`${page + 1}/${pages}`, 'x:noop')
  if (page < pages - 1) kb.text('›', `${prefix}:${page + 1}`)
  return kb.row()
}

/** «‹ Назад» + «⌂ Меню» */
export function nav(kb: InlineKeyboard, back?: string): InlineKeyboard {
  if (back) kb.text('‹ Назад', back)
  return kb.text('⌂ Меню', 'm:home').row()
}

export function homeKeyboard(userId: number): InlineKeyboard {
  const kb = new InlineKeyboard().text('📤 Опубликовать плагин', 'w:pub').row().text('📦 Мои плагины', 'p:list:0').row().text('ℹ️ Помощь', 'm:help').row()
  if (isAdmin(userId)) kb.text('🛡 Модерация', 'a:home').row()
  return kb
}

const OPTS = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } } as const

const notModified = (e: unknown) => /message is not modified/i.test(errText(e))

/** one screen = one message: edit in place on a button click, send a new message otherwise */
export async function screen(ctx: Context, text: string, kb?: InlineKeyboard): Promise<void> {
  const msg = ctx.callbackQuery?.message
  if (msg) {
    try {
      if ('document' in msg && msg.document) {
        await ctx.editMessageCaption({ caption: text.slice(0, 1024), reply_markup: kb, parse_mode: 'HTML' })
      } else {
        await ctx.editMessageText(text, { ...OPTS, reply_markup: kb })
      }
      return
    } catch (e) {
      if (notModified(e)) return
      // message too old to edit, deleted, etc.: fall back to a fresh one
    }
  }
  await ctx.reply(text, { ...OPTS, reply_markup: kb })
}

export async function showHome(ctx: Context): Promise<void> {
  const uid = ctx.from!.id
  await screen(ctx, '<b>Маркет плагинов Inugram</b>\nВыберите действие:', homeKeyboard(uid))
}
