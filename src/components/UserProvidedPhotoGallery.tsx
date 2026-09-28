import { useState } from 'react'
import { ImageOff, Maximize2 } from 'lucide-react'
import type { UserProvidedFacilityPhoto, UserProvidedFacilityPhotos } from '../data/facility-user-photos'

function UserProvidedPhotoCard({ photo, featured }: { photo: UserProvidedFacilityPhoto; featured: boolean }) {
  const [failed, setFailed] = useState(false)

  return (
    <a
      className={`user-photo-card${featured ? ' featured' : ''}`}
      href={photo.assetUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open full-size ${photo.label.toLowerCase()} photo in a new tab`}
      data-photo-id={photo.id}
    >
      <span className="user-photo-frame">
        {failed ? (
          <span className="user-photo-error" role="img" aria-label={`${photo.label} photo unavailable`}><ImageOff />Image unavailable</span>
        ) : (
          <img src={photo.assetUrl} alt={photo.alt} width={photo.width} height={photo.height} loading={featured ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
        )}
        <span className="user-photo-open"><Maximize2 size={14} />Full size</span>
      </span>
      <span className="user-photo-caption"><strong>{photo.label}</strong><span>{photo.width.toLocaleString('en-US')} × {photo.height.toLocaleString('en-US')}</span></span>
    </a>
  )
}

export function UserProvidedPhotoGallery({ address, facilityTitle, gallery }: { address: string; facilityTitle: string; gallery: UserProvidedFacilityPhotos }) {
  return (
    <section className="user-photo-gallery" aria-label={`User-provided photos for ${address}`}>
      <header className="user-photo-heading">
        <div><span className="eyebrow">User-provided media</span><h2>{facilityTitle}</h2></div>
        <span>{gallery.photos.length} photos</span>
      </header>
      <div className="user-photo-grid">
        {gallery.photos.map((photo) => <UserProvidedPhotoCard key={photo.id} photo={photo} featured={photo.id === gallery.coverPhotoId} />)}
      </div>
    </section>
  )
}
