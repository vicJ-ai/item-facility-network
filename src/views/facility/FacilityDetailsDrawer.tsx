import { Camera, ExternalLink, Info, Warehouse, X } from 'lucide-react'
import { FacilityPhoto } from '../../components/FacilityPhoto'
import { ModalBackdrop } from '../../components/ModalBackdrop'
import { OpenStateBadge } from '../../components/OpenStateBadge'
import { OperatingHoursDisplay } from '../../components/OperatingHoursDisplay'
import type { DisplayStatus, Facility } from '../../data/facilities'
import { getFacilityMedia } from '../../data/facility-media'
import { getFacilitySitePlan } from '../../data/facility-site-plans'
import { getUserProvidedFacilityPhotos } from '../../data/facility-user-photos'
import { formatFacilityNumber, getFacilityTitle, hasUsableCoordinates, mediaCategory } from '../../lib/facility-display'
import { googleMapsUrl, streetViewUrl } from '../../lib/facility-links'
import type { FacilityOpenState } from '../../lib/facility-open'

type FacilityDetailsDrawerProps = { facility: Facility; status: DisplayStatus; openState: FacilityOpenState; onClose: () => void }

/** The "View Full Details" record for the selected facility. */
export function FacilityDetailsDrawer({ facility, status, openState, onClose }: FacilityDetailsDrawerProps) {
  const media = getFacilityMedia(facility.id)
  const sitePlan = getFacilitySitePlan(facility.id)
  const userPhotos = getUserProvidedFacilityPhotos(facility.id)
  const streetView = streetViewUrl(facility)

  return (
    <ModalBackdrop onClose={onClose}>
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div className="modal-head"><div><span className="eyebrow">Facility record {formatFacilityNumber(facility)}</span><h2 id="details-title">{getFacilityTitle(facility)}</h2></div><button className="icon-button" aria-label="Close details" onClick={onClose}><X /></button></div>
        <div className="drawer-content">
          {media && <FacilityPhoto media={media} variant="drawer" />}
          <div className="drawer-banner"><Warehouse /><div><strong>{facility.fullAddress}</strong><span>User-provided facility address</span></div></div>
          <div className="drawer-map-actions">
            <a className="secondary-button" href={googleMapsUrl(facility)} target="_blank" rel="noopener noreferrer">Open in Maps <ExternalLink size={14} /></a>
            {streetView ? (
              <a className="secondary-button" href={streetView} target="_blank" rel="noopener noreferrer" title={facility.coordinatePrecision === 'Approximate' ? 'Street-level imagery may be near, not exactly at, this facility.' : undefined}><Camera size={14} />Street View</a>
            ) : (
              <span className="secondary-button is-disabled" aria-disabled="true"><Camera size={14} />Street View unavailable</span>
            )}
          </div>
          <ApproximateStreetViewNote facility={facility} />
          <dl className="detail-list">
            <div><dt>Status</dt><dd>{status}</dd></div>
            <div><dt>Street / building</dt><dd>{facility.street}</dd></div>
            <div><dt>City</dt><dd>{facility.city ?? 'Not provided'}</dd></div>
            <div><dt>State</dt><dd>{facility.state} · {facility.stateName}</dd></div>
            <div><dt>ZIP</dt><dd>{facility.zip ?? 'Not provided'}</dd></div>
            <div className="detail-list-hours"><dt>Operating hours</dt><dd><OperatingHoursDisplay facilityId={facility.id} variant="drawer" /><OpenStateBadge state={openState} variant="full" /></dd></div>
            <div><dt>Coordinates</dt><dd>{facility.coordinates ? facility.coordinates.map((value) => value.toFixed(6)).join(', ') : 'Unavailable'}</dd></div>
            <div><dt>Coordinate precision</dt><dd>{facility.coordinatePrecision}</dd></div>
            <div><dt>Coordinate source</dt><dd>{facility.coordinateSource}</dd></div>
          </dl>
          <section className="geocode-detail"><strong>Geocoder match</strong><p>{facility.geocoderMatch}</p>{facility.geocodeNote && <p className="geocode-warning"><Info size={15} />{facility.geocodeNote}</p>}</section>
          <p className="source-note"><Info size={15} />{sitePlan ? 'Supplied site-plan facts are available in the Site Plan tab; they are not current availability claims. ' : 'No property or site-plan facts were supplied. '}{userPhotos ? `${userPhotos.photos.length} user-provided gallery photo${userPhotos.photos.length === 1 ? ' is' : 's are'} documented in the Photos tab. ` : ''}{media ? `${mediaCategory(media)} remains separately documented in the Photos tab.` : 'No existing media record is available for this facility.'}</p>
        </div>
      </section>
    </ModalBackdrop>
  )
}

function ApproximateStreetViewNote({ facility }: { facility: Facility }) {
  if (!hasUsableCoordinates(facility)) return <p className="street-view-caveat"><Info size={13} />Street View is unavailable because this facility does not have verified map coordinates.</p>
  if (facility.coordinatePrecision !== 'Approximate') return null
  return <p className="street-view-caveat"><Info size={13} />Street-level imagery may be near, not exactly at, this facility.</p>
}
