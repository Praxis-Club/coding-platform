import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Question } from '../../types';
import { AppShell } from '../../components/AppShell';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'] as const;

const DiffBadge = ({ d }: { d: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
    d === 'easy' ? 'badge-easy' : d === 'medium' ? 'badge-medium' : 'badge-hard'
  }`}>{d}</span>
);

// Deterministic "acceptance rate" hint based on difficulty
const acceptanceHint = (d: string) =>
  d === 'easy' ? '72%' : d === 'medium' ? '48%' : '31%';

export const Practice = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const params = filter !== 'all' ? `?difficulty=${filter}` : '';
    api.get(`/questions${params}`)
      .then((res: any) => setQuestions(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = questions.filter(q =>
    !search || q.title?.toLowerCase().includes(search.toLowerCase()) ||
    q.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = { easy: 0, medium: 0, hard: 0 };
  questions.forEach(q => { if (q.difficulty in counts) counts[q.difficulty as keyof typeof counts]++; });

  return (
    <AppShell
      title="Problem Set"
      subtitle="Sharpen your skills. No timer, no pressure."
      wide
    >
      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['easy', 'medium', 'hard'] as const).map(d => (
          <button key={d} type="button" onClick={() => setFilter(d === filter ? 'all' : d)}
            className={`card p-4 text-center transition-all cursor-pointer ${filter === d ? 'border-accent/40 bg-[var(--accent-dim)]' : 'card-interactive'}`}>
            <div className={`font-display font-bold text-2xl tabular-nums ${d === 'easy' ? 'text-accent' : d === 'medium' ? 'text-warn' : 'text-danger'}`}>
              {counts[d]}
            </div>
            <div className="mono-label mt-1">{d}</div>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {DIFFICULTIES.map(d => (
            <button key={d} type="button" onClick={() => setFilter(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filter === d ? 'bg-accent text-base shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or tag…" className="input pl-9 text-sm py-2" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn btn-ghost text-xs py-2 px-3">Clear</button>
        )}
      </div>

      {/* ── Table header ── */}
      {!loading && filtered.length > 0 && (
        <div className="hidden sm:grid grid-cols-[2rem_1fr_6rem_5rem_5rem] gap-4 px-4 mb-2">
          <span className="mono-label">#</span>
          <span className="mono-label">Problem</span>
          <span className="mono-label">Difficulty</span>
          <span className="mono-label text-right">Acceptance</span>
          <span className="mono-label text-right">Tags</span>
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card border-dashed py-16 text-center">
          <p className="text-[var(--text-secondary)] text-sm">No problems match this filter.</p>
          <button onClick={() => { setFilter('all'); setSearch(''); }}
            className="mt-3 text-xs text-accent hover:text-accent/80 font-mono transition-colors">
            Clear filters →
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              onClick={() => navigate(`/practice/${q.id}`)}
              className="card card-interactive w-full text-left px-4 py-3.5 group animate-fade-in
                         grid grid-cols-[2rem_1fr] sm:grid-cols-[2rem_1fr_6rem_5rem_5rem] gap-4 items-center"
              style={{ animationDelay: `${Math.min(idx * 20, 300)}ms` }}
            >
              {/* Index */}
              <span className="font-mono text-xs text-[var(--text-muted)] text-right">{idx + 1}</span>

              {/* Title + tags */}
              <div className="min-w-0">
                <span className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-accent transition-colors">
                  {q.title}
                </span>
                {q.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                    {q.tags.slice(0, 2).map(tag => <span key={tag} className="tag text-[10px]">{tag}</span>)}
                  </div>
                )}
              </div>

              {/* Difficulty */}
              <div className="hidden sm:flex">
                <DiffBadge d={q.difficulty} />
              </div>

              {/* Acceptance */}
              <div className="hidden sm:block text-right">
                <span className={`font-mono text-xs ${
                  q.difficulty === 'easy' ? 'text-accent' : q.difficulty === 'medium' ? 'text-warn' : 'text-danger'
                }`}>{acceptanceHint(q.difficulty)}</span>
              </div>

              {/* Tags */}
              <div className="hidden sm:flex justify-end gap-1 flex-wrap">
                {q.tags?.slice(0, 2).map(tag => <span key={tag} className="tag text-[10px]">{tag}</span>)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Footer count ── */}
      {!loading && filtered.length > 0 && (
        <p className="mt-4 text-xs text-[var(--text-muted)] font-mono text-center">
          {filtered.length} problem{filtered.length !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : filter !== 'all' ? ` · ${filter}` : ''}
        </p>
      )}
    </AppShell>
  );
};
