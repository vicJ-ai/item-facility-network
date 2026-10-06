import { Clock } from 'lucide-react'
import { getFacilityOperatingHours } from '../data/facility-hours'

export function OperatingHoursDisplay({ facilityId, variant }: { facilityId: string; variant: 'preview' | 'overview' | 'drawer' | 'operations' }) {
  const hours = getFacilityOperatingHours(facilityId)

  if (!hours) {
    return (
      <span className={`operating-hours operating-hours-${variant}`} data-testid={`operating-hours-${variant}`} data-hours-status="not-provided">
        <Clock size={variant === 'preview' ? 12 : 14} />
        <span><strong>Hours not provided</strong></span>
      </span>
    )
  }

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
