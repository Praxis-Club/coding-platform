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

const StatusDot = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    completed: 'bg-accent',
    in_progress: 'bg-info',
    not_started: 'bg-[var(--text-muted)]',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[status] ?? 'bg-[var(--text-muted)]'}`} />;
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
    return () => { cancelled = true; };
  }, [user?.role]);

  if (user?.role === 'admin') {
    return (
      <AppShell title="Admin workspace" subtitle="Manage your question bank, tests, and candidate outcomes.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { to: '/admin/questions', label: 'Questions', sub: 'Create, edit, and curate coding problems.', tag: 'Content' },
            { to: '/admin/assessments', label: 'Assessments', sub: 'Create tests, assign students, and view scores.', tag: 'Delivery' },
          ].map(item => (
            <button key={item.to} type="button" onClick={() => navigate(item.to)}
              className="card card-interactive text-left p-6 group">
              <span className="mono-label text-accent">{item.tag}</span>
              <h2 className="mt-2 font-display font-bold text-lg text-[var(--text-primary)] group-hover:text-accent transition-colors">{item.label}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.sub}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-[var(--text-muted)] group-hover:text-accent transition-colors">
                <span>Open</span>
                <svg className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Hey, ${user?.fullName?.split(' ')[0] || 'there'} 👋`}
      subtitle="Your assigned tests and practice tools."
    >
      <div className="space-y-10">
        {/* Assigned tests */}
        <section>
          <p className="mono-label mb-4">Assigned tests</p>
          {loadingTests ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1,2].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
            </div>
          ) : assigned.length === 0 ? (
            <div className="card border-dashed py-12 text-center">
              <p className="text-[var(--text-secondary)] text-sm">No tests assigned yet.</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">When an admin assigns you a test, it'll appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {assigned.map(a => {
                const ua = a.userAssessments?.[0];
                const rawStatus = ua?.status || 'not_started';
                const isCompleted = rawStatus === 'completed';
                const isStarting = startingId === a.id;
                return (
                  <div key={a.id} className="card p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-[var(--text-primary)]">{a.title}</h3>
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isCompleted ? 'status-accepted' : rawStatus === 'in_progress' ? 'status-running' : 'status-pending'
                      }`}>
                        <StatusDot status={rawStatus} />
                        {rawStatus.replace('_', ' ')}
                      </span>
                    </div>
                    {a.description && <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">{a.description}</p>}
                    <div className="flex gap-4 text-xs text-[var(--text-muted)] font-mono mb-4">
                      <span>{a.duration}m</span>
                      {a.totalScore != null && <span>{a.totalScore}pts</span>}
                    </div>
                    <button
                      type="button"
                      disabled={isCompleted || isStarting}
                      onClick={async () => {
                        if (isCompleted) { navigate('/submissions'); return; }
                        setStartingId(a.id);
                        try {
                          const res = await api.post(`/assessments/${a.id}/start`);
                          const ua = res.data.data;
                          const firstAQ = ua.assessment.assessmentQuestions[0];
                          if (firstAQ) {
                            navigate(`/practice/${firstAQ.questionId}?userAssessmentId=${ua.id}`, {
                              state: { initialQuestion: firstAQ.question, initialUserAssessment: ua }
                            });
                          } else {
                            alert('This assessment has no questions.');
                          }
                        } catch (err: any) {
                          alert(err.response?.data?.error?.message || 'Failed to start');
                        } finally {
                          setStartingId(null);
                        }
                      }}
                      className={`mt-auto btn w-full justify-center ${isCompleted ? 'btn-ghost' : 'btn-primary'}`}
                    >
                      {isStarting
                        ? <><span className="w-3.5 h-3.5 border-2 border-base/30 border-t-base rounded-full animate-spin" />Starting…</>
                        : isCompleted ? 'View results'
                        : rawStatus === 'not_started' ? 'Start test' : 'Continue'
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section>
          <p className="mono-label mb-4">Explore</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button type="button" onClick={() => navigate('/practice')}
              className="card card-interactive text-left p-5 group">
              <span className="mono-label text-accent">Practice</span>
              <h3 className="mt-2 font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors">Problem set</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Sharpen skills outside of graded tests.</p>
            </button>
            <button type="button" onClick={() => navigate('/submissions')}
              className="card card-interactive text-left p-5 group">
              <span className="mono-label text-[var(--text-muted)]">History</span>
              <h3 className="mt-2 font-semibold text-[var(--text-primary)] group-hover:text-accent transition-colors">Submissions</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Review past graded attempts.</p>
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
};
