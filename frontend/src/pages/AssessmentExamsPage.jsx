import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Award, Plus, Trash2, Edit2, Clock, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentExamsPage = () => {
  const queryClient = useQueryClient();
  const [showAModal, setShowAModal] = useState(false);
  const [editingA, setEditingA] = useState(null);
  const [aForm, setAForm] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    passing_percentage: 70,
    max_attempts: 1,
    randomize_questions: true,
    randomize_options: true,
    result_visibility: 'immediate',
    status: 'published',
    question_ids: []
  });

  const { data: assessments = [], isLoading: loadingA } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['adminQuestions'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments/questions');
      return res.data?.data || res.data || [];
    }
  });

  const saveAMutation = useMutation({
    mutationFn: async (data) => {
      if (editingA) {
        return await api.put(`/admin/assessments/${editingA.id}`, data);
      } else {
        return await api.post('/admin/assessments', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success(editingA ? 'Assessment updated successfully!' : 'Assessment created successfully!');
      setShowAModal(false);
      setEditingA(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save assessment');
    }
  });

  const deleteAMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/admin/assessments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success('Assessment deleted successfully!');
    },
    onError: () => toast.error('Failed to delete assessment')
  });

  const openAddAssessment = () => {
    setEditingA(null);
    setAForm({
      title: '',
      description: '',
      duration_minutes: 30,
      passing_percentage: 70,
      max_attempts: 1,
      randomize_questions: true,
      randomize_options: true,
      result_visibility: 'immediate',
      status: 'published',
      question_ids: []
    });
    setShowAModal(true);
  };

  const openEditAssessment = (a) => {
    setEditingA(a);
    setAForm({
      title: a.title || '',
      description: a.description || '',
      duration_minutes: parseInt(a.duration_minutes) || 30,
      passing_percentage: parseInt(a.passing_percentage) || 70,
      max_attempts: parseInt(a.max_attempts) || 1,
      randomize_questions: a.randomize_questions ? true : false,
      randomize_options: a.randomize_options ? true : false,
      result_visibility: a.result_visibility || 'immediate',
      status: a.status || 'published',
      question_ids: Array.isArray(a.questions) ? a.questions.map(q => ({
        id: q.question_id || q.id,
        title: q.title || 'Question',
        marks: q.marks || 1
      })) : []
    });
    setShowAModal(true);
  };

  if (loadingA) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Exams & Assessments</h1>
          <p className="text-sm text-slate-500">
            Build and manage comprehensive MCQ assessments with configurable rules and question banks.
          </p>
        </div>
        <button
          onClick={openAddAssessment}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Assessment
        </button>
      </div>

      {/* Assessments List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Assessment Title</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Questions</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Pass Criteria</th>
                <th className="px-6 py-4 font-medium">Attempts</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {assessments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div>{a.title}</div>
                    {a.description && <div className="text-xs text-slate-500 font-normal truncate max-w-xs mt-0.5">{a.description}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      a.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {a.status || 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {a.questions?.length || 0} MCQs
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="flex items-center gap-1"><Clock size={15} className="text-slate-400" /> {a.duration_minutes || 30} mins</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {a.passing_percentage || 70}%
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {a.max_attempts == 0 ? 'Unlimited' : `${a.max_attempts} max`}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditAssessment(a)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Assessment"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this assessment?')) {
                          deleteAMutation.mutate(a.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Delete Assessment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {assessments.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Award size={40} className="text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">No assessments created yet</p>
                      <p className="text-xs mt-1">Click "Create Assessment" above to build your first exam.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSESSMENT BUILDER MODAL (SIDEBAR DRAWER) */}
      {showAModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white shadow-2xl w-full max-w-[1200px] h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                <Award className="text-blue-600" size={22} />
                <span>{editingA ? 'Configure Assessment' : 'Create New Assessment'}</span>
              </h2>
              <button onClick={() => setShowAModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1">
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column (5 Cols): Rules & Config */}
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Assessment Title *</label>
                    <input
                      type="text"
                      value={aForm.title}
                      onChange={e => setAForm({ ...aForm, title: e.target.value })}
                      placeholder="e.g. Annual Information Security Exam"
                      className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Description / Instructions</label>
                    <textarea
                      rows={3}
                      value={aForm.description}
                      onChange={e => setAForm({ ...aForm, description: e.target.value })}
                      placeholder="Instructions for employees before taking the exam..."
                      className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Status</label>
                      <select
                        value={aForm.status}
                        onChange={e => setAForm({ ...aForm, status: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white transition"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Duration (min)</label>
                      <input
                        type="number"
                        value={aForm.duration_minutes}
                        onChange={e => setAForm({ ...aForm, duration_minutes: parseInt(e.target.value) || 10 })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Passing Score (%)</label>
                      <input
                        type="number"
                        value={aForm.passing_percentage}
                        onChange={e => setAForm({ ...aForm, passing_percentage: parseInt(e.target.value) || 60 })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Max Attempts</label>
                      <input
                        type="number"
                        value={aForm.max_attempts}
                        onChange={e => setAForm({ ...aForm, max_attempts: parseInt(e.target.value) || 1 })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white font-semibold"
                        title="0 for Unlimited"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Result Visibility</label>
                    <select
                      value={aForm.result_visibility}
                      onChange={e => setAForm({ ...aForm, result_visibility: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white transition"
                    >
                      <option value="immediate">Immediate (Show Breakdown)</option>
                      <option value="score_only">Score Only (Hide Breakdown)</option>
                      <option value="hidden">Completely Hidden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Question Order</label>
                    <select
                      value={aForm.randomize_questions ? 'yes' : 'no'}
                      onChange={e => setAForm({ ...aForm, randomize_questions: e.target.value === 'yes' })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white transition"
                    >
                      <option value="no">No (Fixed Order)</option>
                      <option value="yes">Yes (Random Order)</option>
                    </select>
                  </div>
                </div>

                {/* Right Column (7 Cols): Question Bank Selector & Configured List */}
                <div className="lg:col-span-7 flex flex-col h-full space-y-6">
                  {/* Available Question Bank Selector */}
                  <div className="flex flex-col space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        1. Select Questions from Bank
                      </label>
                      <span className="text-xs text-slate-500 font-medium">Click any card below to add</span>
                    </div>
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 max-h-[280px] overflow-y-auto space-y-2.5">
                      {questions.map(q => {
                        const isAdded = aForm.question_ids.some(item => item.id === q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              if (!isAdded) {
                                setAForm({
                                  ...aForm,
                                  question_ids: [...aForm.question_ids, { id: q.id, title: q.title, marks: q.marks }]
                                });
                              }
                            }}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition ${
                              isAdded
                                ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-default'
                                : 'bg-white border-slate-200/90 shadow-sm hover:border-blue-400 hover:shadow cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                q.difficulty === 'Easy' ? 'bg-emerald-500' : q.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                              }`} />
                              <div className="font-semibold text-slate-800 text-sm truncate">{q.title}</div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                                {q.marks} pts
                              </span>
                              {isAdded ? (
                                <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                  ✓ Added
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-blue-600 hover:underline">
                                  + Add to Exam
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {questions.length === 0 && (
                        <div className="p-8 text-center text-sm text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                          Question bank is empty. Add questions in the MCQ Question Bank page first.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected List */}
                  <div className="flex flex-col space-y-2.5 flex-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        2. Configured Questions in Exam ({aForm.question_ids.length})
                      </label>
                      <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 shadow-sm">
                        Total Marks: {aForm.question_ids.reduce((acc, q) => acc + (parseInt(q.marks) || 0), 0)}
                      </span>
                    </div>
                    
                    <div className="border-2 border-blue-200/80 bg-blue-50/20 rounded-2xl p-4 min-h-[220px] max-h-[360px] overflow-y-auto space-y-3">
                      {aForm.question_ids.length === 0 ? (
                        <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-slate-400 text-sm">
                          <p className="font-semibold text-slate-500">No questions added yet</p>
                          <p className="text-xs mt-1">Click questions from the available bank above to configure your exam.</p>
                        </div>
                      ) : (
                        aForm.question_ids.map((qItem, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 gap-4 hover:border-blue-200 transition">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 text-sm">{qItem.title}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                <span className="text-xs text-slate-500 font-semibold">Marks:</span>
                                <input
                                  type="number"
                                  value={qItem.marks}
                                  onChange={e => {
                                    const next = [...aForm.question_ids];
                                    next[idx].marks = parseInt(e.target.value) || 1;
                                    setAForm({ ...aForm, question_ids: next });
                                  }}
                                  className="w-12 p-1 bg-white border border-slate-300 rounded text-center text-xs font-extrabold focus:outline-none focus:border-blue-500"
                                  title="Custom marks for this exam"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setAForm({ ...aForm, question_ids: aForm.question_ids.filter((_, i) => i !== idx) })}
                                className="text-slate-400 hover:text-rose-600 p-1.5 transition cursor-pointer"
                                title="Remove question from exam"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveAMutation.mutate(aForm)}
                disabled={saveAMutation.isPending || !aForm.title.trim() || aForm.question_ids.length === 0}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {saveAMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
                <span>{editingA ? 'Update Assessment' : 'Publish Assessment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentExamsPage;
