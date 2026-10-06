import { memo, useMemo } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import { DayNightLayer } from '../../components/DayNightLayer'
import { RegionHighlightLayer } from '../../components/RegionHighlightLayer'
import type { DisplayStatus, Facility } from '../../data/facilities'
import type { RegionBoundary } from '../../data/region-boundaries'
import type { CameraMode } from '../../hooks/useFacilitySelection'
import type { MappableFacility } from '../../lib/facility-display'
import type { FacilityOpenState } from '../../lib/facility-open'
import type { BulkRackOverride } from '../../lib/effective-facility-space'
import type { TourCameraApi } from '../../lib/preview-tour/camera-api'
import type { AppView, MobileView } from '../types'
import { FacilityMarker } from './FacilityMarker'
import { DashboardOverview, LeafletTourCamera, MapFocus, MapLifecycle, MapSplitResize, type ViewportListener } from './leaflet-controllers'
import { NETWORK_CENTER, NETWORK_ZOOM } from './map-view'

export type MapLayer = 'street' | 'satellite'

const TILE_LAYERS: Record<MapLayer, { attribution: string; url: string }> = {
  street: {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, TomTom, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors, and the GIS User Community',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  },
  satellite: {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
}

type NetworkMapProps = {
  view: AppView
  mobileView: MobileView
  layer: MapLayer
  time: number
  nightShading: boolean
  /** The globe covers the map on the Dashboard; the map stays mounted underneath. */
  globeActive: boolean
  pins: readonly MappableFacility[]
  /** Ids of the facilities in focus; pins outside it are faded. `null` when nothing is in focus. */
  focusIds: ReadonlySet<string> | null
  /** Facilities ringed in brand purple for the active Dashboard region. */
  highlighted: readonly MappableFacility[]
  highlightRegionId: string | null
  highlightBoundary: RegionBoundary | null
  selected: Facility | null
  focusSignal: number
  recenterSignal: number
  cameraMode: CameraMode
  directoryWidth: number
  overviewSignal: number
  overviewTargets: readonly Facility[]
  regionActive: boolean
  regionBoundary: RegionBoundary | null
  regionPanelOpen: boolean
  tourCameraActive: boolean
  onTourApi: (api: TourCameraApi | null) => void
  resolveStatus: (facility: Facility) => DisplayStatus
  openStates: Record<string, FacilityOpenState>
  availability: Record<string, number>
  bulkRack: Record<string, BulkRackOverride>
  onChoose: (facility: Facility) => void
  onViewChange: ViewportListener
}

/** The flat Leaflet map: tiles, night shading, region highlight, facility pins, and camera control. */
export const NetworkMap = memo(function NetworkMap(props: NetworkMapProps) {
  const { view, mobileView, layer, globeActive, pins, focusIds, selected, onViewChange } = props
  const highlightRenderer = useMemo(() => L.svg({ pane: 'overlayPane' }), [])
  const dashboard = view === 'dashboard'

  return (
    <MapContainer center={NETWORK_CENTER} zoom={NETWORK_ZOOM} minZoom={3} maxZoom={18} zoomControl={false} scrollWheelZoom className="map" preferCanvas>
      <TileLayer key={layer} {...TILE_LAYERS[layer]} />
      <DayNightLayer time={props.time} visible={props.nightShading && !globeActive} />
      <ZoomControl position="topright" />
      <MapFocus selected={selected} focusSignal={props.focusSignal} recenterSignal={props.recenterSignal} cameraMode={props.cameraMode} visibilityKey={`${view}:${mobileView}`} />
      <DashboardOverview
        active={dashboard && !globeActive}
        signal={props.overviewSignal}
        targets={props.overviewTargets}
        regionActive={props.regionActive}
        regionBoundary={props.regionBoundary}
        panelOpen={props.regionPanelOpen}
        onViewChange={onViewChange}
      />
      <RegionHighlightLayer regionId={props.highlightRegionId} boundary={props.highlightBoundary} />
      <LeafletTourCamera active={props.tourCameraActive} onTourApi={props.onTourApi} />
      <MapLifecycle resizeKey={`${view}:${mobileView}:${globeActive}`} onViewChange={onViewChange} />
      {view === 'locations' && <MapSplitResize resizeKey={props.directoryWidth} selected={selected} preserveSiteFocus={props.cameraMode === 'site'} onViewChange={onViewChange} />}
      {props.highlighted.flatMap((facility) => [
        <CircleMarker
          key={`${facility.id}-highlight-outer`}
          {...{ className: 'dashboard-facility-highlight dashboard-facility-highlight-outer', renderer: highlightRenderer }}
          center={facility.coordinates}
          radius={38}
          interactive={false}
          pathOptions={{ fill: true, fillColor: '#6b46c1', fillOpacity: 0.08, interactive: false, stroke: false }}
        />,
        <CircleMarker
          key={`${facility.id}-highlight-inner`}
          {...{ className: 'dashboard-facility-highlight dashboard-facility-highlight-inner', renderer: highlightRenderer }}
          center={facility.coordinates}
          radius={22}
          interactive={false}
          pathOptions={{ fill: true, fillColor: '#6b46c1', fillOpacity: 0.18, interactive: false, stroke: false }}
        />,
      ])}
      {pins.map((facility) => (
        <FacilityMarker
          key={`${view}-${facility.id}`}
          facility={facility}
          view={view}
          status={props.resolveStatus(facility)}
          selected={facility.id === selected?.id}
          openState={props.openStates[facility.id]}
          availableSquareFeet={props.availability[facility.id]}
          bulkRackOverride={props.bulkRack[facility.id]}
          outOfRegion={dashboard && focusIds !== null && !focusIds.has(facility.id)}
          onChoose={props.onChoose}
        />
      ))}
    </MapContainer>
  )
})
