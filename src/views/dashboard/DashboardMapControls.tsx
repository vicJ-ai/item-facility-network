import type { RefObject } from 'react'
import { ChevronRight, Clapperboard, Map as MapIcon } from 'lucide-react'
import type { dashboardRegions, DashboardRegionId } from '../../data/dashboard-regions'
import type { Facility } from '../../data/facilities'
import { warmPreviewTour } from '../deferred'
import { RegionPanel } from './RegionPanel'

type DashboardMapControlsProps = {
  previewToggleRef: RefObject<HTMLButtonElement | null>
  onStartPreview: () => void
  regionToggleRef: RefObject<HTMLButtonElement | null>
  activeRegion: (typeof dashboardRegions)[number] | null
  expandedRegionId: DashboardRegionId | null
  panelOpen: boolean
  /** Whether any facility in the current selection is pinned, and so highlighted, on the map. */
  hasHighlightedFacilities: boolean
  onTogglePanel: () => void
  onClosePanel: () => void
  onClearRegion: () => void
  onSelectRegion: (regionId: DashboardRegionId) => void
  onChooseFacility: (facility: Facility) => void
}

/** The Dashboard's Preview and Regions buttons, the Regions panel, and the highlighted-facilities badge. */
export function DashboardMapControls({ previewToggleRef, onStartPreview, regionToggleRef, activeRegion, expandedRegionId, panelOpen, hasHighlightedFacilities, onTogglePanel, onClosePanel, onClearRegion, onSelectRegion, onChooseFacility }: DashboardMapControlsProps) {
  return (
    <>
      <button ref={previewToggleRef} className="dashboard-preview-toggle" type="button" onClick={onStartPreview} onPointerEnter={warmPreviewTour} onFocus={warmPreviewTour} title="Play a cinematic tour of every region and facility">
        <Clapperboard size={16} aria-hidden="true" />
        <span>Preview</span>
      </button>
      <button
        ref={regionToggleRef}
        className={`dashboard-region-toggle${activeRegion ? ' has-active-region' : ''}`}
        type="button"
        aria-expanded={panelOpen}
        aria-controls="dashboard-regions-panel"
        onClick={onTogglePanel}
      >
        <MapIcon size={17} />
        <span>Regions</span>
        {activeRegion && <small>{activeRegion.label}</small>}
        <ChevronRight className={panelOpen ? 'is-open' : ''} size={16} />
      </button>

      {panelOpen && (
        <RegionPanel
          activeRegionId={activeRegion?.id ?? null}
          expandedRegionId={expandedRegionId}
          showFocusKey={hasHighlightedFacilities}
          onClose={onClosePanel}
          onClear={onClearRegion}
          onSelectRegion={onSelectRegion}
          onChooseFacility={onChooseFacility}
        />
      )}

      {activeRegion && hasHighlightedFacilities && !panelOpen && (
        <div className="dashboard-focus-badge" data-testid="dashboard-focus-label"><i aria-hidden="true" />Highlighted facilities <small>Illustrative</small></div>
      )}
    </>
  )
}
