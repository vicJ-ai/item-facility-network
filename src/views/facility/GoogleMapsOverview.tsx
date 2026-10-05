import { useEffect, useState } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import type { Facility } from '../../data/facilities'
import { googleMapsEmbedUrl, googleMapsUrl } from '../../lib/facility-links'

const EMBED_TIMEOUT_MS = 12_000

/** The Google Maps embed on the Overview tab. Render it with `key={facility.id}` so each facility starts loading afresh. */
export function GoogleMapsOverview({ facility }: { facility: Facility }) {
  const [embedState, setEmbedState] = useState<'loading' | 'loaded' | 'failed'>('loading')

  useEffect(() => {
    const timeout = window.setTimeout(() => setEmbedState((current) => current === 'loading' ? 'failed' : current), EMBED_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [])

  const mapsUrl = googleMapsUrl(facility)

  return (
    <div className="overview-map-canvas" aria-busy={embedState === 'loading'}>
      {embedState !== 'failed' ? (
        <iframe
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
