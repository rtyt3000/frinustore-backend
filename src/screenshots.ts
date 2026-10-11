import type { Api } from 'grammy'
import { PublishError, discardScreenshots, publishOneScreenshot, refreshCatalog, deleteChannelMessage } from './publish.ts'
import * as store from './store.ts'

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const MIN_SIDE = 320

export interface PhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export type PhotoCheck = { ok: true; fileId: string; uniqueId: string } | { ok: false; error: string }

/** Telegram sends several sizes of one photo; the largest one is what we keep */
export function checkPhoto(sizes: PhotoSize[] | undefined): PhotoCheck {
  if (!sizes?.length) return { ok: false, error: 'Пришлите скриншот как фото (не файлом и не стикером)' }
  const best = sizes.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a))
  if (best.file_size !== undefined && best.file_size > MAX_PHOTO_BYTES) return { ok: false, error: 'Фото больше 10 МБ' }
  if (Math.min(best.width, best.height) < MIN_SIDE) return { ok: false, error: `Минимальная сторона фото — ${MIN_SIDE} px (у этого ${Math.min(best.width, best.height)})` }
  return { ok: true, fileId: best.file_id, uniqueId: best.file_unique_id }
}

export type AddResult = { kind: 'added'; count: number; published: boolean } | { kind: 'error'; message: string }

/**
 * Adds a photo to an existing plugin. A plugin that already has an approved version is published
 * at once; otherwise the photo waits for the moderator's decision on the first version.
 */
export async function addScreenshot(api: Api, plugin: store.Plugin, photo: { fileId: string; uniqueId: string }): Promise<AddResult> {
  const added = await store.addScreenshot(plugin.id, photo.fileId, photo.uniqueId)
  if (!added.ok) {
    return { kind: 'error', message: added.reason === 'full' ? `Уже ${store.MAX_SCREENSHOTS} скриншотов — это максимум` : 'Этот скриншот уже добавлен' }
  }
  const live = await store.hasApproved(plugin.id)
  if (live) {
    try {
      await publishOneScreenshot(api, plugin.id, added.shot)
      await refreshCatalog(api)
    } catch (e) {
      await discardScreenshots(api, [added.shot])
      await store.removeScreenshot(added.shot.id)
      return { kind: 'error', message: `Не удалось опубликовать скриншот: ${e instanceof Error ? e.message : e}` }
    }
  }
  return { kind: 'added', count: (await store.listScreenshots(plugin.id)).length, published: live }
}

/** the catalog is rewritten first, so it never lists a deleted photo */
export async function deleteScreenshot(api: Api, shot: store.Screenshot): Promise<void> {
  const removed = await store.removeScreenshot(shot.id)
  if (!removed) return
  if (removed.msgId !== null) {
    const r = await refreshCatalog(api, { waitMs: 20000 })
    if (r === 'queued') {
      await store.restoreScreenshot(removed)
      throw new PublishError('Каталог сейчас обновляется, попробуйте через минуту')
    }
    await deleteChannelMessage(api, removed.msgId)
  }
}

export async function moveScreenshot(api: Api, plugin: store.Plugin, id: number, dir: -1 | 1): Promise<void> {
  if (await store.moveScreenshot(plugin.id, id, dir)) await refreshCatalog(api)
}
