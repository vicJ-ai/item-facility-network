import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, beforeEach, test } from 'node:test'
import { config as loadEnv } from 'dotenv'
import request from 'supertest'
import { setFacilityArchived } from './archive.js'
import type { AdminAccess } from './access.js'
import { createApp } from './app.js'
import type { AppConfig } from './config.js'
import { createDb, ensureDatabaseSchema, migrate } from './db.js'
import { facilityIds } from './data/facility-ids.js'
import { hmacSha256 } from './security.js'

loadEnv({ path: '.env.local', override: false, quiet: true })

const databaseUrl = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('TEST_DATABASE_URL or DATABASE_URL is required for archive tests.')
const databaseSchema = 'facility_network_archive_test'
const sessionSecret = 'archive-test-secret-longer-than-thirty-two-characters'
const db = createDb({ databaseUrl, databaseSchema })
const origin = 'http://127.0.0.1:4216'
const config: AppConfig = {
  publicOrigin: origin, secureCookies: false, databaseUrl, databaseSchema, sessionSecret,
  itemGptBaseUrl: '', wmsBaseUrl: '', wmsServiceUsername: '', wmsServicePassword: '', tenantId: 'LT', facilityId: 'LT_F1',
  bootstrap: { iamUserId: '2084344241143070722', tenantId: 'LT', username: 'lmadala', email: 'lalith.madala@item.com' },
  port: 4216, trustProxy: false, sessionHours: 8,
}
const facilityId = 'roanoke-highway-114'
const endpoint = `/api/admin/archive/${facilityId}`

async function resetDb() {
  await db.query('TRUNCATE facility_sessions,facility_archive_audit,facility_archive,facility_space_save_audit,facility_bulk_rack_audit,facility_bulk_rack,facility_availability_audit,facility_availability,facility_access_audit,facility_admins,facility_login_throttle RESTART IDENTITY CASCADE')
}

// An ordinary administrator: active, without configuration access.
async function seedAdmin(active = true) {
  const id = randomUUID()
  await db.query(`INSERT INTO facility_admins (id,iam_user_id,tenant_id,username,email,display_name,is_active,can_configure)
    VALUES ($1,'3001','LT','operations.admin','operations.admin@item.com','Operations Admin',$2,false)`, [id, active])
  return { id, iamUserId: '3001', tenantId: 'LT', username: 'operations.admin', email: 'operations.admin@item.com', displayName: 'Operations Admin', canConfigure: false } satisfies AdminAccess
}

async function authorizedAgent(existing?: AdminAccess) {
  const actor = existing ?? await seedAdmin()
  const token = 'archive-session-token'
  const csrf = 'archive-csrf-token'
  await db.query(`INSERT INTO facility_sessions (token_hash,admin_id,csrf_hash,expires_at)
    VALUES ($1,$2,$3,now()+interval '1 hour')`, [hmacSha256(sessionSecret, token), actor.id, hmacSha256(sessionSecret, csrf)])
  const agent = request.agent(createApp({ config, db }))
  agent.jar.setCookie(`facility_session=${token}; Path=/`)
  return { actor, agent, csrf }
}

const count = async (table: string) => Number((await db.query(`SELECT count(*)::int count FROM ${table}`)).rows[0].count)

before(async () => {
  await ensureDatabaseSchema(databaseUrl, databaseSchema)
  await migrate(db)
  await migrate(db)
})
beforeEach(resetDb)
after(async () => { await resetDb(); await db.close() })

test('public archive projection starts empty and anonymous users cannot read or change admin archive state', async () => {
  const app = createApp({ config, db })
  await request(app).get('/api/archived').expect(200, { archived: [] })
  await request(app).get('/api/admin/archive').expect(401)
  await request(app).get('/api/admin/archive/history').expect(401)
  await request(app).post(endpoint).set('Origin', origin).send({ archived: true, version: 0 }).expect(401)
})

test('an ordinary active administrator archives and restores, and identity comes only from the session', async () => {
  const { actor, agent, csrf } = await authorizedAgent()
  const archived = await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf)
    .send({ archived: true, version: 0, archivedBy: 'Spoofed Name', actorIamUserId: '999999' }).expect(200)
  assert.equal(archived.body.archive.archived, true)
  assert.equal(archived.body.archive.archivedBy, 'Operations Admin')
  assert.equal(archived.body.archive.version, 1)

  const publicProjection = await request(createApp({ config, db })).get('/api/archived').expect(200)
  assert.equal(publicProjection.body.archived.length, 1)
  assert.deepEqual(Object.keys(publicProjection.body.archived[0]), ['facilityId', 'archivedOn', 'archivedBy'])
  assert.deepEqual(publicProjection.body.archived[0], { facilityId, archivedOn: archived.body.archive.archivedAt.slice(0, 10), archivedBy: 'Operations Admin' })

  const admin = await agent.get('/api/admin/archive').expect(200)
  assert.deepEqual(admin.body.facilities.map((entry: { facilityId: string }) => entry.facilityId), [...facilityIds])
  assert.deepEqual(admin.body.facilities.find((entry: { facilityId: string }) => entry.facilityId === facilityId), archived.body.archive)

  const restored = await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ archived: false, version: 1 }).expect(200)
  assert.deepEqual({ ...restored.body.archive, updatedAt: null }, { facilityId, archived: false, archivedAt: null, archivedBy: null, version: 2, updatedAt: null })
  await request(createApp({ config, db })).get('/api/archived').expect(200, { archived: [] })

  const audit = await db.query('SELECT action,version,actor_iam_user_id,actor_username,actor_display_name FROM facility_archive_audit ORDER BY id')
  assert.deepEqual(audit.rows, [
    { action: 'archive', version: 1, actor_iam_user_id: actor.iamUserId, actor_username: actor.username, actor_display_name: 'Operations Admin' },
    { action: 'restore', version: 2, actor_iam_user_id: actor.iamUserId, actor_username: actor.username, actor_display_name: 'Operations Admin' },
  ])
  const history = await agent.get(`/api/admin/archive/history?facilityId=${facilityId}&page=1`).expect(200)
  assert.deepEqual(history.body.entries.map((entry: { action: string }) => entry.action), ['restore', 'archive'])
  assert.equal(history.body.total, 2)
})

test('archive mutation enforces origin, CSRF, known facility, and a boolean state with a whole version', async () => {
  const { agent, csrf } = await authorizedAgent()
  await agent.post(endpoint).set('Origin', 'https://wrong.example').set('x-csrf-token', csrf).send({ archived: true, version: 0 }).expect(403, { ok: false, error: 'invalid_origin' })
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', 'wrong').send({ archived: true, version: 0 }).expect(403, { ok: false, error: 'invalid_csrf' })
  for (const invalid of [{ archived: 'true', version: 0 }, { archived: true, version: -1 }, { archived: true, version: 1.5 }, { archived: true }, { version: 0 }]) {
    await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send(invalid).expect(400)
  }
  await agent.post('/api/admin/archive/not-a-facility').set('Origin', origin).set('x-csrf-token', csrf).send({ archived: true, version: 0 }).expect(400)
  await agent.get('/api/admin/archive/history?facilityId=not-a-facility').expect(400)
  assert.deepEqual([await count('facility_archive'), await count('facility_archive_audit')], [0, 0])
})

test('stale versions and repeated requests are rejected as conflicts', async () => {
  const { agent, csrf } = await authorizedAgent()
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ archived: true, version: 0 }).expect(200)
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ archived: true, version: 0 }).expect(409, { ok: false, error: 'stale_archive' })
  await agent.post(endpoint).set('Origin', origin).set('x-csrf-token', csrf).send({ archived: true, version: 1 }).expect(409, { ok: false, error: 'stale_archive' })
  assert.equal(await count('facility_archive_audit'), 1)
})

test('inactive or tenant-mismatched actor is rejected inside the transaction', async () => {
  const actor = await seedAdmin()
  await db.query('UPDATE facility_admins SET is_active=false WHERE id=$1', [actor.id])
  await assert.rejects(setFacilityArchived(db, 'LT', actor, { facilityId, archived: true, version: 0 }), /actor_access_revoked/)
  await db.query("UPDATE facility_admins SET is_active=true,tenant_id='OTHER' WHERE id=$1", [actor.id])
  await assert.rejects(setFacilityArchived(db, 'LT', actor, { facilityId, archived: true, version: 0 }), /actor_access_revoked/)
  assert.equal(await count('facility_archive'), 0)
})

test('concurrent first archives serialize to exactly one write', async () => {
  const actor = await seedAdmin()
  const input = { facilityId, archived: true, version: 0 }
  const writes = await Promise.allSettled([setFacilityArchived(db, 'LT', actor, input), setFacilityArchived(db, 'LT', actor, input)])
  assert.equal(writes.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(writes.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message === 'stale_archive').length, 1)
  assert.deepEqual([await count('facility_archive'), await count('facility_archive_audit')], [1, 1])
})

test('archive audit is append-only and history pages in tens', async () => {
  const actor = await seedAdmin()
  for (let version = 0; version < 11; version += 1) {
    await setFacilityArchived(db, 'LT', actor, { facilityId, archived: version % 2 === 0, version })
  }
  await assert.rejects(db.query('UPDATE facility_archive_audit SET action=$1', ['restore']), /append-only/)
  await assert.rejects(db.query('DELETE FROM facility_archive_audit'), /append-only/)
  const { agent } = await authorizedAgent(actor)
  const first = await agent.get(`/api/admin/archive/history?facilityId=${facilityId}&page=1`).expect(200)
  const second = await agent.get(`/api/admin/archive/history?facilityId=${facilityId}&page=2`).expect(200)
  assert.equal(first.body.entries.length, 10)
  assert.equal(second.body.entries.length, 1)
  assert.equal(first.body.totalPages, 2)
  assert.equal(first.body.entries[0].version, 11)
})
