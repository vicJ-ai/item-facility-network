export type FacilityStatus = 'Active' | 'Coming Soon' | 'Planned'
export type DisplayStatus = FacilityStatus | 'Unassigned'
export type CoordinatePrecision = 'Point address' | 'Street address' | 'Approximate'

export type Facility = {
  id: string
  number: number
  street: string
  city?: string
  state: string
  stateName: string
  zip?: string
  fullAddress: string
  coordinates: [number, number]
  coordinateSource: 'Esri World Geocoding Service'
  coordinatePrecision: CoordinatePrecision
  geocoderMatch: string
  geocodeNote?: string
}

export const facilities: Facility[] = [
  {
    id: 'buena-park-valley-view', number: 1, street: '6800 Valley View St.', city: 'Buena Park', state: 'CA', stateName: 'California', zip: '90620',
    fullAddress: '6800 Valley View St., Buena Park, CA 90620', coordinates: [33.863497313048, -118.027410310706],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '6800 Valley View St, Buena Park, CA, 90620, USA',
  },
  {
    id: 'riverside-alessandro', number: 2, street: '2677 East Alessandro Blvd.', city: 'Riverside', state: 'CA', stateName: 'California', zip: '92508',
    fullAddress: '2677 East Alessandro Blvd., Riverside, CA 92508', coordinates: [33.916657601368, -117.284924414206],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Street address', geocoderMatch: '2677 E Alessandro Blvd, Riverside, CA, 92508, USA',
  },
  {
    id: 'moreno-valley-heacock', number: 3, street: '16850 Heacock St.', city: 'Moreno Valley', state: 'CA', stateName: 'California', zip: '92551',
    fullAddress: '16850 Heacock St., Moreno Valley, CA 92551', coordinates: [33.877442872095, -117.241806125847],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '16850 Heacock St, Moreno Valley, CA, 92551, USA',
  },
  {
    id: 'houston-citypark', number: 4, street: '8833 Citypark Loop', city: 'Houston', state: 'TX', stateName: 'Texas', zip: '77013',
    fullAddress: '8833 Citypark Loop, Houston, TX 77013', coordinates: [29.80443438506, -95.269708268004],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '8833 Citypark Loop, Houston, TX, 77013, USA',
  },
  {
    id: 'roanoke-highway-114', number: 5, street: '1230 Highway 114', city: 'Roanoke', state: 'TX', stateName: 'Texas',
    fullAddress: '1230 Highway 114, Roanoke, TX', coordinates: [33.01758290409, -97.244989833443],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '1230 W State Highway 114, Roanoke, TX, 76262, USA',
    geocodeNote: 'The geocoder returned ZIP 76262; no ZIP was supplied, so it is not added to the facility address.',
  },
  {
    id: 'pooler-morgan-lakes', number: 6, street: '335 Morgan Lakes Industrial Blvd.', city: 'Pooler', state: 'GA', stateName: 'Georgia',
    fullAddress: '335 Morgan Lakes Industrial Blvd., Pooler, GA', coordinates: [32.162133493536, -81.276591057552],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '335 Morgan Lakes Industrial Blvd, Pooler, GA, 31322, USA',
    geocodeNote: 'The geocoder returned ZIP 31322; no ZIP was supplied, so it is not added to the facility address.',
  },
  {
    id: 'pooler-seabrook-building-2', number: 7, street: '300 Seabrook Pkwy., Building 2', city: 'Pooler', state: 'GA', stateName: 'Georgia',
    fullAddress: '300 Seabrook Pkwy., Building 2, Pooler, GA', coordinates: [32.119094809573, -81.282470878811],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '300 Seabrook Pkwy, Pooler, GA, 31322, USA',
    geocodeNote: 'The geocoder matched the street address but did not distinguish Building 2.',
  },
  {
    id: 'summerville-cypress-tradeport', number: 8, street: '369 N Cypress (410 Tradeport Dr.)', city: 'Summerville', state: 'SC', stateName: 'South Carolina',
    fullAddress: '369 N Cypress (410 Tradeport Dr.), Summerville, SC', coordinates: [33.096630369824, -80.196154685782],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '410 Tradeport Dr, Summerville, SC, 29486, USA',
    geocodeNote: 'The geocoder matched the parenthetical 410 Tradeport Dr. address.',
  },
  {
    id: 'tennessee-quality-drive', number: 9, street: '4550 Quality Drive', state: 'TN', stateName: 'Tennessee',
    fullAddress: '4550 Quality Drive, TN', coordinates: [35.026248584048, -89.911919399124],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '4550 Quality Dr, Memphis, TN, 38118, USA',
    geocodeNote: 'The geocoder matched Memphis, TN. The city remains omitted because it was not supplied.',
  },
  {
    id: 'tacoma-lincoln', number: 10, street: '3320 Lincoln Ave.', city: 'Tacoma', state: 'WA', stateName: 'Washington', zip: '98421',
    fullAddress: '3320 Lincoln Ave., Tacoma, WA 98421', coordinates: [47.267853257837, -122.385834922262],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '3320 Lincoln Ave, Tacoma, WA, 98421, USA',
  },
  {
    id: 'tacoma-steele', number: 11, street: '12005 Steele St. S.', city: 'Tacoma', state: 'WA', stateName: 'Washington', zip: '98444',
    fullAddress: '12005 Steele St. S., Tacoma, WA 98444', coordinates: [47.149599859095, -122.462079563393],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '12005 Steele St S, Tacoma, WA, 98444, USA',
  },
  {
    id: 'jacksonville-ignition', number: 12, street: '2619 Ignition Dr.', city: 'Jacksonville', state: 'FL', stateName: 'Florida', zip: '32218',
    fullAddress: '2619 Ignition Dr., Jacksonville, FL 32218', coordinates: [30.456520468209, -81.686419100355],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '2619 Ignition Dr, Jacksonville, FL, 32218, USA',
  },
  {
    id: 'las-vegas-marion-building-5', number: 13, street: '2861 N. Marion Dr., Building 5', city: 'Las Vegas', state: 'NV', stateName: 'Nevada', zip: '89115',
    fullAddress: '2861 N. Marion Dr., Building 5, Las Vegas, NV 89115', coordinates: [36.212369942205, -115.073425460175],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '2861 Marion Dr, Las Vegas, NV, 89115, USA',
    geocodeNote: 'The geocoder matched the street address but did not distinguish Building 5.',
  },
  {
    id: 'el-paso-emerald-12100', number: 14, street: '12100 Emerald Pass Ave.', city: 'El Paso', state: 'TX', stateName: 'Texas', zip: '79928',
    fullAddress: '12100 Emerald Pass Ave., El Paso, TX 79928', coordinates: [31.688126209124, -106.254701699423],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Street address', geocoderMatch: '12100 Emerald Pass Ave, El Paso, TX, 79928, USA',
  },
  {
    id: 'long-beach-willow', number: 15, street: '2131 West Willow St.', city: 'Long Beach', state: 'CA', stateName: 'California', zip: '90810',
    fullAddress: '2131 West Willow St., Long Beach, CA 90810', coordinates: [33.806263708419, -118.220642347923],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Point address', geocoderMatch: '2131 W Willow St, Long Beach, CA, 90810, USA',
  },
  {
    id: 'joliet-brandon', number: 16, street: '3901 Brandon Rd.', city: 'Joliet', state: 'IL', stateName: 'Illinois', zip: '60436',
    fullAddress: '3901 Brandon Rd., Joliet, IL 60436', coordinates: [41.453591683625, -88.110570790298],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Approximate', geocoderMatch: '3901 S Brandon Rd, Elwood, IL, 60421, USA',
    geocodeNote: 'The closest point-address match conflicts with the supplied city and ZIP. The marker is approximate; the supplied address is preserved.',
  },
  {
    id: 'el-paso-emerald-12102-building-5', number: 17, street: '12102 Emerald Pass Ave., Building 5', city: 'El Paso', state: 'TX', stateName: 'Texas', zip: '79928',
    fullAddress: '12102 Emerald Pass Ave., Building 5, El Paso, TX 79928', coordinates: [31.688028976612, -106.254708716432],
    coordinateSource: 'Esri World Geocoding Service', coordinatePrecision: 'Street address', geocoderMatch: '12102 Emerald Pass Ave, El Paso, TX, 79928, USA',
    geocodeNote: 'The geocoder matched the street address but did not distinguish Building 5.',
  },
]

export const searchableFacilityText = (facility: Facility) =>
  [facility.fullAddress, facility.street, facility.city, facility.state, facility.stateName, facility.zip]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
