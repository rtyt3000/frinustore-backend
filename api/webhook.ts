import { webhookCallback } from 'grammy'
import { createBot } from '../src/bot.ts'
import { config } from '../src/config.ts'

// module level: reused between warm invocations
const bot = createBot()
// Telegram retries on non-2xx, and updates are deduplicated by update_id, so business errors
// never surface as a failure; grammY itself answers 401 on a wrong secret token.
const handle = webhookCallback(bot, 'std/http', {
  secretToken: config().webhookSecret,
  timeoutMilliseconds: 55_000,
})

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response('ok')
    // checked here, before grammY's lazy getMe() on a cold start
    if (request.headers.get('x-telegram-bot-api-secret-token') !== config().webhookSecret) {
      return new Response('unauthorized', { status: 401 })
    }
    return handle(request)
  },
}
