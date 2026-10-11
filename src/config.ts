export interface Config {
  botToken: string
  webhookSecret: string
  cronSecret: string
  databaseUrl: string
  channelId: number
  channelUsername: string
  adminIds: number[]
  modChatId: number | null
  moderation: boolean
  dailyLimit: number
}

let cached: Config | undefined

function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`env ${name} is not set`)
  return v
}

/** read lazily so tests and scripts that need only part of the env do not fail on import */
export function config(): Config {
  return (cached ??= {
    botToken: req('BOT_TOKEN'),
    webhookSecret: req('WEBHOOK_SECRET'),
    cronSecret: process.env.CRON_SECRET ?? '',
    databaseUrl: req('DATABASE_URL'),
    channelId: Number(req('CHANNEL_ID')),
    channelUsername: process.env.CHANNEL_USERNAME ?? 'frinu_store',
    adminIds: (process.env.ADMIN_IDS ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isSafeInteger(n) && n !== 0),
    modChatId: process.env.MOD_CHAT_ID ? Number(process.env.MOD_CHAT_ID) : null,
    moderation: (process.env.MODERATION ?? 'on').toLowerCase() !== 'off',
    dailyLimit: Number(process.env.DAILY_LIMIT ?? 10) || 10,
  })
}

export const isAdmin = (userId: number) => config().adminIds.includes(userId)
