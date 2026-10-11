import { Api } from 'grammy'
import { config } from '../../src/config.ts'
import { log } from '../../src/log.ts'
import { refreshCatalog, runJobs } from '../../src/publish.ts'
import * as store from '../../src/store.ts'

// Vercel Cron: batches the installs counter into catalog.json and drains the jobs queue.
export default {
  async fetch(request: Request): Promise<Response> {
    const secret = config().cronSecret
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('unauthorized', { status: 401 })
    const api = new Api(config().botToken)
    try {
      const released = await store.releaseStuckVersions(300)
      const jobs = await runJobs(api)
      // picks up new installs; a no-op when the catalog content did not change
      const flush = await refreshCatalog(api, { waitMs: 5000 })
      await store.cleanup()
      log('info', 'cron flush', { released, jobs, flush })
      return Response.json({ ok: true, released, jobs, flush })
    } catch (e) {
      log('error', 'cron flush failed', { error: e instanceof Error ? e.message : String(e) })
      return Response.json({ ok: false }, { status: 500 })
    }
  },
}
