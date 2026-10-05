import { Camera, ExternalLink, Warehouse } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { FacilityPhoto } from '../../components/FacilityPhoto'
import { UserProvidedPhotoGallery } from '../../components/UserProvidedPhotoGallery'
import type { Facility } from '../../data/facilities'
import type { FacilityMedia } from '../../data/facility-media'
import type { UserProvidedFacilityPhotos } from '../../data/facility-user-photos'
import { getFacilityTitle, isUserProvidedMedia, mediaCategory } from '../../lib/facility-display'
import { googleMapsPhotoLookupUrl } from '../../lib/facility-links'

/** A source value: a link when it is a URL, otherwise the text itself. */
function MediaSourceValue({ value, linkedLabel }: { value: string; linkedLabel: string }) {
  if (!value.startsWith('http')) return value
  return <a href={value} target="_blank" rel="noreferrer">{linkedLabel} <ExternalLink size={12} /></a>
}

export function PhotosTab({ facility, media, userPhotos }: { facility: Facility; media?: FacilityMedia; userPhotos?: UserProvidedFacilityPhotos }) {
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
          <div><dt>Source</dt><dd><MediaSourceValue value={media.sourcePage} linkedLabel={userProvided ? 'Google Maps place' : 'Official UNIS page'} /></dd></div>
          <div><dt>Original</dt><dd><MediaSourceValue value={media.detail.sourceUrl} linkedLabel={userProvided ? 'User-provided source reference' : 'Official image'} /></dd></div>
          <div><dt>Thumbnail</dt><dd><MediaSourceValue value={media.thumbnail.sourceUrl} linkedLabel={userProvided ? 'User-provided source reference' : 'Directory preview'} /></dd></div>
          <div><dt>Retrieved</dt><dd><time dateTime={media.retrievedDate}>{media.retrievedDate}</time></dd></div>
          <div><dt>Detail image</dt><dd>{media.detail.width} × {media.detail.height}</dd></div>
        </dl>
      </div>
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
            <div><dt>Source</dt><dd><MediaSourceValue value={media.sourcePage} linkedLabel={userProvided ? 'Source reference' : 'Official UNIS page'} /></dd></div>
            <div><dt>Retrieved</dt><dd><time dateTime={media.retrievedDate}>{media.retrievedDate}</time></dd></div>
          </dl>
        </div>
      </div>
    </section>
  )
}
