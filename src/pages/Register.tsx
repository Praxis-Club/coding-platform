import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const role = 'candidate';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, fullName, role);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-base overflow-hidden px-4 bg-grid">
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-info/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-sm z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent-dim)] border border-[rgba(0,255,136,0.3)] mb-4">
            <span className="font-mono font-bold text-accent text-sm">&gt;_</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Create account</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Join <span className="text-accent font-semibold">Code7</span></p>
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
              <label className="mono-label block mb-2">Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="input" placeholder="Your name" required minLength={2} autoFocus />
            </div>
            <div>
              <label className="mono-label block mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="mono-label block mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="Min. 6 characters" required minLength={6} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5 mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-base/30 border-t-base rounded-full animate-spin" />Creating…</>
                : 'Get started'
              }
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-[#1affa0] font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
