import { config as loadEnv } from 'dotenv'
import { createDb, ensureDatabaseSchema, migrate } from '../server/db.js'

loadEnv({ path: '.env.local', override: false, quiet: true })

const E2E_SCHEMA = 'facility_network_e2e'

export default async function globalSetup() {
  const databaseUrl = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error('TEST_DATABASE_URL or DATABASE_URL is required for browser authentication tests.')
  await ensureDatabaseSchema(databaseUrl, E2E_SCHEMA)
  const db = createDb({ databaseUrl, databaseSchema: E2E_SCHEMA })
  try {
    await migrate(db)
    await db.query('TRUNCATE facility_sessions, facility_archive_audit, facility_archive, facility_space_save_audit, facility_bulk_rack_audit, facility_bulk_rack, facility_availability_audit, facility_availability, facility_access_audit, facility_admins, facility_login_throttle RESTART IDENTITY CASCADE')
  } finally {
    await db.close()
  }
}
