import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { AppShell } from '../components/AppShell';

type AssignedAssessment = {
  id: string;
  title: string;
  description?: string;
  duration: number;
  totalScore?: number;
  userAssessments?: { status: string; score?: number }[];
};

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState<AssignedAssessment[]>([]);
  const [loadingTests, setLoadingTests] = useState(user?.role === 'candidate');
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'candidate') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/assessments');
        if (!cancelled) setAssigned(res.data.data || []);
      } catch {
        if (!cancelled) setAssigned([]);
      } finally {
        if (!cancelled) setLoadingTests(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (user?.role === 'admin') {
    return (
      <AppShell
        title="Admin workspace"
        subtitle="Manage your question bank, scheduled tests, and candidate outcomes."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/questions')}
            className="group text-left rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/40 hover:bg-slate-900 transition-all"
          >
            <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">Content</div>
            <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Questions
            </h2>
            <p className="mt-2 text-sm text-slate-400">Create, edit, and curate coding problems.</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/assessments')}
            className="group text-left rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/40 hover:bg-slate-900 transition-all"
          >
            <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">Delivery</div>
            <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Assessments
            </h2>
            <p className="mt-2 text-sm text-slate-400">Create tests, assign students, and view scores.</p>
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Welcome, ${user?.fullName?.split(' ')[0] || 'there'}`}
      subtitle="Your assigned tests and practice tools in one place."
    >
      <div className="space-y-10">
        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Assigned tests</h2>
          </div>
          {loadingTests ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500 text-sm">
              Loading your tests…
            </div>
          ) : assigned.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
              <p className="text-slate-400 text-sm">No tests assigned yet.</p>
              <p className="text-slate-600 text-xs mt-2">When an admin assigns you an assessment, it will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {assigned.map((a) => {
                const ua = a.userAssessments?.[0];
                const rawStatus = ua?.status || 'not_started';
                const statusLabel = rawStatus.replace('_', ' ');
                const isCompleted = rawStatus === 'completed';
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{a.title}</h3>
                      {a.description ? (
                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{a.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{a.duration} min</span>
                        {a.totalScore != null && <span>{a.totalScore} pts</span>}
                        <span className="capitalize">{statusLabel}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (isCompleted) {
                          navigate('/submissions');
                        } else {
                          setStartingId(a.id);
                          try {
                            const res = await api.post(`/assessments/${a.id}/start`);
                            const ua = res.data.data;
                            const firstAQ = ua.assessment.assessmentQuestions[0];
                            if (firstAQ) {
                              navigate(`/practice/${firstAQ.questionId}?userAssessmentId=${ua.id}`, {
                                state: { 
                                  initialQuestion: firstAQ.question,
                                  initialUserAssessment: ua
                                }
                              });
                            } else {
                              alert('This assessment has no questions.');
                            }
                          } catch (err: any) {
                            alert(err.response?.data?.error?.message || 'Failed to initialize assessment');
                          } finally {
                            setStartingId(null);
                          }
                        }
                      }}
                      disabled={isCompleted || startingId === a.id}
                      className={`mt-4 w-full sm:w-auto self-start rounded-lg px-4 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                        isCompleted
                          ? 'border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : startingId === a.id 
                            ? 'bg-emerald-600/50 text-white/50 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {startingId === a.id ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeDasharray="64" strokeDashoffset="48" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                          Starting…
                        </>
                      ) : isCompleted ? (
                        'View submissions'
                      ) : (
                        rawStatus === 'not_started' ? 'Start test' : 'Continue test'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">More</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => navigate('/practice')}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left hover:border-slate-600 transition-colors"
            >
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Practice</span>
              <h3 className="mt-2 font-semibold text-white">Problem set</h3>
              <p className="mt-1 text-sm text-slate-400">Sharpen skills outside of graded tests.</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/submissions')}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left hover:border-slate-600 transition-colors"
            >
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">History</span>
              <h3 className="mt-2 font-semibold text-white">Submissions</h3>
              <p className="mt-1 text-sm text-slate-400">Review past graded attempts.</p>
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
};
