import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Question } from '../../types';
import { AppShell } from '../../components/AppShell';

export const Questions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/questions');
      setQuestions(res.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try { await api.delete(`/questions/${id}`); fetchQuestions(); }
    catch { alert('Failed to delete question'); }
  };

  const filtered = questions.filter(q =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AppShell title="Question bank" subtitle="Problems used in practice and assessments."
      actions={
        <button onClick={() => navigate('/admin/questions/create')} className="btn btn-primary">
          + New question
        </button>
      }
    >
      <div className="mb-5">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search by title or tags…" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className="input pl-9 text-sm py-2" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q, idx) => (
            <div key={q.id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in"
              style={{ animationDelay: `${idx * 20}ms` }}>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)]">{q.title}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    q.difficulty === 'easy' ? 'badge-easy' : q.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                  }`}>{q.difficulty}</span>
                </div>
                {q.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => navigate(`/admin/questions/${q.id}/edit`)} className="btn btn-ghost text-xs py-1.5 px-3">Edit</button>
                <button onClick={() => deleteQuestion(q.id)} className="btn btn-danger text-xs py-1.5 px-3">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="card border-dashed py-16 text-center">
          <p className="text-[var(--text-secondary)] text-sm">No questions yet.</p>
          <button onClick={() => navigate('/admin/questions/create')} className="mt-4 text-sm font-semibold text-accent hover:text-[#1affa0] transition-colors">
            Create your first question →
          </button>
        </div>
      )}
    </AppShell>
  );
};
