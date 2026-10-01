import { loadConfig } from './config.js'
import { createDb, ensureDatabaseSchema, migrate } from './db.js'

const config = loadConfig()
await ensureDatabaseSchema(config.databaseUrl, config.databaseSchema)
const db = createDb(config)
try {
  await migrate(db)
  console.log('Facility Network database migration complete.')
} finally {
  await db.close()
}
