import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { 
  Award, ArrowLeft, Plus, Trash2, Clock, CheckCircle, RefreshCw, Search, 
  HelpCircle, ShieldAlert, Sliders, Check, BookOpen, Eye, Settings, 
  Layers, ListChecks, Sparkles, AlertCircle, Filter, ArrowRight 
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentBuilderPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // present if editing
  const queryClient = useQueryClient();

  // Navigation Tab State: 'general', 'questions', 'review'
  const [activeTab, setActiveTab] = useState('general');

  // Filter states for Question Bank
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

  const addQuestionToExam = (q) => {
    if (!aForm.question_ids.some(item => item.id === q.id)) {
      setAForm(prev => ({
        ...prev,
        question_ids: [...prev.question_ids, { id: q.id, title: q.title, marks: parseInt(q.marks) || 1 }]
      }));
      toast.success('Added to exam');
    }
  };

  const removeQuestionFromExam = (qId) => {
    setAForm(prev => ({
      ...prev,
      question_ids: prev.question_ids.filter(item => item.id !== qId)
    }));
  };

  const updateQuestionMarks = (qId, newMarks) => {
    setAForm(prev => ({
      ...prev,
      question_ids: prev.question_ids.map(item => item.id === qId ? { ...item, marks: newMarks } : item)
    }));
  };

  const selectAllFiltered = () => {
    const toAdd = filteredQuestions.filter(fq => !aForm.question_ids.some(item => item.id === fq.id));
    if (toAdd.length === 0) {
      toast('All filtered questions are already added.', { icon: 'ℹ️' });
      return;
    }
    const mapped = toAdd.map(q => ({ id: q.id, title: q.title, marks: parseInt(q.marks) || 1 }));
    setAForm(prev => ({
      ...prev,
      question_ids: [...prev.question_ids, ...mapped]
    }));
    toast.success(`Added ${toAdd.length} questions to exam!`);
  };

  if (loadingAssessments || loadingQuestions) return <PageLoader />;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Progress Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Award size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                {id ? 'Edit Assessment Studio' : 'Create Assessment Studio'}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                aForm.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {aForm.status === 'published' ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow the guided steps below to configure your examination rules, assemble MCQ questions, and publish.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick KPI Badges */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <span className="text-slate-400">Questions:</span>
            <span className="text-blue-600 font-bold">{aForm.question_ids.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <span className="text-slate-400">Total Marks:</span>
            <span className="text-emerald-600 font-bold">{totalMarks} pts</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <span className="text-slate-400">Duration:</span>
            <span className="text-amber-600 font-bold">{aForm.duration_minutes}m</span>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

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
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
            <span>{id ? 'Update Assessment' : 'Publish Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Workflow Stepper / Tab Switcher */}
      <div className="px-6">
        <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto border border-slate-200/60 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Settings size={18} className={activeTab === 'general' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Step 1: General Rules & Timing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Layers size={18} className={activeTab === 'questions' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Step 2: Question Bank & Marks</span>
            {aForm.question_ids.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-extrabold">
                {aForm.question_ids.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'review'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Eye size={18} className={activeTab === 'review' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Step 3: Review & Summary</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: GENERAL RULES & TIMING */}
      {activeTab === 'general' && (
        <div className="px-6 max-w-6xl mx-auto space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Basic Information */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-800 font-bold text-base">
                <BookOpen size={20} className="text-blue-600" />
                <span>1. Basic Exam Information</span>
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
                  Instructions for Employees
                </label>
                <textarea
                  rows={4}
                  value={aForm.description}
                  onChange={e => setAForm({ ...aForm, description: e.target.value })}
                  placeholder="Provide clear instructions, rules, or guidance before the employee starts taking the examination..."
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-800 placeholder-slate-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Publication Status
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setAForm({ ...aForm, status: 'published' })}
                    className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      aForm.status === 'published'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle size={16} className={aForm.status === 'published' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>Published (Active)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAForm({ ...aForm, status: 'draft' })}
                    className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      aForm.status === 'draft'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock size={16} className={aForm.status === 'draft' ? 'text-amber-600' : 'text-slate-400'} />
                    <span>Draft (Hidden)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Timing & Scoring Rules */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-800 font-bold text-base">
                <Clock size={20} className="text-amber-500" />
                <span>2. Timings & Passing Criteria</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Exam Duration (Minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={aForm.duration_minutes}
                    onChange={e => setAForm({ ...aForm, duration_minutes: parseInt(e.target.value) || 10 })}
                    className="w-28 p-3 border border-slate-200 rounded-xl text-center font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[15, 30, 45, 60, 90, 120].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAForm({ ...aForm, duration_minutes: m })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          aForm.duration_minutes === m
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Passing Percentage (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={aForm.passing_percentage}
                    onChange={e => setAForm({ ...aForm, passing_percentage: parseInt(e.target.value) || 50 })}
                    className="w-28 p-3 border border-slate-200 rounded-xl text-center font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={aForm.passing_percentage}
                    onChange={e => setAForm({ ...aForm, passing_percentage: parseInt(e.target.value) || 50 })}
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <span className="font-extrabold text-blue-600 text-sm w-12 text-right">{aForm.passing_percentage}%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Employees scoring below this threshold will be marked as Failed.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Maximum Attempts Allowed
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={aForm.max_attempts}
                    onChange={e => setAForm({ ...aForm, max_attempts: parseInt(e.target.value) || 0 })}
                    className="w-28 p-3 border border-slate-200 rounded-xl text-center font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    title="0 for Unlimited attempts"
                  />
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 5].map(att => (
                      <button
                        key={att}
                        type="button"
                        onClick={() => setAForm({ ...aForm, max_attempts: att })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          aForm.max_attempts === att
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {att === 0 ? 'Unlimited' : `${att} Try`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Security & Display Policies (Full Width across bottom) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 md:col-span-2">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-800 font-bold text-base">
                <ShieldAlert size={20} className="text-purple-600" />
                <span>3. Result Visibility & Security Policies</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Result Visibility Policy
                  </label>
                  <select
                    value={aForm.result_visibility}
                    onChange={e => setAForm({ ...aForm, result_visibility: e.target.value })}
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
                  >
                    <option value="immediate">🟢 Immediate (Show Full Answer Breakdown)</option>
                    <option value="score_only">🟡 Score Only (Show Pass/Fail, Hide Answers)</option>
                    <option value="hidden">🔴 Completely Hidden (Admin Review Only)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5">Controls what the employee sees on their screen upon finishing.</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-800">Randomize Questions</div>
                    <div className="text-xs text-slate-500 mt-0.5">Shuffle question order for each employee attempt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={aForm.randomize_questions}
                    onChange={e => setAForm({ ...aForm, randomize_questions: e.target.checked })}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-800">Randomize Choice Options</div>
                    <div className="text-xs text-slate-500 mt-0.5">Shuffle option order (A, B, C, D) to prevent cheating</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={aForm.randomize_options}
                    onChange={e => setAForm({ ...aForm, randomize_options: e.target.checked })}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <span>Next: Select Question Bank</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: QUESTION BANK & SELECTION (FULL WIDTH SPLIT WORKSPACE) */}
      {activeTab === 'questions' && (
        <div className="px-6 animate-fadeIn space-y-6">
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                <ListChecks size={22} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Assemble Exam Question Bank</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Browse your available MCQ repository on the left and click **"+ Add"** to include them in this assessment. You can adjust custom marks per question on the right panel.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="px-4 py-2 bg-white border border-blue-300 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add All Filtered Questions ({filteredQuestions.length})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT PANEL (6 COLS): AVAILABLE QUESTION BANK */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span>Available Question Repository</span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">
                      {filteredQuestions.length} available
                    </span>
                  </h4>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search question title or text..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium text-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0">
                    {['ALL', 'Easy', 'Medium', 'Hard'].map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficultyFilter(diff)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          difficultyFilter === diff
                            ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable Question Bank List */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50/40 divide-y divide-slate-100">
                {filteredQuestions.map(q => {
                  const isAdded = aForm.question_ids.some(item => item.id === q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => !isAdded && addQuestionToExam(q)}
                      className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                        isAdded
                          ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-default'
                          : 'bg-white border-slate-200/90 shadow-sm hover:border-blue-500 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase ${
                            q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                            q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {q.difficulty || 'Medium'}
                          </span>
                          <span className="text-xs font-bold text-slate-400">Default: {q.marks || 1} pts</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">
                          {q.title}
                        </p>
                      </div>

                      <div className="flex-shrink-0 self-center">
                        {isAdded ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200">
                            <Check size={14} />
                            <span>Added</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addQuestionToExam(q);
                            }}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold text-xs rounded-xl border border-blue-200 transition shadow-2xs cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredQuestions.length === 0 && (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <Search size={36} className="text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No questions found matching your filter</p>
                    <p className="text-xs mt-1">Try resetting the difficulty filter or searching a different keyword.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL (6 COLS): CONFIGURED EXAM QUESTIONS */}
            <div className="lg:col-span-6 bg-white rounded-2xl border-2 border-blue-200 shadow-md flex flex-col h-[650px] overflow-hidden">
              <div className="p-5 border-b border-blue-100 bg-blue-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>Configured Exam Questions</span>
                    <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-xs font-extrabold shadow-2xs">
                      {aForm.question_ids.length}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Customize marks for this specific exam or remove questions.</p>
                </div>

                <div className="bg-white border border-blue-200 px-3.5 py-2 rounded-xl shadow-2xs text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Exam Marks</span>
                  <span className="font-black text-blue-600 text-base">{totalMarks} pts</span>
                </div>
              </div>

              {/* Scrollable Selected Questions List */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50/20">
                {aForm.question_ids.length === 0 ? (
                  <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <Layers size={44} className="text-blue-200 mb-3 animate-pulse" />
                    <p className="font-bold text-slate-700 text-base">No questions added yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Click the **"+ Add"** button on any question from the repository on the left to include it in this assessment.
                    </p>
                  </div>
                ) : (
                  aForm.question_ids.map((qItem, idx) => (
                    <div
                      key={qItem.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-300 transition flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{qItem.title}</p>
                          <span className="text-[11px] text-slate-400 font-medium">Question ID: #{qItem.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-xs text-slate-500 font-bold">Marks:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={qItem.marks}
                            onChange={e => updateQuestionMarks(qItem.id, parseInt(e.target.value) || 1)}
                            className="w-14 p-1 bg-white border border-slate-300 rounded-lg text-center text-xs font-black text-blue-600 focus:outline-none focus:border-blue-600 shadow-inner"
                            title="Assign custom points for this exam"
                          />
                          <span className="text-xs font-bold text-slate-500">pts</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeQuestionFromExam(qItem.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Remove from this exam"
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

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className="px-6 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              <span>Back: General Rules</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              disabled={aForm.question_ids.length === 0}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <span>Next: Review & Summary</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: REVIEW & SUMMARY */}
      {activeTab === 'review' && (
        <div className="px-6 max-w-5xl mx-auto space-y-8 animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                Pre-Publication Review
              </span>
              <h2 className="text-2xl font-black">{aForm.title || 'Untitled Assessment'}</h2>
              <p className="text-blue-100 text-sm max-w-2xl">
                {aForm.description || 'No special instructions provided for candidates.'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex items-center gap-6 flex-shrink-0">
              <div className="text-center">
                <span className="block text-2xl font-black">{aForm.question_ids.length}</span>
                <span className="text-xs text-blue-200 font-semibold uppercase">Questions</span>
              </div>
              <div className="h-8 w-[1px] bg-white/20" />
              <div className="text-center">
                <span className="block text-2xl font-black text-emerald-300">{totalMarks}</span>
                <span className="text-xs text-blue-200 font-semibold uppercase">Total Marks</span>
              </div>
              <div className="h-8 w-[1px] bg-white/20" />
              <div className="text-center">
                <span className="block text-2xl font-black text-amber-300">{aForm.duration_minutes}m</span>
                <span className="text-xs text-blue-200 font-semibold uppercase">Duration</span>
              </div>
            </div>
          </div>

          {/* Rules & Policy Summary Table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Passing Threshold</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{aForm.passing_percentage}%</span>
                <span className="text-xs text-slate-500 font-bold">
                  (Min {Math.ceil((totalMarks * aForm.passing_percentage) / 100)} pts required)
                </span>
              </div>
              <p className="text-xs text-slate-500">Auto-calculated score required to earn a certificate of completion.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Retake Policy</span>
              <div className="text-2xl font-black text-slate-900">
                {aForm.max_attempts === 0 ? '♾️ Unlimited Retakes' : `${aForm.max_attempts} Attempt${aForm.max_attempts > 1 ? 's' : ''} Max`}
              </div>
              <p className="text-xs text-slate-500">Enforces hard locking after attempt quota is exhausted.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security & Display</span>
              <div className="text-sm font-bold text-slate-800 flex flex-col gap-1">
                <span>👁️ Result: {aForm.result_visibility.replace('_', ' ').toUpperCase()}</span>
                <span>🔀 Shuffle Questions: {aForm.randomize_questions ? 'YES' : 'NO'}</span>
                <span>🔀 Shuffle Choices: {aForm.randomize_options ? 'YES' : 'NO'}</span>
              </div>
            </div>
          </div>

          {/* Configured Questions Review List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Configured Exam Paper ({aForm.question_ids.length} MCQs)</h3>
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                + Edit Questions
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {aForm.question_ids.map((qItem, idx) => (
                <div key={qItem.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 text-sm">{qItem.title}</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black border border-emerald-200">
                    {qItem.marks} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className="px-6 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              <span>Back: Modify Questions</span>
            </button>

            <button
              type="button"
              onClick={() => saveMutation.mutate(aForm)}
              disabled={saveMutation.isPending || !aForm.title.trim() || aForm.question_ids.length === 0}
              className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-3"
            >
              {saveMutation.isPending ? (
                <RefreshCw size={22} className="animate-spin" />
              ) : (
                <Sparkles size={22} className="animate-pulse" />
              )}
              <span>{id ? 'Update & Deploy Assessment Now' : '🚀 Publish & Deploy Assessment Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentBuilderPage;
