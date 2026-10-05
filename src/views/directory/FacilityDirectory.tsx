import { memo } from 'react'
import { ChevronRight, MapPin, Search } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { FacilityPhoto } from '../../components/FacilityPhoto'
import { OpenStateBadge } from '../../components/OpenStateBadge'
import { archivedFacilities, networkFacilities, type DisplayStatus, type Facility } from '../../data/facilities'
import { getFacilityMedia } from '../../data/facility-media'
import type { FacilityTypeFilter, StatusFilter } from '../../hooks/useFacilityFilters'
import { formatFacilityNumber, getFacilityTitle, statusClass } from '../../lib/facility-display'
import type { FacilityOpenState } from '../../lib/facility-open'

type FacilityDirectoryProps = {
  facilities: readonly Facility[]
  search: string
  onSearchChange: (search: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (filter: StatusFilter) => void
  typeFilter: FacilityTypeFilter
  onTypeFilterChange: (filter: FacilityTypeFilter) => void
  selectedId: string | null
  resolveStatus: (facility: Facility) => DisplayStatus
  openStates: Record<string, FacilityOpenState>
  onChoose: (facility: Facility) => void
}

/** The searchable, filterable facility roster beside the map. */
export const FacilityDirectory = memo(function FacilityDirectory({ facilities, search, onSearchChange, statusFilter, onStatusFilterChange, typeFilter, onTypeFilterChange, selectedId, resolveStatus, openStates, onChoose }: FacilityDirectoryProps) {
  return (
    <div className="locations-card directory-panel">
      <div className="directory-heading">
        <div><span className="eyebrow">User-provided roster</span><h1>Facility directory</h1><p>Select a location to view its available information alongside the map.</p></div>
        <span>{facilities.length} of {statusFilter === 'Archived' ? `${archivedFacilities.length} archived` : networkFacilities.length}</span>
      </div>
      <div className="list-filters">
        <label><Search size={16} /><span className="sr-only">Filter facilities</span><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search street, city, state, ZIP..." /></label>
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}>
          <option value="All">All statuses</option><option>Active</option><option>Coming Soon</option><option>Planned</option><option>Unassigned</option><option>Archived</option>
        </select>
        <select aria-label="Filter by facility type" value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value as FacilityTypeFilter)}>
          <option value="All">All types</option><option>UF ONLY</option><option>UF/CUBEWORKS</option><option>Samsung Warehouse</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Facility</th><th>City / State</th><th>Status</th><th><span className="sr-only">Select</span></th></tr></thead>
          <tbody>
            {facilities.map((facility) => (
              <FacilityRow
                key={facility.id}
                facility={facility}
                status={resolveStatus(facility)}
                openState={openStates[facility.id]}
                selected={facility.id === selectedId}
                onChoose={onChoose}
              />
            ))}
          </tbody>
        </table>
        {facilities.length === 0 && <EmptyState icon={Search} title="No matching facilities" body="Try a street, city, state name or abbreviation, ZIP, status, or facility type." />}
      </div>
    </div>
  )
})

type FacilityRowProps = { facility: Facility; status: DisplayStatus; openState: FacilityOpenState; selected: boolean; onChoose: (facility: Facility) => void }

const FacilityRow = memo(function FacilityRow({ facility, status, openState, selected, onChoose }: FacilityRowProps) {
  return (
    <tr className={selected ? 'selected' : ''} onClick={() => onChoose(facility)}>
      <td><span className="roster-index">{formatFacilityNumber(facility)}</span></td>
      <td>
        <button data-facility-id={facility.id} onClick={() => onChoose(facility)} aria-label={`Select ${facility.fullAddress}`}>
          <FacilityPhoto media={getFacilityMedia(facility.id)} variant="thumbnail" />
          <span className="roster-copy">
            <strong className="roster-title">{getFacilityTitle(facility)}</strong>
            <span className="roster-address"><MapPin size={15} /><span>{facility.fullAddress}</span></span>
          </span>
        </button>
      </td>
      <td>{facility.city ? `${facility.city}, ${facility.state}` : `City not provided · ${facility.state}`}</td>
      <td><span className="roster-status"><span className={`status-pill ${statusClass(status)}`}>{status}</span><OpenStateBadge state={openState} variant="compact" /></span></td>
      <td><ChevronRight size={15} /></td>
    </tr>
  )
})
