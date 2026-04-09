import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { AppShell } from '../../components/AppShell';

type ResultRow = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  assessmentTitle: string;
  questionTitle: string;
  status: string;
  score: number;
  maxScore: number;
  passedTests: number;
  totalTests: number;
  passed: boolean;
  submittedAt: string;
  language: string;
  isPractice: boolean;
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
    } catch {
      setRows([]);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [qRes, aRes] = await Promise.all([api.get('/questions'), api.get('/assessments')]);
        const assessmentData = aRes.data.data || [];
        setStats({
          totalQuestions: qRes.data.pagination?.total || qRes.data.data.length,
          totalAssessments: assessmentData.length,
        });
        await fetchAllResults();
      } catch {
        setResultsLoading(false);
      }
    })();
  }, [fetchAllResults]);

  const fmt = (v?: string | null) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const filteredRows = rows.filter((r) => {
    const matchFilter = filter === 'all' || (filter === 'passed' ? r.passed : !r.passed);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || r.candidateName.toLowerCase().includes(q) || r.candidateEmail.toLowerCase().includes(q) || r.assessmentTitle.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const passCount = rows.filter((r) => r.passed).length;
  const avgScore = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + (r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0), 0) / rows.length)
    : 0;

  return (
    <AppShell
      title="Overview"
      subtitle="Platform snapshot and all candidate scores."
      wide
      actions={
        <button
          type="button"
          onClick={() => fetchAllResults()}
          disabled={resultsLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${resultsLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Refresh
        </button>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Questions', value: stats.totalQuestions, color: 'text-emerald-400' },
          { label: 'Assessments', value: stats.totalAssessments, color: 'text-sky-400' },
          { label: 'Submissions', value: rows.length, color: 'text-violet-400' },
          { label: 'Pass Rate', value: rows.length > 0 ? `${Math.round((passCount / rows.length) * 100)}%` : '—', color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</div>
            <div className={`mt-2 text-3xl font-semibold tabular-nums ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Candidate Scoreboard</h2>
            {lastRefreshed && (
              <p className="text-xs text-slate-500 mt-0.5">Last updated: {lastRefreshed.toLocaleTimeString()}</p>
            )}
          </div>
          <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate / assessment…"
                className="bg-slate-800 border border-slate-700 text-white text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 w-52 placeholder-slate-500"
              />
            </div>
            {/* Filter buttons */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              {(['all', 'passed', 'failed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${
                    filter === f ? 'bg-slate-700 text-white' : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {resultsLoading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-slate-400 animate-spin mx-auto mb-3" />
            Loading scores…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            {rows.length === 0 ? 'No submissions yet. Assign tests and have candidates submit.' : 'No results match your filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-900/30">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Context</th>
                  <th className="px-5 py-3">Question</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Tests Passed</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRows.map((row) => {
                  const pct = row.maxScore > 0 ? Math.round((row.score / row.maxScore) * 100) : 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{row.candidateName}</div>
                        <div className="text-xs text-slate-500">{row.candidateEmail}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          row.isPractice ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {row.assessmentTitle}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 text-xs font-medium">
                        {row.questionTitle}
                        <div className="text-[10px] text-slate-500 uppercase mt-0.5">{row.language}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          row.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : row.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{row.passedTests}/{row.totalTests}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        <span className="text-white font-semibold">{row.score}</span>
                        <span className="text-slate-500">/{row.maxScore}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmt(row.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer summary */}
            <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>{filteredRows.length} of {rows.length} entries shown</span>
              <span>Avg score: <span className="text-slate-300 font-semibold">{avgScore}%</span> · Passed: <span className="text-emerald-400 font-semibold">{passCount}</span> · Failed: <span className="text-rose-400 font-semibold">{rows.length - passCount}</span></span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
