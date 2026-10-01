import { createServer } from 'node:http'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDb, ensureDatabaseSchema, migrate } from './db.js'

const config = loadConfig()
await ensureDatabaseSchema(config.databaseUrl, config.databaseSchema)
const db = createDb(config)
await migrate(db)
const app = createApp({ config, db })
const server = createServer(app)
server.listen(config.port, '0.0.0.0', () => console.log(`Facility Network listening on 0.0.0.0:${config.port}`))

const shutdown = () => server.close(() => db.close().finally(() => process.exit(0)))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
