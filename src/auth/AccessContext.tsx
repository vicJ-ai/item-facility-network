import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AccessContext, type AccessUser } from './access-context'

export function AccessProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AccessUser | null>(null)
  const [csrfToken, setCsrfToken] = useState('')

  const clear = useCallback(() => {
    setUser(null)
    setCsrfToken('')
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json() as { authenticated?: boolean; user?: AccessUser; csrfToken?: string }
        if (!active) return
        if (response.ok && body.authenticated && body.user && body.csrfToken) {
          setUser(body.user)
          setCsrfToken(body.csrfToken)
        } else clear()
      })
      .catch(() => { if (active) clear() })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [clear])

  const signIn = useCallback(async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const body = await response.json().catch(() => ({})) as { error?: string; user?: AccessUser; csrfToken?: string }
    if (!response.ok || !body.user || !body.csrfToken) {
      if (body.error === 'service_unavailable') throw new Error('WISE sign-in is temporarily unavailable.')
      if (response.status === 429) throw new Error('Too many sign-in attempts. Try again later.')
      throw new Error('Sign-in failed. Check your WISE credentials and approved access.')
    }
    setUser(body.user)
    setCsrfToken(body.csrfToken)
  }, [])

  const authorizedFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) headers.set('x-csrf-token', csrfToken)
    const response = await fetch(input, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
    if (response.status === 401) clear()
    return response
  }, [clear, csrfToken])

  const signOut = useCallback(async () => {
    const response = await authorizedFetch('/api/auth/logout', { method: 'POST' })
    if (response.ok || response.status === 401) {
      clear()
      return
    }
    throw new Error('Sign-out failed. Your session is still active.')
  }, [authorizedFetch, clear])

  const value = useMemo(() => ({ loading, user, signIn, signOut, authorizedFetch }), [authorizedFetch, loading, signIn, signOut, user])
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}
