export type FacilityContact = {
  id: string
  group: 'account-management' | 'operations'
  role: string
  name: string
  email: string
  phone?: string
  phoneHref?: string
  photoUrl?: string
}

export type FacilityOperations = {
  facilityId: string
  source: string
  contacts: FacilityContact[]
}

export const facilityOperations: Partial<Record<string, FacilityOperations>> = {
  'buena-park-valley-view': {
    facilityId: 'buena-park-valley-view',
    source: 'User-provided facility contact sheet, row 5',
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
        email: 'john.diaz@unisco.com',
      },
    ],
  },
}

export const getFacilityOperations = (facilityId: string) => facilityOperations[facilityId]
