// Best-effort parser of the `==InuPlugin==` header. The bot never depends on it:
// it only prefills the publish wizard and hints at risky grants.

export interface PluginHeader {
  id?: string
  name?: string
  author?: string
  version?: string
  description?: string
  icon?: string
  /** every `@grant` line; empty when the header has none */
  grants: string[]
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024

const BLOCK = /^[ \t]*\/\/[ \t]*==InuPlugin==[ \t]*\r?\n([\s\S]*?)^[ \t]*\/\/[ \t]*==\/InuPlugin==/m

export function parseHeader(src: string): PluginHeader | null {
  const block = BLOCK.exec(src)
  if (!block) return null
  const header: PluginHeader = { grants: [] }
  for (const raw of block[1]!.split(/\r?\n/)) {
    const m = /^[ \t]*\/\/[ \t]*@([A-Za-z][\w-]*)[ \t]*(.*?)[ \t]*$/.exec(raw)
    if (!m) continue
    const key = m[1]!.toLowerCase()
    const value = m[2]!
    if (key === 'grant') {
      if (value) header.grants.push(value)
    } else if (
      value &&
      (key === 'id' || key === 'name' || key === 'author' || key === 'version' || key === 'description' || key === 'icon')
    ) {
      header[key] ??= value
    }
  }
  return header
}

export type TextCheck = { ok: true; text: string } | { ok: false; error: string }

/** UTF-8 text without NUL bytes, i.e. JS and not a binary */
export function decodeText(buf: Uint8Array): TextCheck {
  if (buf.includes(0)) return { ok: false, error: 'файл похож на бинарный (есть нулевые байты)' }
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(buf) }
  } catch {
    return { ok: false, error: 'файл не в кодировке UTF-8' }
  }
}

export interface GrantRisk {
  /** header was not parsed, so grants are unknown */
  unknown: boolean
  unsafe: string[]
  risky: string[]
}

const bare = (grant: string, name: string) =>
  grant === name || grant === `${name}()` || grant === `${name}(*)` || grant.startsWith(`${name}(*`)

export function analyzeGrants(grants: string[] | null): GrantRisk {
  if (!grants) return { unknown: true, unsafe: [], risky: [] }
  return {
    unknown: false,
    unsafe: grants.filter((g) => g.startsWith('unsafe.')),
    risky: grants.filter((g) => bare(g, 'fetch') || bare(g, 'invokeRpc')),
  }
}

/** unsafe grants not already present in previously approved versions */
export function newUnsafe(grants: string[] | null, previous: string[][]): string[] {
  const seen = new Set(previous.flat())
  return analyzeGrants(grants).unsafe.filter((g) => !seen.has(g))
}
