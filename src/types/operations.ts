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

export type OperationsResponse = {
  operations: FacilityOperations | null
  reviewRequired: boolean
}
