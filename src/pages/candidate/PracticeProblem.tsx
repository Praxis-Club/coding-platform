import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CodeEditor } from '../../components/CodeEditor';
import api from '../../services/api';

type EvalStage = 'submitting' | 'evaluating' | 'done' | 'error';

interface EvalState {
  stage: EvalStage;
  message: string;
  passedTests: number;
  totalTests: number;
  score: number;
  maxScore: number;
  results: any[];
}

export const PracticeProblem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const location = useLocation();

  // Evaluation overlay
  const [evalOverlay, setEvalOverlay] = useState<EvalState | null>(null);

  // Assessment Mode
  const queryParams = new URLSearchParams(window.location.search);
  const userAssessmentId = queryParams.get('userAssessmentId');
  const [userAssessment, setUserAssessment] = useState<any>(null);
  const [switchCount, setSwitchCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    let ignore = false;
    
    const loadData = async () => {
      // CLEAR ALL QUESTION-SPECIFIC STATE IMMEDIATELY
      setQuestion(null);
      setTestCaseResults([]);
      setOutput('');
      // Only reset code if we're not using initial location state
      if (!location.state?.initialQuestion) {
        setCode('');
      }

      if (userAssessmentId) {
        await fetchAssessment(id!, ignore);
      } else {
        await fetchQuestion(id!, ignore);
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [id, userAssessmentId]);

  // ─── EFFECTS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: any;
    if (runCooldown > 0) {
      timer = setInterval(() => {
        setRunCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [runCooldown]);

  // Tab switch detection for assessments
  useEffect(() => {
    if (!userAssessmentId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const newCount = switchCount + 1;
        setSwitchCount(newCount);
        try {
          await api.patch(`/assessments/${userAssessmentId}/tab-switch`);
        } catch (err) {
          console.error('Failed to log tab switch', err);
        }

        if (newCount === 1) {
          alert('🚨 WARNING: Tab switching is NOT allowed during the assessment. Switching again will result in AUTOMATIC SUBMISSION.');
        } else if (newCount >= 2) {
          alert('🚫 MAXIMUM ATTEMPTS EXCEEDED: Your assessment is being submitted automatically due to multiple tab switches.');
          submitSolution();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userAssessmentId, switchCount]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth >= 20 && newWidth <= 60) {
        setLeftPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // ─── AUTO-SAVE ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userAssessmentId || !id || !code) return;

    const timer = setInterval(async () => {
      try {
        await api.post('/assessments/progress/save', {
          userAssessmentId,
          questionId: id,
          code,
          language
        });
        console.log('Auto-saved progress at', new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Auto-save failed', err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, [userAssessmentId, id, code, language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        const newTime = prev - 1;
        if (!userAssessmentId) {
          localStorage.setItem(`practice_timer_${id}`, newTime.toString());
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [id, userAssessmentId]);

  const fetchSavedProgress = async (uaId: string, qId: string) => {
    try {
      const res = await api.get(`/assessments/progress/get?userAssessmentId=${uaId}&questionId=${qId}`);
      if (res.data.data?.code) {
        setCode(res.data.data.code);
        if (res.data.data.language) setLanguage(res.data.data.language);
      }
    } catch (err) {
      console.error('Failed to fetch saved progress', err);
    }
  };

  const fetchAssessment = async (questionId: string, ignore: boolean) => {
    if (!location.state?.initialUserAssessment && !question) {
      setLoading(true);
    }
    try {
      // Cache-busting 't' parameter ensures we don't load stale data
      const [qRes, uaRes] = await Promise.all([
        api.get(`/questions/${questionId}?t=${Date.now()}`),
        api.get(`/assessments/session/${userAssessmentId}`)
      ]);

      if (ignore) return;

      const q = qRes.data.data;
      const ua = uaRes.data.data;

      setQuestion(q);
      setCustomInput(q.sampleInput || '');
      
      // Load saved progress for the specific question
      await fetchSavedProgress(ua.id, questionId);
      
      setUserAssessment(ua);
      setSwitchCount(ua.tabSwitches || 0);

      const startTime = new Date(ua.startedAt).getTime();
      const durationMs = ua.assessment.duration * 60 * 1000;
      const elapsedMs = Date.now() - startTime;
      const remainingSec = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
      setTimeLeft(remainingSec);
    } catch (err) {
      if (!ignore) console.error("Failed to fetch assessment context", err);
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  const fetchQuestion = async (questionId: string, ignore: boolean) => {
    if (!location.state?.initialQuestion && !question) {
      setLoading(true);
    }
    try {
      const [qRes, allRes] = await Promise.all([
        api.get(`/questions/${questionId}?t=${Date.now()}`),
        api.get('/questions')
      ]);

      if (ignore) return;

      const q = qRes.data.data;
      setQuestion(q);
      setCustomInput(q.sampleInput || '');
      
      // If we don't have code yet, set the starter code
      // We check !code to avoid overwriting typed code if the user happens to nav-back
      if (!code) setCode(getStarterCode(q, language));

      const questions = allRes.data.data;
      const currentIndex = questions.findIndex((item: any) => item.id === questionId);
      setNextQuestionId(currentIndex !== -1 && currentIndex + 1 < questions.length ? questions[currentIndex + 1].id : null);
    } catch (error) {
      if (!ignore) console.error('Failed to fetch question', error);
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  const getStarterCode = (question: any, lang: string) => {
    const codeMap: any = {
      python: question.starterCodePython,
      javascript: question.starterCodeJavascript,
      java: question.starterCodeJava,
      cpp: question.starterCodeCpp,
      c: question.starterCodeC,
    };
    return codeMap[lang] || '';
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (question) {
      const starterCode = getStarterCode(question, newLang);
      setCode(starterCode);
    }
  };

  const runCode = async () => {
    if (runCooldown > 0) return;
    setRunCooldown(10);
    setLoading(true);
    setOutput('Running...');
    setActiveTab('results');
    try {
      const res = await api.post('/submissions/run', { language, code, input: customInput });
      setOutput(res.data.data.output || res.data.data.error || 'No output');
    } catch (error) {
      setOutput('Error running code');
    } finally {
      setLoading(false);
    }
  };

  const runAllTestCases = async () => {
    if (runCooldown > 0) return;
    setRunCooldown(10);
    setLoading(true);
    setOutput('Running all test cases...');
    setActiveTab('results');
    try {
      const res = await api.post('/submissions/run-all', { questionId: id, language, code });
      const submission = res.data.data;
      setPassedTests(submission.passedTests || 0);
      setTotalTests(submission.totalTests || question?.testCases?.length || 0);
      setScore(submission.score || 0);
      setMaxScore(submission.maxScore || question?.testCases?.reduce((sum: number, tc: any) => sum + (tc.points ?? 1), 0) || 0);
      setTestCaseResults(submission.submissionResults || []);
      setOutput(`${submission.passedTests}/${submission.totalTests} test cases passed`);
    } catch (err) {
      setOutput('Failed to run test cases. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const submitSolution = async () => {
    if (runCooldown > 0) return;
    const userAssessmentId = new URLSearchParams(window.location.search).get('userAssessmentId');

    // For assessment, set cooldown immediately
    if (userAssessmentId) setRunCooldown(10);
    else setRunCooldown(3); // shorter for practice

    // No assessment context → persist as a practice submission
    if (!userAssessmentId) {
      setEvalOverlay({ stage: 'evaluating', message: 'Running all test cases...', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] });
      setSubmitting(true);
      try {
        const res = await api.post('/submissions/practice', { questionId: id, language, code });
        const sub = res.data.data;
        const results = sub.submissionResults || [];
        const passed = sub.passedTests || 0;
        const total = sub.totalTests || question?.testCases?.length || 0;
        const sc = sub.score || 0;
        const mx = sub.maxScore || question?.testCases?.reduce((s: number, tc: any) => s + (tc.points ?? 1), 0) || 0;
        setPassedTests(passed); setTotalTests(total); setScore(sc); setMaxScore(mx);
        setTestCaseResults(results);
        setOutput(`${passed}/${total} test cases passed`);
        setEvalOverlay({ stage: 'done', message: `${passed}/${total} test cases passed`, passedTests: passed, totalTests: total, score: sc, maxScore: mx, results });
      } catch {
        setEvalOverlay({ stage: 'error', message: 'Failed to run tests. Please retry.', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Assessment submission flow with streaming
    setSubmitting(true);
    setEvalOverlay({ stage: 'submitting', message: 'Submitting your solution...', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] });

    try {
      const sub = await api.post('/submissions', { userAssessmentId, questionId: id, language, code });
      const submissionId = sub.data.data.id;

      setEvalOverlay({ stage: 'evaluating', message: 'Evaluating against test cases...', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] });
      
      // Start streaming results
      await streamResults(submissionId);
    } catch (err) {
      console.error('Submission error', err);
      setEvalOverlay({ stage: 'error', message: 'Submission failed. Please try again.', passedTests: 0, totalTests: 0, score: 0, maxScore: 0, results: [] });
    } finally {
      setSubmitting(false);
    }
  };

  const streamResults = async (submissionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
      const response = await fetch(`${baseUrl}/submissions/stream/${submissionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let results: any[] = [];
      let passedCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (!results.find(r => r.id === data.testCaseId)) {
                const newRes = {
                  id: data.testCaseId,
                  status: data.status,
                  pointsEarned: data.pointsEarned,
                  pointsAvailable: data.pointsAvailable || 0,
                  errorMessage: data.errorMessage,
                  passed: data.passed
                };
                results = [...results, newRes];
                if (data.passed) passedCount++;

                setEvalOverlay(prev => prev ? {
                  ...prev,
                  passedTests: passedCount,
                  results: [...results]
                } : prev);
                
                setTestCaseResults([...results]);
                setPassedTests(passedCount);
              }
            } catch (e) { /* partial chunk */ }
          }
        }
      }

      // Final results fetch
      const finalRes = await api.get(`/submissions/${submissionId}`);
      const finalSub = finalRes.data.data;
      
      const finalResults = finalSub.submissionResults?.map((r: any) => ({
        id: r.testCaseId,
        input: r.testCase?.input || '',
        expectedOutput: r.testCase?.expectedOutput || '',
        actualOutput: r.actualOutput || '',
        status: r.status,
        pointsEarned: r.pointsEarned || 0,
        pointsAvailable: r.testCase?.points || 0,
        errorMessage: r.errorMessage,
      })) || [];

      setPassedTests(finalSub.passedTests);
      setTotalTests(finalSub.totalTests);
      setScore(finalSub.score);
      setMaxScore(finalSub.maxScore);
      setTestCaseResults(finalResults);
      setEvalOverlay({
        stage: 'done',
        message: `${finalSub.passedTests}/${finalSub.totalTests} test cases passed`,
        passedTests: finalSub.passedTests,
        totalTests: finalSub.totalTests,
        score: finalSub.score,
        maxScore: finalSub.maxScore,
        results: finalResults
      });
    } catch (err) {
      console.error('Streaming error', err);
      const res = await api.get(`/submissions/${submissionId}`);
      const s = res.data.data;
      setEvalOverlay({
        stage: 'done',
        message: 'Evaluation complete',
        passedTests: s.passedTests || 0,
        totalTests: s.totalTests || 0,
        score: s.score || 0,
        maxScore: s.maxScore || 100,
        results: s.submissionResults || []
      });
    }
  };

  const closeEvalOverlay = () => {
    setEvalOverlay(null);
    setActiveTab('results');
  };

  const difficultyConfig: Record<string, { label: string; cls: string }> = {
    easy: { label: 'Easy', cls: 'text-green-500 bg-green-500/10 border-green-500/20' },
    medium: { label: 'Medium', cls: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
    hard: { label: 'Hard', cls: 'text-red-500 bg-red-500/10 border-red-500/20' },
  };

  const langIcons: Record<string, string> = {
    python: '🐍',
    javascript: '⚡',
    java: '☕',
    cpp: '⚙️',
    c: 'Ⓒ',
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-4 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">🚀</span>
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Setting up your assessment session</h2>
        <p className="text-emerald-400 font-medium animate-pulse">Initializing secure environment...</p>
        <div className="mt-8 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!question) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-black/10"></div>
          <div className="absolute inset-0 rounded-full border-2 border-t-black animate-spin"></div>
        </div>
        <p className="text-sm text-zinc-500 font-medium tracking-wide">Loading problem...</p>
      </div>
    </div>
  );

  const diff = difficultyConfig[question.difficulty] || difficultyConfig.easy;

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Evaluation Overlay Modal ── */}
      {evalOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-zinc-200">

            {/* Header */}
            <div className={`px-6 py-5 border-b border-zinc-100 flex items-center gap-3 ${evalOverlay.stage === 'done' && evalOverlay.passedTests === evalOverlay.totalTests && evalOverlay.totalTests > 0
                ? 'bg-green-50'
                : evalOverlay.stage === 'done'
                  ? 'bg-amber-50'
                  : evalOverlay.stage === 'error'
                    ? 'bg-red-50'
                    : 'bg-zinc-50'
              }`}>
              {/* Stage icon */}
              {(evalOverlay.stage === 'submitting' || evalOverlay.stage === 'evaluating') ? (
                <div className="w-9 h-9 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin flex-shrink-0" />
              ) : evalOverlay.stage === 'done' && evalOverlay.passedTests === evalOverlay.totalTests && evalOverlay.totalTests > 0 ? (
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              ) : evalOverlay.stage === 'done' ? (
                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-zinc-900">
                  {evalOverlay.stage === 'submitting' ? 'Submitting…'
                    : evalOverlay.stage === 'evaluating' ? 'Evaluating…'
                      : evalOverlay.stage === 'error' ? 'Error'
                        : evalOverlay.passedTests === evalOverlay.totalTests && evalOverlay.totalTests > 0 ? 'Accepted!'
                          : 'Evaluation Complete'}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{evalOverlay.message}</div>
              </div>
            </div>

            {/* Stage steps */}
            <div className="px-6 py-4 flex items-center gap-2">
              {(['submitting', 'evaluating', 'done'] as EvalStage[]).map((s, i) => {
                const stages: EvalStage[] = ['submitting', 'evaluating', 'done', 'error'];
                const currentIdx = evalOverlay.stage === 'error' ? 2 : stages.indexOf(evalOverlay.stage);
                const stepIdx = i;
                const isDone = currentIdx > stepIdx || (evalOverlay.stage === 'done' && stepIdx === 2) || (evalOverlay.stage === 'error' && stepIdx <= 1);
                const isCurrent = currentIdx === stepIdx && evalOverlay.stage !== 'done' && evalOverlay.stage !== 'error';
                return (
                  <>
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isDone ? 'bg-zinc-900 text-white' : isCurrent ? 'bg-zinc-200 text-zinc-600 animate-pulse' : 'bg-zinc-100 text-zinc-400'
                        }`}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs font-medium ${isCurrent ? 'text-zinc-900' : isDone ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        {s === 'submitting' ? 'Submit' : s === 'evaluating' ? 'Evaluate' : 'Result'}
                      </span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${currentIdx > i ? 'bg-zinc-900' : 'bg-zinc-200'}`} />}
                  </>
                );
              })}
            </div>

            {/* Score summary (when done) */}
            {evalOverlay.stage === 'done' && evalOverlay.totalTests > 0 && (
              <div className="px-6 pb-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold tabular-nums ${evalOverlay.passedTests === evalOverlay.totalTests ? 'text-green-600' : 'text-red-600'}`}>
                      {evalOverlay.passedTests}/{evalOverlay.totalTests}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Tests Passed</div>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold tabular-nums text-zinc-900">{evalOverlay.score}/{evalOverlay.maxScore}</div>
                    <div className="text-xs text-zinc-500 mt-1">Score</div>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                    <div className={`text-lg font-bold ${evalOverlay.passedTests === evalOverlay.totalTests && evalOverlay.totalTests > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {evalOverlay.totalTests > 0 ? Math.round((evalOverlay.passedTests / evalOverlay.totalTests) * 100) : 0}%
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Accuracy</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${evalOverlay.passedTests === evalOverlay.totalTests ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${evalOverlay.totalTests > 0 ? (evalOverlay.passedTests / evalOverlay.totalTests) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Per-test-case mini list (done + has results) */}
            {evalOverlay.stage === 'done' && evalOverlay.results.length > 0 && (
              <div className="px-6 pb-4 max-h-48 overflow-y-auto space-y-1.5">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Test Cases</div>
                {evalOverlay.results.map((tc: any, idx: number) => (
                  <div key={tc.id || idx} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${tc.status === 'passed' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${tc.status === 'passed' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {tc.status === 'passed'
                          ? <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          : <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        }
                      </div>
                      <span className="font-medium text-zinc-700">Case #{idx + 1}</span>
                      {tc.errorMessage && <span className="text-amber-600 truncate max-w-28">{tc.errorMessage}</span>}
                    </div>
                    <span className={`font-bold ${tc.status === 'passed' ? 'text-green-600' : 'text-red-600'}`}>
                      {tc.pointsEarned}/{tc.pointsAvailable} pts
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Waiting state */}
            {(evalOverlay.stage === 'submitting' || evalOverlay.stage === 'evaluating') && (
              <div className="px-6 pb-5 text-center">
                <p className="text-xs text-zinc-400">Please wait, do not close this window…</p>
              </div>
            )}

            {/* Footer buttons */}
            {(evalOverlay.stage === 'done' || evalOverlay.stage === 'error') && (
              <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-3">
                <button
                  onClick={closeEvalOverlay}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm"
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    closeEvalOverlay();
                    if (nextQuestionId) {
                      navigate(`/practice/${nextQuestionId}`);
                    } else {
                      navigate('/');
                    }
                  }}
                  className="bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {nextQuestionId ? (
                    <>Next Problem <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg></>
                  ) : (
                    <>Return Home <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Navigation Bar ── */}
      <header className="h-14 bg-white border-b border-zinc-200 flex items-center px-4 gap-4 flex-shrink-0 z-10">
        {/* Logo / Back / Question Counter */}
        {userAssessmentId ? (
          <div className="flex items-center gap-3 mr-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {userAssessment?.assessment?.assessmentQuestions.findIndex((aq: any) => aq.questionId === id) + 1 || '?'}
            </div>
            <div>
              <h1 className="text-xs font-bold text-zinc-900 leading-none truncate max-w-[120px]">
                {userAssessment?.assessment?.title}
              </h1>
              <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                Assigned Test
              </p>
            </div>
          </div>
        ) : (
          <a
            href="/practice"
            className="flex items-center gap-2 text-zinc-900 hover:text-zinc-600 transition-colors mr-2 text-sm font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Problems
          </a>
        )}

        <div className="h-5 w-px bg-zinc-200" />

        {/* Problem title */}
        <h1 className="text-sm font-semibold text-zinc-900 flex-1 truncate">{question.title}</h1>

        {/* Tab Switch Warning (for assessments) */}
        {userAssessmentId && switchCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-md text-red-600 text-[10px] font-bold">
             <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
             SWITCHES: {switchCount}
          </div>
        )}

        <div className="h-5 w-px bg-zinc-200" />

        {/* Live Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-md font-mono text-xs font-semibold transition-colors ${timeLeft <= 300 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
          }`}>
          <svg className={`w-3.5 h-3.5 ${timeLeft <= 300 ? 'text-red-500' : 'text-zinc-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
          {String(timeLeft % 60).padStart(2, '0')}
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Question Counter (Assessment only) */}
        {userAssessmentId && userAssessment?.assessment?.assessmentQuestions && (
          <div className="flex items-center px-2 py-1 bg-zinc-100 rounded-md border border-zinc-200">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">
              Question {userAssessment.assessment.assessmentQuestions.findIndex((aq: any) => aq.questionId === id) + 1} of {userAssessment.assessment.assessmentQuestions.length}
            </span>
          </div>
        )}

        <div className="h-5 w-px bg-zinc-200" />

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="appearance-none bg-zinc-900 text-white text-[11px] font-bold pl-3 pr-8 py-1.5 rounded-md border border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              {Object.entries(langIcons).map(([lang, icon]) => (
                <option key={lang} value={lang}>{icon} {lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={runCode}
            disabled={loading || runCooldown > 0}
            className={`flex items-center gap-1.5 transition-all shadow-sm px-3 py-1.5 rounded-md text-[11px] font-bold ${
              runCooldown > 0 
                ? 'bg-amber-50 text-amber-600 border border-amber-200 cursor-not-allowed animate-pulse shadow-inner' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40'
            }`}
          >
            {(loading || runCooldown > 0) ? (
              <svg className={`w-3 h-3 ${runCooldown > 0 ? '' : 'animate-spin'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {runCooldown > 0 ? <circle cx="12" cy="12" r="10" strokeDasharray="64" strokeDashoffset={64 * (runCooldown / 7)} /> : <circle cx="12" cy="12" r="10" />}
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            )}
            {runCooldown > 0 ? `Wait ${runCooldown}s` : 'Run'}
          </button>
          {!userAssessmentId && (
            <button
              onClick={runAllTestCases}
              disabled={loading || runCooldown > 0}
              className={`flex items-center gap-1.5 transition-all shadow-sm px-3 py-1.5 rounded-md text-[11px] font-bold border ${
                runCooldown > 0 
                  ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed animate-pulse shadow-inner' 
                  : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 border-zinc-200'
              }`}
            >
              {(loading || runCooldown > 0) ? (
                <svg className={`w-3 h-3 ${runCooldown > 0 ? '' : 'animate-spin'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                   <circle cx="12" cy="12" r="10" />
                   <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              )}
              {runCooldown > 0 ? `Wait ${runCooldown}s` : 'Run tests'}
            </button>
          )}
          <button
            onClick={submitSolution}
            disabled={submitting || loading || runCooldown > 0}
            className={`flex items-center gap-1.5 transition-all shadow-sm px-4 py-1.5 rounded-md text-[11px] font-bold ${
              runCooldown > 0 
                ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed line-through opacity-60' 
                : 'bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white'
            }`}
          >
            {(submitting || runCooldown > 0) ? (
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            )}
            {runCooldown > 0 ? `Wait ${runCooldown}s` : 'Submit'}
          </button>

          {/* New Prominent Assessment Navigation */}
          {userAssessmentId && userAssessment?.assessment?.assessmentQuestions && (
            <>
              {userAssessment.assessment.assessmentQuestions.findIndex((aq: any) => aq.questionId === id) > 0 && (
                <button
                  onClick={() => {
                    const aqs = userAssessment.assessment.assessmentQuestions;
                    const currentIndex = aqs.findIndex((aq: any) => aq.questionId === id);
                    const prevId = aqs[currentIndex - 1].questionId;
                    navigate(`/practice/${prevId}?userAssessmentId=${userAssessmentId}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-md text-[11px] font-bold border border-zinc-200 transition-all shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6" /></svg>
                  Prev Question
                </button>
              )}
              {userAssessment.assessment.assessmentQuestions.findIndex((aq: any) => aq.questionId === id) < userAssessment.assessment.assessmentQuestions.length - 1 && (
                <button
                  onClick={() => {
                    const aqs = userAssessment.assessment.assessmentQuestions;
                    const currentIndex = aqs.findIndex((aq: any) => aq.questionId === id);
                    const nextId = aqs[currentIndex + 1].questionId;
                    navigate(`/practice/${nextId}?userAssessmentId=${userAssessmentId}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-[11px] font-bold transition-all shadow-sm"
                >
                  Next Question
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* ── Main Split Layout ── */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>

        {/* ── LEFT: Problem Panel ── */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="flex flex-col bg-white border-r border-zinc-200 overflow-hidden"
        >
          {/* Tab bar */}
          <div className="flex border-b border-zinc-200 flex-shrink-0">
            {(['description', 'results'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-3 text-xs font-semibold transition-colors capitalize ${activeTab === tab
                    ? 'text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-700'
                  }`}
              >
                {tab === 'results' ? 'Test Results' : 'Description'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />
                )}
                {tab === 'results' && testCaseResults.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-900 text-white text-[9px] font-bold">
                    {testCaseResults.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'description' ? (
              <div className="p-6 space-y-7">

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${diff.cls}`}>
                    {diff.label}
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {question.timeLimit}ms
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                    {question.memoryLimit}MB
                  </span>
                </div>

                {/* Description */}
                <section>
                  <p className="text-zinc-800 text-sm leading-7 whitespace-pre-wrap">{question.description}</p>
                </section>

                {/* Sample Input */}
                {question.sampleInput && (
                  <section>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Example Input</h3>
                    <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                        <span className="text-xs text-zinc-500 font-mono">stdin</span>
                        <button
                          onClick={() => navigator.clipboard?.writeText(question.sampleInput)}
                          className="text-zinc-600 hover:text-zinc-300 transition-colors"
                          title="Copy"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        </button>
                      </div>
                      <pre className="px-4 py-3 text-xs text-green-400 font-mono overflow-x-auto leading-relaxed">{question.sampleInput}</pre>
                    </div>
                  </section>
                )}

                {/* Sample Output */}
                {question.sampleOutput && (
                  <section>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Example Output</h3>
                    <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                        <span className="text-xs text-zinc-500 font-mono">stdout</span>
                        <button
                          onClick={() => navigator.clipboard?.writeText(question.sampleOutput)}
                          className="text-zinc-600 hover:text-zinc-300 transition-colors"
                          title="Copy"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        </button>
                      </div>
                      <pre className="px-4 py-3 text-xs text-blue-400 font-mono overflow-x-auto leading-relaxed">{question.sampleOutput}</pre>
                    </div>
                  </section>
                )}

                {/* Constraints */}
                {question.constraints && (
                  <section>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Constraints</h3>
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                      <pre className="text-xs text-zinc-700 font-mono whitespace-pre-wrap leading-relaxed">{question.constraints}</pre>
                    </div>
                  </section>
                )}

                {/* Explanation */}
                {question.explanation && (
                  <section>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Explanation</h3>
                    <p className="text-zinc-700 text-sm leading-7">{question.explanation}</p>
                  </section>
                )}

                {/* Tags */}
                {question.tags && question.tags.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {question.tags.map((tag: string) => (
                        <span key={tag} className="px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-full text-xs font-medium hover:bg-zinc-200 transition-colors cursor-default">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              /* Results Tab */
              <div className="p-5 space-y-4">
                {/* Summary bar */}
                {(totalTests > 0 || output) && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${passedTests === totalTests && totalTests > 0
                      ? 'bg-green-500/5 border-green-500/20'
                      : totalTests > 0
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-zinc-100 border-zinc-200'
                    }`}>
                    {totalTests > 0 ? (
                      <>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${passedTests === totalTests ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                          {passedTests === totalTests ? (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          )}
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${passedTests === totalTests ? 'text-green-600' : 'text-red-600'}`}>
                            {passedTests === totalTests ? 'All Tests Passed' : `${passedTests} / ${totalTests} Passed`}
                          </div>
                          <div className="text-xs text-zinc-500">Score: {score} / {maxScore}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-zinc-700 font-medium">{output}</div>
                    )}
                  </div>
                )}

                {/* Output / Custom run */}
                {output && testCaseResults.length === 0 && (
                  <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-mono">output</div>
                    <pre className="px-4 py-3 text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{output}</pre>
                  </div>
                )}

                {/* Test case results */}
                {testCaseResults.length > 0 && (
                  <div className="space-y-2">
                    {testCaseResults.map((tc, idx) => {
                      const passed = tc.status === 'passed';
                      const failed = tc.status === 'failed';
                      return (
                        <details key={tc.id || idx} className={`group rounded-lg border overflow-hidden ${passed ? 'border-green-500/30 bg-green-500/5'
                            : failed ? 'border-red-500/30 bg-red-500/5'
                              : 'border-zinc-300 bg-zinc-50'
                          }`}>
                          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${passed ? 'bg-green-500' : failed ? 'bg-red-500' : 'bg-zinc-400'
                                }`}>
                                {passed ? (
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : (
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-zinc-900">Case #{idx + 1}</span>
                              <span className={`text-xs font-medium ${passed ? 'text-green-600' : failed ? 'text-red-600' : 'text-zinc-500'}`}>
                                {tc.status.charAt(0).toUpperCase() + tc.status.slice(1)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                                {tc.pointsEarned} / {tc.pointsAvailable} pts
                              </span>
                              <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                          </summary>
                          <div className="border-t border-zinc-200 px-4 py-3 space-y-2 bg-white/60">
                            {[
                              { label: 'Input', value: tc.input, mono: true },
                              { label: 'Expected', value: tc.expectedOutput, mono: true },
                              { label: 'Got', value: tc.actualOutput, mono: true },
                              tc.errorMessage ? { label: 'Error', value: tc.errorMessage, mono: false } : null,
                            ].filter(Boolean).map((row: any) => (
                              <div key={row.label} className="flex gap-3 text-xs">
                                <span className="text-zinc-400 font-medium w-16 flex-shrink-0 pt-0.5">{row.label}:</span>
                                <span className={`text-zinc-700 break-all ${row.mono ? 'font-mono' : ''}`}>
                                  {String(row.value).substring(0, 200) || '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}

                {testCaseResults.length === 0 && !output && (
                  <div className="text-center py-16 text-zinc-400">
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                    <p className="text-sm font-medium">No results yet</p>
                    <p className="text-xs mt-1">Run your code or test cases to see results here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Drag Handle ── */}
        <div
          onMouseDown={() => setIsDragging(true)}
          className={`w-1 flex-shrink-0 bg-zinc-200 hover:bg-zinc-400 cursor-col-resize transition-colors ${isDragging ? 'bg-zinc-400' : ''}`}
        />

        {/* ── RIGHT: Code Editor Panel ── */}
        <div
          style={{ width: `${100 - leftPanelWidth}%` }}
          className="flex flex-col bg-zinc-950 min-h-0"
        >
          {/* Editor toolbar */}
          <div className="flex items-center px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 flex-shrink-0 gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
              <div className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
            <span className="text-xs text-zinc-500 font-mono">{langIcons[language]} solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : 'cpp'}</span>
            <div className="flex-1" />
            <button
              onClick={() => { if (question) setCode(getStarterCode(question, language)); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
              title="Reset to starter code"
            >
              Reset
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <CodeEditor value={code} onChange={setCode} language={language} />
          </div>

          {/* ── Bottom: Custom Input / Output ── */}
          <div className="h-[220px] border-t border-zinc-800 flex-shrink-0 bg-zinc-900">
            <div className="grid grid-cols-2 h-full divide-x divide-zinc-800">

              {/* Custom Input */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
                  <span className="text-xs font-semibold text-zinc-400 tracking-wide">Custom Input</span>
                  <button
                    onClick={runCode}
                    disabled={loading}
                    className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors font-medium disabled:opacity-40"
                  >
                    {loading ? 'Running…' : '▶ Run'}
                  </button>
                </div>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 bg-transparent text-zinc-300 px-4 py-3 font-mono text-xs focus:outline-none resize-none placeholder-zinc-700 leading-relaxed"
                  placeholder="Enter test input..."
                />
              </div>

              {/* Output */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
                  <span className="text-xs font-semibold text-zinc-400 tracking-wide">Output</span>
                  {output && (
                    <button
                      onClick={() => { setOutput(''); setTestCaseResults([]); }}
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {output ? (
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{output}</pre>
                  ) : (
                    <p className="text-xs text-zinc-700 font-mono">Output will appear here...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="h-7 bg-zinc-900 border-t border-zinc-800 flex items-center px-4 gap-6 flex-shrink-0">
            <div className="flex items-center gap-4 text-xs text-zinc-600">
              {totalTests > 0 && (
                <>
                  <span>
                    Tests: <span className={`font-semibold ${passedTests === totalTests ? 'text-green-500' : 'text-red-500'}`}>{passedTests}/{totalTests}</span>
                  </span>
                  <span>
                    Score: <span className="text-zinc-400 font-semibold">{score}/{maxScore}</span>
                  </span>
                </>
              )}
              <span className="ml-auto">{language.charAt(0).toUpperCase() + language.slice(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

