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
import { facilities } from '../src/data/facilities.js'
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
  await db.query('TRUNCATE facility_sessions,facility_bulk_rack_audit,facility_bulk_rack,facility_availability_audit,facility_availability,facility_access_audit,facility_admins,facility_login_throttle RESTART IDENTITY CASCADE')
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

test('bulk and rack save independently while availability stays pending and public data stays private', async () => {
  const { actor, agent, csrf } = await authorizedAgent()
  const saved = await agent.post('/api/admin/facility-space/summerville-cypress-tradeport').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ bulkSquareFeet: 25_000, rackPalletPositions: 700, bulkRackVersion: 0, actorIamUserId: 'spoofed', actorUsername: 'spoofed' }).expect(200)
  assert.deepEqual(saved.body.space, {
    facilityId: 'summerville-cypress-tradeport', squareFeet: null, version: 0, updatedAt: null,
    valueSource: 'pending', snapshotAsOf: null, snapshotStatus: null,
    bulkSquareFeet: 25_000, bulkUpToSquareFeet: null, bulkValueSource: 'administrator',
    rackPalletPositions: 700, rackValueSource: 'administrator', bulkRackVersion: 1,
    bulkRackUpdatedAt: saved.body.space.bulkRackUpdatedAt, bulkRackSnapshotAsOf: null,
  })
  const availability = await db.query('SELECT count(*)::int count FROM facility_availability')
  assert.equal(availability.rows[0].count, 0)
  const publicProjection = await request(createApp({ config, db })).get('/api/bulk-rack').expect(200)
  assert.deepEqual(publicProjection.body, { bulkRack: [{ facilityId: 'summerville-cypress-tradeport', bulkSquareFeet: 25_000, rackPalletPositions: 700 }] })
  assert.deepEqual(Object.keys(publicProjection.body.bulkRack[0]).sort(), ['bulkSquareFeet', 'facilityId', 'rackPalletPositions'])
  const audit = await db.query('SELECT metric,actor_iam_user_id,actor_username FROM facility_bulk_rack_audit ORDER BY id')
  assert.deepEqual(audit.rows, [
    { metric: 'bulk', actor_iam_user_id: actor.iamUserId, actor_username: actor.username },
    { metric: 'rack', actor_iam_user_id: actor.iamUserId, actor_username: actor.username },
  ])
})

test('zero overrides snapshot fields, removes the bulk up-to range, and omitted fields are preserved', async () => {
  const { agent, csrf } = await authorizedAgent()
  const first = await agent.post('/api/admin/facility-space/joliet-brandon').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ bulkSquareFeet: 0, bulkRackVersion: 0 }).expect(200)
  assert.equal(first.body.space.bulkSquareFeet, 0)
  assert.equal(first.body.space.bulkUpToSquareFeet, null)
  assert.equal(first.body.space.bulkValueSource, 'administrator')
  assert.equal(first.body.space.rackPalletPositions, 3000)
  assert.equal(first.body.space.rackValueSource, 'source-snapshot')
  const second = await agent.post('/api/admin/facility-space/joliet-brandon').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ rackPalletPositions: 0, bulkRackVersion: 1 }).expect(200)
  assert.equal(second.body.space.bulkSquareFeet, 0)
  assert.equal(second.body.space.rackPalletPositions, 0)
  assert.equal(second.body.space.bulkRackVersion, 2)
  const projection = await request(createApp({ config, db })).get('/api/bulk-rack').expect(200)
  assert.deepEqual(projection.body.bulkRack, [{ facilityId: 'joliet-brandon', bulkSquareFeet: 0, rackPalletPositions: 0 }])
  const audit = await facilitySpaceHistory(db, { page: 1, facilityId: 'joliet-brandon' })
  assert.deepEqual(audit.entries.map((entry) => [entry.metric, entry.oldValue, entry.newValue, entry.oldValueSource]), [
    ['rack', 3000, 0, 'source-snapshot'],
    ['bulk', 110000, 0, 'source-snapshot'],
  ])
})

test('migration adds audit provenance without rewriting legacy audit rows and restores immutability', async () => {
  const actor = await seedAdmin()
  await db.query('DROP TRIGGER IF EXISTS facility_availability_audit_immutable ON facility_availability_audit')
  await db.query('ALTER TABLE facility_availability_audit DROP COLUMN IF EXISTS old_value_source')
  const inserted = await db.query(`INSERT INTO facility_availability_audit
    (facility_id,old_square_feet,new_square_feet,version,actor_admin_id,actor_iam_user_id,actor_username,created_at)
    VALUES ('buena-park-valley-view',NULL,4321,1,$1,$2,$3,'2025-04-05T06:07:08.901Z') RETURNING id`,
  [actor.id, actor.iamUserId, actor.username])
  const legacyFields = 'id,facility_id,old_square_feet,new_square_feet,version,actor_admin_id,actor_iam_user_id,actor_username,created_at::text AS created_at'
  const before = await db.query(`SELECT ${legacyFields} FROM facility_availability_audit WHERE id=$1`, [inserted.rows[0].id])

  await migrate(db)
  await migrate(db)

  const after = await db.query(`SELECT ${legacyFields} FROM facility_availability_audit WHERE id=$1`, [inserted.rows[0].id])
  assert.deepEqual(after.rows, before.rows)
  const stored = await db.query('SELECT old_value_source FROM facility_availability_audit WHERE id=$1', [inserted.rows[0].id])
  assert.deepEqual(stored.rows, [{ old_value_source: 'administrator' }])
  const history = await availabilityHistory(db, { page: 1, facilityId: 'buena-park-valley-view' })
  assert.equal(history.entries[0].oldValueSource, 'pending')
  assert.equal(history.entries[0].createdAt, '2025-04-05T06:07:08.901Z')
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
  await db.query('UPDATE facility_admins SET is_active=false WHERE id=$1', [actor.id])
  await assert.rejects(saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 1, version: 0 }), /actor_access_revoked/)
  await assert.rejects(saveFacilitySpace(db, 'LT', actor, { facilityId: 'buena-park-valley-view', bulkRack: { bulkSquareFeet: 1, version: 0 } }), /actor_access_revoked/)
  await db.query("UPDATE facility_admins SET is_active=true,tenant_id='OTHER' WHERE id=$1", [actor.id])
  await assert.rejects(saveAvailability(db, 'LT', actor, { facilityId: 'buena-park-valley-view', squareFeet: 1, version: 0 }), /actor_access_revoked/)
  await assert.rejects(saveFacilitySpace(db, 'LT', actor, { facilityId: 'buena-park-valley-view', bulkRack: { rackPalletPositions: 1, version: 0 } }), /actor_access_revoked/)
})

test('combined endpoint enforces origin, CSRF, known facilities, and valid bulk and rack integers', async () => {
  const { agent, csrf } = await authorizedAgent()
  const endpoint = '/api/admin/facility-space/summerville-cypress-tradeport'
  await agent.post(endpoint).set('Origin', 'https://wrong.example').set('x-csrf-token', csrf).send({ bulkSquareFeet: 1, bulkRackVersion: 0 }).expect(403, { ok: false, error: 'invalid_origin' })
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', 'wrong').send({ rackPalletPositions: 1, bulkRackVersion: 0 }).expect(403, { ok: false, error: 'invalid_csrf' })
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, null, '1']) {
    await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ bulkSquareFeet: invalid, bulkRackVersion: 0 }).expect(400)
    await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ rackPalletPositions: invalid, bulkRackVersion: 0 }).expect(400)
  }
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ bulkRackVersion: 0 }).expect(400)
  await agent.post('/api/admin/facility-space/not-a-facility').set('Origin', origin).set('x-csrf-token', csrf).send({ bulkSquareFeet: 1, bulkRackVersion: 0 }).expect(400)
  const persisted = await db.query('SELECT count(*)::int count FROM facility_bulk_rack')
  assert.equal(persisted.rows[0].count, 0)
})

test('bulk and rack optimistic version serializes first writes without extra audit', async () => {
  const actor = await seedAdmin()
  const writes = await Promise.allSettled([
    saveFacilitySpace(db, 'LT', actor, { facilityId: 'summerville-cypress-tradeport', bulkRack: { bulkSquareFeet: 100, version: 0 } }),
    saveFacilitySpace(db, 'LT', actor, { facilityId: 'summerville-cypress-tradeport', bulkRack: { rackPalletPositions: 200, version: 0 } }),
  ])
  assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(writes.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message === 'stale_bulk_rack').length, 1)
  await assert.rejects(saveFacilitySpace(db, 'LT', actor, { facilityId: 'summerville-cypress-tradeport', bulkRack: { bulkSquareFeet: 300, version: 0 } }), /stale_bulk_rack/)
  const [current, audit] = await Promise.all([
    db.query('SELECT version FROM facility_bulk_rack'),
    db.query('SELECT count(*)::int count FROM facility_bulk_rack_audit'),
  ])
  assert.equal(current.rows[0].version, 1)
  assert.equal(audit.rows[0].count, 1)
})

test('legacy and combined availability writes share the same first-write lock', async () => {
  const actor = await seedAdmin()
  const writes = await Promise.allSettled([
    saveAvailability(db, 'LT', actor, { facilityId: 'summerville-cypress-tradeport', squareFeet: 100, version: 0 }),
    saveFacilitySpace(db, 'LT', actor, { facilityId: 'summerville-cypress-tradeport', availability: { squareFeet: 200, version: 0 } }),
  ])
  assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(writes.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message === 'stale_availability').length, 1)
  const [current, audit] = await Promise.all([
    db.query('SELECT version FROM facility_availability'),
    db.query('SELECT count(*)::int count FROM facility_availability_audit'),
  ])
  assert.equal(current.rows[0].version, 1)
  assert.equal(audit.rows[0].count, 1)
})

test('combined availability and bulk/rack save rolls back all values and audit on failure', async () => {
  const actor = await seedAdmin()
  await db.query(`CREATE OR REPLACE FUNCTION reject_bulk_rack_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'bulk audit rejected'; END $$`)
  await db.query('CREATE TRIGGER reject_bulk_rack_audit BEFORE INSERT ON facility_bulk_rack_audit FOR EACH ROW EXECUTE FUNCTION reject_bulk_rack_audit()')
  try {
    await assert.rejects(saveFacilitySpace(db, 'LT', actor, {
      facilityId: 'summerville-cypress-tradeport', availability: { squareFeet: 5000, version: 0 }, bulkRack: { bulkSquareFeet: 6000, rackPalletPositions: 700, version: 0 },
    }), /bulk audit rejected/)
    const counts = await Promise.all([
      db.query('SELECT count(*)::int count FROM facility_availability'), db.query('SELECT count(*)::int count FROM facility_availability_audit'),
      db.query('SELECT count(*)::int count FROM facility_bulk_rack'), db.query('SELECT count(*)::int count FROM facility_bulk_rack_audit'),
    ])
    assert.deepEqual(counts.map((result) => result.rows[0].count), [0, 0, 0, 0])
  } finally {
    await db.query('DROP TRIGGER reject_bulk_rack_audit ON facility_bulk_rack_audit')
    await db.query('DROP FUNCTION reject_bulk_rack_audit()')
  }
})

test('bulk/rack audit is immutable and unified history is stable, filtered, and paginated', async () => {
  const { actor, agent, csrf } = await authorizedAgent()
  let version = 0
  for (let value = 0; value < 12; value += 1) {
    const saved = await agent.post('/api/admin/facility-space/summerville-cypress-tradeport').set('Origin', origin).set('x-csrf-token', csrf)
      .send({ rackPalletPositions: value, bulkRackVersion: version }).expect(200)
    version = saved.body.space.bulkRackVersion
  }
  await agent.post('/api/admin/facility-space/riverside-alessandro').set('Origin', origin).set('x-csrf-token', csrf)
    .send({ availableSquareFeet: 9, availabilityVersion: 0, bulkSquareFeet: 10, bulkRackVersion: 0 }).expect(200)
  const first = await agent.get('/api/admin/facility-space/history?facilityId=summerville-cypress-tradeport&page=1').expect(200)
  const second = await agent.get('/api/admin/facility-space/history?facilityId=summerville-cypress-tradeport&page=2').expect(200)
  assert.deepEqual({ total: first.body.total, totalPages: first.body.totalPages, pageSize: first.body.pageSize }, { total: 12, totalPages: 2, pageSize: 10 })
  assert.deepEqual([...first.body.entries, ...second.body.entries].map((entry: { metric: string; newValue: number }) => [entry.metric, entry.newValue]), Array.from({ length: 12 }, (_, index) => ['rack', 11 - index]))
  assert.ok(first.body.entries.every((entry: { facilityId: string; actorIamUserId: string }) => entry.facilityId === 'summerville-cypress-tradeport' && entry.actorIamUserId === actor.iamUserId))
  const mixed = await facilitySpaceHistory(db, { page: 1, facilityId: 'riverside-alessandro' })
  assert.deepEqual(mixed.entries.map((entry) => entry.metric).sort(), ['available', 'bulk'])
  await assert.rejects(db.query('UPDATE facility_bulk_rack_audit SET new_value=9999'), /append-only/)
  await assert.rejects(db.query('DELETE FROM facility_bulk_rack_audit'), /append-only/)
})

test('admin facility-space projection covers all facilities without persisting static fallbacks', async () => {
  const records = await adminFacilitySpace(db)
  assert.equal(records.length, facilityIds.length)
  assert.deepEqual(records.find((entry) => entry.facilityId === 'joliet-brandon'), {
    facilityId: 'joliet-brandon', squareFeet: 110000, version: 0, updatedAt: null, valueSource: 'source-snapshot', snapshotAsOf: '2026-10', snapshotStatus: null,
    bulkSquareFeet: 110000, bulkUpToSquareFeet: 150000, bulkValueSource: 'source-snapshot', rackPalletPositions: 3000, rackValueSource: 'source-snapshot',
    bulkRackVersion: 0, bulkRackUpdatedAt: null, bulkRackSnapshotAsOf: '2026-10',
  })
  const persisted = await db.query('SELECT count(*)::int count FROM facility_bulk_rack')
  assert.equal(persisted.rows[0].count, 0)
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
