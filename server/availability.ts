import type { AdminAccess } from './access.js'
import { facilityAvailabilitySnapshots } from './data/facility-availability-snapshots.js'
import { facilityBulkRackSnapshots } from './data/facility-bulk-rack-snapshots.js'
import { facilityIds, isKnownFacilityId } from './data/facility-ids.js'
import type { Db } from './db.js'

export const MAX_AVAILABLE_SQUARE_FEET = 9_007_199_254_740_991
export const AVAILABILITY_HISTORY_PAGE_SIZE = 10

const isoTimestamp = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString()

const availabilityRow = (row: Record<string, unknown>) => ({
  facilityId: String(row.facility_id),
  squareFeet: Number(row.square_feet),
  version: Number(row.version),
  updatedAt: isoTimestamp(row.updated_at),
  valueSource: 'administrator' as const,
  snapshotAsOf: null,
  snapshotStatus: null,
})

const availabilityRecord = (facilityId: string, row?: Record<string, unknown>) => {
  if (row) return availabilityRow(row)
  const snapshot = facilityAvailabilitySnapshots[facilityId]
  if (snapshot) return {
    facilityId, squareFeet: snapshot.squareFeet, version: 0, updatedAt: null,
    valueSource: 'source-snapshot' as const, snapshotAsOf: snapshot.asOf, snapshotStatus: snapshot.status ?? null,
  }
  return { facilityId, squareFeet: null, version: 0, updatedAt: null, valueSource: 'pending' as const, snapshotAsOf: null, snapshotStatus: null }
}

const bulkRackRecord = (facilityId: string, row?: Record<string, unknown>) => {
  const snapshot = facilityBulkRackSnapshots[facilityId]
  const persistedBulk = row?.bulk_square_feet !== null && row?.bulk_square_feet !== undefined
  const persistedRack = row?.rack_pallet_positions !== null && row?.rack_pallet_positions !== undefined
  return {
    bulkSquareFeet: persistedBulk ? Number(row?.bulk_square_feet) : snapshot?.bulkSquareFeet ?? null,
    bulkUpToSquareFeet: persistedBulk ? null : snapshot?.bulkUpToSquareFeet ?? null,
    bulkValueSource: persistedBulk ? 'administrator' as const : snapshot?.bulkSquareFeet !== undefined ? 'source-snapshot' as const : 'pending' as const,
    rackPalletPositions: persistedRack ? Number(row?.rack_pallet_positions) : snapshot?.rackPalletPositions ?? null,
    rackValueSource: persistedRack ? 'administrator' as const : snapshot?.rackPalletPositions !== undefined ? 'source-snapshot' as const : 'pending' as const,
    bulkRackVersion: row ? Number(row.version) : 0,
    bulkRackUpdatedAt: row ? isoTimestamp(row.updated_at) : null,
    bulkRackSnapshotAsOf: snapshot?.asOf ?? null,
  }
}

export function validSquareFeet(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_AVAILABLE_SQUARE_FEET
}

export async function publicAvailability(db: Db) {
  const result = await db.query('SELECT facility_id,square_feet FROM facility_availability ORDER BY facility_id')
  return result.rows.map((row) => ({ facilityId: String(row.facility_id), squareFeet: Number(row.square_feet) }))
}

export async function publicBulkRack(db: Db) {
  const result = await db.query('SELECT facility_id,bulk_square_feet,rack_pallet_positions FROM facility_bulk_rack ORDER BY facility_id')
  return result.rows.map((row) => ({
    facilityId: String(row.facility_id),
    ...(row.bulk_square_feet === null ? {} : { bulkSquareFeet: Number(row.bulk_square_feet) }),
    ...(row.rack_pallet_positions === null ? {} : { rackPalletPositions: Number(row.rack_pallet_positions) }),
  }))
}

export async function adminAvailability(db: Db) {
  const result = await db.query('SELECT facility_id,square_feet,version,updated_at FROM facility_availability')
  const current = new Map(result.rows.map((row) => [String(row.facility_id), availabilityRow(row)]))
  return facilityIds.map((facilityId) => current.get(facilityId) ?? availabilityRecord(facilityId))
}

export async function adminFacilitySpace(db: Db) {
  const [availability, bulkRackResult] = await Promise.all([
    adminAvailability(db),
    db.query('SELECT facility_id,bulk_square_feet,rack_pallet_positions,version,updated_at FROM facility_bulk_rack'),
  ])
  const bulkRack = new Map(bulkRackResult.rows.map((row) => [String(row.facility_id), row]))
  return availability.map((entry) => ({ ...entry, ...bulkRackRecord(entry.facilityId, bulkRack.get(entry.facilityId)) }))
}

export async function saveAvailability(db: Db, portalTenantId: string, actor: AdminAccess, input: { facilityId: string; squareFeet: number; version: number }) {
  if (!isKnownFacilityId(input.facilityId)) throw new Error('unknown_facility')
  if (!validSquareFeet(input.squareFeet) || !Number.isSafeInteger(input.version) || input.version < 0) throw new Error('invalid_availability')

  return db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('facility-space:' || $1))", [input.facilityId])
    const actorResult = await client.query('SELECT * FROM facility_admins WHERE id=$1 FOR UPDATE', [actor.id])
    const persistedActor = actorResult.rows[0]
    if (!persistedActor || !persistedActor.is_active || persistedActor.iam_user_id !== actor.iamUserId || persistedActor.tenant_id !== actor.tenantId || persistedActor.tenant_id !== portalTenantId) {
      throw new Error('actor_access_revoked')
    }

    const existingResult = await client.query('SELECT * FROM facility_availability WHERE facility_id=$1 FOR UPDATE', [input.facilityId])
    const existing = existingResult.rows[0]
    const currentVersion = existing ? Number(existing.version) : 0
    if (input.version !== currentVersion) throw new Error('stale_availability')
    const snapshot = facilityAvailabilitySnapshots[input.facilityId]
    const oldSquareFeet = existing?.square_feet ?? snapshot?.squareFeet ?? null
    const oldValueSource = existing ? 'administrator' : snapshot ? 'source-snapshot' : 'pending'

    const savedResult = existing
      ? await client.query(`UPDATE facility_availability
          SET square_feet=$1,version=version+1,updated_at=now(),updated_by_admin_id=$2
          WHERE facility_id=$3 RETURNING *`, [input.squareFeet, persistedActor.id, input.facilityId])
      : await client.query(`INSERT INTO facility_availability (facility_id,square_feet,version,updated_by_admin_id)
          VALUES ($1,$2,1,$3) RETURNING *`, [input.facilityId, input.squareFeet, persistedActor.id])
    const saved = savedResult.rows[0]
    await client.query(`INSERT INTO facility_availability_audit
      (facility_id,old_square_feet,new_square_feet,version,actor_admin_id,actor_iam_user_id,actor_username,old_value_source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [input.facilityId, oldSquareFeet, input.squareFeet, saved.version, persistedActor.id, persistedActor.iam_user_id, persistedActor.username, oldValueSource])
    return availabilityRow(saved)
  })
}

export type FacilitySpaceUpdate = {
  facilityId: string
  availability?: { squareFeet: number; version: number }
  bulkRack?: { version: number; bulkSquareFeet?: number; rackPalletPositions?: number }
}

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)

export async function saveFacilitySpace(db: Db, portalTenantId: string, actor: AdminAccess, input: FacilitySpaceUpdate) {
  const changesAvailability = input.availability !== undefined
  const changesBulk = input.bulkRack !== undefined && hasOwn(input.bulkRack, 'bulkSquareFeet')
  const changesRack = input.bulkRack !== undefined && hasOwn(input.bulkRack, 'rackPalletPositions')
  if (!isKnownFacilityId(input.facilityId) || (!changesAvailability && !changesBulk && !changesRack)) throw new Error('invalid_space')
  if (input.availability && (!validSquareFeet(input.availability.squareFeet) || !Number.isSafeInteger(input.availability.version) || input.availability.version < 0)) throw new Error('invalid_space')
  if (input.bulkRack && (!Number.isSafeInteger(input.bulkRack.version) || input.bulkRack.version < 0)) throw new Error('invalid_space')
  if (changesBulk && !validSquareFeet(input.bulkRack?.bulkSquareFeet)) throw new Error('invalid_space')
  if (changesRack && !validSquareFeet(input.bulkRack?.rackPalletPositions)) throw new Error('invalid_space')

  return db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('facility-space:' || $1))", [input.facilityId])
    const actorResult = await client.query('SELECT * FROM facility_admins WHERE id=$1 FOR UPDATE', [actor.id])
    const persistedActor = actorResult.rows[0]
    if (!persistedActor || !persistedActor.is_active || persistedActor.iam_user_id !== actor.iamUserId || persistedActor.tenant_id !== actor.tenantId || persistedActor.tenant_id !== portalTenantId) {
      throw new Error('actor_access_revoked')
    }

    const [availabilityResult, bulkRackResult] = await Promise.all([
      client.query('SELECT * FROM facility_availability WHERE facility_id=$1 FOR UPDATE', [input.facilityId]),
      client.query('SELECT * FROM facility_bulk_rack WHERE facility_id=$1 FOR UPDATE', [input.facilityId]),
    ])
    let availability = availabilityResult.rows[0] as Record<string, unknown> | undefined
    let bulkRack = bulkRackResult.rows[0] as Record<string, unknown> | undefined
    if (input.availability && input.availability.version !== (availability ? Number(availability.version) : 0)) throw new Error('stale_availability')
    if (input.bulkRack && input.bulkRack.version !== (bulkRack ? Number(bulkRack.version) : 0)) throw new Error('stale_bulk_rack')

    if (input.availability) {
      const snapshot = facilityAvailabilitySnapshots[input.facilityId]
      const oldSquareFeet = availability?.square_feet ?? snapshot?.squareFeet ?? null
      const oldValueSource = availability ? 'administrator' : snapshot ? 'source-snapshot' : 'pending'
      const saved = availability
        ? await client.query(`UPDATE facility_availability SET square_feet=$1,version=version+1,updated_at=now(),updated_by_admin_id=$2
            WHERE facility_id=$3 RETURNING *`, [input.availability.squareFeet, persistedActor.id, input.facilityId])
        : await client.query(`INSERT INTO facility_availability (facility_id,square_feet,version,updated_by_admin_id)
            VALUES ($1,$2,1,$3) RETURNING *`, [input.facilityId, input.availability.squareFeet, persistedActor.id])
      availability = saved.rows[0]
      await client.query(`INSERT INTO facility_availability_audit
        (facility_id,old_square_feet,new_square_feet,version,actor_admin_id,actor_iam_user_id,actor_username,old_value_source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [input.facilityId, oldSquareFeet, input.availability.squareFeet, availability?.version, persistedActor.id, persistedActor.iam_user_id, persistedActor.username, oldValueSource])
    }

    if (input.bulkRack && (changesBulk || changesRack)) {
      const snapshot = facilityBulkRackSnapshots[input.facilityId]
      const previousBulk = bulkRack?.bulk_square_feet
      const previousRack = bulkRack?.rack_pallet_positions
      const nextBulk = changesBulk ? input.bulkRack.bulkSquareFeet : previousBulk === null || previousBulk === undefined ? null : Number(previousBulk)
      const nextRack = changesRack ? input.bulkRack.rackPalletPositions : previousRack === null || previousRack === undefined ? null : Number(previousRack)
      const saved = bulkRack
        ? await client.query(`UPDATE facility_bulk_rack SET bulk_square_feet=$1,rack_pallet_positions=$2,version=version+1,updated_at=now(),updated_by_admin_id=$3
            WHERE facility_id=$4 RETURNING *`, [nextBulk, nextRack, persistedActor.id, input.facilityId])
        : await client.query(`INSERT INTO facility_bulk_rack (facility_id,bulk_square_feet,rack_pallet_positions,version,updated_by_admin_id)
            VALUES ($1,$2,$3,1,$4) RETURNING *`, [input.facilityId, nextBulk, nextRack, persistedActor.id])
      bulkRack = saved.rows[0]
      if (changesBulk) await client.query(`INSERT INTO facility_bulk_rack_audit
        (facility_id,metric,old_value,new_value,version,actor_admin_id,actor_iam_user_id,actor_username,old_value_source)
        VALUES ($1,'bulk',$2,$3,$4,$5,$6,$7,$8)`, [input.facilityId, previousBulk ?? snapshot?.bulkSquareFeet ?? null, input.bulkRack.bulkSquareFeet, bulkRack?.version, persistedActor.id, persistedActor.iam_user_id, persistedActor.username, previousBulk !== null && previousBulk !== undefined ? 'administrator' : snapshot?.bulkSquareFeet !== undefined ? 'source-snapshot' : 'pending'])
      if (changesRack) await client.query(`INSERT INTO facility_bulk_rack_audit
        (facility_id,metric,old_value,new_value,version,actor_admin_id,actor_iam_user_id,actor_username,old_value_source)
        VALUES ($1,'rack',$2,$3,$4,$5,$6,$7,$8)`, [input.facilityId, previousRack ?? snapshot?.rackPalletPositions ?? null, input.bulkRack.rackPalletPositions, bulkRack?.version, persistedActor.id, persistedActor.iam_user_id, persistedActor.username, previousRack !== null && previousRack !== undefined ? 'administrator' : snapshot?.rackPalletPositions !== undefined ? 'source-snapshot' : 'pending'])
    }

    return { ...availabilityRecord(input.facilityId, availability), ...bulkRackRecord(input.facilityId, bulkRack) }
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
  const pageResult = await db.query(`SELECT id,facility_id,old_square_feet,new_square_feet,version,actor_iam_user_id,actor_username,old_value_source,created_at
    FROM facility_availability_audit ${where}
    ORDER BY created_at DESC,id DESC LIMIT ${AVAILABILITY_HISTORY_PAGE_SIZE} OFFSET $${offsetParameter}`, [...values, (input.page - 1) * AVAILABILITY_HISTORY_PAGE_SIZE])
  return {
    entries: pageResult.rows.map((row) => ({
      id: String(row.id), facilityId: String(row.facility_id),
      oldSquareFeet: row.old_square_feet === null ? null : Number(row.old_square_feet), newSquareFeet: Number(row.new_square_feet),
      version: Number(row.version), actorIamUserId: String(row.actor_iam_user_id), actorUsername: String(row.actor_username),
      oldValueSource: row.old_square_feet === null && row.old_value_source === 'administrator'
        ? 'pending' as const
        : String(row.old_value_source) as 'administrator' | 'source-snapshot' | 'pending',
      createdAt: isoTimestamp(row.created_at),
    })),
    page: input.page, pageSize: AVAILABILITY_HISTORY_PAGE_SIZE, total, totalPages: Math.ceil(total / AVAILABILITY_HISTORY_PAGE_SIZE),
  }
}

export async function facilitySpaceHistory(db: Db, input: { page: number; facilityId?: string }) {
  if (!Number.isSafeInteger(input.page) || input.page < 1 || input.page > 100_000) throw new Error('invalid_page')
  if (input.facilityId && !isKnownFacilityId(input.facilityId)) throw new Error('unknown_facility')
  const values: unknown[] = []
  const where = input.facilityId ? 'WHERE facility_id=$1' : ''
  if (input.facilityId) values.push(input.facilityId)
  const countResult = await db.query(`SELECT
    (SELECT count(*) FROM facility_availability_audit ${where})::int +
    (SELECT count(*) FROM facility_bulk_rack_audit ${where})::int AS count`, values)
  const total = Number(countResult.rows[0].count)
  const offsetParameter = values.length + 1
  const pageResult = await db.query(`WITH events AS (
      SELECT 'availability'::text source,id audit_id,facility_id,'available'::text metric,old_square_feet old_value,new_square_feet new_value,
        version,actor_iam_user_id,actor_username,old_value_source,created_at
      FROM facility_availability_audit ${where}
      UNION ALL
      SELECT 'bulk-rack'::text source,id audit_id,facility_id,metric,old_value,new_value,
        version,actor_iam_user_id,actor_username,old_value_source,created_at
      FROM facility_bulk_rack_audit ${where}
    ) SELECT * FROM events ORDER BY created_at DESC,source DESC,audit_id DESC
    LIMIT ${AVAILABILITY_HISTORY_PAGE_SIZE} OFFSET $${offsetParameter}`, [...values, (input.page - 1) * AVAILABILITY_HISTORY_PAGE_SIZE])
  return {
    entries: pageResult.rows.map((row) => ({
      id: `${row.source}:${row.audit_id}`, facilityId: String(row.facility_id), metric: String(row.metric) as 'available' | 'bulk' | 'rack',
      oldValue: row.old_value === null ? null : Number(row.old_value), newValue: Number(row.new_value), version: Number(row.version),
      actorIamUserId: String(row.actor_iam_user_id), actorUsername: String(row.actor_username),
      oldValueSource: row.old_value === null && row.old_value_source === 'administrator'
        ? 'pending' as const
        : String(row.old_value_source) as 'administrator' | 'source-snapshot' | 'pending',
      createdAt: isoTimestamp(row.created_at),
    })),
    page: input.page, pageSize: AVAILABILITY_HISTORY_PAGE_SIZE, total, totalPages: Math.ceil(total / AVAILABILITY_HISTORY_PAGE_SIZE),
  }
}
