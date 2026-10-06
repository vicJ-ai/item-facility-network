import { memo, type ReactNode } from 'react'
import { Bell, ClipboardList, Grid2X2, Map as MapIcon, Menu, Moon, PackageSearch, Search, SlidersHorizontal, Sun, X } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import type { AppView } from './types'

const navItems = [
  ['Dashboard', Grid2X2, 'dashboard'], ['Facilities', MapIcon, 'locations'],
  ['Operations', SlidersHorizontal, 'operations'], ['Analytics', PackageSearch, null], ['Reports', ClipboardList, null],
] as const

type AppHeaderProps = {
  appView: AppView
  /** The tour's top bar covers the header, so it is taken out of the tab order while the tour plays. */
  inert: boolean
  theme: Theme
  onToggleTheme: () => void
  search: string
  onSearchChange: (search: string) => void
  mobileNavOpen: boolean
  onToggleMobileNav: () => void
  /** Called on hover or focus of the Dashboard link to start loading the globe early, when it will be shown. */
  onWarmDashboard?: () => void
  onNavigate: (view: AppView | null, label: string) => void
  onNotice: (notice: string) => void
  accessControls: ReactNode
  signedIn: boolean
}

export const AppHeader = memo(function AppHeader({ appView, inert, theme, onToggleTheme, search, onSearchChange, mobileNavOpen, onToggleMobileNav, onWarmDashboard, onNavigate, onNotice, accessControls, signedIn }: AppHeaderProps) {
  const visibleNavItems = navItems.filter(([label]) => signedIn || !['Operations', 'Analytics', 'Reports'].includes(label))
  return (
    <header className="topbar" inert={inert}>
      <button className="menu-button icon-button" aria-label="Open navigation" onClick={onToggleMobileNav}><Menu /></button>
      <div className="brand" aria-label="ITEM Locations Network"><img src="/brand/item-logo-fullcolor-whitetxt.svg" alt="ITEM" /><span>LOCATIONS NETWORK</span></div>
      <nav className={mobileNavOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Primary navigation">
        {visibleNavItems.map(([label, Icon, view]) => (
          <button
            key={label}
            className={view === appView ? 'active' : ''}
            aria-current={view === appView ? 'page' : undefined}
            onPointerEnter={view === 'dashboard' ? onWarmDashboard : undefined}
            onFocus={view === 'dashboard' ? onWarmDashboard : undefined}
            onClick={() => onNavigate(view, label)}
          >
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="top-actions">
        {appView === 'locations' && (
          <label className="global-search">
            <Search size={17} /><span className="sr-only">Search facilities</span>
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search address, city, state, ZIP..." />
            {search && <button aria-label="Clear search" onClick={() => onSearchChange('')}><X size={15} /></button>}
          </label>
        )}
        <button className="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} data-testid="theme-toggle" onClick={onToggleTheme}>{theme === 'light' ? <Moon /> : <Sun />}</button>
        <button className="icon-button" aria-label="Notifications" onClick={() => onNotice('No new notifications.')}><Bell /></button>
        {accessControls}
      </div>
    </header>
  )
})
