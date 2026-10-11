import { Bot, InlineKeyboard, type Context } from 'grammy'
import { askBan, doBackup, doRebuild } from './admin.ts'
import { config, isAdmin } from './config.ts'
import { log } from './log.ts'
import { handleCallback, handleText, showMyPlugins } from './menu.ts'
import { errText } from './publish.ts'
import * as store from './store.ts'
import { Stale, showHome } from './ui.ts'
import { onDocument } from './wizard.ts'

const INSTALL_RE = /^install ([a-z0-9._-]{3,64}) (\S{1,64})$/

export function createBot(): Bot {
  const bot = new Bot(config().botToken)

  // Telegram redelivers an update if we were slow: process each update_id once
  bot.use(async (ctx, next) => {
    if (!(await store.markUpdateProcessed(ctx.update.update_id))) return
    await next()
  })

  // inline installs counter: always answer empty first, record after, never fail on the write
  bot.on('inline_query', async (ctx) => {
    await ctx.answerInlineQuery([], { cache_time: 0, is_personal: true }).catch((e) => log('warn', 'answerInlineQuery failed', { error: errText(e) }))
    const m = INSTALL_RE.exec(ctx.inlineQuery.query.trim())
    if (!m || ctx.inlineQuery.query.length > 256) return
    try {
      await store.recordInstall(ctx.from.id, m[1]!, m[2]!)
    } catch (e) {
      log('warn', 'install not recorded', { error: errText(e) })
    }
  })

  // everything below is for people
  bot.use(async (ctx, next) => {
    if (!ctx.from) return
    const privateChat = ctx.chat?.type === 'private'
    const fromButton = !!ctx.callbackQuery
    if (!privateChat && !fromButton) return // in groups only moderator card buttons work
    if (privateChat) {
      const name = ctx.from.username ?? ctx.from.first_name ?? null
      await store.touchUser(ctx.from.id, name).catch(() => {})
    }
    if (await store.isBanned(ctx.from.id)) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: 'Вы заблокированы', show_alert: true }).catch(() => {})
      else await ctx.reply('Вы заблокированы.')
      return
    }
    await next()
  })

  bot.command(['start', 'menu'], async (ctx) => {
    await store.clearSession(ctx.from!.id)
    if (ctx.message?.text?.startsWith('/start')) {
      await ctx.reply(
        'Привет! Я принимаю плагины для Inugram и публикую их в канале ' +
          `@${config().channelUsername}. Всё управление — кнопками ниже.`,
      )
    }
    await showHome(ctx)
  })

  bot.command('cancel', async (ctx) => {
    await store.clearSession(ctx.from!.id)
    await showHome(ctx)
  })

  bot.command('my', (ctx) => showMyPlugins(ctx, 0))

  bot.command('describe', async (ctx) => {
    await ctx.reply('Откройте плагин в списке → «Описание» или «Иконка».')
    await showMyPlugins(ctx, 0)
  })

  const adminOnly = (fn: (ctx: Context) => Promise<unknown>) => async (ctx: Context) => {
    if (!isAdmin(ctx.from!.id)) return
    await fn(ctx)
  }

  bot.command('ban', adminOnly((ctx) => {
    const id = Number(ctx.match)
    if (!Number.isSafeInteger(id) || id <= 0) return ctx.reply('Использование: /ban <user_id>')
    return askBan(ctx, id)
  }))

  bot.command('unban', adminOnly(async (ctx) => {
    const id = Number(ctx.match)
    if (!Number.isSafeInteger(id) || id <= 0) return ctx.reply('Использование: /unban <user_id>')
    await store.setBanned(id, false)
    return ctx.reply(`Пользователь ${id} разблокирован.`)
  }))

  bot.command('rebuild', adminOnly(async (ctx) => ctx.reply((await doRebuild(ctx)) ?? 'Готово')))
  bot.command('backup', adminOnly((ctx) => doBackup(ctx)))

  bot.on('message:document', onDocument)
  bot.on('message:text', handleText)

  bot.on('callback_query:data', async (ctx) => {
    let alert: string | void
    try {
      alert = await handleCallback(ctx)
    } catch (e) {
      if (e instanceof Stale) {
        await ctx.answerCallbackQuery({ text: e.message, show_alert: true }).catch(() => {})
        await showHome(ctx).catch(() => {})
        return
      }
      throw e
    }
    await ctx.answerCallbackQuery(alert ? { text: alert, show_alert: true } : undefined).catch(() => {})
  })

  bot.catch(async (err) => {
    const ctx = err.ctx
    if (err.error instanceof Stale && ctx.chat?.type === 'private') {
      await ctx.reply(err.error.message).catch(() => {})
      return
    }
    log('error', 'update failed', { update: ctx.update.update_id, error: errText(err.error) })
    if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: 'Ошибка, попробуйте ещё раз', show_alert: true }).catch(() => {})
    else if (ctx.chat?.type === 'private') await ctx.reply('Что-то пошло не так, попробуйте ещё раз.').catch(() => {})
  })

  return bot
}
