import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  KeyRound,
  UserCog,
  ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import { getAdminUser } from '../lib/api'

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
}

const BASE_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/licenses', label: 'Licencias', icon: KeyRound },
]

const SUPER_ADMIN_NAV: NavItem[] = [
  { to: '/accounts', label: 'Cuentas', icon: UserCog },
]

function Sidebar() {
  const currentUser = getAdminUser()
  const navItems = currentUser?.role === 'SUPER_ADMIN'
    ? [...BASE_NAV, ...SUPER_ADMIN_NAV]
    : BASE_NAV

  const initials = currentUser?.name
    ? currentUser.name.charAt(0).toUpperCase()
    : '?'

  return (
    <aside className="w-60 bg-slate-950 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Copo</p>
            <p className="text-slate-500 text-xs mt-0.5">Panel Interno</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-slate-300 text-xs font-medium">{initials}</span>
          </div>
          <div>
            <p className="text-slate-300 text-xs font-medium">{currentUser?.name ?? '—'}</p>
            <p className="text-slate-600 text-xs">
              {currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Soporte'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Breadcrumb() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)

  const labelMap: Record<string, string> = {
    clients: 'Clientes',
    licenses: 'Licencias',
    accounts: 'Cuentas',
  }

  if (parts.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-400 mb-6">
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1
        const label = labelMap[part] ?? part
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-slate-300" />}
            <span className={isLast ? 'text-slate-700 font-medium' : ''}>{label}</span>
          </span>
        )
      })}
    </nav>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Breadcrumb />
          <Outlet />
        </div>
      </main>
    </div>
  )
}
