import { Api } from 'grammy'
import { config } from '../src/config.ts'

const url = process.env.WEBHOOK_URL ?? process.argv[2]
if (!url) throw new Error('pass the webhook url: WEBHOOK_URL=… or `bun run set-webhook <url>`')

const api = new Api(config().botToken)
const before = await api.getWebhookInfo()
await api.setWebhook(url, {
  secret_token: config().webhookSecret,
  allowed_updates: ['message', 'callback_query', 'inline_query'],
  // pending updates are only dropped when the url changes
  drop_pending_updates: before.url !== url,
})
const info = await api.getWebhookInfo()
console.log(JSON.stringify({ url: info.url, pending: info.pending_update_count, error: info.last_error_message ?? null }))
