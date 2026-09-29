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
  facts: FacilitySitePlanFact[]
}

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
  'houston-citypark': {
    assetUrl: '/media/site-plans/houston-citypark.jpg',
    alt: 'User-provided site plan for 8833 Citypark Loop showing the building outline and labeled building area',
    width: 1200,
    height: 927,
    facts: [
      { id: 'building-area', label: 'Building area', value: 254_229, unit: 'SF' },
    ],
  },
  'jacksonville-ignition': {
    assetUrl: '/media/site-plans/jacksonville-ignition.png',
    alt: 'User-provided site plan for 2619 Ignition Drive showing the labeled area segment, leased segment, parking, dock-high doors, ramp, and trailer parking',
    width: 1140,
    height: 860,
    facts: [
      { id: 'area-labeled', label: 'Area labeled on plan', value: 174_288, unit: 'SF' },
      { id: 'standard-parking', label: 'Standard parking', value: 93, unit: 'shown' },
      { id: 'trailer-parking', label: 'Trailer parking', value: 43, unit: 'shown' },
      { id: 'dock-high-doors', label: 'Dock-high doors', value: 93, unit: 'shown' },
      { id: 'ramp', label: 'Ramp', value: 1, unit: 'shown' },
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
    assetUrl: '/media/site-plans/roanoke-highway-114.png',
    alt: 'User-provided site plan along Highway 114 showing labeled dock positions, car parking, and trailer spaces',
    width: 2550,
    height: 1600,
    facts: [
      { id: 'building-area', label: 'Building area', value: 568_632, unit: 'SF', note: 'Provided by user' },
      { id: 'dock-positions', label: 'Dock positions', value: 118, unit: 'plan total', note: '54 + 64' },
      { id: 'car-parking', label: 'Car parking', value: 229, unit: 'plan total', note: '5 + 12 + 105 + 107' },
      { id: 'trailer-spaces', label: 'Trailer spaces', value: 111, unit: 'plan total', note: '46 + 65' },
    ],
  },
  'summerville-cypress-tradeport': {
    assetUrl: '/media/site-plans/summerville-cypress-tradeport.jpg',
    alt: 'User-provided site plan along North Cypress Drive showing the labeled building area, parking, dock-high doors, ramps, and trailer parking',
    width: 1185,
    height: 856,
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
