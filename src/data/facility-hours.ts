export const OPERATING_HOURS_SOURCE = 'User-provided 26-row facility operating-hours list'
export const CONFIRMED_OPERATING_HOURS_SOURCE = 'User-confirmed follow-up operating hours'

type ProvidedOperatingHours = {
  facilityId: string
  status: 'provided'
  startTime: '8:00 AM'
  endTime: '4:30 PM'
  timezone: 'PST' | 'EST' | 'CST'
  days: 'M-F'
  source: typeof OPERATING_HOURS_SOURCE
  sourceRowLabel: string
  matchNote: string
}

type ConfirmedOperatingHours = {
  facilityId: string
  status: 'confirmed'
  startTime: '8:00 AM'
  endTime: '4:30 PM'
  timezone: 'PST' | 'EST' | 'CST' | 'MST'
  days: 'M-F'
  source: typeof CONFIRMED_OPERATING_HOURS_SOURCE
  sourceRowLabel: string
  matchNote: string
}

export type FacilityOperatingHours = ProvidedOperatingHours | ConfirmedOperatingHours

const provided = (
  facilityId: string,
  sourceRowLabel: string,
  timezone: ProvidedOperatingHours['timezone'],
): ProvidedOperatingHours => ({
  facilityId,
  status: 'provided',
  startTime: '8:00 AM',
  endTime: '4:30 PM',
  timezone,
  days: 'M-F',
  source: OPERATING_HOURS_SOURCE,
  sourceRowLabel,
  matchNote: 'Mapped from the supplied row label to this existing roster facility per the user-provided mapping.',
})

const confirmed = (
  facilityId: string,
  timezone: ConfirmedOperatingHours['timezone'],
): ConfirmedOperatingHours => ({
  facilityId,
  status: 'confirmed',
  startTime: '8:00 AM',
  endTime: '4:30 PM',
  timezone,
  days: 'M-F',
  source: CONFIRMED_OPERATING_HOURS_SOURCE,
  sourceRowLabel: 'Follow-up confirmation',
  matchNote: `Confirmed by the user in a follow-up as 8:00 AM–4:30 PM ${timezone} M-F; this confirmation is separate from the original 26-row list.`,
})

const confirmedExpansion = (
  facilityId: string,
  sourceRowLabel: string,
  timezone: ConfirmedOperatingHours['timezone'],
): ConfirmedOperatingHours => ({
  facilityId,
  status: 'confirmed',
  startTime: '8:00 AM',
  endTime: '4:30 PM',
  timezone,
  days: 'M-F',
  source: CONFIRMED_OPERATING_HOURS_SOURCE,
  sourceRowLabel,
  matchNote: `Confirmed by the user with the ten-site roster expansion on 2026-09-28 as 8:00 AM–4:30 PM ${timezone} M-F.`,
})

export const facilityOperatingHours: Record<string, FacilityOperatingHours> = {
  'buena-park-valley-view': provided('buena-park-valley-view', 'CA Buena Park (Valley View)', 'PST'),
  'riverside-alessandro': provided('riverside-alessandro', 'CA Alessandro', 'PST'),
  'moreno-valley-heacock': provided('moreno-valley-heacock', 'CA Heacock', 'PST'),
  'houston-citypark': provided('houston-citypark', 'TX Citypark', 'CST'),
  'roanoke-highway-114': provided('roanoke-highway-114', 'TX Roanoke', 'CST'),
  'pooler-morgan-lakes': provided('pooler-morgan-lakes', 'GA Pooler', 'EST'),
  'pooler-seabrook-building-2': provided('pooler-seabrook-building-2', 'GA Seabrook', 'EST'),
  'summerville-cypress-tradeport': provided('summerville-cypress-tradeport', 'SC Summerville', 'EST'),
  'tennessee-quality-drive': confirmed('tennessee-quality-drive', 'CST'),
  'tacoma-lincoln': provided('tacoma-lincoln', 'WA Lincoln', 'PST'),
  'tacoma-steele': provided('tacoma-steele', 'WA Steele', 'PST'),
  'jacksonville-ignition': provided('jacksonville-ignition', 'FL Jacksonville', 'EST'),
  'las-vegas-marion-building-5': confirmed('las-vegas-marion-building-5', 'PST'),
  'el-paso-emerald-12100': confirmed('el-paso-emerald-12100', 'MST'),
  'long-beach-willow': provided('long-beach-willow', 'CA Willlow', 'PST'),
  'joliet-brandon': provided('joliet-brandon', 'IL Joliet', 'CST'),
  'el-paso-emerald-12102-building-5': confirmed('el-paso-emerald-12102-building-5', 'MST'),
  'waddell-cotton': confirmedExpansion('waddell-cotton', 'AZ Waddell · 6801 N Cotton Ln', 'MST'),
  'ontario-airport': confirmedExpansion('ontario-airport', 'CA Ontario · 3950 E Airport Dr', 'PST'),
  'kent-85th-avenue-range': confirmedExpansion('kent-85th-avenue-range', 'WA Kent · 19801-19821 85th Ave', 'PST'),
  'west-sacramento-overland': confirmedExpansion('west-sacramento-overland', 'CA West Sacramento · 1500 Overland Ct', 'PST'),
  'sparks-vista': confirmedExpansion('sparks-vista', 'NV Sparks · 250 Vista Blvd', 'PST'),
  'houston-navigation': confirmedExpansion('houston-navigation', 'TX Houston · 3401 Navigation Blvd', 'CST'),
  'memphis-delp': confirmedExpansion('memphis-delp', 'TN Memphis · 4444 Delp St', 'CST'),
  'salt-lake-city-jimmy-doolittle': confirmedExpansion('salt-lake-city-jimmy-doolittle', 'UT Salt Lake City · 485 N Jimmy Doolittle Rd', 'MST'),
  'somerset-cottontail': confirmedExpansion('somerset-cottontail', 'NJ Somerset · 101 Cottontail Ln', 'EST'),
  'plano-10th-f-avenue': confirmedExpansion('plano-10th-f-avenue', 'TX Plano · 910 10th Street / 880 F Ave.', 'CST'),
}

export function getFacilityOperatingHours(facilityId: string) {
  return facilityOperatingHours[facilityId]
}

export function formatOperatingHours(hours: FacilityOperatingHours) {
  return `${hours.startTime}–${hours.endTime} ${hours.timezone} ${hours.days}`
}
