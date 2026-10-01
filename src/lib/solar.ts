// Low-precision solar ephemeris (Astronomical Almanac approximation). Accurate to about
// 0.01° between 1950 and 2050, which is far finer than the map shading needs.

const DEG = Math.PI / 180
const UNIX_EPOCH_JULIAN_DATE = 2440587.5
const J2000_JULIAN_DATE = 2451545
const MS_PER_DAY = 86_400_000

// Standard sunrise/sunset altitude: the sun's upper limb on the horizon, including refraction.
export const SUNSET_ALTITUDE = -0.833
// Astronomical twilight ends when the sun is 18° below the horizon.
export const ASTRONOMICAL_NIGHT_ALTITUDE = -18

export type SubsolarPoint = { latitude: number; longitude: number }

export function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180
}

/** The point on Earth where the sun is directly overhead at `date`. */
export function getSubsolarPoint(date: Date): SubsolarPoint {
  const days = date.getTime() / MS_PER_DAY + UNIX_EPOCH_JULIAN_DATE - J2000_JULIAN_DATE
  const meanLongitude = 280.46 + 0.9856474 * days
  const meanAnomaly = (357.528 + 0.9856003 * days) * DEG
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG
  const obliquity = (23.439 - 0.0000004 * days) * DEG
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
  const greenwichSiderealTime = 280.46061837 + 360.98564736629 * days
  return {
    latitude: declination / DEG,
    longitude: normalizeLongitude(rightAscension / DEG - greenwichSiderealTime),
  }
}

/** Solar altitude in degrees above the horizon at a location, for a given subsolar point. */
export function getSolarAltitude(sun: SubsolarPoint, latitude: number, longitude: number) {
  const lat = latitude * DEG
  const declination = sun.latitude * DEG
  const hourAngle = (longitude - sun.longitude) * DEG
  const sine = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  return Math.asin(Math.min(1, Math.max(-1, sine))) / DEG
}

/**
 * Night shading strength from 0 (daylight) to 1 (astronomical night). It eases out through
 * civil, nautical, and astronomical twilight: about half strength by the end of civil
 * twilight (-6°), so the terminator reads clearly while still fading softly into full night.
 */
export function getNightDarkness(altitude: number) {
  if (altitude >= SUNSET_ALTITUDE) return 0
  if (altitude <= ASTRONOMICAL_NIGHT_ALTITUDE) return 1
  const progress = (SUNSET_ALTITUDE - altitude) / (SUNSET_ALTITUDE - ASTRONOMICAL_NIGHT_ALTITUDE)
  return 1 - (1 - progress) ** 2
}
