import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { 
  Award, ArrowLeft, Trash2, Clock, RefreshCw, 
  Search, HelpCircle, ShieldAlert, Sliders, Check, BookOpen, 
  FileText, CheckCircle2, AlertCircle, Settings, ChevronRight
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentBuilderPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // present if editing
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'studio'
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
      {/* 1. Flat Zoho HRMS Page Header (Clean, Not inside a box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {id ? 'Edit Assessment Configuration' : 'Create New Assessment'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure exam rules in the Basic Information tab and select questions in the MCQ Question Paper Studio.
          </p>
        </div>

        {/* Action Buttons right in header row */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/admin/assessments/exams')}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setAForm({ ...aForm, status: 'draft' });
              saveMutation.mutate({ ...aForm, status: 'draft' });
            }}
            disabled={saveMutation.isPending || !aForm.title.trim() || aForm.question_ids.length === 0}
            className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => {
              setAForm({ ...aForm, status: 'published' });
              saveMutation.mutate({ ...aForm, status: 'published' });
            }}
            disabled={saveMutation.isPending || !aForm.title.trim() || aForm.question_ids.length === 0}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-blue-500/20"
          >
            {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
            <span>{id ? 'Update & Publish' : 'Publish Assessment'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Tabbed Workspace Card (AdminEmployeeView style) */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto hide-scrollbar space-x-1 border-b border-slate-200 px-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Basic Information & Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'studio'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>2. MCQ Question Paper Studio</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'info' ? (
        /* TAB 1: BASIC INFORMATION & RULES (Full Width 3-Card Grid) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Card 1: Basic Details */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></span>
                <span>Basic Information</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Assessment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={aForm.title}
                  onChange={e => setAForm({ ...aForm, title: e.target.value })}
                  placeholder="e.g. Annual Information Security Exam"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-900 placeholder-slate-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={4}
                  value={aForm.description}
                  onChange={e => setAForm({ ...aForm, description: e.target.value })}
                  placeholder="Instructions for candidates taking this test..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 placeholder-slate-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Publication Status
                </label>
                <select
                  value={aForm.status}
                  onChange={e => setAForm({ ...aForm, status: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
                >
                  <option value="published">Published (Visible to Assigned Employees)</option>
                  <option value="draft">Draft (Hidden in Portal)</option>
                </select>
              </div>
            </div>

            {/* Card 2: Timing & Grading Rules */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={16} /></span>
                <span>Timing & Grading Parameters</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={aForm.duration_minutes}
                    onChange={e => setAForm({ ...aForm, duration_minutes: parseInt(e.target.value) || 10 })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold text-slate-900 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Auto-timer when test opens</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Passing (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={aForm.passing_percentage}
                    onChange={e => setAForm({ ...aForm, passing_percentage: parseInt(e.target.value) || 60 })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold text-slate-900 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Min score for pass badge</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Max Attempts Allowed
                </label>
                <input
                  type="number"
                  min="0"
                  value={aForm.max_attempts}
                  onChange={e => setAForm({ ...aForm, max_attempts: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold text-slate-900 transition"
                />
                <span className="text-[11px] font-semibold text-blue-600 mt-1 block">Enter 0 for Unlimited attempts</span>
              </div>
            </div>

            {/* Card 3: Display & Security */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-bold text-sm">
                <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><ShieldAlert size={16} /></span>
                <span>Display & Security Controls</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Result & Answer Key Visibility
                </label>
                <select
                  value={aForm.result_visibility}
                  onChange={e => setAForm({ ...aForm, result_visibility: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
                >
                  <option value="immediate">Immediate (Show Score & Correct Breakdown)</option>
                  <option value="score_only">Score Only (Hide Correct Answer Key)</option>
                  <option value="hidden">Completely Hidden (No Results Displayed)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Shuffle Questions
                  </label>
                  <select
                    value={aForm.randomize_questions ? 'yes' : 'no'}
                    onChange={e => setAForm({ ...aForm, randomize_questions: e.target.value === 'yes' })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
                  >
                    <option value="no">No (Fixed Sequence)</option>
                    <option value="yes">Yes (Shuffle Order)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Shuffle Options
                  </label>
                  <select
                    value={aForm.randomize_options ? 'yes' : 'no'}
                    onChange={e => setAForm({ ...aForm, randomize_options: e.target.value === 'yes' })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
                  >
                    <option value="no">No (Fixed A,B,C,D)</option>
                    <option value="yes">Yes (Shuffle Choices)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Stepper Navigation Footer */}
          <div className="bg-blue-50/60 rounded-xl border border-blue-200/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Rules Configured?</div>
                <div className="text-xs text-slate-600">Switch to the MCQ Question Paper Studio tab to select questions from your repository.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>Next: MCQ Question Paper Studio</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* TAB 2: MCQ QUESTION PAPER STUDIO (Full Width 50/50 Dual-Pane Studio) */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          
          {/* Studio Header with KPI Summary */}
          <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" />
                <span>MCQ Question Paper Studio</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Filter questions on the left and click '+ Add' to append them to your exam paper on the right.</p>
            </div>

            {/* Sleek KPI Pill */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3">
                <span className="text-xs font-bold text-slate-500">Selected MCQs:</span>
                <span className="text-sm font-black text-slate-900">{aForm.question_ids.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Total Marks:</span>
                <span className="text-sm font-black text-blue-600">{totalMarks} <span className="text-xs font-normal">pts</span></span>
              </div>
            </div>
          </div>

          {/* Dual-Pane Studio Body (50/50 Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-[580px]">
            
            {/* LEFT PANE: Available Question Bank Repository */}
            <div className="flex flex-col h-full bg-slate-50/30">
              <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search question repository..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-medium"
                  />
                </div>
                <select
                  value={difficultyFilter}
                  onChange={e => setDifficultyFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-bold text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Diff</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="p-3.5 space-y-2 max-h-[540px] overflow-y-auto flex-1">
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
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                        isAdded
                          ? 'bg-blue-50/70 border-blue-200/80 opacity-70 cursor-default shadow-2xs'
                          : 'bg-white border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          q.difficulty === 'Easy' ? 'bg-emerald-500' : q.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate">{q.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Diff: {q.difficulty || 'Medium'} • {q.marks || 1} pts</div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isAdded ? (
                          <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1">
                            <Check size={12} /> Added
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-blue-600 bg-white px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-600 hover:text-white transition shadow-2xs">
                            + Add
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredQuestions.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 my-4">
                    {questions.length === 0 ? 'Question bank is empty. Create MCQs first.' : 'No questions match filter.'}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANE: Configured Exam Paper List */}
            <div className="flex flex-col h-full bg-white">
              <div className="p-3.5 bg-blue-50/40 border-b border-slate-200 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-blue-600" />
                  <span>Configured Exam Paper ({aForm.question_ids.length})</span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                  >
                    <ArrowLeft size={12} /> Back to Rules
                  </button>
                  {aForm.question_ids.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Remove all selected questions from this paper?')) {
                          setAForm({ ...aForm, question_ids: [] });
                        }
                      }}
                      className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 space-y-2.5 max-h-[540px] overflow-y-auto flex-1 bg-slate-50/20">
                {aForm.question_ids.length === 0 ? (
                  <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5 shadow-2xs">
                      <BookOpen size={22} />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Exam Paper is Empty</p>
                    <p className="text-xs mt-1 text-slate-400 max-w-[220px]">Click questions from the left repository to build your exam sequence.</p>
                  </div>
                ) : (
                  aForm.question_ids.map((qItem, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3.5 rounded-xl shadow-2xs border border-slate-200/90 gap-3 hover:border-blue-300 transition">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-xs truncate">{qItem.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold">Pts:</span>
                          <input
                            type="number"
                            min="1"
                            value={qItem.marks}
                            onChange={e => {
                              const next = [...aForm.question_ids];
                              next[idx].marks = parseInt(e.target.value) || 1;
                              setAForm({ ...aForm, question_ids: next });
                            }}
                            className="w-12 p-0.5 bg-white border border-slate-300 rounded text-center text-xs font-black focus:outline-none focus:border-blue-500"
                            title="Custom points for this exam question"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAForm({ ...aForm, question_ids: aForm.question_ids.filter((_, i) => i !== idx) })}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Remove question"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentBuilderPage;
