import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowLeft, Bell, Box, Building2, Check, ChevronRight, CircleHelp, ClipboardList,
  ExternalLink, FileQuestion, FileText, Grid2X2, Info, Layers3, LocateFixed,
  Map as MapIcon, MapPin, Menu, Moon, PackageSearch, Search, ShieldCheck,
  SlidersHorizontal, Sun, Truck, Warehouse, X,
} from 'lucide-react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { FacilityPhoto } from './components/FacilityPhoto'
import {
  facilities,
  searchableFacilityText,
  type DisplayStatus,
  type Facility,
} from './data/facilities'
import { getFacilityMedia, type FacilityMedia } from './data/facility-media'

type Tab = 'Overview' | 'Site Plan' | 'Photos' | 'Documents' | 'Operations'
type Theme = 'light' | 'dark'
type StatusFilter = 'All' | DisplayStatus
type StatusAssignments = Record<string, DisplayStatus>

// A new key intentionally replaces earlier local assignments with the requested Active baseline.
const STATUS_STORAGE_KEY = 'facility-status-assignments-v2'
const DIRECTORY_WIDTH_STORAGE_KEY = 'facility-directory-width-v1'
const SITE_FOCUS_ZOOM = 16
const DEFAULT_DIRECTORY_RATIO = 0.36
const MIN_DIRECTORY_RATIO = 0.25
const MAX_DIRECTORY_RATIO = 0.55
const MIN_DIRECTORY_WIDTH = 420
const MAX_DIRECTORY_WIDTH = 760
const MIN_MAP_WIDTH = 360
const tabs: Tab[] = ['Overview', 'Site Plan', 'Photos', 'Documents', 'Operations']
const assignableStatuses: DisplayStatus[] = ['Unassigned', 'Active', 'Coming Soon', 'Planned']
const statusColor: Record<DisplayStatus, string> = {
  Active: '#13a663',
  'Coming Soon': '#f4b71b',
  Planned: '#753bbd',
  Unassigned: '#7a8798',
}

function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem('locations-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialStatuses(): StatusAssignments {
  const defaults = Object.fromEntries(facilities.map((facility) => [facility.id, 'Active'])) as StatusAssignments
  try {
    const saved = JSON.parse(window.localStorage.getItem(STATUS_STORAGE_KEY) ?? '{}') as Record<string, unknown>
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults
    for (const facility of facilities) {
      const value = saved[facility.id]
      if (value === 'Active' || value === 'Coming Soon' || value === 'Planned' || value === 'Unassigned') {
        defaults[facility.id] = value
      }
    }
  } catch {
    // Invalid browser storage falls back to the requested Active baseline.
  }
  return defaults
}

function getFacilityTitle(facility: Facility) {
  return facility.city ? `${facility.city}, ${facility.state}` : `${facility.street}, ${facility.state}`
}

function statusClass(status: DisplayStatus) {
  return status.toLowerCase().replaceAll(' ', '-')
}

function hasUsableCoordinates(facility: Facility | null): facility is Facility {
  if (!facility) return false
  const [latitude, longitude] = facility.coordinates
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

function directoryWidthBounds(totalWidth: number) {
  const min = Math.min(Math.max(MIN_DIRECTORY_WIDTH, totalWidth * MIN_DIRECTORY_RATIO), totalWidth - MIN_MAP_WIDTH)
  const max = Math.max(min, Math.min(MAX_DIRECTORY_WIDTH, totalWidth * MAX_DIRECTORY_RATIO, totalWidth - MIN_MAP_WIDTH))
  return { min: Math.round(min), max: Math.round(max) }
}

function clampDirectoryWidth(width: number, totalWidth: number) {
  const { min, max } = directoryWidthBounds(totalWidth)
  return Math.min(max, Math.max(min, Math.round(width)))
}

function getInitialDirectoryWidth() {
  const totalWidth = window.innerWidth
  try {
    const saved = Number(window.localStorage.getItem(DIRECTORY_WIDTH_STORAGE_KEY))
    if (Number.isFinite(saved) && saved > 0) return clampDirectoryWidth(saved, totalWidth)
  } catch {
    // Local storage is an optional preference; the explorer remains fully usable without it.
  }
  return clampDirectoryWidth(totalWidth * DEFAULT_DIRECTORY_RATIO, totalWidth)
}

function pinIcon(facility: Facility, status: DisplayStatus, selected: boolean) {
  return L.divIcon({
    className: 'location-marker-wrap',
    html: `<span class="location-pin${selected ? ' is-selected' : ''}${facility.coordinatePrecision === 'Approximate' ? ' is-approximate' : ''}" style="--pin:${statusColor[status]}"><span></span></span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    tooltipAnchor: [14, -19],
  })
}

function MapFocus({ selected, focusSignal, recenterSignal, cameraMode, visibilityKey }: { selected: Facility | null; focusSignal: number; recenterSignal: number; cameraMode: 'overview' | 'site'; visibilityKey: string }) {
  const map = useMap()

  useEffect(() => {
    if (cameraMode !== 'site' || focusSignal === 0 || !hasUsableCoordinates(selected)) return
    const frame = window.requestAnimationFrame(() => {
      const container = map.getContainer()
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      map.invalidateSize()
      map.flyTo(selected.coordinates, SITE_FOCUS_ZOOM, { duration: 0.8 })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [cameraMode, focusSignal, map, selected, visibilityKey])

  useEffect(() => {
    if (recenterSignal === 0) return
    const frame = window.requestAnimationFrame(() => {
      const container = map.getContainer()
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      map.invalidateSize()
      map.flyTo([37.8, -96.2], 4, { duration: 0.7 })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, recenterSignal])

  return null
}

function MapLifecycle({ resizeKey, onViewChange }: { resizeKey: string; onViewChange: (view: { lat: number; lng: number; zoom: number }) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      onViewChange({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
    },
    zoomend: () => {
      const center = map.getCenter()
      onViewChange({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
    },
  })

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = map.getContainer()
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      map.invalidateSize()
      const center = map.getCenter()
      onViewChange({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, onViewChange, resizeKey])

  return null
}

function MapSplitResize({ resizeKey, selected, preserveSiteFocus, onViewChange }: { resizeKey: number; selected: Facility | null; preserveSiteFocus: boolean; onViewChange: (view: { lat: number; lng: number; zoom: number }) => void }) {
  const map = useMap()
  const selectedRef = useRef(selected)
  const preserveSiteFocusRef = useRef(preserveSiteFocus)
  selectedRef.current = selected
  preserveSiteFocusRef.current = preserveSiteFocus

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = map.getContainer()
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      map.invalidateSize({ pan: false, debounceMoveend: true })
      if (preserveSiteFocusRef.current && hasUsableCoordinates(selectedRef.current)) {
        map.setView(selectedRef.current.coordinates, map.getZoom(), { animate: false })
      }
      const center = map.getCenter()
      onViewChange({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, onViewChange, resizeKey])

  return null
}

function EmptyState({ icon: Icon = FileText, title, body }: { icon?: typeof FileText; title: string; body: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [selected, setSelected] = useState<Facility | null>(null)
  const [showcaseOpen, setShowcaseOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [statusAssignments, setStatusAssignments] = useState<StatusAssignments>(getInitialStatuses)
  const [tab, setTab] = useState<Tab>('Overview')
  const [layer, setLayer] = useState<'street' | 'satellite'>('satellite')
  const [directoryWidth, setDirectoryWidth] = useState(getInitialDirectoryWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)
  const [cameraMode, setCameraMode] = useState<'overview' | 'site'>('overview')
  const [recenterSignal, setRecenterSignal] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [mapView, setMapView] = useState({ lat: 37.8, lng: -96.2, zoom: 4 })
  const dashboardRef = useRef<HTMLElement>(null)
  const resizeDrag = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const returnFocusPending = useRef(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('locations-theme', theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusAssignments))
  }, [statusAssignments])

  useEffect(() => {
    try {
      window.localStorage.setItem(DIRECTORY_WIDTH_STORAGE_KEY, String(directoryWidth))
    } catch {
      // Persistence is optional; resizing remains available for the current session.
    }
  }, [directoryWidth])

  useEffect(() => {
    const clampForViewport = () => {
      if (window.innerWidth <= 820) return
      const totalWidth = dashboardRef.current?.clientWidth ?? window.innerWidth
      setDirectoryWidth((current) => clampDirectoryWidth(current, totalWidth))
    }
    window.addEventListener('resize', clampForViewport)
    return () => window.removeEventListener('resize', clampForViewport)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    document.body.classList.add('is-resizing-explorer')
    return () => document.body.classList.remove('is-resizing-explorer')
  }, [isResizing])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setDetailsOpen(false)
      setAboutOpen(false)
      setMobileNav(false)
      setShowcaseOpen((current) => {
        if (current) returnFocusPending.current = true
        return false
      })
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  useEffect(() => {
    if (showcaseOpen || !selected || !returnFocusPending.current) return
    returnFocusPending.current = false
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`button[data-facility-id="${selected.id}"]`)?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selected, showcaseOpen])

  const facilityStatus = (facility: Facility): DisplayStatus => statusAssignments[facility.id] ?? 'Active'
  const selectedStatus = selected ? facilityStatus(selected) : 'Active'
  const selectedMedia = selected ? getFacilityMedia(selected.id) : undefined

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const isStateAbbreviation = query.length === 2 && facilities.some((facility) => facility.state.toLowerCase() === query)
    return facilities.filter((facility) => {
      const matchesText = !query || (isStateAbbreviation ? facility.state.toLowerCase() === query : searchableFacilityText(facility).includes(query))
      const currentStatus = statusAssignments[facility.id] ?? 'Active'
      return matchesText && (statusFilter === 'All' || currentStatus === statusFilter)
    })
  }, [search, statusAssignments, statusFilter])

  const counts = useMemo(() => {
    const statuses = facilities.map((facility) => statusAssignments[facility.id] ?? 'Active')
    return {
      total: facilities.length,
      active: statuses.filter((item) => item === 'Active').length,
      coming: statuses.filter((item) => item === 'Coming Soon').length,
      planned: statuses.filter((item) => item === 'Planned').length,
      unassigned: statuses.filter((item) => item === 'Unassigned').length,
    }
  }, [statusAssignments])

  const chooseFacility = (facility: Facility) => {
    setSelected(facility)
    setCameraMode('site')
    setFocusSignal((value) => value + 1)
    setShowcaseOpen(true)
    setMobileView('list')
    setTab('Overview')
  }

  const closeShowcase = () => {
    returnFocusPending.current = true
    setShowcaseOpen(false)
  }

  const dashboardWidth = dashboardRef.current?.clientWidth ?? window.innerWidth
  const splitBounds = directoryWidthBounds(dashboardWidth)
  const splitPercent = Math.round((directoryWidth / dashboardWidth) * 100)

  const resizeDirectory = (width: number) => {
    const totalWidth = dashboardRef.current?.clientWidth ?? window.innerWidth
    setDirectoryWidth(clampDirectoryWidth(width, totalWidth))
  }

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 820 || event.button !== 0) return
    event.preventDefault()
    resizeDrag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: directoryWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsResizing(true)
  }

  const moveResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resizeDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    resizeDirectory(drag.startWidth + event.clientX - drag.startX)
  }

  const finishResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeDrag.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    resizeDrag.current = null
    setIsResizing(false)
  }

  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 64 : 24
    let nextWidth: number | null = null
    if (event.key === 'ArrowLeft') nextWidth = directoryWidth - step
    if (event.key === 'ArrowRight') nextWidth = directoryWidth + step
    if (event.key === 'Home') nextWidth = splitBounds.min
    if (event.key === 'End') nextWidth = splitBounds.max
    if (nextWidth === null) return
    event.preventDefault()
    resizeDirectory(nextWidth)
  }

  const resetDirectoryWidth = () => resizeDirectory(dashboardWidth * DEFAULT_DIRECTORY_RATIO)

  const showOverview = () => {
    setCameraMode('overview')
    setRecenterSignal((value) => value + 1)
  }

  const assignStatus = (facility: Facility, status: DisplayStatus) => {
    setStatusAssignments((current) => ({ ...current, [facility.id]: status }))
    setNotice(`Local status set to ${status}.`)
  }

  const openMaps = () => {
    if (!selected) return
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.fullAddress)}`, '_blank', 'noopener,noreferrer')
  }

  const navItems = [
    ['Dashboard', Grid2X2], ['Locations', MapIcon], ['Facilities', Warehouse], ['Inventory', Box],
    ['Operations', SlidersHorizontal], ['Analytics', PackageSearch], ['Reports', ClipboardList],
  ] as const

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="menu-button icon-button" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button>
        <div className="brand" aria-label="ITEM Locations Network"><img src="/brand/item-logo-fullcolor-whitetxt.svg" alt="ITEM" /><span>LOCATIONS NETWORK</span></div>
        <nav className={mobileNav ? 'nav-links is-open' : 'nav-links'} aria-label="Primary navigation">
          {navItems.map(([label, Icon]) => (
            <button key={label} className={label === 'Locations' ? 'active' : ''} aria-current={label === 'Locations' ? 'page' : undefined} onClick={() => { setMobileNav(false); if (label !== 'Locations') setNotice(`${label} is outside this reference prototype.`) }}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <label className="global-search">
            <Search size={17} /><span className="sr-only">Search facilities</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search address, city, state, ZIP..." />
            {search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}
          </label>
          <button className="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} data-testid="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon /> : <Sun />}</button>
          <button className="icon-button" aria-label="Notifications" onClick={() => setNotice('No new notifications.')}><Bell /></button>
          <button className="avatar" aria-label="Open profile menu" onClick={() => setNotice('Signed in as reference viewer.')}>RV</button>
        </div>
      </header>

      <main ref={dashboardRef} className={`dashboard${isResizing ? ' is-resizing' : ''}`} style={{ '--directory-width': `${directoryWidth}px` } as CSSProperties}>
        <div className="mobile-explorer-switch" role="group" aria-label="Explorer view">
          <button aria-pressed={mobileView === 'list'} className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}><ClipboardList size={16} />List</button>
          <button aria-pressed={mobileView === 'map'} className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}><MapIcon size={16} />Map</button>
        </div>

        <section className={`explorer-pane ${mobileView === 'map' ? 'mobile-hidden' : ''}`} aria-label={showcaseOpen && selected ? `${selected.fullAddress} details` : 'Facility directory'}>
          {showcaseOpen && selected ? (
            <aside className="detail-panel selected-showcase" data-testid="selected-showcase">
              <div className="detail-navigation">
                <button className="back-to-directory" onClick={closeShowcase}><ArrowLeft size={17} />All facilities</button>
                <button className="icon-button" aria-label="Close facility details" onClick={closeShowcase}><X size={18} /></button>
              </div>
              <div className="facility-identity">
                <FacilityPhoto media={selectedMedia} variant="detail" />
                <div><span className="eyebrow">Facility {String(selected.number).padStart(2, '0')}</span><strong>{getFacilityTitle(selected)}</strong><small>Logistics network location</small></div>
                <span className={`precision-chip ${selected.coordinatePrecision === 'Approximate' ? 'approximate' : ''}`}><ShieldCheck size={13} />{selected.coordinatePrecision}</span>
              </div>
              <div className="detail-header">
                <div className="title-line"><MapPin /><h1>Facility {String(selected.number).padStart(2, '0')}</h1><span className={`status-pill ${statusClass(selectedStatus)}`}>{selectedStatus}</span></div>
                <div className="address-line"><MapPin size={15} /><span>{selected.fullAddress}</span><button onClick={openMaps}>Open in Maps <ExternalLink size={13} /></button></div>
              </div>
              <div className="tabs" role="tablist" aria-label="Facility details">
                {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}
              </div>
              <div className="detail-content">
                {tab === 'Overview' && <OverviewContent facility={selected} status={selectedStatus} onStatusChange={(value) => assignStatus(selected, value)} />}
                {tab === 'Site Plan' && <EmptyState icon={MapIcon} title="Site plan not provided" body="No site plan was supplied for this facility." />}
                {tab === 'Photos' && <PhotosContent facility={selected} media={selectedMedia} />}
                {tab === 'Documents' && <EmptyState title="Documents not provided" body="No property or operating documents were supplied for this facility." />}
                {tab === 'Operations' && <EmptyState icon={Truck} title="Operations data unavailable" body="This prototype does not connect to WMS, YMS, inventory, or operational systems." />}
              </div>
              <div className="detail-footer"><button className="secondary-button" onClick={() => setAboutOpen(true)}><CircleHelp size={16} />About data</button><button className="primary-button" onClick={() => setDetailsOpen(true)}>View Full Details <ChevronRight size={17} /></button></div>
            </aside>
          ) : (
            <div className="locations-card directory-panel">
              <div className="directory-heading">
                <div><span className="eyebrow">User-provided roster</span><h1>Facility directory</h1><p>Select a location to view its available information alongside the map.</p></div>
                <span>{filtered.length} of {facilities.length}</span>
              </div>
              <div className="list-filters">
                <label><Search size={16} /><span className="sr-only">Filter facilities</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search street, city, state, ZIP..." /></label>
                <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="All">All statuses</option><option>Active</option><option>Coming Soon</option><option>Planned</option><option>Unassigned</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Facility</th><th>City / State</th><th>Status</th><th><span className="sr-only">Select</span></th></tr></thead>
                  <tbody>
                    {filtered.map((facility) => {
                      const currentStatus = facilityStatus(facility)
                      return (
                        <tr key={facility.id} className={facility.id === selected?.id ? 'selected' : ''} onClick={() => chooseFacility(facility)}>
                          <td><span className="roster-index">{String(facility.number).padStart(2, '0')}</span></td>
                          <td>
                            <button data-facility-id={facility.id} onClick={() => chooseFacility(facility)} aria-label={`Select ${facility.fullAddress}`}>
                              <FacilityPhoto media={getFacilityMedia(facility.id)} variant="thumbnail" />
                              <span className="roster-copy">
                                <strong className="roster-title">{getFacilityTitle(facility)}</strong>
                                <span className="roster-address"><MapPin size={15} /><span>{facility.fullAddress}</span></span>
                              </span>
                            </button>
                          </td>
                          <td>{facility.city ? `${facility.city}, ${facility.state}` : `City not provided · ${facility.state}`}</td>
                          <td><span className={`status-pill ${statusClass(currentStatus)}`}>{currentStatus}</span></td>
                          <td><ChevronRight size={15} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <EmptyState icon={Search} title="No matching facilities" body="Try a street, city, state name or abbreviation, ZIP, or another status." />}
              </div>
            </div>
          )}
        </section>

        <div
          className="explorer-resizer"
          role="separator"
          aria-label="Resize facility directory and map"
          aria-orientation="vertical"
          aria-valuemin={splitBounds.min}
          aria-valuemax={splitBounds.max}
          aria-valuenow={directoryWidth}
          aria-valuetext={`${splitPercent}% directory width`}
          tabIndex={0}
          title="Resize facility directory"
          onDoubleClick={resetDirectoryWidth}
          onKeyDown={resizeWithKeyboard}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
        ><span aria-hidden="true" /></div>

        <section
          className={`map-stage ${mobileView === 'list' ? 'mobile-hidden' : ''}`}
          aria-label="Facility network map"
          data-center={`${mapView.lat.toFixed(6)},${mapView.lng.toFixed(6)}`}
          data-zoom={mapView.zoom.toFixed(2)}
        >
          <MapContainer center={[37.8, -96.2]} zoom={4} minZoom={3} maxZoom={18} zoomControl={false} scrollWheelZoom className="map" preferCanvas>
            {layer === 'street' ? (
              <TileLayer key="street" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            ) : (
              <TileLayer key="satellite" attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            )}
            <ZoomControl position="topright" />
            <MapFocus selected={selected} focusSignal={focusSignal} recenterSignal={recenterSignal} cameraMode={cameraMode} visibilityKey={mobileView} />
            <MapLifecycle resizeKey={mobileView} onViewChange={setMapView} />
            <MapSplitResize resizeKey={directoryWidth} selected={selected} preserveSiteFocus={cameraMode === 'site'} onViewChange={setMapView} />
            {filtered.map((facility) => {
              const currentStatus = facilityStatus(facility)
              return (
                <Marker key={facility.id} position={facility.coordinates} icon={pinIcon(facility, currentStatus, facility.id === selected?.id)} eventHandlers={{ click: () => chooseFacility(facility) }} title={facility.fullAddress}>
                  <Tooltip permanent direction="right" className="pin-label" opacity={1}>#{facility.number} {facility.city ?? 'TN'}{facility.coordinatePrecision === 'Approximate' ? ' · approx.' : ''}</Tooltip>
                </Marker>
              )
            })}
          </MapContainer>

          <div className="overview-panel">
            <div className="panel-title"><strong>Facility Network</strong><button aria-label="About this prototype" onClick={() => setAboutOpen(true)}><Info size={16} /></button></div>
            <div className="overview-metrics five-metrics">
              <div><Building2 /><b>{counts.total}</b><span>Facilities</span></div>
              <div><MapPin /><b>{counts.active}</b><span>Active</span></div>
              <div><MapPin /><b>{counts.coming}</b><span>Coming Soon</span></div>
              <div><MapPin /><b>{counts.planned}</b><span>Planned</span></div>
              <div><FileQuestion /><b>{counts.unassigned}</b><span>Unassigned</span></div>
            </div>
          </div>

          <div className="map-tools" aria-label="Map layers">
            <span><Layers3 size={16} />Layers</span>
            <div className="layer-switch" role="group" aria-label="Map layer">
              <button className={layer === 'street' ? 'active' : ''} aria-pressed={layer === 'street'} onClick={() => setLayer('street')}>Street</button>
              <button className={layer === 'satellite' ? 'active' : ''} aria-pressed={layer === 'satellite'} onClick={() => setLayer('satellite')}>Satellite</button>
            </div>
          </div>
          <button className="recenter-control" aria-label="Recenter map" title="View all facilities" onClick={showOverview}><LocateFixed size={18} /></button>
          <div className="map-legend" aria-label="Local facility status legend">
            {assignableStatuses.map((item) => <span key={item}><i style={{ background: statusColor[item] }} />{item}</span>)}
          </div>
          {filtered.length === 0 && <div className="no-map-results"><Search size={20} /><strong>No facilities found</strong><button onClick={() => { setSearch(''); setStatusFilter('All') }}>Clear filters</button></div>}
        </section>
      </main>

      {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}

      {detailsOpen && selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsOpen(false) }}>
          <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="details-title">
            <div className="modal-head"><div><span className="eyebrow">Facility record {String(selected.number).padStart(2, '0')}</span><h2 id="details-title">{getFacilityTitle(selected)}</h2></div><button className="icon-button" aria-label="Close details" onClick={() => setDetailsOpen(false)}><X /></button></div>
            <div className="drawer-content">
              {selectedMedia && <FacilityPhoto media={selectedMedia} variant="drawer" />}
              <div className="drawer-banner"><Warehouse /><div><strong>{selected.fullAddress}</strong><span>User-provided facility address</span></div></div>
              <dl className="detail-list">
                <div><dt>Status</dt><dd>{selectedStatus === 'Unassigned' ? 'Not provided · locally unassigned' : `${selectedStatus} · local assignment`}</dd></div>
                <div><dt>Street / building</dt><dd>{selected.street}</dd></div>
                <div><dt>City</dt><dd>{selected.city ?? 'Not provided'}</dd></div>
                <div><dt>State</dt><dd>{selected.state} · {selected.stateName}</dd></div>
                <div><dt>ZIP</dt><dd>{selected.zip ?? 'Not provided'}</dd></div>
                <div><dt>Coordinates</dt><dd>{selected.coordinates.map((value) => value.toFixed(6)).join(', ')}</dd></div>
                <div><dt>Coordinate precision</dt><dd>{selected.coordinatePrecision}</dd></div>
                <div><dt>Coordinate source</dt><dd>{selected.coordinateSource}</dd></div>
              </dl>
              <section className="geocode-detail"><strong>Geocoder match</strong><p>{selected.geocoderMatch}</p>{selected.geocodeNote && <p className="geocode-warning"><Info size={15} />{selected.geocodeNote}</p>}</section>
              <p className="source-note"><Info size={15} />No property size, dock, site-plan, or operational data was supplied. {selectedMedia ? 'The displayed photo is official UNIS listing media; its source and association limits are documented in the Photos tab.' : 'No responsibly address-matched official photo is available for this facility.'} Those fields are intentionally not inferred.</p>
            </div>
          </section>
        </div>
      )}

      {aboutOpen && (
        <div className="modal-backdrop centered" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAboutOpen(false) }}>
          <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <div className="modal-head"><div><span className="eyebrow">About this experience</span><h2 id="about-title">Reference prototype</h2></div><button className="icon-button" aria-label="Close about" onClick={() => setAboutOpen(false)}><X /></button></div>
            <p>This screenshot-based prototype uses exactly 17 user-provided facility addresses. It is not connected to WMS, YMS, inventory, facility, or operational APIs.</p>
            <p>No official statuses or property attributes were supplied. All facilities start as Active in this prototype at your request, and status changes are saved only in this browser. Eight facilities have source-verified official listing media with association limits documented in the Photos tab; unmatched facilities intentionally show no substitute image. Coordinates were geocoded for map placement; source and precision are shown in Full Details.</p>
            <button className="primary-button" onClick={() => setAboutOpen(false)}>Understood</button>
          </section>
        </div>
      )}
    </div>
  )
}

function PhotosContent({ facility, media }: { facility: Facility; media?: FacilityMedia }) {
  if (!media) {
    return <EmptyState icon={Warehouse} title="Photo not available" body="No responsibly address-matched official photo is available for this facility." />
  }

  return (
    <section className="photo-detail" aria-label={`Photo provenance for ${facility.fullAddress}`}>
      <FacilityPhoto media={media} variant="gallery" />
      <div className="photo-caption">
        <div><span className="eyebrow">Official listing media</span><strong>{getFacilityTitle(facility)}</strong></div>
        <p>{media.matchNote}</p>
        <dl>
          <div><dt>Source</dt><dd><a href={media.sourcePage} target="_blank" rel="noreferrer">Official UNIS page <ExternalLink size={12} /></a></dd></div>
          <div><dt>Original</dt><dd><a href={media.detail.sourceUrl} target="_blank" rel="noreferrer">Official image <ExternalLink size={12} /></a></dd></div>
          <div><dt>Thumbnail</dt><dd><a href={media.thumbnail.sourceUrl} target="_blank" rel="noreferrer">Directory preview <ExternalLink size={12} /></a></dd></div>
          <div><dt>Retrieved</dt><dd><time dateTime={media.retrievedDate}>{media.retrievedDate}</time></dd></div>
          <div><dt>Detail image</dt><dd>{media.detail.width} × {media.detail.height}</dd></div>
        </dl>
      </div>
    </section>
  )
}

function OverviewContent({ facility, status, onStatusChange }: { facility: Facility; status: DisplayStatus; onStatusChange: (status: DisplayStatus) => void }) {
  return (
    <>
      <section className="status-assignment">
        <div><span className="eyebrow">Local planning field</span><h2>Working status</h2><p>All facilities started as Active at your request. You can change this browser-only working status; it is not an official facility status.</p></div>
        <label><span>Local status</span><select aria-label={`Set status for ${facility.fullAddress}`} value={status} onChange={(event) => onStatusChange(event.target.value as DisplayStatus)}>{assignableStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>

      <section className="known-details info-section">
        <h2><Building2 />Known location details</h2>
        <dl>
          <div><dt>Street / building</dt><dd>{facility.street}</dd></div>
          <div><dt>City</dt><dd>{facility.city ?? 'Not provided'}</dd></div>
          <div><dt>State</dt><dd>{facility.state} · {facility.stateName}</dd></div>
          <div><dt>ZIP</dt><dd>{facility.zip ?? 'Not provided'}</dd></div>
        </dl>
      </section>

      <section className="unavailable-section info-section">
        <h2><FileQuestion />Property attributes</h2>
        <div className="unavailable-grid"><span><b>Total area</b>Not provided</span><span><b>Dock doors</b>Not provided</span><span><b>Grade doors</b>Not provided</span><span><b>Clear height</b>Not provided</span></div>
      </section>

      <section className="coordinate-section info-section">
        <h2><ShieldCheck />Map placement</h2>
        <div className="coordinate-row"><span className={`precision-chip ${facility.coordinatePrecision === 'Approximate' ? 'approximate' : ''}`}>{facility.coordinatePrecision}</span><span>{facility.coordinateSource}</span></div>
        {facility.geocodeNote && <p className="geocode-warning"><Info size={14} />{facility.geocodeNote}</p>}
      </section>
    </>
  )
}

export default App
