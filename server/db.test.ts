import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPoolConfig } from './db.js'

const databaseUrl = 'postgres://example.invalid/facility_network_auth'

test('public schema omits unsupported PostgreSQL startup options', () => {
  const config = createPoolConfig({ databaseUrl, databaseSchema: 'public' })

  assert.equal(config.connectionString, databaseUrl)
  assert.equal(config.max, 10)
  assert.equal('options' in config, false)
})

test('explicit non-public test schema retains its isolated search path', () => {
  const config = createPoolConfig({ databaseUrl, databaseSchema: 'facility_network_server_test' })

  assert.equal(config.options, '-c search_path=facility_network_server_test,public')
})
