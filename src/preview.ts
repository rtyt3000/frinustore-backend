import type { InputRichMessage } from 'grammy/types'
import { analyzeGrants } from './plugin-header.ts'
import type * as store from './store.ts'
import { STATUS_ICON, STATUS_NAME } from './text.ts'
import { pickDescription } from './validate.ts'

type Block = NonNullable<InputRichMessage['blocks']>[number]

/**
 * A rich message that shows a plugin the way a reader of the market would: screenshots as a
 * slideshow, details in collapsible blocks, and buttons to the source code. Photos are sent by
 * the file_id the bot already holds, so previews work for plugins that are not published yet.
 */
export function buildPreview(opts: {
  plugin: store.Plugin
  installs: number
  versions: store.Version[]
  screenshots: store.Screenshot[]
  channelUsername: string
}): InputRichMessage {
  const { plugin, installs, versions, screenshots } = opts
  const blocks: Block[] = [{ type: 'heading', size: 1, text: plugin.name }]
  blocks.push({ type: 'paragraph', text: `${plugin.author} · установок: ${installs}` })

  const description = pickDescription(plugin.description)
  if (description) blocks.push({ type: 'paragraph', text: description })

  if (screenshots.length) {
    blocks.push({
      type: 'slideshow',
      blocks: screenshots.map((s): Block => ({ type: 'photo', photo: { type: 'photo', media: s.fileId } })),
      caption: { text: 'Скриншоты' },
    })
  }

  const shown = versions.filter((v) => v.status !== 'rejected').slice(0, 10)
  if (shown.length) {
    blocks.push({
      type: 'details',
      summary: `Версии (${shown.length})`,
      is_open: true,
      blocks: [
        {
          type: 'list',
          items: shown.map((v) => ({
            blocks: [
              {
                type: 'paragraph',
                text: `${v.version} ${STATUS_ICON[v.status] ?? ''} ${STATUS_NAME[v.status] ?? v.status}${v.changelog ? ` — ${v.changelog}` : ''}`,
              },
            ],
          })),
        },
      ],
    })
  }

  const latest = shown[0]
  if (latest?.grants) {
    const risk = analyzeGrants(latest.grants)
    blocks.push({
      type: 'details',
      summary: `Гранты версии ${latest.version}`,
      ...(risk.unsafe.length ? { is_open: true as const } : {}),
      blocks: latest.grants.length
        ? [
            {
              type: 'list',
              items: latest.grants.map((g) => ({
                blocks: [{ type: 'paragraph', text: `${g.startsWith('unsafe.') ? '🚨 ' : risk.risky.includes(g) ? '⚠️ ' : ''}${g}` }],
              })),
            },
          ]
        : [{ type: 'paragraph', text: 'Плагин не запрашивает грантов.' }],
    })
  } else if (latest) {
    blocks.push({ type: 'paragraph', text: 'Гранты неизвестны: заголовок файла не разобран.' })
  }

  const buttons: Extract<Block, { type: 'buttons' }>['buttons'] = []
  if (plugin.repoUrl) buttons.push({ text: 'Исходный код', style: 'success', url: plugin.repoUrl })
  buttons.push({ text: 'Канал', url: `https://t.me/${opts.channelUsername}` })
  blocks.push({ type: 'buttons', buttons, align: 'left' })

  return { blocks }
}
