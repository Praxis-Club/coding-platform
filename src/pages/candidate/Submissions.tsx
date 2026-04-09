import { useState, useEffect } from 'react';
import api from '../../services/api';
import { AppShell } from '../../components/AppShell';

export const Submissions = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [submissionsRes] = await Promise.all([
          api.get('/submissions/history')
        ]);
        setSubmissions(submissionsRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch submissions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'running':
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'error':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border border-slate-600';
    }
  };

  if (loading) {
    return (
      <AppShell title="Submissions" subtitle="Loading…">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-500 text-sm">
          Loading history…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Submission history" subtitle="Graded attempts from assessments and practice." wide>
      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 py-16 text-center text-slate-500 text-sm">
          No submissions yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {submissions.map((sub) => (
                <tr key={sub.id} className="text-slate-300 hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-medium text-white">{sub.question?.title || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{sub.language}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${getStatusStyle(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {sub.score}/{sub.maxScore}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{sub.executionTime != null ? `${sub.executionTime} ms` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
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
