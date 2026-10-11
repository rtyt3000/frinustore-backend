// Schema mirrors src/shared/catalog.ts of the client plugin (frinumarket). Keep in sync.
import { compareSemver } from './semver.ts'
import type { Description } from './validate.ts'

export interface CatalogVersion {
  version: string
  msgId: number
  date: number
  changelog?: string
  grants?: string[]
}

export interface CatalogPlugin {
  id: string
  name: string
  author: string
  description: Description
  icon?: string
  /** https link to the source repository; plugins without one are not listed */
  repo: string
  /** msgIds of photo messages in the channel, in display order; omitted when empty */
  screenshots?: number[]
  installs: number
  versions: CatalogVersion[]
}

export interface Catalog {
  schema: 1
  updatedAt: number
  plugins: CatalogPlugin[]
}

export const MAX_CATALOG_BYTES = 1024 * 1024

export interface PluginRow {
  id: string
  name: string
  author: string
  description: Description
  icon: string
  repo: string | null
  hidden: boolean
}

export interface VersionRow {
  pluginId: string
  version: string
  msgId: number | null
  date: number
  changelog: string | null
  grants: string[] | null
  status: string
}

/** only approved versions of non-hidden plugins that have a repository; others are left out */
export function buildCatalog(
  plugins: PluginRow[],
  versions: VersionRow[],
  installs: Map<string, number>,
  now: number,
  screenshots: Map<string, number[]> = new Map(),
): Catalog {
  const out: CatalogPlugin[] = []
  for (const p of plugins) {
    if (p.hidden || !p.repo) continue
    const vs = versions
      .filter((v) => v.pluginId === p.id && v.status === 'approved' && v.msgId !== null)
      .sort((a, b) => b.date - a.date || compareSemver(b.version, a.version))
      .map((v): CatalogVersion => {
        const cv: CatalogVersion = { version: v.version, msgId: v.msgId!, date: v.date }
        if (v.changelog) cv.changelog = v.changelog
        if (v.grants) cv.grants = v.grants
        return cv
      })
    if (!vs.length) continue
    const shots = (screenshots.get(p.id) ?? []).slice(0, 8)
    out.push({
      id: p.id,
      name: p.name,
      author: p.author,
      description: p.description,
      icon: p.icon,
      repo: p.repo,
      ...(shots.length ? { screenshots: shots } : {}),
      installs: installs.get(p.id) ?? 0,
      versions: vs,
    })
  }
  out.sort((a, b) => b.installs - a.installs || b.versions[0]!.date - a.versions[0]!.date || a.id.localeCompare(b.id))
  return { schema: 1, updatedAt: now, plugins: out }
}

export function serializeCatalog(c: Catalog): string {
  const json = JSON.stringify(c)
  if (new TextEncoder().encode(json).length >= MAX_CATALOG_BYTES) throw new Error('catalog.json превысил 1 МБ')
  return json
}

/** content hash that ignores `updatedAt`, so unchanged catalogs are not re-uploaded */
export function catalogFingerprint(c: Catalog): string {
  return new Bun.CryptoHasher('sha256').update(JSON.stringify({ ...c, updatedAt: 0 })).digest('hex')
}
