import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { after, before, beforeEach, test } from 'node:test'
import { config as loadEnv } from 'dotenv'
import request from 'supertest'
import { createApp } from './app.js'
import { createDb, ensureDatabaseSchema, migrate } from './db.js'
import type { AppConfig } from './config.js'
import { saveAdmin, type AdminAccess } from './access.js'
import { resetServiceTokenForTests } from './upstream.js'

const identities: Record<string, { id: string; username: string; email: string; displayName: string }> = {
  lmadala: { id: '2084344241143070722', username: 'lmadala', email: 'lalith.madala@item.com', displayName: 'Lalith Madala' },
  'lmadala-wrong-email': { id: '2084344241143070722', username: 'lmadala', email: 'other@item.com', displayName: 'Lalith Madala' },
  operations: { id: '3001', username: 'operations', email: 'operations@item.com', displayName: 'Operations Admin' },
  configuration: { id: '3002', username: 'configuration', email: 'configuration@item.com', displayName: 'Configuration Admin' },
  inactive: { id: '3003', username: 'inactive', email: 'inactive@item.com', displayName: 'Inactive Admin' },
  employee: { id: '4001', username: 'employee', email: 'employee@item.com', displayName: 'Eligible Employee' },
  'fake-service': { id: '9999', username: 'fake-service', email: 'service@item.com', displayName: 'Facility Service' },
}

loadEnv({ path: '.env.local', override: false, quiet: true })

let malformedDirectory = false
let malformedProfile = false
let upstream: Server
let upstreamOrigin = ''
const databaseUrl = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('TEST_DATABASE_URL or DATABASE_URL is required for server tests.')
const databaseSchema = 'facility_network_server_test'
const db = createDb({ databaseUrl, databaseSchema })

function token(identity: typeof identities[string]) {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ data: { user_id: identity.id, tenant_id: 'LT', user_name: identity.username, email: identity.email } })).toString('base64url')
  return `${header}.${body}.signature`
}

function employeeRow(identity: typeof identities[string]) {
  return { id: identity.id, userName: identity.username, firstName: identity.displayName.split(' ')[0], lastName: identity.displayName.split(' ').slice(1).join(' '), companyCode: 'LT', userStatus: 'ACTIVE', userType: 0, profile: { userId: identity.id, fullName: identity.displayName, facilities: [{ id: 'LT_F1' }] } }
}

async function jsonBody(req: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>
}

function testConfig(): AppConfig {
  return {
    publicOrigin: 'http://127.0.0.1:4211', secureCookies: false, databaseUrl, databaseSchema, sessionSecret: 'test-secret-that-is-longer-than-thirty-two-characters',
    itemGptBaseUrl: upstreamOrigin, wmsBaseUrl: upstreamOrigin, wmsServiceUsername: 'fake-service', wmsServicePassword: 'valid',
    tenantId: 'LT', facilityId: 'LT_F1', bootstrap: { iamUserId: '2084344241143070722', tenantId: 'LT', username: 'lmadala', email: 'lalith.madala@item.com' },
    port: 4211, trustProxy: false, sessionHours: 8,
  }
}

async function resetDb() {
  await db.query('TRUNCATE facility_sessions, facility_space_save_audit, facility_bulk_rack_audit, facility_bulk_rack, facility_availability_audit, facility_availability, facility_access_audit, facility_admins, facility_login_throttle RESTART IDENTITY CASCADE')
  malformedDirectory = false
  malformedProfile = false
  resetServiceTokenForTests()
}

async function seedAdmin(identity: typeof identities[string], options: { active?: boolean; configure?: boolean } = {}) {
  const result = await db.query(`INSERT INTO facility_admins (id,iam_user_id,tenant_id,username,email,display_name,is_active,can_configure) VALUES (gen_random_uuid(),$1,'LT',$2,$3,$4,$5,$6) RETURNING *`, [identity.id, identity.username, identity.email, identity.displayName, options.active ?? true, options.configure ?? false])
  return result.rows[0]
}

async function login(agent: ReturnType<typeof request.agent>, username: string) {
  const response = await agent.post('/api/auth/login').set('Origin', testConfig().publicOrigin).send({ username, password: 'valid' })
  return response
}

before(async () => {
  await ensureDatabaseSchema(databaseUrl, databaseSchema)
  await migrate(db)
  upstream = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json')
    if (req.url === '/api/auth/password-grant' && req.method === 'POST') {
      const body = await jsonBody(req)
      const identity = identities[String(body.username)]
      if (!identity || body.password !== 'valid') { res.statusCode = 401; res.end(JSON.stringify({ error: 'invalid' })); return }
      res.end(JSON.stringify({ access_token: token(identity), refresh_token: 'not-returned-to-browser', expires_in: 3600 })); return
    }
    const profileMatch = req.url?.match(/^\/wms-bam\/user\/(\d+)$/)
    if (profileMatch && req.method === 'GET') {
      if (malformedProfile) { res.end(JSON.stringify({ data: { profile: {} } })); return }
      const identity = Object.values(identities).find((item) => item.id === profileMatch[1] && item.username !== 'lmadala-wrong-email')
      if (!identity) { res.statusCode = 404; res.end('{}'); return }
      res.end(JSON.stringify({ data: { firstName: identity.displayName.split(' ')[0], lastName: identity.displayName.split(' ').slice(1).join(' '), userName: identity.username, email: identity.email, profile: { facilities: [{ id: 'LT_F1', name: 'Facility Network' }] } } })); return
    }
    if (req.url === '/wms-bam/user/search-by-paging' && req.method === 'POST') {
      if (malformedDirectory) { res.end(JSON.stringify({ code: '0', data: { list: 'bad' } })); return }
      const body = await jsonBody(req)
      const ids = Array.isArray(body.userIds) ? body.userIds.map(String) : []
      const keyword = String(body.keyword || '').toLowerCase()
      const matches = Object.entries(identities).filter(([key]) => key !== 'lmadala-wrong-email' && key !== 'fake-service').map(([, identity]) => identity).filter((identity) => ids.length ? ids.includes(identity.id) : identity.username.includes(keyword) || identity.displayName.toLowerCase().includes(keyword))
      const pageSize = Number(body.pageSize)
      res.end(JSON.stringify({ code: '0', data: { currentPage: Number(body.currentPage), pageSize, totalCount: matches.length, totalPage: Math.ceil(matches.length / pageSize), list: matches.map(employeeRow) } })); return
    }
    res.statusCode = 404; res.end('{}')
  })
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  const address = upstream.address()
  assert.ok(address && typeof address === 'object')
  upstreamOrigin = `http://127.0.0.1:${address.port}`
})

beforeEach(resetDb)
after(async () => { await resetDb(); await db.close(); await new Promise<void>((resolve) => upstream.close(() => resolve())) })

test('public browsing exposes approved facility contacts and allowlisted portraits only', async () => {
  const app = createApp({ config: testConfig(), db })
  await request(app).get('/').expect(200)
  await request(app).get('/api/auth/session').expect(200, { authenticated: false })
  const matched = await request(app).get('/api/operations/buena-park-valley-view').expect('cache-control', 'no-store').expect(200)
  assert.equal(matched.body.operations.contacts.length, 8)
  assert.equal(matched.body.operations.contacts[0].email, 'michelle.topete@unisco.com')
  assert.equal(matched.body.reviewRequired, false)
  const review = await request(app).get('/api/operations/pooler-morgan-lakes').expect(200)
  assert.equal(review.body.reviewRequired, true)
  assert.deepEqual(review.body.operations.contacts.map((contact: { name: string }) => contact.name), ['Michelle Topete', 'Mary Smothers', 'Wayne Brooks', 'John Gleason'])
  await request(app).get('/api/operations/not-a-facility').expect(404, { ok: false, error: 'facility_not_found' })
  const portraits = {
    'ruben-jauregui.png': 'image/png', 'mark-tuttle.png': 'image/png',
    'frank-feliciano-v2.png': 'image/png', 'frank-feliciano.png': 'image/png',
    'ruben-echavarria.png': 'image/png', 'adam-lubin-v2.png': 'image/png', 'adam-lubin.png': 'image/png',
    'fabian-quiroz.png': 'image/png', 'efrain-islas-alcaraz.png': 'image/png', 'harold-cuarezma.png': 'image/png',
    'javier-montane-v2.png': 'image/png', 'javier-montane.png': 'image/png',
    'jessica-barajas-v2.png': 'image/png', 'jessica-barajas.jpg': 'image/jpeg',
    'john-diaz.png': 'image/png', 'john-gleason-v2.png': 'image/png', 'john-gleason.png': 'image/png',
    'juan-barragan.png': 'image/png', 'mary-smothers.jpg': 'image/jpeg', 'michelle-topete.jpg': 'image/jpeg',
    'oscar-rodriguez.png': 'image/png', 'rick-griswold.png': 'image/png', 'wayne-brooks.png': 'image/png',
    'lenivy-jackson-v2.png': 'image/png', 'lenivy-jackson.png': 'image/png', 'onoriode-enaigbe.png': 'image/png',
    'stephen-schumaker-v2.png': 'image/png', 'stephen-schumaker.png': 'image/png', 'jimmy-esparza.png': 'image/png',
  } as const
  for (const [filename, contentType] of Object.entries(portraits)) {
    const portrait = await request(app).get(`/api/operations/portraits/${filename}`).expect('cache-control', 'no-store').expect('content-type', new RegExp(contentType.replace('/', '\\/'))).expect(200)
    assert.ok(portrait.body.length > 0, filename)
  }
  const compactPortraits = [
    'adam-lubin', 'alondra-toledano', 'barry-washington', 'efrain-islas-alcaraz', 'elizabeth-martinez', 'fabian-quiroz',
    'francisca-aispuro', 'frank-feliciano', 'harold-cuarezma', 'jason-hop', 'javier-montane', 'jehnifur-morvai',
    'jennifer-stanek', 'jessica-barajas', 'jessica-chaidez', 'jimmy-esparza', 'john-diaz', 'john-gleason', 'juan-barragan',
    'karen-nesta', 'kassandra-ibanez', 'lenivy-jackson', 'margaret-medina', 'mark-tuttle', 'mary-smothers', 'matthew-david',
    'melissa-ortiz', 'michelle-topete', 'natasha-gray', 'onoriode-enaigbe', 'raed-ali', 'rick-griswold', 'ruben-echavarria',
    'ruben-jauregui', 'stephen-schumaker', 'susan-mendez', 'thelma-tolentino', 'wayne-brooks', 'yesenia-diaz', 'yessenia-tovar',
  ]
  for (const name of compactPortraits) {
    const portrait = await request(app).get(`/api/operations/portraits/compact-${name}.jpg`).expect('cache-control', 'no-store').expect('content-type', /image\/jpeg/).expect(200)
    assert.ok(portrait.body.length > 0, name)
  }
  await request(app).get('/api/operations/portraits/not-allowlisted.png').expect(404, { ok: false, error: 'not_found' })
  await request(app).get('/media/operations/people/john-diaz.png').expect(404)
  await request(app).get('/api/admin/availability').expect(401)
  await request(app).get('/api/admin/availability/history').expect(401)
  await request(app).get('/api/admin/access').expect(401)
})

test('missing IAM configuration leaves public browsing available and sign-in fails closed', async () => {
  const config = { ...testConfig(), itemGptBaseUrl: '', wmsBaseUrl: '', wmsServiceUsername: '', wmsServicePassword: '' }
  const app = createApp({ config, db })
  await request(app).get('/').expect(200)
  await request(app).post('/api/auth/login').set('Origin', config.publicOrigin).send({ username: 'lmadala', password: 'never-sent' }).expect(503, { ok: false, error: 'service_unavailable' })
  const admins = await db.query('SELECT count(*)::int count FROM facility_admins')
  assert.equal(admins.rows[0].count, 0)
})

test('exact verified lmadala binding materializes the first configuration administrator', async () => {
  const app = createApp({ config: testConfig(), db })
  const agent = request.agent(app)
  const response = await login(agent, 'lmadala')
  assert.equal(response.status, 200)
  assert.equal(response.body.user.iamUserId, identities.lmadala.id)
  assert.equal(response.body.user.canConfigure, true)
  const stored = await db.query('SELECT * FROM facility_admins')
  assert.equal(stored.rowCount, 1)
  assert.equal(stored.rows[0].email, 'lalith.madala@item.com')
  assert.equal(stored.rows[0].can_configure, true)
  await agent.get('/api/admin/access').expect(200)
})

test('concurrent verified bootstrap sign-ins create one permanent actor and independent opaque sessions', async () => {
  const app = createApp({ config: testConfig(), db })
  const [first, second] = await Promise.all([login(request.agent(app), 'lmadala'), login(request.agent(app), 'lmadala')])
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  const [admins, sessions, audits] = await Promise.all([
    db.query('SELECT count(*)::int count FROM facility_admins'),
    db.query('SELECT count(*)::int count FROM facility_sessions'),
    db.query("SELECT count(*)::int count FROM facility_access_audit WHERE action='bootstrap_materialized'"),
  ])
  assert.equal(admins.rows[0].count, 1)
  assert.equal(sessions.rows[0].count, 2)
  assert.equal(audits.rows[0].count, 1)
})

test('bootstrap ID mismatch and an inactive persisted bootstrap record both block access', async () => {
  const app = createApp({ config: testConfig(), db })
  await login(request.agent(app), 'operations').then((response) => assert.equal(response.status, 401))
  await seedAdmin(identities.lmadala, { active: false, configure: true })
  await login(request.agent(app), 'lmadala').then((response) => assert.equal(response.status, 401))
  const count = await db.query('SELECT count(*)::int count FROM facility_admins')
  assert.equal(count.rows[0].count, 1)
})

test('an existing IAM ID bound to another tenant cannot be reused', async () => {
  const row = await seedAdmin(identities.lmadala, { configure: true })
  await db.query("UPDATE facility_admins SET tenant_id='OTHER' WHERE id=$1", [row.id])
  const response = await login(request.agent(createApp({ config: testConfig(), db })), 'lmadala')
  assert.equal(response.status, 401)
  const sessions = await db.query('SELECT count(*)::int count FROM facility_sessions')
  assert.equal(sessions.rows[0].count, 0)
})

test('login enforces canonical origin and stores HMAC session verifiers in a host-only secure cookie', async () => {
  await seedAdmin(identities.operations)
  const config = { ...testConfig(), publicOrigin: 'https://facilities.example.test', secureCookies: true }
  const app = createApp({ config, db })
  await request(app).post('/api/auth/login').set('Origin', 'https://wrong.example.test').send({ username: 'operations', password: 'valid' }).expect(403, { ok: false, error: 'invalid_origin' })
  const response = await request(app).post('/api/auth/login').set('Origin', config.publicOrigin).send({ username: 'operations', password: 'valid' }).expect(200)
  const cookie = response.headers['set-cookie']?.[0]
  assert.ok(cookie)
  assert.match(cookie, /^facility_session=/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /Secure/i)
  assert.match(cookie, /SameSite=Strict/i)
  assert.doesNotMatch(cookie, /Domain=/i)
  const rawToken = decodeURIComponent(cookie.split(';', 1)[0].slice('facility_session='.length))
  const stored = await db.query('SELECT token_hash FROM facility_sessions')
  assert.equal(stored.rowCount, 1)
  assert.notEqual(stored.rows[0].token_hash, createHash('sha256').update(rawToken).digest('hex'))
})

test('malformed percent encoding in a session cookie fails as unauthenticated', async () => {
  const app = createApp({ config: testConfig(), db })
  await request(app).get('/api/operations/buena-park-valley-view').set('Cookie', 'facility_session=%ZZ').expect(200)
  await request(app).get('/api/admin/availability').set('Cookie', 'facility_session=%ZZ').expect(401, { ok: false, error: 'session_expired' })
})

test('ordinary active admins retain selected operations access but cannot call configuration APIs', async () => {
  await seedAdmin(identities.operations)
  const app = createApp({ config: testConfig(), db })
  const agent = request.agent(app)
  assert.equal((await login(agent, 'operations')).status, 200)
  const operations = await agent.get('/api/operations/buena-park-valley-view').expect(200)
  assert.equal(operations.body.operations.contacts.length, 8)
  assert.equal(operations.body.operations.contacts[0].email, 'michelle.topete@unisco.com')
  await agent.get('/api/operations/portraits/john-diaz.png').expect('content-type', /image\/png/).expect(200)
  await agent.get('/api/admin/access').expect(403)
  await agent.get('/api/admin/employees?q=employee&page=1').expect(403)
})

test('CSRF, logout, and database status revalidation revoke access immediately', async () => {
  const admin = await seedAdmin(identities.operations)
  const app = createApp({ config: testConfig(), db })
  const agent = request.agent(app)
  const session = await login(agent, 'operations')
  await agent.post('/api/auth/logout').set('Origin', testConfig().publicOrigin).set('x-csrf-token', 'wrong').expect(403)
  await agent.get('/api/admin/availability').expect(200)
  await db.query('UPDATE facility_admins SET is_active=false WHERE id=$1', [admin.id])
  await agent.get('/api/admin/availability').expect(401)

  await db.query('UPDATE facility_admins SET is_active=true WHERE id=$1', [admin.id])
  const second = request.agent(app)
  const secondSession = await login(second, 'operations')
  await second.post('/api/auth/logout').set('Origin', testConfig().publicOrigin).set('x-csrf-token', secondSession.body.csrfToken).expect(200)
  await second.get('/api/admin/availability').expect(401)
  assert.ok(session.body.csrfToken)
})

test('configuration saves revalidate immutable employee IDs and enforce self protection', async () => {
  await seedAdmin(identities.lmadala, { configure: true })
  const app = createApp({ config: testConfig(), db })
  const agent = request.agent(app)
  const session = await login(agent, 'lmadala')
  const search = await agent.get('/api/admin/employees?q=employee&page=1').expect(200)
  assert.deepEqual(search.body.employees.map((item: DirectoryEmployee) => item.iamUserId), ['4001'])
  await agent.post('/api/admin/access').set('Origin', testConfig().publicOrigin).set('x-csrf-token', session.body.csrfToken).send({ iamUserId: '4001', isActive: true, canConfigure: false }).expect(200)
  const saved = await db.query("SELECT * FROM facility_admins WHERE iam_user_id='4001'")
  assert.equal(saved.rows[0].username, 'employee')
  assert.equal(saved.rows[0].can_configure, false)
  const auditBeforeMissingVersion = await db.query('SELECT count(*)::int count FROM facility_access_audit')
  await agent.post('/api/admin/access').set('Origin', testConfig().publicOrigin).set('x-csrf-token', session.body.csrfToken).send({ iamUserId: '4001', isActive: false, canConfigure: true }).expect(409, { ok: false, error: 'stale_record' })
  const [unchanged, auditAfterMissingVersion] = await Promise.all([
    db.query("SELECT username,display_name,is_active,can_configure,version FROM facility_admins WHERE iam_user_id='4001'"),
    db.query('SELECT count(*)::int count FROM facility_access_audit'),
  ])
  assert.deepEqual(unchanged.rows[0], { username: saved.rows[0].username, display_name: saved.rows[0].display_name, is_active: true, can_configure: false, version: saved.rows[0].version })
  assert.equal(auditAfterMissingVersion.rows[0].count, auditBeforeMissingVersion.rows[0].count)
  await agent.post('/api/admin/access').set('Origin', testConfig().publicOrigin).set('x-csrf-token', session.body.csrfToken).send({ iamUserId: '4001', isActive: false, canConfigure: false, version: saved.rows[0].version }).expect(200)
  const inactive = await db.query("SELECT is_active FROM facility_admins WHERE iam_user_id='4001'")
  assert.equal(inactive.rows[0].is_active, false)
  await agent.post('/api/admin/access').set('Origin', testConfig().publicOrigin).set('x-csrf-token', session.body.csrfToken).send({ iamUserId: identities.lmadala.id, isActive: true, canConfigure: false, version: 1 }).expect(409, { ok: false, error: 'self_protection' })
  await agent.post('/api/admin/access').set('Origin', testConfig().publicOrigin).set('x-csrf-token', session.body.csrfToken).send({ iamUserId: '8888', isActive: true, canConfigure: false }).expect(409, { ok: false, error: 'employee_not_eligible' })
})

test('login throttling returns the same failure shape without contacting real services', async () => {
  const app = createApp({ config: testConfig(), db })
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request(app).post('/api/auth/login').set('Origin', testConfig().publicOrigin).send({ username: 'unknown', password: 'wrong' })
    assert.equal(response.status, 401)
    assert.equal(response.body.error, 'invalid_credentials')
  }
  const blocked = await request(app).post('/api/auth/login').set('Origin', testConfig().publicOrigin).send({ username: 'unknown', password: 'wrong' })
  assert.equal(blocked.status, 429)
  assert.equal(blocked.body.error, 'invalid_credentials')
})

test('transaction lock and versions prevent concurrent stale grant overwrites', async () => {
  const actorRow = await seedAdmin(identities.lmadala, { configure: true })
  const target = await seedAdmin(identities.configuration, { configure: true })
  const actor: AdminAccess = { id: actorRow.id, iamUserId: actorRow.iam_user_id, tenantId: 'LT', username: actorRow.username, email: actorRow.email, displayName: actorRow.display_name, canConfigure: true }
  const employee = { iamUserId: identities.configuration.id, userName: identities.configuration.username, displayName: identities.configuration.displayName }
  const results = await Promise.allSettled([
    saveAdmin(db, actor, employee, { isActive: true, canConfigure: true, version: target.version }),
    saveAdmin(db, actor, employee, { isActive: false, canConfigure: false, version: target.version }),
  ])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message === 'stale_record').length, 1)

})

test('a configuration actor revoked after middleware authorization cannot write or audit', async () => {
  const actorRow = await seedAdmin(identities.lmadala, { configure: true })
  const target = await seedAdmin(identities.employee)
  const staleActor: AdminAccess = { id: actorRow.id, iamUserId: actorRow.iam_user_id, tenantId: actorRow.tenant_id, username: actorRow.username, email: actorRow.email, displayName: actorRow.display_name, canConfigure: true }
  await db.query('UPDATE facility_admins SET can_configure=false,version=version+1 WHERE id=$1', [actorRow.id])
  const auditBefore = await db.query('SELECT count(*)::int count FROM facility_access_audit')
  await assert.rejects(() => saveAdmin(db, staleActor, { iamUserId: identities.employee.id, userName: 'changed', displayName: 'Changed Employee' }, { isActive: false, canConfigure: false, version: target.version }), /actor_access_revoked/)
  const [persistedTarget, auditAfter] = await Promise.all([
    db.query('SELECT username,display_name,is_active,can_configure,version FROM facility_admins WHERE id=$1', [target.id]),
    db.query('SELECT count(*)::int count FROM facility_access_audit'),
  ])
  assert.deepEqual(persistedTarget.rows[0], { username: target.username, display_name: target.display_name, is_active: true, can_configure: false, version: target.version })
  assert.equal(auditAfter.rows[0].count, auditBefore.rows[0].count)
})

test('malformed profile and employee-directory responses fail closed', async () => {
  await seedAdmin(identities.operations)
  const app = createApp({ config: testConfig(), db })
  malformedProfile = true
  await login(request.agent(app), 'operations').then((response) => assert.equal(response.status, 503))
  malformedProfile = false
  resetServiceTokenForTests()
  const agent = request.agent(app)
  assert.equal((await login(agent, 'operations')).status, 200)
  malformedDirectory = true
  await agent.get('/api/admin/employees?q=employee&page=1').expect(403)
  await db.query("UPDATE facility_admins SET can_configure=true WHERE iam_user_id='3001'")
  malformedDirectory = false
  await agent.get('/api/admin/employees?q=employee&page=1').expect(200) // Existing session role was revalidated from the database.
  malformedDirectory = true
  await agent.get('/api/admin/employees?q=employee&page=1').expect(503)
})

test('the fake IAM adapter rejects execution without explicit test enablement', async () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousEnabled = process.env.FACILITY_FAKE_IAM_ENABLED
  process.env.NODE_ENV = 'production'
  delete process.env.FACILITY_FAKE_IAM_ENABLED
  try {
    await assert.rejects(() => import('./fake-iam.js'), /available only in explicitly enabled test runs/)
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousEnabled === undefined) delete process.env.FACILITY_FAKE_IAM_ENABLED
    else process.env.FACILITY_FAKE_IAM_ENABLED = previousEnabled
  }
})

type DirectoryEmployee = { iamUserId: string }
