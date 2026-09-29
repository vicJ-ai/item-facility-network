import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  ArrowLeft, Bell, Box, Building2, Camera, Check, ChevronRight, CircleHelp, ClipboardList, Clock,
  ExternalLink, FileQuestion, FileText, Grid2X2, Info, Layers3, LocateFixed, Mail, Maximize2,
  Map as MapIcon, MapPin, Menu, Moon, PackageSearch, Phone, Search, ShieldCheck,
  SlidersHorizontal, Sun, Warehouse, X,
} from 'lucide-react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { FacilityDocuments } from './components/FacilityDocuments'
import { FacilityPhoto } from './components/FacilityPhoto'
import { UserProvidedPhotoGallery } from './components/UserProvidedPhotoGallery'
import {
  facilities,
  searchableFacilityText,
  type DisplayStatus,
  type Facility,
  type FacilityType,
} from './data/facilities'
import { getFacilityMedia, type FacilityMedia } from './data/facility-media'
import { getFacilityOperatingHours } from './data/facility-hours'
import { getFacilityOperations, type FacilityContact, type FacilityOperations } from './data/facility-operations'
import { getFacilitySitePlan, type FacilitySitePlan, type FacilitySitePlanFact } from './data/facility-site-plans'
import { formatAvailableSpaceMonth, getFacilitySquareFootage } from './data/facility-space'
import { getUserProvidedFacilityPhotos, type UserProvidedFacilityPhotos } from './data/facility-user-photos'

type Tab = 'Overview' | 'Site Plan' | 'Photos' | 'Documents' | 'Operations'
type Theme = 'light' | 'dark'
type AppView = 'dashboard' | 'locations'
type StatusFilter = 'All' | DisplayStatus
type FacilityTypeFilter = 'All' | FacilityType
type StatusAssignments = Record<string, DisplayStatus>
type MapViewport = { lat: number; lng: number; zoom: number; south: number; west: number; north: number; east: number }

const STATUS_STORAGE_KEY = 'facility-status-assignments-v3'
const DIRECTORY_WIDTH_STORAGE_KEY = 'facility-directory-width-v1'
const SITE_FOCUS_ZOOM = 16
const DEFAULT_DIRECTORY_RATIO = 0.36
const MIN_DIRECTORY_RATIO = 0.25
const MAX_DIRECTORY_RATIO = 0.55
const MIN_DIRECTORY_WIDTH = 420
const MAX_DIRECTORY_WIDTH = 760
const MIN_MAP_WIDTH = 360
const ESRI_STREET_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, TomTom, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors, and the GIS User Community'
const ESRI_STREET_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
const tabs: Tab[] = ['Overview', 'Site Plan', 'Photos', 'Documents', 'Operations']
const assignableStatuses: DisplayStatus[] = ['Unassigned', 'Active', 'Coming Soon', 'Planned']
const statusColor: Record<DisplayStatus, string> = {
  Active: '#13a663',
  'Coming Soon': '#f4b71b',
  Planned: '#753bbd',
  Unassigned: '#7a8798',
}
const dashboardRegions = [
  { id: 'southern-california', label: 'Southern California', facilityNumbers: [1, 2, 3, 15, 19] },
  { id: 'northern-california', label: 'Northern California', facilityNumbers: [21] },
  { id: 'texas', label: 'Texas', facilityNumbers: [4, 5, 14, 17, 23, 27] },
  { id: 'washington', label: 'Washington', facilityNumbers: [10, 11, 20] },
  { id: 'georgia', label: 'Georgia', facilityNumbers: [6, 7] },
  { id: 'south-carolina', label: 'South Carolina', facilityNumbers: [8] },
  { id: 'tennessee', label: 'Tennessee', facilityNumbers: [9, 24] },
  { id: 'florida', label: 'Florida', facilityNumbers: [12] },
  { id: 'nevada', label: 'Nevada', facilityNumbers: [13, 22] },
  { id: 'illinois', label: 'Illinois', facilityNumbers: [16] },
  { id: 'arizona', label: 'Arizona', facilityNumbers: [18] },
  { id: 'utah', label: 'Utah', facilityNumbers: [25] },
  { id: 'new-jersey', label: 'New Jersey', facilityNumbers: [26] },
] as const
type DashboardRegionId = (typeof dashboardRegions)[number]['id']

function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem('locations-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialStatuses(): StatusAssignments {
  try {
    const stored = window.localStorage.getItem(STATUS_STORAGE_KEY)
    if (stored === null) return {}
    const saved = JSON.parse(stored) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(saved).filter(([id, value]) =>
        facilities.some((facility) => facility.id === id) &&
        (value === 'Active' || value === 'Coming Soon' || value === 'Planned' || value === 'Unassigned'),
      ),
    ) as StatusAssignments
  } catch {
    return {}
  }
}

function resolveFacilityStatus(facility: Facility, overrides: StatusAssignments): DisplayStatus {
  return overrides[facility.id] ?? facility.status
}

function getFacilityTitle(facility: Facility) {
  return facility.city ? `${facility.city}, ${facility.state}` : `${facility.street}, ${facility.state}`
}

function isUserProvidedMedia(media: FacilityMedia) {
  return media.verification.startsWith('user-provided')
}

function mediaSourceValue(value: string, linkedLabel: string) {
  if (!value.startsWith('http')) return value
  return <a href={value} target="_blank" rel="noreferrer">{linkedLabel} <ExternalLink size={12} /></a>
}

function mediaCategory(media: FacilityMedia) {
  return isUserProvidedMedia(media) ? 'User-provided photo' : 'Official listing media'
}

function formatSitePlanFact(fact: FacilitySitePlanFact) {
  const value = typeof fact.value === 'number' ? fact.value.toLocaleString('en-US') : fact.value
  return `${value}${fact.unit ? ` ${fact.unit}` : ''}`
}

function OperatingHoursDisplay({ facilityId, variant }: { facilityId: string; variant: 'preview' | 'overview' | 'drawer' | 'operations' }) {
  const hours = getFacilityOperatingHours(facilityId)

  return (
    <span
      className={`operating-hours operating-hours-${variant}`}
      data-testid={`operating-hours-${variant}`}
      data-hours-status={hours.status}
    >
      <Clock size={variant === 'preview' ? 12 : 14} />
      <span>
        <strong>{hours.startTime}–{hours.endTime} {hours.timezone} <span className="operating-hours-days">{hours.days}</span></strong>
        {variant !== 'preview' && <small>{hours.status === 'confirmed' ? `User-confirmed · ${hours.sourceRowLabel}` : `User-provided · As supplied · ${hours.sourceRowLabel}`}</small>}
        {variant === 'drawer' && <small>{hours.matchNote}</small>}
      </span>
    </span>
  )
}

function SquareFootagePreview({ facilityId }: { facilityId: string }) {
  const { totalSquareFeet, available } = getFacilitySquareFootage(facilityId)

  return (
    <span className="square-footage-preview" data-testid="square-footage-preview">
      <Warehouse size={12} />
      <span>
        {totalSquareFeet !== undefined && <span data-testid="square-footage-total">Total <strong>{totalSquareFeet.toLocaleString('en-US')} SF</strong></span>}
        <span data-testid="square-footage-available" data-available-status={available ? 'reported' : 'pending'}>
          Available {available
            ? <><strong>{available.squareFeet.toLocaleString('en-US')} SF</strong> · as of {formatAvailableSpaceMonth(available.asOf)}</>
            : <em className="square-footage-pending">Pending — warehouse to update monthly</em>}
        </span>
      </span>
    </span>
  )
}

function googleMapsUrl(facility: Facility) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.fullAddress)}`
}

function googleMapsEmbedUrl(facility: Facility) {
  return `https://www.google.com/maps?q=${encodeURIComponent(facility.fullAddress)}&z=15&output=embed`
}

function streetViewUrl(facility: Facility) {
  if (!hasUsableCoordinates(facility)) return null
  const [latitude, longitude] = facility.coordinates
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`
}

function googleMapsPhotoLookupUrl(facility: Facility) {
  if (!hasUsableCoordinates(facility)) return googleMapsUrl(facility)
  const [latitude, longitude] = facility.coordinates
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

function statusClass(status: DisplayStatus) {
  return status.toLowerCase().replaceAll(' ', '-')
}

type MappableFacility = Facility & { coordinates: [number, number] }

function hasUsableCoordinates(facility: Facility | null): facility is MappableFacility {
  if (!facility) return false
  if (!facility.coordinates) return false
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

function dashboardPreviewDirection(facility: MappableFacility): 'left' | 'right' | 'top' {
  const longitude = facility.coordinates[1]
  if (longitude <= -110) return 'right'
  if (longitude >= -90) return 'left'
  return 'top'
}

function getDashboardRegionBounds(regionFacilities: readonly MappableFacility[]) {
  const latitudes = regionFacilities.map((facility) => facility.coordinates[0])
  const longitudes = regionFacilities.map((facility) => facility.coordinates[1])
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const latitudePadding = Math.max((maxLatitude - minLatitude) * 0.18, 0.1)
  const longitudePadding = Math.max((maxLongitude - minLongitude) * 0.18, 0.12)
  return L.latLngBounds(
    [minLatitude - latitudePadding, minLongitude - longitudePadding],
    [maxLatitude + latitudePadding, maxLongitude + longitudePadding],
  )
}

function MapFocus({ selected, focusSignal, recenterSignal, cameraMode, visibilityKey }: { selected: Facility | null; focusSignal: number; recenterSignal: number; cameraMode: 'overview' | 'site'; visibilityKey: string }) {
  const map = useMap()

  useEffect(() => {
    if (cameraMode !== 'site' || focusSignal === 0 || !hasUsableCoordinates(selected)) return
    const coordinates = selected.coordinates
    let focusFrame = 0
    const resizeFrame = window.requestAnimationFrame(() => {
      const container = map.getContainer()
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      map.invalidateSize()
      focusFrame = window.requestAnimationFrame(() => map.flyTo(coordinates, SITE_FOCUS_ZOOM, { duration: 0.8 }))
    })
    return () => {
      window.cancelAnimationFrame(resizeFrame)
      window.cancelAnimationFrame(focusFrame)
      map.stop()
    }
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

function getMapViewport(map: L.Map): MapViewport {
  const center = map.getCenter()
  const bounds = map.getBounds()
  return {
    lat: center.lat,
    lng: center.lng,
    zoom: map.getZoom(),
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  }
}

function DashboardOverview({ active, signal, targets, regionActive, panelOpen, onViewChange }: { active: boolean; signal: number; targets: readonly Facility[]; regionActive: boolean; panelOpen: boolean; onViewChange: (view: MapViewport) => void }) {
  const map = useMap()
  const cameraRequestRef = useRef(0)

  useEffect(() => {
    const cameraRequest = ++cameraRequestRef.current
    if (!active) {
      map.stop()
      return
    }
    if (signal === 0) return
    map.stop()
    let fitFrame = 0
    const resizeFrame = window.requestAnimationFrame(() => {
      if (cameraRequest !== cameraRequestRef.current) return
      const container = map.getContainer()
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      map.invalidateSize({ pan: false })
      fitFrame = window.requestAnimationFrame(() => {
        if (cameraRequest !== cameraRequestRef.current) return
        const mappableTargets = targets.filter(hasUsableCoordinates)
        const coordinates = mappableTargets.map((facility) => facility.coordinates)
        if (coordinates.length === 0) return
        const mobile = container.clientWidth <= 720
        const basePadding = mobile ? 28 : Math.min(80, Math.round(container.clientWidth * 0.055))
        const paddingTopLeft: L.PointExpression = [!mobile && panelOpen ? 370 : basePadding, basePadding]
        const paddingBottomRight: L.PointExpression = [basePadding, mobile && panelOpen ? Math.min(390, Math.round(container.clientHeight * 0.5)) : basePadding]
        const bounds = regionActive ? getDashboardRegionBounds(mappableTargets) : L.latLngBounds(coordinates)
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        map.fitBounds(bounds, {
          animate: regionActive && !reduceMotion,
          duration: 0.65,
          maxZoom: regionActive ? 9 : 6,
          paddingTopLeft,
          paddingBottomRight,
        })
        onViewChange(getMapViewport(map))
      })
    })
    return () => {
      if (cameraRequest === cameraRequestRef.current) cameraRequestRef.current += 1
      window.cancelAnimationFrame(resizeFrame)
      window.cancelAnimationFrame(fitFrame)
      map.stop()
    }
  }, [active, map, onViewChange, panelOpen, regionActive, signal, targets])

  return null
}

function MapLifecycle({ resizeKey, onViewChange }: { resizeKey: string; onViewChange: (view: MapViewport) => void }) {
  const map = useMapEvents({
    moveend: () => onViewChange(getMapViewport(map)),
    zoomend: () => onViewChange(getMapViewport(map)),
  })

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = map.getContainer()
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      map.invalidateSize()
      onViewChange(getMapViewport(map))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, onViewChange, resizeKey])

  return null
}

function MapSplitResize({ resizeKey, selected, preserveSiteFocus, onViewChange }: { resizeKey: number; selected: Facility | null; preserveSiteFocus: boolean; onViewChange: (view: MapViewport) => void }) {
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
      onViewChange(getMapViewport(map))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [map, onViewChange, resizeKey])

  return null
}

function ApproximateStreetViewNote({ facility }: { facility: Facility }) {
  if (!hasUsableCoordinates(facility)) return <p className="street-view-caveat"><Info size={13} />Street View is unavailable because this facility does not have verified map coordinates.</p>
  if (facility.coordinatePrecision !== 'Approximate') return null
  return <p className="street-view-caveat"><Info size={13} />Street-level imagery may be near, not exactly at, this facility.</p>
}

function EmptyState({ icon: Icon = FileText, title, body, children }: { icon?: typeof FileText; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
      {children}
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [appView, setAppView] = useState<AppView>('locations')
  const [selected, setSelected] = useState<Facility | null>(null)
  const [showcaseOpen, setShowcaseOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [facilityTypeFilter, setFacilityTypeFilter] = useState<FacilityTypeFilter>('All')
  const [statusAssignments, setStatusAssignments] = useState<StatusAssignments>(getInitialStatuses)
  const [tab, setTab] = useState<Tab>('Overview')
  const [layer, setLayer] = useState<'street' | 'satellite'>('street')
  const [directoryWidth, setDirectoryWidth] = useState(getInitialDirectoryWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)
  const [cameraMode, setCameraMode] = useState<'overview' | 'site'>('overview')
  const [recenterSignal, setRecenterSignal] = useState(0)
  const [dashboardOverviewSignal, setDashboardOverviewSignal] = useState(0)
  const [regionPanelOpen, setRegionPanelOpen] = useState(false)
  const [activeRegionId, setActiveRegionId] = useState<DashboardRegionId | null>(null)
  const [expandedRegionId, setExpandedRegionId] = useState<DashboardRegionId | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [mapView, setMapView] = useState<MapViewport>({ lat: 37.8, lng: -96.2, zoom: 4, south: 23.4, west: -127.4, north: 49.8, east: -65 })
  const dashboardRef = useRef<HTMLElement>(null)
  const regionToggleRef = useRef<HTMLButtonElement>(null)
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
      setRegionPanelOpen((current) => {
        if (current) window.requestAnimationFrame(() => regionToggleRef.current?.focus())
        return false
      })
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

  const facilityStatus = (facility: Facility): DisplayStatus => resolveFacilityStatus(facility, statusAssignments)
  const selectedStatus = selected ? facilityStatus(selected) : 'Active'
  const selectedMedia = selected ? getFacilityMedia(selected.id) : undefined
  const selectedOperations = selected ? getFacilityOperations(selected.id) : undefined
  const selectedStreetViewUrl = selected ? streetViewUrl(selected) : null
  const selectedSitePlan = selected ? getFacilitySitePlan(selected.id) : undefined
  const selectedUserPhotos = selected ? getUserProvidedFacilityPhotos(selected.id) : undefined
  const dashboardHighlightRenderer = useMemo(() => L.svg({ pane: 'overlayPane' }), [])
  const activeRegion = dashboardRegions.find((region) => region.id === activeRegionId) ?? null
  const dashboardFacilities = useMemo(() => {
    if (!activeRegion) return facilities
    return facilities.filter((facility) => activeRegion.facilityNumbers.some((number) => number === facility.number))
  }, [activeRegion])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const isStateAbbreviation = query.length === 2 && facilities.some((facility) => facility.state.toLowerCase() === query)
    return facilities.filter((facility) => {
      const matchesText = !query || (isStateAbbreviation ? facility.state.toLowerCase() === query : searchableFacilityText(facility).includes(query))
      const matchesFacilityType = facilityTypeFilter === 'All' || facility.facilityType === facilityTypeFilter
      const currentStatus = resolveFacilityStatus(facility, statusAssignments)
      return matchesText && matchesFacilityType && (statusFilter === 'All' || currentStatus === statusFilter)
    })
  }, [facilityTypeFilter, search, statusAssignments, statusFilter])
  const mappableDashboardFacilities = useMemo(() => dashboardFacilities.filter(hasUsableCoordinates), [dashboardFacilities])
  const mappableFilteredFacilities = useMemo(() => filtered.filter(hasUsableCoordinates), [filtered])

  const counts = useMemo(() => {
    const statuses = facilities.map((facility) => resolveFacilityStatus(facility, statusAssignments))
    return {
      total: facilities.length,
      active: statuses.filter((item) => item === 'Active').length,
      coming: statuses.filter((item) => item === 'Coming Soon').length,
      planned: statuses.filter((item) => item === 'Planned').length,
      unassigned: statuses.filter((item) => item === 'Unassigned').length,
    }
  }, [statusAssignments])

  const chooseFacility = (facility: Facility) => {
    setAppView('locations')
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
    if (appView === 'dashboard') setDashboardOverviewSignal((value) => value + 1)
    else setRecenterSignal((value) => value + 1)
  }

  const showDashboard = () => {
    setMobileNav(false)
    setDetailsOpen(false)
    setShowcaseOpen(false)
    setSelected(null)
    setCameraMode('overview')
    setRegionPanelOpen(false)
    setActiveRegionId(null)
    setExpandedRegionId(null)
    setAppView('dashboard')
    setDashboardOverviewSignal((value) => value + 1)
  }

  const showLocations = () => {
    setMobileNav(false)
    setAppView('locations')
  }

  const toggleRegionPanel = () => {
    setRegionPanelOpen((current) => !current)
    setDashboardOverviewSignal((value) => value + 1)
  }

  const closeRegionPanel = () => {
    setRegionPanelOpen(false)
    setDashboardOverviewSignal((value) => value + 1)
    window.requestAnimationFrame(() => regionToggleRef.current?.focus())
  }

  const selectDashboardRegion = (regionId: DashboardRegionId) => {
    if (activeRegionId === regionId) {
      setExpandedRegionId((current) => current === regionId ? null : regionId)
      return
    }
    setActiveRegionId(regionId)
    setExpandedRegionId(regionId)
    setDashboardOverviewSignal((value) => value + 1)
  }

  const clearDashboardRegion = () => {
    setActiveRegionId(null)
    setExpandedRegionId(null)
    setDashboardOverviewSignal((value) => value + 1)
  }

  const assignStatus = (facility: Facility, status: DisplayStatus) => {
    setStatusAssignments((current) => ({ ...current, [facility.id]: status }))
    setNotice(`Local status set to ${status}.`)
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
            <button
              key={label}
              className={label.toLowerCase() === appView ? 'active' : ''}
              aria-current={label.toLowerCase() === appView ? 'page' : undefined}
              onClick={() => {
                if (label === 'Dashboard') showDashboard()
                else if (label === 'Locations') showLocations()
                else {
                  setMobileNav(false)
                  setNotice(`${label} is outside this reference prototype.`)
                }
              }}
            >
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="top-actions">
          {appView === 'locations' && (
            <label className="global-search">
              <Search size={17} /><span className="sr-only">Search facilities</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search address, city, state, ZIP..." />
              {search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}
            </label>
          )}
          <button className="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} data-testid="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon /> : <Sun />}</button>
          <button className="icon-button" aria-label="Notifications" onClick={() => setNotice('No new notifications.')}><Bell /></button>
          <button className="avatar" aria-label="Open profile menu" onClick={() => setNotice('Signed in as reference viewer.')}>RV</button>
        </div>
      </header>

      <main ref={dashboardRef} className={`dashboard${appView === 'dashboard' ? ' dashboard-map-only' : ''}${isResizing ? ' is-resizing' : ''}`} style={{ '--directory-width': `${directoryWidth}px` } as CSSProperties}>
        {appView === 'locations' && (
          <div className="mobile-explorer-switch" role="group" aria-label="Explorer view">
            <button aria-pressed={mobileView === 'list'} className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}><ClipboardList size={16} />List</button>
            <button aria-pressed={mobileView === 'map'} className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}><MapIcon size={16} />Map</button>
          </div>
        )}

        {appView === 'locations' && <section className={`explorer-pane ${mobileView === 'map' ? 'mobile-hidden' : ''}`} aria-label={showcaseOpen && selected ? `${selected.fullAddress} details` : 'Facility directory'}>
          {showcaseOpen && selected ? (
            <aside className="detail-panel selected-showcase" data-testid="selected-showcase">
              <div className="detail-navigation">
                <button className="back-to-directory" onClick={closeShowcase}><ArrowLeft size={17} />All facilities</button>
                <button className="icon-button" aria-label="Close facility details" onClick={closeShowcase}><X size={18} /></button>
              </div>
              <div className="facility-identity">
                <FacilityPhoto media={selectedMedia} variant="detail" />
                <div><span className="eyebrow">Facility {String(selected.number).padStart(2, '0')}</span><strong>{getFacilityTitle(selected)}</strong><small>Logistics network location</small><small className="facility-network-type" data-testid="facility-network-type">{selected.facilityType}</small></div>
                <span className={`precision-chip ${selected.coordinatePrecision === 'Approximate' ? 'approximate' : selected.coordinatePrecision === 'Unavailable' ? 'unavailable' : ''}`}><ShieldCheck size={13} />{selected.coordinatePrecision}</span>
              </div>
              <div className="detail-header">
                <div className="title-line"><MapPin /><h1>Facility {String(selected.number).padStart(2, '0')}</h1><span className={`status-pill ${statusClass(selectedStatus)}`}>{selectedStatus}</span></div>
                <div className="address-line">
                  <MapPin size={15} />
                  <span>{selected.fullAddress}</span>
                </div>
              </div>
              <div className="tabs" role="tablist" aria-label="Facility details">
                {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}
              </div>
              <div className="detail-content">
                {tab === 'Overview' && <OverviewContent facility={selected} sitePlan={selectedSitePlan} status={selectedStatus} onStatusChange={(value) => assignStatus(selected, value)} />}
                {tab === 'Site Plan' && (selectedSitePlan
                  ? <SitePlanContent facility={selected} sitePlan={selectedSitePlan} />
                  : <EmptyState icon={MapIcon} title="Site plan not provided" body="No site plan was supplied for this facility." />)}
                {tab === 'Photos' && <PhotosContent facility={selected} media={selectedMedia} userPhotos={selectedUserPhotos} />}
                {tab === 'Documents' && <FacilityDocuments key={selected.id} facility={selected} facilityTitle={getFacilityTitle(selected)} operatingHours={getFacilityOperatingHours(selected.id)} media={selectedMedia} operations={selectedOperations} sitePlan={selectedSitePlan} userPhotos={selectedUserPhotos} />}
                {tab === 'Operations' && <OperationsContent facility={selected} operations={selectedOperations} />}
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
                <select aria-label="Filter by facility type" value={facilityTypeFilter} onChange={(event) => setFacilityTypeFilter(event.target.value as FacilityTypeFilter)}>
                  <option value="All">All types</option><option>UF ONLY</option><option>UF/CUBEWORKS</option>
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
                {filtered.length === 0 && <EmptyState icon={Search} title="No matching facilities" body="Try a street, city, state name or abbreviation, ZIP, status, or facility type." />}
              </div>
            </div>
          )}
        </section>}

        {appView === 'locations' && <div
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
        ><span aria-hidden="true" /></div>}

        <section
          className={`map-stage ${appView === 'locations' && mobileView === 'list' ? 'mobile-hidden' : ''}`}
          aria-label="Facility network map"
          data-view={appView}
          data-center={`${mapView.lat.toFixed(6)},${mapView.lng.toFixed(6)}`}
          data-zoom={mapView.zoom.toFixed(2)}
          data-bounds={`${mapView.south.toFixed(6)},${mapView.west.toFixed(6)},${mapView.north.toFixed(6)},${mapView.east.toFixed(6)}`}
        >
          <MapContainer center={[37.8, -96.2]} zoom={4} minZoom={3} maxZoom={18} zoomControl={false} scrollWheelZoom className="map" preferCanvas>
            {layer === 'street' ? (
              <TileLayer key="street" attribution={ESRI_STREET_ATTRIBUTION} url={ESRI_STREET_TILE_URL} />
            ) : (
              <TileLayer key="satellite" attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            )}
            <ZoomControl position="topright" />
            <MapFocus selected={selected} focusSignal={focusSignal} recenterSignal={recenterSignal} cameraMode={cameraMode} visibilityKey={`${appView}:${mobileView}`} />
            <DashboardOverview
              active={appView === 'dashboard'}
              signal={dashboardOverviewSignal}
              targets={dashboardFacilities}
              regionActive={activeRegion !== null}
              panelOpen={regionPanelOpen}
              onViewChange={setMapView}
            />
            <MapLifecycle resizeKey={`${appView}:${mobileView}`} onViewChange={setMapView} />
            {appView === 'locations' && <MapSplitResize resizeKey={directoryWidth} selected={selected} preserveSiteFocus={cameraMode === 'site'} onViewChange={setMapView} />}
            {appView === 'dashboard' && activeRegion && mappableDashboardFacilities.flatMap((facility) => [
              <CircleMarker
                key={`${facility.id}-highlight-outer`}
                {...{ className: 'dashboard-facility-highlight dashboard-facility-highlight-outer', renderer: dashboardHighlightRenderer }}
                center={facility.coordinates}
                radius={38}
                interactive={false}
                pathOptions={{ fill: true, fillColor: '#753bbd', fillOpacity: 0.08, interactive: false, stroke: false }}
              />,
              <CircleMarker
                key={`${facility.id}-highlight-inner`}
                {...{ className: 'dashboard-facility-highlight dashboard-facility-highlight-inner', renderer: dashboardHighlightRenderer }}
                center={facility.coordinates}
                radius={22}
                interactive={false}
                pathOptions={{ fill: true, fillColor: '#753bbd', fillOpacity: 0.18, interactive: false, stroke: false }}
              />,
            ])}
            {(appView === 'dashboard' ? mappableDashboardFacilities : mappableFilteredFacilities).map((facility) => {
              const currentStatus = facilityStatus(facility)
              return (
                <Marker
                  key={`${appView}-${facility.id}`}
                  position={facility.coordinates}
                  icon={pinIcon(facility, currentStatus, facility.id === selected?.id)}
                  eventHandlers={{
                    add: (event) => (event.target as L.Marker).getElement()?.setAttribute('aria-label', appView === 'dashboard' ? `Open facility ${String(facility.number).padStart(2, '0')} in Locations` : `Show ${facility.fullAddress} on map`),
                    click: () => chooseFacility(facility),
                    keypress: (event) => {
                      const keyboardEvent = event.originalEvent as KeyboardEvent
                      if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return
                      keyboardEvent.preventDefault()
                      chooseFacility(facility)
                    },
                  }}
                  title={appView === 'locations' ? facility.fullAddress : undefined}
                >
                  {appView === 'dashboard' ? (
                    <Tooltip direction={dashboardPreviewDirection(facility)} offset={[0, -18]} className="dashboard-pin-preview" opacity={1} interactive={false}>
                      <div className="dashboard-pin-preview-content" data-testid="dashboard-pin-preview" data-facility-id={facility.id}>
                        <FacilityPhoto media={getFacilityMedia(facility.id)} variant="thumbnail" />
                        <span>
                          <small>Facility {String(facility.number).padStart(2, '0')}</small>
                          <strong>{getFacilityTitle(facility)}</strong>
                          <span className="dashboard-pin-preview-address">{facility.fullAddress}</span>
                          <OperatingHoursDisplay facilityId={facility.id} variant="preview" />
                          <SquareFootagePreview facilityId={facility.id} />
                        </span>
                      </div>
                    </Tooltip>
                  ) : (
                    <Tooltip permanent direction="right" className="pin-label" opacity={1}>#{facility.number} {facility.city ?? 'TN'}{facility.coordinatePrecision === 'Approximate' ? ' · approx.' : ''}</Tooltip>
                  )}
                </Marker>
              )
            })}
          </MapContainer>

          {appView === 'dashboard' && (
            <>
              <button
                ref={regionToggleRef}
                className={`dashboard-region-toggle${activeRegion ? ' has-active-region' : ''}`}
                type="button"
                aria-expanded={regionPanelOpen}
                aria-controls="dashboard-regions-panel"
                onClick={toggleRegionPanel}
              >
                <MapIcon size={17} />
                <span>Regions</span>
                {activeRegion && <small>{activeRegion.label}</small>}
                <ChevronRight className={regionPanelOpen ? 'is-open' : ''} size={16} />
              </button>

              {regionPanelOpen && (
                <aside id="dashboard-regions-panel" className="dashboard-region-panel" aria-label="Dashboard regions">
                  <header>
                    <div><span className="eyebrow">Roster grouping</span><h2>Regions</h2></div>
                    <button className="icon-button" type="button" aria-label="Close regions" onClick={closeRegionPanel}><X size={18} /></button>
                  </header>
                  <button
                    className={`dashboard-region-all${activeRegion === null ? ' active' : ''}`}
                    type="button"
                    aria-pressed={activeRegion === null}
                    onClick={clearDashboardRegion}
                  >
                    <span><strong>All facilities</strong><small>Nationwide roster</small></span><b>{facilities.length}</b>
                  </button>
                  <div className="dashboard-region-list">
                    {dashboardRegions.map((region) => {
                      const expanded = region.id === expandedRegionId
                      const active = region.id === activeRegionId
                      const regionFacilities = facilities.filter((facility) => region.facilityNumbers.some((number) => number === facility.number))
                      return (
                        <section key={region.id} className={expanded ? 'dashboard-region-group is-expanded' : 'dashboard-region-group'}>
                          <button
                            className="dashboard-region-heading"
                            type="button"
                            aria-expanded={expanded}
                            aria-pressed={active}
                            aria-controls={`dashboard-region-${region.id}`}
                            onClick={() => selectDashboardRegion(region.id)}
                          >
                            <span><strong>{region.label}</strong><small>{regionFacilities.length} {regionFacilities.length === 1 ? 'facility' : 'facilities'}</small></span>
                            <ChevronRight size={16} />
                          </button>
                          {expanded && (
                            <div id={`dashboard-region-${region.id}`} className="dashboard-region-facilities">
                              {regionFacilities.map((facility) => (
                                <button
                                  key={facility.id}
                                  className="dashboard-region-facility"
                                  type="button"
                                  data-testid="dashboard-region-facility"
                                  data-facility-id={facility.id}
                                  aria-label={`Open Facility ${String(facility.number).padStart(2, '0')}, ${getFacilityTitle(facility)}`}
                                  onClick={() => chooseFacility(facility)}
                                >
                                  <FacilityPhoto media={getFacilityMedia(facility.id)} variant="thumbnail" />
                                  <span><small>Facility {String(facility.number).padStart(2, '0')}</small><strong>{getFacilityTitle(facility)}</strong><span>{facility.fullAddress}</span></span>
                                  <ChevronRight size={15} />
                                </button>
                              ))}
                            </div>
                          )}
                        </section>
                      )
                    })}
                  </div>
                    {mappableDashboardFacilities.length > 0 && <div className="dashboard-focus-key"><i aria-hidden="true" /><span>Highlighted facilities</span><small>Illustrative</small></div>}
                </aside>
              )}

              {activeRegion && mappableDashboardFacilities.length > 0 && !regionPanelOpen && (
                <div className="dashboard-focus-badge" data-testid="dashboard-focus-label"><i aria-hidden="true" />Highlighted facilities <small>Illustrative</small></div>
              )}
            </>
          )}

          {appView === 'locations' && <div className="overview-panel">
            <div className="panel-title"><strong>Facility Network</strong><button aria-label="About this prototype" onClick={() => setAboutOpen(true)}><Info size={16} /></button></div>
            <div className="overview-metrics">
              <div><Building2 /><b>{counts.total}</b><span>Facilities</span></div>
              <div><MapPin /><b>{counts.active}</b><span>Active</span></div>
              <div><MapPin /><b>{counts.coming}</b><span>Coming Soon</span></div>
            </div>
          </div>}

          <div className="map-tools" aria-label="Map layers">
            <span><Layers3 size={16} />Layers</span>
            <div className="layer-switch" role="group" aria-label="Map layer">
              <button className={layer === 'street' ? 'active' : ''} aria-pressed={layer === 'street'} onClick={() => setLayer('street')}>Street</button>
              <button className={layer === 'satellite' ? 'active' : ''} aria-pressed={layer === 'satellite'} onClick={() => setLayer('satellite')}>Satellite</button>
            </div>
          </div>
          <button className="recenter-control" aria-label="Recenter map" title={activeRegion ? `View ${activeRegion.label} facilities` : 'View all facilities'} onClick={showOverview}><LocateFixed size={18} /></button>
          {appView === 'locations' && <div className="map-legend" aria-label="Local facility status legend">
            {assignableStatuses.map((item) => <span key={item}><i style={{ background: statusColor[item] }} />{item}</span>)}
          </div>}
          {appView === 'locations' && filtered.length === 0 && <div className="no-map-results"><Search size={20} /><strong>No facilities found</strong><button onClick={() => { setSearch(''); setStatusFilter('All'); setFacilityTypeFilter('All') }}>Clear filters</button></div>}
          {appView === 'locations' && filtered.length > 0 && mappableFilteredFacilities.length === 0 && <div className="no-map-results"><MapPin size={20} /><strong>Map location unavailable</strong><span>The matching facility has no verified coordinates.</span></div>}
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
              <div className="drawer-map-actions">
                <a className="secondary-button" href={googleMapsUrl(selected)} target="_blank" rel="noopener noreferrer">Open in Maps <ExternalLink size={14} /></a>
                {selectedStreetViewUrl ? (
                  <a className="secondary-button" href={selectedStreetViewUrl} target="_blank" rel="noopener noreferrer" title={selected.coordinatePrecision === 'Approximate' ? 'Street-level imagery may be near, not exactly at, this facility.' : undefined}><Camera size={14} />Street View</a>
                ) : (
                  <span className="secondary-button is-disabled" aria-disabled="true"><Camera size={14} />Street View unavailable</span>
                )}
              </div>
              <ApproximateStreetViewNote facility={selected} />
              <dl className="detail-list">
                <div><dt>Status</dt><dd>{selectedStatus}</dd></div>
                <div><dt>Street / building</dt><dd>{selected.street}</dd></div>
                <div><dt>City</dt><dd>{selected.city ?? 'Not provided'}</dd></div>
                <div><dt>State</dt><dd>{selected.state} · {selected.stateName}</dd></div>
                <div><dt>ZIP</dt><dd>{selected.zip ?? 'Not provided'}</dd></div>
                <div className="detail-list-hours"><dt>Operating hours</dt><dd><OperatingHoursDisplay facilityId={selected.id} variant="drawer" /></dd></div>
                <div><dt>Coordinates</dt><dd>{selected.coordinates ? selected.coordinates.map((value) => value.toFixed(6)).join(', ') : 'Unavailable'}</dd></div>
                <div><dt>Coordinate precision</dt><dd>{selected.coordinatePrecision}</dd></div>
                <div><dt>Coordinate source</dt><dd>{selected.coordinateSource}</dd></div>
              </dl>
              <section className="geocode-detail"><strong>Geocoder match</strong><p>{selected.geocoderMatch}</p>{selected.geocodeNote && <p className="geocode-warning"><Info size={15} />{selected.geocodeNote}</p>}</section>
              <p className="source-note"><Info size={15} />{selectedSitePlan ? 'Supplied site-plan facts are available in the Site Plan tab; they are not current availability claims. ' : 'No property or site-plan facts were supplied. '}{selectedUserPhotos ? `${selectedUserPhotos.photos.length} user-provided gallery photo${selectedUserPhotos.photos.length === 1 ? ' is' : 's are'} documented in the Photos tab. ` : ''}{selectedMedia ? `${mediaCategory(selectedMedia)} remains separately documented in the Photos tab.` : 'No existing media record is available for this facility.'}</p>
            </div>
          </section>
        </div>
      )}

      {aboutOpen && (
        <div className="modal-backdrop centered" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAboutOpen(false) }}>
          <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <div className="modal-head"><div><span className="eyebrow">About this experience</span><h2 id="about-title">Reference prototype</h2></div><button className="icon-button" aria-label="Close about" onClick={() => setAboutOpen(false)}><X /></button></div>
            <p>This screenshot-based prototype uses exactly 27 user-provided facility addresses. It is not connected to WMS, YMS, inventory, facility, or operational APIs.</p>
            <p>Fourteen facilities have supplied site plans and thirteen have separate user-provided photo galleries. Twelve facilities have official listing media and fifteen have user-provided photos with documented association limits. All 27 records are Active. A changed Local status is saved only in this browser. All 27 facilities have address-based map coordinates.</p>
            <button className="primary-button" onClick={() => setAboutOpen(false)}>Understood</button>
          </section>
        </div>
      )}
    </div>
  )
}

function SitePlanContent({ facility, sitePlan }: { facility: Facility; sitePlan: FacilitySitePlan }) {
  return (
    <section className="site-plan-detail" aria-label={`Site plan for ${facility.fullAddress}`}>
      <header className="site-plan-heading">
        <div><span className="eyebrow">User-provided site plan</span><h2>Property plan details</h2></div>
        <p>{sitePlan.sourceNote ?? 'Supplied property facts and plan details.'}</p>
      </header>
      <dl className="site-plan-facts">
        {sitePlan.facts.map((fact) => (
          <div key={fact.id}>
            <dt>{fact.label}</dt>
            <dd>{formatSitePlanFact(fact)}</dd>
            {fact.note && <dd className="fact-note">{fact.note}</dd>}
          </div>
        ))}
      </dl>
      <figure className="site-plan-figure">
        <a href={sitePlan.assetUrl} target="_blank" rel="noreferrer" aria-label="Open full-size site plan in a new tab">
          <img src={sitePlan.assetUrl} alt={sitePlan.alt} width={sitePlan.width} height={sitePlan.height} />
          <span><Maximize2 size={15} />Open full size</span>
        </a>
      </figure>
    </section>
  )
}

function OperationsContactCard({ contact }: { contact: FacilityContact }) {
  const phones = contact.phones ?? (contact.phone && contact.phoneHref
    ? [{ label: 'Phone' as const, display: contact.phone, href: contact.phoneHref }]
    : [])

  return (
    <article className="operations-contact-card" data-contact-id={contact.id}>
      {contact.photoUrl ? (
        <img className="operations-contact-photo" src={contact.photoUrl} alt={`Portrait of ${contact.name}`} loading="lazy" />
      ) : (
        <span className="operations-contact-photo is-blank" role="img" aria-label={`Portrait not provided for ${contact.name}`} />
      )}
      <div className="operations-contact-copy">
        <span className="operations-contact-role">{contact.role}</span>
        <h3>{contact.name}</h3>
        <address>
          <a href={`mailto:${contact.email}`}><Mail size={14} />{contact.email}</a>
          {phones.length > 0 ? (
            phones.map((phone) => (
              <a href={`tel:${phone.href}`} key={`${phone.label}-${phone.href}`}>
                <Phone size={14} />
                {phones.length > 1 && <small>{phone.label}</small>}
                {phone.display}
              </a>
            ))
          ) : (
            <span className="operations-contact-missing"><Phone size={14} />Phone not provided</span>
          )}
        </address>
      </div>
    </article>
  )
}

function OperationsContent({ facility, operations }: { facility: Facility; operations?: FacilityOperations }) {
  const accountContacts = operations?.contacts.filter((contact) => contact.group === 'account-management') ?? []
  const operationsContacts = operations?.contacts.filter((contact) => contact.group === 'operations') ?? []

  return (
    <section className="facility-operations" aria-label={`Operations contacts for ${facility.fullAddress}`}>
      <header className="operations-heading">
        <div><span className="eyebrow">Facility operations</span><h2>Hours & contact heads</h2></div>
        <span>{operations?.source ?? 'Contact match pending review'}</span>
      </header>
      <section className="operations-hours" aria-labelledby="operations-hours-title">
        <div><Clock size={19} /><span><small>Facility {String(facility.number).padStart(2, '0')}</small><h3 id="operations-hours-title">Operating hours</h3></span></div>
        <OperatingHoursDisplay facilityId={facility.id} variant="operations" />
      </section>
      {operations ? (
        <>
          {accountContacts.length > 0 && (
            <section className="operations-contact-group" aria-labelledby="account-contacts-title">
              <header><span className="eyebrow">Client team</span><h3 id="account-contacts-title">Account management</h3></header>
              <div className="operations-contact-grid">
                {accountContacts.map((contact) => <OperationsContactCard key={contact.id} contact={contact} />)}
              </div>
            </section>
          )}
          {operationsContacts.length > 0 && (
            <section className="operations-contact-group" aria-labelledby="operations-leaders-title">
              <header><span className="eyebrow">Facility team</span><h3 id="operations-leaders-title">Operations leaders</h3></header>
              <div className="operations-contact-grid">
                {operationsContacts.map((contact) => <OperationsContactCard key={contact.id} contact={contact} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="operations-contacts-empty" role="status">
          <strong>Contacts pending review</strong>
          <span>No staff contacts were confidently matched to this facility.</span>
        </div>
      )}
    </section>
  )
}

function ExistingMediaReference({ facility, media }: { facility: Facility; media: FacilityMedia }) {
  const userProvided = isUserProvidedMedia(media)
  const category = mediaCategory(media)

  return (
    <section className="official-media-reference" aria-label={`Existing media record for ${facility.fullAddress}`}>
      <div className="official-media-reference-heading"><span className="eyebrow">{category}</span><strong>{userProvided ? 'Existing screenshot record' : 'UNIS directory image'}</strong></div>
      <div className="official-media-reference-body">
        <a className="official-media-reference-image" href={media.detail.assetUrl} target="_blank" rel="noreferrer" aria-label={`Open ${category.toLowerCase()} in a new tab`}>
          <img src={media.detail.assetUrl} alt={media.detail.alt} width={media.detail.width} height={media.detail.height} loading="lazy" />
          <span><ExternalLink size={13} />Open image</span>
        </a>
        <div>
          <p>{media.matchNote}</p>
          <dl>
            <div><dt>Source</dt><dd>{mediaSourceValue(media.sourcePage, userProvided ? 'Source reference' : 'Official UNIS page')}</dd></div>
            <div><dt>Retrieved</dt><dd><time dateTime={media.retrievedDate}>{media.retrievedDate}</time></dd></div>
          </dl>
        </div>
      </div>
    </section>
  )
}

function PhotosContent({ facility, media, userPhotos }: { facility: Facility; media?: FacilityMedia; userPhotos?: UserProvidedFacilityPhotos }) {
  if (userPhotos) {
    return (
      <div className="user-photo-content">
        <UserProvidedPhotoGallery address={facility.fullAddress} facilityTitle={getFacilityTitle(facility)} gallery={userPhotos} />
        {media && <ExistingMediaReference facility={facility} media={media} />}
      </div>
    )
  }

  if (!media) {
    return (
      <EmptyState icon={Warehouse} title="Photo not available" body="No responsibly address-matched official photo is available for this facility.">
        <a className="external-photo-link" href={googleMapsPhotoLookupUrl(facility)} target="_blank" rel="noopener noreferrer"><Camera size={15} />View photos on Google Maps <ExternalLink size={13} /></a>
      </EmptyState>
    )
  }

  const userProvided = isUserProvidedMedia(media)

  return (
    <section className="photo-detail" aria-label={`Photo provenance for ${facility.fullAddress}`}>
      <FacilityPhoto media={media} variant="gallery" />
      <div className="photo-caption">
        <div><span className="eyebrow">{mediaCategory(media)}</span><strong>{getFacilityTitle(facility)}</strong></div>
        <p>{media.matchNote}</p>
        <dl>
          <div><dt>Source</dt><dd>{mediaSourceValue(media.sourcePage, userProvided ? 'Google Maps place' : 'Official UNIS page')}</dd></div>
          <div><dt>Original</dt><dd>{mediaSourceValue(media.detail.sourceUrl, userProvided ? 'User-provided source reference' : 'Official image')}</dd></div>
          <div><dt>Thumbnail</dt><dd>{mediaSourceValue(media.thumbnail.sourceUrl, userProvided ? 'User-provided source reference' : 'Directory preview')}</dd></div>
          <div><dt>Retrieved</dt><dd><time dateTime={media.retrievedDate}>{media.retrievedDate}</time></dd></div>
          <div><dt>Detail image</dt><dd>{media.detail.width} × {media.detail.height}</dd></div>
        </dl>
      </div>
    </section>
  )
}

function OverviewContent({ facility, sitePlan, status, onStatusChange }: { facility: Facility; sitePlan?: FacilitySitePlan; status: DisplayStatus; onStatusChange: (status: DisplayStatus) => void }) {
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
        <GoogleMapsOverview facility={facility} />
        {facility.coordinatePrecision === 'Approximate' && <p className="overview-map-note"><Info size={14} />Approximate placement: the marker may be near, not exactly at, this facility.</p>}
        {!hasUsableCoordinates(facility) && <p className="overview-map-note"><Info size={14} />Location unverified: this facility is not pinned on the network map because its geocoder candidates conflict.</p>}
      </section>

      <section className="status-assignment">
        <div><span className="eyebrow">Local planning field</span><h2>Facility status</h2><p>All facilities are Active by default; the status can be changed locally.</p></div>
        <label><span>Local status</span><select aria-label={`Set status for ${facility.fullAddress}`} value={status} onChange={(event) => onStatusChange(event.target.value as DisplayStatus)}>{assignableStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>

      <section className="known-details info-section">
        <h2><Building2 />Known location details</h2>
        <dl>
          <div><dt>Street / building</dt><dd>{facility.street}</dd></div>
          <div><dt>City</dt><dd>{facility.city ?? 'Not provided'}</dd></div>
          <div><dt>State</dt><dd>{facility.state} · {facility.stateName}</dd></div>
          <div><dt>ZIP</dt><dd>{facility.zip ?? 'Not provided'}</dd></div>
          <div className="known-details-hours"><dt>Operating hours</dt><dd><OperatingHoursDisplay facilityId={facility.id} variant="overview" /></dd></div>
        </dl>
      </section>

      {sitePlan ? (
        <section className="property-facts-summary info-section">
          <h2><FileText />Sourced property facts</h2>
          <div className="unavailable-grid">
            {sitePlan.facts.slice(0, 4).map((fact) => <span key={fact.id}><b>{fact.label}</b>{formatSitePlanFact(fact)}</span>)}
          </div>
          <p className="property-facts-note">From the supplied Site Plan record. See that tab for source notes and all facts.</p>
        </section>
      ) : (
        <section className="unavailable-section info-section">
          <h2><FileQuestion />Property attributes</h2>
          <div className="unavailable-grid"><span><b>Total area</b>Not provided</span><span><b>Dock doors</b>Not provided</span><span><b>Grade doors</b>Not provided</span><span><b>Clear height</b>Not provided</span></div>
        </section>
      )}

      <section className="coordinate-section info-section">
        <h2><ShieldCheck />Map placement</h2>
        <div className="coordinate-row"><span className={`precision-chip ${facility.coordinatePrecision === 'Approximate' ? 'approximate' : facility.coordinatePrecision === 'Unavailable' ? 'unavailable' : ''}`}>{facility.coordinatePrecision}</span><span>{facility.coordinateSource}</span></div>
        {facility.geocodeNote && <p className="geocode-warning"><Info size={14} />{facility.geocodeNote}</p>}
      </section>
    </>
  )
}

function GoogleMapsOverview({ facility }: { facility: Facility }) {
  const [embedState, setEmbedState] = useState<'loading' | 'loaded' | 'failed'>('loading')

  useEffect(() => {
    setEmbedState('loading')
    const timeout = window.setTimeout(() => setEmbedState((current) => current === 'loading' ? 'failed' : current), 12_000)
    return () => window.clearTimeout(timeout)
  }, [facility.id])

  const mapsUrl = googleMapsUrl(facility)

  return (
    <div className="overview-map-canvas" aria-busy={embedState === 'loading'}>
      {embedState !== 'failed' ? (
        <iframe
          key={facility.id}
          className="overview-map-embed"
          data-testid="overview-map-embed"
          src={googleMapsEmbedUrl(facility)}
          title={`Google Maps preview for ${facility.fullAddress}`}
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
          allowFullScreen
          onLoad={() => setEmbedState((current) => current === 'loading' ? 'loaded' : current)}
          onErrorCapture={() => setEmbedState('failed')}
        />
      ) : (
        <div className="overview-map-fallback" data-testid="overview-map-fallback" role="status">
          <MapPin size={22} />
          <strong>Map preview unavailable</strong>
          <span>Google Maps could not be loaded in this page.</span>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">Open in Maps <ExternalLink size={13} /></a>
        </div>
      )}
      {embedState === 'loading' && <span className="overview-map-loading" role="status">Loading map...</span>}
      {embedState !== 'failed' && <a className="overview-map-link" data-testid="overview-map-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">Open in Maps <ExternalLink size={14} /></a>}
    </div>
  )
}

export default App
