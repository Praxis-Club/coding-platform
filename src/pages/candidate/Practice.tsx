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
      title="Practice"
      subtitle="Solve problems at your own pace. No timer, no pressure."
      wide
    >
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['easy','medium','hard'] as const).map(d => (
          <div key={d} className="card p-4 text-center">
            <div className={`font-display font-bold text-2xl ${d === 'easy' ? 'text-accent' : d === 'medium' ? 'text-warn' : 'text-danger'}`}>
              {counts[d]}
            </div>
            <div className="mono-label mt-1">{d}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {DIFFICULTIES.map(d => (
            <button key={d} type="button" onClick={() => setFilter(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filter === d
                  ? 'bg-accent text-base shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems…"
            className="input pl-9 text-sm py-2"
          />
        </div>
      </div>

      {/* Problem list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card border-dashed py-16 text-center">
          <p className="text-[var(--text-secondary)] text-sm">No problems match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              onClick={() => navigate(`/practice/${q.id}`)}
              className="card card-interactive w-full text-left p-4 group flex items-center gap-4 animate-fade-in"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <span className="font-mono text-xs text-[var(--text-muted)] w-6 shrink-0 text-right">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors">
                    {q.title}
                  </h3>
                  <DiffBadge d={q.difficulty} />
                </div>
                {q.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                )}
              </div>
              <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
};
