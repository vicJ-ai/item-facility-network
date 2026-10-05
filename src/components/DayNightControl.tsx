import { useMemo, useState } from 'react'
import { ChevronDown, Moon, RotateCcw, Sun } from 'lucide-react'
import { FACILITY_TIME_ZONES, fromWallClock, getDeviceTimeZone, getSupportedTimeZones, getWallClock } from '../lib/time-zone'

const MINUTES_PER_DAY = 1440
// The solar model is accurate for 1950–2050, so typed dates stay inside that window.
const MIN_DATE_TIME = '1950-01-01T00:00'
const MAX_DATE_TIME = '2050-12-31T23:59'

const utcFormat = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })
const facilityZoneIds = new Set<string>(FACILITY_TIME_ZONES.map((zone) => zone.id))

function zoneLabel(timeZone: string) {
  return timeZone.replaceAll('_', ' ').replaceAll('/', ' / ')
}

/** Formats a time as the `YYYY-MM-DDTHH:mm` value used by `<input type="datetime-local">`, in `timeZone`. */
function toDateTimeLocalValue(time: number, timeZone: string) {
  const { year, month, day, hour, minute } = getWallClock(time, timeZone)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

/** Parses a `datetime-local` value as wall-clock time in `timeZone`, or returns null for incomplete or out-of-range input. */
function parseDateTimeLocalValue(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match || value < MIN_DATE_TIME || value > MAX_DATE_TIME) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  const time = fromWallClock({ year, month, day, hour, minute }, timeZone)
  return Number.isFinite(time) ? time : null
}

type DayNightControlProps = {
  time: number
  live: boolean
  shading: boolean
  expanded: boolean
  /** IANA zone the clock, date field, and slider use; null follows the viewer's device. */
  timeZone: string | null
  openCount: number
  total: number
  onShadingChange: (shading: boolean) => void
  onExpandedChange: (expanded: boolean) => void
  onTimeZoneChange: (timeZone: string | null) => void
  onTimeChange: (time: number) => void
  onReturnToNow: () => void
}

export function DayNightControl({ time, live, shading, expanded, timeZone, openCount, total, onShadingChange, onExpandedChange, onTimeZoneChange, onTimeChange, onReturnToNow }: DayNightControlProps) {
  // While the field is focused, keep what the viewer typed so the live clock tick cannot overwrite it.
  const [dateTimeDraft, setDateTimeDraft] = useState<string | null>(null)
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), [])
  const otherTimeZones = useMemo(() => getSupportedTimeZones().filter((zone) => !facilityZoneIds.has(zone)), [])
  const activeTimeZone = timeZone ?? deviceTimeZone
  const { clockFormat, dateFormat } = useMemo(() => ({
    clockFormat: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: activeTimeZone }),
    dateFormat: new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: activeTimeZone }),
  }), [activeTimeZone])
  const wallClock = getWallClock(time, activeTimeZone)
  const minutes = wallClock.hour * 60 + wallClock.minute
  const clockLabel = clockFormat.format(time)
  const dateLabel = dateFormat.format(time)

  const setTimeOfDay = (value: number) => {
    onTimeChange(fromWallClock({ ...wallClock, hour: Math.floor(value / 60), minute: value % 60 }, activeTimeZone))
  }

  const setDateTime = (value: string) => {
    setDateTimeDraft(value)
    const next = parseDateTimeLocalValue(value, activeTimeZone)
    if (next !== null) onTimeChange(next)
  }

  return (
    <section className={`daynight-control${expanded ? ' is-expanded' : ''}`} aria-label="Day and night" data-testid="daynight-control" data-time={new Date(time).toISOString()} data-live={live} data-time-zone={activeTimeZone}>
      <div className="daynight-summary">
        <button
          className={`daynight-toggle${shading ? ' is-on' : ''}`}
          type="button"
          aria-pressed={shading}
          aria-label="Day and night shading"
          title={shading ? 'Hide night shading' : 'Show night shading'}
          onClick={() => onShadingChange(!shading)}
        >
          {shading ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <div className="daynight-clock">
          <strong><span className={`daynight-live-dot${live ? ' is-live' : ''}`} aria-hidden="true" />{clockLabel}</strong>
          <span>{activeTimeZone === 'UTC' ? dateLabel : `${dateLabel} · ${utcFormat.format(time)} UTC`}</span>
        </div>
        <span className="daynight-open-count" data-testid="daynight-open-count" title="Facilities inside their supplied operating hours at this time">
          <b>{openCount}</b><span>/{total} open</span>
        </span>
        <button
          className="icon-button daynight-expand"
          type="button"
          aria-expanded={expanded}
          aria-controls="daynight-timeline"
          aria-label={expanded ? 'Hide time controls' : 'Show time controls'}
          onClick={() => onExpandedChange(!expanded)}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {expanded && (
        <div id="daynight-timeline" className="daynight-timeline">
          <label className="daynight-range">
            <span>Zone</span>
            <select
              className="daynight-datetime daynight-zone"
              value={timeZone ?? ''}
              aria-label="Time zone"
              onChange={(event) => onTimeZoneChange(event.target.value || null)}
            >
              <option value="">Device time · {zoneLabel(deviceTimeZone)}</option>
              <optgroup label="Facility time zones">
                {FACILITY_TIME_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.id === 'UTC' ? 'UTC' : `${zone.label} · ${zoneLabel(zone.id)}`}</option>
                ))}
              </optgroup>
              <optgroup label="All time zones">
                {otherTimeZones.map((zone) => <option key={zone} value={zone}>{zoneLabel(zone)}</option>)}
              </optgroup>
            </select>
          </label>
          <label className="daynight-range">
            <span>Date</span>
            <input
              className="daynight-datetime"
              type="datetime-local"
              min={MIN_DATE_TIME}
              max={MAX_DATE_TIME}
              value={dateTimeDraft ?? toDateTimeLocalValue(time, activeTimeZone)}
              aria-label="Date and time"
              onFocus={() => setDateTimeDraft(toDateTimeLocalValue(time, activeTimeZone))}
              onBlur={() => setDateTimeDraft(null)}
              onChange={(event) => setDateTime(event.target.value)}
            />
          </label>
          <label className="daynight-range">
            <span>Time</span>
            <input type="range" min={0} max={MINUTES_PER_DAY - 5} step={5} value={minutes} aria-label="Time of day" aria-valuetext={clockLabel} onChange={(event) => setTimeOfDay(Number(event.target.value))} />
          </label>
          <div className="daynight-footer">
            <span className="daynight-legend" aria-label="Operating hours legend">
              <span><i className="is-open" aria-hidden="true" />Open</span>
              <span><i className="is-closed" aria-hidden="true" />Closed</span>
            </span>
            <button className="daynight-now" type="button" disabled={live} onClick={onReturnToNow}>
              {live ? 'Live' : <><RotateCcw size={13} />Back to now</>}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
