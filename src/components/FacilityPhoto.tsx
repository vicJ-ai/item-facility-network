import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { FacilityMedia } from '../data/facility-media'

type FacilityPhotoProps = {
  media?: FacilityMedia
  variant: 'thumbnail' | 'detail' | 'gallery' | 'drawer'
}

export function FacilityPhoto({ media, variant }: FacilityPhotoProps) {
  const [failed, setFailed] = useState(false)
  const asset = variant === 'thumbnail' ? media?.thumbnail : media?.detail

  useEffect(() => setFailed(false), [asset?.assetUrl])

  if (!asset || failed) {
    return (
      <span className={`facility-photo facility-photo-${variant} photo-fallback`} data-testid="photo-fallback" role="img" aria-label="Photo not available">
        <ImageOff aria-hidden="true" />
        <span>Photo not available</span>
      </span>
    )
  }

  return (
    <span className={`facility-photo facility-photo-${variant}`} data-testid="facility-photo">
      <img
        src={asset.assetUrl}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        loading={variant === 'thumbnail' ? 'lazy' : 'eager'}
        onError={() => setFailed(true)}
      />
    </span>
  )
}
