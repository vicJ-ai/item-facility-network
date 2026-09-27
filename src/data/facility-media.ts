export type FacilityMediaAsset = {
  assetUrl: string
  sourceUrl: string
  alt: string
  width: number
  height: number
}

export type FacilityMedia = {
  facilityId: string
  sourcePage: string
  retrievedDate: '2026-09-25'
  verification: 'official-source-address-correlated' | 'official-listing-contextual' | 'official-listing-address-candidate'
  matchNote: string
  thumbnail: FacilityMediaAsset
  detail: FacilityMediaAsset
}

export const facilityMedia: Record<string, FacilityMedia> = {
  'buena-park-valley-view': {
    facilityId: 'buena-park-valley-view',
    sourcePage: 'https://www.unisco.com/locations/facility/buena-park-ca',
    retrievedDate: '2026-09-25',
    verification: 'official-source-address-correlated',
    matchNote: 'Exact street number, street, city, and ZIP match.',
    thumbnail: {
      assetUrl: '/media/thumbnails/buena-park-valley-view.webp',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/buenapark-ca-500x500.webp',
      alt: 'A modern commercial building with a lightcolored exterior and landscaping sits on a street The scene includes a sidewalk and',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/buena-park-valley-view.jpg',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/DJI_0108-14%20copy%20(1).jpeg',
      alt: 'A bright empty warehouse space features white ribbed walls and a red step ladder resting against the wall',
      width: 1501,
      height: 1000,
    },
  },
  'riverside-alessandro': {
    facilityId: 'riverside-alessandro',
    sourcePage: 'https://www.unisco.com/locations',
    retrievedDate: '2026-09-25',
    verification: 'official-source-address-correlated',
    matchNote: 'Official listing says 2677 Alessandro; the roster says 2677 East Alessandro. Number, named street, city, and ZIP match.',
    thumbnail: {
      assetUrl: '/media/thumbnails/riverside-alessandro.webp',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/alessandro-riverside-ca-500x500.webp',
      alt: 'A modern gray commercial building with large windows dominates the scene alongside a paved parking lot and landscaping',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/riverside-alessandro.jpg',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/alessandro-riverside-ca.webp',
      alt: 'A modern gray commercial building with large windows dominates the scene alongside a paved parking lot and landscaping',
      width: 512,
      height: 512,
    },
  },
  'roanoke-highway-114': {
    facilityId: 'roanoke-highway-114',
    sourcePage: 'https://www.unisco.com/locations',
    retrievedDate: '2026-09-25',
    verification: 'official-source-address-correlated',
    matchNote: 'Street number, Highway/TX-114 designation, and city match.',
    thumbnail: {
      assetUrl: '/media/thumbnails/roanoke-highway-114.webp',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/roanoke-tx-500x500.webp',
      alt: 'A modern lightcolored building with extensive glass panels sits on a paved lot Landscaping and a street are visible in the',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/roanoke-highway-114.jpg',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/roanoke-tx.webp',
      alt: 'A modern lightcolored building with extensive glass panels sits on a paved lot Landscaping and a street are visible in the',
      width: 512,
      height: 512,
    },
  },
  'tacoma-lincoln': {
    facilityId: 'tacoma-lincoln',
    sourcePage: 'https://www.unisco.com/locations',
    retrievedDate: '2026-09-25',
    verification: 'official-source-address-correlated',
    matchNote: 'Street number, street, city, and ZIP match the official listing.',
    thumbnail: {
      assetUrl: '/media/thumbnails/tacoma-lincoln.webp',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-tacmoa-500x500.webp',
      alt: 'A large modern warehouse building with expansive parking lot stripes and several parked cars dominates the scene',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/tacoma-lincoln.jpg',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-tacmoa.webp',
      alt: 'A large modern warehouse building with expansive parking lot stripes and several parked cars dominates the scene',
      width: 512,
      height: 512,
    },
  },
  'tacoma-steele': {
    facilityId: 'tacoma-steele',
    sourcePage: 'https://www.unisco.com/locations',
    retrievedDate: '2026-09-25',
    verification: 'official-source-address-correlated',
    matchNote: 'Street number, street, city, and ZIP match the official listing.',
    thumbnail: {
      assetUrl: '/media/thumbnails/tacoma-steele.webp',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/tacoma-steele-500x500.webp',
      alt: 'A modern blueandwhite commercial building with a small entranceway sits on an asphalt lot dotted with red ground cover and',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/tacoma-steele.jpg',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/tacoma-steele.webp',
      alt: 'A modern blueandwhite commercial building with a small entranceway sits on an asphalt lot dotted with red ground cover and',
      width: 512,
      height: 512,
    },
  },
  'long-beach-willow': {
    facilityId: 'long-beach-willow',
    sourcePage: 'https://www.unisco.com/locations',
    retrievedDate: '2026-09-25',
    verification: 'official-listing-contextual',
    matchNote: 'Official listing omits West; street number, named street, city, and ZIP correlate. The image is a contextual Port of Long Beach container scene, not a verified exterior of the 2131 Willow building.',
    thumbnail: {
      assetUrl: '/media/thumbnails/long-beach-willow.png',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-long-beach-500x500.png',
      alt: 'Orange shipping containers line a long concrete pier at the Port of Long Beach Several trucks are visible in the background',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/long-beach-willow.jpg',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-long-beach.png',
      alt: 'Orange shipping containers line a long concrete pier at the Port of Long Beach Several trucks are visible in the background',
      width: 512,
      height: 512,
    },
  },
  'joliet-brandon': {
    facilityId: 'joliet-brandon',
    sourcePage: 'https://www.unisco.com/locations',
    retrievedDate: '2026-09-25',
    verification: 'official-source-address-correlated',
    matchNote: 'Street number, street, city, and ZIP match the official listing.',
    thumbnail: {
      assetUrl: '/media/thumbnails/joliet-brandon.webp',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/joliet-il-500x500.webp',
      alt: 'White industrial buildings line a paved road with a grassy median A large blue truck sits near one of the buildings',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/joliet-brandon.jpg',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/joliet-il.webp',
      alt: 'White industrial buildings line a paved road with a grassy median A large blue truck sits near one of the buildings',
      width: 512,
      height: 512,
    },
  },
  'summerville-cypress-tradeport': {
    facilityId: 'summerville-cypress-tradeport',
    sourcePage: 'https://www.unisco.com/locations',
    retrievedDate: '2026-09-25',
    verification: 'official-listing-address-candidate',
    matchNote: 'Official directory lists 369 N Cypress Dr, matching the roster primary address text. The roster also includes 410 Tradeport Dr and its geocoder matched that alternate; this media does not verify building or coordinate identity.',
    thumbnail: {
      assetUrl: '/media/thumbnails/summerville-cypress-tradeport.png',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-summerville-500x500.png',
      alt: 'A modern industrial complex featuring large white buildings with blue accents sits on a paved roadway and grassy area',
      width: 500,
      height: 500,
    },
    detail: {
      assetUrl: '/media/summerville-cypress-tradeport.png',
      sourceUrl: 'https://cdn.unisco.com/api/media/file/unis-summerville.png',
      alt: 'A modern industrial complex featuring large white buildings with blue accents sits on a paved roadway and grassy area',
      width: 512,
      height: 512,
    },
  },
}

export const getFacilityMedia = (facilityId: string) => facilityMedia[facilityId]
