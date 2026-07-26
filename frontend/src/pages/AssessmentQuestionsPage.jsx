import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { HelpCircle, Plus, Trash2, Edit2, Search, Filter, RefreshCw, X } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentQuestionsPage = () => {
  const queryClient = useQueryClient();
  const [qSearch, setQSearch] = useState('');
  const [qDifficulty, setQDifficulty] = useState('All');
  const [showQModal, setShowQModal] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [qForm, setQForm] = useState({
    title: '',
    question_type: 'mcq_single',
    difficulty: 'Medium',
    marks: 5,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct_answers: ['0']
  });

  const { data: questions = [], isLoading: loadingQ } = useQuery({
    queryKey: ['adminQuestions', qDifficulty],
    queryFn: async () => {
      const params = {};
      if (qDifficulty !== 'All') params.difficulty = qDifficulty;
      const res = await api.get('/admin/assessments/questions', { params });
      return res.data?.data || res.data || [];
    }
  });

  const saveQMutation = useMutation({
    mutationFn: async (data) => {
      if (editingQ) {
        return await api.put(`/admin/assessments/questions/${editingQ.id}`, data);
      } else {
        return await api.post('/admin/assessments/questions', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      toast.success(editingQ ? 'Question updated successfully!' : 'Question added to bank!');
      setShowQModal(false);
      setEditingQ(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save question');
    }
  });

  const deleteQMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/admin/assessments/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      toast.success('Question deleted from bank!');
    },
    onError: () => toast.error('Failed to delete question')
  });

  const openAddQuestion = () => {
    setEditingQ(null);
    setQForm({
      title: '',
      question_type: 'mcq_single',
      difficulty: 'Medium',
      marks: 5,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answers: ['0']
    });
    setShowQModal(true);
  };

  const openEditQuestion = (q) => {
    setEditingQ(q);
    let parsedOpts = ['Option A', 'Option B', 'Option C', 'Option D'];
    let parsedCorrect = ['0'];
    try {
      if (typeof q.options === 'string') parsedOpts = JSON.parse(q.options);
      else if (Array.isArray(q.options)) parsedOpts = q.options;
    } catch (e) { console.error(e); }
    try {
      if (typeof q.correct_answers === 'string') parsedCorrect = JSON.parse(q.correct_answers);
      else if (Array.isArray(q.correct_answers)) parsedCorrect = q.correct_answers;
    } catch (e) { console.error(e); }

    setQForm({
      title: q.title || '',
      question_type: q.question_type || 'mcq_single',
      difficulty: q.difficulty || 'Medium',
      marks: parseInt(q.marks) || 5,
      options: parsedOpts.length > 0 ? parsedOpts : ['Option A', 'Option B'],
      correct_answers: parsedCorrect.length > 0 ? parsedCorrect.map(String) : ['0']
    });
    setShowQModal(true);
  };

  const filteredQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(qSearch.toLowerCase())
  );

  if (loadingQ) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">MCQ Question Bank</h1>
          <p className="text-sm text-slate-500">
            Build and manage reusable multiple choice questions to be configured across your organizational assessments.
          </p>
        </div>
        <button
          onClick={openAddQuestion}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add MCQ Question
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search questions by prompt..."
            value={qSearch}
            onChange={e => setQSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Difficulty:</span>
          <select
            value={qDifficulty}
            onChange={e => setQDifficulty(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Question Bank Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium w-12 text-center">#</th>
                <th className="px-6 py-4 font-medium">Question Prompt</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Difficulty</th>
                <th className="px-6 py-4 font-medium">Default Marks</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredQuestions.map((q, idx) => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-center font-medium text-slate-500">{idx + 1}</td>
                  <td className="px-6 py-4 font-medium text-slate-900 max-w-lg">
                    {q.title}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                      {q.question_type === 'mcq_multiple' ? 'Multiple Choice' : 'Single Choice'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' : q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {q.difficulty || 'Medium'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {q.marks || 1} pts
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditQuestion(q)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this question?')) {
                          deleteQMutation.mutate(q.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <HelpCircle size={40} className="text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">No MCQ questions found</p>
                      <p className="text-xs mt-1">Click "Add MCQ Question" above to populate your question bank.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUESTION MODAL (SIDEBAR DRAWER) */}
      {showQModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white shadow-2xl w-full max-w-3xl h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                <HelpCircle className="text-blue-600" size={22} />
                <span>{editingQ ? 'Edit MCQ Question' : 'Add MCQ Question to Bank'}</span>
              </h2>
              <button onClick={() => setShowQModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1">
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Question Title / Prompt *</label>
                <textarea
                  rows={3}
                  value={qForm.title}
                  onChange={e => setQForm({ ...qForm, title: e.target.value })}
                  placeholder="Enter the question text clearly..."
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Question Type</label>
                  <select
                    value={qForm.question_type}
                    onChange={e => {
                      const type = e.target.value;
                      setQForm({ ...qForm, question_type: type, correct_answers: type === 'mcq_single' ? [qForm.correct_answers[0] || '0'] : qForm.correct_answers });
                    }}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white transition font-semibold"
                  >
                    <option value="mcq_single">Single Choice (One Correct)</option>
                    <option value="mcq_multiple">Multiple Choice (Many Correct)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Difficulty Level</label>
                  <select
                    value={qForm.difficulty}
                    onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white transition font-semibold"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Default Marks</label>
                  <input
                    type="number"
                    value={qForm.marks}
                    onChange={e => setQForm({ ...qForm, marks: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white font-extrabold text-blue-600"
                    title="Marks"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  Options & Correct Answer(s) ({qForm.question_type === 'mcq_multiple' ? 'Check all that apply' : 'Select one radio button'})
                </label>
                <div className="space-y-3">
                  {qForm.options.map((opt, i) => {
                    const idxStr = String(i);
                    const isChecked = qForm.correct_answers.includes(idxStr);
                    return (
                      <div key={i} className={`flex items-center gap-4 p-3.5 rounded-xl border transition ${
                        isChecked ? 'bg-blue-50/70 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200/80'
                      }`}>
                        <input
                          type={qForm.question_type === 'mcq_single' ? 'radio' : 'checkbox'}
                          name="q_correct"
                          checked={isChecked}
                          onChange={() => {
                            if (qForm.question_type === 'mcq_single') {
                              setQForm({ ...qForm, correct_answers: [idxStr] });
                            } else {
                              const next = new Set(qForm.correct_answers);
                              if (next.has(idxStr)) next.delete(idxStr);
                              else next.add(idxStr);
                              setQForm({ ...qForm, correct_answers: Array.from(next) });
                            }
                          }}
                          className="w-5 h-5 text-blue-600 focus:ring-0 cursor-pointer ml-1"
                        />
                        <span className="font-extrabold text-slate-700 text-sm w-6 text-center">{String.fromCharCode(65 + i)}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newOpts = [...qForm.options];
                            newOpts[i] = e.target.value;
                            setQForm({ ...qForm, options: newOpts });
                          }}
                          placeholder={`Enter text for Option ${String.fromCharCode(65 + i)}...`}
                          className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-400 font-medium"
                        />
                        {qForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = qForm.options.filter((_, idx) => idx !== i);
                              const newCorrect = qForm.correct_answers
                                .filter(val => val !== idxStr)
                                .map(val => (parseInt(val) > i ? String(parseInt(val) - 1) : val));
                              setQForm({ ...qForm, options: newOpts, correct_answers: newCorrect });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 transition cursor-pointer"
                            title="Remove option"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {qForm.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setQForm({ ...qForm, options: [...qForm.options, `Option ${String.fromCharCode(65 + qForm.options.length)}`] })}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 pt-2 px-1 cursor-pointer transition"
                    >
                      <Plus size={16} />
                      <span>Add Another Option</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveQMutation.mutate(qForm)}
                disabled={saveQMutation.isPending || !qForm.title.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {saveQMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
                <span>Save Question</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentQuestionsPage;
