import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import { after, before, beforeEach, test } from 'node:test'
import type { AppConfig } from './config.js'
import {
  AUTH_RESPONSE_MAX_BYTES,
  PROFILE_RESPONSE_MAX_BYTES,
  UpstreamError,
  authenticateEmployee,
  readBoundedJson,
  resetServiceTokenForTests,
  searchEmployees,
} from './upstream.js'

const identity = { id: '2084344241143070722', username: 'lmadala', email: 'lalith.madala@item.com' }
const token = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ data: { user_id: identity.id, tenant_id: 'LT', user_name: identity.username, email: identity.email } })).toString('base64url')}.test`
const normalGrant = JSON.stringify({ access_token: token, refresh_token: 'test-only', expires_in: 3600 })
const normalProfile = { data: { firstName: 'Lalith', lastName: 'Madala', userName: identity.username, email: identity.email, profile: { facilities: [{ id: 'LT_F1', name: 'Facility Network' }] }, padding: '' } }
const normalDirectory = { code: '0', data: { currentPage: 1, pageSize: 20, totalCount: 0, totalPage: 0, list: [], padding: '' } }

function wrappedProfileAtSize(targetBytes: number) {
  const data = structuredClone(normalProfile).data
  const initial = JSON.stringify({ data })
  data.padding = 'x'.repeat(targetBytes - Buffer.byteLength(initial))
  const result = JSON.stringify({ data })
  assert.equal(Buffer.byteLength(result), targetBytes)
  return result
}

function paddedRoot(value: Record<string, unknown>, targetBytes: number) {
  const payload = { ...value, padding: '' }
  const initial = JSON.stringify(payload)
  payload.padding = 'x'.repeat(targetBytes - Buffer.byteLength(initial))
  const result = JSON.stringify(payload)
  assert.equal(Buffer.byteLength(result), targetBytes)
  return result
}

function expectUpstream(kind: UpstreamError['kind'], stage: UpstreamError['stage']) {
  return (error: unknown) => {
    assert.ok(error instanceof UpstreamError)
    assert.equal(error.kind, kind)
    assert.equal(error.stage, stage)
    return true
  }
}

let server: Server
let origin = ''
let grantBody = normalGrant
let profileBody = JSON.stringify(normalProfile)
let directoryBody = JSON.stringify(normalDirectory)

function config(): AppConfig {
  return {
    publicOrigin: 'http://127.0.0.1:4211', secureCookies: false,
    databaseUrl: 'postgres://unused.invalid/facility_network_auth', databaseSchema: 'public', sessionSecret: 'test-secret-that-is-longer-than-thirty-two-characters',
    itemGptBaseUrl: origin, wmsBaseUrl: origin, wmsServiceUsername: 'service', wmsServicePassword: 'test',
    tenantId: 'LT', facilityId: 'LT_F1', bootstrap: { iamUserId: identity.id, tenantId: 'LT', username: identity.username, email: identity.email },
    port: 4211, trustProxy: false, sessionHours: 8,
  }
}

before(async () => {
  server = createServer((request, response) => {
    response.setHeader('content-type', 'application/json')
    if (request.url === '/api/auth/password-grant') { response.end(grantBody); return }
    if (request.url === `/wms-bam/user/${identity.id}`) { response.end(profileBody); return }
    if (request.url === '/wms-bam/user/search-by-paging') { response.end(directoryBody); return }
    response.statusCode = 404
    response.end('{}')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  origin = `http://127.0.0.1:${address.port}`
})

beforeEach(() => {
  grantBody = normalGrant
  profileBody = JSON.stringify(normalProfile)
  directoryBody = JSON.stringify(normalDirectory)
  resetServiceTokenForTests()
})

after(async () => new Promise<void>((resolve) => server.close(() => resolve())))

test('authenticateEmployee accepts the measured 570801-byte profile response', async () => {
  profileBody = wrappedProfileAtSize(570_801)
  const employee = await authenticateEmployee(config(), identity.username, 'not-a-real-password')
  assert.equal(employee.userId, identity.id)
  assert.equal(employee.username, identity.username)
  assert.equal(employee.email, identity.email)
})

test('declared profile overflow is canceled and releases its reader lock', async () => {
  let canceled = false
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array([123])) },
    cancel() { canceled = true },
  })
  const response = new Response(stream, { headers: { 'content-length': String(PROFILE_RESPONSE_MAX_BYTES + 1) } })
  await assert.rejects(readBoundedJson(response, PROFILE_RESPONSE_MAX_BYTES, 'profile_response'), expectUpstream('malformed', 'profile_response'))
  assert.equal(canceled, true)
  assert.equal(response.body?.locked, false)
})

test('undeclared streamed profile overflow is canceled and releases its reader lock', async () => {
  let canceled = false
  const chunk = new Uint8Array(256 * 1024)
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(chunk) },
    cancel() { canceled = true },
  })
  const response = new Response(stream)
  await assert.rejects(readBoundedJson(response, PROFILE_RESPONSE_MAX_BYTES, 'profile_response'), expectUpstream('malformed', 'profile_response'))
  assert.equal(canceled, true)
  assert.equal(response.body?.locked, false)
})

test('malformed JSON and body read failures retain a safe profile failure stage', async () => {
  await assert.rejects(readBoundedJson(new Response('{"data":'), PROFILE_RESPONSE_MAX_BYTES, 'profile_response'), expectUpstream('malformed', 'profile_response'))
  const failedStream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error('simulated transport failure')) } })
  await assert.rejects(readBoundedJson(new Response(failedStream), PROFILE_RESPONSE_MAX_BYTES, 'profile_response'), expectUpstream('service', 'profile_response'))
})

test('encoded content length does not replace the decoded streaming bound', async () => {
  const response = new Response('{"ok":true}', { headers: { 'content-encoding': 'gzip', 'content-length': String(PROFILE_RESPONSE_MAX_BYTES + 1) } })
  assert.deepEqual(await readBoundedJson(response, PROFILE_RESPONSE_MAX_BYTES, 'profile_response'), { ok: true })
})

test('password-grant responses remain capped at 512 KiB', async () => {
  grantBody = paddedRoot({ access_token: token }, AUTH_RESPONSE_MAX_BYTES + 1)
  await assert.rejects(authenticateEmployee(config(), identity.username, 'not-a-real-password'), expectUpstream('malformed', 'password_grant_response'))
})

test('employee-directory responses remain capped at 512 KiB', async () => {
  directoryBody = paddedRoot({ code: '0', data: normalDirectory.data }, AUTH_RESPONSE_MAX_BYTES + 1)
  await assert.rejects(searchEmployees(config(), '', 1), expectUpstream('malformed', 'directory_response'))
})

test('invalid exported byte limits fail closed and release the body', async () => {
  const response = new Response('{}')
  await assert.rejects(readBoundedJson(response, 0, 'profile_response'), RangeError)
  assert.equal(response.body?.locked, false)
})
