import { parseSemver } from './semver.ts'

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const fail = (error: string): Result<never> => ({ ok: false, error })

export type Description = string | Record<string, string>

export const ID_RE = /^[a-z0-9._-]{3,64}$/
const ICON_RE = /^(inu:\/\/[A-Za-z0-9_]+|tg:\/\/(emoji|addstickers)\?[^\s]+)$/

export function validateId(raw: string): Result<string> {
  const v = raw.trim()
  return ID_RE.test(v) ? ok(v) : fail('id: 3–64 символа из [a-z0-9._-]')
}

export function validateName(raw: string): Result<string> {
  const v = raw.trim()
  if (!v) return fail('название не может быть пустым')
  return [...v].length <= 40 ? ok(v) : fail('название: не больше 40 символов')
}

export function validateVersion(raw: string): Result<string> {
  const v = raw.trim()
  return parseSemver(v) ? ok(v) : fail('версия должна быть в формате semver, например 1.2.0')
}

export function validateIcon(raw: string): Result<string> {
  const v = raw.trim()
  if (v.length > 200) return fail('иконка слишком длинная')
  return ICON_RE.test(v) ? ok(v) : fail('иконка: inu://имя, tg://emoji?id=… или tg://addstickers?set=…')
}

export function validateChangelog(raw: string): Result<string> {
  const v = raw.trim()
  return [...v].length <= 300 ? ok(v) : fail('changelog: не больше 300 символов')
}

export function validateAuthor(raw: string): Result<string> {
  const v = raw.trim()
  if (!v) return fail('имя автора не может быть пустым')
  return [...v].length <= 40 ? ok(v) : fail('имя автора: не больше 40 символов')
}

/** plain text -> string; `ru: …` / `en: …` lines -> localized map */
export function validateDescription(raw: string): Result<Description> {
  const text = raw.trim()
  const map: Record<string, string> = {}
  let current: string | null = null
  let localized = false
  let stray = false
  for (const line of text.split(/\r?\n/)) {
    const m = /^([a-z]{2}):\s?(.*)$/.exec(line)
    if (m) {
      if (stray) return fail('описание: либо обычный текст, либо строки вида «ru: …» и «en: …»')
      current = m[1]!
      localized = true
      map[current] = m[2]!
    } else if (current) {
      map[current] += '\n' + line
    } else if (!current && line.trim()) {
      stray = true
    }
  }
  if (!localized) return [...text].length <= 500 ? ok(text) : fail('описание: не больше 500 символов')
  for (const k of Object.keys(map)) {
    map[k] = map[k]!.trim()
    if (!map[k]) delete map[k]
    else if ([...map[k]!].length > 500) return fail(`описание (${k}): не больше 500 символов`)
  }
  return Object.keys(map).length ? ok(map) : ok('')
}

export function descriptionToText(d: Description): string {
  if (typeof d === 'string') return d
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

export function pickDescription(d: Description): string {
  if (typeof d === 'string') return d
  return d.ru ?? d.en ?? Object.values(d)[0] ?? ''
}
