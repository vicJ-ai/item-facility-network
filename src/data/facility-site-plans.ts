export type FacilitySitePlanFact = {
  id: string
  label: string
  value: number | string
  unit?: string
  note?: string
}

export type FacilitySitePlan = {
  assetUrl: string
  alt: string
  width: number
  height: number
  sourceNote?: string
  // Set when the plan comes from an official one-page UNIS facility sheet rather than a user-supplied file.
  provenance?: 'official-facility-sheet'
  facts: FacilitySitePlanFact[]
}

export const sitePlanProvenanceLabel = (plan: FacilitySitePlan) =>
  plan.provenance === 'official-facility-sheet' ? 'Official site plan' : 'User-provided site plan'

export const facilitySitePlans: Partial<Record<string, FacilitySitePlan>> = {
  'buena-park-valley-view': {
    assetUrl: '/media/site-plans/buena-park-valley-view.png',
    alt: 'User-provided site plan for 6800 Valley View Street showing the building, exterior docks, trailer parking, and car parking areas',
    width: 2400,
    height: 1868,
    facts: [
      { id: 'building-area', label: 'Building area', value: 1_034_026, unit: 'SF' },
      { id: 'exterior-docks', label: 'Exterior docks', value: 154, unit: 'shown', note: '62 north + 75 west + 17 east; east expandable to 47' },
      { id: 'trailer-parking', label: 'Trailer parking', value: 263, unit: 'shown', note: '50 north + 123 west + 90 east' },
      { id: 'car-parking', label: 'Car parking', value: 584, unit: 'shown', note: '274 west + 310 southeast' },
    ],
  },
  'el-paso-emerald-12100': {
    assetUrl: '/media/site-plans/el-paso-emerald-12100-building-6.png',
    alt: 'User-provided source-named Building 6 site plan showing a rear-load warehouse and labeled site features along Emerald Pass Avenue',
    width: 4417,
    height: 2232,
    facts: [
      { id: 'area-labeled', label: 'Area labeled on plan', value: 93_760, unit: 'SF' },
      { id: 'clear-height', label: 'Clear height', value: 36, unit: 'ft' },
      { id: 'dock-high-doors', label: 'Dock-high doors', value: 24, unit: 'shown', note: 'With equipment' },
      { id: 'drive-in-ramps', label: 'Drive-in ramps', value: 2, unit: 'shown' },
      { id: 'auto-parking', label: 'Auto parking', value: 60, unit: 'shown' },
      { id: 'trailer-parking', label: 'Trailer parking', value: 32, unit: 'shown' },
    ],
  },
  'el-paso-emerald-12102-building-5': {
    assetUrl: '/media/site-plans/el-paso-emerald-12102-building-5.png',
    alt: 'User-provided site plan labeled Building 5 showing the rear-load building, office, dock doors, and parking areas',
    width: 1036,
    height: 514,
    facts: [
      { id: 'building-area', label: 'Building 5 area', value: 209_153, unit: 'SF', note: 'Rear load' },
      { id: 'office-area', label: 'Office area', value: 2_758, unit: 'SF' },
      { id: 'clear-height', label: 'Clear height', value: 36, unit: 'ft' },
      { id: 'dock-high-doors', label: 'Dock-high doors', value: 38, unit: 'shown' },
      { id: 'parking-spaces', label: 'Parking spaces', value: 137, unit: 'shown' },
      { id: 'trailer-spaces', label: 'Trailer spaces', value: 62, unit: 'shown' },
    ],
  },
  'garden-city-prosperity': {
    assetUrl: '/media/site-plans/garden-city-prosperity.png',
    alt: 'Official UNIS site plan for 140 Prosperity Drive showing the cross-dock building with inbound and outbound dock sides, office, and surrounding parking',
    width: 1614,
    height: 787,
    provenance: 'official-facility-sheet',
    sourceNote: 'Official UNIS facility sheet (804 – Garden City).',
    facts: [
      { id: 'building-area', label: 'Building area', value: 505_902, unit: 'SF' },
      { id: 'dock-sides', label: 'Dock sides', value: 'Inbound + outbound', note: 'As labeled on plan' },
    ],
  },
  'houston-citypark': {
    assetUrl: '/media/site-plans/houston-citypark-official.png',
    alt: 'Official UNIS floor plan for 8833 Citypark Loop showing the column grid, numbered dock doors, and the labeled 119,700 square feet',
    width: 1875,
    height: 850,
    provenance: 'official-facility-sheet',
    sourceNote: 'Official UNIS facility sheet (144 – City Park).',
    facts: [
      { id: 'facility-area', label: 'Facility area', value: 119_700, unit: 'SF' },
      { id: 'trailer-dock-doors', label: 'Trailer dock doors', value: 35, unit: 'shown', note: 'Includes 1 drive-in door' },
    ],
  },
  'jacksonville-ignition': {
    assetUrl: '/media/site-plans/jacksonville-ignition.png',
    alt: 'Official UNIS site plan for 2619 Ignition Drive showing the office, driver office, staging lane, 17 rack rows, a leased area, and 18 numbered dock doors',
    width: 1612,
    height: 636,
    provenance: 'official-facility-sheet',
    sourceNote: 'Official UNIS facility sheet (140 – Jacksonville).',
    facts: [
      { id: 'dock-doors', label: 'Dock doors', value: 18, unit: 'shown', note: 'Numbered 01–18' },
      { id: 'rack-rows', label: 'Rack rows', value: 17, unit: 'shown', note: 'Rack 01–17' },
      { id: 'leased-area', label: 'Leased area', value: 'Marked on plan', note: 'No area stated' },
    ],
  },
  'joliet-brandon': {
    assetUrl: '/media/site-plans/joliet-brandon.png',
    alt: 'User-provided layout diagram showing a cross-dock distribution facility, loading docks, and parking areas',
    width: 4398,
    height: 2102,
    facts: [
      { id: 'facility-area', label: 'Facility area', value: 826_755, unit: 'SF', note: 'Cross-dock distribution facility' },
      { id: 'clear-height', label: 'Clear height', value: 36, unit: 'ft' },
      { id: 'loading-docks', label: 'Loading docks', value: 84, unit: 'shown' },
      { id: 'trailer-stalls', label: 'Trailer stalls', value: 300, unit: 'plan total' },
      { id: 'expandable-auto-stalls', label: 'Expandable auto stalls', value: 354, unit: 'plan capacity' },
    ],
  },
  'las-vegas-marion-building-5': {
    assetUrl: '/media/site-plans/las-vegas-marion-building-5.png',
    alt: 'User-provided source plan crop showing Building number 5 and its labeled area on North Marion Drive',
    width: 2385,
    height: 1449,
    facts: [
      { id: 'building-5-area', label: 'Building #5 area', value: 271_616, unit: 'SF' },
    ],
  },
  'long-beach-willow': {
    assetUrl: '/media/site-plans/long-beach-willow.png',
    alt: 'User-provided site plan along West Willow Street showing the rear-load distribution facility and labeled property features',
    width: 1075,
    height: 757,
    facts: [
      { id: 'facility-area', label: 'Facility area', value: 198_089, unit: 'SF', note: 'Rear-load distribution facility' },
      { id: 'clear-height', label: 'Clear height', value: 24, unit: 'ft' },
      { id: 'dock-doors', label: 'Dock doors', value: 52, unit: 'shown' },
      { id: 'auto-parking', label: 'Auto parking', value: 67, unit: 'shown' },
      { id: 'drive-in-door', label: 'Drive-in door', value: 1, unit: 'shown' },
    ],
  },
  'moreno-valley-heacock': {
    assetUrl: '/media/site-plans/moreno-valley-heacock.png',
    alt: 'Supplied site plan for 16850 Heacock Street showing the building, truck yards, excess trailer yard, surrounding streets, and door legend',
    width: 1420,
    height: 1447,
    facts: [
      { id: 'building-area', label: 'Building area', value: 756_340, unit: 'SF' },
      { id: 'trailer-stall-capacity', label: 'Trailer stall capacity', value: 158, unit: 'stalls', note: 'Plan capacity' },
      { id: 'excess-trailer-yard', label: 'Excess trailer yard', value: '6.50', unit: 'acres', note: '283,140 SF' },
      { id: 'automobile-parking', label: 'Automobile parking', value: 'Not specified', note: 'No count stated' },
    ],
  },
  'pooler-morgan-lakes': {
    assetUrl: '/media/site-plans/pooler-morgan-lakes.png',
    alt: 'User-provided reference site layout for 335 Morgan Lakes Industrial Boulevard showing the cross-dock building and labeled site features',
    width: 3200,
    height: 1900,
    sourceNote: 'Supplied reference layout; not to scale.',
    facts: [
      { id: 'building-area', label: 'Building area', value: 499_500, unit: 'SF' },
      { id: 'dock-high-doors', label: 'Dock-high doors', value: 122, unit: 'shown' },
      { id: 'drive-in-doors', label: 'Drive-in doors', value: 2, unit: 'shown' },
      { id: 'auto-parking', label: 'Auto parking', value: 82, unit: 'shown' },
    ],
  },
  'pooler-seabrook-building-2': {
    assetUrl: '/media/site-plans/pooler-seabrook-building-2.png',
    alt: 'Official UNIS site plan for 300 Seabrook Parkway Building 2 showing the cross-dock building, dock-high doors on both sides, ramps, trailer parking, and standard parking',
    width: 1609,
    height: 658,
    provenance: 'official-facility-sheet',
    sourceNote: 'Official UNIS facility sheet (823 – Pooler).',
    facts: [
      { id: 'dock-high-doors', label: 'Dock-high doors', value: 269, unit: 'plan total', note: '134 + 135' },
      { id: 'ramps', label: 'Ramps', value: 2, unit: 'shown' },
      { id: 'trailer-parking', label: 'Trailer parking', value: 335, unit: 'plan total', note: '161 + 174' },
      { id: 'standard-parking', label: 'Standard parking', value: 125, unit: 'plan total', note: '94 + 31' },
    ],
  },
  'riverside-alessandro': {
    assetUrl: '/media/site-plans/riverside-alessandro-redraw.png',
    alt: 'User-provided footprint redraw for 2677 East Alessandro Boulevard showing the building, loading areas, parking, and frontage roads',
    width: 4384,
    height: 3300,
    sourceNote: 'Supplied redraw; not to scale and not an original official plan.',
    facts: [
      { id: 'building-area', label: 'Building area', value: 709_081, unit: 'SF' },
      { id: 'dock-high-doors', label: 'Dock-high doors', value: 109, unit: 'shown' },
      { id: 'drive-in-doors', label: 'Drive-in doors', value: 2, unit: 'shown' },
      { id: 'car-parking', label: 'Car parking', value: 384, unit: 'shown' },
    ],
  },
  'roanoke-highway-114': {
    assetUrl: '/media/site-plans/roanoke-highway-114-official.png',
    alt: 'Official UNIS site plan for 1230 W Highway 114 showing the 568,632 square foot building, dock positions and truck courts on both sides, trailer spaces, and parking along the truck bypass drives',
    width: 902,
    height: 591,
    provenance: 'official-facility-sheet',
    sourceNote: 'Official UNIS facility sheet (869 – Roanoke).',
    facts: [
      { id: 'building-area', label: 'Building area', value: 568_632, unit: 'SF' },
      { id: 'dock-positions', label: 'Dock positions', value: 127, unit: 'plan total', note: '59 + 68' },
      { id: 'car-parking', label: 'Parking spaces', value: 212, unit: 'plan total', note: '105 + 107' },
      { id: 'trailer-spaces', label: 'Trailer spaces', value: 111, unit: 'plan total', note: '46 + 65' },
      { id: 'truck-courts', label: 'Truck courts', value: 125, unit: 'ft', note: 'Both dock sides' },
      { id: 'building-dimensions', label: 'Building dimensions', value: "1,092' × 520'", note: '21 bays @ 52\'' },
    ],
  },
  'summerville-cypress-tradeport': {
    assetUrl: '/media/site-plans/summerville-cypress-tradeport.png',
    alt: 'Official UNIS site plan for 369 North Cypress Drive showing the labeled building area, Cubework space, parking, dock-high doors, ramps, and trailer parking',
    width: 1602,
    height: 785,
    provenance: 'official-facility-sheet',
    sourceNote: 'Official UNIS facility sheet (875 – Summerville).',
    facts: [
      { id: 'building-area', label: 'Building area', value: 574_789, unit: 'SF' },
      { id: 'standard-parking', label: 'Standard parking', value: 271, unit: 'plan total', note: '131 + 140' },
      { id: 'dock-high-doors', label: 'Dock-high doors', value: 110, unit: 'plan total', note: '56 + 54' },
      { id: 'ramps', label: 'Ramps', value: 4, unit: 'plan total', note: '2 + 2' },
      { id: 'trailer-parking', label: 'Trailer parking', value: 149, unit: 'plan total', note: '76 + 73' },
    ],
  },
  'tennessee-quality-drive': {
    assetUrl: '/media/site-plans/tennessee-quality-drive.png',
    alt: 'User-provided site plan showing the total building area, auto parking areas, and building dimensions',
    width: 3160,
    height: 1780,
    facts: [
      { id: 'building-area', label: 'Building area', value: 220_100, unit: 'SF' },
      { id: 'auto-parking', label: 'Auto parking', value: 122, unit: 'plan total', note: '30 + 35 + 57' },
    ],
  },
}

export const getFacilitySitePlan = (facilityId: string) => facilitySitePlans[facilityId]
