import { memo, useMemo } from 'react'
import type L from 'leaflet'
import { Marker, Tooltip } from 'react-leaflet'
import { FacilityPinPreview } from '../../components/FacilityPinPreview'
import type { DisplayStatus, Facility } from '../../data/facilities'
import type { MappableFacility } from '../../lib/facility-display'
import type { FacilityOpenState } from '../../lib/facility-open'
import type { AppView } from '../types'
import { dashboardPinLabel, dashboardPreviewDirection, pinIcon } from './pins'

type FacilityMarkerProps = {
  facility: MappableFacility
  view: AppView
  status: DisplayStatus
  selected: boolean
  openState: FacilityOpenState
  /** Faded behind the active region's pins, which stay on top. */
  outOfRegion: boolean
  onChoose: (facility: Facility) => void
}

/** One facility pin on the flat map: a hover preview on the Dashboard, a permanent label in Facilities. */
export const FacilityMarker = memo(function FacilityMarker({ facility, view, status, selected, openState, outOfRegion, onChoose }: FacilityMarkerProps) {
  // A new handler map makes react-leaflet unbind and rebind the marker's listeners, so it is kept stable.
  const eventHandlers = useMemo<L.LeafletEventHandlerFnMap>(() => ({
    add: (event) => (event.target as L.Marker).getElement()?.setAttribute('aria-label', view === 'dashboard' ? dashboardPinLabel(facility) : `Show ${facility.fullAddress} on map`),
    click: () => onChoose(facility),
    keypress: (event) => {
      const keyboardEvent = event.originalEvent as KeyboardEvent
      if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return
      keyboardEvent.preventDefault()
      onChoose(facility)
    },
  }), [facility, onChoose, view])

  return (
    <Marker
      position={facility.coordinates}
      icon={pinIcon(facility, status, selected, openState.isOpen, outOfRegion)}
      zIndexOffset={outOfRegion ? -1000 : 0}
      eventHandlers={eventHandlers}
      title={view === 'locations' ? facility.fullAddress : undefined}
    >
      {view === 'dashboard' ? (
        <Tooltip direction={dashboardPreviewDirection(facility)} offset={[0, -18]} className="dashboard-pin-preview" opacity={1} interactive={false}>
          <FacilityPinPreview facility={facility} openState={openState} />
        </Tooltip>
      ) : (
        <Tooltip permanent direction="right" className="pin-label" opacity={1}>#{facility.number} {facility.city ?? 'TN'}{facility.coordinatePrecision === 'Approximate' ? ' · approx.' : ''}</Tooltip>
      )}
    </Marker>
  )
})
