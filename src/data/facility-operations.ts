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

// Portraits are 400×400 head-and-shoulders crops in /media/operations/portraits, framed so every face sits at a similar
// size and position. The supplied originals stay beside them in their facility and people folders.
export const HAROLD_CUAREZMA_EMAIL = 'harold.cuarezma@unisco.com'
export const HAROLD_CUAREZMA_PHOTO_URL = '/media/operations/portraits/harold-cuarezma.jpg'

export const JAVIER_MONTANE_EMAIL = 'javier.montane@unisco.com'
// Full name, title, mobile label, and portrait user-provided on 2026-10-01.
export const JAVIER_MONTANE_NAME = 'Javier Gonzalez Montane'
export const JAVIER_MONTANE_ROLE = 'Director of Operations'
const JAVIER_MONTANE_PHONES: FacilityContactPhone[] = [{ label: 'Mobile', display: '657-705-7452', href: '+16577057452' }]
export const JAVIER_MONTANE_PHOTO_URL = '/media/operations/portraits/javier-montane.jpg'

export const JOHN_DIAZ_EMAIL = 'john.diaz@unisco.com'
export const JOHN_DIAZ_PHOTO_URL = '/media/operations/portraits/john-diaz.jpg'
export const JOHN_DIAZ_ROLE = 'Sr. Vice President of Operations'
export const JOHN_DIAZ_TITLE_SOURCE_NOTE = 'John Diaz title corrected by user on 2026-09-30.'
// User-provided on 2026-10-01; the contact sheet had no phone for him.
const JOHN_DIAZ_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '626-705-1154', href: '+16267051154' }]

export const JOHN_GLEASON_EMAIL = 'john.gleason@unisco.com'
export const JOHN_GLEASON_PHOTO_URL = '/media/operations/portraits/john-gleason.jpg'
export const JOHN_GLEASON_ROLE = 'VP of Operations'
const JOHN_GLEASON_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]
// User-provided VP split on 2026-10-01: John Gleason covers Texas, Savannah (Pooler and Garden City), Florida, and South Carolina;
// John Diaz covers every other building.

export const OSCAR_RODRIGUEZ_EMAIL = 'oscar.rodriguez@unisco.com'
// The user asked on 2026-10-01 to show Oscar without a portrait until a replacement is supplied.
// User-provided on 2026-10-01: Senior GM for Riverside, Moreno Valley, and Waddell (Amazon); the title also applies at Ontario.
export const OSCAR_RODRIGUEZ_ROLE = 'Senior General Manager'
// The contact sheet's Riverside number, extended to his other sites at the user's request.
const OSCAR_RODRIGUEZ_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '951-374-2495', href: '+19513742495' }]

export const JUAN_BARRAGAN_EMAIL = 'juan.barragan@unisco.com'
export const JUAN_BARRAGAN_PHOTO_URL = '/media/operations/portraits/juan-barragan.jpg'
// User-provided on 2026-10-01: senior GM for both Tacoma sites, Salt Lake City, Waddell, and Kent; the title also applies at Las Vegas and Sparks.
export const JUAN_BARRAGAN_ROLE = 'WA Senior General Manager'
const JUAN_BARRAGAN_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '657-509-0607', href: '+16575090607' }]

export const RICK_GRISWOLD_EMAIL = 'richard.griswold@unisco.com'
export const RICK_GRISWOLD_PHOTO_URL = '/media/operations/portraits/rick-griswold.jpg'
// The official 689 – Roanoke and 144 – City Park sheets list him as Rick Griswold, General Manager of both sites.
const RICK_GRISWOLD_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '657-689-6442', href: '+16576896442' }]

export const JESSICA_BARAJAS_EMAIL = 'jessica.barajas@unisco.com'
export const JESSICA_BARAJAS_PHOTO_URL = '/media/operations/portraits/jessica-barajas.jpg'
// User-provided on 2026-10-01: Operations Manager for every Texas site (first given for both El Paso sites); the user kept only her work number.
const JESSICA_BARAJAS_PHONES: FacilityContactPhone[] = [{ label: 'Office', display: '915.777.7257', href: '+19157777257' }]

export const LENIVY_JACKSON_PHOTO_URL = '/media/operations/portraits/lenivy-jackson.jpg'
// Replacement portraits supplied and filename-identified by the user on 2026-10-02; identities were not independently verified.
export const REPLACEMENT_PORTRAIT_SOURCE_NOTE = 'Javier Gonzalez Montane, Jessica Barajas, John Gleason, and Lenivy Jackson portraits supplied and filename-identified by user on 2026-10-02.'

export const ADAM_LUBIN_PHOTO_URL = '/media/operations/portraits/adam-lubin.jpg'
export const STEPHEN_SCHUMAKER_PHOTO_URL = '/media/operations/portraits/stephen-schumaker.jpg'
export const FRANK_FELICIANO_PHOTO_URL = '/media/operations/portraits/frank-feliciano.jpg'
// Email and phone from the UNIS Warehouse Point of Contact sheet (2026-10-02); the official facility sheets listed neither.
export const STEPHEN_SCHUMAKER_EMAIL = 'stephen.schumaker@unisco.com'
const STEPHEN_SCHUMAKER_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '(775) 409-2042', href: '+17754092042' }]
export const FRANK_FELICIANO_EMAIL = 'frank.feliciano@unisco.com'
const FRANK_FELICIANO_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '657-413-8190', href: '+16574138190' }]
export const EFRAIN_ISLAS_ALCARAZ_PHOTO_URL = '/media/operations/portraits/efrain-islas-alcaraz.jpg'
// Portraits supplied and filename-identified by the user on 2026-10-02; identities were not independently verified.
export const OPERATIONS_PORTRAIT_SOURCE_NOTE = 'Adam Lubin, Stephen Schumaker, Frank Feliciano, and Efrain Islas Alcaraz portraits supplied and filename-identified by user on 2026-10-02.'

export const MICHELLE_TOPETE_EMAIL = 'michelle.topete@unisco.com'
export const MICHELLE_TOPETE_PHOTO_URL = '/media/operations/portraits/michelle-topete.jpg'
// User-corrected on 2026-10-01; this shared number applies everywhere Michelle is listed.
export const MICHELLE_TOPETE_CONTACT_SOURCE_NOTE = 'Michelle Topete contact corrected by user on 2026-10-01.'
const MICHELLE_TOPETE_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '626.829.3160', href: '+16268293160' }]

export const MARY_SMOTHERS_EMAIL = 'mary.smothers@unisco.com'
export const MARY_SMOTHERS_PHOTO_URL = '/media/operations/portraits/mary-smothers.jpg'
// Portrait supplied and identified as Mary Smothers by the user on 2026-10-01; not independently identity-verified.
export const MARY_SMOTHERS_PHOTO_SOURCE_NOTE = 'Mary Smothers portrait supplied and identified by user on 2026-10-01; identity not independently verified.'

export const JIMMY_ESPARZA_EMAIL = 'jimmy.esparza@unisco.com'
export const JIMMY_ESPARZA_PHOTO_URL = '/media/operations/portraits/jimmy-esparza.jpg'
// Name, title, phone, and portrait supplied by the user on 2026-10-01 for University Park; email added in a follow-up the same day.
export const JIMMY_ESPARZA_SOURCE_NOTE = 'Jimmy Esparza contact and portrait supplied by user on 2026-10-01; identity not independently verified.'
const JIMMY_ESPARZA_PHONES: FacilityContactPhone[] = [{ label: 'Phone', display: '626-341-7845', href: '+16263417845' }]

export const WAYNE_BROOKS_EMAIL = 'wayne.brooks@unisco.com'
export const WAYNE_BROOKS_PHOTO_URL = '/media/operations/portraits/wayne-brooks.jpg'

const sharedPhotoUrlsByEmail: Record<string, string> = {
  [HAROLD_CUAREZMA_EMAIL]: HAROLD_CUAREZMA_PHOTO_URL,
  [JAVIER_MONTANE_EMAIL]: JAVIER_MONTANE_PHOTO_URL,
  [JOHN_DIAZ_EMAIL]: JOHN_DIAZ_PHOTO_URL,
  [JOHN_GLEASON_EMAIL]: JOHN_GLEASON_PHOTO_URL,
  [JUAN_BARRAGAN_EMAIL]: JUAN_BARRAGAN_PHOTO_URL,
  [RICK_GRISWOLD_EMAIL]: RICK_GRISWOLD_PHOTO_URL,
  [JESSICA_BARAJAS_EMAIL]: JESSICA_BARAJAS_PHOTO_URL,
  [MARY_SMOTHERS_EMAIL]: MARY_SMOTHERS_PHOTO_URL,
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
  source: `User-provided contact update, 2026-10-01${contacts.some((contact) => normalizedEmail(contact.email) === JOHN_DIAZ_EMAIL) ? ` · ${JOHN_DIAZ_TITLE_SOURCE_NOTE}` : ''}`,
  contacts,
})

// Official one-page facility sheets (extra_resources/Facility information) list operations leads without a contact-sheet row.
const officialSheetOperations = (facilityId: string, sheetLabel: string, contacts: FacilityContact[]): FacilityOperations => ({
  facilityId,
  sourceRow: 0,
  source: `Official facility sheet (${sheetLabel})`,
  contacts,
})

export const POINT_OF_CONTACT_SHEET_NOTE = 'UNIS Warehouse Point of Contact sheet, 2026-10-02'

// Records whose contacts were added or corrected from the UNIS Warehouse Point of Contact sheet. That sheet's VP column is
// not used: the user's regional VP split stays in place.
const withPointOfContactSheet = (record: FacilityOperations): FacilityOperations => ({
  ...record,
  source: `${record.source} · ${POINT_OF_CONTACT_SHEET_NOTE}`,
})

// These sites still need site-level contacts mapped (no confirmed General Manager yet); until then they show only the people
// the user or the point-of-contact sheet has assigned to them.
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
        email: MARY_SMOTHERS_EMAIL,
        phone: '626-899-2363',
        phoneHref: '+16268992363',
        photoUrl: MARY_SMOTHERS_PHOTO_URL,
      },
      {
        id: 'ruben-jauregui',
        group: 'operations',
        role: 'General Manager',
        name: 'Ruben Jauregui',
        email: 'ruben.jauregui@unisco.com',
        phone: '562-644-4594',
        phoneHref: '+15626444594',
        photoUrl: '/media/operations/portraits/ruben-jauregui.jpg',
      },
      {
        id: 'mark-tuttle',
        group: 'operations',
        role: 'Director of Operations',
        name: 'Mark Tuttle',
        email: 'mark.tuttle@unisco.com',
        phone: '657-689-6951',
        phoneHref: '+16576896951',
        photoUrl: '/media/operations/portraits/mark-tuttle.jpg',
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
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
    sheetContact('H', 'operations', JOHN_GLEASON_ROLE, 'John Gleason', JOHN_GLEASON_EMAIL, JOHN_GLEASON_PHONES),
    sheetContact('I', 'operations', 'Operations Supervisor', 'Ruben Echavarria', undefined, [], '/media/operations/portraits/ruben-echavarria.jpg'),
  ], '144 – City Park'),
  'roanoke-highway-114': sheetOperations('roanoke-highway-114', 23, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Rick Griswold', RICK_GRISWOLD_EMAIL, RICK_GRISWOLD_PHONES),
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ], '689 – Roanoke'),
  'tennessee-quality-drive': sheetOperations('tennessee-quality-drive', 19, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Jane Sanchez', 'jane.sanchez@unisco.com', [{ label: 'Office', display: '901-560-9291', href: '+19015609291' }, { label: 'Mobile', display: '662-408-2279', href: '+16624082279' }]),
    sheetContact('H', 'operations', JAVIER_MONTANE_ROLE, JAVIER_MONTANE_NAME, JAVIER_MONTANE_EMAIL, JAVIER_MONTANE_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
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
    sheetContact('F', 'operations', 'General Manager', 'Adam Lubin', 'adam.lubin@unisco.com', [{ label: 'Phone', display: '657.705.7457', href: '+16577057457' }], ADAM_LUBIN_PHOTO_URL),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', 'wayne.brooks@unisco.com', [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'pooler-seabrook-building-2': officialSheetOperations('pooler-seabrook-building-2', '823 – Pooler', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Lenivy Jackson', undefined, [], LENIVY_JACKSON_PHOTO_URL),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', JOHN_GLEASON_EMAIL, [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  'summerville-cypress-tradeport': withPointOfContactSheet(officialSheetOperations('summerville-cypress-tradeport', '875 – Summerville', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Stephen Schumaker', STEPHEN_SCHUMAKER_EMAIL, STEPHEN_SCHUMAKER_PHONES, STEPHEN_SCHUMAKER_PHOTO_URL),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', JOHN_GLEASON_EMAIL, [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ])),
  'garden-city-prosperity': withPointOfContactSheet(officialSheetOperations('garden-city-prosperity', '804 – Garden City', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Frank Feliciano', FRANK_FELICIANO_EMAIL, FRANK_FELICIANO_PHONES, FRANK_FELICIANO_PHOTO_URL),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', JOHN_GLEASON_EMAIL, [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ])),
  'las-vegas-marion-building-5': sheetOperations('las-vegas-marion-building-5', 16, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Frederico Ramos', 'frederico.ramos@unisco.com'),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  'long-beach-willow': sheetOperations('long-beach-willow', 6, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    // Full name and title user-provided on 2026-10-01 (the contact sheet listed Efrain Islas, General Manager).
    sheetContact('F', 'operations', 'Operations Manager', 'Efrain Islas Alcaraz', 'efrain.islas@unisco.com', [{ label: 'Phone', display: '626-313-8756', href: '+16263138756' }], EFRAIN_ISLAS_ALCARAZ_PHOTO_URL),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  'joliet-brandon': sheetOperations('joliet-brandon', 13, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Fabian Quiroz', 'fabian.quiroz@unisco.com', [{ label: 'Phone', display: '626-693-6394', href: '+16266936394' }], '/media/operations/portraits/fabian-quiroz.jpg'),
    sheetContact('G', 'operations', JAVIER_MONTANE_ROLE, JAVIER_MONTANE_NAME, JAVIER_MONTANE_EMAIL, JAVIER_MONTANE_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  // The point-of-contact sheet lists this site as 12104 Emerald Pass Dr; the user confirmed it is the same facility.
  'el-paso-emerald-12100': withPointOfContactSheet(userContactUpdate('el-paso-emerald-12100', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
    sheetContact('H', 'operations', JOHN_GLEASON_ROLE, 'John Gleason', JOHN_GLEASON_EMAIL, JOHN_GLEASON_PHONES),
  ])),
  'el-paso-emerald-12102-building-5': sheetOperations('el-paso-emerald-12102-building-5', 22, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2364', href: '+16268992364' }]),
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
    sheetContact('H', 'operations', JOHN_GLEASON_ROLE, 'John Gleason', JOHN_GLEASON_EMAIL, JOHN_GLEASON_PHONES),
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
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  'sparks-vista': sheetOperations('sparks-vista', 15, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    // Title and portrait user-provided on 2026-10-01 (the contact sheet listed General Manager).
    sheetContact('F', 'operations', 'Operations Supervisor', 'Onoriode Enaigbe', 'onoriode.enaigbe@unisco.com', [{ label: 'Cell', display: '(626) 996-5604', href: '+16269965604' }], '/media/operations/portraits/onoriode-enaigbe.jpg'),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ]),
  'memphis-delp': sheetOperations('memphis-delp', 18, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'General Manager', 'Jane Sanchez', 'jane.sanchez@unisco.com', [{ label: 'Office', display: '901-560-9291', href: '+19015609291' }, { label: 'Mobile', display: '662-408-2279', href: '+16624082279' }]),
    sheetContact('H', 'operations', JAVIER_MONTANE_ROLE, JAVIER_MONTANE_NAME, JAVIER_MONTANE_EMAIL, JAVIER_MONTANE_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  // The point-of-contact sheet lists this site as 475 N Jimmy Doolittle Rd; the user confirmed it is the same facility.
  'salt-lake-city-jimmy-doolittle': withPointOfContactSheet(userContactUpdate('salt-lake-city-jimmy-doolittle', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('I', 'operations', JUAN_BARRAGAN_ROLE, 'Juan Barragan', JUAN_BARRAGAN_EMAIL, JUAN_BARRAGAN_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Field Operations', 'Harold Cuarezma', 'harold.cuarezma@unisco.com', [{ label: 'Cell', display: '909-753-6346', href: '+19097536346' }, { label: 'Mobile', display: '626-362-9596', href: '+16263629596' }]),
  ])),
  'plano-10th-f-avenue': sheetOperations('plano-10th-f-avenue', 24, [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
    sheetContact('H', 'operations', 'VP of Operations', 'John Gleason', 'john.gleason@unisco.com', [{ label: 'Phone', display: '909.993.7174', href: '+19099937174' }]),
  ]),
  // Sites still awaiting site-level contact mapping list only the people assigned to them by the user (2026-10-01) or the
  // point-of-contact sheet (2026-10-02).
  'houston-navigation': userContactUpdate('houston-navigation', [
    sheetContact('F', 'operations', 'Operations Manager', 'Jessica Barajas', JESSICA_BARAJAS_EMAIL, JESSICA_BARAJAS_PHONES),
    sheetContact('H', 'operations', JOHN_GLEASON_ROLE, 'John Gleason', JOHN_GLEASON_EMAIL, JOHN_GLEASON_PHONES),
  ]),
  'pooler-morgan-lakes': withPointOfContactSheet(userContactUpdate('pooler-morgan-lakes', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('G', 'operations', 'Director of Operations', 'Wayne Brooks', WAYNE_BROOKS_EMAIL, [{ label: 'Phone', display: '912.660.0703', href: '+19126600703' }]),
    sheetContact('H', 'operations', JOHN_GLEASON_ROLE, 'John Gleason', JOHN_GLEASON_EMAIL, JOHN_GLEASON_PHONES),
  ])),
  'west-sacramento-overland': userContactUpdate('west-sacramento-overland', [
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  'somerset-cottontail': userContactUpdate('somerset-cottontail', [
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
  ]),
  'university-park-central': withPointOfContactSheet(userContactUpdate('university-park-central', [
    sheetContact('D', 'account-management', 'Manager of Account Management & Client Onboarding', 'Michelle Topete', MICHELLE_TOPETE_EMAIL, MICHELLE_TOPETE_PHONES),
    sheetContact('E', 'account-management', 'Sr Director of Account Management & Client Onboarding', 'Mary Smothers', 'mary.smothers@unisco.com', [{ label: 'Phone', display: '626-899-2363', href: '+16268992363' }]),
    sheetContact('G', 'operations', JAVIER_MONTANE_ROLE, JAVIER_MONTANE_NAME, JAVIER_MONTANE_EMAIL, JAVIER_MONTANE_PHONES),
    sheetContact('H', 'operations', JOHN_DIAZ_ROLE, 'John Diaz', JOHN_DIAZ_EMAIL, JOHN_DIAZ_PHONES),
    sheetContact('J', 'operations', 'Regional Director of Operations', 'Jimmy Esparza', JIMMY_ESPARZA_EMAIL, JIMMY_ESPARZA_PHONES, JIMMY_ESPARZA_PHOTO_URL),
  ])),
}

export const getFacilityOperations = (facilityId: string) => facilityOperations[facilityId]
