import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Question } from '../../types';
import { AppShell } from '../../components/AppShell';

export const Practice = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  const fetchQuestions = async () => {
    try {
      const params = filter !== 'all' ? `?difficulty=${filter}` : '';
      const res = await api.get(`/questions${params}`);
      setQuestions(res.data.data);
    } catch (error) {
      console.error('Failed to fetch questions', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Practice" subtitle="Loading problems…">
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Practice"
      subtitle="Solve problems outside of timed assessments. Same editor, no grade pressure."
      wide
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Difficulty</p>
        <div className="flex flex-wrap gap-2">
          {['all', 'easy', 'medium', 'hard'].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setFilter(level)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === level
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => navigate(`/practice/${q.id}`)}
            className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-600 transition-colors group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  {q.title}
                </h3>
                {q.description ? (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">{q.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      q.difficulty === 'easy'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : q.difficulty === 'medium'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                  {q.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white group-hover:bg-emerald-600 transition-colors">
                Open
              </span>
            </div>
          </button>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 py-16 text-center">
          <p className="text-slate-400 text-sm">No problems match this filter.</p>
        </div>
      )}
    </AppShell>
  );
};
