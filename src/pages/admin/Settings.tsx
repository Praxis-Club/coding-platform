import { useState } from 'react';
import api from '../../services/api';
import { AppShell } from '../../components/AppShell';

export const Settings = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, endpoint: string, message: string) => {
    if (!confirm(`⚠️ WARNING: ${message}\n\nThis action is irreversible. Are you absolutely sure?`)) {
      return;
    }

    setLoading(action);
    try {
      const res = await api.post(`/admin${endpoint}`);
      alert(res.data.message || 'Operation successful.');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppShell 
      title="Settings" 
      subtitle="Platform management and data controls"
    >
      <div className="max-w-4xl">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8">
          <h2 className="text-xl font-bold text-rose-500 flex items-center gap-2 mb-6">
            <span className="text-2xl">🚨</span> Danger Zone
          </h2>

          <div className="space-y-6">
            {/* Reset Attempts */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="max-w-xl">
                <h3 className="text-lg font-bold text-amber-500">Reset All Attempts</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Deletes all test attempts and question submissions. Students and tests are kept. All scores and progress will be reset to zero.
                </p>
              </div>
              <button
                onClick={() => handleAction('reset', '/reset-attempts', 'Reset all test attempts and submissions?')}
                disabled={loading !== null}
                className="shrink-0 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-900/20"
              >
                {loading === 'reset' ? 'Resetting...' : 'Reset All Attempts'}
              </button>
            </div>

            {/* Delete All Student Data */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="max-w-xl">
                <h3 className="text-lg font-bold text-rose-500">Delete All Student Data</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Removes all student accounts along with their attempts and submissions. Tests, questions, and admin accounts are kept.
                </p>
              </div>
              <button
                onClick={() => handleAction('students', '/delete-students', 'Delete ALL student accounts and their data?')}
                disabled={loading !== null}
                className="shrink-0 rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-all shadow-lg shadow-rose-900/20"
              >
                {loading === 'students' ? 'Deleting...' : 'Delete All Students & Data'}
              </button>
            </div>

            {/* Delete All Tests */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="max-w-xl">
                <h3 className="text-lg font-bold text-rose-600">Delete All Tests</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Removes all tests, questions, test cases, and all associated attempt data permanently from the platform.
                </p>
              </div>
              <button
                onClick={() => handleAction('tests', '/delete-tests', 'Delete ALL assessments and questions?')}
                disabled={loading !== null}
                className="shrink-0 rounded-lg bg-rose-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50 transition-all shadow-lg shadow-rose-950/20"
              >
                {loading === 'tests' ? 'Deleting...' : 'Delete All Tests'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 rounded-xl border border-slate-800 bg-slate-900/20">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">System Status</h4>
          <p className="text-xs text-slate-500">
            All data management operations are logged for security. These actions perform direct database resets and will not affect the server's availability or uptime.
          </p>
        </div>
      </div>
    </AppShell>
  );
};
