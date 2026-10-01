import { randomUUID } from 'node:crypto'
import type { Request } from 'express'
import type { AppConfig } from './config.js'
import type { Db } from './db.js'
import { constantEquals, hmacSha256, opaqueToken, parseCookies, SESSION_COOKIE } from './security.js'
import type { DirectoryEmployee, VerifiedEmployee } from './upstream.js'

export type AdminAccess = {
  id: string
  iamUserId: string
  tenantId: string
  username: string
  email: string | null
  displayName: string
  canConfigure: boolean
}

const rowAccess = (row: Record<string, unknown>): AdminAccess => ({
  id: String(row.id), iamUserId: String(row.iam_user_id), tenantId: String(row.tenant_id), username: String(row.username),
  email: row.email ? String(row.email) : null, displayName: String(row.display_name), canConfigure: Boolean(row.can_configure),
})

function exactBootstrap(identity: VerifiedEmployee, config: AppConfig) {
  return identity.userId === config.bootstrap.iamUserId && identity.tenantId === config.bootstrap.tenantId && identity.username.toLowerCase() === config.bootstrap.username.toLowerCase() && identity.email?.toLowerCase() === config.bootstrap.email
}

export async function authorizeOrBootstrap(db: Db, config: AppConfig, identity: VerifiedEmployee) {
  return db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('facility-admin-access'))")
    const existing = await client.query('SELECT * FROM facility_admins WHERE iam_user_id = $1 FOR UPDATE', [identity.userId])
    if (existing.rows[0]) return existing.rows[0].is_active && existing.rows[0].tenant_id === identity.tenantId ? rowAccess(existing.rows[0]) : null
    const activeConfig = await client.query('SELECT id FROM facility_admins WHERE is_active = true AND can_configure = true LIMIT 1 FOR UPDATE')
    if (activeConfig.rowCount || !exactBootstrap(identity, config)) return null
    const id = randomUUID()
    const inserted = await client.query(`INSERT INTO facility_admins (id, iam_user_id, tenant_id, username, email, display_name, is_active, can_configure)
      VALUES ($1,$2,$3,$4,$5,$6,true,true) RETURNING *`, [id, identity.userId, identity.tenantId, identity.username, identity.email || null, identity.displayName])
    await client.query(`INSERT INTO facility_access_audit (actor_admin_id, action, target_admin_id, details) VALUES ($1,'bootstrap_materialized',$1,$2)`, [id, JSON.stringify({ iamUserId: identity.userId, tenantId: identity.tenantId })])
    return rowAccess(inserted.rows[0])
  })
}

export async function createSession(db: Db, config: AppConfig, admin: AdminAccess) {
  const token = opaqueToken()
  const csrf = opaqueToken()
  await db.query(`INSERT INTO facility_sessions (token_hash, admin_id, csrf_hash, expires_at) VALUES ($1,$2,$3,now() + ($4 * interval '1 hour'))`, [hmacSha256(config.sessionSecret, token), admin.id, hmacSha256(config.sessionSecret, csrf), config.sessionHours])
  return { token, csrf }
}

export async function resolveSession(db: Db, config: AppConfig, request: Request): Promise<AdminAccess | null> {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (!token) return null
  const tokenHash = hmacSha256(config.sessionSecret, token)
  const result = await db.query(`SELECT a.* FROM facility_sessions s JOIN facility_admins a ON a.id=s.admin_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now() AND a.is_active=true`, [tokenHash])
  if (!result.rows[0]) return null
  await db.query('UPDATE facility_sessions SET last_seen_at=now() WHERE token_hash=$1', [tokenHash])
  return rowAccess(result.rows[0])
}

export async function rotateCsrf(db: Db, config: AppConfig, request: Request) {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (!token) return null
  const csrf = opaqueToken()
  const result = await db.query(`UPDATE facility_sessions SET csrf_hash=$1 WHERE token_hash=$2 AND revoked_at IS NULL AND expires_at > now() RETURNING token_hash`, [hmacSha256(config.sessionSecret, csrf), hmacSha256(config.sessionSecret, token)])
  return result.rowCount ? csrf : null
}

export async function validCsrf(db: Db, config: AppConfig, request: Request) {
  const sessionToken = parseCookies(request)[SESSION_COOKIE]
  const csrf = request.get('x-csrf-token') || ''
  if (!sessionToken || !csrf) return false
  const result = await db.query(`SELECT csrf_hash FROM facility_sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now()`, [hmacSha256(config.sessionSecret, sessionToken)])
  return Boolean(result.rows[0] && constantEquals(result.rows[0].csrf_hash, hmacSha256(config.sessionSecret, csrf)))
}

export async function revokeSession(db: Db, config: AppConfig, request: Request) {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (token) await db.query('UPDATE facility_sessions SET revoked_at=now() WHERE token_hash=$1', [hmacSha256(config.sessionSecret, token)])
}

export async function loginBlocked(db: Db, key: string) {
  const result = await db.query('SELECT blocked_until FROM facility_login_throttle WHERE throttle_key=$1', [key])
  return Boolean(result.rows[0]?.blocked_until && new Date(result.rows[0].blocked_until).getTime() > Date.now())
}

export async function recordLoginFailure(db: Db, key: string) {
  await db.query(`INSERT INTO facility_login_throttle (throttle_key,failure_count,first_failure_at,blocked_until) VALUES ($1,1,now(),null)
    ON CONFLICT (throttle_key) DO UPDATE SET
      failure_count=CASE WHEN facility_login_throttle.first_failure_at < now()-interval '15 minutes' THEN 1 ELSE facility_login_throttle.failure_count+1 END,
      first_failure_at=CASE WHEN facility_login_throttle.first_failure_at < now()-interval '15 minutes' THEN now() ELSE facility_login_throttle.first_failure_at END,
      blocked_until=CASE WHEN facility_login_throttle.failure_count+1 >= 5 AND facility_login_throttle.first_failure_at >= now()-interval '15 minutes' THEN now()+interval '15 minutes' ELSE facility_login_throttle.blocked_until END`, [key])
}

export async function clearLoginFailures(db: Db, key: string) { await db.query('DELETE FROM facility_login_throttle WHERE throttle_key=$1', [key]) }

export async function listAdmins(db: Db) {
  const [admins, audit] = await Promise.all([
    db.query(`SELECT id,iam_user_id,tenant_id,username,email,display_name,is_active,can_configure,created_at,updated_at,version FROM facility_admins ORDER BY display_name,username`),
    db.query(`SELECT e.id,e.action,e.details,e.created_at,a.display_name actor_name,t.display_name target_name FROM facility_access_audit e LEFT JOIN facility_admins a ON a.id=e.actor_admin_id LEFT JOIN facility_admins t ON t.id=e.target_admin_id ORDER BY e.created_at DESC LIMIT 30`),
  ])
  return { admins: admins.rows.map((row) => ({ id: row.id, iamUserId: row.iam_user_id, tenantId: row.tenant_id, username: row.username, email: row.email, displayName: row.display_name, isActive: row.is_active, canConfigure: row.can_configure, version: row.version })), audit: audit.rows.map((row) => ({ ...row, id: String(row.id) })) }
}

export async function saveAdmin(db: Db, actor: AdminAccess, employee: DirectoryEmployee, input: { isActive: boolean; canConfigure: boolean; version?: number }) {
  return db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('facility-admin-access'))")
    const persistedActorResult = await client.query('SELECT * FROM facility_admins WHERE id=$1 FOR UPDATE', [actor.id])
    const persistedActor = persistedActorResult.rows[0]
    if (!persistedActor || !persistedActor.is_active || !persistedActor.can_configure || persistedActor.iam_user_id !== actor.iamUserId || persistedActor.tenant_id !== actor.tenantId) {
      throw new Error('actor_access_revoked')
    }
    const existingResult = await client.query('SELECT * FROM facility_admins WHERE iam_user_id=$1 FOR UPDATE', [employee.iamUserId])
    const existing = existingResult.rows[0]
    if (existing?.id === actor.id && (!input.isActive || !input.canConfigure)) throw new Error('self_protection')
    if (existing && (input.version === undefined || existing.version !== input.version)) throw new Error('stale_record')
    if (existing?.can_configure && existing.is_active && (!input.canConfigure || !input.isActive)) {
      const count = await client.query('SELECT count(*)::int count FROM facility_admins WHERE is_active=true AND can_configure=true')
      if (count.rows[0].count <= 1) throw new Error('last_configuration_admin')
    }
    let target
    if (existing) {
      const updated = await client.query(`UPDATE facility_admins SET username=$1,display_name=$2,is_active=$3,can_configure=$4,updated_at=now(),version=version+1 WHERE id=$5 RETURNING *`, [employee.userName, employee.displayName, input.isActive, input.canConfigure, existing.id])
      target = updated.rows[0]
    } else {
      const inserted = await client.query(`INSERT INTO facility_admins (id,iam_user_id,tenant_id,username,display_name,is_active,can_configure) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [randomUUID(), employee.iamUserId, actor.tenantId, employee.userName, employee.displayName, input.isActive, input.canConfigure])
      target = inserted.rows[0]
    }
    if (!input.isActive) await client.query('UPDATE facility_sessions SET revoked_at=now() WHERE admin_id=$1 AND revoked_at IS NULL', [target.id])
    await client.query(`INSERT INTO facility_access_audit (actor_admin_id,action,target_admin_id,details) VALUES ($1,'admin_access_saved',$2,$3)`, [actor.id, target.id, JSON.stringify({ iamUserId: employee.iamUserId, isActive: input.isActive, canConfigure: input.canConfigure })])
    return rowAccess(target)
  })
}
