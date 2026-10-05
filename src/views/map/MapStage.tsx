import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import { Building2, Earth, Info, Layers3, LocateFixed, Map as MapIcon, MapPin, Search } from 'lucide-react'
import { DayNightControl } from '../../components/DayNightControl'
import { FacilityPinPreview } from '../../components/FacilityPinPreview'
import { GlobeQualityControl } from '../../components/GlobeQualityControl'
import type { DisplayStatus, Facility } from '../../data/facilities'
import type { DashboardRegionsState } from '../../hooks/useDashboardRegions'
import { useDayNightPreferences } from '../../hooks/useDayNightPreferences'
import type { CameraMode } from '../../hooks/useFacilitySelection'
import type { GlobeState } from '../../hooks/useGlobe'
import type { PreviewTourState } from '../../hooks/usePreviewTour'
import { assignableStatuses, statusColor, type MappableFacility } from '../../lib/facility-display'
import type { FacilityOpenState } from '../../lib/facility-open'
import { mappableNetworkFacilities } from '../../lib/region-facilities'
import { DEBUG_PERF } from '../../lib/url-params'
import { DashboardMapControls } from '../dashboard/DashboardMapControls'
import { loadDashboardGlobe, warmGlobe } from '../deferred'
import type { AppView, MobileView } from '../types'
import { writeViewportAttributes } from './map-view'
import { NetworkMap, type MapLayer } from './NetworkMap'
import { dashboardPinLabel, pinMarkup } from './pins'

const DashboardGlobe = lazy(loadDashboardGlobe)
const NO_FACILITIES: readonly MappableFacility[] = []

type MapStageProps = {
  view: AppView
  mobileView: MobileView
  onStageElement: (element: HTMLElement | null) => void
  selected: Facility | null
  focusSignal: number
  cameraMode: CameraMode
  onReleaseCamera: () => void
  directoryWidth: number
  filteredCount: number
  mappableFiltered: readonly MappableFacility[]
  onClearFilters: () => void
  resolveStatus: (facility: Facility) => DisplayStatus
  statusCounts: { total: number; active: number; coming: number }
  openStates: Record<string, FacilityOpenState>
  openCount: number
  withHoursCount: number
  mapTime: number
  liveTime: boolean
  onTimeChange: (time: number) => void
  onReturnToNow: () => void
  regions: DashboardRegionsState
  globe: GlobeState
  preview: PreviewTourState
  /** Opens a facility chosen from a list. */
  onChooseFacility: (facility: Facility) => void
  /** Opens a facility chosen from a pin, which also ends the Preview tour. */
  onChooseFromMap: (facility: Facility) => void
  onGlobeUnavailable: () => void
  onShowAbout: () => void
}

/** The map side of the screen: the flat map or globe, and every control drawn over it. */
export function MapStage(props: MapStageProps) {
  const { view, regions, globe, preview, openStates, resolveStatus, mapTime } = props
  const dayNight = useDayNightPreferences()
  const [mapLayer, setMapLayer] = useState<MapLayer>('street')
  // The globe opens on satellite imagery so it reads as the planet; its choice is independent of the flat map.
  const [globeLayer, setGlobeLayer] = useState<MapLayer>('satellite')
  const [recenterSignal, setRecenterSignal] = useState(0)
  const stageRef = useRef<HTMLElement | null>(null)

  const dashboard = view === 'dashboard'
  const previewing = preview.previewing
  const { activeRegion } = regions

  const { onStageElement } = props
  const setStage = useCallback((element: HTMLElement | null) => {
    stageRef.current = element
    onStageElement(element)
  }, [onStageElement])
  useLayoutEffect(() => {
    if (stageRef.current) writeViewportAttributes(stageRef.current)
  }, [])
  const reportViewport = useCallback((map: L.Map) => {
    if (stageRef.current) writeViewportAttributes(stageRef.current, map)
  }, [])

  // During the tour its regions are in focus; otherwise the active Dashboard region is.
  const focusIds = dashboard ? (previewing ? (preview.focus ? preview.targetIds : null) : (activeRegion ? regions.mappableIds : null)) : null
  const globePinMarkup = useCallback((facility: MappableFacility) => pinMarkup(facility, resolveStatus(facility), false), [resolveStatus])
  const globeIsOpen = useCallback((facility: MappableFacility) => openStates[facility.id].isOpen, [openStates])
  const renderGlobePreview = useCallback((facility: MappableFacility) => <FacilityPinPreview facility={facility} openState={openStates[facility.id]} />, [openStates])
  const tourRegionKey = preview.focus?.join(',') ?? null

  const showOverview = () => {
    props.onReleaseCamera()
    if (dashboard) regions.requestOverview()
    else setRecenterSignal((value) => value + 1)
  }

  const toggleProjection = () => {
    globe.toggleProjection()
    regions.requestOverview()
  }

  return (
    <section
      ref={setStage}
      className={`map-stage${view === 'locations' && props.mobileView === 'list' ? ' mobile-hidden' : ''}${globe.active ? ' is-globe' : ''}`}
      aria-label="Facility network map"
      data-view={view}
      data-projection={dashboard ? (globe.active ? 'globe' : 'map') : undefined}
    >
      <NetworkMap
        view={view}
        mobileView={props.mobileView}
        layer={mapLayer}
        time={mapTime}
        nightShading={dayNight.shading}
        globeActive={globe.active}
        pins={globe.active ? NO_FACILITIES : dashboard ? mappableNetworkFacilities : props.mappableFiltered}
        focusIds={focusIds}
        highlighted={dashboard && activeRegion ? regions.mappableFacilities : NO_FACILITIES}
        highlightRegionId={dashboard && !globe.active ? (previewing ? tourRegionKey : activeRegion?.id ?? null) : null}
        highlightBoundary={previewing ? preview.boundary : regions.boundary}
        selected={props.selected}
        focusSignal={props.focusSignal}
        recenterSignal={recenterSignal}
        cameraMode={props.cameraMode}
        directoryWidth={props.directoryWidth}
        overviewSignal={regions.overviewSignal}
        overviewTargets={regions.facilities}
        regionActive={activeRegion !== null}
        regionBoundary={regions.boundary}
        regionPanelOpen={regions.panelOpen}
        tourCameraActive={previewing && globe.unavailable}
        onTourApi={preview.setTourApi}
        resolveStatus={resolveStatus}
        openStates={openStates}
        onChoose={props.onChooseFromMap}
        onViewChange={reportViewport}
      />

      {(globe.active || (globe.mounted && !globe.unavailable)) && (
        <Suspense fallback={globe.active ? <div className="globe-loading" role="status"><Earth size={22} />Loading globe…</div> : null}>
          <DashboardGlobe
            active={globe.active}
            facilities={mappableNetworkFacilities}
            targets={previewing ? preview.targets : regions.mappableFacilities}
            regionBoundary={previewing ? preview.boundary : regions.boundary}
            regionOutline={!previewing}
            regionKey={previewing ? tourRegionKey : null}
            quality={globe.quality}
            detectedTier={globe.detectedTier}
            onEffectiveTier={globe.setEffectiveTier}
            debugPerf={DEBUG_PERF}
            time={mapTime}
            shading={dayNight.shading}
            layer={globeLayer}
            flySignal={regions.overviewSignal}
            regionActive={previewing ? preview.focus !== null : activeRegion !== null}
            panelOpen={regions.panelOpen}
            pinMarkup={globePinMarkup}
            pinLabel={dashboardPinLabel}
            isOpen={globeIsOpen}
            renderPreview={renderGlobePreview}
            onChoose={props.onChooseFromMap}
            onUnavailable={props.onGlobeUnavailable}
            onTourApi={preview.setTourApi}
          />
        </Suspense>
      )}

      {dashboard && (
        <DashboardMapControls
          previewToggleRef={preview.toggleRef}
          onStartPreview={preview.start}
          regionToggleRef={regions.toggleRef}
          activeRegion={activeRegion}
          expandedRegionId={regions.expandedRegionId}
          panelOpen={regions.panelOpen}
          hasHighlightedFacilities={regions.mappableFacilities.length > 0}
          onTogglePanel={regions.togglePanel}
          onClosePanel={regions.closePanel}
          onClearRegion={regions.clearRegion}
          onSelectRegion={regions.selectRegion}
          onChooseFacility={props.onChooseFacility}
        />
      )}

      {view === 'locations' && <div className="overview-panel">
        <div className="panel-title"><strong>Facility Network</strong><button aria-label="About this prototype" onClick={props.onShowAbout}><Info size={16} /></button></div>
        <div className="overview-metrics">
          <div><Building2 /><b>{props.statusCounts.total}</b><span>Facilities</span></div>
          <div><MapPin /><b>{props.statusCounts.active}</b><span>Active</span></div>
          <div><MapPin /><b>{props.statusCounts.coming}</b><span>Coming Soon</span></div>
        </div>
      </div>}

      <div className="map-tools" aria-label="Map layers">
        <span><Layers3 size={16} />Layers</span>
        <div className="layer-switch" role="group" aria-label="Map layer">
          {(['street', 'satellite'] as const).map((option) => {
            const current = globe.active ? globeLayer : mapLayer
            return (
              <button key={option} className={current === option ? 'active' : ''} aria-pressed={current === option} onClick={() => (globe.active ? setGlobeLayer : setMapLayer)(option)}>
                {option === 'street' ? 'Street' : 'Satellite'}
              </button>
            )
          })}
        </div>
      </div>
      {dashboard && !globe.unavailable && (
        <button className="projection-control" type="button" aria-label={globe.active ? 'Show flat map' : 'Show globe'} title={globe.active ? 'Show flat map' : 'Show 3D globe'} onClick={toggleProjection} onPointerEnter={globe.active ? undefined : warmGlobe} onFocus={globe.active ? undefined : warmGlobe}>
          {globe.active ? <MapIcon size={18} /> : <Earth size={18} />}
        </button>
      )}
      {globe.active && <GlobeQualityControl choice={globe.quality} effectiveTier={globe.effectiveTier} onChange={globe.chooseQuality} />}
      <button className="recenter-control" aria-label="Recenter map" title={activeRegion ? `View ${activeRegion.label} facilities` : 'View all facilities'} onClick={showOverview}><LocateFixed size={18} /></button>
      {view === 'locations' && <div className="map-legend" aria-label="Local facility status legend">
        {assignableStatuses.map((item) => <span key={item}><i style={{ background: statusColor[item] }} />{item}</span>)}
      </div>}
      <DayNightControl
        time={mapTime}
        live={props.liveTime}
        shading={dayNight.shading}
        expanded={dayNight.expanded}
        timeZone={dayNight.timeZone}
        openCount={props.openCount}
        total={props.withHoursCount}
        onShadingChange={dayNight.setShading}
        onExpandedChange={dayNight.setExpanded}
        onTimeZoneChange={dayNight.setTimeZone}
        onTimeChange={props.onTimeChange}
        onReturnToNow={props.onReturnToNow}
      />
      {view === 'locations' && props.filteredCount === 0 && <div className="no-map-results"><Search size={20} /><strong>No facilities found</strong><button onClick={props.onClearFilters}>Clear filters</button></div>}
      {view === 'locations' && props.filteredCount > 0 && props.mappableFiltered.length === 0 && <div className="no-map-results"><MapPin size={20} /><strong>Map location unavailable</strong><span>The matching facility has no verified coordinates.</span></div>}
    </section>
  )
}
