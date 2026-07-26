import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Award, ArrowLeft, Plus, Trash2, Clock, CheckCircle, RefreshCw, Search, HelpCircle, ShieldAlert, Sliders, Check } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentBuilderPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // present if editing
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

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

  // Fetch assessments to populate form when editing
  const { data: assessments = [], isLoading: loadingAssessments } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  // Fetch question bank
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['adminQuestions'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments/questions');
      return res.data?.data || res.data || [];
    }
  });

  useEffect(() => {
    if (id && assessments.length > 0) {
      const existing = assessments.find(a => String(a.id) === String(id));
      if (existing) {
        setAForm({
          title: existing.title || '',
          description: existing.description || '',
          duration_minutes: parseInt(existing.duration_minutes) || 30,
          passing_percentage: parseInt(existing.passing_percentage) || 70,
          max_attempts: parseInt(existing.max_attempts) || 1,
          randomize_questions: existing.randomize_questions ? true : false,
          randomize_options: existing.randomize_options ? true : false,
          result_visibility: existing.result_visibility || 'immediate',
          status: existing.status || 'published',
          question_ids: Array.isArray(existing.questions) ? existing.questions.map(q => ({
            id: q.question_id || q.id,
            title: q.title || 'Question',
            marks: parseInt(q.marks) || 1
          })) : []
        });
      }
    }
  }, [id, assessments]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (id) {
        return await api.put(`/admin/assessments/${id}`, data);
      } else {
        return await api.post('/admin/assessments', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success(id ? 'Assessment updated successfully!' : 'Assessment created successfully!');
      navigate('/admin/assessments/exams');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save assessment');
    }
  });

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDiff = difficultyFilter === 'ALL' || q.difficulty === difficultyFilter;
      return matchesSearch && matchesDiff;
    });
  }, [questions, searchTerm, difficultyFilter]);

  const totalMarks = useMemo(() => {
    return aForm.question_ids.reduce((acc, q) => acc + (parseInt(q.marks) || 0), 0);
  }, [aForm.question_ids]);

  if (loadingAssessments || loadingQuestions) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/assessments/exams')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to Exams List"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Award className="text-blue-600" size={24} />
              <h1 className="text-2xl font-bold text-slate-900">
                {id ? 'Edit Assessment Configuration' : 'Create New Assessment'}
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure exam rules, timing constraints, grading parameters, and select MCQ questions from the bank.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/assessments/exams')}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate(aForm)}
            disabled={saveMutation.isPending || !aForm.title.trim() || aForm.question_ids.length === 0}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
            <span>{id ? 'Update Assessment' : 'Publish Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 Cols): Rules & Settings */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-bold text-base">
            <Sliders size={18} className="text-blue-600" />
            <span>General Rules & Parameters</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Assessment Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={aForm.title}
              onChange={e => setAForm({ ...aForm, title: e.target.value })}
              placeholder="e.g. Annual Information Security Exam"
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium text-slate-800 placeholder-slate-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description / Instructions
            </label>
            <textarea
              rows={3}
              value={aForm.description}
              onChange={e => setAForm({ ...aForm, description: e.target.value })}
              placeholder="Provide clear instructions for employees before taking this exam..."
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 placeholder-slate-400 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Publication Status
              </label>
              <select
                value={aForm.status}
                onChange={e => setAForm({ ...aForm, status: e.target.value })}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
              >
                <option value="published">Published (Active)</option>
                <option value="draft">Draft (Hidden)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={aForm.duration_minutes}
                onChange={e => setAForm({ ...aForm, duration_minutes: parseInt(e.target.value) || 10 })}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold text-slate-800 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Passing Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={aForm.passing_percentage}
                onChange={e => setAForm({ ...aForm, passing_percentage: parseInt(e.target.value) || 60 })}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold text-slate-800 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Max Attempts Allowed
              </label>
              <input
                type="number"
                min="0"
                value={aForm.max_attempts}
                onChange={e => setAForm({ ...aForm, max_attempts: parseInt(e.target.value) || 1 })}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold text-slate-800 transition"
                title="Set to 0 for Unlimited attempts"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Enter 0 for unlimited attempts</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Result Visibility & Feedback
            </label>
            <select
              value={aForm.result_visibility}
              onChange={e => setAForm({ ...aForm, result_visibility: e.target.value })}
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
            >
              <option value="immediate">Immediate (Show Score & Answer Breakdown)</option>
              <option value="score_only">Score Only (Hide Correct Answer Key)</option>
              <option value="hidden">Completely Hidden (No Results Displayed)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Randomize Question Order
              </label>
              <select
                value={aForm.randomize_questions ? 'yes' : 'no'}
                onChange={e => setAForm({ ...aForm, randomize_questions: e.target.value === 'yes' })}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
              >
                <option value="no">No (Fixed Sequence)</option>
                <option value="yes">Yes (Shuffle Questions)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Randomize MCQ Options
              </label>
              <select
                value={aForm.randomize_options ? 'yes' : 'no'}
                onChange={e => setAForm({ ...aForm, randomize_options: e.target.value === 'yes' })}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
              >
                <option value="no">No (Fixed Options)</option>
                <option value="yes">Yes (Shuffle Options)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Question Bank Selector & Configured List */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Question Bank Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <HelpCircle size={18} className="text-blue-600" />
                  <span>1. Select MCQ Questions from Bank</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Click any question card below to append it to your exam</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search question..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white w-40"
                  />
                </div>
                <select
                  value={difficultyFilter}
                  onChange={e => setDifficultyFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Diff</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Questions List */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 max-h-[280px] overflow-y-auto space-y-2">
              {filteredQuestions.map(q => {
                const isAdded = aForm.question_ids.some(item => item.id === q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      if (!isAdded) {
                        setAForm({
                          ...aForm,
                          question_ids: [...aForm.question_ids, { id: q.id, title: q.title, marks: q.marks || 1 }]
                        });
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition ${
                      isAdded
                        ? 'bg-blue-50/60 border-blue-200/80 opacity-75 cursor-default'
                        : 'bg-white border-slate-200 shadow-sm hover:border-blue-400 hover:shadow cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        q.difficulty === 'Easy' ? 'bg-emerald-500' : q.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <div>
                        <div className="font-semibold text-slate-800 text-sm truncate">{q.title}</div>
                        <div className="text-[11px] text-slate-400 font-medium">Difficulty: {q.difficulty || 'Medium'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                        {q.marks || 1} pts
                      </span>
                      {isAdded ? (
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-100/60 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                          <Check size={13} /> Added
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-blue-600 bg-white px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition shadow-sm">
                          + Add
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredQuestions.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  {questions.length === 0 ? 'Question bank is empty. Create questions in the MCQ Question Bank page first.' : 'No questions match your search filters.'}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Configured Questions in this Assessment */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Award size={18} className="text-blue-600" />
                  <span>2. Configured Questions in Exam ({aForm.question_ids.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Customize individual points and review the selected questions sequence</p>
              </div>
              
              <div className="flex items-center gap-2 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-sm">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total Marks:</span>
                <span className="text-base font-black text-blue-600">{totalMarks}</span>
              </div>
            </div>

            <div className="border border-slate-200 bg-slate-50/40 rounded-xl p-3 min-h-[200px] max-h-[400px] overflow-y-auto space-y-2.5">
              {aForm.question_ids.length === 0 ? (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-slate-400 text-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <Award size={24} />
                  </div>
                  <p className="font-semibold text-slate-600">No questions added yet</p>
                  <p className="text-xs mt-1 text-slate-400">Click questions from the available bank above to assemble your exam.</p>
                </div>
              ) : (
                aForm.question_ids.map((qItem, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 gap-4 hover:border-blue-300 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 text-sm truncate">{qItem.title}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500 font-semibold">Marks:</span>
                        <input
                          type="number"
                          min="1"
                          value={qItem.marks}
                          onChange={e => {
                            const next = [...aForm.question_ids];
                            next[idx].marks = parseInt(e.target.value) || 1;
                            setAForm({ ...aForm, question_ids: next });
                          }}
                          className="w-14 p-1 bg-white border border-slate-300 rounded text-center text-xs font-extrabold focus:outline-none focus:border-blue-500"
                          title="Custom points for this exam question"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setAForm({ ...aForm, question_ids: aForm.question_ids.filter((_, i) => i !== idx) })}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
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

      {/* Bottom Footer Action Bar */}
      <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/assessments/exams')}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => saveMutation.mutate(aForm)}
          disabled={saveMutation.isPending || !aForm.title.trim() || aForm.question_ids.length === 0}
          className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
          <span>{id ? 'Update Assessment Configuration' : 'Publish Assessment'}</span>
        </button>
      </div>
    </div>
  );
};

export default AssessmentBuilderPage;
