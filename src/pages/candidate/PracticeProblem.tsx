import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CodeEditor } from '../../components/CodeEditor';
import { SecureTestOverlay } from '../../components/SecureTestOverlay';
import { useSecureTest } from '../../hooks/useSecureTest';
import api from '../../services/api';

type EvalStage = 'submitting' | 'evaluating' | 'done' | 'error';
interface EvalState {
  stage: EvalStage; message: string;
  passedTests: number; totalTests: number;
  score: number; maxScore: number; results: any[];
}

const LANGS: Record<string, string> = { python: 'py', javascript: 'js', java: 'java', cpp: 'cpp', c: 'c' };
const LANG_LABELS: Record<string, string> = { python: 'Python', javascript: 'JS', java: 'Java', cpp: 'C++', c: 'C' };

export const PracticeProblem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [question, setQuestion] = useState<any>(null);
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runCooldown, setRunCooldown] = useState(0);
  const [testCaseResults, setTestCaseResults] = useState<any[]>([]);
  const [passedTests, setPassedTests] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(38);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'results'>('description');
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem(`practice_timer_${id}`);
    return saved !== null ? parseInt(saved, 10) : 1800;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [evalOverlay, setEvalOverlay] = useState<EvalState | null>(null);
  const queryParams = new URLSearchParams(window.location.search);
  const userAssessmentId = queryParams.get('userAssessmentId');
  const [userAssessment, setUserAssessment] = useState<any>(null);
  const [isInitializing] = useState(false);
  const [secureReady, setSecureReady] = useState(false); // gate: show "Enter Fullscreen" screen first

  // ── Secure Test Mode ───────────────────────────────────────────────────────
  const submitSolutionRef = useRef<() => void>(() => {});
  const { warning, isLocked, tabSwitchCount, dismissWarning, requestFullscreen } = useSecureTest({
    enabled: !!userAssessmentId && secureReady,
    maxTabSwitches: 3,
    onTabSwitch: async (count) => {
      try { await api.patch(`/assessments/${userAssessmentId}/tab-switch`); } catch {}
      setSwitchCount(count);
    },
    onViolationLimit: () => { submitSolutionRef.current(); },
  });
  const [switchCount, setSwitchCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    setQuestion(null); setTestCaseResults([]); setOutput('');
    if (!location.state?.initialQuestion) setCode('');
    if (userAssessmentId) fetchAssessment(id!, ignore);
    else fetchQuestion(id!, ignore);
    return () => { ignore = true; };
  }, [id, userAssessmentId]);

  useEffect(() => {
    let timer: any;
    if (runCooldown > 0) timer = setInterval(() => setRunCooldown(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [runCooldown]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = ((e.clientX - rect.left) / rect.width) * 100;
      if (w >= 20 && w <= 60) setLeftPanelWidth(w);
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [isDragging]);

  useEffect(() => {
    if (!userAssessmentId || !id || !code) return;
    const timer = setInterval(async () => {
      try { await api.post('/assessments/progress/save', { userAssessmentId, questionId: id, code, language }); } catch {}
    }, 30000);
    return () => clearInterval(timer);
  }, [userAssessmentId, id, code, language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 0;
        const t = prev - 1;
        if (!userAssessmentId) localStorage.setItem(`practice_timer_${id}`, t.toString());
        return t;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [id, userAssessmentId]);

  const fetchSavedProgress = async (uaId: string, qId: string) => {
    try {
      const res = await api.get(`/assessments/progress/get?userAssessmentId=${uaId}&questionId=${qId}`);
      if (res.data.data?.code) { setCode(res.data.data.code); if (res.data.data.language) setLanguage(res.data.data.language); }
    } catch {}
  };

  const fetchAssessment = async (questionId: string, ignore: boolean) => {
    setLoading(true);
    try {
      const [qRes, uaRes] = await Promise.all([
        api.get(`/questions/${questionId}?t=${Date.now()}`),
        api.get(`/assessments/session/${userAssessmentId}`)
      ]);
      if (ignore) return;
      const q = qRes.data.data; const ua = uaRes.data.data;
      setQuestion(q); setCustomInput(q.sampleInput || '');
      await fetchSavedProgress(ua.id, questionId);
      setUserAssessment(ua); setSwitchCount(ua.tabSwitches || 0);
      const startTime = new Date(ua.startedAt).getTime();
      const remaining = Math.max(0, Math.floor((ua.assessment.duration * 60000 - (Date.now() - startTime)) / 1000));
      setTimeLeft(remaining);
    } catch (err) { if (!ignore) console.error(err); }
    finally { if (!ignore) setLoading(false); }
  };

  const fetchQuestion = async (questionId: string, ignore: boolean) => {
    setLoading(true);
    try {
      const [qRes, allRes] = await Promise.all([
        api.get(`/questions/${questionId}?t=${Date.now()}`),
        api.get('/questions')
      ]);
      if (ignore) return;
      const q = qRes.data.data;
      setQuestion(q); setCustomInput(q.sampleInput || '');
      if (!code) setCode(getStarterCode(q, language));
      const questions = allRes.data.data;
      const idx = questions.findIndex((item: any) => item.id === questionId);
      setNextQuestionId(idx !== -1 && idx + 1 < questions.length ? questions[idx + 1].id : null);
    } catch (err) { if (!ignore) console.error(err); }
    finally { if (!ignore) setLoading(false); }
  };

  const getStarterCode = (q: any, lang: string) => {
    const map: any = { python: q.starterCodePython, javascript: q.starterCodeJavascript, java: q.starterCodeJava, cpp: q.starterCodeCpp, c: q.starterCodeC };
    return map[lang] || '';
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (question) setCode(getStarterCode(question, lang));
  };

  const runCode = async () => {
    if (runCooldown > 0) return;
    setRunCooldown(10); setLoading(true); setOutput('Running…'); setActiveTab('results');
    try {
      const res = await api.post('/submissions/run', { language, code, input: customInput });
      setOutput(res.data.data.output || res.data.data.error || 'No output');
    } catch { setOutput('Error running code'); }
    finally { setLoading(false); }
  };

  const runAllTestCases = async () => {
    if (runCooldown > 0) return;
    setRunCooldown(10); setLoading(true); setOutput('Running test cases…'); setActiveTab('results');
    try {
      const res = await api.post('/submissions/run-all', { questionId: id, language, code });
      const s = res.data.data;
      setPassedTests(s.passedTests || 0); setTotalTests(s.totalTests || 0);
      setScore(s.score || 0); setMaxScore(s.maxScore || 0);
      setTestCaseResults(s.submissionResults || []);
      setOutput(`${s.passedTests}/${s.totalTests} test cases passed`);
    } catch { setOutput('Failed to run test cases.'); }
    finally { setLoading(false); }
  };

  const submitSolution = async () => {
    if (runCooldown > 0) return;
    const uaId = new URLSearchParams(window.location.search).get('userAssessmentId');
    if (uaId) setRunCooldown(10); else setRunCooldown(3);
    if (!uaId) {
      setEvalOverlay({ stage: 'evaluating', message: 'Running all test cases…', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] });
      setSubmitting(true);
      try {
        const res = await api.post('/submissions/practice', { questionId: id, language, code });
        const s = res.data.data;
        const results = s.submissionResults || [];
        setPassedTests(s.passedTests || 0); setTotalTests(s.totalTests || 0);
        setScore(s.score || 0); setMaxScore(s.maxScore || 0);
        setTestCaseResults(results);
        setEvalOverlay({ stage: 'done', message: `${s.passedTests}/${s.totalTests} test cases passed`, passedTests: s.passedTests || 0, totalTests: s.totalTests || 0, score: s.score || 0, maxScore: s.maxScore || 0, results });
      } catch { setEvalOverlay({ stage: 'error', message: 'Failed to run tests.', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] }); }
      finally { setSubmitting(false); }
      return;
    }
    setSubmitting(true);
    setEvalOverlay({ stage: 'submitting', message: 'Submitting your solution…', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] });
    try {
      const sub = await api.post('/submissions', { userAssessmentId: uaId, questionId: id, language, code });
      const submissionId = sub.data.data.id;
      setEvalOverlay(p => p ? { ...p, stage: 'evaluating', message: 'Evaluating against test cases…' } : p);
      await streamResults(submissionId);
    } catch { setEvalOverlay({ stage: 'error', message: 'Submission failed.', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] }); }
    finally { setSubmitting(false); }
  };

  const streamResults = async (submissionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
      const response = await fetch(`${baseUrl}/submissions/stream/${submissionId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let results: any[] = []; let passedCount = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (!results.find(r => r.id === data.testCaseId)) {
                const newRes = { id: data.testCaseId, status: data.status, pointsEarned: data.pointsEarned, pointsAvailable: data.pointsAvailable || 0, errorMessage: data.errorMessage, passed: data.passed };
                results = [...results, newRes];
                if (data.passed) passedCount++;
                setEvalOverlay(p => p ? { ...p, passedTests: passedCount, results: [...results] } : p);
                setTestCaseResults([...results]); setPassedTests(passedCount);
              }
            } catch {}
          }
        }
      }
      const finalRes = await api.get(`/submissions/${submissionId}`);
      const s = finalRes.data.data;
      const finalResults = s.submissionResults?.map((r: any) => ({ id: r.testCaseId, input: r.testCase?.input || '', expectedOutput: r.testCase?.expectedOutput || '', actualOutput: r.actualOutput || '', status: r.status, pointsEarned: r.pointsEarned || 0, pointsAvailable: r.testCase?.points || 0, errorMessage: r.errorMessage })) || [];
      setPassedTests(s.passedTests); setTotalTests(s.totalTests); setScore(s.score); setMaxScore(s.maxScore);
      setTestCaseResults(finalResults);
      setEvalOverlay({ stage: 'done', message: `${s.passedTests}/${s.totalTests} test cases passed`, passedTests: s.passedTests, totalTests: s.totalTests, score: s.score, maxScore: s.maxScore, results: finalResults });
    } catch {
      const res = await api.get(`/submissions/${submissionId}`);
      const s = res.data.data;
      setEvalOverlay({ stage: 'done', message: 'Evaluation complete', passedTests: s.passedTests || 0, totalTests: s.totalTests || 0, score: s.score || 0, maxScore: s.maxScore || 100, results: s.submissionResults || [] });
    }
  };

  const closeEvalOverlay = () => { setEvalOverlay(null); setActiveTab('results'); };

  // Keep submitSolutionRef in sync so the secure hook can call it stably
  submitSolutionRef.current = submitSolution;

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const isTimeLow = timeLeft <= 300;

  if (isInitializing || !question) {
    return (
      <div className="fixed inset-0 bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--border-default)] border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)] font-mono">Loading problem…</p>
        </div>
      </div>
    );
  }

  // ── Fullscreen gate — shown once before test starts ────────────────────────
  if (userAssessmentId && !secureReady) {
    return (
      <div className="fixed inset-0 bg-base flex items-center justify-center bg-grid">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="card w-full max-w-sm mx-4 p-8 text-center animate-fade-in z-10 border border-[rgba(0,255,136,0.2)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[rgba(0,255,136,0.3)] flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)] mb-2">Secure Test Mode</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
            This test runs in fullscreen. Tab switching is monitored — <span className="text-warn font-semibold">3 violations</span> will auto-submit your test.
          </p>
          <ul className="text-xs text-[var(--text-muted)] font-mono space-y-1.5 mb-7 text-left bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)]">
            <li className="flex items-center gap-2"><span className="text-accent">✓</span> Fullscreen enforced</li>
            <li className="flex items-center gap-2"><span className="text-accent">✓</span> Tab switches tracked (max 3)</li>
            <li className="flex items-center gap-2"><span className="text-accent">✓</span> Right-click disabled</li>
            <li className="flex items-center gap-2"><span className="text-accent">✓</span> Copy/paste blocked outside editor</li>
          </ul>
          <button
            className="btn btn-primary w-full justify-center py-3 text-sm"
            onClick={() => {
              document.documentElement.requestFullscreen().catch(() => {});
              setSecureReady(true);
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            Enter Fullscreen & Start
          </button>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Assessment: <span className="text-[var(--text-secondary)]">{userAssessment?.assessment?.title}</span></p>
        </div>
      </div>
    );
  }

  const allPassed = evalOverlay?.passedTests === evalOverlay?.totalTests && (evalOverlay?.totalTests ?? 0) > 0;

  return (
    <>
    <div
      className="h-screen flex flex-col bg-base overflow-hidden"
      style={{
        fontFamily: 'var(--font-body)',
        filter: (warning || isLocked) ? 'blur(3px)' : 'none',
        pointerEvents: (warning || isLocked) ? 'none' : 'auto',
        transition: 'filter 0.2s ease',
      }}
    >

      {/* ── Eval Overlay ── */}
      {evalOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-md">
          <div className="card w-full max-w-md mx-4 overflow-hidden animate-result-pop">
            {/* Header */}
            <div className={`px-6 py-5 border-b border-[var(--border-subtle)] flex items-center gap-3 ${
              evalOverlay.stage === 'done' && allPassed ? 'bg-[var(--accent-dim)]'
              : evalOverlay.stage === 'done' ? 'bg-[var(--warn-dim)]'
              : evalOverlay.stage === 'error' ? 'bg-[var(--danger-dim)]'
              : 'bg-[var(--bg-elevated)]'
            }`}>
              {(evalOverlay.stage === 'submitting' || evalOverlay.stage === 'evaluating') ? (
                <div className="w-9 h-9 border-2 border-[var(--border-default)] border-t-accent rounded-full animate-spin shrink-0" />
              ) : evalOverlay.stage === 'done' && allPassed ? (
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              ) : evalOverlay.stage === 'done' ? (
                <div className="w-9 h-9 rounded-full bg-warn flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-danger flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
              )}
              <div>
                <div className="font-display font-bold text-[var(--text-primary)]">
                  {evalOverlay.stage === 'submitting' ? 'Submitting…'
                    : evalOverlay.stage === 'evaluating' ? 'Evaluating…'
                    : evalOverlay.stage === 'error' ? 'Error'
                    : allPassed ? '✓ Accepted' : 'Partial Result'}
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">{evalOverlay.message}</div>
              </div>
            </div>

            {/* Score grid */}
            {evalOverlay.stage === 'done' && evalOverlay.totalTests > 0 && (
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Tests', value: `${evalOverlay.passedTests}/${evalOverlay.totalTests}`, color: allPassed ? 'text-accent' : 'text-warn' },
                    { label: 'Score', value: `${evalOverlay.score}/${evalOverlay.maxScore}`, color: 'text-[var(--text-primary)]' },
                    { label: 'Rate', value: `${evalOverlay.totalTests > 0 ? Math.round((evalOverlay.passedTests / evalOverlay.totalTests) * 100) : 0}%`, color: allPassed ? 'text-accent' : 'text-warn' },
                  ].map(s => (
                    <div key={s.label} className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center border border-[var(--border-subtle)]">
                      <div className={`font-display font-bold text-xl ${s.color}`}>{s.value}</div>
                      <div className="mono-label mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${evalOverlay.totalTests > 0 ? (evalOverlay.passedTests / evalOverlay.totalTests) * 100 : 0}%` }} />
                </div>
                {/* Test case list */}
                {evalOverlay.results.length > 0 && (
                  <div className="mt-4 space-y-1.5 max-h-40 overflow-y-auto">
                    {evalOverlay.results.map((tc: any, i: number) => (
                      <div key={tc.id || i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${tc.status === 'passed' ? 'status-accepted' : 'status-error'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">#{i + 1}</span>
                          {tc.errorMessage && <span className="truncate max-w-[140px] opacity-70">{tc.errorMessage}</span>}
                        </div>
                        <span className="font-mono font-bold">{tc.pointsEarned}/{tc.pointsAvailable}pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(evalOverlay.stage === 'submitting' || evalOverlay.stage === 'evaluating') && (
              <div className="px-6 pb-5 text-center">
                <p className="text-xs text-[var(--text-muted)] font-mono">Please wait…</p>
              </div>
            )}

            {(evalOverlay.stage === 'done' || evalOverlay.stage === 'error') && (
              <div className="px-5 pb-5 flex gap-3">
                <button onClick={closeEvalOverlay} className="btn btn-ghost flex-1 justify-center">View Details</button>
                <button onClick={() => { closeEvalOverlay(); navigate(nextQuestionId ? `/practice/${nextQuestionId}` : '/'); }}
                  className="btn btn-primary flex-1 justify-center">
                  {nextQuestionId ? 'Next Problem →' : 'Return Home'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <header className="h-12 glass border-b border-[var(--border-subtle)] flex items-center px-4 gap-3 shrink-0 z-10">
        {userAssessmentId ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-[var(--accent-dim)] border border-[rgba(0,255,136,0.3)] flex items-center justify-center">
              <span className="font-mono font-bold text-accent text-[10px]">
                {userAssessment?.assessment?.assessmentQuestions.findIndex((aq: any) => aq.questionId === id) + 1 || '?'}
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] truncate max-w-[100px]">
              {userAssessment?.assessment?.title}
            </span>
          </div>
        ) : (
          <button onClick={() => navigate('/practice')} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Problems
          </button>
        )}

        <div className="w-px h-4 bg-[var(--border-subtle)]" />
        <h1 className="text-sm font-semibold text-[var(--text-primary)] flex-1 truncate">{question.title}</h1>

        {/* Tab switch warning */}
        {userAssessmentId && switchCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--danger-dim)] border border-[rgba(255,71,87,0.3)] text-danger text-[10px] font-mono font-bold shrink-0">
            ⚠ {switchCount} switch{switchCount > 1 ? 'es' : ''}
          </div>
        )}

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs font-bold border shrink-0 ${
          isTimeLow ? 'bg-[var(--danger-dim)] border-[rgba(255,71,87,0.3)] text-danger' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
        }`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {fmtTime(timeLeft)}
        </div>

        {/* Assessment nav */}
        {userAssessmentId && userAssessment?.assessment?.assessmentQuestions && (() => {
          const aqs = userAssessment.assessment.assessmentQuestions;
          const ci = aqs.findIndex((aq: any) => aq.questionId === id);
          return (
            <div className="flex items-center gap-1 shrink-0">
              {ci > 0 && (
                <button onClick={() => navigate(`/practice/${aqs[ci-1].questionId}?userAssessmentId=${userAssessmentId}`)}
                  className="btn btn-ghost py-1 px-2 text-xs">← Prev</button>
              )}
              <span className="mono-label px-2">{ci + 1}/{aqs.length}</span>
              {ci < aqs.length - 1 && (
                <button onClick={() => navigate(`/practice/${aqs[ci+1].questionId}?userAssessmentId=${userAssessmentId}`)}
                  className="btn btn-primary py-1 px-2 text-xs">Next →</button>
              )}
            </div>
          );
        })()}

        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* Language selector */}
        <select value={language} onChange={e => handleLanguageChange(e.target.value)}
          className="bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs font-mono font-semibold px-2 py-1 rounded-md focus:outline-none focus:border-accent cursor-pointer shrink-0">
          {Object.entries(LANG_LABELS).map(([lang, label]) => (
            <option key={lang} value={lang}>{label}</option>
          ))}
        </select>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={runCode} disabled={loading || runCooldown > 0}
            className={`btn py-1 px-3 text-xs ${runCooldown > 0 ? 'btn-ghost opacity-50' : 'btn-ghost'}`}>
            {loading ? <span className="w-3 h-3 border border-[var(--border-default)] border-t-accent rounded-full animate-spin" /> : '▶'}
            {runCooldown > 0 ? `${runCooldown}s` : 'Run'}
          </button>
          {!userAssessmentId && (
            <button onClick={runAllTestCases} disabled={loading || runCooldown > 0}
              className="btn btn-ghost py-1 px-3 text-xs">
              Tests
            </button>
          )}
          <button onClick={submitSolution} disabled={submitting || loading || runCooldown > 0}
            className="btn btn-primary py-1 px-3 text-xs">
            {submitting ? <span className="w-3 h-3 border-2 border-base/30 border-t-base rounded-full animate-spin" /> : null}
            Submit
          </button>
        </div>
      </header>

      {/* ── Split Layout ── */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>

        {/* LEFT: Problem panel */}
        <div style={{ width: `${leftPanelWidth}%` }} className="flex flex-col bg-surface border-r border-[var(--border-subtle)] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border-subtle)] shrink-0">
            {(['description', 'results'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-2.5 text-xs font-semibold transition-colors capitalize ${
                  activeTab === tab ? 'text-accent' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}>
                {tab === 'results' ? 'Results' : 'Problem'}
                {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                {tab === 'results' && testCaseResults.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-base text-[9px] font-bold">{testCaseResults.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'description' ? (
              <div className="p-5 space-y-6">
                {/* Meta */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    question.difficulty === 'easy' ? 'badge-easy' : question.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                  }`}>{question.difficulty}</span>
                  <span className="tag">⏱ {question.timeLimit}ms</span>
                  <span className="tag">💾 {question.memoryLimit}MB</span>
                </div>

                <p className="text-sm text-[var(--text-primary)] leading-7 whitespace-pre-wrap">{question.description}</p>

                {question.sampleInput && (
                  <div>
                    <p className="mono-label mb-2">Example Input</p>
                    <div className="bg-base rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                      <pre className="px-4 py-3 text-xs text-accent font-mono overflow-x-auto leading-relaxed">{question.sampleInput}</pre>
                    </div>
                  </div>
                )}
                {question.sampleOutput && (
                  <div>
                    <p className="mono-label mb-2">Example Output</p>
                    <div className="bg-base rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                      <pre className="px-4 py-3 text-xs text-info font-mono overflow-x-auto leading-relaxed">{question.sampleOutput}</pre>
                    </div>
                  </div>
                )}
                {question.constraints && (
                  <div>
                    <p className="mono-label mb-2">Constraints</p>
                    <div className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] p-4">
                      <pre className="text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap leading-relaxed">{question.constraints}</pre>
                    </div>
                  </div>
                )}
                {question.tags?.length > 0 && (
                  <div>
                    <p className="mono-label mb-2">Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {question.tags.map((tag: string) => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Summary */}
                {totalTests > 0 && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                    passedTests === totalTests ? 'status-accepted' : 'status-error'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${passedTests === totalTests ? 'bg-accent' : 'bg-danger'}`}>
                      {passedTests === totalTests
                        ? <svg className="w-4 h-4 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      }
                    </div>
                    <div>
                      <div className="text-sm font-bold">{passedTests === totalTests ? 'All Passed' : `${passedTests}/${totalTests} Passed`}</div>
                      <div className="text-xs opacity-70 font-mono">Score: {score}/{maxScore}</div>
                    </div>
                  </div>
                )}

                {output && testCaseResults.length === 0 && (
                  <div className="bg-base rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[var(--border-subtle)]"><span className="mono-label">output</span></div>
                    <pre className="px-4 py-3 text-xs text-accent font-mono whitespace-pre-wrap leading-relaxed">{output}</pre>
                  </div>
                )}

                {testCaseResults.map((tc, idx) => {
                  const passed = tc.status === 'passed';
                  return (
                    <details key={tc.id || idx} className={`rounded-lg border overflow-hidden ${passed ? 'border-[rgba(0,255,136,0.2)] bg-[var(--accent-dim)]' : 'border-[rgba(255,71,87,0.2)] bg-[var(--danger-dim)]'}`}>
                      <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer list-none">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passed ? 'bg-accent' : 'bg-danger'}`}>
                            {passed
                              ? <svg className="w-2.5 h-2.5 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              : <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            }
                          </div>
                          <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">Case #{idx + 1}</span>
                        </div>
                        <span className={`text-xs font-mono font-bold ${passed ? 'text-accent' : 'text-danger'}`}>{tc.pointsEarned}/{tc.pointsAvailable}pts</span>
                      </summary>
                      <div className="border-t border-[var(--border-subtle)] px-3 py-3 space-y-2 bg-[var(--bg-surface)]">
                        {[['Input', tc.input], ['Expected', tc.expectedOutput], ['Got', tc.actualOutput], tc.errorMessage ? ['Error', tc.errorMessage] : null].filter(Boolean).map(([label, val]: any) => (
                          <div key={label} className="flex gap-3 text-xs">
                            <span className="mono-label w-14 shrink-0 pt-0.5">{label}</span>
                            <span className="font-mono text-[var(--text-secondary)] break-all">{String(val || '').substring(0, 200) || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}

                {testCaseResults.length === 0 && !output && (
                  <div className="text-center py-12 text-[var(--text-muted)]">
                    <p className="text-sm font-mono">No results yet</p>
                    <p className="text-xs mt-1">Run your code to see output here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drag handle */}
        <div onMouseDown={() => setIsDragging(true)}
          className={`w-1 shrink-0 cursor-col-resize transition-colors ${isDragging ? 'bg-accent' : 'bg-[var(--border-subtle)] hover:bg-[var(--border-default)]'}`} />

        {/* RIGHT: Editor panel */}
        <div style={{ width: `${100 - leftPanelWidth}%` }} className="flex flex-col bg-base min-h-0">
          {/* Editor toolbar */}
          <div className="flex items-center px-4 py-2 border-b border-[var(--border-subtle)] bg-surface shrink-0 gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-overlay)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-overlay)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-overlay)]" />
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">solution.{LANGS[language]}</span>
            <div className="flex-1" />
            <button onClick={() => question && setCode(getStarterCode(question, language))}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-mono">
              reset
            </button>
          </div>

          {/* Monaco */}
          <div className="flex-1 min-h-0">
            <CodeEditor value={code} onChange={setCode} language={language} />
          </div>

          {/* Bottom: Input / Output */}
          <div className="h-48 border-t border-[var(--border-subtle)] shrink-0 bg-surface grid grid-cols-2 divide-x divide-[var(--border-subtle)]">
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] shrink-0">
                <span className="mono-label">stdin</span>
                <button onClick={runCode} disabled={loading} className="text-xs text-[var(--text-muted)] hover:text-accent transition-colors font-mono disabled:opacity-40">
                  {loading ? '…' : '▶ run'}
                </button>
              </div>
              <textarea value={customInput} onChange={e => setCustomInput(e.target.value)}
                className="flex-1 bg-transparent text-[var(--text-secondary)] px-4 py-3 font-mono text-xs focus:outline-none resize-none placeholder-[var(--text-muted)] leading-relaxed"
                placeholder="Enter test input…" />
            </div>
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] shrink-0">
                <span className="mono-label">stdout</span>
                {output && <button onClick={() => { setOutput(''); setTestCaseResults([]); }} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-mono">clear</button>}
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {output
                  ? <pre className="text-xs text-accent font-mono whitespace-pre-wrap leading-relaxed">{output}</pre>
                  : <p className="text-xs text-[var(--text-muted)] font-mono">Output will appear here…</p>
                }
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="h-6 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center px-4 gap-4 shrink-0">
            <span className="mono-label">{LANG_LABELS[language]}</span>
            {totalTests > 0 && (
              <>
                <span className="mono-label">tests: <span className={passedTests === totalTests ? 'text-accent' : 'text-danger'}>{passedTests}/{totalTests}</span></span>
                <span className="mono-label">score: <span className="text-[var(--text-secondary)]">{score}/{maxScore}</span></span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    {/* ── Secure Test Overlay (outside blurred container) ── */}
    <SecureTestOverlay
      warning={warning}
      isLocked={isLocked}
      tabSwitchCount={tabSwitchCount}
      maxTabSwitches={3}
      onReenterFullscreen={requestFullscreen}
      onDismiss={dismissWarning}
    />
    </>
  );
};