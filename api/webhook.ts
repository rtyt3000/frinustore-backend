import { webhookCallback } from 'grammy'

const REQUIRED = ['BOT_TOKEN', 'WEBHOOK_SECRET', 'DATABASE_URL', 'CHANNEL_ID']

type Handler = (request: Request) => Promise<Response>
let handler: Handler | undefined
let secret = ''

// Initialised lazily and inside try/catch: a failure at module load would only show up as
// FUNCTION_INVOCATION_FAILED without any log line.
async function init(): Promise<Handler> {
  if (handler) return handler
  const { createBot } = await import('../src/bot.ts')
  const { config } = await import('../src/config.ts')
  secret = config().webhookSecret
  // Telegram retries on non-2xx, and updates are deduplicated by update_id, so business errors
  // never surface as a failure.
  handler = webhookCallback(createBot(), 'std/http', { timeoutMilliseconds: 55_000 })
  return handler
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method !== 'POST') {
        // health check: names of missing env vars only, never values
        const missing = REQUIRED.filter((k) => !process.env[k])
        return Response.json({ ok: missing.length === 0, missing })
      }
      const handle = await init()
      // checked here, before grammY's lazy getMe() on a cold start
      if (request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
        return new Response('unauthorized', { status: 401 })
      }
      return await handle(request)
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', msg: 'webhook crashed', error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }))
      return new Response('internal error', { status: 500 })
    }
  },
}
