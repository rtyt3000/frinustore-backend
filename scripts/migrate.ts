import { migrate } from '../src/db.ts'

const applied = await migrate()
console.log(applied.length ? `applied: ${applied.join(', ')}` : 'database is up to date')
