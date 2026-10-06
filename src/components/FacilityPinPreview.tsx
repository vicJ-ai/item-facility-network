import type { Facility } from '../data/facilities'
import { getFacilityMedia } from '../data/facility-media'
import { formatFacilityNumber, getFacilityTitle } from '../lib/facility-display'
import type { FacilityOpenState } from '../lib/facility-open'
import type { BulkRackOverride } from '../lib/effective-facility-space'
import { FacilityPhoto } from './FacilityPhoto'
import { OpenStateBadge } from './OpenStateBadge'
import { OperatingHoursDisplay } from './OperatingHoursDisplay'
import { SquareFootagePreview } from './SquareFootagePreview'

/** The hover card for a Dashboard pin, shared by the flat map and the globe. */
export function FacilityPinPreview({ facility, openState, availableSquareFeet, bulkRackOverride }: { facility: Facility; openState: FacilityOpenState; availableSquareFeet?: number; bulkRackOverride?: BulkRackOverride }) {
  return (
    <div className="dashboard-pin-preview-content" data-testid="dashboard-pin-preview" data-facility-id={facility.id}>
      <FacilityPhoto media={getFacilityMedia(facility.id)} variant="thumbnail" />
      <span>
        <small>Facility {formatFacilityNumber(facility)}</small>
        <strong>{getFacilityTitle(facility)}</strong>
        <span className="dashboard-pin-preview-address">{facility.fullAddress}</span>
        <OperatingHoursDisplay facilityId={facility.id} variant="preview" />
        <OpenStateBadge state={openState} variant="full" />
        <SquareFootagePreview facilityId={facility.id} availableSquareFeet={availableSquareFeet} bulkRackOverride={bulkRackOverride} />
      </span>
    </div>
  )
}
