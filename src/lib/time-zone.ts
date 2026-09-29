// Wall-clock helpers for an arbitrary IANA time zone, so the time control can show and edit
// the map time in a zone other than the viewer's device zone.

const DAY_MS = 86_400_000

export type WallClock ={ year: number; month: number; day: number; hour: number; minute: number }

/** Zones the supplied facility hours use, listed first in the picker. */
export const FACILITY_TIME_ZONES = [
  { id: 'America/Los_Angeles', label: 'Pacific' },
  { id: 'America/Denver', label: 'Mountain' },
  { id: 'America/Phoenix', label: 'Arizona' },
  { id: 'America/Chicago', label: 'Central' },
  { id: 'America/New_York', label: 'Eastern' },
  { id: 'UTC', label: 'UTC' },
] as const

export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** Every zone the browser knows, or just the facility zones where `supportedValuesOf` is missing. */
export function getSupportedTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] }
  return intl.supportedValuesOf?.('timeZone') ?? FACILITY_TIME_ZONES.map((zone) => zone.id)
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string) {
  let formatter = partsFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
    partsFormatters.set(timeZone, formatter)
  }
  return formatter
}

export function getWallClock(time: number, timeZone: string): WallClock {
  const parts = partsFormatter(timeZone).formatToParts(time)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour') % 24, minute: part('minute') }
}

/** Milliseconds the zone is ahead of UTC at `time`. */
function zoneOffset(time: number, timeZone: string) {
  const parts = partsFormatter(timeZone).formatToParts(time)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value)
  const asUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour') % 24, part('minute'), part('second'))
  return asUtc - Math.floor(time / 1000) * 1000
}

/**
 * Converts a wall-clock time in `timeZone` to an instant. A time skipped by a daylight saving
 * jump resolves forward past the gap; a repeated time resolves to its first occurrence.
 */
export function fromWallClock(wallClock: WallClock, timeZone: string) {
  const { year, month, day, hour, minute } = wallClock
  const asUtc = Date.UTC(year, month - 1, day, hour, minute)
  // Zone offsets change at most once within a day, so the offsets a day either side cover every candidate.
  const offsetBefore = zoneOffset(asUtc - DAY_MS, timeZone)
  const offsetAfter = zoneOffset(asUtc + DAY_MS, timeZone)
  const matches = [asUtc - offsetBefore, asUtc - offsetAfter].filter((time) => {
    const shown = getWallClock(time, timeZone)
    return shown.year === year && shown.month === month && shown.day === day && shown.hour === hour && shown.minute === minute
  })
  return matches.length > 0 ? Math.min(...matches) : asUtc - offsetBefore
}
