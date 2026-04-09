import { useState, useEffect } from 'react';
import api from '../../services/api';
import { AppShell } from '../../components/AppShell';

export const Submissions = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/submissions/history')
      .then((res: any) => setSubmissions(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusCls = (s: string) => {
    if (s === 'completed') return 'status-accepted';
    if (s === 'running') return 'status-running';
    if (s === 'error') return 'status-error';
    return 'status-pending';
  };

  if (loading) return (
    <AppShell title="Submissions" subtitle="Loading…">
      <div className="space-y-2">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Submissions" subtitle="Your graded attempts from assessments and practice." wide>
      {submissions.length === 0 ? (
        <div className="card border-dashed py-16 text-center">
          <p className="text-[var(--text-secondary)] text-sm">No submissions yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {['Problem', 'Language', 'Status', 'Score', 'Time', 'Submitted'].map(h => (
                  <th key={h} className="px-4 py-3 text-left mono-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {submissions.map(sub => (
                <tr key={sub.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{sub.question?.title || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{sub.language}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${statusCls(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">{sub.score}/{sub.maxScore}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{sub.executionTime != null ? `${sub.executionTime}ms` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
};
