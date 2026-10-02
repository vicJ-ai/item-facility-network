import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, Building2, ChevronLeft, ChevronRight, History, LoaderCircle, RefreshCw, Save, Warehouse } from 'lucide-react'
import { useAccess } from '../auth/access-context'
import { facilities } from '../data/facilities'
import { formatAvailableSpaceMonth } from '../data/facility-space'
import type { AdminFacilitySpace, FacilitySpaceHistoryEntry, FacilitySpaceHistoryPage, PublicAvailability, PublicBulkRack } from '../types/availability'

const emptyHistory: FacilitySpaceHistoryPage = { entries: [], page: 1, pageSize: 10, total: 0, totalPages: 0 }
const numberFormat = new Intl.NumberFormat('en-US')

function sourceLabel(source: 'administrator' | 'source-snapshot' | 'pending', snapshotAsOf: string | null, unconfirmed = false) {
  if (source === 'administrator') return 'Administrator-maintained live value'
  if (source === 'source-snapshot') return `User-supplied snapshot${snapshotAsOf ? ` · ${formatAvailableSpaceMonth(snapshotAsOf)}` : ''}${unconfirmed ? ' · not confirmed' : ''}`
  return 'No administrator value or source snapshot'
}

function displayValue(value: number | null, unit: 'SQF' | 'pallet positions') {
  return value === null ? 'Not provided' : `${numberFormat.format(value)} ${unit}`
}

function historyValue(value: number | null, metric: 'available' | 'bulk' | 'rack') {
  if (value === null) return metric === 'available' ? 'Pending' : 'Not provided'
  return `${numberFormat.format(value)} ${metric === 'rack' ? 'pallet positions' : 'SQF'}`
}

function HistoryChange({ metric, oldValue, newValue, oldValueSource }: {
  metric: 'available' | 'bulk' | 'rack'
  oldValue: number | null
  newValue: number | null
  oldValueSource: FacilitySpaceHistoryEntry['oldAvailableValueSource']
}) {
  if (newValue === null) return <span aria-label={`${metric} not recorded`}>—</span>
  return <>{historyValue(oldValue, metric)}{oldValueSource !== 'pending' && oldValueSource !== null && <small>{oldValueSource === 'source-snapshot' ? 'source snapshot' : 'administrator value'}</small>} → <strong>{historyValue(newValue, metric)}</strong></>
}

function FacilitySpaceEditor({ record, onSaved }: { record: AdminFacilitySpace; onSaved: (entry: AdminFacilitySpace) => void }) {
  const { authorizedFetch } = useAccess()
  const facility = facilities.find((item) => item.id === record.facilityId)!
  const [availableValue, setAvailableValue] = useState(record.squareFeet === null ? '' : String(record.squareFeet))
  const [bulkValue, setBulkValue] = useState(record.bulkSquareFeet === null ? '' : String(record.bulkSquareFeet))
  const [rackValue, setRackValue] = useState(record.rackPalletPositions === null ? '' : String(record.rackPalletPositions))
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const parseField = (label: string, raw: string) => {
    if (raw === '') {
      throw new Error(`${label} is required. Enter a nonnegative whole number.`)
    }
    const value = Number(raw)
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative whole number.`)
    return value
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    let available: number
    let bulk: number
    let rack: number
    try {
      available = parseField('Available space', availableValue)
      bulk = parseField('Bulk', bulkValue)
      rack = parseField('Rack', rackValue)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Enter nonnegative whole numbers.' })
      return
    }
    const body = {
      availableSquareFeet: available,
      bulkSquareFeet: bulk,
      rackPalletPositions: rack,
      availabilityVersion: record.version,
      bulkRackVersion: record.bulkRackVersion,
    }
    setPending(true); setMessage(null)
    try {
      const response = await authorizedFetch(`/api/admin/facility-space/${encodeURIComponent(record.facilityId)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      })
      const responseBody = await response.json().catch(() => ({})) as { error?: string; space?: AdminFacilitySpace }
      if (!response.ok || !responseBody.space) {
        if (responseBody.error === 'stale_availability' || responseBody.error === 'stale_bulk_rack') throw new Error('These values changed elsewhere. Use Refresh, review the latest values, and try again.')
        if (responseBody.error === 'actor_access_revoked') throw new Error('Your administrator access is no longer active.')
        throw new Error('Facility space could not be saved.')
      }
      setAvailableValue(responseBody.space.squareFeet === null ? '' : String(responseBody.space.squareFeet))
      setBulkValue(responseBody.space.bulkSquareFeet === null ? '' : String(responseBody.space.bulkSquareFeet))
      setRackValue(responseBody.space.rackPalletPositions === null ? '' : String(responseBody.space.rackPalletPositions))
      setMessage({ kind: 'success', text: 'Facility space saved.' })
      onSaved(responseBody.space)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Facility space could not be saved.' })
    } finally {
      setPending(false)
    }
  }

  return <form className="availability-editor facility-space-editor" onSubmit={submit} aria-label={`Update facility space for ${facility.fullAddress}`}>
    <div className="availability-editor-heading"><span className="eyebrow">Facility {String(facility.number).padStart(2, '0')}</span><h2>{facility.city ?? facility.street}, {facility.state}</h2><p>{facility.fullAddress}</p></div>
    <div className="facility-space-fields">
      <label><span>Available space</span><div className="availability-input"><input inputMode="numeric" pattern="[0-9]+" value={availableValue} onChange={(event) => setAvailableValue(event.target.value)} aria-describedby="facility-space-help" disabled={pending} /><b>SQF</b></div></label>
      <label><span>Bulk</span><div className="availability-input"><input inputMode="numeric" pattern="[0-9]+" value={bulkValue} onChange={(event) => setBulkValue(event.target.value)} aria-describedby="facility-space-help" disabled={pending} /><b>SQF</b></div></label>
      <label><span>Rack</span><div className="availability-input"><input inputMode="numeric" pattern="[0-9]+" value={rackValue} onChange={(event) => setRackValue(event.target.value)} aria-describedby="facility-space-help" disabled={pending} /><b>pallet positions</b></div></label>
    </div>
    <p id="facility-space-help">Enter all three values as whole numbers. Zero is valid. Each save records the complete facility-space state.</p>
    <button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Save />}{pending ? 'Saving…' : 'Save facility space'}</button>
    {message && <div className={`availability-message ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.kind === 'error' && <AlertCircle />}{message.text}</div>}
    <dl className="availability-current">
      <div><dt>Available space</dt><dd>{record.squareFeet === null ? 'Pending' : `${numberFormat.format(record.squareFeet)} SQF`}</dd><small>{sourceLabel(record.valueSource, record.snapshotAsOf, record.snapshotStatus === 'unconfirmed')}</small></div>
      <div><dt>Bulk</dt><dd>{displayValue(record.bulkSquareFeet, 'SQF')}{record.bulkUpToSquareFeet !== null && ` · up to ${numberFormat.format(record.bulkUpToSquareFeet)} SQF`}</dd><small>{sourceLabel(record.bulkValueSource, record.bulkRackSnapshotAsOf)}</small></div>
      <div><dt>Rack</dt><dd>{displayValue(record.rackPalletPositions, 'pallet positions')}</dd><small>{sourceLabel(record.rackValueSource, record.bulkRackSnapshotAsOf)}</small></div>
      <div><dt>Database versions</dt><dd>{record.version} available · {record.bulkRackVersion} bulk/rack</dd></div>
    </dl>
  </form>
}

export function OperationsWorkbench({ onAvailabilityChanged, onBulkRackChanged }: { onAvailabilityChanged: (entry: PublicAvailability) => void; onBulkRackChanged: (entry: PublicBulkRack) => void }) {
  const { authorizedFetch, user } = useAccess()
  const [records, setRecords] = useState<AdminFacilitySpace[]>([])
  const [selectedId, setSelectedId] = useState(facilities[0].id)
  const [history, setHistory] = useState<FacilitySpaceHistoryPage>(emptyHistory)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await authorizedFetch('/api/admin/facility-space')
      if (!response.ok) throw new Error()
      setRecords(((await response.json()) as { facilities: AdminFacilitySpace[] }).facilities)
    } catch {
      setError('Facility space could not be loaded.')
    } finally { setLoading(false) }
  }, [authorizedFetch])

  const loadHistory = useCallback(async (facilityId: string, nextPage: number) => {
    setHistoryLoading(true)
    try {
      const response = await authorizedFetch(`/api/admin/facility-space/history?facilityId=${encodeURIComponent(facilityId)}&page=${nextPage}`)
      if (!response.ok) throw new Error()
      setHistory(await response.json() as FacilitySpaceHistoryPage)
    } catch {
      setError('Facility space history could not be loaded.')
    } finally { setHistoryLoading(false) }
  }, [authorizedFetch])

  // These effects synchronize the authenticated workbench with server-owned records.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadRecords() }, [loadRecords])
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadHistory(selectedId, page) }, [loadHistory, page, selectedId])

  const selected = useMemo(() => records.find((record) => record.facilityId === selectedId), [records, selectedId])
  const saveComplete = (entry: AdminFacilitySpace) => {
    setRecords((current) => current.map((record) => record.facilityId === entry.facilityId ? entry : record))
    if (entry.valueSource === 'administrator' && entry.squareFeet !== null) onAvailabilityChanged({ facilityId: entry.facilityId, squareFeet: entry.squareFeet })
    const publicBulkRack: PublicBulkRack = { facilityId: entry.facilityId }
    if (entry.bulkValueSource === 'administrator' && entry.bulkSquareFeet !== null) publicBulkRack.bulkSquareFeet = entry.bulkSquareFeet
    if (entry.rackValueSource === 'administrator' && entry.rackPalletPositions !== null) publicBulkRack.rackPalletPositions = entry.rackPalletPositions
    if (publicBulkRack.bulkSquareFeet !== undefined || publicBulkRack.rackPalletPositions !== undefined) onBulkRackChanged(publicBulkRack)
    setPage(1)
    void loadHistory(entry.facilityId, 1)
  }
  const refreshWorkbench = () => { void loadRecords(); void loadHistory(selectedId, page) }

  return <section className="operations-workbench" aria-label="Operations facility space workbench">
    <header className="workbench-header"><div><span className="eyebrow">Administrator workspace</span><h1>Facility space</h1><p>Update public available, bulk, and rack figures without changing sourced capacity facts.</p></div><div className="workbench-header-actions"><button className="secondary-button" type="button" onClick={refreshWorkbench} disabled={loading || historyLoading}><RefreshCw />Refresh</button><span><Building2 />{facilities.length} facilities</span></div></header>
    {error && <div className="workbench-error" role="alert"><AlertCircle />{error}<button type="button" onClick={refreshWorkbench}>Retry</button></div>}
    <div className="workbench-layout">
      <aside className="workbench-facilities" aria-label="Select a facility">
        {facilities.map((facility) => {
          const record = records.find((item) => item.facilityId === facility.id)
          return <button key={facility.id} type="button" className={selectedId === facility.id ? 'active' : ''} aria-pressed={selectedId === facility.id} onClick={() => { setSelectedId(facility.id); setPage(1); setError('') }}><span><small>Facility {String(facility.number).padStart(2, '0')}</small><strong>{facility.city ?? facility.street}, {facility.state}</strong></span><b>{record?.squareFeet === null || record === undefined ? 'Pending' : `${numberFormat.format(record.squareFeet)} SQF`}</b></button>
        })}
      </aside>
      <div className="workbench-main">
        {loading || !selected ? <div className="workbench-loading" role="status"><LoaderCircle className="spin" />Loading facility space…</div> : <FacilitySpaceEditor key={selected.facilityId} record={selected} onSaved={saveComplete} />}
        <section className="availability-history" aria-labelledby="facility-space-history-title">
          <header><div><History /><span><span className="eyebrow">Immutable audit log</span><h2 id="facility-space-history-title">Change history</h2></span></div><small>Signed in as {user?.username} · IAM ID {user?.iamUserId}</small></header>
          {historyLoading ? <div className="history-state" role="status"><LoaderCircle className="spin" />Loading history…</div> : history.entries.length === 0 ? <div className="history-state"><Warehouse />No facility-space saves recorded for this facility.</div> : <div className="history-table-wrap"><table><thead><tr><th>Date (UTC)</th><th>Available SQF</th><th>Bulk SQF</th><th>Rack positions</th><th>Updater</th></tr></thead><tbody>{history.entries.map((entry) => <tr key={entry.id} data-record-type={entry.recordType}><td><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC</time>{entry.recordType !== 'combined' && <small>Legacy record</small>}</td><td><HistoryChange metric="available" oldValue={entry.oldAvailableSquareFeet} newValue={entry.newAvailableSquareFeet} oldValueSource={entry.oldAvailableValueSource} /></td><td><HistoryChange metric="bulk" oldValue={entry.oldBulkSquareFeet} newValue={entry.newBulkSquareFeet} oldValueSource={entry.oldBulkValueSource} /></td><td><HistoryChange metric="rack" oldValue={entry.oldRackPalletPositions} newValue={entry.newRackPalletPositions} oldValueSource={entry.oldRackValueSource} /></td><td>{entry.actorUsername}<small>IAM ID {entry.actorIamUserId}</small></td></tr>)}</tbody></table></div>}
          <footer><span>{history.total} {history.total === 1 ? 'record' : 'records'}</span><div><button type="button" aria-label="Previous history page" disabled={historyLoading || page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft /></button><span>Page {history.totalPages ? history.page : 0} of {history.totalPages}</span><button type="button" aria-label="Next history page" disabled={historyLoading || page >= history.totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight /></button></div></footer>
        </section>
      </div>
    </div>
  </section>
}
