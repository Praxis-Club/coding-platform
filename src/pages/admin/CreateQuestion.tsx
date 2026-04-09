import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export const CreateQuestion = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    timeLimit: 1000,
    memoryLimit: 256,
    sampleInput: '',
    sampleOutput: '',
    constraints: '',
    inputFormat: '',
    outputFormat: '',
    tags: '',
    starterCodePython: '',
    starterCodeJavascript: '',
    starterCodeJava: '',
    starterCodeCpp: '',
    starterCodeC: '',
    isActive: true,
  });

  const [testCases, setTestCases] = useState([
    { input: '', expectedOutput: '', isHidden: false, points: 10 }
  ]);

  useEffect(() => {
    if (id) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const res = await api.get(`/questions/${id}`);
      const q = res.data.data;
      setIsEditing(true);
      setFormData({
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        timeLimit: q.timeLimit,
        memoryLimit: q.memoryLimit,
        sampleInput: q.sampleInput || '',
        sampleOutput: q.sampleOutput || '',
        constraints: q.constraints || '',
        inputFormat: q.inputFormat || '',
        outputFormat: q.outputFormat || '',
        tags: q.tags.join(', '),
        starterCodePython: q.starterCodePython || '',
        starterCodeJavascript: q.starterCodeJavascript || '',
        starterCodeJava: q.starterCodeJava || '',
        starterCodeCpp: q.starterCodeCpp || '',
        starterCodeC: q.starterCodeC || '',
        isActive: q.isActive ?? true,
      });
      setTestCases(q.testCases || [{ input: '', expectedOutput: '', isHidden: false, points: 10 }]);
    } catch (error) {
      console.error('Failed to fetch question', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        timeLimit: formData.timeLimit,
        memoryLimit: formData.memoryLimit,
        constraints: formData.constraints,
        inputFormat: formData.inputFormat,
        outputFormat: formData.outputFormat,
        sampleInput: formData.sampleInput,
        sampleOutput: formData.sampleOutput,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        starterCodePython: formData.starterCodePython,
        starterCodeJavascript: formData.starterCodeJavascript,
        starterCodeJava: formData.starterCodeJava,
        starterCodeCpp: formData.starterCodeCpp,
        starterCodeC: formData.starterCodeC,
        isActive: formData.isActive,
        testCases: testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          points: tc.points,
        })),
      };

      if (isEditing && id) {
        await api.put(`/questions/${id}`, submitData);
      } else {
        await api.post('/questions', submitData);
      }
      navigate('/admin/questions');
    } catch (error: any) {
      console.error('Error:', error.response?.data);
      alert(error.response?.data?.error?.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '', isHidden: false, points: 10 }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleTestChange = (index: number, field: string, value: any) => {
    const updated = [...testCases];
    (updated[index] as any)[field] = value;
    setTestCases(updated);
  };

  // Reusable theme classes for Black & White professional aesthetic
  const inputClass = "w-full bg-white border border-slate-300 rounded-md px-4 py-2 text-sm text-slate-900 focus:ring-1 focus:ring-black focus:border-black outline-none transition-colors placeholder:text-slate-400 font-medium";
  const codeAreaClass = "w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-900 font-mono focus:ring-1 focus:ring-black focus:border-black outline-none transition-colors placeholder:text-slate-400 placeholder:font-sans min-h-[120px]";
  const labelClass = "block text-sm font-semibold text-slate-900 mb-2";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin/questions')}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{isEditing ? 'Edit Problem' : 'Create Problem'}</h1>
              <p className="text-xs font-semibold text-slate-500">{isEditing ? formData.title : 'New Entry'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/questions')}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-black rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
              {isEditing ? 'Save Changes' : 'Publish Problem'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8 pb-10">
          
          {/* Section: Basic Info */}
          <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
              <p className="text-sm text-slate-500 mt-1">Foundational details displayed on the problem card.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Problem Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={inputClass}
                  placeholder="e.g. Reverse Linked List"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Difficulty Level</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className={inputClass}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Time Limit (ms)</label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({...formData, timeLimit: parseInt(e.target.value) || 0})}
                    className={inputClass}
                    min="100"
                  />
                </div>
                <div>
                  <label className={labelClass}>Memory Limit (MB)</label>
                  <input
                    type="number"
                    value={formData.memoryLimit}
                    onChange={(e) => setFormData({...formData, memoryLimit: parseInt(e.target.value) || 0})}
                    className={inputClass}
                    min="16"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Topics / Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="e.g. Arrays, Sorting, Two Pointers (comma separated)"
                  className={inputClass}
                />
              </div>

              {/* Active Toggle for Question */}
              <div className="pt-6 border-t border-slate-100">
                <label className={`flex items-center gap-3 p-4 border rounded-xl transition-all cursor-pointer ${formData.isActive ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    />
                    <div className={`w-10 h-6 bg-slate-200 rounded-full transition-colors ${formData.isActive ? 'bg-emerald-500' : ''}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isActive ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 leading-none">Question Active</div>
                    <div className="text-xs text-slate-500 mt-1.5">If inactive, this question will be hidden from the practice pool and assessment picker.</div>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Section: Problem Statement */}
          <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Problem Details</h2>
              <p className="text-sm text-slate-500 mt-1">The main content describing the task requested to the candidate.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Description / Instructions</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={`${codeAreaClass} min-h-[240px] !font-sans !text-[15px] leading-relaxed resize-y`}
                  placeholder="Clearly describe the problem, context, and the expected logic to arrive at the solution..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Constraints (Optional)</label>
                  <textarea
                    value={formData.constraints}
                    onChange={(e) => setFormData({...formData, constraints: e.target.value})}
                    className={codeAreaClass}
                    placeholder="e.g. 1 <= nums.length <= 10^4&#10;-10^9 <= nums[i] <= 10^9"
                  />
                </div>
                <div>
                  <label className={labelClass}>I/O Specifications (Optional)</label>
                  <textarea
                    value={formData.inputFormat}
                    onChange={(e) => setFormData({...formData, inputFormat: e.target.value})}
                    className={`${codeAreaClass} !font-sans`}
                    placeholder="Provide any specific input parsing or output printing rules if standard JSON IO is not used."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Public Sample Input</label>
                  <textarea
                    value={formData.sampleInput}
                    onChange={(e) => setFormData({...formData, sampleInput: e.target.value})}
                    className={`${codeAreaClass} bg-slate-100 !text-slate-800 font-medium`}
                    placeholder="Provide visible sample inputs."
                  />
                </div>
                <div>
                  <label className={labelClass}>Public Sample Output</label>
                  <textarea
                    value={formData.sampleOutput}
                    onChange={(e) => setFormData({...formData, sampleOutput: e.target.value})}
                    className={`${codeAreaClass} bg-slate-100 !text-slate-800 font-medium`}
                    placeholder="Expected outputs for the samples."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Starter Code */}
          <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Starter Code Templates</h2>
              <p className="text-sm text-slate-500 mt-1">Pre-filled code snippets shown in the candidate's editor when they change language.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Python
                </label>
                <textarea
                  value={formData.starterCodePython}
                  onChange={(e) => setFormData({...formData, starterCodePython: e.target.value})}
                  className={`${codeAreaClass} bg-slate-900 !text-white !border-slate-800 text-xs border-0`}
                  placeholder="def solution(arr):&#10;    # Write your code here&#10;    pass"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span> JavaScript
                </label>
                <textarea
                  value={formData.starterCodeJavascript}
                  onChange={(e) => setFormData({...formData, starterCodeJavascript: e.target.value})}
                  className={`${codeAreaClass} bg-slate-900 !text-white !border-slate-800 text-xs border-0`}
                  placeholder="function solution(arr) {&#10;    // Write your code here&#10;}"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Java
                </label>
                <textarea
                  value={formData.starterCodeJava}
                  onChange={(e) => setFormData({...formData, starterCodeJava: e.target.value})}
                  className={`${codeAreaClass} bg-slate-900 !text-white !border-slate-800 text-xs border-0`}
                  placeholder="class Solution {&#10;    public void solve(int[] arr) {&#10;        // Write your code here&#10;    }&#10;}"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-700"></span> C++
                </label>
                <textarea
                  value={formData.starterCodeCpp}
                  onChange={(e) => setFormData({...formData, starterCodeCpp: e.target.value})}
                  className={`${codeAreaClass} bg-slate-900 !text-white !border-slate-800 text-xs border-0`}
                  placeholder="void solution(vector<int>& arr) {&#10;    // Write your code here&#10;}"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
                  <span className="w-2 h-2 rounded-full bg-slate-700"></span> C
                </label>
                <textarea
                  value={formData.starterCodeC}
                  onChange={(e) => setFormData({...formData, starterCodeC: e.target.value})}
                  className={`${codeAreaClass} bg-slate-900 !text-white !border-slate-800 text-xs border-0`}
                  placeholder="#include <stdio.h>&#10;&#10;int main() {&#10;    // Write your code here&#10;    return 0;&#10;}"
                />
              </div>
            </div>
          </section>

          {/* Section: Test Cases */}
          <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Evaluation Test Cases</h2>
                <p className="text-sm text-slate-500 mt-1">The engine verifies code correctness by running against these cases.</p>
              </div>
              <button
                type="button"
                onClick={addTestCase}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold rounded-md border border-slate-300 transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Case
              </button>
            </div>

            <div className="space-y-6">
              {testCases.map((tc, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-6 relative group">
                  
                  <div className="flex justify-between items-center mb-5">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      Test Case
                    </div>
                    
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(idx)}
                        className="text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                        title="Remove testcase"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Stdin</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => handleTestChange(idx, 'input', e.target.value)}
                        className={codeAreaClass}
                        required
                        placeholder="Raw input data block..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Expected Stdout</label>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) => handleTestChange(idx, 'expectedOutput', e.target.value)}
                        className={codeAreaClass}
                        required
                        placeholder="Expected exact string output..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-6 pt-5 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tc.isHidden}
                        onChange={(e) => handleTestChange(idx, 'isHidden', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-black focus:ring-black focus:ring-offset-slate-50 transition-all"
                      />
                      <span className="text-sm font-semibold text-slate-700 select-none">Hide from candidates during test</span>
                    </label>
                    
                    <div className="flex items-center gap-3 ml-auto">
                      <label className="text-sm font-semibold text-slate-700">Points Awarded</label>
                      <input
                        type="number"
                        value={tc.points}
                        onChange={(e) => handleTestChange(idx, 'points', parseInt(e.target.value) || 0)}
                        className="w-20 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm text-center text-slate-900 focus:ring-1 focus:ring-black focus:border-black outline-none font-semibold"
                        min="0"
                      />
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
