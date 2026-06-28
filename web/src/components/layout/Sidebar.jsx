import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, UserSquare2,
  HeartPulse, UtensilsCrossed, BarChart3, LogOut,
  Leaf, Moon, Sun, ShieldAlert, Sparkles, ChevronRight, X
} from 'lucide-react';

const schoolLinks = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/teachers',     icon: UserSquare2,     label: 'Teachers'        },
  { to: '/classes',      icon: BookOpen,        label: 'Classes'         },
  { to: '/students',     icon: Users,           label: 'Students'        },
  { to: '/at-risk',      icon: ShieldAlert,     label: 'At-Risk Students'},
  { to: '/meals',        icon: UtensilsCrossed, label: 'Meals'           },
  { to: '/meal-planner', icon: Sparkles,        label: 'Meal Planner'    },
  { to: '/nutrition',    icon: BarChart3,       label: 'Nutrition'       },
];

const teacherLinks = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/students',     icon: Users,           label: 'Students'        },
  { to: '/health',       icon: HeartPulse,      label: 'Health Records'  },
  { to: '/at-risk',      icon: ShieldAlert,     label: 'At-Risk Students'},
  { to: '/meals',        icon: UtensilsCrossed, label: 'Meals'           },
  { to: '/meal-planner', icon: Sparkles,        label: 'Meal Planner'    },
  { to: '/nutrition',    icon: BarChart3,       label: 'Nutrition'       },
];

const css = `
  .mm-nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 13px;
    border-radius: 999px;
    margin-bottom: 3px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid transparent;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    font-family: 'Sora', sans-serif;
  }
  .mm-nav-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .mm-nav-link.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: var(--accent-border);
    font-weight: 600;
    box-shadow: 0 0 0 1px var(--accent-border) inset, 0 2px 8px var(--accent-glow);
  }
  .mm-nav-link.active .mm-link-icon {
    color: var(--accent) !important;
  }
  .mm-nav-link:hover .mm-link-icon {
    color: var(--text-primary) !important;
  }

  .mm-action-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 13px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: background 0.15s ease, color 0.15s ease;
    font-family: 'Sora', sans-serif;
    text-align: left;
    margin-bottom: 3px;
  }
  .mm-action-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .mm-action-btn.logout:hover {
    background: var(--red-dim);
    color: var(--red);
  }
`;

export default function Sidebar({ isOpen = true, onClose }) {
  const { user, logout, isSchool } = useAuth();
  const navigate = useNavigate();
  const links = isSchool ? schoolLinks : teacherLinks;
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <>
      <style>{css}</style>

      <aside
        className={`fixed left-0 top-0 z-30 flex h-screen w-[220px] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] font-['Sora'] shadow-xl transition-transform duration-200 ease-out md:translate-x-0 md:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          borderRadius: '0 18px 18px 0',
        }}
      >
        {/* ── Logo ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '18px 16px',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] md:hidden"
          >
            <X size={16} />
          </button>
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '1.5px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Leaf size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.2px' }}>
              MealMind
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.9px', textTransform: 'uppercase', marginTop: 4 }}>
              {isSchool ? 'Admin' : 'Teacher'}
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', scrollbarWidth: 'none' }}>
          <div style={{
            fontSize: 9.5, fontWeight: 600, letterSpacing: '0.9px',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            padding: '4px 13px 8px',
          }}>
            Menu
          </div>

          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose?.()}
              className={({ isActive }) => `mm-nav-link${isActive ? ' active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className="mm-link-icon"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, transition: 'color 0.15s' }}
                  />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && (
                    <ChevronRight size={12} style={{ color: 'var(--accent)', opacity: 0.7, flexShrink: 0 }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: '10px 8px 14px', flexShrink: 0 }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 13px 10px' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '1.5px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10.5, fontWeight: 700, color: 'var(--accent)',
              flexShrink: 0, letterSpacing: '0.3px',
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name ?? 'Unknown'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email ?? ''}
              </div>
            </div>
          </div>

          <button onClick={toggleTheme} className="mm-action-btn"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light'
              ? <Moon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              : <Sun  size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>

          <button onClick={handleLogout} className="mm-action-btn logout">
            <LogOut size={14} style={{ flexShrink: 0 }} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}