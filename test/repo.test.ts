import { describe, expect, test } from 'bun:test'
import { checkRepo, isPublicIp, normalizeRepo, repoWarningText } from '../src/repo.ts'

const ok = (raw: string) => {
  const r = normalizeRepo(raw)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('normalizeRepo', () => {
  test('accepts and normalizes', () => {
    expect(ok('https://github.com/o/r')).toBe('https://github.com/o/r')
    expect(ok('https://github.com/o/r/')).toBe('https://github.com/o/r')
    expect(ok('https://GitHub.com/o/r#readme')).toBe('https://github.com/o/r')
    expect(ok('https://github.com:443/o/r')).toBe('https://github.com/o/r')
    expect(ok('  https://gitlab.com/group/sub/repo  ')).toBe('https://gitlab.com/group/sub/repo')
    expect(ok('https://codeberg.org/o/r')).toBe('https://codeberg.org/o/r')
    expect(ok('https://git.sr.ht/~o/r')).toBe('https://git.sr.ht/~o/r')
  })

  test('is idempotent', () => {
    for (const raw of ['https://GitHub.com/o/r/#x', 'https://gitlab.com/a/b/c/', 'https://github.com/o/r?tab=readme']) {
      const once = ok(raw)
      expect(ok(once)).toBe(once)
    }
  })

  test('rejects what the task lists', () => {
    for (const bad of [
      'http://github.com/o/r',
      'https://github.com/o',
      'https://github.com/',
      'https://github.com',
      'https://evil.example/o/r',
      'https://user:pw@github.com/o/r',
      'https://user@github.com/o/r',
      'ftp://github.com/o/r',
      'https://github.com/o/ r',
      'https://localhost/o/r',
      'https://127.0.0.1/o/r',
      'https://github.com:8443/o/r',
      'https://api.github.com/o/r', // subdomains are not allowed unless listed
      'github.com/o/r',
      '',
      'javascript:alert(1)',
    ]) {
      expect(normalizeRepo(bad).ok).toBe(false)
    }
  })

  test('length limit and a host-looking lookalike', () => {
    expect(normalizeRepo('https://github.com/o/' + 'a'.repeat(200)).ok).toBe(false)
    expect(normalizeRepo('https://github.com.evil.example/o/r').ok).toBe(false)
    expect(normalizeRepo('https://evil.example/github.com/o/r').ok).toBe(false)
  })

  test('hosts come from REPO_HOSTS when given', () => {
    expect(normalizeRepo('https://git.example.org/o/r', ['git.example.org']).ok).toBe(true)
    expect(normalizeRepo('https://github.com/o/r', ['git.example.org']).ok).toBe(false)
  })
})

describe('isPublicIp', () => {
  test('blocks private, loopback, link-local and other internal ranges', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'not-an-ip']) {
      expect(isPublicIp(ip)).toBe(false)
    }
  })
  test('allows public addresses', () => {
    for (const ip of ['140.82.121.4', '8.8.8.8', '172.32.0.1', '2606:50c0:8000::154']) expect(isPublicIp(ip)).toBe(true)
  })
})

const URL_OK = 'https://github.com/o/r'
const publicDns = async () => ['140.82.121.4']
const resp = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers })

describe('checkRepo', () => {
  test('200 is ok, 404 is not_found, other failures are only a hint', async () => {
    expect((await checkRepo(URL_OK, { fetch: async () => resp(200), resolve: publicDns })).status).toBe('ok')
    expect((await checkRepo(URL_OK, { fetch: async () => resp(404), resolve: publicDns })).status).toBe('not_found')
    for (const code of [403, 429, 500, 503]) {
      expect((await checkRepo(URL_OK, { fetch: async () => resp(code), resolve: publicDns })).status).toBe('unreachable')
    }
  })

  test('falls back to GET when HEAD is not allowed', async () => {
    const methods: string[] = []
    const r = await checkRepo(URL_OK, {
      fetch: async (_u, init) => {
        methods.push(init!.method!)
        return resp(init!.method === 'HEAD' ? 405 : 200)
      },
      resolve: publicDns,
    })
    expect(r.status).toBe('ok')
    expect(methods).toEqual(['HEAD', 'GET'])
  })

  test('SSRF: a host resolving to a private address is never requested', async () => {
    let called = false
    const r = await checkRepo(URL_OK, {
      fetch: async () => {
        called = true
        return resp(200)
      },
      resolve: async () => ['10.0.0.8'],
    })
    expect(r.status).toBe('unreachable')
    expect(called).toBe(false)
    // one private address among public ones is enough to refuse
    expect((await checkRepo(URL_OK, { fetch: async () => resp(200), resolve: async () => ['140.82.121.4', '127.0.0.1'] })).status).toBe('unreachable')
  })

  test('redirects: followed only to allowed hosts, at most two hops, re-checked every hop', async () => {
    const hop = (to: string) => resp(301, { location: to })
    const seen: string[] = []
    const ok2 = await checkRepo(URL_OK, {
      fetch: async (u) => {
        seen.push(String(u))
        return String(u).endsWith('/new') ? resp(200) : hop('https://github.com/o/new')
      },
      resolve: publicDns,
    })
    expect(ok2.status).toBe('ok')
    expect(seen).toEqual([URL_OK, 'https://github.com/o/new'])

    const off = await checkRepo(URL_OK, { fetch: async () => hop('https://evil.example/x'), resolve: publicDns })
    expect(off).toMatchObject({ status: 'unreachable' })
    const internal = await checkRepo(URL_OK, { fetch: async () => hop('http://169.254.169.254/latest'), resolve: publicDns })
    expect(internal.status).toBe('unreachable')

    let n = 0
    const loop = await checkRepo(URL_OK, { fetch: async () => (n++, hop(`https://github.com/o/r${n}`)), resolve: publicDns })
    expect(loop.status).toBe('unreachable')
    expect(n).toBe(3) // the original request plus two redirects
  })

  test('timeout and network errors never throw', async () => {
    const slow = (_u: unknown, init?: RequestInit) =>
      new Promise<Response>((_, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason)))
    const r = await checkRepo(URL_OK, { fetch: slow as typeof fetch, resolve: publicDns, timeoutMs: 20 })
    expect(r).toMatchObject({ status: 'unreachable', detail: 'таймаут' })
    expect((await checkRepo(URL_OK, { fetch: async () => { throw new Error('boom') }, resolve: publicDns })).status).toBe('unreachable')
    expect((await checkRepo(URL_OK, { fetch: async () => resp(200), resolve: async () => { throw new Error('dns') } })).status).toBe('unreachable')
  })

  test('warning texts', () => {
    expect(repoWarningText({ status: 'ok' })).toBeNull()
    expect(repoWarningText({ status: 'not_found' })).toContain('404')
    expect(repoWarningText({ status: 'unreachable', detail: 'таймаут' })).toContain('таймаут')
  })
})
