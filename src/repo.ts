import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { Result } from './validate.ts'

export const DEFAULT_REPO_HOSTS = ['github.com', 'gitlab.com', 'codeberg.org', 'bitbucket.org', 'git.sr.ht', 'gitea.com']
export const MAX_REPO_LENGTH = 200

export function allowedHosts(env = process.env.REPO_HOSTS): string[] {
  const extra = (env ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  return extra.length ? extra : DEFAULT_REPO_HOSTS
}

/**
 * Validates and normalizes a repository link: https only, allowed host (no subdomains unless listed),
 * no credentials, port 443 at most, at least owner/repo in the path. Idempotent.
 * Normalization: lower-case host, fragment and trailing slashes removed.
 */
export function normalizeRepo(raw: string, hosts: string[] = allowedHosts()): Result<string> {
  const text = raw.trim()
  if (!text) return { ok: false, error: 'ссылка не может быть пустой' }
  if (/\s/.test(text)) return { ok: false, error: 'в ссылке не должно быть пробелов' }
  if (text.length > MAX_REPO_LENGTH + 20) return { ok: false, error: `ссылка длиннее ${MAX_REPO_LENGTH} символов` }
  let u: URL
  try {
    u = new URL(text)
  } catch {
    return { ok: false, error: 'это не похоже на ссылку, нужен адрес вида https://github.com/автор/репозиторий' }
  }
  if (u.protocol !== 'https:') return { ok: false, error: 'допустимы только ссылки https://' }
  if (u.username || u.password) return { ok: false, error: 'в ссылке не должно быть логина и пароля' }
  if (u.port && u.port !== '443') return { ok: false, error: 'нестандартные порты не разрешены' }
  const host = u.hostname.toLowerCase()
  if (!hosts.includes(host)) return { ok: false, error: `хост ${host} не разрешён (разрешены: ${hosts.join(', ')})` }
  const segments = u.pathname.split('/').filter(Boolean)
  if (segments.length < 2) return { ok: false, error: 'в ссылке должны быть владелец и репозиторий: https://хост/владелец/репозиторий' }
  const url = `https://${host}/${segments.join('/')}${u.search}`
  if (url.length > MAX_REPO_LENGTH) return { ok: false, error: `ссылка длиннее ${MAX_REPO_LENGTH} символов` }
  return { ok: true, value: url }
}

// ---- reachability check (optional, never blocks publishing)

/** loopback, private, link-local, CGNAT, multicast and other non-public addresses */
export function isPublicIp(ip: string): boolean {
  const kind = isIP(ip)
  if (kind === 4) {
    const [a, b] = ip.split('.').map(Number) as [number, number]
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && (b === 168 || (b === 0 && ip.split('.')[2] === '0'))) return false
    if (a === 198 && (b === 18 || b === 19)) return false
    if (a >= 224) return false
    return true
  }
  if (kind === 6) {
    const v = ip.toLowerCase()
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v)
    if (mapped) return isPublicIp(mapped[1]!)
    if (v === '::' || v === '::1') return false
    if (/^f[cd]/.test(v)) return false // fc00::/7 unique local
    if (/^fe[89ab]/.test(v)) return false // fe80::/10 link-local
    if (v.startsWith('ff')) return false // multicast
    return true
  }
  return false
}

export type RepoStatus =
  | { status: 'ok' }
  /** the host answered 404 for this repository */
  | { status: 'not_found' }
  /** timeout, 5xx, DNS failure, blocked redirect: a hint only */
  | { status: 'unreachable'; detail: string }

export interface CheckDeps {
  fetch?: (url: string, init: RequestInit) => Promise<Response>
  resolve?: (host: string) => Promise<string[]>
  hosts?: string[]
  timeoutMs?: number
}

const defaultResolve = async (host: string) => (await lookup(host, { all: true })).map((a) => a.address)

export async function checkRepo(url: string, deps: CheckDeps = {}): Promise<RepoStatus> {
  const doFetch = deps.fetch ?? fetch
  const resolve = deps.resolve ?? defaultResolve
  const hosts = deps.hosts ?? allowedHosts()
  const signal = AbortSignal.timeout(deps.timeoutMs ?? 3000)
  let current = url
  try {
    for (let hop = 0; hop <= 2; hop++) {
      const u = new URL(current)
      // every hop: https, allowed host, and only public addresses (SSRF guard)
      if (u.protocol !== 'https:' || !hosts.includes(u.hostname.toLowerCase())) return { status: 'unreachable', detail: 'редирект на неразрешённый хост' }
      const ips = isIP(u.hostname) ? [u.hostname] : await resolve(u.hostname)
      if (!ips.length || !ips.every(isPublicIp)) return { status: 'unreachable', detail: 'адрес хоста не публичный' }

      let res = await doFetch(current, { method: 'HEAD', redirect: 'manual', signal })
      if (res.status === 405 || res.status === 501) res = await doFetch(current, { method: 'GET', redirect: 'manual', signal })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) return { status: 'unreachable', detail: 'редирект без адреса' }
        current = new URL(loc, current).toString()
        continue
      }
      if (res.status === 404 || res.status === 410) return { status: 'not_found' }
      if (res.status >= 200 && res.status < 300) return { status: 'ok' }
      // 401/403 (private repo or bot protection), 429, 5xx: do not claim the repo is missing
      return { status: 'unreachable', detail: `ответ ${res.status}` }
    }
    return { status: 'unreachable', detail: 'слишком много редиректов' }
  } catch (e) {
    return { status: 'unreachable', detail: (e as Error)?.name === 'TimeoutError' ? 'таймаут' : 'нет ответа' }
  }
}

export const repoWarningText = (s: RepoStatus): string | null =>
  s.status === 'ok' ? null : s.status === 'not_found' ? 'репозиторий не найден (404)' : `репозиторий не проверен: ${s.detail}`
