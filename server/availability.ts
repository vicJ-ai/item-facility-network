import type { AdminAccess } from './access.js'
import { facilityIds, isKnownFacilityId } from './data/facility-ids.js'
import type { Db } from './db.js'

export const MAX_AVAILABLE_SQUARE_FEET = 9_007_199_254_740_991
export const AVAILABILITY_HISTORY_PAGE_SIZE = 10

const availabilityRow = (row: Record<string, unknown>) => ({
  facilityId: String(row.facility_id),
  squareFeet: Number(row.square_feet),
  version: Number(row.version),
  updatedAt: new Date(String(row.updated_at)).toISOString(),
})

export function validSquareFeet(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_AVAILABLE_SQUARE_FEET
}

export async function publicAvailability(db: Db) {
  const result = await db.query('SELECT facility_id,square_feet FROM facility_availability ORDER BY facility_id')
  return result.rows.map((row) => ({ facilityId: String(row.facility_id), squareFeet: Number(row.square_feet) }))
}

export async function adminAvailability(db: Db) {
  const result = await db.query('SELECT facility_id,square_feet,version,updated_at FROM facility_availability')
  const current = new Map(result.rows.map((row) => [String(row.facility_id), availabilityRow(row)]))
  return facilityIds.map((facilityId) => current.get(facilityId) ?? { facilityId, squareFeet: null, version: 0, updatedAt: null })
}

export async function saveAvailability(db: Db, portalTenantId: string, actor: AdminAccess, input: { facilityId: string; squareFeet: number; version: number }) {
  if (!isKnownFacilityId(input.facilityId)) throw new Error('unknown_facility')
  if (!validSquareFeet(input.squareFeet) || !Number.isSafeInteger(input.version) || input.version < 0) throw new Error('invalid_availability')

  return db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('facility-availability:' || $1))", [input.facilityId])
    const actorResult = await client.query('SELECT * FROM facility_admins WHERE id=$1 FOR UPDATE', [actor.id])
    const persistedActor = actorResult.rows[0]
    if (!persistedActor || !persistedActor.is_active || persistedActor.iam_user_id !== actor.iamUserId || persistedActor.tenant_id !== actor.tenantId || persistedActor.tenant_id !== portalTenantId) {
      throw new Error('actor_access_revoked')
    }

    const existingResult = await client.query('SELECT * FROM facility_availability WHERE facility_id=$1 FOR UPDATE', [input.facilityId])
    const existing = existingResult.rows[0]
    const currentVersion = existing ? Number(existing.version) : 0
    if (input.version !== currentVersion) throw new Error('stale_availability')

    const savedResult = existing
      ? await client.query(`UPDATE facility_availability
          SET square_feet=$1,version=version+1,updated_at=now(),updated_by_admin_id=$2
          WHERE facility_id=$3 RETURNING *`, [input.squareFeet, persistedActor.id, input.facilityId])
      : await client.query(`INSERT INTO facility_availability (facility_id,square_feet,version,updated_by_admin_id)
          VALUES ($1,$2,1,$3) RETURNING *`, [input.facilityId, input.squareFeet, persistedActor.id])
    const saved = savedResult.rows[0]
    await client.query(`INSERT INTO facility_availability_audit
      (facility_id,old_square_feet,new_square_feet,version,actor_admin_id,actor_iam_user_id,actor_username)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [input.facilityId, existing?.square_feet ?? null, input.squareFeet, saved.version, persistedActor.id, persistedActor.iam_user_id, persistedActor.username])
    return availabilityRow(saved)
  })
}

export async function availabilityHistory(db: Db, input: { page: number; facilityId?: string }) {
  if (!Number.isSafeInteger(input.page) || input.page < 1 || input.page > 100_000) throw new Error('invalid_page')
  if (input.facilityId && !isKnownFacilityId(input.facilityId)) throw new Error('unknown_facility')
  const values: unknown[] = []
  const where = input.facilityId ? 'WHERE facility_id=$1' : ''
  if (input.facilityId) values.push(input.facilityId)
  const countResult = await db.query(`SELECT count(*)::int count FROM facility_availability_audit ${where}`, values)
  const total = Number(countResult.rows[0].count)
  const offsetParameter = values.length + 1
  const pageResult = await db.query(`SELECT id,facility_id,old_square_feet,new_square_feet,version,actor_iam_user_id,actor_username,created_at
    FROM facility_availability_audit ${where}
    ORDER BY created_at DESC,id DESC LIMIT ${AVAILABILITY_HISTORY_PAGE_SIZE} OFFSET $${offsetParameter}`, [...values, (input.page - 1) * AVAILABILITY_HISTORY_PAGE_SIZE])
  return {
    entries: pageResult.rows.map((row) => ({
      id: String(row.id), facilityId: String(row.facility_id),
      oldSquareFeet: row.old_square_feet === null ? null : Number(row.old_square_feet), newSquareFeet: Number(row.new_square_feet),
      version: Number(row.version), actorIamUserId: String(row.actor_iam_user_id), actorUsername: String(row.actor_username),
      createdAt: new Date(String(row.created_at)).toISOString(),
    })),
    page: input.page, pageSize: AVAILABILITY_HISTORY_PAGE_SIZE, total, totalPages: Math.ceil(total / AVAILABILITY_HISTORY_PAGE_SIZE),
  }
}
