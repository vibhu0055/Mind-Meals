import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { Menu, X, LogOut, Bell } from 'lucide-react'

const NAV = [
  { label: 'Overview',          path: '/principal/dashboard'       },
  { label: 'Students',          path: '/principal/students'        },
  { label: 'Schedule Checkups', path: '/principal/health-checkups' },
  { label: 'Meal Menu',         path: '/principal/meal-nutrition'  },
  { label: 'Reports',           path: '/principal/reports'         },
  { label: 'Alerts',            path: '/principal/alerts', badge: 4 },
]

export default function PrincipalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-sand-50 border-b border-stone-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center h-16 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-forest-800 rounded-lg flex items-center justify-center">
              <span className="text-sm">🥦</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-display font-bold text-forest-900 text-sm leading-none">School Health Monitor</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest">Principal Portal</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {NAV.map(({ label, path, badge }) => (
              <NavLink key={path} to={path} className={({ isActive }) =>
                `relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive ? 'bg-forest-800 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`
              }>
                {label}
                {badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <button className="hidden sm:flex items-center gap-2 border border-stone-200 rounded-xl px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 transition">
              {user?.name || 'Dr. Anjali Rao'}
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-600 transition px-2 py-1.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button className="lg:hidden p-2 rounded-xl hover:bg-stone-100" onClick={() => setMobileOpen(s => !s)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1">
            {NAV.map(({ label, path }) => (
              <NavLink key={path} to={path} onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-forest-800 text-white' : 'text-stone-600 hover:bg-stone-100'}`
                }>
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
