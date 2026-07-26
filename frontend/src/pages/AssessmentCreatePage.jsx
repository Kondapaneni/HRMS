import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  HelpCircle, ArrowLeft, ArrowRight, CheckCircle2, Shield, Clock, Award,
  Building2, CheckSquare, Disc, Filter, Layers, Check, Sparkles, RefreshCw,
  AlertCircle, Eye, Lock, FileText, Users
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Sales',
  'Marketing',
  'Finance',
  'Customer Support',
  'Operations',
  'IT',
  'General / All'
];

const AssessmentCreatePage = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Step state: 1 = Select Questions, 2 = Configure Info & Rules
  const [step, setStep] = useState(1);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');

  // Selected questions map/array (storing IDs of checked questions)
  const [selectedIds, setSelectedIds] = useState([]);

  // Form state for Step 2: Basic Info, Timing & Grading, Security Controls
  const [form, setForm] = useState({
    title: '',
    department: 'IT',
    target_roles: ['All Staff'],
    description: '',
    instructions: '1. Ensure you have a stable internet connection before starting.\n2. Once started, the timer cannot be paused.\n3. Do not switch browser tabs or leave full-screen mode.',
    duration_minutes: 30,
    passing_percentage: 70,
    max_attempts: 1,
    marks_per_question: 1,
    randomize_questions: true,
    randomize_options: true,
    result_visibility: 'immediate',
    prevent_tab_switch: true,
    proctored_mode: false,
    status: 'Active'
  });

  const [roleInput, setRoleInput] = useState('');

  // Fetch question bank
  const { data: questionBank = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['adminQuestions', selectedDeptFilter],
    queryFn: async () => {
      const url = selectedDeptFilter === 'All' 
        ? '/admin/questions' 
        : `/admin/questions?department=${encodeURIComponent(selectedDeptFilter)}`;
      const res = await api.get(url);
      return res.data?.data || res.data || [];
    }
  });

  // Fetch existing assessment if editing
  const { data: existingAssessment, isLoading: loadingAssessment } = useQuery({
    queryKey: ['adminAssessment', id],
    queryFn: async () => {
      const res = await api.get(`/admin/assessments/${id}`);
      return res.data?.data || res.data;
    },
    enabled: isEditing
  });

  useEffect(() => {
    if (existingAssessment && isEditing) {
      setForm({
        title: existingAssessment.title || '',
        department: existingAssessment.department || 'IT',
        target_roles: Array.isArray(existingAssessment.target_roles) ? existingAssessment.target_roles : ['All Staff'],
        description: existingAssessment.description || '',
        instructions: existingAssessment.instructions || '',
        duration_minutes: parseInt(existingAssessment.duration_minutes) || 30,
        passing_percentage: parseInt(existingAssessment.passing_percentage) || 70,
        max_attempts: parseInt(existingAssessment.max_attempts) || 1,
        marks_per_question: parseInt(existingAssessment.marks_per_question) || 1,
        randomize_questions: existingAssessment.randomize_questions === true || existingAssessment.randomize_questions === 'true' || existingAssessment.randomize_questions === 1,
        randomize_options: existingAssessment.randomize_options === true || existingAssessment.randomize_options === 'true' || existingAssessment.randomize_options === 1,
        result_visibility: existingAssessment.result_visibility || 'immediate',
        prevent_tab_switch: existingAssessment.prevent_tab_switch === true || existingAssessment.prevent_tab_switch === 'true' || existingAssessment.prevent_tab_switch === 1,
        proctored_mode: existingAssessment.proctored_mode === true || existingAssessment.proctored_mode === 'true' || existingAssessment.proctored_mode === 1,
        status: existingAssessment.status || 'Active'
      });

      // Restore selected question IDs
      const sqs = existingAssessment.selected_questions || [];
      const ids = sqs.map(q => typeof q === 'object' ? q.id : q).filter(Boolean);
      setSelectedIds(ids);
    }
  }, [existingAssessment, isEditing]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditing) {
        return await api.put(`/admin/assessments/${id}`, payload);
      } else {
        return await api.post('/admin/assessments', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success(isEditing ? 'Assessment updated successfully!' : 'Assessment created with unique rules & questions!');
      navigate('/admin/assessments/rules');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save assessment');
    }
  });

  const handleToggleQuestion = (qId) => {
    if (selectedIds.includes(qId)) {
      setSelectedIds(selectedIds.filter(id => id !== qId));
    } else {
      setSelectedIds([...selectedIds, qId]);
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = questionBank.map(q => q.id);
    const allSelected = allFilteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !allFilteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...allFilteredIds]));
      setSelectedIds(merged);
    }
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (roleInput.trim() && !form.target_roles.includes(roleInput.trim())) {
      setForm({ ...form, target_roles: [...form.target_roles, roleInput.trim()] });
      setRoleInput('');
    }
  };

  const handleRemoveRole = (role) => {
    setForm({ ...form, target_roles: form.target_roles.filter(r => r !== role) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Please select at least 1 question');
      setStep(1);
      return;
    }

    // Prepare full objects of selected questions to store as immutable snapshot in the assessment
    // First try to find from current loaded bank, or construct minimal ID object
    const selectedObjects = selectedIds.map(qId => {
      const found = questionBank.find(q => q.id === qId);
      if (found) return found;
      return { id: qId };
    });

    const payload = {
      ...form,
      selected_questions: selectedObjects
    };

    saveMutation.mutate(payload);
  };

  if (loadingQuestions || loadingAssessment) return <PageLoader />;

  const totalMarks = selectedIds.length * (parseInt(form.marks_per_question) || 1);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header - Matching Question Bank Page Ref */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/assessments/rules')}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition cursor-pointer"
            title="Back to Assessments"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {isEditing ? `Edit: ${form.title || 'Assessment'}` : 'Create Assessment'}
            </h1>
            <p className="text-sm text-slate-500">
              Link objective questions from the bank and configure unique timing, grading weights, and security rules.
            </p>
          </div>
        </div>

        {/* 2-Step Progress Indicators */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              step === 1
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>1</span>
            <span>Select Questions</span>
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] ml-0.5 font-mono">
              {selectedIds.length}
            </span>
          </button>
          <div className="w-3 h-[1px] bg-slate-300" />
          <button
            onClick={() => {
              if (selectedIds.length === 0) {
                toast.error('Please select at least 1 question first!');
                return;
              }
              setStep(2);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              step === 2
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>2</span>
            <span>Information & Rules</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 1: SELECT QUESTIONS FOR THIS UNIQUE ASSESSMENT */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-blue-950">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Step 1: Choose Questions for this Assessment</p>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  Select objective questions from the Department Question Bank. Since bank questions have no predetermined marks, you will assign uniform or custom weights in Step 2.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (selectedIds.length === 0) {
                  toast.error('Please select at least 1 question to proceed!');
                  return;
                }
                setStep(2);
              }}
              disabled={selectedIds.length === 0}
              className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer shrink-0 shadow-sm disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
            >
              <span>Next: Set Info & Rules ({selectedIds.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Department Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                <Filter size={13} /> Department:
              </span>
              <button
                onClick={() => setSelectedDeptFilter('All')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedDeptFilter === 'All'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({selectedDeptFilter === 'All' ? questionBank.length : 'All'})
              </button>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedDeptFilter === dept
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <button
              onClick={handleSelectAllFiltered}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0"
            >
              {questionBank.length > 0 && questionBank.every(q => selectedIds.includes(q.id))
                ? 'Deselect All in Filter'
                : 'Select All in Filter'}
            </button>
          </div>

          {/* Questions Checkbox Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium w-16 text-center">Select</th>
                    <th className="px-6 py-4 font-medium w-44">Department & Type</th>
                    <th className="px-6 py-4 font-medium">Question Text</th>
                    <th className="px-6 py-4 font-medium">Options Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {questionBank.map((item, idx) => {
                    const isChecked = selectedIds.includes(item.id);
                    const isMultiple = item.question_type === 'mcq_multiple';
                    let opts = item.options || [];
                    if (typeof opts === 'string') {
                      try { opts = JSON.parse(opts); } catch (e) { opts = []; }
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleToggleQuestion(item.id)}
                        className={`transition-colors cursor-pointer ${
                          isChecked ? 'bg-blue-50/50 hover:bg-blue-50/80 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-6 py-4 text-center align-middle" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleQuestion(item.id)}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 text-slate-900 align-top space-y-1.5">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Building2 size={12} /> {item.department}
                            </span>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isMultiple 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isMultiple ? <CheckSquare size={10} /> : <Disc size={10} />}
                              {isMultiple ? 'Multi Correct' : 'Single Correct'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-semibold align-top max-w-md">
                          <div className="flex items-start gap-2">
                            <span className="text-slate-400 font-mono text-xs mt-0.5">#{idx + 1}.</span>
                            <span className="whitespace-pre-wrap">{item.question_text}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-xs text-slate-500">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {opts.map((o, oIdx) => (
                              <span key={oIdx} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 truncate max-w-[140px]">
                                <strong className="text-slate-400 mr-1">{String.fromCharCode(65 + oIdx)}:</strong>{o}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {questionBank.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-14 text-center text-slate-500">
                        <p className="font-semibold text-slate-700">No questions found in {selectedDeptFilter} department.</p>
                        <p className="text-xs text-slate-400 mt-1">Go to Department Question Bank to add objective questions first.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: CONFIGURE BASIC INFORMATION & RULES */}
      {/* ========================================================= */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-emerald-950">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Step 2: Basic Information & Assessment Rules</p>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  You have linked <span className="font-bold underline">{selectedIds.length} questions</span> to this assessment. Configure the timing, grading weights, and security rules below.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-white text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl hover:bg-emerald-100 transition cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Change Selected Questions ({selectedIds.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Basic Info & Instructions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Basic Information */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText size={18} /></span>
                  <span>Basic Information</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Assessment Title / Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Q3 IT Infrastructure & Cybersecurity Evaluation"
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Department Category
                      </label>
                      <select
                        value={form.department}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none transition cursor-pointer"
                      >
                        {DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Assessment Status
                      </label>
                      <select
                        value={form.status}
                        onChange={e => setForm({ ...form, status: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none transition cursor-pointer"
                      >
                        <option value="Active">Active & Ready</option>
                        <option value="Draft">Draft (Hidden)</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Target Roles / Designations
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={roleInput}
                        onChange={e => setRoleInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddRole(e)}
                        placeholder="Type role name and press Add (e.g. Software Engineer)"
                        className="flex-1 p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddRole}
                        className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
                      >
                        Add Role
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.target_roles.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-lg text-xs font-bold">
                          <Users size={12} /> {r}
                          <button
                            type="button"
                            onClick={() => handleRemoveRole(r)}
                            className="text-blue-400 hover:text-rose-600 ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Description & Overview
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Provide a brief overview of what this assessment covers..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Instructions for Candidate */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                  <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><HelpCircle size={18} /></span>
                  <span>Candidate Instructions & Rules Notice</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Instructions Shown Before Starting
                  </label>
                  <textarea
                    rows={4}
                    value={form.instructions}
                    onChange={e => setForm({ ...form, instructions: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    These rules will be displayed to the candidate on the exam landing screen.
                  </p>
                </div>
              </div>
            </div>

            {/* Right 1 Column: Timing, Grading & Security Controls */}
            <div className="space-y-6">
              {/* Card 3: Timing & Grading Parameters */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                  <span className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Clock size={18} /></span>
                  <span>Timing & Grading</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Total Duration (Minutes) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.duration_minutes}
                      onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-base font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Passing Percentage (%) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={form.passing_percentage}
                      onChange={e => setForm({ ...form, passing_percentage: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-base font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Marks Per Question <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.marks_per_question}
                      onChange={e => setForm({ ...form, marks_per_question: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-base font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                    <div className="mt-2 p-3 bg-blue-50/80 rounded-xl border border-blue-200/60 flex items-center justify-between text-xs text-blue-900 font-bold">
                      <span>Total Assessment Marks:</span>
                      <span className="text-sm text-blue-600 bg-white px-2.5 py-0.5 rounded-lg shadow-2xs border border-blue-200">
                        {totalMarks} pts
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Maximum Attempts Allowed <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.max_attempts}
                      onChange={e => setForm({ ...form, max_attempts: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-base font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Display & Security Controls */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-base">
                  <span className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Shield size={18} /></span>
                  <span>Security Controls</span>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Shuffle Questions</div>
                      <div className="text-[11px] text-slate-500">Randomize question order for candidates</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.randomize_questions}
                      onChange={e => setForm({ ...form, randomize_questions: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Shuffle Options</div>
                      <div className="text-[11px] text-slate-500">Randomize A/B/C/D option order</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.randomize_options}
                      onChange={e => setForm({ ...form, randomize_options: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Prevent Tab Switching</div>
                      <div className="text-[11px] text-slate-500">Warn or auto-submit if leaving exam tab</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.prevent_tab_switch}
                      onChange={e => setForm({ ...form, prevent_tab_switch: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Proctored Fullscreen</div>
                      <div className="text-[11px] text-slate-500">Enforce full screen mode during test</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.proctored_mode}
                      onChange={e => setForm({ ...form, proctored_mode: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 mt-2">
                      Result Visibility
                    </label>
                    <select
                      value={form.result_visibility}
                      onChange={e => setForm({ ...form, result_visibility: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none transition cursor-pointer"
                    >
                      <option value="immediate">Immediate (Show score upon submit)</option>
                      <option value="after_review">After Admin Review</option>
                      <option value="never">Never (Hidden from candidate)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/admin/assessments/rules')}
              className="px-6 py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {saveMutation.isPending && <RefreshCw size={18} className="animate-spin" />}
              <span>{isEditing ? 'Update Assessment & Rules' : 'Create & Publish Assessment'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AssessmentCreatePage;
