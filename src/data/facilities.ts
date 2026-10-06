export type FacilityStatus = 'Active' | 'Coming Soon' | 'Planned'
// Archived is never set through the per-browser status dropdown, so every viewer sees the same archived facilities. It
// is set here, or by an administrator in the Operations workspace (stored on the server and merged in by
// src/lib/facility-network.ts). An archived facility keeps all of its records but is left out of the live network.
export type DisplayStatus = FacilityStatus | 'Unassigned' | 'Archived'
export type CoordinatePrecision = 'Point address' | 'Street address' | 'Approximate' | 'Unavailable'
export type FacilityType = 'UF ONLY' | 'UF/CUBEWORKS' | 'Samsung Warehouse'

export type Facility = {
  id: string
  number: number
  status: DisplayStatus
  /** Set together with status 'Archived': when the facility was archived (YYYY-MM-DD) and who archived it. */
  archived?: { date: string; by: string }
  // Omitted when no source states the site's type. Garden City and University Park were set to Samsung Warehouse by the
  // user on 2026-10-02 (both serve Samsung SDS).
  facilityType?: FacilityType
  street: string
  city?: string
  state: string
  stateName: string
  zip?: string
  fullAddress: string
  coordinates: [number, number] | null
  coordinateSource: 'Esri World Geocoding Service' | 'Official facility site plan'
  coordinatePrecision: CoordinatePrecision
  geocoderMatch: string
  geocodeNote?: string
}

export const facilities: Facility[] = [
  {
    id: 'buena-park-valley-view', number: 1, status: 'Active', facilityType: 'UF ONLY', street: '6800 Valley View St.', city: 'Buena Park', state: 'CA', stateName: 'California', zip: '90620',
    fullAddress: '6800 Valley View St., Buena Park, CA 90620', coordinates: [33.863497313048, -118.027410310706],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '6800 Valley View St, Buena Park, CA, 90620, USA',
  },
  {
    id: 'riverside-alessandro', number: 2, status: 'Active', facilityType: 'UF ONLY', street: '2677 East Alessandro Blvd.', city: 'Riverside', state: 'CA', stateName: 'California', zip: '92508',
    fullAddress: '2677 East Alessandro Blvd., Riverside, CA 92508', coordinates: [33.916657601368, -117.284924414206],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Street address', geocoderMatch: '2677 E Alessandro Blvd, Riverside, CA, 92508, USA',
  },
  {
    id: 'moreno-valley-heacock', number: 3, status: 'Active', facilityType: 'UF ONLY', street: '16850 Heacock St.', city: 'Moreno Valley', state: 'CA', stateName: 'California', zip: '92551',
    fullAddress: '16850 Heacock St., Moreno Valley, CA 92551', coordinates: [33.877442872095, -117.241806125847],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '16850 Heacock St, Moreno Valley, CA, 92551, USA',
  },
  {
    id: 'houston-citypark', number: 4, status: 'Active', facilityType: 'UF ONLY', street: '8833 Citypark Loop', city: 'Houston', state: 'TX', stateName: 'Texas', zip: '77013',
    fullAddress: '8833 Citypark Loop, Houston, TX 77013', coordinates: [29.80443438506, -95.269708268004],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '8833 Citypark Loop, Houston, TX, 77013, USA',
  },
  {
    id: 'roanoke-highway-114', number: 5, status: 'Active', facilityType: 'UF ONLY', street: '1230 W Highway 114', city: 'Roanoke', state: 'TX', stateName: 'Texas', zip: '76262',
    fullAddress: '1230 W Highway 114, Roanoke, TX 76262', coordinates: [33.01758290409, -97.244989833443],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '1230 W State Highway 114, Roanoke, TX, 76262, USA',
    geocodeNote: 'The street direction and ZIP 76262 come from the official 689 – Roanoke facility sheet.',
  },
  {
    id: 'pooler-morgan-lakes', number: 6, status: 'Active', facilityType: 'UF ONLY', street: '335 Morgan Lakes Industrial Blvd.', city: 'Pooler', state: 'GA', stateName: 'Georgia',
    fullAddress: '335 Morgan Lakes Industrial Blvd., Pooler, GA', coordinates: [32.162133493536, -81.276591057552],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '335 Morgan Lakes Industrial Blvd, Pooler, GA, 31322, USA',
    geocodeNote: 'The geocoder returned ZIP 31322; no ZIP was supplied, so it is not added to the facility address.',
  },
  {
    id: 'pooler-seabrook-building-2', number: 7, status: 'Active', facilityType: 'UF ONLY', street: '300 Seabrook Pkwy., Building 2', city: 'Pooler', state: 'GA', stateName: 'Georgia',
    fullAddress: '300 Seabrook Pkwy., Building 2, Pooler, GA', coordinates: [32.119094809573, -81.282470878811],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '300 Seabrook Pkwy, Pooler, GA, 31322, USA',
    geocodeNote: 'The geocoder matched the street address but did not distinguish Building 2.',
  },
  {
    id: 'summerville-cypress-tradeport', number: 8, status: 'Active', facilityType: 'UF ONLY', street: '369 N Cypress Dr', city: 'Summerville', state: 'SC', stateName: 'South Carolina',
    fullAddress: '369 N Cypress Dr, Summerville, SC', coordinates: [33.10855482, -80.19483182],
    coordinateSource: 'Official facility site plan', coordinatePrecision: 'Point address', geocoderMatch: 'Not geocoded; coordinates labeled on the official 875 – Summerville site plan',
    geocodeNote: 'Address and coordinates come from the official 875 – Summerville facility sheet.',
  },
  {
    id: 'tennessee-quality-drive', number: 9, status: 'Active', facilityType: 'UF ONLY', street: '4550 Quality Drive', state: 'TN', stateName: 'Tennessee',
    fullAddress: '4550 Quality Drive, TN', coordinates: [35.026248584048, -89.911919399124],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '4550 Quality Dr, Memphis, TN, 38118, USA',
    geocodeNote: 'The geocoder matched Memphis, TN. The city remains omitted because it was not supplied.',
  },
  {
    id: 'tacoma-lincoln', number: 10, status: 'Active', facilityType: 'UF ONLY', street: '3320 Lincoln Ave.', city: 'Tacoma', state: 'WA', stateName: 'Washington', zip: '98421',
    fullAddress: '3320 Lincoln Ave., Tacoma, WA 98421', coordinates: [47.267853257837, -122.385834922262],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '3320 Lincoln Ave, Tacoma, WA, 98421, USA',
  },
  {
    id: 'tacoma-steele', number: 11, status: 'Active', facilityType: 'UF ONLY', street: '12005 Steele St. S.', city: 'Tacoma', state: 'WA', stateName: 'Washington', zip: '98444',
    fullAddress: '12005 Steele St. S., Tacoma, WA 98444', coordinates: [47.149599859095, -122.462079563393],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '12005 Steele St S, Tacoma, WA, 98444, USA',
  },
  {
    id: 'jacksonville-ignition', number: 12, status: 'Active', facilityType: 'UF ONLY', street: '2619 Ignition Dr.', city: 'Jacksonville', state: 'FL', stateName: 'Florida', zip: '32218',
    fullAddress: '2619 Ignition Dr., Jacksonville, FL 32218', coordinates: [30.456520468209, -81.686419100355],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '2619 Ignition Dr, Jacksonville, FL, 32218, USA',
  },
  {
    id: 'las-vegas-marion-building-5', number: 13, status: 'Active', facilityType: 'UF ONLY', street: '2861 N. Marion Dr., Building 5', city: 'Las Vegas', state: 'NV', stateName: 'Nevada', zip: '89115',
    fullAddress: '2861 N. Marion Dr., Building 5, Las Vegas, NV 89115', coordinates: [36.212369942205, -115.073425460175],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '2861 Marion Dr, Las Vegas, NV, 89115, USA',
    geocodeNote: 'The geocoder matched the street address but did not distinguish Building 5.',
  },
  {
    id: 'el-paso-emerald-12100', number: 14, status: 'Active', facilityType: 'UF ONLY', street: '12100 Emerald Pass Ave.', city: 'El Paso', state: 'TX', stateName: 'Texas', zip: '79928',
    fullAddress: '12100 Emerald Pass Ave., El Paso, TX 79928', coordinates: [31.688126209124, -106.254701699423],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Street address', geocoderMatch: '12100 Emerald Pass Ave, El Paso, TX, 79928, USA',
  },
  {
    id: 'long-beach-willow', number: 15, status: 'Active', facilityType: 'UF ONLY', street: '2131 West Willow St.', city: 'Long Beach', state: 'CA', stateName: 'California', zip: '90810',
    fullAddress: '2131 West Willow St., Long Beach, CA 90810', coordinates: [33.806263708419, -118.220642347923],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '2131 W Willow St, Long Beach, CA, 90810, USA',
  },
  {
    id: 'joliet-brandon', number: 16, status: 'Active', facilityType: 'UF ONLY', street: '3901 Brandon Rd.', city: 'Joliet', state: 'IL', stateName: 'Illinois', zip: '60436',
    fullAddress: '3901 Brandon Rd., Joliet, IL 60436', coordinates: [41.453591683625, -88.110570790298],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '3901 S Brandon Rd, Elwood, IL, 60421, USA',
  },
  {
    id: 'el-paso-emerald-12102-building-5', number: 17, status: 'Active', facilityType: 'UF ONLY', street: '12102 Emerald Pass Ave., Building 5', city: 'El Paso', state: 'TX', stateName: 'Texas', zip: '79928',
    fullAddress: '12102 Emerald Pass Ave., Building 5, El Paso, TX 79928', coordinates: [31.688028976612, -106.254708716432],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Street address', geocoderMatch: '12102 Emerald Pass Ave, El Paso, TX, 79928, USA',
    geocodeNote: 'The geocoder matched the street address but did not distinguish Building 5.',
  },
  {
    id: 'waddell-cotton', number: 18, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '6801 N Cotton Ln', city: 'Waddell', state: 'AZ', stateName: 'Arizona', zip: '85355',
    fullAddress: '6801 N Cotton Ln, Waddell, AZ 85355', coordinates: [33.53433209636, -112.425402119954],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '6801 N Cotton Ln, Litchfield Park, AZ, 85340, USA',
  },
  {
    id: 'ontario-airport', number: 19, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '3950 E Airport Dr', city: 'Ontario', state: 'CA', stateName: 'California', zip: '91761',
    fullAddress: '3950 E Airport Dr, Ontario, CA 91761', coordinates: [34.0595025, -117.5663782],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '3950 E Airport Dr, Ontario, CA, 91761, USA',
  },
  {
    id: 'kent-85th-avenue-range', number: 20, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '19801-19821 85th Ave', city: 'Kent', state: 'WA', stateName: 'Washington', zip: '98031',
    fullAddress: '19801-19821 85th Ave, Kent, WA 98031', coordinates: [47.4235533, -122.2273279],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '19821 85th Ave S, Kent, WA, 98031, USA',
  },
  {
    id: 'west-sacramento-overland', number: 21, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '1500 Overland Ct', city: 'West Sacramento', state: 'CA', stateName: 'California', zip: '95691',
    fullAddress: '1500 Overland Ct, West Sacramento, CA 95691', coordinates: [38.5691389, -121.5753057],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '1500 Overland Ct, West Sacramento, CA, 95691, USA',
  },
  {
    id: 'sparks-vista', number: 22, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '250 Vista Blvd', city: 'Sparks', state: 'NV', stateName: 'Nevada', zip: '89434',
    fullAddress: '250 Vista Blvd, Sparks, NV 89434', coordinates: [39.5342288, -119.7027622],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '250 Vista Blvd, Sparks, NV, 89434, USA',
  },
  {
    id: 'houston-navigation', number: 23, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '3401 Navigation Blvd', city: 'Houston', state: 'TX', stateName: 'Texas', zip: '77003',
    fullAddress: '3401 Navigation Blvd, Houston, TX 77003', coordinates: [29.7574596, -95.3355715],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '3401 Navigation Blvd, Houston, TX, 77003, USA',
  },
  {
    id: 'memphis-delp', number: 24, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '4444 Delp St', city: 'Memphis', state: 'TN', stateName: 'Tennessee', zip: '38118',
    fullAddress: '4444 Delp St, Memphis, TN 38118', coordinates: [35.0264644, -89.9292231],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '4444 Delp St, Memphis, TN, 38118, USA',
  },
  {
    id: 'salt-lake-city-jimmy-doolittle', number: 25, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '485 N Jimmy Doolittle Rd', city: 'Salt Lake City', state: 'UT', stateName: 'Utah', zip: '84116',
    fullAddress: '485 N Jimmy Doolittle Rd, Salt Lake City, UT 84116', coordinates: [40.7792271, -112.0204811],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '485 N Jimmy Doolittle Rd, Salt Lake City, UT, 84116, USA',
  },
  {
    id: 'somerset-cottontail', number: 26, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '101 Cottontail Ln', city: 'Somerset', state: 'NJ', stateName: 'New Jersey', zip: '08873',
    fullAddress: '101 Cottontail Ln, Somerset, NJ 08873', coordinates: [40.5475544, -74.5472703],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '101 Cottontail Ln, Somerset, NJ, 08873, USA',
  },
  {
    id: 'plano-10th-f-avenue', number: 27, status: 'Active', facilityType: 'UF/CUBEWORKS', street: '910 10th Street / 880 F Ave.', city: 'Plano', state: 'TX', stateName: 'Texas',
    fullAddress: '910 10th Street / 880 F Ave., Plano, TX', coordinates: [33.0123245, -96.7025856],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '910 10th St, Plano, TX, 75074, USA',
    geocodeNote: 'The marker uses the primary 910 10th St point-address candidate. The supplied alternate 880 F Ave. address is preserved but is not represented by a separate pin; no ZIP is added because none was supplied.',
  },
  {
    id: 'garden-city-prosperity', number: 28, status: 'Active', facilityType: 'Samsung Warehouse', street: '140 Prosperity Dr', city: 'Garden City', state: 'GA', stateName: 'Georgia', zip: '31408',
    fullAddress: '140 Prosperity Dr, Garden City, GA 31408', coordinates: [32.074542144348, -81.178988824216],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '140 Prosperity Dr, Savannah, GA, 31408, USA',
    geocodeNote: 'Added from the official 804 – Garden City facility sheet, which states no status, facility type, or operating hours. The geocoder places this point address in Savannah, GA 31408; the sheet address is unchanged.',
  },
  {
    id: 'university-park-central', number: 29, status: 'Active', facilityType: 'Samsung Warehouse', street: '701 S Central Ave', city: 'University Park', state: 'IL', stateName: 'Illinois', zip: '60484',
    fullAddress: '701 S Central Ave, University Park, IL 60484', coordinates: [41.443366097027, -87.745403120176],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '701 Central Ave, University Park, IL, 60484, USA',
    geocodeNote: 'The geocoder match drops the S street direction; the supplied address is unchanged.',
  },
]

export const isArchived = (facility: Facility) => facility.status === 'Archived'

/**
 * The live network from this data file alone. The app reads the network through useFacilityNetwork(), which also
 * applies administrator archives; these lists serve code that runs without the server, such as tour narration.
 */
export const networkFacilities = facilities.filter((facility) => !isArchived(facility))

export const archivedFacilities = facilities.filter(isArchived)

/** "Archived on Oct 5, 2026 by Victor Jun", for the profile banner and the PDF. */
export function archivedLabel(facility: Facility) {
  if (!facility.archived) return 'Archived'
  const [year, month, day] = facility.archived.date.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `Archived on ${date} by ${facility.archived.by}`
}

export const searchableFacilityText = (facility: Facility) =>
  [facility.fullAddress, facility.street, facility.city, facility.state, facility.stateName, facility.zip]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
