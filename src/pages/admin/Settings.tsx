import { useState } from 'react';
import api from '../../services/api';
import { AppShell } from '../../components/AppShell';

export const Settings = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, endpoint: string, message: string) => {
    if (!confirm(`⚠️ ${message}\n\nThis is irreversible. Continue?`)) return;
    setLoading(action);
    try {
      const res = await api.post(`/admin${endpoint}`);
      alert(res.data.message || 'Done.');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Operation failed.');
    } finally { setLoading(null); }
  };

  const actions = [
    { id: 'reset', label: 'Reset All Attempts', desc: 'Deletes all test attempts and submissions. Students and tests are kept.', endpoint: '/reset-attempts', msg: 'Reset all test attempts and submissions?', color: 'text-warn', btnCls: 'bg-[var(--warn-dim)] text-warn border border-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.2)]' },
    { id: 'students', label: 'Delete All Students', desc: 'Removes all student accounts and their data. Tests and admin accounts are kept.', endpoint: '/delete-students', msg: 'Delete ALL student accounts?', color: 'text-danger', btnCls: 'btn-danger' },
    { id: 'tests', label: 'Delete All Tests', desc: 'Removes all assessments, questions, test cases, and attempt data permanently.', endpoint: '/delete-tests', msg: 'Delete ALL assessments and questions?', color: 'text-danger', btnCls: 'btn-danger' },
  ];

  return (
    <AppShell title="Settings" subtitle="Platform management and data controls.">
      <div className="max-w-3xl space-y-4">
        <div className="card border-[rgba(255,71,87,0.2)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-5 h-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <h2 className="font-display font-bold text-danger">Danger Zone</h2>
          </div>
          <div className="space-y-3">
            {actions.map(a => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div>
                  <h3 className={`font-semibold text-sm ${a.color}`}>{a.label}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{a.desc}</p>
                </div>
                <button
                  onClick={() => handleAction(a.id, a.endpoint, a.msg)}
                  disabled={loading !== null}
                  className={`btn shrink-0 text-xs py-2 px-4 ${a.btnCls} disabled:opacity-40`}
                >
                  {loading === a.id ? 'Working…' : a.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="mono-label mb-2">System Status</p>
          <p className="text-xs text-[var(--text-muted)]">
            All data management operations are logged for security. These actions perform direct database resets and will not affect server availability.
          </p>
        </div>
      </div>
    </AppShell>
  );
};
