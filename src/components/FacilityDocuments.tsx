import { useState } from 'react'
import { CheckCircle2, Download, FileText, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { Facility } from '../data/facilities'
import type { FacilityOperatingHours } from '../data/facility-hours'
import type { FacilityMedia } from '../data/facility-media'
import type { FacilityOperations } from '../types/operations'
import type { FacilitySitePlan } from '../data/facility-site-plans'
import type { UserProvidedFacilityPhotos } from '../data/facility-user-photos'
import type { FacilityProfileAvailability } from '../pdf/facility-profile'

type FacilityDocumentsProps = {
  facility: Facility
  facilityTitle: string
  operatingHours?: FacilityOperatingHours
  media?: FacilityMedia
  operations?: FacilityOperations
  operationsAccess: 'public' | 'authorized'
  operationsLoading?: boolean
  availableSpace?: FacilityProfileAvailability
  sitePlan?: FacilitySitePlan
  userPhotos?: UserProvidedFacilityPhotos
}

type DownloadState = 'idle' | 'loading' | 'success' | 'error'

function existingMediaLabel(media: FacilityMedia) {
  if (media.verification === 'official-facility-sheet') return 'Official facility sheet photo'
  return media.verification.startsWith('user-provided') ? 'Existing user-provided photo' : 'Official listing photo'
}

export function FacilityDocuments({ facility, facilityTitle, operatingHours, media, operations, operationsAccess, operationsLoading = false, availableSpace, sitePlan, userPhotos }: FacilityDocumentsProps) {
  const [state, setState] = useState<DownloadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const downloadProfile = async () => {
    if (state === 'loading') return
    setState('loading')
    setErrorMessage('')
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    try {
      const { generateFacilityProfilePdf, getFacilityProfileFilename } = await import('../pdf/facility-profile')
      const bytes = await generateFacilityProfilePdf({ facility, facilityTitle, operatingHours, media, operations, operationsAccess, availableSpace, sitePlan, userPhotos })
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = getFacilityProfileFilename(facility)
      anchor.hidden = true
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
      setState('success')
    } catch (error) {
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'The facility profile could not be generated.')
    }
  }

  return (
    <section className="facility-documents" aria-labelledby="facility-documents-title">
      <div className="documents-icon" aria-hidden="true"><FileText /></div>
      <div className="documents-copy">
        <span className="eyebrow">On-demand document</span>
        <h2 id="facility-documents-title">Facility profile PDF</h2>
        <p>A four-page profile generated from the current portal data for this facility.</p>
        <ul aria-label="Profile contents">
          <li>Facility overview and {operationsAccess === 'public' ? 'public contact access status' : operations ? 'contact details' : 'contact review status'}</li>
          <li>{sitePlan ? 'Supplied site plan and recorded facts' : 'Explicit site-plan unavailable state'}</li>
          <li>{userPhotos ? `${userPhotos.photos.length} user-provided photo${userPhotos.photos.length === 1 ? '' : 's'}` : media ? existingMediaLabel(media) : 'Explicit photo unavailable state'}</li>
        </ul>
      </div>
      <button className="primary-button documents-download" type="button" disabled={state === 'loading' || operationsLoading} onClick={downloadProfile}>
        {state === 'loading' ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}
        {operationsLoading ? 'Loading contact details…' : state === 'loading' ? 'Generating PDF…' : 'Download facility profile PDF'}
      </button>
      <div className={`documents-status ${state}`} aria-live="polite" role="status">
        {state === 'success' && <><CheckCircle2 size={15} />PDF download ready.</>}
        {state === 'error' && <><TriangleAlert size={15} />{errorMessage}</>}
      </div>
    </section>
  )
}
