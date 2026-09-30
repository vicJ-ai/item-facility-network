export type FacilityContactPhone = {
  label: 'Phone' | 'Cell' | 'Mobile' | 'Office'
  display: string
  href: string
}

export type FacilityContact = {
  id: string
  group: 'account-management' | 'operations'
  role: string
  name: string
  email: string
  sourceColumn?: string
  phone?: string
  phoneHref?: string
  phones?: FacilityContactPhone[]
  photoUrl?: string
}

export type FacilityOperations = {
  facilityId: string
  source: string
  sourceRow: number
  contacts: FacilityContact[]
}

export const JOHN_DIAZ_EMAIL = 'john.diaz@unisco.com'
export const JOHN_DIAZ_PHOTO_URL = '/media/operations/people/john-diaz.png'

const sheetContact = (
  sourceColumn: string,
  group: FacilityContact['group'],
  role: string,
  name: string,
  email: string,
  phones: FacilityContactPhone[] = [],
): FacilityContact => ({
  id: `${sourceColumn.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
  sourceColumn,
  group,
  role,
  name,
  email,
  ...(phones.length > 0 ? { phones } : {}),
  ...(email.trim().toLowerCase() === JOHN_DIAZ_EMAIL ? { photoUrl: JOHN_DIAZ_PHOTO_URL } : {}),
})

const sheetOperations = (facilityId: string, sourceRow: number, contacts: FacilityContact[]): FacilityOperations => ({
  facilityId,
  sourceRow,
  source: `User-provided facility contact sheet, row ${sourceRow}`,
  contacts,
})

export const facilitiesNeedingOperationsContactReview = [
  'pooler-morgan-lakes',
  'pooler-seabrook-building-2',
  'summerville-cypress-tradeport',
  'el-paso-emerald-12100',
  'kent-85th-avenue-range',
  'west-sacramento-overland',
  'houston-navigation',
  'salt-lake-city-jimmy-doolittle',
  'somerset-cottontail',
] as const

export const facilityOperations: Partial<Record<string, FacilityOperations>> = {
  'buena-park-valley-view': {
    facilityId: 'buena-park-valley-view',
    source: 'User-provided facility contact sheet, row 5',
    sourceRow: 5,
    contacts: [
      {
        id: 'michelle-topete',
        group: 'account-management',
        role: 'Manager of Account Management & Client Onboarding',
        name: 'Michelle Topete',
        email: 'michelle.topete@unisco.com',
        phone: '626.829.3160',
        phoneHref: '+16268293160',
      },
      {
        id: 'mary-smothers',
        group: 'account-management',
        role: 'Sr Director of Account Management & Client Onboarding',
        name: 'Mary Smothers',
        email: 'mary.smothers@unisco.com',
        phone: '626-899-2363',
        phoneHref: '+16268992363',
      },
      {
        id: 'ruben-jauregui',
        group: 'operations',
        role: 'General Manager',
        name: 'Ruben Jauregui',
        email: 'ruben.jauregui@unisco.com',
        phone: '562-644-4594',
        phoneHref: '+15626444594',
        photoUrl: '/media/operations/buena-park-valley-view/ruben-jauregui.png',
      },
      {
        id: 'mark-tuttle',
        group: 'operations',
        role: 'Director of Operations',
        name: 'Mark Tuttle',
        email: 'mark.tuttle@unisco.com',
        phone: '657-689-6951',
        phoneHref: '+16576896951',
        photoUrl: '/media/operations/buena-park-valley-view/mark-tuttle.png',
      },
      {
        id: 'john-diaz',
        group: 'operations',
        role: 'VP of Operations',
        name: 'John Diaz',
        email: JOHN_DIAZ_EMAIL,
        photoUrl: JOHN_DIAZ_PHOTO_URL,
      },
    ],
  },
  'riverside-alessandro': sheetOperations('riverside-alessandro', 4, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Oscar Rodriguez', 'oscar.rodriguez@unisco.com', [{ label: 'Phone', display: '951-374-2495', href: '+19513742495' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'moreno-valley-heacock': sheetOperations('moreno-valley-heacock', 8, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Oscar Rodriguez', 'oscar.rodriguez@unisco.com'),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'houston-citypark': sheetOperations('houston-citypark', 20, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
  ]),
  'roanoke-highway-114': sheetOperations('roanoke-highway-114', 23, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Richard Griswold', 'richard.griswold@unisco.com', [{ label: 'Phone', display: '657-689-6442', href: '+16576896442' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'tennessee-quality-drive': sheetOperations('tennessee-quality-drive', 19, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Jane Sanchez', 'jane.sanchez@unisco.com', [{ label: 'Office', display: '901-560-9291', href: '+19015609291' }, { label: 'Mobile', display: '662-408-2279', href: '+16624082279' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'Javier Montane', 'javier.montane@unisco.com', [{ label: 'Phone', display: '657-705-7452', href: '+16577057452' }]),
  ]),
  'tacoma-lincoln': sheetOperations('tacoma-lincoln', 25, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
    sheetContact('I', 'operations', 'POC as requested by John Diaz', 'Juan Barragan', 'juan.barragan@unisco.com', [{ label: 'Phone', display: '657-509-0607', href: '+16575090607' }]),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'tacoma-steele': sheetOperations('tacoma-steele', 26, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
    sheetContact('I', 'operations', 'POC as requested by John Diaz', 'Juan Barragan', 'juan.barragan@unisco.com', [{ label: 'Phone', display: '657-509-0607', href: '+16575090607' }]),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'jacksonville-ignition': sheetOperations('jacksonville-ignition', 9, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Adam Lubin', 'adam.lubin@unisco.com', [{ label: 'Phone', display: '657.705.7457', href: '+16577057457' }]),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', 'wayne.brooks@unisco.com', [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'las-vegas-marion-building-5': sheetOperations('las-vegas-marion-building-5', 16, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Frederico Ramos', 'frederico.ramos@unisco.com'),
    sheetContact('I', 'operations', 'POC as requested by John Diaz', 'Juan Barragan', 'juan.barragan@unisco.com', [{ label: 'Phone', display: '657-509-0607', href: '+16575090607' }]),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'long-beach-willow': sheetOperations('long-beach-willow', 6, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Efrain Islas', 'efrain.islas@unisco.com', [{ label: 'Phone', display: '626-313-8756', href: '+16263138756' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
  ]),
  'joliet-brandon': sheetOperations('joliet-brandon', 13, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Fabian Quiroz', 'fabian.quiroz@unisco.com', [{ label: 'Phone', display: '626-693-6394', href: '+16266936394' }]),
    sheetContact('G', 'operations', 'Director of Operations', 'Javier Montane', 'javier.montane@unisco.com', [{ label: 'Phone', display: '657-705-7452', href: '+16577057452' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'Javier Montane', 'javier.montane@unisco.com', [{ label: 'Phone', display: '657-705-7452', href: '+16577057452' }]),
  ]),
  'el-paso-emerald-12102-building-5': sheetOperations('el-paso-emerald-12102-building-5', 22, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3161', href: '+16268293161' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2364', href: '+16268992364' }]),
  ]),
  'waddell-cotton': sheetOperations('waddell-cotton', 3, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'ontario-airport': sheetOperations('ontario-airport', 7, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Oscar Rodriguez', 'oscar.rodriguez@unisco.com'),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'sparks-vista': sheetOperations('sparks-vista', 15, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Onoriode Enaigbe', 'onoriode.enaigbe@unisco.com', [{ label: 'Cell', display: '(626) 996-5604', href: '+16269965604' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Diaz', 'john.diaz@unisco.com'),
    sheetContact('I', 'operations', 'POC as requested by John Diaz', 'Juan Barragan', 'juan.barragan@unisco.com', [{ label: 'Phone', display: '657-509-0607', href: '+16575090607' }]),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'memphis-delp': sheetOperations('memphis-delp', 18, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Jane Sanchez', 'jane.sanchez@unisco.com', [{ label: 'Office', display: '901-560-9291', href: '+19015609291' }, { label: 'Mobile', display: '662-408-2279', href: '+16624082279' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'Javier Montane', 'javier.montane@unisco.com', [{ label: 'Phone', display: '657-705-7452', href: '+16577057452' }]),
  ]),
  'plano-10th-f-avenue': sheetOperations('plano-10th-f-avenue', 24, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', 'michelle.topete@unisco.com', [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
}

export const getFacilityOperations = (facilityId: string) => facilityOperations[facilityId]
