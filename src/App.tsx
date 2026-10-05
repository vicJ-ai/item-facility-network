import { lazy, Suspense, useCallback, useRef, useState, type CSSProperties } from 'react'
import { Check, ClipboardList, Map as MapIcon } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { OpenStateBadge } from './components/OpenStateBadge'
import type { DisplayStatus, Facility } from './data/facilities'
import { useDashboardRegions } from './hooks/useDashboardRegions'
import { useDirectoryResize } from './hooks/useDirectoryResize'
import { useEscapeKey } from './hooks/useEscapeKey'
import { useFacilityFilters } from './hooks/useFacilityFilters'
import { useFacilitySelection } from './hooks/useFacilitySelection'
import { useGlobe } from './hooks/useGlobe'
import { useLatestCallback } from './hooks/useLatestCallback'
import { useFacilityOpenStates, useMapClock } from './hooks/useMapClock'
import { useNotice } from './hooks/useNotice'
import { usePreviewTour } from './hooks/usePreviewTour'
import { useStatusOverrides } from './hooks/useStatusOverrides'
import { useTheme } from './hooks/useTheme'
import { QUALITY_TIERS } from './lib/globe-quality'
import { tourStopDetails } from './lib/preview-tour/stop-details'
import { DEBUG_PERF, PREVIEW_MAX_FPS, PREVIEW_SPEED } from './lib/url-params'
import { AboutModal } from './views/AboutModal'
import { AppHeader } from './views/AppHeader'
import { loadPreviewTour, warmGlobe } from './views/deferred'
import { FacilityDirectory } from './views/directory/FacilityDirectory'
import { FacilityDetailsDrawer } from './views/facility/FacilityDetailsDrawer'
import { FacilityShowcase } from './views/facility/FacilityShowcase'
import { MapStage } from './views/map/MapStage'
import type { AppView, MobileView } from './views/types'

const PreviewTour = lazy(loadPreviewTour)
const PerfHud = lazy(() => import('./components/PerfHud'))
// webgl-memory must wrap WebGL before the globe creates its context, so it loads at startup here.
if (DEBUG_PERF) void import('webgl-memory')

function App() {
  const { theme, toggleTheme } = useTheme()
  const [notice, setNotice] = useNotice()
  const [appView, setAppView] = useState<AppView>('locations')
  const [mobileView, setMobileView] = useState<MobileView>('list')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mapStageElement, setMapStageElement] = useState<HTMLElement | null>(null)
  const mainRef = useRef<HTMLElement>(null)

  const statuses = useStatusOverrides()
  const filters = useFacilityFilters(statuses.resolveStatus)
  const selection = useFacilitySelection()
  const directory = useDirectoryResize(mainRef)
  const regions = useDashboardRegions()
  const preview = usePreviewTour(appView === 'dashboard')
  const globe = useGlobe({ dashboardShown: appView === 'dashboard', previewing: preview.previewing })
  const clock = useMapClock()
  const { openStates, openCount, withHoursCount } = useFacilityOpenStates(clock.mapTime)

  const { selected, showcaseOpen } = selection
  const selectedStatus = selected ? statuses.resolveStatus(selected) : 'Active'

  const chooseFacility = useLatestCallback((facility: Facility) => {
    setAppView('locations')
    selection.choose(facility)
    setMobileView('list')
  })

  // A pin chosen during the tour ends it and opens the facility, as it would outside the tour.
  const chooseFromMap = useLatestCallback((facility: Facility) => {
    if (preview.previewing) preview.cancel()
    chooseFacility(facility)
  })

  const assignStatus = useLatestCallback((facility: Facility, status: DisplayStatus) => {
    statuses.assignStatus(facility, status)
    setNotice(`Local status set to ${status}.`)
  })

  const navigate = useLatestCallback((view: AppView | null, label: string) => {
    setMobileNavOpen(false)
    if (view === 'dashboard') {
      setDetailsOpen(false)
      selection.clearSelection()
      regions.reset()
      setAppView('dashboard')
    } else if (view === 'locations') {
      setAppView('locations')
    } else {
      setNotice(`${label} is outside this reference prototype.`)
    }
  })

  const handleGlobeUnavailable = useLatestCallback(() => {
    globe.markUnavailable()
    setNotice('The 3D globe is unavailable in this browser, so the flat map is shown.')
  })

  const toggleMobileNav = useCallback(() => setMobileNavOpen((current) => !current), [])
  const showAbout = useCallback(() => setAboutOpen(true), [])
  const showDetails = useCallback(() => setDetailsOpen(true), [])

  useEscapeKey(() => {
    setDetailsOpen(false)
    setAboutOpen(false)
    setMobileNavOpen(false)
    regions.dismissPanel()
    if (showcaseOpen) selection.closeShowcase()
  })

  return (
    <div className={`app-shell${preview.previewing ? ' is-previewing' : ''}`}>
      <AppHeader
        appView={appView}
        inert={preview.previewing}
        theme={theme}
        onToggleTheme={toggleTheme}
        search={filters.search}
        onSearchChange={filters.setSearch}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={toggleMobileNav}
        onWarmDashboard={globe.projection === 'globe' && !globe.unavailable ? warmGlobe : undefined}
        onNavigate={navigate}
        onNotice={setNotice}
      />

      <main ref={mainRef} className={`dashboard${appView === 'dashboard' ? ' dashboard-map-only' : ''}${directory.isResizing ? ' is-resizing' : ''}`} style={{ '--directory-width': `${directory.width}px` } as CSSProperties}>
        {appView === 'locations' && (
          <>
            <div className="mobile-explorer-switch" role="group" aria-label="Explorer view">
              <button aria-pressed={mobileView === 'list'} className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}><ClipboardList size={16} />List</button>
              <button aria-pressed={mobileView === 'map'} className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}><MapIcon size={16} />Map</button>
            </div>

            <section className={`explorer-pane ${mobileView === 'map' ? 'mobile-hidden' : ''}`} aria-label={showcaseOpen && selected ? `${selected.fullAddress} details` : 'Facility directory'}>
              {showcaseOpen && selected ? (
                <FacilityShowcase
                  facility={selected}
                  status={selectedStatus}
                  openState={openStates[selected.id]}
                  tab={selection.tab}
                  onTabChange={selection.setTab}
                  onStatusChange={assignStatus}
                  onClose={selection.closeShowcase}
                  onShowAbout={showAbout}
                  onShowDetails={showDetails}
                />
              ) : (
                <FacilityDirectory
                  facilities={filters.filtered}
                  search={filters.search}
                  onSearchChange={filters.setSearch}
                  statusFilter={filters.statusFilter}
                  onStatusFilterChange={filters.setStatusFilter}
                  typeFilter={filters.typeFilter}
                  onTypeFilterChange={filters.setTypeFilter}
                  selectedId={selected?.id ?? null}
                  resolveStatus={statuses.resolveStatus}
                  openStates={openStates}
                  onChoose={chooseFacility}
                />
              )}
            </section>

            <div
              className="explorer-resizer"
              role="separator"
              aria-label="Resize facility directory and map"
              aria-orientation="vertical"
              tabIndex={0}
              title="Resize facility directory"
              {...directory.separatorProps}
            ><span aria-hidden="true" /></div>
          </>
        )}

        <MapStage
          view={appView}
          mobileView={mobileView}
          onStageElement={setMapStageElement}
          selected={selected}
          focusSignal={selection.focusSignal}
          cameraMode={selection.cameraMode}
          onReleaseCamera={selection.releaseCamera}
          directoryWidth={directory.width}
          filteredCount={filters.filtered.length}
          mappableFiltered={filters.mappable}
          onClearFilters={filters.clearFilters}
          resolveStatus={statuses.resolveStatus}
          statusCounts={statuses.counts}
          openStates={openStates}
          openCount={openCount}
          withHoursCount={withHoursCount}
          mapTime={clock.mapTime}
          liveTime={clock.live}
          onTimeChange={clock.setCustomTime}
          onReturnToNow={clock.returnToNow}
          regions={regions}
          globe={globe}
          preview={preview}
          onChooseFacility={chooseFacility}
          onChooseFromMap={chooseFromMap}
          onGlobeUnavailable={handleGlobeUnavailable}
          onShowAbout={showAbout}
        />
      </main>

      {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}

      {preview.previewing && (
        <Suspense fallback={null}>
          <PreviewTour
            api={preview.tourApi}
            chapters={preview.chapters}
            interactionTarget={mapStageElement}
            localTime={(facility) => openStates[facility.id].localTime || 'not provided'}
            renderOpenState={(facility) => <OpenStateBadge state={openStates[facility.id]} variant="compact" />}
            stopDetails={tourStopDetails}
            onFocusChange={preview.setFocus}
            onExit={preview.exit}
            speed={PREVIEW_SPEED}
            maxFps={PREVIEW_MAX_FPS ?? QUALITY_TIERS[globe.effectiveTier].tourMaxFps}
          />
        </Suspense>
      )}

      {DEBUG_PERF && (
        <Suspense fallback={null}>
          <PerfHud tier={globe.active ? globe.effectiveTier : null} choice={globe.quality} />
        </Suspense>
      )}

      {detailsOpen && selected && <FacilityDetailsDrawer facility={selected} status={selectedStatus} openState={openStates[selected.id]} onClose={() => setDetailsOpen(false)} />}

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}

export default App
