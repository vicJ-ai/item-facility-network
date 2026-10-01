import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, LoaderCircle, LogIn, LogOut, Search, Settings, ShieldCheck, UserRoundCog, X } from 'lucide-react'
import { useAccess, type AccessUser } from '../auth/access-context'

type DirectoryEmployee = { iamUserId: string; userName: string; displayName: string }
type ManagedAdmin = AccessUser & { isActive: boolean; version: number }
type AccessData = { admins: ManagedAdmin[]; audit: Array<{ id: string; action: string; actor_name: string | null; target_name: string | null; created_at: string }> }

export function AccessControls() {
  const access = useAccess()
  const [signInOpen, setSignInOpen] = useState(false)
  const [configureOpen, setConfigureOpen] = useState(false)
  const [signOutPending, setSignOutPending] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const closeSignIn = useCallback(() => setSignInOpen(false), [])
  const closeConfigure = useCallback(() => setConfigureOpen(false), [])

  const signOut = async () => {
    setSignOutPending(true)
    setSignOutError('')
    try {
      await access.signOut()
    } catch {
      setSignOutError('Sign-out failed. Your session is still active.')
    } finally {
      setSignOutPending(false)
    }
  }

  if (access.loading) return <span className="access-loading" aria-label="Checking access"><LoaderCircle className="spin" /></span>
  if (!access.user) return <><button className="wise-sign-in" type="button" onClick={() => { setSignOutError(''); setSignInOpen(true) }}><LogIn size={16} />WISE sign in</button>{signInOpen && <SignInDialog onClose={closeSignIn} />}</>
  return (
    <>
      {access.user.canConfigure && <button className="wise-configure" type="button" onClick={() => setConfigureOpen(true)}><Settings size={16} />Configure Admins</button>}
      {signOutError && <span className="access-signout-status" role="alert">{signOutError}</span>}
      <button className="wise-user" type="button" onClick={() => void signOut()} title="Sign out" disabled={signOutPending}><span>{signOutPending ? 'Signing out…' : access.user.displayName}</span>{signOutPending ? <LoaderCircle className="spin" size={15} /> : <LogOut size={15} />}</button>
      {signInOpen && <SignInDialog onClose={closeSignIn} />}
      {configureOpen && <ConfigureAdminsDialog onClose={closeConfigure} />}
    </>
  )
}

function useAccessibleDialog<T extends HTMLElement>(onClose: () => void) {
  const dialog = useRef<T>(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!element) return
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    const focusables = () => [...element.querySelectorAll<HTMLElement>(focusableSelector)].filter((candidate) => candidate.getAttribute('aria-hidden') !== 'true')
    const initialFocus = element.querySelector<HTMLElement>('[data-initial-focus]') || focusables()[0] || element
    initialFocus.focus()
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const candidates = focusables()
      if (!candidates.length) { event.preventDefault(); element.focus(); return }
      const first = candidates[0]
      const last = candidates[candidates.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    element.addEventListener('keydown', keyDown)
    return () => {
      element.removeEventListener('keydown', keyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onClose])
  return dialog
}

function SignInDialog({ onClose }: { onClose: () => void }) {
  const { signIn } = useAccess()
  const titleId = useId()
  const dialog = useAccessibleDialog<HTMLDivElement>(onClose)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) { setPassword(''); setError('Enter your WISE username and password.'); return }
    setPending(true); setError('')
    try {
      await signIn(username, password)
      setPassword(''); setPending(false); onClose()
    } catch (value) {
      setPassword(''); setError(value instanceof Error ? value.message : 'Sign-in failed.'); setPending(false)
    }
  }
  return <div className="access-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="access-modal sign-in-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialog}>
      <header><span><ShieldCheck size={20} /><strong id={titleId}>Administrator sign in</strong></span><button className="icon-button" aria-label="Close sign in" onClick={onClose}><X /></button></header>
      <p>Use your WISE employee credentials. Public facility browsing does not require sign-in.</p>
      <form onSubmit={submit}>
        <label><span>WISE username</span><input data-initial-focus value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={254} disabled={pending} /></label>
        <label><span>Password</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" maxLength={512} disabled={pending} /></label>
        {error && <div className="access-message error" role="alert">{error}</div>}
        <button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <LogIn />}{pending ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  </div>
}

function ConfigureAdminsDialog({ onClose }: { onClose: () => void }) {
  const { user, authorizedFetch } = useAccess()
  const titleId = useId()
  const dialog = useAccessibleDialog<HTMLElement>(onClose)
  const mounted = useRef(true)
  const [data, setData] = useState<AccessData | null>(null)
  const [selected, setSelected] = useState<DirectoryEmployee | null>(null)
  const [version, setVersion] = useState<number | undefined>()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DirectoryEmployee[]>([])
  const [isActive, setIsActive] = useState(true)
  const [canConfigure, setCanConfigure] = useState(false)
  const [pending, setPending] = useState('load')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async () => {
    if (!mounted.current) return
    setPending('load')
    try {
      const response = await authorizedFetch('/api/admin/access')
      if (!response.ok) throw new Error('load_failed')
      const nextData = await response.json() as AccessData
      if (mounted.current) setData(nextData)
    } catch {
      if (mounted.current) setMessage({ type: 'error', text: 'Administrator access could not be loaded.' })
    } finally {
      if (mounted.current) setPending('')
    }
  }, [authorizedFetch])
  // Loading the server-owned directory is the purpose of this dialog-opening effect.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    // Clear stale suggestions when the query is no longer eligible for a directory request.
    // oxlint-disable-next-line react/set-state-in-effect
    if (query.trim().length < 2 || selected?.userName === query) { setResults([]); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await authorizedFetch(`/api/admin/employees?q=${encodeURIComponent(query.trim())}&page=1`, { signal: controller.signal })
        if (!response.ok) throw new Error('search_failed')
        const employees = ((await response.json()) as { employees: DirectoryEmployee[] }).employees
        if (!controller.signal.aborted && mounted.current) setResults(employees)
      } catch {
        if (!controller.signal.aborted && mounted.current) setMessage({ type: 'error', text: 'Employee search is unavailable.' })
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [authorizedFetch, query, selected])

  const reset = () => { setSelected(null); setVersion(undefined); setQuery(''); setResults([]); setIsActive(true); setCanConfigure(false); setMessage(null) }
  const edit = (admin: ManagedAdmin) => { setSelected({ iamUserId: admin.iamUserId, userName: admin.username, displayName: admin.displayName }); setVersion(admin.version); setQuery(admin.username); setResults([]); setIsActive(admin.isActive); setCanConfigure(admin.canConfigure); setMessage(null) }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) { setMessage({ type: 'error', text: 'Search and select a trusted WISE employee.' }); return }
    setPending('save'); setMessage(null)
    try {
      const response = await authorizedFetch('/api/admin/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ iamUserId: selected.iamUserId, isActive, canConfigure, ...(version ? { version } : {}) }) })
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        const messages: Record<string, string> = { self_protection: 'You cannot deactivate or remove your own configuration access.', last_configuration_admin: 'At least one active configuration administrator is required.', stale_record: 'This administrator already exists or changed. Select their entry in Approved administrators and try again.', employee_not_eligible: 'The selected employee is no longer eligible.' }
        if (mounted.current) setMessage({ type: 'error', text: messages[body.error || ''] || 'Administrator access could not be saved.' })
        return
      }
      reset(); setMessage({ type: 'success', text: 'Administrator access saved.' }); await load()
    } catch {
      if (mounted.current) setMessage({ type: 'error', text: 'Administrator access could not be saved.' })
    } finally {
      if (mounted.current) setPending('')
    }
  }

  return <div className="access-modal-layer"><section className="access-modal configure-admins-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialog}>
    <header><span><UserRoundCog size={21} /><strong id={titleId}>Configure Admins</strong></span><button className="icon-button" aria-label="Close Configure Admins" onClick={onClose}><X /></button></header>
    <p>Select an active internal WISE employee. Access is bound to the immutable employee ID after server revalidation. To change existing access, select that person under Approved administrators.</p>
    {message && <div className={`access-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}
    <div className="admin-config-layout">
      <form className="admin-config-form" onSubmit={save}>
        <label><span>WISE employee</span><div className="employee-search"><Search size={16} /><input data-initial-focus value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null) }} placeholder="Search employee name or username" disabled={pending === 'save'} /></div></label>
        {results.length > 0 && <div className="employee-results" role="listbox" aria-label="Eligible WISE employees">{results.map((employee) => <button type="button" role="option" aria-selected="false" key={employee.iamUserId} onClick={() => { setSelected(employee); setQuery(employee.userName); setResults([]) }}><strong>{employee.displayName}</strong><span>{employee.userName} · ID {employee.iamUserId}</span></button>)}</div>}
        {selected && <div className="selected-employee"><CheckCircle2 size={17} /><span><strong>{selected.displayName}</strong><small>{selected.userName} · ID {selected.iamUserId}</small></span></div>}
        <label className="admin-checkbox"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span>Access active</span></label>
        <label className="admin-checkbox"><input type="checkbox" checked={canConfigure} onChange={(event) => setCanConfigure(event.target.checked)} /><span>Enable configuration access</span></label>
        <div className="admin-config-actions"><button className="primary-button" disabled={pending === 'save'}>{pending === 'save' ? <LoaderCircle className="spin" /> : <ShieldCheck />}{pending === 'save' ? 'Saving…' : 'Save access'}</button><button className="secondary-button" type="button" onClick={reset}>Clear</button></div>
      </form>
      <section className="admin-directory" aria-label="Approved administrators">
        <h3>Approved administrators</h3>
        {pending === 'load' ? <p>Loading access…</p> : data?.admins.length ? data.admins.map((admin) => <button type="button" key={admin.id} onClick={() => edit(admin)}><span><strong>{admin.displayName}</strong><small>{admin.username} · ID {admin.iamUserId}</small></span><span className={admin.isActive ? 'active' : 'inactive'}>{admin.isActive ? 'Active' : 'Inactive'}{admin.canConfigure ? ' · Configuration' : ' · Operations'}</span>{admin.id === user?.id && <small>You</small>}</button>) : <p>No administrators configured.</p>}
      </section>
    </div>
  </section></div>
}
