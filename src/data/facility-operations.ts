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
  email?: string
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

export const HAROLD_CUAREZMA_EMAIL = 'harold.cuarezma@unisco.com'
export const HAROLD_CUAREZMA_PHOTO_URL = '/media/operations/people/harold-cuarezma.png'

export const JAVIER_MONTANE_EMAIL = 'javier.montane@unisco.com'
// Full name, title, mobile label, and portrait user-provided on 2026-10-01.
export const JAVIER_MONTANE_NAME = 'Javier Gonzalez Montane'
export const JAVIER_MONTANE_ROLE = 'Director of Operations'
const JAVIER_MONTANE_PHONES: FacilityContactPhone[] = [{ label: 'Mobile', display: '657-705-7452', href: '+16577057452' }]
export const JAVIER_MONTANE_PHOTO_URL = '/media/operations/people/javier-montane.png'

export const JOHN_DIAZ_EMAIL = 'john.diaz@unisco.com'
export const JOHN_DIAZ_PHOTO_URL = '/media/operations/people/john-diaz.png'
export const JOHN_DIAZ_ROLE = 'Sr. Vice President of Operations'
export const JOHN_DIAZ_TITLE_SOURCE_NOTE = 'John Diaz title corrected by user on 2026-09-30.'
// User-provided on 2026-10-01; the contact sheet had no phone for him.
const JOHN_DIAZ_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '626-705-1154', href: '+16267051154' }]

export const JOHN_GLEASON_EMAIL = 'john.gleason@unisco.com'
export const JOHN_GLEASON_PHOTO_URL = '/media/operations/people/john-gleason.png'

export const OSCAR_RODRIGUEZ_EMAIL = 'oscar.rodriguez@unisco.com'
export const OSCAR_RODRIGUEZ_PHOTO_URL = '/media/operations/people/oscar-rodriguez.png'
// User-provided on 2026-10-01: Senior GM for Riverside, Moreno Valley, and Waddell (Amazon); the title also applies at Ontario.
export const OSCAR_RODRIGUEZ_ROLE = 'Senior General Manager'
// The contact sheet's Riverside number, extended to his other sites at the user's request.
const OSCAR_RODRIGUEZ_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '951-374-2495', href: '+19513742495' }]

export const JUAN_BARRAGAN_EMAIL = 'juan.barragan@unisco.com'
export const JUAN_BARRAGAN_PHOTO_URL = '/media/operations/people/juan-barragan.png'
// User-provided on 2026-10-01: senior GM for both Tacoma sites, Salt Lake City, Waddell, and Kent; the title also applies at Las Vegas and Sparks.
export const JUAN_BARRAGAN_ROLE = 'WA Senior General Manager'
const JUAN_BARRAGAN_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '657-509-0607', href: '+16575090607' }]

export const RICK_GRISWOLD_EMAIL = 'richard.griswold@unisco.com'
export const RICK_GRISWOLD_PHOTO_URL = '/media/operations/people/rick-griswold.png'
// The official 689 – Roanoke and 144 – City Park sheets list him as Rick Griswold, General Manager of both sites.
const RICK_GRISWOLD_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '657-689-6442', href: '+16576896442' }]

export const JESSICA_BARAJAS_EMAIL = 'jessica.barajas@unisco.com'
export const JESSICA_BARAJAS_PHOTO_URL = '/media/operations/people/jessica-barajas.jpg'
// User-provided on 2026-10-01: Operations Manager for both El Paso, TX sites; the user kept only her work number.
const JESSICA_BARAJAS_PHONES: FacilityContactPhone[] = [{ label: 'Office', display: '915.777.7257', href: '+19157777257' }]

export const MICHELLE_TOPETE_EMAIL = 'michelle.topete@unisco.com'
export const MICHELLE_TOPETE_PHOTO_URL = '/media/operations/people/michelle-topete.jpg'
// User-provided on 2026-10-01, based in Moreno Valley, CA. Work and mobile were both given as 909-780-3984, so it is listed once;
// it replaces the contact sheet's 626.829.3160 (626.829.3161 on the El Paso Building 5 row).
const MICHELLE_TOPETE_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '909-780-3984', href: '+19097803984' }]

export const WAYNE_BROOKS_EMAIL = 'wayne.brooks@unisco.com'
export const WAYNE_BROOKS_PHOTO_URL = '/media/operations/people/wayne-brooks.png'

const sharedPhotoUrlsByEmail: Record<string, string> = {
  [HAROLD_CUAREZMA_EMAIL]: HAROLD_CUAREZMA_PHOTO_URL,
  [JAVIER_MONTANE_EMAIL]: JAVIER_MONTANE_PHOTO_URL,
  [JOHN_DIAZ_EMAIL]: JOHN_DIAZ_PHOTO_URL,
  [JOHN_GLEASON_EMAIL]: JOHN_GLEASON_PHOTO_URL,
  [OSCAR_RODRIGUEZ_EMAIL]: OSCAR_RODRIGUEZ_PHOTO_URL,
  [JUAN_BARRAGAN_EMAIL]: JUAN_BARRAGAN_PHOTO_URL,
  [RICK_GRISWOLD_EMAIL]: RICK_GRISWOLD_PHOTO_URL,
  [JESSICA_BARAJAS_EMAIL]: JESSICA_BARAJAS_PHOTO_URL,
  [MICHELLE_TOPETE_EMAIL]: MICHELLE_TOPETE_PHOTO_URL,
  [WAYNE_BROOKS_EMAIL]: WAYNE_BROOKS_PHOTO_URL,
}

const normalizedEmail = (email?: string) => email?.trim().toLowerCase()

const sheetContact = (
  sourceColumn: string,
  group: FacilityContact['group'],
  role: string,
  name: string,
  email: string | undefined,
  phones: FacilityContactPhone[] = [],
  photoUrl?: string,
): FacilityContact => {
  const sharedPhotoUrl = sharedPhotoUrlsByEmail[normalizedEmail(email) ?? '']
  return {
    id: `${sourceColumn.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    sourceColumn,
    group,
    role,
    name,
    ...(email ? { email } : {}),
    ...(phones.length > 0 ? { phones } : {}),
    ...(sharedPhotoUrl ?? photoUrl ? { photoUrl: sharedPhotoUrl ?? photoUrl } : {}),
  }
}

// officialSheetLabel marks rows that were also updated from an official one-page facility sheet.
const sheetOperations = (facilityId: string, sourceRow: number, contacts: FacilityContact[], officialSheetLabel?: string): FacilityOperations => ({
  facilityId,
  sourceRow,
  source: `User-provided facility contact sheet, row ${sourceRow}${officialSheetLabel ? ` · Official facility sheet (${officialSheetLabel})` : ''}${contacts.some((contact) => normalizedEmail(contact.email) === JOHN_DIAZ_EMAIL) ? ` · ${JOHN_DIAZ_TITLE_SOURCE_NOTE}` : ''}`,
  contacts,
})

// Contact updates the user typed in directly, outside the contact sheet and the official facility sheets.
const userContactUpdate = (facilityId: string, contacts: FacilityContact[]): FacilityOperations => ({
  facilityId,
  sourceRow: 0,
  source: 'User-provided contact update, 2026-10-01',
  contacts,
})

// Official one-page facility sheets (extra_resources/Facility information) list operations leads without a contact-sheet row.
const officialSheetOperations = (facilityId: string, sheetLabel: string, contacts: FacilityContact[]): FacilityOperations => ({
  facilityId,
  sourceRow: 0,
  source: `Official facility sheet (${sheetLabel})`,
  contacts,
})

export const facilitiesNeedingOperationsContactReview = [
  'pooler-morgan-lakes',
  'west-sacramento-overland',
  'houston-navigation',
  'somerset-cottontail',
  'university-park-central',
] as const

export const facilityOperations: Partial<Record<string, FacilityOperations>> = {
  'buena-park-valley-view': {
    facilityId: 'buena-park-valley-view',
    source: `User-provided facility contact sheet, row 5 · ${JOHN_DIAZ_TITLE_SOURCE_NOTE}`,
    sourceRow: 5,
    contacts: [
      {
        id: 'michelle-topete',
        group: 'account-management',
        role: 'Manager of Account Management & Client Onboarding',
        name: 'Michelle Topete',
        email: MICHELLE_TOPETE_EMAIL,
        phones: MICHELLE_TOPETE_PHONES,
        photoUrl: MICHELLE_TOPETE_PHOTO_URL,
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
        role: JOHN_DIAZ_ROLE,
        name: 'John Diaz',
        email: JOHN_DIAZ_EMAIL,
        phones: JOHN_DIAZ_PHONES,
        photoUrl: JOHN_DIAZ_PHOTO_URL,
      },
    ],
  },
  'riverside-alessandro': sheetOperations('riverside-alessandro', 4, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', OSCAR_RODRIGUEZ_ROLE, 'Oscar Rodriguez', OSCAR_RODRIGUEZ_EMAIL, OSCAR_RODRIGUEZ_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'moreno-valley-heacock': sheetOperations('moreno-valley-heacock', 8, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', OSCAR_RODRIGUEZ_ROLE, 'Oscar Rodriguez', OSCAR_RODRIGUEZ_EMAIL, OSCAR_RODRIGUEZ_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'houston-citypark': sheetOperations('houston-citypark', 20, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Rick Griswold', RICK_GRISWOLD_EMAIL, RICK_GRISWOLD_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', JOHN_GLEASON_EMAIL, [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
    sheetContact('I', 'operations', 'Operations Supervisor', 'Ruben Echavarria', undefined, [], '/media/operations/houston-citypark/ruben-echavarria.png'),
  ], '144 – City Park'),
  'roanoke-highway-114': sheetOperations('roanoke-highway-114', 23, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Rick Griswold', RICK_GRISWOLD_EMAIL, RICK_GRISWOLD_PHONES),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ], '689 – Roanoke'),
  'tennessee-quality-drive': sheetOperations('tennessee-quality-drive', 19, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Jane Sanchez', 'jane.sanchez@unisco.com', [{ label: 'Office', display: '901-560-9291', href: '+19015609291' }, { label: 'Mobile', display: '662-408-2279', href: '+16624082279' }]),
    sheetContact('H', 'operations', JAVIER_MONTANE_ROLE, JAVIER_MONTANE_NAME, JAVIER_MONTANE_EMAIL, JAVIER_MONTANE_PHONES),
  ]),
  'tacoma-lincoln': sheetOperations('tacoma-lincoln', 25, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'tacoma-steele': sheetOperations('tacoma-steele', 26, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'jacksonville-ignition': sheetOperations('jacksonville-ignition', 9, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Adam Lubin', 'adam.lubin@unisco.com', [{ label: 'Phone', display: '657.705.7457', href: '+16577057457' }], '/media/operations/jacksonville-ignition/adam-lubin.png'),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', 'wayne.brooks@unisco.com', [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'pooler-seabrook-building-2': officialSheetOperations('pooler-seabrook-building-2', '823 – Pooler', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Lenivy Jackson', undefined, [], '/media/operations/pooler-seabrook-building-2/lenivy-jackson.png'),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', JOHN_GLEASON_EMAIL, [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'summerville-cypress-tradeport': officialSheetOperations('summerville-cypress-tradeport', '875 – Summerville', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Stephen Schumaker', undefined, [], '/media/operations/summerville-cypress-tradeport/stephen-schumaker.png'),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', JOHN_GLEASON_EMAIL, [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'garden-city-prosperity': officialSheetOperations('garden-city-prosperity', '804 – Garden City', [
    sheetContact('F', 'operations', 'General Manager', 'Frank Feliciano', undefined, [], '/media/operations/garden-city-prosperity/frank-feliciano.png'),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', JOHN_GLEASON_EMAIL, [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'las-vegas-marion-building-5': sheetOperations('las-vegas-marion-building-5', 16, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Frederico Ramos', 'frederico.ramos@unisco.com'),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'long-beach-willow': sheetOperations('long-beach-willow', 6, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    // Full name and title user-provided on 2026-10-01 (the contact sheet listed Efrain Islas, General Manager).
    sheetContact('F', 'operations', 'Warehouse Lead', 'Efrain Islas Alcaraz', 'efrain.islas@unisco.com', [{ label: 'Phone', display: '626-313-8756', href: '+16263138756' }]),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  'joliet-brandon': sheetOperations('joliet-brandon', 13, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Fabian Quiroz', 'fabian.quiroz@unisco.com', [{ label: 'Phone', display: '626-693-6394', href: '+16266936394' }], '/media/operations/joliet-brandon/fabian-quiroz.png'),
    sheetContact('G', 'operations', JAVIER_MONTANE_ROLE, JAVIER_MONTANE_NAME, JAVIER_MONTANE_EMAIL, JAVIER_MONTANE_PHONES),
  ]),
  'el-paso-emerald-12100': userContactUpdate('el-paso-emerald-12100', [
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
  ]),
  'el-paso-emerald-12102-building-5': sheetOperations('el-paso-emerald-12102-building-5', 22, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2364', href: '+16268992364' }]),
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
  ]),
  'waddell-cotton': sheetOperations('waddell-cotton', 3, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', OSCAR_RODRIGUEZ_ROLE, 'Oscar Rodriguez', OSCAR_RODRIGUEZ_EMAIL, OSCAR_RODRIGUEZ_PHONES),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'ontario-airport': sheetOperations('ontario-airport', 7, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', OSCAR_RODRIGUEZ_ROLE, 'Oscar Rodriguez', OSCAR_RODRIGUEZ_EMAIL),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'kent-85th-avenue-range': userContactUpdate('kent-85th-avenue-range', [
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
  ]),
  'sparks-vista': sheetOperations('sparks-vista', 15, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    // Title and portrait user-provided on 2026-10-01 (the contact sheet listed General Manager).
    sheetContact('F', 'operations', 'Operations Supervisor', 'Onoriode Enaigbe', 'onoriode.enaigbe@unisco.com', [{ label: 'Cell', display: '(626) 996-5604', href: '+16269965604' }], '/media/operations/sparks-vista/onoriode-enaigbe.png'),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'memphis-delp': sheetOperations('memphis-delp', 18, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Jane Sanchez', 'jane.sanchez@unisco.com', [{ label: 'Office', display: '901-560-9291', href: '+19015609291' }, { label: 'Mobile', display: '662-408-2279', href: '+16624082279' }]),
    sheetContact('H', 'operations', JAVIER_MONTANE_ROLE, JAVIER_MONTANE_NAME, JAVIER_MONTANE_EMAIL, JAVIER_MONTANE_PHONES),
  ]),
  'salt-lake-city-jimmy-doolittle': userContactUpdate('salt-lake-city-jimmy-doolittle', [
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
  ]),
  'plano-10th-f-avenue': sheetOperations('plano-10th-f-avenue', 24, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
}

export const getFacilityOperations = (facilityId: string) => facilityOperations[facilityId]
