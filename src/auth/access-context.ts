import { createContext, useContext } from 'react'

export type AccessUser = {
  id: string
  iamUserId: string
  tenantId: string
  username: string
  email: string | null
  displayName: string
  canConfigure: boolean
}

export type AccessContextValue = {
  loading: boolean
  user: AccessUser | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export const AccessContext = createContext<AccessContextValue | null>(null)

export function useAccess() {
  const value = useContext(AccessContext)
  if (!value) throw new Error('useAccess requires AccessProvider')
  return value
}
