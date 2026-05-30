import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, UserSquare2,
  HeartPulse, UtensilsCrossed, BarChart3, LogOut,
  ChevronRight, Leaf, Moon, Sun, ShieldAlert, Sparkles
} from 'lucide-react';

const schoolLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/teachers', icon: UserSquare2, label: 'Teachers' },
  { to: '/classes', icon: BookOpen, label: 'Classes' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/at-risk', icon: ShieldAlert, label: 'At-Risk Students' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Meals' },
  { to: '/meal-planner', icon: Sparkles, label: 'Meal Planner' },
  { to: '/nutrition', icon: BarChart3, label: 'Nutrition' },


];

const teacherLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/health', icon: HeartPulse, label: 'Health Records' },
  { to: '/at-risk', icon: ShieldAlert, label: 'At-Risk Students' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Meals' },
  { to: '/meal-planner', icon: Sparkles, label: 'Meal Planner' },
  { to: '/nutrition', icon: BarChart3, label: 'Nutrition' },


];

export default function Sidebar() {
  const { user, logout, isSchool } = useAuth();
  const navigate = useNavigate();
  const links = isSchool ? schoolLinks : teacherLinks;
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <Leaf size={16} className="text-[#0d0f14]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] leading-none">MealMind</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
              {isSchool ? 'Admin' : 'Teacher'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={12} className="text-[var(--accent)]" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t border-[var(--border)] pt-3">
        <div className="px-3 py-2.5 mb-2">
          <div className="text-xs font-medium text-[var(--text-primary)] truncate">{user?.name}</div>
          <div className="text-[11px] text-[var(--text-muted)] truncate">{user?.email}</div>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-[var(--radius)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-dim)] transition-all duration-150"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}