// The Dashboard's regions and the facility numbers in each. The Preview tour and the narration
// generator (scripts/narration.mjs) read the same list, so it lives outside App.tsx.
export const dashboardRegions = [
  { id: 'southern-california', label: 'Southern California', facilityNumbers: [1, 2, 3, 15, 19] },
  { id: 'northern-california', label: 'Northern California', facilityNumbers: [21] },
  { id: 'texas', label: 'Texas', facilityNumbers: [4, 5, 14, 17, 23, 27] },
  { id: 'washington', label: 'Washington', facilityNumbers: [10, 11, 20] },
  { id: 'georgia', label: 'Georgia', facilityNumbers: [6, 7, 28] },
  { id: 'south-carolina', label: 'South Carolina', facilityNumbers: [8] },
  { id: 'tennessee', label: 'Tennessee', facilityNumbers: [9, 24] },
  { id: 'florida', label: 'Florida', facilityNumbers: [12] },
  { id: 'nevada', label: 'Nevada', facilityNumbers: [13, 22] },
  { id: 'illinois', label: 'Illinois', facilityNumbers: [16, 29] },
  { id: 'arizona', label: 'Arizona', facilityNumbers: [18] },
  { id: 'utah', label: 'Utah', facilityNumbers: [25] },
  { id: 'new-jersey', label: 'New Jersey', facilityNumbers: [26] },
] as const
export type DashboardRegionId = (typeof dashboardRegions)[number]['id']
