import { Api } from 'grammy'
import { ADMIN_COMMANDS, DESCRIPTION, SHORT_DESCRIPTION, USER_COMMANDS } from '../src/commands.ts'
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

// the «/» menu: everyone gets the user commands, moderators additionally the admin ones
await api.setMyCommands(USER_COMMANDS)
for (const id of config().adminIds) {
  await api.setMyCommands([...USER_COMMANDS, ...ADMIN_COMMANDS], { scope: { type: 'chat', chat_id: id } }).catch((e) => console.warn(`commands for ${id}: ${e.description ?? e}`))
}
await api.setMyShortDescription(SHORT_DESCRIPTION)
await api.setMyDescription(DESCRIPTION)
console.log('commands and descriptions updated')
