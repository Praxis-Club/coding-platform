import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { AppShell } from '../../components/AppShell';

type ResultRow = {
  id: string; candidateName: string; candidateEmail: string;
  assessmentTitle: string; questionTitle: string; status: string;
  score: number; maxScore: number; passedTests: number; totalTests: number;
  passed: boolean; submittedAt: string; language: string; isPractice: boolean;
};

export const Analytics = () => {
  const [stats, setStats] = useState({ totalQuestions: 0, totalAssessments: 0 });
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const res = await api.get('/submissions/all');
      setRows(res.data.data || []);
      setLastRefreshed(new Date());
    } catch { setRows([]); }
    finally { setResultsLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [qRes, aRes] = await Promise.all([api.get('/questions'), api.get('/assessments')]);
        setStats({ totalQuestions: qRes.data.pagination?.total || qRes.data.data.length, totalAssessments: (aRes.data.data || []).length });
        await fetchAllResults();
      } catch { setResultsLoading(false); }
    })();
  }, [fetchAllResults]);

  const filteredRows = rows.filter(r => {
    const matchFilter = filter === 'all' || (filter === 'passed' ? r.passed : !r.passed);
    const q = searchQuery.toLowerCase();
    return matchFilter && (!q || r.candidateName.toLowerCase().includes(q) || r.candidateEmail.toLowerCase().includes(q) || r.assessmentTitle.toLowerCase().includes(q));
  });

  const passCount = rows.filter(r => r.passed).length;
  const avgScore = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + (r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0), 0) / rows.length) : 0;
  const fmt = (v?: string | null) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <AppShell title="Overview" subtitle="Platform snapshot and all candidate scores." wide
      actions={
        <button onClick={() => fetchAllResults()} disabled={resultsLoading} className="btn btn-ghost">
          <svg className={`w-3.5 h-3.5 ${resultsLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Refresh
        </button>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Questions', value: stats.totalQuestions, color: 'text-accent' },
          { label: 'Assessments', value: stats.totalAssessments, color: 'text-info' },
          { label: 'Submissions', value: rows.length, color: 'text-[#c084fc]' },
          { label: 'Pass Rate', value: rows.length > 0 ? `${Math.round((passCount / rows.length) * 100)}%` : '—', color: 'text-warn' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className="mono-label">{s.label}</div>
            <div className={`mt-2 font-display font-bold text-3xl tabular-nums ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Candidate Scoreboard</h2>
            {lastRefreshed && <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">Updated {lastRefreshed.toLocaleTimeString()}</p>}
          </div>
          <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search…" className="input pl-9 text-xs py-1.5 w-48" />
            </div>
            <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
              {(['all', 'passed', 'failed'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${filter === f ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {resultsLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Loading scores…</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)] text-sm">
            {rows.length === 0 ? 'No submissions yet.' : 'No results match your filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {['Candidate', 'Context', 'Question', 'Status', 'Tests', 'Score', 'Submitted'].map(h => (
                    <th key={h} className="px-5 py-3 text-left mono-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredRows.map(row => {
                  const pct = row.maxScore > 0 ? Math.round((row.score / row.maxScore) * 100) : 0;
                  return (
                    <tr key={row.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[var(--text-primary)]">{row.candidateName}</div>
                        <div className="text-xs text-[var(--text-muted)] font-mono">{row.candidateEmail}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${row.isPractice ? 'bg-[#c084fc]/10 text-[#c084fc] border border-[#c084fc]/20' : 'status-running'}`}>
                          {row.assessmentTitle}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-secondary)] text-xs">
                        {row.questionTitle}
                        <div className="mono-label mt-0.5">{row.language}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          row.status === 'completed' ? 'status-accepted' : row.status === 'error' ? 'status-error' : 'status-running'
                        }`}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : pct > 0 ? 'var(--warn)' : 'var(--danger)' }} />
                          </div>
                          <span className="font-mono text-xs text-[var(--text-secondary)]">{row.passedTests}/{row.totalTests}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">
                        <span className="text-[var(--text-primary)] font-bold">{row.score}</span>
                        <span className="text-[var(--text-muted)]">/{row.maxScore}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--text-muted)] whitespace-nowrap font-mono">{fmt(row.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <span>{filteredRows.length}/{rows.length} entries</span>
              <span>avg: <span className="text-[var(--text-secondary)]">{avgScore}%</span> · passed: <span className="text-accent">{passCount}</span> · failed: <span className="text-danger">{rows.length - passCount}</span></span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
