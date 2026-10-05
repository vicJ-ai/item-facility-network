import { memo } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { FacilityPhoto } from '../../components/FacilityPhoto'
import { dashboardRegions, type DashboardRegionId } from '../../data/dashboard-regions'
import { networkFacilities, type Facility } from '../../data/facilities'
import { getFacilityMedia } from '../../data/facility-media'
import { formatFacilityNumber, getFacilityTitle } from '../../lib/facility-display'
import { getRegionFacilities } from '../../lib/region-facilities'

type RegionPanelProps = {
  activeRegionId: DashboardRegionId | null
  expandedRegionId: DashboardRegionId | null
  /** Shows the key for the highlighted facilities on the map. */
  showFocusKey: boolean
  onClose: () => void
  onClear: () => void
  onSelectRegion: (regionId: DashboardRegionId) => void
  onChooseFacility: (facility: Facility) => void
}

/** The Dashboard's list of regions; choosing one highlights it on the map and lists its facilities. */
export const RegionPanel = memo(function RegionPanel({ activeRegionId, expandedRegionId, showFocusKey, onClose, onClear, onSelectRegion, onChooseFacility }: RegionPanelProps) {
  return (
    <aside id="dashboard-regions-panel" className="dashboard-region-panel" aria-label="Dashboard regions">
      <header>
        <div><span className="eyebrow">Roster grouping</span><h2>Regions</h2></div>
        <button className="icon-button" type="button" aria-label="Close regions" onClick={onClose}><X size={18} /></button>
      </header>
      <button
        className={`dashboard-region-all${activeRegionId === null ? ' active' : ''}`}
        type="button"
        aria-pressed={activeRegionId === null}
        onClick={onClear}
      >
        <span><strong>All facilities</strong><small>Nationwide roster</small></span><b>{networkFacilities.length}</b>
      </button>
      <div className="dashboard-region-list">
        {dashboardRegions.map((region) => {
          const expanded = region.id === expandedRegionId
          const regionFacilities = getRegionFacilities(region.id)
          // A region whose facilities are all archived drops out of the panel, as it does from the tour.
          if (regionFacilities.length === 0) return null
          return (
            <section key={region.id} className={expanded ? 'dashboard-region-group is-expanded' : 'dashboard-region-group'}>
              <button
                className="dashboard-region-heading"
                type="button"
                aria-expanded={expanded}
                aria-pressed={region.id === activeRegionId}
                aria-controls={`dashboard-region-${region.id}`}
                onClick={() => onSelectRegion(region.id)}
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
                      aria-label={`Open Facility ${formatFacilityNumber(facility)}, ${getFacilityTitle(facility)}`}
                      onClick={() => onChooseFacility(facility)}
                    >
                      <FacilityPhoto media={getFacilityMedia(facility.id)} variant="thumbnail" />
                      <span><small>Facility {formatFacilityNumber(facility)}</small><strong>{getFacilityTitle(facility)}</strong><span>{facility.fullAddress}</span></span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
      {showFocusKey && <div className="dashboard-focus-key"><i aria-hidden="true" /><span>Highlighted facilities</span><small>Illustrative</small></div>}
    </aside>
  )
})
