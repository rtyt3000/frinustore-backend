const RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export interface Semver {
  major: number
  minor: number
  patch: number
  pre: string[]
}

export function parseSemver(v: string): Semver | null {
  const m = RE.exec(v)
  if (!m) return null
  return { major: +m[1]!, minor: +m[2]!, patch: +m[3]!, pre: m[4] ? m[4].split('.') : [] }
}

function cmpPre(a: string[], b: string[]): number {
  if (!a.length || !b.length) return a.length === b.length ? 0 : a.length ? -1 : 1
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i]
    const y = b[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      if (+x !== +y) return +x < +y ? -1 : 1
    } else if (xn !== yn) {
      return xn ? -1 : 1
    } else if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return 0
}

/** negative / 0 / positive; throws on invalid input */
export function compareSemver(a: string, b: string): number {
  const x = parseSemver(a)
  const y = parseSemver(b)
  if (!x || !y) throw new Error(`invalid semver: ${!x ? a : b}`)
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch || cmpPre(x.pre, y.pre)
}

export function maxSemver(versions: string[]): string | null {
  let best: string | null = null
  for (const v of versions) if (parseSemver(v) && (best === null || compareSemver(v, best) > 0)) best = v
  return best
}
