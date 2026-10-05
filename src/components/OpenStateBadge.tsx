import { Clock, Moon, Sun } from 'lucide-react'
import type { FacilityOpenState } from '../lib/facility-open'

export function OpenStateBadge({ state, variant }: { state: FacilityOpenState; variant: 'compact' | 'full' }) {
  // The full variant always sits beside OperatingHoursDisplay, which already says the hours are missing.
  if (!state.hoursKnown && variant === 'full') return null
  if (!state.hoursKnown) {
    return (
      <span className={`open-state open-state-${variant} is-unknown`} data-testid="open-state" data-open="unknown" title="Operating hours not provided">
        <Clock size={variant === 'compact' ? 12 : 13} aria-hidden="true" />
        <span><b>{variant === 'compact' ? 'No hours' : 'Hours not provided'}</b></span>
      </span>
    )
  }
  const Icon = state.isOpen ? Sun : Moon
  return (
    <span className={`open-state open-state-${variant} ${state.isOpen ? 'is-open' : 'is-closed'}`} data-testid="open-state" data-open={state.isOpen} title={`${state.summary} · ${state.localTime} at facility`}>
      <Icon size={variant === 'compact' ? 12 : 13} aria-hidden="true" />
      <span>
        <b>{variant === 'compact' ? (state.isOpen ? 'Open' : 'Closed') : state.summary}</b>
        {variant === 'full' && <small>{state.localTime} at facility</small>}
      </span>
    </span>
  )
}
