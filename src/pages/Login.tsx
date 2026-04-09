import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-base overflow-hidden px-4 bg-grid">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-info/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-sm z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent-dim)] border border-[rgba(0,255,136,0.3)] mb-4">
            <span className="font-mono font-bold text-accent text-sm">&gt;_</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sign in to <span className="text-accent font-semibold">PRAXIS</span></p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-[var(--danger-dim)] border border-[rgba(255,71,87,0.3)] text-danger text-sm flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mono-label block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mono-label block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5 mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />Signing in…</>
                : 'Sign in'
              }
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
            No account?{' '}
            <Link to="/register" className="text-accent hover:text-[#1affa0] font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
