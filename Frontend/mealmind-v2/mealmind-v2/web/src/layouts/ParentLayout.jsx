import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { LogOut } from 'lucide-react'

export default function ParentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-sand-50 border-b border-stone-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center h-16 gap-6">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-violet-700 rounded-lg flex items-center justify-center">
              <span className="text-sm">💜</span>
            </div>
            <div>
              <p className="font-display font-bold text-violet-900 text-sm leading-none">School Health Monitor</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest">Parent Portal</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-sm text-stone-600 border border-stone-200 px-3 py-1.5 rounded-xl">{user?.name}</span>
            <button onClick={() => { logout(); navigate('/login') }}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-600 transition px-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
    </div>
  )
}
