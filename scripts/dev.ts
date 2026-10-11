// local development only: long polling instead of the webhook
import { createBot } from '../src/bot.ts'

const bot = createBot()
await bot.api.deleteWebhook()
await bot.start({
  allowed_updates: ['message', 'callback_query', 'inline_query'],
  onStart: (me) => console.log(`polling as @${me.username}`),
})
