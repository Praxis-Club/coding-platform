import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const LANG_COLORS: Record<string, string> = { python: '#3b82f6', javascript: '#eab308', java: '#ef4444', cpp: '#8b5cf6', c: '#6b7280' };

export const CreateQuestion = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', difficulty: 'easy', timeLimit: 1000, memoryLimit: 256,
    sampleInput: '', sampleOutput: '', constraints: '', inputFormat: '', outputFormat: '',
    tags: '', starterCodePython: '', starterCodeJavascript: '', starterCodeJava: '',
    starterCodeCpp: '', starterCodeC: '', isActive: true,
  });
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '', isHidden: false, points: 10 }]);

  useEffect(() => { if (id) fetchQuestion(); }, [id]);

  const fetchQuestion = async () => {
    try {
      const res = await api.get(`/questions/${id}`);
      const q = res.data.data;
      setIsEditing(true);
      setFormData({
        title: q.title, description: q.description, difficulty: q.difficulty,
        timeLimit: q.timeLimit, memoryLimit: q.memoryLimit,
        sampleInput: q.sampleInput || '', sampleOutput: q.sampleOutput || '',
        constraints: q.constraints || '', inputFormat: q.inputFormat || '',
        outputFormat: q.outputFormat || '', tags: q.tags.join(', '),
        starterCodePython: q.starterCodePython || '', starterCodeJavascript: q.starterCodeJavascript || '',
        starterCodeJava: q.starterCodeJava || '', starterCodeCpp: q.starterCodeCpp || '',
        starterCodeC: q.starterCodeC || '', isActive: q.isActive ?? true,
      });
      setTestCases(q.testCases || [{ input: '', expectedOutput: '', isHidden: false, points: 10 }]);
    } catch { console.error('Failed to fetch question'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean), testCases: testCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput, isHidden: tc.isHidden, points: tc.points })) };
      if (isEditing && id) await api.put(`/questions/${id}`, payload);
      else await api.post('/questions', payload);
      navigate('/admin/questions');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save question');
    } finally { setLoading(false); }
  };

  const set = (k: string, v: any) => setFormData(p => ({ ...p, [k]: v }));
  const addTestCase = () => setTestCases(p => [...p, { input: '', expectedOutput: '', isHidden: false, points: 10 }]);
  const removeTestCase = (i: number) => { if (testCases.length > 1) setTestCases(p => p.filter((_, j) => j !== i)); };
  const setTC = (i: number, k: string, v: any) => setTestCases(p => { const n = [...p]; (n[i] as any)[k] = v; return n; });

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/questions')} className="btn btn-ghost p-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div>
              <h1 className="font-display font-bold text-[var(--text-primary)] text-base">{isEditing ? 'Edit Problem' : 'Create Problem'}</h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">{isEditing ? formData.title : 'New entry'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin/questions')} className="btn btn-ghost text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="btn btn-primary text-sm">
              {loading && <span className="w-3.5 h-3.5 border-2 border-base/30 border-t-base rounded-full animate-spin" />}
              {isEditing ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6 pb-10">

          {/* Basic Info */}
          <section className="card p-6">
            <h2 className="font-display font-bold text-[var(--text-primary)] mb-1">Basic Information</h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">Core details shown on the problem card.</p>
            <div className="space-y-4">
              <div>
                <label className="mono-label block mb-2">Problem Title</label>
                <input type="text" value={formData.title} onChange={e => set('title', e.target.value)}
                  className="input" placeholder="e.g. Reverse Linked List" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mono-label block mb-2">Difficulty</label>
                  <select value={formData.difficulty} onChange={e => set('difficulty', e.target.value)} className="input">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="mono-label block mb-2">Time Limit (ms)</label>
                  <input type="number" value={formData.timeLimit} onChange={e => set('timeLimit', parseInt(e.target.value) || 0)} className="input" min="100" />
                </div>
                <div>
                  <label className="mono-label block mb-2">Memory Limit (MB)</label>
                  <input type="number" value={formData.memoryLimit} onChange={e => set('memoryLimit', parseInt(e.target.value) || 0)} className="input" min="16" />
                </div>
              </div>
              <div>
                <label className="mono-label block mb-2">Tags (comma separated)</label>
                <input type="text" value={formData.tags} onChange={e => set('tags', e.target.value)}
                  className="input" placeholder="Arrays, Sorting, Two Pointers" />
              </div>
              <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${formData.isActive ? 'border-[rgba(0,255,136,0.3)] bg-[var(--accent-dim)]' : 'border-[var(--border-default)] bg-[var(--bg-elevated)]'}`}>
                <div className="relative flex items-center">
                  <input type="checkbox" className="sr-only" checked={formData.isActive} onChange={e => set('isActive', e.target.checked)} />
                  <div className={`w-9 h-5 rounded-full transition-colors ${formData.isActive ? 'bg-accent' : 'bg-[var(--bg-overlay)]'}`} />
                  <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${formData.isActive ? 'translate-x-4' : ''}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Question Active</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Inactive questions are hidden from practice and assessments.</div>
                </div>
              </label>
            </div>
          </section>

          {/* Problem Details */}
          <section className="card p-6">
            <h2 className="font-display font-bold text-[var(--text-primary)] mb-1">Problem Details</h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">The main content describing the task.</p>
            <div className="space-y-4">
              <div>
                <label className="mono-label block mb-2">Description</label>
                <textarea value={formData.description} onChange={e => set('description', e.target.value)}
                  className="input min-h-[200px] resize-y text-sm leading-relaxed" placeholder="Describe the problem clearly…" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mono-label block mb-2">Constraints</label>
                  <textarea value={formData.constraints} onChange={e => set('constraints', e.target.value)}
                    className="input input-mono min-h-[100px] resize-y" placeholder="1 ≤ n ≤ 10^4" />
                </div>
                <div>
                  <label className="mono-label block mb-2">I/O Specifications</label>
                  <textarea value={formData.inputFormat} onChange={e => set('inputFormat', e.target.value)}
                    className="input min-h-[100px] resize-y text-sm" placeholder="Input/output format notes…" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mono-label block mb-2">Sample Input</label>
                  <textarea value={formData.sampleInput} onChange={e => set('sampleInput', e.target.value)}
                    className="input input-mono min-h-[80px] resize-y" placeholder="5&#10;1 2 3 4 5" />
                </div>
                <div>
                  <label className="mono-label block mb-2">Sample Output</label>
                  <textarea value={formData.sampleOutput} onChange={e => set('sampleOutput', e.target.value)}
                    className="input input-mono min-h-[80px] resize-y" placeholder="15" />
                </div>
              </div>
            </div>
          </section>

          {/* Starter Code */}
          <section className="card p-6">
            <h2 className="font-display font-bold text-[var(--text-primary)] mb-1">Starter Code</h2>
            <p className="text-xs text-[var(--text-muted)] mb-5">Pre-filled code shown in the editor per language.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'starterCodePython', lang: 'Python', color: LANG_COLORS.python, placeholder: 'def solution(arr):\n    pass' },
                { key: 'starterCodeJavascript', lang: 'JavaScript', color: LANG_COLORS.javascript, placeholder: 'function solution(arr) {\n}' },
                { key: 'starterCodeJava', lang: 'Java', color: LANG_COLORS.java, placeholder: 'class Solution {\n    public void solve() {}\n}' },
                { key: 'starterCodeCpp', lang: 'C++', color: LANG_COLORS.cpp, placeholder: 'void solution(vector<int>& arr) {}' },
                { key: 'starterCodeC', lang: 'C', color: LANG_COLORS.c, placeholder: '#include <stdio.h>\nint main() { return 0; }' },
              ].map(({ key, lang, color, placeholder }) => (
                <div key={key}>
                  <label className="flex items-center gap-2 mono-label mb-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {lang}
                  </label>
                  <textarea value={(formData as any)[key]} onChange={e => set(key, e.target.value)}
                    className="input input-mono min-h-[100px] resize-y" placeholder={placeholder} />
                </div>
              ))}
            </div>
          </section>

          {/* Test Cases */}
          <section className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-bold text-[var(--text-primary)]">Test Cases</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">The engine verifies correctness against these.</p>
              </div>
              <button type="button" onClick={addTestCase} className="btn btn-ghost text-xs py-1.5 px-3">+ Add Case</button>
            </div>
            <div className="space-y-4">
              {testCases.map((tc, idx) => (
                <div key={idx} className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--bg-overlay)] border border-[var(--border-default)] flex items-center justify-center font-mono text-xs text-[var(--text-secondary)]">{idx + 1}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Test Case</span>
                    </div>
                    {testCases.length > 1 && (
                      <button type="button" onClick={() => removeTestCase(idx)} className="text-xs text-[var(--text-muted)] hover:text-danger transition-colors font-mono">remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mono-label block mb-2">Stdin</label>
                      <textarea value={tc.input} onChange={e => setTC(idx, 'input', e.target.value)}
                        className="input input-mono min-h-[80px] resize-y" required placeholder="Input data…" />
                    </div>
                    <div>
                      <label className="mono-label block mb-2">Expected Stdout</label>
                      <textarea value={tc.expectedOutput} onChange={e => setTC(idx, 'expectedOutput', e.target.value)}
                        className="input input-mono min-h-[80px] resize-y" required placeholder="Expected output…" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={tc.isHidden} onChange={e => setTC(idx, 'isHidden', e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-surface)] accent-accent" />
                      <span className="text-xs text-[var(--text-secondary)]">Hidden from candidates</span>
                    </label>
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="mono-label">Points</label>
                      <input type="number" value={tc.points} onChange={e => setTC(idx, 'points', parseInt(e.target.value) || 0)}
                        className="input w-16 text-center text-sm py-1" min="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </form>
      </main>
    </div>
  );
};
