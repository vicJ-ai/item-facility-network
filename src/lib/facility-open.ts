import type { Facility } from '../data/facilities'
import type { FacilityOperatingHours } from '../data/facility-hours'

// The supplied hours use zone labels ("PST", "MST", ...) that describe local wall-clock
// time at the facility, so they map to IANA zones and follow daylight saving time.
const timeZoneByLabel: Record<FacilityOperatingHours['timezone'], string> = {
  PST: 'America/Los_Angeles',
  MST: 'America/Denver',
  CST: 'America/Chicago',
  EST: 'America/New_York',
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const openDaysByLabel: Record<FacilityOperatingHours['days'], readonly number[]> = {
  'M-F': [1, 2, 3, 4, 5],
}

export type FacilityOpenState = {
  isOpen: boolean
  /** False when no operating hours were supplied; isOpen is then false and no local time is shown. */
  hoursKnown: boolean
  timeZone?: string
  /** Facility-local wall-clock time, for example "10:08 AM PDT". */
  localTime: string
  /** Short status with the next change, for example "Open · closes 4:30 PM". */
  summary: string
}

export function getFacilityTimeZone(facility: Pick<Facility, 'state'>, hours: Pick<FacilityOperatingHours, 'timezone'>) {
  // Arizona stays on Mountain Standard Time all year; El Paso and Utah observe daylight saving time.
  if (hours.timezone === 'MST' && facility.state === 'AZ') return 'America/Phoenix'
  return timeZoneByLabel[hours.timezone]
}

export function parseClockTime(value: string) {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(value)
  if (!match) throw new Error(`Unrecognized clock time: ${value}`)
  const hour = (Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0)
  return hour * 60 + Number(match[2])
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()
const clockFormatters = new Map<string, Intl.DateTimeFormat>()

function cachedFormatter(cache: Map<string, Intl.DateTimeFormat>, timeZone: string, options: Intl.DateTimeFormatOptions) {
  let formatter = cache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, ...options })
    cache.set(timeZone, formatter)
  }
  return formatter
}

function zonedWeekdayAndMinutes(date: Date, timeZone: string) {
  const parts = cachedFormatter(partsFormatters, timeZone, { weekday: 'short', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return {
    weekday: weekdayNames.indexOf(part('weekday') as (typeof weekdayNames)[number]),
    minutes: (Number(part('hour')) % 24) * 60 + Number(part('minute')),
  }
}

export function formatFacilityLocalTime(date: Date, timeZone: string) {
  return cachedFormatter(clockFormatters, timeZone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date)
}

/** Whether a facility is inside its supplied operating hours at `date`. Holidays are not modeled. */
export function getFacilityOpenState(facility: Pick<Facility, 'state'>, hours: FacilityOperatingHours | undefined, date: Date): FacilityOpenState {
  if (!hours) return { isOpen: false, hoursKnown: false, localTime: '', summary: 'Hours not provided' }
  const timeZone = getFacilityTimeZone(facility, hours)
  const openDays = openDaysByLabel[hours.days]
  const opensAt = parseClockTime(hours.startTime)
  const closesAt = parseClockTime(hours.endTime)
  const { weekday, minutes } = zonedWeekdayAndMinutes(date, timeZone)
  const openToday = openDays.includes(weekday)
  const isOpen = openToday && minutes >= opensAt && minutes < closesAt
  const localTime = formatFacilityLocalTime(date, timeZone)

  if (isOpen) return { isOpen, hoursKnown: true, timeZone, localTime, summary: `Open · closes ${hours.endTime}` }
  if (openToday && minutes < opensAt) return { isOpen, hoursKnown: true, timeZone, localTime, summary: `Closed · opens ${hours.startTime}` }

  let daysAhead = 1
  while (!openDays.includes((weekday + daysAhead) % 7)) daysAhead += 1
  const nextDay = daysAhead === 1 ? 'tomorrow' : weekdayNames[(weekday + daysAhead) % 7]
  return { isOpen, hoursKnown: true, timeZone, localTime, summary: `Closed · opens ${nextDay} ${hours.startTime}` }
}
