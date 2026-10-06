import type { AdminAccess } from './access.js'
import { facilityIds, isKnownFacilityId } from './data/facility-ids.js'
import type { Db } from './db.js'

export const ARCHIVE_HISTORY_PAGE_SIZE = 10

const isoTimestamp = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString()

const archiveRow = (row: Record<string, unknown>) => ({
  facilityId: String(row.facility_id),
  archived: Boolean(row.archived),
  archivedAt: row.archived ? isoTimestamp(row.archived_at) : null,
  archivedBy: row.archived ? String(row.archived_by_name) : null,
  version: Number(row.version),
  updatedAt: isoTimestamp(row.updated_at),
})

const unarchivedRecord = (facilityId: string) => ({ facilityId, archived: false, archivedAt: null, archivedBy: null, version: 0, updatedAt: null })

// Public projection: only facilities currently archived, with the date and archiving administrator's display name.
export async function publicArchive(db: Db) {
  const result = await db.query('SELECT facility_id,archived_at,archived_by_name FROM facility_archive WHERE archived ORDER BY facility_id')
  return result.rows.map((row) => ({
    facilityId: String(row.facility_id),
    archivedOn: isoTimestamp(row.archived_at).slice(0, 10),
    archivedBy: String(row.archived_by_name),
  }))
}

export async function adminArchive(db: Db) {
  const result = await db.query('SELECT facility_id,archived,archived_at,archived_by_name,version,updated_at FROM facility_archive')
  const current = new Map(result.rows.map((row) => [String(row.facility_id), archiveRow(row)]))
  return facilityIds.map((facilityId) => current.get(facilityId) ?? unarchivedRecord(facilityId))
}

export async function setFacilityArchived(db: Db, portalTenantId: string, actor: AdminAccess, input: { facilityId: string; archived: boolean; version: number }) {
  if (!isKnownFacilityId(input.facilityId)) throw new Error('unknown_facility')
  if (typeof input.archived !== 'boolean' || !Number.isSafeInteger(input.version) || input.version < 0) throw new Error('invalid_archive')

  return db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('facility-archive:' || $1))", [input.facilityId])
    const actorResult = await client.query('SELECT * FROM facility_admins WHERE id=$1 FOR UPDATE', [actor.id])
    const persistedActor = actorResult.rows[0]
    if (!persistedActor || !persistedActor.is_active || persistedActor.iam_user_id !== actor.iamUserId || persistedActor.tenant_id !== actor.tenantId || persistedActor.tenant_id !== portalTenantId) {
      throw new Error('actor_access_revoked')
    }

    const existingResult = await client.query('SELECT * FROM facility_archive WHERE facility_id=$1 FOR UPDATE', [input.facilityId])
    const existing = existingResult.rows[0]
    const currentVersion = existing ? Number(existing.version) : 0
    const currentlyArchived = Boolean(existing?.archived)
    if (input.version !== currentVersion || input.archived === currentlyArchived) throw new Error('stale_archive')

    const actorName = String(persistedActor.display_name || persistedActor.username)
    const archivedAt = input.archived ? new Date() : null
    const archivedBy = input.archived ? actorName : null
    const savedResult = existing
      ? await client.query(`UPDATE facility_archive
          SET archived=$1,archived_at=$2,archived_by_name=$3,version=version+1,updated_at=now(),updated_by_admin_id=$4
          WHERE facility_id=$5 RETURNING *`, [input.archived, archivedAt, archivedBy, persistedActor.id, input.facilityId])
      : await client.query(`INSERT INTO facility_archive (facility_id,archived,archived_at,archived_by_name,version,updated_by_admin_id)
          VALUES ($1,$2,$3,$4,1,$5) RETURNING *`, [input.facilityId, input.archived, archivedAt, archivedBy, persistedActor.id])
    const saved = savedResult.rows[0]
    await client.query(`INSERT INTO facility_archive_audit
      (facility_id,action,version,actor_admin_id,actor_iam_user_id,actor_username,actor_display_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [input.facilityId, input.archived ? 'archive' : 'restore', saved.version, persistedActor.id, persistedActor.iam_user_id, persistedActor.username, actorName])
    return archiveRow(saved)
  })
}

export async function archiveHistory(db: Db, input: { page: number; facilityId?: string }) {
  if (!Number.isSafeInteger(input.page) || input.page < 1 || input.page > 100_000) throw new Error('invalid_page')
  if (input.facilityId && !isKnownFacilityId(input.facilityId)) throw new Error('unknown_facility')
  const values: unknown[] = []
  const where = input.facilityId ? 'WHERE facility_id=$1' : ''
  if (input.facilityId) values.push(input.facilityId)
  const countResult = await db.query(`SELECT count(*)::int AS count FROM facility_archive_audit ${where}`, values)
  const total = Number(countResult.rows[0].count)
  const pageResult = await db.query(`SELECT * FROM facility_archive_audit ${where} ORDER BY created_at DESC,id DESC
    LIMIT ${ARCHIVE_HISTORY_PAGE_SIZE} OFFSET $${values.length + 1}`, [...values, (input.page - 1) * ARCHIVE_HISTORY_PAGE_SIZE])
  return {
    entries: pageResult.rows.map((row) => ({
      id: String(row.id), facilityId: String(row.facility_id), action: String(row.action) as 'archive' | 'restore',
      version: Number(row.version), actorIamUserId: String(row.actor_iam_user_id), actorUsername: String(row.actor_username),
      actorDisplayName: String(row.actor_display_name), createdAt: isoTimestamp(row.created_at),
    })),
    page: input.page, pageSize: ARCHIVE_HISTORY_PAGE_SIZE, total, totalPages: Math.ceil(total / ARCHIVE_HISTORY_PAGE_SIZE),
  }
}
