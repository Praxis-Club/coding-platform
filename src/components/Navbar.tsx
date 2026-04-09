import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const NavItem = ({ to, label, end }: { to: string; label: string; end?: boolean }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
        isActive
          ? 'text-accent bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
      }`
    }
  >
    {label}
  </NavLink>
);

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="navbar sticky top-0 z-50 glass border-b border-[var(--border-subtle)]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent-dim)] border border-[rgba(0,255,136,0.3)] group-hover:animate-pulse-glow transition-all">
              <span className="font-mono font-bold text-accent text-xs">&gt;_</span>
            </div>
            <div className="hidden sm:block">
              <span className="block font-display font-bold text-[var(--text-primary)] text-sm tracking-tight leading-none">Code7</span>
              <span className="block font-mono text-[10px] text-[var(--text-muted)] mt-0.5">platform</span>
            </div>
          </button>

          {/* Desktop nav */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {user.role === 'admin' ? (
                <>
                  <NavItem to="/admin/questions" label="Questions" />
                  <NavItem to="/admin/assessments" label="Assessments" />
                  <NavItem to="/admin/analytics" label="Analytics" />
                  <NavItem to="/admin/settings" label="Settings" />
                </>
              ) : (
                <>
                  <NavItem to="/" label="Home" end />
                  <NavItem to="/practice" label="Practice" />
                  <NavItem to="/submissions" label="Submissions" />
                </>
              )}
            </nav>
          )}

          {/* Right side */}
          {user && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--bg-overlay)] border border-[var(--border-default)] flex items-center justify-center">
                  <span className="font-mono text-[10px] font-bold text-accent">
                    {user.fullName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-secondary)] max-w-[120px] truncate">{user.fullName}</span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                  {user.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost text-xs py-1.5 px-3">
                Sign out
              </button>
              {/* Mobile menu toggle */}
              <button
                className="md:hidden btn btn-ghost p-1.5"
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Toggle menu"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {menuOpen
                    ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                    : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                  }
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mobile nav */}
        {user && menuOpen && (
          <nav className="md:hidden flex flex-wrap gap-1 pb-3 pt-2 border-t border-[var(--border-subtle)] animate-fade-in">
            {user.role === 'admin' ? (
              <>
                <NavItem to="/admin/questions" label="Questions" />
                <NavItem to="/admin/assessments" label="Assessments" />
                <NavItem to="/admin/analytics" label="Analytics" />
                <NavItem to="/admin/settings" label="Settings" />
              </>
            ) : (
              <>
                <NavItem to="/" label="Home" end />
                <NavItem to="/practice" label="Practice" />
                <NavItem to="/submissions" label="Submissions" />
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
