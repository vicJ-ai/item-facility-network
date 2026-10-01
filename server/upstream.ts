import type { AppConfig } from './config.js'

type JsonRecord = Record<string, unknown>
type IamIdentity = { userId: string; tenantId: string; username: string; email?: string }
export type VerifiedEmployee = IamIdentity & { displayName: string; accessToken: string }
export type DirectoryEmployee = { iamUserId: string; userName: string; displayName: string }
export type UpstreamFailureStage = 'password_grant_transport' | 'password_grant_response' | 'profile_transport' | 'profile_response' | 'directory_transport' | 'directory_response'

export const AUTH_RESPONSE_MAX_BYTES = 512 * 1024
export const PROFILE_RESPONSE_MAX_BYTES = 2 * 1024 * 1024

export class UpstreamError extends Error {
  constructor(public readonly kind: 'credentials' | 'service' | 'malformed' | 'ineligible', public readonly status?: number, public readonly stage?: UpstreamFailureStage) {
    super('upstream_authentication_failed')
  }
}

const record = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
const stringValue = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

async function cancelBody(reader: ReadableStreamDefaultReader<Uint8Array> | undefined) {
  try { await reader?.cancel() } catch { /* The bounded read is already failing closed. */ }
}

export async function readBoundedJson(response: Response, maxBytes: number, stage: UpstreamFailureStage) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    try { await response.body?.cancel() } catch { /* Invalid limits fail closed. */ }
    throw new RangeError('maxBytes must be a positive safe integer')
  }
  const declaredHeader = response.headers.get('content-length')
  const contentEncoding = response.headers.get('content-encoding')?.trim().toLowerCase()
  const declaredBytes = (!contentEncoding || contentEncoding === 'identity') && declaredHeader && /^\d+$/.test(declaredHeader) ? Number(declaredHeader) : undefined
  const reader = response.body?.getReader()
  if (declaredBytes !== undefined && declaredBytes > maxBytes) {
    try { await cancelBody(reader) } finally { reader?.releaseLock() }
    throw new UpstreamError('malformed', response.status, stage)
  }
  if (!reader) throw new UpstreamError('malformed', response.status, stage)

  const chunks: Uint8Array[] = []
  let receivedBytes = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      receivedBytes += chunk.value.byteLength
      if (receivedBytes > maxBytes) {
        await cancelBody(reader)
        throw new UpstreamError('malformed', response.status, stage)
      }
      chunks.push(chunk.value)
    }
  } catch (error) {
    if (error instanceof UpstreamError) throw error
    await cancelBody(reader)
    throw new UpstreamError('service', response.status, stage)
  } finally {
    reader.releaseLock()
  }

  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), receivedBytes)
  try { return JSON.parse(buffer.toString('utf8')) as unknown } catch { throw new UpstreamError('malformed', response.status, stage) }
}

function tokenIdentity(accessToken: string): IamIdentity {
  try {
    const parts = accessToken.split('.')
    if (parts.length !== 3) throw new Error()
    const payload = record(JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')))
    const data = record(payload.data)
    const userId = stringValue(data.user_id)
    const tenantId = stringValue(data.tenant_id || data.company_code)
    const username = stringValue(data.user_name || data.username || data.email)
    const email = stringValue(data.email || data.user_email).toLowerCase()
    if (!/^\d{1,128}$/.test(userId) || !tenantId || !username) throw new Error()
    return { userId, tenantId, username, ...(email ? { email } : {}) }
  } catch {
    throw new UpstreamError('malformed', undefined, 'password_grant_response')
  }
}

async function passwordGrant(config: AppConfig, username: string, password: string) {
  if (!config.itemGptBaseUrl) throw new UpstreamError('service', undefined, 'password_grant_transport')
  let response: Response
  try {
    response = await fetch(`${config.itemGptBaseUrl}/api/auth/password-grant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password, scope: 'openid', tenantId: config.tenantId }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch { throw new UpstreamError('service', undefined, 'password_grant_transport') }
  const payload = record(await readBoundedJson(response, AUTH_RESPONSE_MAX_BYTES, 'password_grant_response'))
  if (!response.ok) throw new UpstreamError(response.status >= 500 ? 'service' : 'credentials', response.status, 'password_grant_response')
  const accessToken = stringValue(payload.access_token)
  if (!accessToken) throw new UpstreamError('malformed', response.status, 'password_grant_response')
  return { accessToken, identity: tokenIdentity(accessToken) }
}

function verifiedProfile(payload: unknown, identity: IamIdentity, config: AppConfig) {
  const data = record(record(payload).data)
  const profile = record(data.profile)
  const profileUserName = stringValue(data.userName)
  const email = stringValue(data.email).toLowerCase()
  const facilities = Array.isArray(profile.facilities) ? profile.facilities : []
  const hasFacility = facilities.some((item) => stringValue(record(item).id) === config.facilityId)
  const displayName = [stringValue(data.firstName), stringValue(data.lastName)].filter(Boolean).join(' ') || profileUserName
  if (!profileUserName || !email || !displayName) throw new UpstreamError('malformed', undefined, 'profile_response')
  if (!hasFacility) throw new UpstreamError('ineligible', undefined, 'profile_response')
  if (identity.email && identity.email !== email) throw new UpstreamError('malformed', undefined, 'profile_response')
  return { ...identity, username: profileUserName, email, displayName }
}

export async function authenticateEmployee(config: AppConfig, username: string, password: string): Promise<VerifiedEmployee> {
  if (!config.wmsBaseUrl) throw new UpstreamError('service', undefined, 'profile_transport')
  const granted = await passwordGrant(config, username, password)
  if (granted.identity.tenantId !== config.tenantId) throw new UpstreamError('ineligible', undefined, 'password_grant_response')
  let response: Response
  try {
    response = await fetch(`${config.wmsBaseUrl}/wms-bam/user/${encodeURIComponent(granted.identity.userId)}`, {
      headers: { authorization: `Bearer ${granted.accessToken}`, 'x-tenant-id': granted.identity.tenantId },
      signal: AbortSignal.timeout(15_000),
    })
  } catch { throw new UpstreamError('service', undefined, 'profile_transport') }
  if (!response.ok) throw new UpstreamError(response.status === 401 || response.status === 403 ? 'credentials' : 'service', response.status, 'profile_response')
  const profile = verifiedProfile(await readBoundedJson(response, PROFILE_RESPONSE_MAX_BYTES, 'profile_response'), granted.identity, config)
  return { ...profile, accessToken: granted.accessToken }
}

let serviceToken: { accessToken: string; expiresAt: number } | null = null
async function serviceAccessToken(config: AppConfig) {
  if (!config.wmsServiceUsername || !config.wmsServicePassword) throw new UpstreamError('service', undefined, 'password_grant_transport')
  if (serviceToken && serviceToken.expiresAt > Date.now() + 30_000) return serviceToken.accessToken
  const granted = await passwordGrant(config, config.wmsServiceUsername, config.wmsServicePassword)
  if (granted.identity.tenantId !== config.tenantId) throw new UpstreamError('ineligible', undefined, 'password_grant_response')
  serviceToken = { accessToken: granted.accessToken, expiresAt: Date.now() + 5 * 60_000 }
  return granted.accessToken
}

function activeStatus(value: unknown) {
  if (typeof value === 'string') return value.trim().toUpperCase() === 'ACTIVE'
  return Object.values(record(value)).some((candidate) => stringValue(candidate).toUpperCase() === 'ACTIVE')
}

function eligibleDirectoryEmployee(value: unknown, config: AppConfig): DirectoryEmployee | null {
  const row = record(value)
  const profile = record(row.profile)
  const iamUserId = stringValue(row.id)
  const profileId = stringValue(profile.userId)
  const userName = stringValue(row.userName)
  const facilities = Array.isArray(profile.facilities) ? profile.facilities : []
  const displayName = stringValue(profile.fullName || row.fullName) || [stringValue(row.firstName), stringValue(row.lastName)].filter(Boolean).join(' ') || userName
  if (!/^\d{1,128}$/.test(iamUserId) || iamUserId !== profileId || !userName || stringValue(row.companyCode) !== config.tenantId || !activeStatus(row.userStatus) || row.userType !== 0 || !facilities.some((facility) => stringValue(record(facility).id))) return null
  return { iamUserId, userName: userName.slice(0, 254), displayName: displayName.slice(0, 160) }
}

async function directoryRequest(config: AppConfig, body: Record<string, unknown>) {
  if (!config.wmsBaseUrl) throw new UpstreamError('service', undefined, 'directory_transport')
  const accessToken = await serviceAccessToken(config)
  let response: Response
  try {
    response = await fetch(`${config.wmsBaseUrl}/wms-bam/user/search-by-paging`, {
      method: 'POST',
      headers: { accept: 'application/json', authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', 'x-tenant-id': config.tenantId },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
  } catch { throw new UpstreamError('service', undefined, 'directory_transport') }
  if (!response.ok) throw new UpstreamError(response.status === 401 || response.status === 403 ? 'credentials' : 'service', response.status, 'directory_response')
  const payload = record(await readBoundedJson(response, AUTH_RESPONSE_MAX_BYTES, 'directory_response'))
  if (payload.code !== undefined && String(payload.code) !== '0') throw new UpstreamError('malformed', response.status, 'directory_response')
  return record(payload.data)
}

export async function searchEmployees(config: AppConfig, query: string, page: number) {
  const data = await directoryRequest(config, { currentPage: page, pageSize: 20, userStatus: 'ACTIVE', userType: 0, ...(query ? { keyword: query } : {}) })
  const list = Array.isArray(data.list) ? data.list : null
  const totalCount = Number(data.totalCount)
  const totalPages = Number(data.totalPage)
  if (data.currentPage !== page || data.pageSize !== 20 || !list || !Number.isSafeInteger(totalCount) || !Number.isSafeInteger(totalPages) || totalPages !== Math.ceil(totalCount / 20)) throw new UpstreamError('malformed', undefined, 'directory_response')
  return { employees: list.flatMap((entry) => { const employee = eligibleDirectoryEmployee(entry, config); return employee ? [employee] : [] }), page, hasMore: page < totalPages }
}

export async function revalidateEmployee(config: AppConfig, iamUserId: string) {
  if (!/^\d{1,128}$/.test(iamUserId)) return null
  const data = await directoryRequest(config, { currentPage: 1, pageSize: 1, userIds: [iamUserId], userStatus: 'ACTIVE', userType: 0 })
  const list = Array.isArray(data.list) ? data.list : null
  if (data.currentPage !== 1 || data.pageSize !== 1 || data.totalCount !== 1 || data.totalPage !== 1 || !list || list.length !== 1) return null
  const employee = eligibleDirectoryEmployee(list[0], config)
  return employee?.iamUserId === iamUserId ? employee : null
}

export function resetServiceTokenForTests() { serviceToken = null }
