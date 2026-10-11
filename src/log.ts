export function log(level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, msg, t: new Date().toISOString(), ...extra })
  if (level === 'error') console.error(line)
  else console.log(line)
}
