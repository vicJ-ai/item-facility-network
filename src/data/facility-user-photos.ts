export type UserProvidedFacilityPhoto = {
  id: string
  label: string
  assetUrl: string
  alt: string
  width: number
  height: number
}

export type UserProvidedFacilityPhotos = {
  facilityId: string
  provenance: 'user-provided'
  coverPhotoId: string
  photos: UserProvidedFacilityPhoto[]
}

export const userProvidedFacilityPhotos: Partial<Record<string, UserProvidedFacilityPhotos>> = {
  'buena-park-valley-view': {
    facilityId: 'buena-park-valley-view',
    provenance: 'user-provided',
    coverPhotoId: 'building-exterior',
    photos: [
      {
        id: 'building-exterior',
        label: 'Building exterior',
        assetUrl: '/media/buena-park/building-exterior.jpg',
        alt: 'User-provided exterior view of the loading docks and canopy at 6800 Valley View Street',
        width: 1996,
        height: 1314,
      },
      {
        id: 'interior-view-7',
        label: 'Interior view 7',
        assetUrl: '/media/buena-park/interior-view-7.jpg',
        alt: 'User-provided warehouse interior view with wood roof beams, columns, and loading doors at 6800 Valley View Street',
        width: 2048,
        height: 1365,
      },
      {
        id: 'interior-view-13',
        label: 'Interior view 13',
        assetUrl: '/media/buena-park/interior-view-13.jpg',
        alt: 'User-provided warehouse interior view of loading doors and structural columns at 6800 Valley View Street',
        width: 2048,
        height: 1247,
      },
      {
        id: 'aerial-facility-yard',
        label: 'Aerial facility yard',
        assetUrl: '/media/buena-park/aerial-facility-yard.webp',
        alt: 'User-provided aerial view of the warehouse and surrounding facility yard at 6800 Valley View Street',
        width: 2200,
        height: 1466,
      },
    ],
  },
  'el-paso-emerald-12100': {
    facilityId: 'el-paso-emerald-12100',
    provenance: 'user-provided',
    coverPhotoId: 'building-exterior',
    photos: [
      {
        id: 'building-exterior',
        label: 'Building exterior',
        assetUrl: '/media/el-paso-12100/building-exterior.png',
        alt: 'User-provided exterior view of a warehouse office entrance and parking area under a blue sky',
        width: 1602,
        height: 981,
      },
      {
        id: 'dockside-exterior',
        label: 'Dockside exterior',
        assetUrl: '/media/el-paso-12100/dockside-exterior.png',
        alt: 'User-provided dockside warehouse exterior with loading doors, ramps, and a truck court',
        width: 1602,
        height: 981,
      },
      {
        id: 'warehouse-interior',
        label: 'Warehouse interior',
        assetUrl: '/media/el-paso-12100/warehouse-interior.png',
        alt: 'User-provided warehouse interior with structural columns, dock doors, and a polished concrete floor',
        width: 1602,
        height: 982,
      },
      {
        id: 'campus-aerial-context',
        label: 'Campus aerial context',
        assetUrl: '/media/el-paso-12100/campus-aerial-context.png',
        alt: 'User-provided oblique aerial context showing two outlined warehouse buildings and the surrounding industrial area',
        width: 1602,
        height: 982,
      },
      {
        id: 'twilight-aerial-banner',
        label: 'Twilight aerial',
        assetUrl: '/media/el-paso-12100/twilight-aerial-banner.png',
        alt: 'User-provided twilight promotional aerial view of a large warehouse and surrounding industrial buildings',
        width: 1962,
        height: 802,
      },
    ],
  },
  'el-paso-emerald-12102-building-5': {
    facilityId: 'el-paso-emerald-12102-building-5',
    provenance: 'user-provided',
    coverPhotoId: 'warehouse-exterior',
    photos: [
      {
        id: 'warehouse-exterior',
        label: 'Warehouse exterior',
        assetUrl: '/media/el-paso-building-5/warehouse-exterior.jpg',
        alt: 'User-provided long warehouse exterior with loading docks under a blue sky',
        width: 2560,
        height: 1920,
      },
      {
        id: 'warehouse-interior-docks',
        label: 'Interior dock view',
        assetUrl: '/media/el-paso-building-5/warehouse-interior-docks.jpg',
        alt: 'User-provided empty warehouse interior with dock doors, columns, and a polished concrete floor',
        width: 1920,
        height: 2560,
      },
      {
        id: 'warehouse-interior-columns',
        label: 'Interior column view',
        assetUrl: '/media/el-paso-building-5/warehouse-interior-columns.jpg',
        alt: 'User-provided warehouse interior with structural columns, dock doors, a truck, and a lift',
        width: 1920,
        height: 2560,
      },
    ],
  },
  'houston-citypark': {
    facilityId: 'houston-citypark',
    provenance: 'user-provided',
    coverPhotoId: 'brochure-exterior',
    photos: [
      {
        id: 'brochure-exterior',
        label: 'Brochure exterior',
        assetUrl: '/media/houston/brochure-exterior.jpg',
        alt: 'User-provided brochure photo of the single-story building marked 8833 with blue trim, flowering trees, a lawn, and a front parking lot',
        width: 882,
        height: 588,
      },
      {
        id: 'brochure-aerial',
        label: 'Brochure aerial',
        assetUrl: '/media/houston/brochure-aerial.jpg',
        alt: 'User-provided brochure aerial view of a long white-roofed warehouse with trailers lined up at its loading docks beside neighboring warehouses and a rail line',
        width: 946,
        height: 521,
      },
      {
        id: 'aerial-site-context',
        label: 'Aerial site context',
        assetUrl: '/media/houston/aerial-site-context.jpg',
        alt: 'User-provided broad aerial context showing multiple industrial buildings and rail lines in Houston',
        width: 1354,
        height: 1179,
      },
    ],
  },
  'jacksonville-ignition': {
    facilityId: 'jacksonville-ignition',
    provenance: 'user-provided',
    coverPhotoId: 'official-exterior',
    photos: [
      {
        id: 'official-exterior',
        label: 'Official exterior',
        assetUrl: '/media/jacksonville/official-exterior.jpg',
        alt: 'Official facility sheet photo of the Suite 1 entrance and warehouse marked 2619 at 2619 Ignition Drive',
        width: 609,
        height: 408,
      },
      {
        id: 'building-exterior',
        label: 'Building exterior',
        assetUrl: '/media/jacksonville/building-exterior.jpg',
        alt: 'User-provided exterior view of the warehouse marked 2619 at 2619 Ignition Drive',
        width: 1800,
        height: 1201,
      },
      {
        id: 'dock-exterior',
        label: 'Dock exterior',
        assetUrl: '/media/jacksonville/dock-exterior.jpg',
        alt: 'User-provided exterior view of warehouse loading docks and trailers at the Jacksonville facility',
        width: 1600,
        height: 914,
      },
      {
        id: 'satellite-context',
        label: 'Satellite context',
        assetUrl: '/media/jacksonville/satellite-context.jpg',
        alt: 'User-provided regional satellite context showing multiple warehouse buildings and surrounding roads near Ignition Drive',
        width: 1800,
        height: 1300,
      },
      {
        id: 'facility-exterior',
        label: 'Facility exterior',
        assetUrl: '/media/jacksonville/facility-exterior.jpg',
        alt: 'User-provided exterior view of the Suite 1 entrance and parking area at 2619 Ignition Drive',
        width: 1800,
        height: 786,
      },
      {
        id: 'warehouse-interior',
        label: 'Warehouse interior',
        assetUrl: '/media/jacksonville/warehouse-interior.jpg',
        alt: 'User-provided view of the Jacksonville warehouse interior with storage partitions and stacked boxes',
        width: 1600,
        height: 902,
      },
    ],
  },
  'joliet-brandon': {
    facilityId: 'joliet-brandon',
    provenance: 'user-provided',
    coverPhotoId: 'street-view-exterior',
    photos: [
      {
        id: 'street-view-exterior',
        label: 'Street-view exterior',
        assetUrl: '/media/joliet/street-view-exterior.jpg',
        alt: 'User-provided street-view exterior of a warehouse entrance visibly marked 3901',
        width: 1800,
        height: 1257,
      },
      {
        id: 'warehouse-exterior',
        label: 'Warehouse exterior',
        assetUrl: '/media/joliet/warehouse-exterior.jpg',
        alt: 'User-provided exterior view of a large warehouse, parking area, and landscaped frontage',
        width: 1800,
        height: 949,
      },
      {
        id: 'industrial-aerial-context',
        label: 'Industrial aerial context',
        assetUrl: '/media/joliet/industrial-aerial-context.jpg',
        alt: 'User-provided broad industrial aerial context showing multiple warehouse buildings, roads, and rail lines',
        width: 1308,
        height: 872,
      },
    ],
  },
  'las-vegas-marion-building-5': {
    facilityId: 'las-vegas-marion-building-5',
    provenance: 'user-provided',
    coverPhotoId: 'building-exterior',
    photos: [
      {
        id: 'building-exterior',
        label: 'Building exterior',
        assetUrl: '/media/las-vegas/building-exterior.jpg',
        alt: 'User-provided exterior view of a warehouse building visibly marked 2861 on North Marion Drive',
        width: 2351,
        height: 1089,
      },
    ],
  },
  'long-beach-willow': {
    facilityId: 'long-beach-willow',
    provenance: 'user-provided',
    coverPhotoId: 'warehouse-aerial',
    photos: [
      {
        id: 'warehouse-aerial',
        label: 'Warehouse aerial',
        assetUrl: '/media/long-beach/warehouse-aerial.jpg',
        alt: 'User-provided oblique aerial view of a warehouse, loading yard, rail corridor, and port-area industrial context in Long Beach',
        width: 1800,
        height: 963,
      },
      {
        id: 'street-view-context',
        label: 'Street-view context',
        assetUrl: '/media/long-beach/street-view-context.jpg',
        alt: 'User-provided street-view context showing a warehouse exterior and parking entrance in Long Beach',
        width: 1800,
        height: 1184,
      },
      {
        id: 'satellite-context',
        label: 'Satellite context',
        assetUrl: '/media/long-beach/satellite-context.jpg',
        alt: 'User-provided broad regional satellite context showing industrial districts, neighborhoods, waterways, and freeways in Long Beach',
        width: 2200,
        height: 1500,
      },
      {
        id: 'warehouse-aerial-small',
        label: 'Warehouse aerial, compact',
        assetUrl: '/media/long-beach/warehouse-aerial-small.webp',
        alt: 'User-provided compact aerial view of a warehouse and surrounding industrial area in Long Beach',
        width: 753,
        height: 403,
      },
    ],
  },
  'moreno-valley-heacock': {
    facilityId: 'moreno-valley-heacock',
    provenance: 'user-provided',
    coverPhotoId: 'exterior-wide',
    photos: [
      {
        id: 'exterior-wide',
        label: 'Exterior wide',
        assetUrl: '/media/moreno-valley/exterior-wide.jpg',
        alt: 'User-provided wide exterior view of the white warehouse and gated drive at 16850 Heacock Street',
        width: 2200,
        height: 1467,
      },
      {
        id: 'exterior-facade',
        label: 'Exterior facade',
        assetUrl: '/media/moreno-valley/exterior-facade.jpg',
        alt: 'User-provided close exterior facade view of the white warehouse at 16850 Heacock Street',
        width: 2200,
        height: 883,
      },
      {
        id: 'warehouse-interior',
        label: 'Warehouse interior',
        assetUrl: '/media/moreno-valley/warehouse-interior.jpg',
        alt: 'User-provided view of the warehouse interior with partitioned storage areas and stacked boxes',
        width: 1800,
        height: 1022,
      },
    ],
  },
  'pooler-morgan-lakes': {
    facilityId: 'pooler-morgan-lakes',
    provenance: 'user-provided',
    coverPhotoId: 'building-exterior',
    photos: [
      {
        id: 'building-exterior',
        label: 'Building exterior',
        assetUrl: '/media/pooler-morgan-lakes/building-exterior.jpg',
        alt: 'User-provided ground exterior view of a warehouse entrance visibly marked 335',
        width: 595,
        height: 670,
      },
      {
        id: 'warehouse-interior',
        label: 'Warehouse interior',
        assetUrl: '/media/pooler-morgan-lakes/warehouse-interior.jpg',
        alt: 'User-provided warehouse interior showing a partitioned storage aisle',
        width: 1600,
        height: 1066,
      },
      {
        id: 'subdivided-storage-interior',
        label: 'Subdivided storage interior',
        assetUrl: '/media/pooler-morgan-lakes/subdivided-storage-interior.jpg',
        alt: 'User-provided subdivided warehouse interior with partitioned storage areas',
        width: 1600,
        height: 1041,
      },
    ],
  },
  'roanoke-highway-114': {
    facilityId: 'roanoke-highway-114',
    provenance: 'user-provided',
    coverPhotoId: 'front-exterior',
    photos: [
      {
        id: 'front-exterior',
        label: 'Front exterior',
        assetUrl: '/media/roanoke/front-exterior.jpg',
        alt: 'User-provided front exterior view of a modern warehouse with a glass office facade',
        width: 2605,
        height: 1954,
      },
      {
        id: 'dockside-exterior',
        label: 'Dockside exterior',
        assetUrl: '/media/roanoke/dockside-exterior.jpg',
        alt: 'User-provided dockside warehouse exterior with loading doors at sunset',
        width: 3030,
        height: 2000,
      },
      {
        id: 'landscaped-exterior',
        label: 'Landscaped exterior',
        assetUrl: '/media/roanoke/landscaped-exterior.jpg',
        alt: 'User-provided warehouse exterior with trees, landscaping, parking, and loading activity',
        width: 2283,
        height: 1323,
      },
      {
        id: 'regional-aerial-context',
        label: 'Regional aerial context',
        assetUrl: '/media/roanoke/regional-aerial-context.jpg',
        alt: 'User-provided broad regional aerial context showing multiple industrial buildings, roads, and neighborhoods near Roanoke',
        width: 2635,
        height: 1800,
      },
    ],
  },
  'summerville-cypress-tradeport': {
    facilityId: 'summerville-cypress-tradeport',
    provenance: 'user-provided',
    coverPhotoId: 'official-exterior',
    photos: [
      {
        id: 'official-exterior',
        label: 'Official exterior',
        assetUrl: '/media/summerville/official-exterior.jpg',
        alt: 'Official facility sheet photo of the warehouse marked 369 and its front parking lot at 369 North Cypress Drive',
        width: 649,
        height: 558,
      },
      {
        id: 'building-exterior',
        label: 'Building exterior',
        assetUrl: '/media/summerville/building-exterior.jpg',
        alt: 'User-provided wide exterior view of a large warehouse, parking lot, and truck yard',
        width: 2048,
        height: 829,
      },
      {
        id: 'truck-yard-overhead',
        label: 'Truck yard overhead',
        assetUrl: '/media/summerville/truck-yard-overhead.jpg',
        alt: 'User-provided overhead view of a warehouse truck yard with trailers and loading areas',
        width: 788,
        height: 459,
      },
      {
        id: 'warehouse-interior',
        label: 'Warehouse interior',
        assetUrl: '/media/summerville/warehouse-interior.jpg',
        alt: 'User-provided warehouse interior with structural columns, lighting, and a polished concrete floor',
        width: 901,
        height: 600,
      },
    ],
  },
  'tennessee-quality-drive': {
    facilityId: 'tennessee-quality-drive',
    provenance: 'user-provided',
    coverPhotoId: 'oblique-aerial-exterior',
    photos: [
      {
        id: 'oblique-aerial-exterior',
        label: 'Oblique aerial exterior',
        assetUrl: '/media/tennessee-quality-drive/building-exterior.jpg',
        alt: 'User-provided oblique aerial view of a warehouse exterior with 4550 visible on the facade',
        width: 1200,
        height: 1200,
      },
    ],
  },
}

export const getUserProvidedFacilityPhotos = (facilityId: string) => userProvidedFacilityPhotos[facilityId]

export function getUserProvidedFacilityCover(gallery?: UserProvidedFacilityPhotos) {
  return gallery?.photos.find((photo) => photo.id === gallery.coverPhotoId)
}
