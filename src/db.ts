import { neon, Pool } from '@neondatabase/serverless'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from './config.ts'

// created at module level so a warm function reuses the client
let client: ReturnType<typeof neon> | undefined

type Runner = (text: string, params: unknown[]) => Promise<unknown[]>
let runner: Runner | undefined

/** tests swap the HTTP driver for an in-process Postgres */
export function setQueryRunner(r: Runner | undefined): void {
  runner = r
}

export async function q<T = Record<string, any>>(text: string, params: unknown[] = []): Promise<T[]> {
  if (runner) return (await runner(text, params)) as T[]
  client ??= neon(config().databaseUrl)
  return (await client.query(text, params as any[])) as T[]
}

export async function one<T = Record<string, any>>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null
}

export const now = () => Math.floor(Date.now() / 1000)

/** idempotent migrations from ./migrations, tracked in schema_migrations */
export async function migrate(dir = join(import.meta.dir, '..', 'migrations')): Promise<string[]> {
  const pool = new Pool({ connectionString: config().databaseUrl })
  const applied: string[] = []
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)')
    const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r: any) => r.name))
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      if (done.has(file)) continue
      const body = await readFile(join(dir, file), 'utf8')
      const c = await pool.connect()
      try {
        await c.query('BEGIN')
        await c.query(body)
        await c.query('INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)', [file, now()])
        await c.query('COMMIT')
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {})
        throw new Error(`migration ${file} failed: ${e instanceof Error ? e.message : e}`)
      } finally {
        c.release()
      }
      applied.push(file)
    }
  } finally {
    await pool.end()
  }
  return applied
}
