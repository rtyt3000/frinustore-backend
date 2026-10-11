import { webhookCallback } from 'grammy'
import { createBot } from '../bot.ts'
import { config } from '../config.ts'

const REQUIRED = ['BOT_TOKEN', 'WEBHOOK_SECRET', 'DATABASE_URL', 'CHANNEL_ID']

type Handler = (request: Request) => Promise<Response>
let handler: Handler | undefined
let secret = ''

// Imports must stay static (Vercel only bundles those); the bot itself is created lazily inside
// try/catch so a missing env var is logged instead of surfacing as FUNCTION_INVOCATION_FAILED.
async function init(): Promise<Handler> {
  if (handler) return handler
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
