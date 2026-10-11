import type { GrantRisk } from './plugin-header.ts'

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function grantsBlock(grants: string[] | null, risk: GrantRisk): string {
  if (grants === null) return '🔐 Гранты: <i>неизвестны</i> (заголовок не разобран)'
  if (!grants.length) return '🔐 Гранты: нет'
  const lines = grants.map((g) => {
    const mark = g.startsWith('unsafe.') ? '🚨' : risk.risky.includes(g) ? '⚠️' : '•'
    return `${mark} <code>${esc(g)}</code>`
  })
  return `🔐 Гранты:\n${lines.join('\n')}`
}

export function when(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

export const STATUS_ICON: Record<string, string> = {
  approved: '✅',
  pending: '⏳',
  rejected: '❌',
  hidden: '🙈',
  publishing: '⏳',
}

export const STATUS_NAME: Record<string, string> = {
  approved: 'опубликована',
  pending: 'на модерации',
  rejected: 'отклонена',
  hidden: 'скрыта',
  publishing: 'публикуется',
}
