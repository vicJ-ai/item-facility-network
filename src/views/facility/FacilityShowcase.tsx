import { memo, useMemo } from 'react'
import { Archive, ArrowLeft, ChevronRight, CircleHelp, Map as MapIcon, MapPin, ShieldCheck, X } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { FacilityDocuments } from '../../components/FacilityDocuments'
import { FacilityPhoto } from '../../components/FacilityPhoto'
import { archivedLabel, isArchived, type DisplayStatus, type Facility } from '../../data/facilities'
import { getFacilityOperatingHours } from '../../data/facility-hours'
import { getFacilityMedia } from '../../data/facility-media'
import { getFacilitySitePlan } from '../../data/facility-site-plans'
import { getFacilitySquareFootage } from '../../data/facility-space'
import { getUserProvidedFacilityPhotos } from '../../data/facility-user-photos'
import type { FacilityTab } from '../../hooks/useFacilitySelection'
import { formatFacilityNumber, getFacilityTitle, precisionChipClass, statusClass } from '../../lib/facility-display'
import { effectiveAvailability, effectiveBulkRack, type BulkRackOverride } from '../../lib/effective-facility-space'
import type { FacilityOpenState } from '../../lib/facility-open'
import type { FacilityOperations } from '../../types/operations'
import { ClientBaseTab } from './ClientBaseTab'
import { OperationsTab } from './OperationsTab'
import { OverviewTab } from './OverviewTab'
import { PhotosTab } from './PhotosTab'
import { SitePlanTab } from './SitePlanTab'

const tabs: FacilityTab[] = ['Overview', 'Site Plan', 'Photos', 'Documents', 'Operations', 'Client Base']

type FacilityShowcaseProps = {
  facility: Facility
  status: DisplayStatus
  openState: FacilityOpenState
  tab: FacilityTab
  onTabChange: (tab: FacilityTab) => void
  onStatusChange: (facility: Facility, status: DisplayStatus) => void
  onClose: () => void
  onShowAbout: () => void
  onShowDetails: () => void
  operations?: FacilityOperations
  operationsLoading: boolean
  operationsError?: string
  availableSquareFeet?: number
  bulkRackOverride?: BulkRackOverride
  availabilityUnavailable: boolean
}

/** The selected facility's panel beside the map, with its tabs. */
export const FacilityShowcase = memo(function FacilityShowcase({ facility, status, openState, tab, onTabChange, onStatusChange, onClose, onShowAbout, onShowDetails, operations, operationsLoading, operationsError, availableSquareFeet, bulkRackOverride, availabilityUnavailable }: FacilityShowcaseProps) {
  const records = useMemo(() => ({
    media: getFacilityMedia(facility.id),
    sitePlan: getFacilitySitePlan(facility.id),
    userPhotos: getUserProvidedFacilityPhotos(facility.id),
  }), [facility.id])
  const facilityNumber = formatFacilityNumber(facility)

  return (
    <aside className="detail-panel selected-showcase" data-testid="selected-showcase">
      <div className="detail-navigation">
        <button className="back-to-directory" onClick={onClose}><ArrowLeft size={17} />All facilities</button>
        <button className="icon-button" aria-label="Close facility details" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="facility-identity">
        <FacilityPhoto media={records.media} variant="detail" />
        <div><span className="eyebrow">Facility {facilityNumber}</span><strong>{getFacilityTitle(facility)}</strong><small>Logistics network location</small><small className="facility-network-type" data-testid="facility-network-type">{facility.facilityType ?? 'Type not specified'}</small></div>
        <span className={`precision-chip ${precisionChipClass(facility)}`}><ShieldCheck size={13} />{facility.coordinatePrecision}</span>
      </div>
      <div className="detail-header">
        <div className="title-line"><MapPin /><h1>Facility {facilityNumber}</h1><span className={`status-pill ${statusClass(status)}`}>{status}</span></div>
        {isArchived(facility) && <p className="archived-banner" role="note" data-testid="archived-banner"><Archive size={15} />{archivedLabel(facility)}. Its details are kept as they were when archived.</p>}
        <div className="address-line">
          <MapPin size={15} />
          <span>{facility.fullAddress}</span>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Facility details">
        {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => onTabChange(item)}>{item}</button>)}
      </div>
      <div className="detail-content">
        {tab === 'Overview' && <OverviewTab facility={facility} sitePlan={records.sitePlan} status={status} openState={openState} availableSquareFeet={availableSquareFeet} bulkRackOverride={bulkRackOverride} availabilityUnavailable={availabilityUnavailable} onStatusChange={(value) => onStatusChange(facility, value)} />}
        {tab === 'Site Plan' && (records.sitePlan
          ? <SitePlanTab facility={facility} sitePlan={records.sitePlan} />
          : <EmptyState icon={MapIcon} title="Site plan not provided" body="No site plan was supplied for this facility." />)}
        {tab === 'Photos' && <PhotosTab facility={facility} media={records.media} userPhotos={records.userPhotos} />}
        {tab === 'Documents' && <FacilityDocuments key={facility.id} facility={facility} facilityTitle={getFacilityTitle(facility)} operatingHours={getFacilityOperatingHours(facility.id)} media={records.media} operations={operations} operationsLoading={operationsLoading} totalSquareFeet={getFacilitySquareFootage(facility.id).totalSquareFeet} availableSpace={effectiveAvailability(facility.id, availableSquareFeet)} bulkRack={effectiveBulkRack(facility.id, bulkRackOverride)} sitePlan={records.sitePlan} userPhotos={records.userPhotos} />}
        {tab === 'Operations' && <OperationsTab facility={facility} operations={operations} loading={operationsLoading} error={operationsError} />}
        {tab === 'Client Base' && <ClientBaseTab facility={facility} />}
      </div>
      <div className="detail-footer"><button className="secondary-button" onClick={onShowAbout}><CircleHelp size={16} />About data</button><button className="primary-button" onClick={onShowDetails}>View Full Details <ChevronRight size={17} /></button></div>
    </aside>
  )
})
