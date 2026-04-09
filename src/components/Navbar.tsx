import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium px-3 py-2 rounded-md transition-colors ${isActive
    ? 'bg-slate-800 text-white'
    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
  }`;

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-left shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              CB
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold text-white tracking-tight">Code7</span>
              <span className="block text-[11px] text-slate-500 -mt-0.5">Assessment platform</span>
            </span>
          </button>

          {user && (
            <>
              <nav className="hidden md:flex items-center gap-1 flex-1 justify-center max-w-2xl">
                {user.role === 'admin' ? (
                  <>
                    <NavLink to="/admin/questions" className={linkClass}>
                      Questions
                    </NavLink>
                    <NavLink to="/admin/assessments" className={linkClass}>
                      Assessments
                    </NavLink>
                    <NavLink to="/admin/settings" className={linkClass}>
                      Settings
                    </NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/" end className={linkClass}>
                      Home
                    </NavLink>
                    <NavLink to="/practice" className={linkClass}>
                      Practice
                    </NavLink>
                    <NavLink to="/submissions" className={linkClass}>
                      Submissions
                    </NavLink>
                  </>
                )}
              </nav>

              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-[140px]">
                  {user.fullName}
                </span>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 border border-slate-700">
                  {user.role}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

        {user && (
          <nav className="md:hidden flex gap-1 pb-3 overflow-x-auto border-t border-slate-800/80 pt-2 -mx-1 px-1">
            {user.role === 'admin' ? (
              <>
                <NavLink to="/admin/questions" className={linkClass}>
                  Questions
                </NavLink>
                <NavLink to="/admin/assessments" className={linkClass}>
                  Assessments
                </NavLink>
                <NavLink to="/admin/settings" className={linkClass}>
                  Settings
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={linkClass}>
                  Home
                </NavLink>
                <NavLink to="/practice" className={linkClass}>
                  Practice
                </NavLink>
                <NavLink to="/submissions" className={linkClass}>
                  History
                </NavLink>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
