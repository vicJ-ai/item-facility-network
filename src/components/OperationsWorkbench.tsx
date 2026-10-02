import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, Building2, ChevronLeft, ChevronRight, History, LoaderCircle, RefreshCw, Save, Warehouse } from 'lucide-react'
import { useAccess } from '../auth/access-context'
import { facilities } from '../data/facilities'
import { formatAvailableSpaceMonth } from '../data/facility-space'
import type { AdminAvailability, AvailabilityHistoryPage, PublicAvailability } from '../types/availability'

const emptyHistory: AvailabilityHistoryPage = { entries: [], page: 1, pageSize: 10, total: 0, totalPages: 0 }
const numberFormat = new Intl.NumberFormat('en-US')

function availabilitySourceLabel(record: AdminAvailability) {
  if (record.valueSource === 'administrator') return 'Administrator-maintained live value'
  if (record.valueSource === 'source-snapshot') return `User-supplied snapshot${record.snapshotAsOf ? ` · ${formatAvailableSpaceMonth(record.snapshotAsOf)}` : ''}${record.snapshotStatus === 'unconfirmed' ? ' · not confirmed' : ''}`
  return 'No administrator value or source snapshot'
}

function AvailabilityEditor({ record, onSaved }: { record: AdminAvailability; onSaved: (entry: AdminAvailability) => void }) {
  const { authorizedFetch } = useAccess()
  const facility = facilities.find((item) => item.id === record.facilityId)!
  const [value, setValue] = useState(record.squareFeet === null ? '' : String(record.squareFeet))
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const squareFeet = Number(value)
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(squareFeet) || squareFeet < 0) {
      setMessage({ kind: 'error', text: 'Enter a nonnegative whole number of square feet.' })
      return
    }
    setPending(true); setMessage(null)
    try {
      const response = await authorizedFetch(`/api/admin/availability/${encodeURIComponent(record.facilityId)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ squareFeet, version: record.version }),
      })
      const body = await response.json().catch(() => ({})) as { error?: string; availability?: AdminAvailability }
      if (!response.ok || !body.availability) {
        if (body.error === 'stale_availability') throw new Error('This value changed elsewhere. Use Refresh, review the latest value, and try again.')
        if (body.error === 'actor_access_revoked') throw new Error('Your administrator access is no longer active.')
        throw new Error('Available space could not be saved.')
      }
      setValue(String(body.availability.squareFeet))
      setMessage({ kind: 'success', text: 'Available space saved.' })
      onSaved(body.availability)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Available space could not be saved.' })
    } finally {
      setPending(false)
    }
  }

  return <form className="availability-editor" onSubmit={submit} aria-label={`Update available space for ${facility.fullAddress}`}>
    <div className="availability-editor-heading"><span className="eyebrow">Facility {String(facility.number).padStart(2, '0')}</span><h2>{facility.city ?? facility.street}, {facility.state}</h2><p>{facility.fullAddress}</p></div>
    <label><span>Available space</span><div className="availability-input"><input inputMode="numeric" pattern="[0-9]+" value={value} onChange={(event) => setValue(event.target.value)} aria-describedby="availability-help" disabled={pending} /><b>SQFT</b></div></label>
    <p id="availability-help">Use a whole number. Zero is valid; saving replaces any displayed source snapshot with an administrator-maintained value.</p>
    <button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Save />}{pending ? 'Saving…' : 'Save available space'}</button>
    {message && <div className={`availability-message ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.kind === 'error' && <AlertCircle />}{message.text}</div>}
    <dl className="availability-current"><div><dt>Current effective value</dt><dd>{record.squareFeet === null ? 'Pending' : `${numberFormat.format(record.squareFeet)} SQFT`}</dd><small>{availabilitySourceLabel(record)}</small></div><div><dt>Database version</dt><dd>{record.version}</dd></div></dl>
  </form>
}

export function OperationsWorkbench({ onAvailabilityChanged }: { onAvailabilityChanged: (entry: PublicAvailability) => void }) {
  const { authorizedFetch, user } = useAccess()
  const [records, setRecords] = useState<AdminAvailability[]>([])
  const [selectedId, setSelectedId] = useState(facilities[0].id)
  const [history, setHistory] = useState<AvailabilityHistoryPage>(emptyHistory)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await authorizedFetch('/api/admin/availability')
      if (!response.ok) throw new Error()
      setRecords(((await response.json()) as { availability: AdminAvailability[] }).availability)
    } catch {
      setError('Facility availability could not be loaded.')
    } finally { setLoading(false) }
  }, [authorizedFetch])

  const loadHistory = useCallback(async (facilityId: string, nextPage: number) => {
    setHistoryLoading(true)
    try {
      const response = await authorizedFetch(`/api/admin/availability/history?facilityId=${encodeURIComponent(facilityId)}&page=${nextPage}`)
      if (!response.ok) throw new Error()
      setHistory(await response.json() as AvailabilityHistoryPage)
    } catch {
      setError('Availability history could not be loaded.')
    } finally { setHistoryLoading(false) }
  }, [authorizedFetch])

  // These effects synchronize the authenticated workbench with server-owned records.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadRecords() }, [loadRecords])
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void loadHistory(selectedId, page) }, [loadHistory, page, selectedId])

  const selected = useMemo(() => records.find((record) => record.facilityId === selectedId), [records, selectedId])
  const saveComplete = (entry: AdminAvailability) => {
    setRecords((current) => current.map((record) => record.facilityId === entry.facilityId ? entry : record))
    if (entry.squareFeet !== null) onAvailabilityChanged({ facilityId: entry.facilityId, squareFeet: entry.squareFeet })
    setPage(1)
    void loadHistory(entry.facilityId, 1)
  }
  const refreshWorkbench = () => {
    void loadRecords()
    void loadHistory(selectedId, page)
  }

  return <section className="operations-workbench" aria-label="Operations availability workbench">
    <header className="workbench-header"><div><span className="eyebrow">Administrator workspace</span><h1>Facility availability</h1><p>Update public available-space figures without changing sourced capacity facts.</p></div><div className="workbench-header-actions"><button className="secondary-button" type="button" onClick={refreshWorkbench} disabled={loading || historyLoading}><RefreshCw />Refresh</button><span><Building2 />{facilities.length} facilities</span></div></header>
    {error && <div className="workbench-error" role="alert"><AlertCircle />{error}<button type="button" onClick={refreshWorkbench}>Retry</button></div>}
    <div className="workbench-layout">
      <aside className="workbench-facilities" aria-label="Select a facility">
        {facilities.map((facility) => {
          const record = records.find((item) => item.facilityId === facility.id)
          return <button key={facility.id} type="button" className={selectedId === facility.id ? 'active' : ''} aria-pressed={selectedId === facility.id} onClick={() => { setSelectedId(facility.id); setPage(1); setError('') }}><span><small>Facility {String(facility.number).padStart(2, '0')}</small><strong>{facility.city ?? facility.street}, {facility.state}</strong></span><b>{record?.squareFeet === null || record === undefined ? 'Pending' : `${numberFormat.format(record.squareFeet)} SQFT`}</b></button>
        })}
      </aside>
      <div className="workbench-main">
        {loading || !selected ? <div className="workbench-loading" role="status"><LoaderCircle className="spin" />Loading facility availability…</div> : <AvailabilityEditor key={selected.facilityId} record={selected} onSaved={saveComplete} />}
        <section className="availability-history" aria-labelledby="availability-history-title">
          <header><div><History /><span><span className="eyebrow">Immutable audit log</span><h2 id="availability-history-title">Change history</h2></span></div><small>Signed in as {user?.username} · IAM ID {user?.iamUserId}</small></header>
          {historyLoading ? <div className="history-state" role="status"><LoaderCircle className="spin" />Loading history…</div> : history.entries.length === 0 ? <div className="history-state"><Warehouse />No availability changes recorded for this facility.</div> : <div className="history-table-wrap"><table><thead><tr><th>Date (UTC)</th><th>Change</th><th>Administrator</th></tr></thead><tbody>{history.entries.map((entry) => <tr key={entry.id}><td><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC</time></td><td>{entry.oldSquareFeet === null ? 'Pending' : numberFormat.format(entry.oldSquareFeet)}{entry.oldValueSource !== 'pending' && <small>{entry.oldValueSource === 'source-snapshot' ? 'source snapshot' : 'administrator value'}</small>} → <strong>{numberFormat.format(entry.newSquareFeet)} SQFT</strong></td><td>{entry.actorUsername}<small>IAM ID {entry.actorIamUserId}</small></td></tr>)}</tbody></table></div>}
          <footer><span>{history.total} {history.total === 1 ? 'change' : 'changes'}</span><div><button type="button" aria-label="Previous history page" disabled={historyLoading || page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft /></button><span>Page {history.totalPages ? history.page : 0} of {history.totalPages}</span><button type="button" aria-label="Next history page" disabled={historyLoading || page >= history.totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight /></button></div></footer>
        </section>
      </div>
    </div>
  </section>
}
