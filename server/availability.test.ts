import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, beforeEach, test } from 'node:test'
import { config as loadEnv } from 'dotenv'
import request from 'supertest'
import { adminFacilitySpace, availabilityHistory, facilitySpaceHistory, saveAvailability, saveFacilitySpace } from './availability.js'
import type { AdminAccess } from './access.js'
import { createApp } from './app.js'
import type { AppConfig } from './config.js'
import { createDb, ensureDatabaseSchema, migrate } from './db.js'
import { facilityIds } from './data/facility-ids.js'
import { facilityAvailabilitySnapshots } from './data/facility-availability-snapshots.js'
import { facilityBulkRackSnapshots } from './data/facility-bulk-rack-snapshots.js'
import { facilities } from '../src/data/facilities.js'
import { facilityAvailableSpace, facilityBulkRack } from '../src/data/facility-space.js'
import { hmacSha256 } from './security.js'

loadEnv({ path: '.env.local', override: false, quiet: true })

const databaseUrl = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('TEST_DATABASE_URL or DATABASE_URL is required for availability tests.')
const databaseSchema = 'facility_network_availability_test'
const sessionSecret = 'availability-test-secret-longer-than-thirty-two-characters'
const db = createDb({ databaseUrl, databaseSchema })
const origin = 'http://127.0.0.1:4215'
const config: AppConfig = {
  publicOrigin: origin, secureCookies: false, databaseUrl, databaseSchema, sessionSecret,
  itemGptBaseUrl: '', wmsBaseUrl: '', wmsServiceUsername: '', wmsServicePassword: '', tenantId: 'LT', facilityId: 'LT_F1',
  bootstrap: { iamUserId: '2084344241143070722', tenantId: 'LT', username: 'lmadala', email: 'lalith.madala@item.com' },
  port: 4215, trustProxy: false, sessionHours: 8,
}

async function resetDb() {
  await db.query('TRUNCATE facility_sessions,facility_space_save_audit,facility_bulk_rack_audit,facility_bulk_rack,facility_availability_audit,facility_availability,facility_access_audit,facility_admins,facility_login_throttle RESTART IDENTITY CASCADE')
}

async function seedAdmin(active = true) {
  const id = randomUUID()
  const iamUserId = '3001'
  await db.query(`INSERT INTO facility_admins (id,iam_user_id,tenant_id,username,email,display_name,is_active,can_configure)
    VALUES ($1,$2,'LT','operations.admin','operations.admin@item.com','Operations Admin',$3,false)`, [id, iamUserId, active])
  return { id, iamUserId, tenantId: 'LT', username: 'operations.admin', email: 'operations.admin@item.com', displayName: 'Operations Admin', canConfigure: false } satisfies AdminAccess
}

async function authorizedAgent() {
  const actor = await seedAdmin()
  const token = 'availability-session-token'
  const csrf = 'availability-csrf-token'
  await db.query(`INSERT INTO facility_sessions (token_hash,admin_id,csrf_hash,expires_at)
    VALUES ($1,$2,$3,now()+interval '1 hour')`, [hmacSha256(sessionSecret, token), actor.id, hmacSha256(sessionSecret, csrf)])
  const agent = request.agent(createApp({ config, db }))
  agent.jar.setCookie(`facility_session=${token}; Path=/`)
  return { actor, agent, csrf }
}

before(async () => {
  await ensureDatabaseSchema(databaseUrl, databaseSchema)
  await migrate(db)
  await migrate(db)
})
beforeEach(resetDb)
after(async () => { await resetDb(); await db.close() })

test('server fallback maps stay in exact parity with every frontend source snapshot', () => {
  const frontendAvailability = Object.fromEntries(Object.entries(facilityAvailableSpace).map(([facilityId, value]) => [facilityId, {
    squareFeet: value!.squareFeet,
    asOf: value!.asOf,
    ...(value!.status ? { status: value!.status } : {}),
  }]))
  assert.deepEqual(facilityAvailabilitySnapshots, frontendAvailability)
  assert.deepEqual(facilityBulkRackSnapshots, facilityBulkRack)
  assert.equal(Object.keys(facilityAvailabilitySnapshots).length, 19)
  assert.deepEqual(Object.keys(facilityBulkRackSnapshots).sort(), facilityIds.slice().sort())
})

test('repeat migration is idempotent and public projection contains only facility ID and value', async () => {
  await migrate(db)
  await migrate(db)
  const { agent, csrf } = await authorizedAgent()
  await agent.post('/api/admin/availability/buena-park-valley-view').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ squareFeet: 0, version: 0, actorIamUserId: 'spoofed' }).expect(200)
  const response = await request(createApp({ config, db })).get('/api/availability').expect(200)
  assert.deepEqual(response.body, { availability: [{ facilityId: 'buena-park-valley-view', squareFeet: 0 }] })
  assert.deepEqual(Object.keys(response.body.availability[0]).sort(), ['facilityId', 'squareFeet'])
  const bulkRack = await request(createApp({ config, db })).get('/api/bulk-rack').expect(200)
  assert.deepEqual(bulkRack.body, { bulkRack: [] })
})

test('one combined save persists all three values in one authenticated record', async () => {
  const { actor, agent, csrf } = await authorizedAgent()
  const saved = await agent.post('/api/admin/facility-space/summerville-cypress-tradeport').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ availableSquareFeet: 50_000, bulkSquareFeet: 25_000, rackPalletPositions: 700, availabilityVersion: 0, bulkRackVersion: 0, actorIamUserId: 'spoofed', actorUsername: 'spoofed', createdAt: '2000-01-01T00:00:00.000Z' }).expect(200)
  assert.deepEqual(saved.body.space, {
    facilityId: 'summerville-cypress-tradeport', squareFeet: 50_000, version: 1, updatedAt: saved.body.space.updatedAt,
    valueSource: 'administrator', snapshotAsOf: null, snapshotStatus: null,
    bulkSquareFeet: 25_000, bulkUpToSquareFeet: null, bulkValueSource: 'administrator',
    rackPalletPositions: 700, rackValueSource: 'administrator', bulkRackVersion: 1,
    bulkRackUpdatedAt: saved.body.space.bulkRackUpdatedAt, bulkRackSnapshotAsOf: '2026-10',
  })
  const combined = await db.query(`SELECT old_available_square_feet,new_available_square_feet,old_available_value_source,
    old_bulk_square_feet,new_bulk_square_feet,old_bulk_value_source,old_rack_pallet_positions,new_rack_pallet_positions,
    old_rack_value_source,availability_version,bulk_rack_version,actor_iam_user_id,actor_username,created_at
    FROM facility_space_save_audit`)
  assert.equal(combined.rowCount, 1)
  assert.deepEqual({ ...combined.rows[0], created_at: undefined }, {
    old_available_square_feet: null, new_available_square_feet: '50000', old_available_value_source: 'pending',
    old_bulk_square_feet: '70000', new_bulk_square_feet: '25000', old_bulk_value_source: 'source-snapshot',
    old_rack_pallet_positions: '0', new_rack_pallet_positions: '700', old_rack_value_source: 'source-snapshot',
    availability_version: 1, bulk_rack_version: 1, actor_iam_user_id: actor.iamUserId, actor_username: actor.username,
    created_at: undefined,
  })
  assert.notEqual(new Date(combined.rows[0].created_at).toISOString(), '2000-01-01T00:00:00.000Z')
  const legacyHistory = await agent.get('/api/admin/availability/history?facilityId=summerville-cypress-tradeport&page=1').expect(200)
  assert.equal(legacyHistory.body.total, 1)
  assert.equal(legacyHistory.body.entries[0].newSquareFeet, 50_000)
  assert.equal(legacyHistory.body.entries[0].createdAt, new Date(combined.rows[0].created_at).toISOString())
  const legacyAuditCounts = await Promise.all([
    db.query('SELECT count(*)::int count FROM facility_availability_audit'),
    db.query('SELECT count(*)::int count FROM facility_bulk_rack_audit'),
  ])
  assert.deepEqual(legacyAuditCounts.map((result) => result.rows[0].count), [0, 0])
  const publicProjection = await request(createApp({ config, db })).get('/api/bulk-rack').expect(200)
  assert.deepEqual(publicProjection.body, { bulkRack: [{ facilityId: 'summerville-cypress-tradeport', bulkSquareFeet: 25_000, rackPalletPositions: 700 }] })
  assert.deepEqual(Object.keys(publicProjection.body.bulkRack[0]).sort(), ['bulkSquareFeet', 'facilityId', 'rackPalletPositions'])
})

test('zero overrides snapshots and unchanged submitted fields remain complete in each save record', async () => {
  const { agent, csrf } = await authorizedAgent()
  const first = await agent.post('/api/admin/facility-space/joliet-brandon').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ availableSquareFeet: 110_000, bulkSquareFeet: 0, rackPalletPositions: 3000, availabilityVersion: 0, bulkRackVersion: 0 }).expect(200)
  assert.equal(first.body.space.bulkSquareFeet, 0)
  assert.equal(first.body.space.bulkUpToSquareFeet, null)
  assert.equal(first.body.space.bulkValueSource, 'administrator')
  assert.equal(first.body.space.rackPalletPositions, 3000)
  assert.equal(first.body.space.rackValueSource, 'administrator')
  const second = await agent.post('/api/admin/facility-space/joliet-brandon').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ availableSquareFeet: 110_000, bulkSquareFeet: 0, rackPalletPositions: 0, availabilityVersion: 1, bulkRackVersion: 1 }).expect(200)
  assert.equal(second.body.space.bulkSquareFeet, 0)
  assert.equal(second.body.space.rackPalletPositions, 0)
  assert.equal(second.body.space.bulkRackVersion, 2)
  const projection = await request(createApp({ config, db })).get('/api/bulk-rack').expect(200)
  assert.deepEqual(projection.body.bulkRack, [{ facilityId: 'joliet-brandon', bulkSquareFeet: 0, rackPalletPositions: 0 }])
  const audit = await facilitySpaceHistory(db, { page: 1, facilityId: 'joliet-brandon' })
  assert.equal(audit.total, 2)
  assert.deepEqual(audit.entries.map((entry) => [entry.oldAvailableSquareFeet, entry.newAvailableSquareFeet, entry.oldBulkSquareFeet, entry.newBulkSquareFeet, entry.oldRackPalletPositions, entry.newRackPalletPositions]), [
    [110000, 110000, 0, 0, 3000, 0],
    [110000, 110000, 110000, 0, 3000, 3000],
  ])
})

test('migration adds audit provenance without rewriting legacy audit rows and restores immutability', async () => {
  const actor = await seedAdmin()
  await db.query('DROP TABLE facility_space_save_audit')
  await db.query('DROP TRIGGER IF EXISTS facility_availability_audit_immutable ON facility_availability_audit')
  await db.query('ALTER TABLE facility_availability_audit DROP COLUMN IF EXISTS old_value_source')
  const inserted = await db.query(`INSERT INTO facility_availability_audit
    (facility_id,old_square_feet,new_square_feet,version,actor_admin_id,actor_iam_user_id,actor_username,created_at)
    VALUES ('buena-park-valley-view',NULL,4321,1,$1,$2,$3,'2025-04-05T06:07:08.901Z') RETURNING id`,
  [actor.id, actor.iamUserId, actor.username])
  const bulkInserted = await db.query(`INSERT INTO facility_bulk_rack_audit
    (facility_id,metric,old_value,new_value,version,actor_admin_id,actor_iam_user_id,actor_username,old_value_source,created_at)
    VALUES ('buena-park-valley-view','rack',12,34,7,$1,$2,$3,'administrator','2025-04-05T06:07:09.012Z') RETURNING id`,
  [actor.id, actor.iamUserId, actor.username])
  const legacyFields = 'id,facility_id,old_square_feet,new_square_feet,version,actor_admin_id,actor_iam_user_id,actor_username,created_at::text AS created_at'
  const before = await db.query(`SELECT ${legacyFields} FROM facility_availability_audit WHERE id=$1`, [inserted.rows[0].id])
  const bulkLegacyFields = 'id,facility_id,metric,old_value,new_value,version,actor_admin_id,actor_iam_user_id,actor_username,old_value_source,created_at::text AS created_at'
  const bulkBefore = await db.query(`SELECT ${bulkLegacyFields} FROM facility_bulk_rack_audit WHERE id=$1`, [bulkInserted.rows[0].id])

  await migrate(db)
  await migrate(db)

  const after = await db.query(`SELECT ${legacyFields} FROM facility_availability_audit WHERE id=$1`, [inserted.rows[0].id])
  assert.deepEqual(after.rows, before.rows)
  const bulkAfter = await db.query(`SELECT ${bulkLegacyFields} FROM facility_bulk_rack_audit WHERE id=$1`, [bulkInserted.rows[0].id])
  assert.deepEqual(bulkAfter.rows, bulkBefore.rows)
  const stored = await db.query('SELECT old_value_source FROM facility_availability_audit WHERE id=$1', [inserted.rows[0].id])
  assert.deepEqual(stored.rows, [{ old_value_source: 'administrator' }])
  const history = await availabilityHistory(db, { page: 1, facilityId: 'buena-park-valley-view' })
  assert.equal(history.entries[0].oldValueSource, 'pending')
  assert.equal(history.entries[0].createdAt, '2025-04-05T06:07:08.901Z')
  const combinedTable = await db.query("SELECT to_regclass('facility_space_save_audit')::text name")
  assert.equal(combinedTable.rows[0].name, 'facility_space_save_audit')
  await assert.rejects(db.query('UPDATE facility_availability_audit SET new_square_feet=9999 WHERE id=$1', [inserted.rows[0].id]), /append-only/)
  await assert.rejects(db.query('DELETE FROM facility_availability_audit WHERE id=$1', [inserted.rows[0].id]), /append-only/)
})

test('anonymous users cannot read admin state or history or mutate availability', async () => {
  const app = createApp({ config, db })
  await request(app).get('/api/admin/availability').expect(401)
  await request(app).get('/api/admin/availability/history').expect(401)
  await request(app).post('/api/admin/availability/buena-park-valley-view').set('Origin', origin).send({ squareFeet: 1, version: 0 }).expect(401)
  await request(app).get('/api/admin/facility-space').expect(401)
  await request(app).get('/api/admin/facility-space/history').expect(401)
  await request(app).post('/api/admin/facility-space/buena-park-valley-view').set('Origin', origin).send({ bulkSquareFeet: 1, bulkRackVersion: 0 }).expect(401)
})

test('active admin saves zero, reads it back, and audit identity comes only from the session', async () => {
  const { actor, agent, csrf } = await authorizedAgent()
  const saved = await agent.post('/api/admin/availability/buena-park-valley-view').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ squareFeet: 0, version: 0, actorIamUserId: '999999', actorUsername: 'spoofed' }).expect(200)
  assert.deepEqual(saved.body.availability, {
    facilityId: 'buena-park-valley-view', squareFeet: 0, version: 1, updatedAt: saved.body.availability.updatedAt,
    valueSource: 'administrator', snapshotAsOf: null, snapshotStatus: null,
  })
  const admin = await agent.get('/api/admin/availability').expect(200)
  assert.deepEqual(admin.body.availability.find((entry: { facilityId: string }) => entry.facilityId === 'buena-park-valley-view'), saved.body.availability)
  const audit = await db.query('SELECT actor_iam_user_id,actor_username,old_square_feet,new_square_feet FROM facility_availability_audit')
  assert.deepEqual(audit.rows[0], { actor_iam_user_id: actor.iamUserId, actor_username: actor.username, old_square_feet: null, new_square_feet: '0' })
})

test('admin projection covers the UI roster and exposes source snapshots without persisting them', async () => {
  const { agent } = await authorizedAgent()
  const response = await agent.get('/api/admin/availability').expect(200)
  assert.deepEqual([...facilityIds], facilities.map((facility) => facility.id))
  assert.equal(response.body.availability.length, facilities.length)
  assert.deepEqual(response.body.availability.find((entry: { facilityId: string }) => entry.facilityId === 'roanoke-highway-114'), {
    facilityId: 'roanoke-highway-114', squareFeet: 4000, version: 0, updatedAt: null,
    valueSource: 'source-snapshot', snapshotAsOf: '2026-10', snapshotStatus: null,
  })
  assert.deepEqual(response.body.availability.find((entry: { facilityId: string }) => entry.facilityId === 'riverside-alessandro'), {
    facilityId: 'riverside-alessandro', squareFeet: 120000, version: 0, updatedAt: null,
    valueSource: 'source-snapshot', snapshotAsOf: '2026-10', snapshotStatus: null,
  })
  assert.deepEqual(response.body.availability.find((entry: { facilityId: string }) => entry.facilityId === 'ontario-airport'), {
    facilityId: 'ontario-airport', squareFeet: 140000, version: 0, updatedAt: null,
    valueSource: 'source-snapshot', snapshotAsOf: '2026-10', snapshotStatus: null,
  })
  const persisted = await db.query('SELECT count(*)::int count FROM facility_availability')
  assert.equal(persisted.rows[0].count, 0)
})

test('first administrator save replaces a snapshot, preserves its audit provenance, and zero wins', async () => {
  const { agent, csrf } = await authorizedAgent()
  const saved = await agent.post('/api/admin/availability/roanoke-highway-114').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ squareFeet: 0, version: 0 }).expect(200)
  assert.equal(saved.body.availability.squareFeet, 0)
  assert.equal(saved.body.availability.valueSource, 'administrator')
  assert.equal(saved.body.availability.version, 1)
  const audit = await agent.get('/api/admin/availability/history?facilityId=roanoke-highway-114&page=1').expect(200)
  assert.deepEqual(audit.body.entries[0], {
    ...audit.body.entries[0], oldSquareFeet: 4000, newSquareFeet: 0, version: 1, oldValueSource: 'source-snapshot',
  })
  const publicProjection = await request(createApp({ config, db })).get('/api/availability').expect(200)
  assert.deepEqual(publicProjection.body, { availability: [{ facilityId: 'roanoke-highway-114', squareFeet: 0 }] })
})

test('mutation enforces origin, CSRF, known facility, and whole nonnegative safe square feet', async () => {
  const { agent, csrf } = await authorizedAgent()
  const endpoint = '/api/admin/availability/buena-park-valley-view'
  await agent.post(endpoint).set('Origin', 'https://wrong.example').set('x-csrf-token', csrf).send({ squareFeet: 1, version: 0 }).expect(403, { ok: false, error: 'invalid_origin' })
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', 'wrong').send({ squareFeet: 1, version: 0 }).expect(403, { ok: false, error: 'invalid_csrf' })
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ squareFeet: -1, version: 0 }).expect(400)
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ squareFeet: 1.5, version: 0 }).expect(400)
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ squareFeet: Number.MAX_SAFE_INTEGER + 1, version: 0 }).expect(400)
  await agent.post('/api/admin/availability/not-a-facility').set('Origin', origin).set('x-csrf-token', csrf).send({ squareFeet: 1, version: 0 }).expect(400)
  const count = await db.query('SELECT count(*)::int count FROM facility_availability')
  assert.equal(count.rows[0].count, 0)
})

test('inactive or tenant-mismatched actor is rejected inside the transaction', async () => {
  const actor = await seedAdmin()
  const complete = { facilityId: 'buena-park-valley-view', availability: { squareFeet: 1, version: 0 }, bulkRack: { bulkSquareFeet: 2, rackPalletPositions: 3, version: 0 } }
  await db.query('UPDATE facility_admins SET is_active=false WHERE id=$1', [actor.id])
  await assert.rejects(saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 1, version: 0 }), /actor_access_revoked/)
  await assert.rejects(saveFacilitySpace(db, 'LT', actor, complete), /actor_access_revoked/)
  await db.query("UPDATE facility_admins SET is_active=true,tenant_id='OTHER' WHERE id=$1", [actor.id])
  await assert.rejects(saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 1, version: 0 }), /actor_access_revoked/)
  await assert.rejects(saveFacilitySpace(db, 'LT', actor, complete), /actor_access_revoked/)
})

test('combined endpoint requires all three valid values and both versions behind origin and CSRF', async () => {
  const { agent, csrf } = await authorizedAgent()
  const endpoint = '/api/admin/facility-space/summerville-cypress-tradeport'
  const valid = { availableSquareFeet: 1, bulkSquareFeet: 2, rackPalletPositions: 3, availabilityVersion: 0, bulkRackVersion: 0 }
  await agent.post(endpoint).set('Origin', 'https://wrong.example').set('x-csrf-token', csrf).send(valid).expect(403, { ok: false, error: 'invalid_origin' })
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', 'wrong').send(valid).expect(403, { ok: false, error: 'invalid_csrf' })
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, null, '1']) {
    for (const field of ['availableSquareFeet', 'bulkSquareFeet', 'rackPalletPositions'] as const) {
      await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ ...valid, [field]: invalid }).expect(400)
    }
  }
  for (const field of Object.keys(valid)) {
    const incomplete = { ...valid } as Record<string, number>
    delete incomplete[field]
    await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send(incomplete).expect(400)
  }
  await agent.post('/api/admin/facility-space/not-a-facility').set('Origin', origin).set('x-csrf-token', csrf).send(valid).expect(400)
  const persisted = await Promise.all([
    db.query('SELECT count(*)::int count FROM facility_availability'),
    db.query('SELECT count(*)::int count FROM facility_bulk_rack'),
    db.query('SELECT count(*)::int count FROM facility_space_save_audit'),
  ])
  assert.deepEqual(persisted.map((result) => result.rows[0].count), [0, 0, 0])
})

test('combined optimistic versions serialize concurrent first writes without duplicate records', async () => {
  const actor = await seedAdmin()
  const input = { facilityId: 'summerville-cypress-tradeport', availability: { squareFeet: 100, version: 0 }, bulkRack: { bulkSquareFeet: 200, rackPalletPositions: 300, version: 0 } }
  const writes = await Promise.allSettled([
    saveFacilitySpace(db, 'LT', actor, input),
    saveFacilitySpace(db, 'LT', actor, input),
  ])
  assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(writes.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message === 'stale_availability').length, 1)
  await assert.rejects(saveFacilitySpace(db, 'LT', actor, input), /stale_availability/)
  const [availability, bulkRack, audit] = await Promise.all([
    db.query('SELECT version FROM facility_availability'),
    db.query('SELECT version FROM facility_bulk_rack'),
    db.query('SELECT count(*)::int count FROM facility_space_save_audit'),
  ])
  assert.equal(availability.rows[0].version, 1)
  assert.equal(bulkRack.rows[0].version, 1)
  assert.equal(audit.rows[0].count, 1)
})

test('legacy and combined availability writes share the same first-write lock', async () => {
  const actor = await seedAdmin()
  const writes = await Promise.allSettled([
    saveAvailability(db, 'LT', actor, { facilityId: 'summerville-cypress-tradeport', squareFeet: 100, version: 0 }),
    saveFacilitySpace(db, 'LT', actor, { facilityId: 'summerville-cypress-tradeport', availability: { squareFeet: 200, version: 0 }, bulkRack: { bulkSquareFeet: 300, rackPalletPositions: 400, version: 0 } }),
  ])
  assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(writes.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message === 'stale_availability').length, 1)
  const [current, legacyAudit, combinedAudit] = await Promise.all([
    db.query('SELECT version FROM facility_availability'),
    db.query('SELECT count(*)::int count FROM facility_availability_audit'),
    db.query('SELECT count(*)::int count FROM facility_space_save_audit'),
  ])
  assert.equal(current.rows[0].version, 1)
  assert.equal(legacyAudit.rows[0].count + combinedAudit.rows[0].count, 1)
})

test('combined availability and bulk/rack save rolls back all values and audit on failure', async () => {
  const actor = await seedAdmin()
  await db.query(`CREATE OR REPLACE FUNCTION reject_space_save_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'space save audit rejected'; END $$`)
  await db.query('CREATE TRIGGER reject_space_save_audit BEFORE INSERT ON facility_space_save_audit FOR EACH ROW EXECUTE FUNCTION reject_space_save_audit()')
  try {
    await assert.rejects(saveFacilitySpace(db, 'LT', actor, {
      facilityId: 'summerville-cypress-tradeport', availability: { squareFeet: 5000, version: 0 }, bulkRack: { bulkSquareFeet: 6000, rackPalletPositions: 700, version: 0 },
    }), /space save audit rejected/)
    const counts = await Promise.all([
      db.query('SELECT count(*)::int count FROM facility_availability'), db.query('SELECT count(*)::int count FROM facility_availability_audit'),
      db.query('SELECT count(*)::int count FROM facility_bulk_rack'), db.query('SELECT count(*)::int count FROM facility_bulk_rack_audit'),
      db.query('SELECT count(*)::int count FROM facility_space_save_audit'),
    ])
    assert.deepEqual(counts.map((result) => result.rows[0].count), [0, 0, 0, 0, 0])
  } finally {
    await db.query('DROP TRIGGER reject_space_save_audit ON facility_space_save_audit')
    await db.query('DROP FUNCTION reject_space_save_audit()')
  }
})

test('combined audit is immutable and unified history paginates saves with honest legacy rows', async () => {
  const { actor, agent, csrf } = await authorizedAgent()
  let availabilityVersion = 0
  let bulkRackVersion = 0
  for (let value = 0; value < 12; value += 1) {
    const saved = await agent.post('/api/admin/facility-space/summerville-cypress-tradeport').set('Origin', origin).set('x-csrf-token', csrf)
      .send({ availableSquareFeet: value, bulkSquareFeet: value + 100, rackPalletPositions: value + 200, availabilityVersion, bulkRackVersion }).expect(200)
    availabilityVersion = saved.body.space.version
    bulkRackVersion = saved.body.space.bulkRackVersion
  }
  await saveAvailability(db, 'LT', actor, { facilityId: 'riverside-alessandro', squareFeet: 9, version: 0 })
  await db.query(`INSERT INTO facility_bulk_rack_audit
    (facility_id,metric,old_value,new_value,version,actor_admin_id,actor_iam_user_id,actor_username,old_value_source)
    VALUES ('riverside-alessandro','bulk',NULL,10,1,$1,$2,$3,'pending')`, [actor.id, actor.iamUserId, actor.username])
  const first = await agent.get('/api/admin/facility-space/history?facilityId=summerville-cypress-tradeport&page=1').expect(200)
  const second = await agent.get('/api/admin/facility-space/history?facilityId=summerville-cypress-tradeport&page=2').expect(200)
  assert.deepEqual({ total: first.body.total, totalPages: first.body.totalPages, pageSize: first.body.pageSize }, { total: 12, totalPages: 2, pageSize: 10 })
  assert.deepEqual([...first.body.entries, ...second.body.entries].map((entry: { newAvailableSquareFeet: number; newBulkSquareFeet: number; newRackPalletPositions: number }) => [entry.newAvailableSquareFeet, entry.newBulkSquareFeet, entry.newRackPalletPositions]), Array.from({ length: 12 }, (_, index) => [11 - index, 111 - index, 211 - index]))
  assert.ok(first.body.entries.every((entry: { facilityId: string; actorIamUserId: string }) => entry.facilityId === 'summerville-cypress-tradeport' && entry.actorIamUserId === actor.iamUserId))
  const mixed = await facilitySpaceHistory(db, { page: 1, facilityId: 'riverside-alessandro' })
  assert.deepEqual(mixed.entries.map((entry) => entry.recordType).sort(), ['legacy-available', 'legacy-bulk'])
  assert.equal(mixed.entries.find((entry) => entry.recordType === 'legacy-available')?.newBulkSquareFeet, null)
  assert.equal(mixed.entries.find((entry) => entry.recordType === 'legacy-bulk')?.newAvailableSquareFeet, null)
  await assert.rejects(db.query('UPDATE facility_space_save_audit SET new_bulk_square_feet=9999'), /append-only/)
  await assert.rejects(db.query('DELETE FROM facility_space_save_audit'), /append-only/)
})

test('admin facility-space projection covers all facilities without persisting static fallbacks', async () => {
  const records = await adminFacilitySpace(db)
  assert.equal(records.length, facilityIds.length)
  assert.deepEqual(records.find((entry) => entry.facilityId === 'joliet-brandon'), {
    facilityId: 'joliet-brandon', squareFeet: 110000, version: 0, updatedAt: null, valueSource: 'source-snapshot', snapshotAsOf: '2026-10', snapshotStatus: null,
    bulkSquareFeet: 110000, bulkUpToSquareFeet: 150000, bulkValueSource: 'source-snapshot', rackPalletPositions: 3000, rackValueSource: 'source-snapshot',
    bulkRackVersion: 0, bulkRackUpdatedAt: null, bulkRackSnapshotAsOf: '2026-10',
  })
  assert.deepEqual(records.find((entry) => entry.facilityId === 'houston-navigation'), {
    facilityId: 'houston-navigation', squareFeet: 86000, version: 0, updatedAt: null, valueSource: 'source-snapshot', snapshotAsOf: '2026-10', snapshotStatus: null,
    bulkSquareFeet: 5000, bulkUpToSquareFeet: null, bulkValueSource: 'source-snapshot', rackPalletPositions: 0, rackValueSource: 'source-snapshot',
    bulkRackVersion: 0, bulkRackUpdatedAt: null, bulkRackSnapshotAsOf: '2026-10',
  })
  assert.deepEqual(records.find((entry) => entry.facilityId === 'plano-10th-f-avenue'), {
    facilityId: 'plano-10th-f-avenue', squareFeet: 0, version: 0, updatedAt: null, valueSource: 'source-snapshot', snapshotAsOf: '2026-10', snapshotStatus: null,
    bulkSquareFeet: 62000, bulkUpToSquareFeet: null, bulkValueSource: 'source-snapshot', rackPalletPositions: 0, rackValueSource: 'source-snapshot',
    bulkRackVersion: 0, bulkRackUpdatedAt: null, bulkRackSnapshotAsOf: '2026-10',
  })
  const persisted = await db.query('SELECT count(*)::int count FROM facility_bulk_rack')
  assert.equal(persisted.rows[0].count, 0)
})

test('saved Houston values override all three new fallbacks without seeding source snapshots', async () => {
  const { agent, csrf } = await authorizedAgent()
  const saved = await agent.post('/api/admin/facility-space/houston-navigation').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ availableSquareFeet: 0, bulkSquareFeet: 0, rackPalletPositions: 12, availabilityVersion: 0, bulkRackVersion: 0 }).expect(200)
  assert.deepEqual({
    squareFeet: saved.body.space.squareFeet,
    bulkSquareFeet: saved.body.space.bulkSquareFeet,
    rackPalletPositions: saved.body.space.rackPalletPositions,
    valueSource: saved.body.space.valueSource,
    bulkValueSource: saved.body.space.bulkValueSource,
    rackValueSource: saved.body.space.rackValueSource,
  }, {
    squareFeet: 0, bulkSquareFeet: 0, rackPalletPositions: 12,
    valueSource: 'administrator', bulkValueSource: 'administrator', rackValueSource: 'administrator',
  })
  const publicAvailability = await request(createApp({ config, db })).get('/api/availability').expect(200)
  const publicBulkRack = await request(createApp({ config, db })).get('/api/bulk-rack').expect(200)
  assert.deepEqual(publicAvailability.body, { availability: [{ facilityId: 'houston-navigation', squareFeet: 0 }] })
  assert.deepEqual(publicBulkRack.body, { bulkRack: [{ facilityId: 'houston-navigation', bulkSquareFeet: 0, rackPalletPositions: 12 }] })
  const persisted = await Promise.all([
    db.query('SELECT count(*)::int count FROM facility_availability'),
    db.query('SELECT count(*)::int count FROM facility_bulk_rack'),
    db.query('SELECT count(*)::int count FROM facility_space_save_audit'),
  ])
  assert.deepEqual(persisted.map((result) => result.rows[0].count), [1, 1, 1])
})

test('optimistic versions serialize first writes and reject stale updates without extra audit', async () => {
  const actor = await seedAdmin()
  const firstWrites = await Promise.allSettled([
    saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 100, version: 0 }),
    saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 200, version: 0 }),
  ])
  assert.equal(firstWrites.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(firstWrites.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message === 'stale_availability').length, 1)
  const current = await db.query('SELECT square_feet,version FROM facility_availability')
  assert.equal(current.rows[0].version, 1)
  await assert.rejects(saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 300, version: 0 }), /stale_availability/)
  const audit = await db.query('SELECT count(*)::int count FROM facility_availability_audit')
  assert.equal(audit.rows[0].count, 1)
})

test('availability and audit append roll back atomically', async () => {
  const actor = await seedAdmin()
  await db.query(`CREATE OR REPLACE FUNCTION reject_availability_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit rejected'; END $$`)
  await db.query('CREATE TRIGGER reject_availability_audit BEFORE INSERT ON facility_availability_audit FOR EACH ROW EXECUTE FUNCTION reject_availability_audit()')
  try {
    await assert.rejects(saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 777, version: 0 }), /audit rejected/)
    const [availability, audit] = await Promise.all([
      db.query('SELECT count(*)::int count FROM facility_availability'),
      db.query('SELECT count(*)::int count FROM facility_availability_audit'),
    ])
    assert.equal(availability.rows[0].count, 0)
    assert.equal(audit.rows[0].count, 0)
  } finally {
    await db.query('DROP TRIGGER reject_availability_audit ON facility_availability_audit')
    await db.query('DROP FUNCTION reject_availability_audit()')
  }
})

test('availability audit rows cannot be updated or deleted', async () => {
  const actor = await seedAdmin()
  await saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 4500, version: 0 })
  await assert.rejects(db.query('UPDATE facility_availability_audit SET new_square_feet=9999'), /append-only/)
  await assert.rejects(db.query('DELETE FROM facility_availability_audit'), /append-only/)
  const audit = await db.query('SELECT new_square_feet FROM facility_availability_audit')
  assert.deepEqual(audit.rows, [{ new_square_feet: '4500' }])
})

test('history is facility-filtered and stably paginated by descending timestamp and ID', async () => {
  const { agent, csrf } = await authorizedAgent()
  let version = 0
  for (let value = 0; value < 12; value += 1) {
    const saved = await agent.post('/api/admin/availability/buena-park-valley-view').set('Origin', origin).set('x-csrf-token', csrf)
      .send({ squareFeet: value, version }).expect(200)
    version = saved.body.availability.version
  }
  await agent.post('/api/admin/availability/riverside-alessandro').set('Origin', origin).set('x-csrf-token', csrf).send({ squareFeet: 99, version: 0 }).expect(200)
  const first = await agent.get('/api/admin/availability/history?facilityId=buena-park-valley-view&page=1').expect(200)
  const second = await agent.get('/api/admin/availability/history?facilityId=buena-park-valley-view&page=2').expect(200)
  assert.deepEqual({ total: first.body.total, totalPages: first.body.totalPages, pageSize: first.body.pageSize }, { total: 12, totalPages: 2, pageSize: 10 })
  assert.equal(first.body.entries.length, 10)
  assert.equal(second.body.entries.length, 2)
  assert.deepEqual([...first.body.entries, ...second.body.entries].map((entry: { newSquareFeet: number }) => entry.newSquareFeet), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
  assert.ok(first.body.entries.every((entry: { facilityId: string }) => entry.facilityId === 'buena-park-valley-view'))
  assert.ok(first.body.entries.every((entry: { createdAt: string }) => !Number.isNaN(Date.parse(entry.createdAt))))
})
