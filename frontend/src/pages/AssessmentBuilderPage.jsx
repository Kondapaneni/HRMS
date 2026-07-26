import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { 
  Award, ArrowLeft, Plus, Trash2, Clock, CheckCircle, RefreshCw, 
  Search, HelpCircle, ShieldAlert, Sliders, Check, BookOpen, 
  Settings, FileText, ChevronRight, AlertCircle, Filter, Sparkles 
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentBuilderPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // present if editing
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'questions'
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
      {/* 1. Zoho HRMS Style Horizontal Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/assessments/exams')}
              className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs mt-0.5"
              title="Back to Exams List"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
                  <Award size={22} />
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {id ? 'Edit Assessment Configuration' : 'Create New Assessment'}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  aForm.status === 'published' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {aForm.status === 'published' ? '● Published' : '○ Draft Mode'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Design comprehensive evaluation rules, set timing constraints, and assemble MCQ questions from your repository.
              </p>
            </div>
          </div>

          {/* KPI Mini-Summary & Actions right in header */}
          <div className="flex flex-wrap items-center gap-4 lg:self-center">
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
              <div className="text-right border-r border-slate-200 pr-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Questions</div>
                <div className="text-base font-black text-slate-800">{aForm.question_ids.length}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Score</div>
                <div className="text-base font-black text-blue-600">{totalMarks} <span className="text-xs font-normal text-slate-500">pts</span></div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/admin/assessments/exams')}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
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
                className="px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
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
                className="px-6 py-2.5 text-sm font-extrabold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30"
              >
                {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
                <span>{id ? 'Update & Publish' : 'Publish Assessment'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Sleek Zoho Style Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Settings size={18} />
            <span>1. General & Grading Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <BookOpen size={18} />
            <span>2. Question Paper Builder</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ml-1 ${
              activeTab === 'questions' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {aForm.question_ids.length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Tab Content Area */}
      {activeTab === 'rules' ? (
        /* TAB 1: GENERAL & GRADING RULES (Zoho 3-Card Grid Layout) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Card 1: Basic Information */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><FileText size={18} /></span>
                <span>Basic Information</span>
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
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-900 placeholder-slate-400 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Description / Instructions
                </label>
                <textarea
                  rows={5}
                  value={aForm.description}
                  onChange={e => setAForm({ ...aForm, description: e.target.value })}
                  placeholder="Provide detailed guidelines, exam structure, or instructions for employees taking this exam..."
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Publication Status
                </label>
                <select
                  value={aForm.status}
                  onChange={e => setAForm({ ...aForm, status: e.target.value })}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-bold text-slate-800 transition cursor-pointer shadow-2xs"
                >
                  <option value="published">Published (Visible to Assigned Employees)</option>
                  <option value="draft">Draft (Hidden in Employee Portal)</option>
                </select>
              </div>
            </div>

            {/* Card 2: Timing & Grading Rules */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={18} /></span>
                <span>Time & Grading Parameters</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Exam Duration (Minutes) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={aForm.duration_minutes}
                    onChange={e => setAForm({ ...aForm, duration_minutes: parseInt(e.target.value) || 10 })}
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-extrabold text-slate-900 transition shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">MINS</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Timer starts automatically when employee opens the paper</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Passing Criteria (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={aForm.passing_percentage}
                    onChange={e => setAForm({ ...aForm, passing_percentage: parseInt(e.target.value) || 60 })}
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-extrabold text-slate-900 transition shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Minimum score required to earn a passing badge</span>
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
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-extrabold text-slate-900 transition shadow-2xs"
                />
                <span className="text-[11px] font-semibold text-blue-600 mt-1 block">Enter 0 to allow Unlimited attempts</span>
              </div>
            </div>

            {/* Card 3: Security & Display Settings */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><ShieldAlert size={18} /></span>
                <span>Security & Display Controls</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Result & Answer Key Visibility
                </label>
                <select
                  value={aForm.result_visibility}
                  onChange={e => setAForm({ ...aForm, result_visibility: e.target.value })}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-bold text-slate-800 transition cursor-pointer shadow-2xs"
                >
                  <option value="immediate">Immediate (Show Score & Correct Answer Key)</option>
                  <option value="score_only">Score Only (Hide Correct Answer Key)</option>
                  <option value="hidden">Completely Hidden (No Results Shown)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">Controls what employees see immediately after submission</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Randomize Question Sequence
                </label>
                <select
                  value={aForm.randomize_questions ? 'yes' : 'no'}
                  onChange={e => setAForm({ ...aForm, randomize_questions: e.target.value === 'yes' })}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-bold text-slate-800 transition cursor-pointer shadow-2xs"
                >
                  <option value="no">No (Fixed Sequence as Arranged)</option>
                  <option value="yes">Yes (Shuffle Order for Every Candidate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Randomize MCQ Option Order
                </label>
                <select
                  value={aForm.randomize_options ? 'yes' : 'no'}
                  onChange={e => setAForm({ ...aForm, randomize_options: e.target.value === 'yes' })}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-bold text-slate-800 transition cursor-pointer shadow-2xs"
                >
                  <option value="no">No (Keep Options A, B, C, D Fixed)</option>
                  <option value="yes">Yes (Shuffle Option Choices for Each Question)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Stepper Navigation Footer */}
          <div className="bg-blue-50/50 rounded-2xl border border-blue-200/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <div className="font-bold text-slate-900 text-base">Ready to assemble questions?</div>
                <div className="text-xs text-slate-600">Proceed to Tab 2 to select MCQs from your repository and assign custom marks.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Next: Question Paper Builder</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* TAB 2: QUESTION PAPER BUILDER (Spacious 2-Card Split Layout) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left/Top Area (6 Cols): Available Question Bank Repository */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <HelpCircle size={18} className="text-blue-600" />
                  <span>Available Question Bank Repository</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Filter and click any card to append to your exam paper</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white w-40 font-medium"
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
            </div>

            {/* Questions List */}
            <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/60 max-h-[550px] overflow-y-auto space-y-2.5">
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
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition ${
                      isAdded
                        ? 'bg-blue-50/70 border-blue-200/80 opacity-75 cursor-default shadow-2xs'
                        : 'bg-white border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        q.difficulty === 'Easy' ? 'bg-emerald-500' : q.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <div>
                        <div className="font-bold text-slate-800 text-sm truncate">{q.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold text-slate-500">Diff: {q.difficulty || 'Medium'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] font-semibold text-slate-500">Category: {q.category || 'General'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-black">
                        {q.marks || 1} pts
                      </span>
                      {isAdded ? (
                        <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                          <Check size={14} /> Added
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-blue-600 bg-white px-3.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition shadow-2xs">
                          + Add
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredQuestions.length === 0 && (
                <div className="p-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  {questions.length === 0 ? 'Question bank is currently empty. Create questions in the MCQ Question Bank page first.' : 'No questions match your current search and difficulty filters.'}
                </div>
              )}
            </div>
          </div>

          {/* Right/Bottom Area (6 Cols): Configured Exam Paper List */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Award size={18} className="text-blue-600" />
                  <span>Configured Exam Paper ({aForm.question_ids.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Review question sequence and customize individual points</p>
              </div>
              
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Total Score:</span>
                <span className="text-lg font-black text-blue-600">{totalMarks} <span className="text-xs font-normal">pts</span></span>
              </div>
            </div>

            <div className="border border-blue-100 bg-blue-50/20 rounded-2xl p-3 min-h-[250px] max-h-[550px] overflow-y-auto space-y-3">
              {aForm.question_ids.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8 text-slate-400 text-sm">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                    <BookOpen size={28} />
                  </div>
                  <p className="font-bold text-slate-700 text-base">Exam Paper is Empty</p>
                  <p className="text-xs mt-1 text-slate-500 max-w-xs">Click questions from the repository on the left to add them to this exam paper.</p>
                </div>
              ) : (
                aForm.question_ids.map((qItem, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-2xs border border-slate-200/90 gap-4 hover:border-blue-300 transition">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 text-sm truncate">{qItem.title}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 font-bold">Points:</span>
                        <input
                          type="number"
                          min="1"
                          value={qItem.marks}
                          onChange={e => {
                            const next = [...aForm.question_ids];
                            next[idx].marks = parseInt(e.target.value) || 1;
                            setAForm({ ...aForm, question_ids: next });
                          }}
                          className="w-14 p-1.5 bg-white border border-slate-300 rounded-lg text-center text-xs font-black focus:outline-none focus:border-blue-500 shadow-2xs"
                          title="Custom points for this exam question"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setAForm({ ...aForm, question_ids: aForm.question_ids.filter((_, i) => i !== idx) })}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Remove question from exam"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to General Rules
              </button>
              {aForm.question_ids.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all configured questions from this paper?')) {
                      setAForm({ ...aForm, question_ids: [] });
                    }
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                >
                  Clear All Questions
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AssessmentBuilderPage;
