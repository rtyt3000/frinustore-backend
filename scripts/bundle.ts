// Vercel does not reliably ship src/ next to api/*.ts, so each function is bundled into one
// self-contained file. The output in api/ is committed: run `bun run bundle` after changing src/.
const entries = [
  { entry: 'src/entry/webhook.ts', name: 'webhook.js', dir: 'api' },
  { entry: 'src/entry/flush.ts', name: 'flush.js', dir: 'api/cron' },
]

for (const e of entries) {
  const res = await Bun.build({ entrypoints: [e.entry], outdir: e.dir, naming: e.name, target: 'bun', minify: false })
  if (!res.success) {
    for (const m of res.logs) console.error(String(m))
    process.exit(1)
  }
  console.log(`${e.entry} -> ${e.dir}/${e.name}`)
}
export {}
