import { Boxes, Building2, CalendarClock, FileText, Info, ShieldCheck, Warehouse } from 'lucide-react'
import { OpenStateBadge } from '../../components/OpenStateBadge'
import { OperatingHoursDisplay } from '../../components/OperatingHoursDisplay'
import { archivedLabel, isArchived, type DisplayStatus, type Facility } from '../../data/facilities'
import { FACILITY_BUILDING_SOURCE_NOTE, formatCeilingHeight, formatLeaseExpiration, formatLoadingDocks, formatOfficeArea, getFacilityBuildingDetails } from '../../data/facility-building'
import type { FacilitySitePlan } from '../../data/facility-site-plans'
import { formatAvailableSpace, formatAvailableSpaceMonth, formatBulk, formatRack, formatTotalSquareFeet, getFacilityBulkRack, getFacilitySquareFootage, getSitePlanAreaFact, hasReportedAvailableSpace } from '../../data/facility-space'
import { assignableStatuses, formatSitePlanFact, hasUsableCoordinates, precisionChipClass } from '../../lib/facility-display'
import type { FacilityOpenState } from '../../lib/facility-open'
import { GoogleMapsOverview } from './GoogleMapsOverview'

type OverviewTabProps = {
  facility: Facility
  sitePlan?: FacilitySitePlan
  status: DisplayStatus
  openState: FacilityOpenState
  onStatusChange: (status: DisplayStatus) => void
}

export function OverviewTab({ facility, sitePlan, status, openState, onStatusChange }: OverviewTabProps) {
  return (
    <>
      <section
        className={`overview-map-card${facility.coordinatePrecision === 'Approximate' || !hasUsableCoordinates(facility) ? ' has-approximate-note' : ''}`}
        data-testid="overview-map-preview"
        data-facility-id={facility.id}
        data-latitude={facility.coordinates?.[0]}
        data-longitude={facility.coordinates?.[1]}
        aria-label={`Map preview for ${facility.fullAddress}`}
      >
        <GoogleMapsOverview key={facility.id} facility={facility} />
        {facility.coordinatePrecision === 'Approximate' && <p className="overview-map-note"><Info size={14} />Approximate placement: the marker may be near, not exactly at, this facility.</p>}
        {!hasUsableCoordinates(facility) && <p className="overview-map-note"><Info size={14} />Location unverified: this facility is not pinned on the network map because its geocoder candidates conflict.</p>}
      </section>

      {isArchived(facility) ? (
        <section className="status-assignment" data-testid="archived-status">
          <div><span className="eyebrow">Facility status</span><h2>Archived</h2><p>{archivedLabel(facility)}. Restoring it, and choosing its new status, is done as a site update.</p></div>
        </section>
      ) : (
        <section className="status-assignment">
          <div><span className="eyebrow">Local planning field</span><h2>Facility status</h2><p>{facility.status === 'Active' ? 'This facility is Active by default; the status can be changed locally.' : 'No status was supplied for this facility; the status can be changed locally.'}</p></div>
          <label><span>Local status</span><select aria-label={`Set status for ${facility.fullAddress}`} value={status} onChange={(event) => onStatusChange(event.target.value as DisplayStatus)}>{assignableStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        </section>
      )}

      <section className="known-details info-section">
        <h2><Building2 />Known location details</h2>
        <dl>
          <div><dt>Street / building</dt><dd>{facility.street}</dd></div>
          <div><dt>City</dt><dd>{facility.city ?? 'Not provided'}</dd></div>
          <div><dt>State</dt><dd>{facility.state} · {facility.stateName}</dd></div>
          <div><dt>ZIP</dt><dd>{facility.zip ?? 'Not provided'}</dd></div>
          <div className="known-details-hours"><dt>Operating hours</dt><dd><OperatingHoursDisplay facilityId={facility.id} variant="overview" /><OpenStateBadge state={openState} variant="full" /></dd></div>
        </dl>
      </section>

      <SquareFootageSection facilityId={facility.id} />

      <BulkRackSection facilityId={facility.id} />

      <SitePlanFactsSection facilityId={facility.id} sitePlan={sitePlan} />

      <BuildingLeaseSection facilityId={facility.id} />

      <section className="coordinate-section info-section">
        <h2><ShieldCheck />Map placement</h2>
        <div className="coordinate-row"><span className={`precision-chip ${precisionChipClass(facility)}`}>{facility.coordinatePrecision}</span><span>{facility.coordinateSource}</span></div>
        {facility.geocodeNote && <p className="geocode-warning"><Info size={14} />{facility.geocodeNote}</p>}
      </section>
    </>
  )
}

function BulkRackSection({ facilityId }: { facilityId: string }) {
  const bulkRack = getFacilityBulkRack(facilityId)
  return (
    <section className="bulk-rack-section info-section" data-testid="bulk-rack" data-reported={bulkRack ? 'true' : 'false'}>
      <h2><Boxes />Bulk &amp; rack</h2>
      <div className="unavailable-grid">
        <span data-testid="bulk-rack-bulk"><b>Bulk</b>{formatBulk(bulkRack)}</span>
        <span data-testid="bulk-rack-rack"><b>Rack</b>{formatRack(bulkRack)}</span>
      </div>
      <p className="property-facts-note">{bulkRack ? `Warehouse-reported as of ${formatAvailableSpaceMonth(bulkRack.asOf)}.` : 'Bulk floor space (SQF) and rack capacity (pallet positions) have not been reported yet.'}</p>
    </section>
  )
}

// Total and available square footage, read through the same helpers as the Dashboard preview, Preview tour, and PDF.
function SquareFootageSection({ facilityId }: { facilityId: string }) {
  const { totalSquareFeet, available } = getFacilitySquareFootage(facilityId)
  return (
    <section className="square-footage-section info-section" data-testid="overview-square-footage">
      <h2><Warehouse />Square footage</h2>
      <div className="unavailable-grid">
        <span data-testid="overview-total"><b>Total</b>{formatTotalSquareFeet(totalSquareFeet)}</span>
        {hasReportedAvailableSpace(available) && <span data-testid="overview-available"><b>Available</b>{formatAvailableSpace(available)}</span>}
      </div>
      <p className="property-facts-note">{hasReportedAvailableSpace(available) ? `Available space warehouse-reported as of ${formatAvailableSpaceMonth(available.asOf)}.` : 'Available space has not been reported yet.'}</p>
    </section>
  )
}

// The plan's own area is left out here because the Total above supersedes it; the Site Plan tab keeps the full record.
function SitePlanFactsSection({ facilityId, sitePlan }: { facilityId: string; sitePlan?: FacilitySitePlan }) {
  const areaFact = getSitePlanAreaFact(facilityId)
  const facts = (sitePlan?.facts ?? []).filter((fact) => fact !== areaFact).slice(0, 4)
  if (facts.length === 0) return null
  return (
    <section className="property-facts-summary info-section">
      <h2><FileText />Sourced property facts</h2>
      <div className="unavailable-grid">
        {facts.map((fact) => <span key={fact.id}><b>{fact.label}</b>{formatSitePlanFact(fact)}</span>)}
      </div>
      <p className="property-facts-note">From the supplied Site Plan record. See that tab for source notes and all facts.</p>
    </section>
  )
}

function BuildingLeaseSection({ facilityId }: { facilityId: string }) {
  const details = getFacilityBuildingDetails(facilityId)
  return (
    <section className="building-lease-section info-section" data-testid="building-lease" data-reported={details ? 'true' : 'false'}>
      <h2><CalendarClock />Building &amp; lease</h2>
      <div className="unavailable-grid">
        <span data-testid="building-lease-office"><b>Office</b>{formatOfficeArea(details, 'Pending')}</span>
        <span data-testid="building-lease-ceiling"><b>Ceiling height</b>{formatCeilingHeight(details, 'Pending')}</span>
        <span data-testid="building-lease-docks"><b>Loading docks</b>{formatLoadingDocks(details, 'Pending')}</span>
        <span data-testid="building-lease-expiration"><b>Lease expiration</b>{formatLeaseExpiration(details, 'Pending')}</span>
      </div>
      <p className="property-facts-note">{details ? FACILITY_BUILDING_SOURCE_NOTE : 'Office area, ceiling height, loading docks, and lease expiration have not been provided yet.'}</p>
    </section>
  )
}
