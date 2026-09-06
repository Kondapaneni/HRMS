import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  HelpCircle, 
  ArrowLeft,
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Clock, 
  Award,
  Building2, 
  CheckSquare, 
  Disc, 
  Filter, 
  Layers, 
  Check, 
  Sparkles, 
  RefreshCw,
  AlertCircle, 
  Eye, 
  Lock, 
  FileText, 
  Users,
  Search,
  Calendar,
  Settings,
  ShieldCheck,
  CheckCheck
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

const AssessmentCreate = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Step state: 1 = Select Questions, 2 = Assign Employees, 3 = Configure Info & Rules
  const [step, setStep] = useState(1);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [questionSearch, setQuestionSearch] = useState('');
  const [debouncedQuestionSearch, setDebouncedQuestionSearch] = useState('');

  // Selected questions map/array (storing IDs of checked questions)
  const [selectedIds, setSelectedIds] = useState([]);

  // Form state for Step 3: Basic Info, Timing & Grading, Security Controls
  const [form, setForm] = useState({
    title: '',
    department: 'IT',
    duration_minutes: 30,
    passing_percentage: 70,
    max_attempts: 1,
    marks_per_question: 1,
    randomize_questions: true,
    randomize_options: true,
    result_visibility: 'immediate',
    assessment_date: '',
    status: 'Active',
    assigned_employee_ids: []
  });

  const [searchEmployee, setSearchEmployee] = useState('');

  // Debounce question search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuestionSearch(questionSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [questionSearch]);

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

  // Fetch employees for assignment
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['adminEmployeesForAssignment'],
    queryFn: async () => {
      const res = await api.get('/admin/employees');
      return res.data?.employees || res.data || [];
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
        duration_minutes: parseInt(existingAssessment.duration_minutes) || 30,
        passing_percentage: parseInt(existingAssessment.passing_percentage) || 70,
        max_attempts: parseInt(existingAssessment.max_attempts) || 1,
        marks_per_question: parseInt(existingAssessment.marks_per_question) || 1,
        randomize_questions: existingAssessment.randomize_questions === true || existingAssessment.randomize_questions === 'true' || existingAssessment.randomize_questions === 1,
        randomize_options: existingAssessment.randomize_options === true || existingAssessment.randomize_options === 'true' || existingAssessment.randomize_options === 1,
        result_visibility: existingAssessment.result_visibility || 'immediate',
        assessment_date: existingAssessment.assessment_date || '',
        status: existingAssessment.status || 'Active',
        assigned_employee_ids: existingAssessment.assigned_employee_ids || []
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
      toast.success(isEditing ? 'Assessment updated successfully!' : 'Assessment created with custom rules & questions!');
      navigate('/admin/assessments/management');
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

  const filteredQuestions = useMemo(() => {
    if (!debouncedQuestionSearch.trim()) return questionBank;
    const q = debouncedQuestionSearch.toLowerCase();
    return questionBank.filter(item => 
      (item.question_text && item.question_text.toLowerCase().includes(q)) ||
      (item.department && item.department.toLowerCase().includes(q))
    );
  }, [questionBank, debouncedQuestionSearch]);

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredQuestions.map(q => q.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !allFilteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...allFilteredIds]));
      setSelectedIds(merged);
    }
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

  if (loadingQuestions || loadingAssessment || loadingEmployees) return <PageLoader message="Loading Assessment Builder..." />;

  const totalMarks = selectedIds.length * (parseInt(form.marks_per_question) || 1);

  const stepsList = [
    { num: 1, label: 'Choose Questions', desc: `${selectedIds.length} selected` },
    { num: 2, label: 'Assign Employees', desc: `${form.assigned_employee_ids.length} enrolled` },
    { num: 3, label: 'Configure Rules', desc: `${form.duration_minutes}m • ${form.passing_percentage}% pass` }
  ];

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Assessment Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            {isEditing ? (
              <>Edit: <span className="font-medium italic text-[#1a73e8]">{form.title || 'Assessment'}</span></>
            ) : (
              <>Create <span className="font-medium italic text-[#1a73e8]">New Assessment</span></>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Select questions from bank, assign targeted staff, and set custom timings & anti-cheating controls.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-3 py-1 rounded-full">
            {selectedIds.length} Qs • {totalMarks} Total Pts
          </span>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white p-4 shadow-xs">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {stepsList.map(s => {
            const isActive = step === s.num;
            const isDone = step > s.num;

            return (
              <div 
                key={s.num}
                onClick={() => {
                  if (s.num === 1) setStep(1);
                  if (s.num === 2 && selectedIds.length > 0) setStep(2);
                  if (s.num === 3 && selectedIds.length > 0) setStep(3);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  isActive 
                    ? 'bg-[#e8f0fe] border-[#4285F4] shadow-xs' 
                    : isDone 
                      ? 'bg-[#e6f4ea] border-[#ceead6]' 
                      : 'bg-[#f8fafd] border-[#e0e3e7] opacity-60'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isActive 
                    ? 'bg-[#1a73e8] text-white' 
                    : isDone 
                      ? 'bg-[#137333] text-white' 
                      : 'bg-[#e0e3e7] text-[#5f6368]'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#1a73e8]' : isDone ? 'text-[#137333]' : 'text-[#5f6368]'}`}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-[#5f6368] truncate">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 1: CHOOSE QUESTIONS */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Top Info Banner */}
          <div className="rounded-2xl border border-[#c2e7ff] bg-[#e8f0fe] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#001d35] shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#c2e7ff] text-[#001d35] shrink-0">
                <Layers className="w-5 h-5 text-[#1a73e8]" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a73e8]">Step 1: Select Objective Questions</h4>
                <p className="text-xs text-[#001d35] mt-0.5 leading-relaxed">
                  Choose questions from your question bank. You will configure uniform or custom mark distributions in Step 3.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (selectedIds.length === 0) {
                  toast.error('Please select at least 1 question to proceed');
                  return;
                }
                setStep(2);
              }}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
            >
              <span>Next: Assign Staff</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Department Filter & Search Bar */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
              <button
                onClick={() => setSelectedDeptFilter('All')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedDeptFilter === 'All'
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}
              >
                All Departments ({selectedDeptFilter === 'All' ? questionBank.length : 'All'})
              </button>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedDeptFilter === dept
                      ? 'bg-[#1a73e8] text-white shadow-xs'
                      : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368]" />
                <input
                  type="search"
                  placeholder="Search question text..."
                  value={questionSearch}
                  onChange={e => setQuestionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f1f3f4] focus:bg-white border border-[#dadce0] rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc] transition-all cursor-pointer shrink-0"
              >
                {filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.includes(q.id))
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>
          </div>

          {/* Questions Selection Table */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">Select</th>
                    <th className="px-4 py-3.5 w-44">Department & Type</th>
                    <th className="px-4 py-3.5">Question Statement</th>
                    <th className="px-4 py-3.5">Options Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e3e7]">
                  {filteredQuestions.map((item, idx) => {
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
                          isChecked ? 'bg-[#e8f0fe]/40 hover:bg-[#e8f0fe]/60' : 'hover:bg-[#f8fafd]'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center align-middle" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleQuestion(item.id)}
                            className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                          />
                        </td>

                        <td className="px-4 py-3.5 align-top space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                            <Building2 className="w-3 h-3" /> {item.department}
                          </span>
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              isMultiple ? 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]' : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                            }`}>
                              {isMultiple ? <CheckSquare className="w-2.5 h-2.5" /> : <Disc className="w-2.5 h-2.5" />}
                              {isMultiple ? 'Multi-Select' : 'Single MCQ'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top max-w-md">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-[11px] font-bold text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-xs text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">
                              {item.question_text}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top text-xs text-[#5f6368]">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {opts.map((o, oIdx) => (
                              <span key={oIdx} className="px-2 py-0.5 bg-[#f8fafd] border border-[#dadce0] rounded-lg text-[#5f6368] truncate max-w-[140px]">
                                <strong className="text-[#1a73e8] mr-1">{String.fromCharCode(65 + oIdx)}:</strong>{o}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredQuestions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-[#5f6368]">
                        <p className="font-semibold text-sm text-[#1f1f1f]">No questions found</p>
                        <p className="text-xs text-[#5f6368] mt-0.5">Please adjust your search or department filter.</p>
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
      {/* STEP 2: ASSIGN EMPLOYEES */}
      {/* ========================================================= */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Top Info Banner */}
          <div className="rounded-2xl border border-[#e9d5ff] bg-[#f3e8fd] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#3b0764] shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#e9d5ff] text-[#8430ce] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8430ce]">Step 2: Enroll Specific Employees</h4>
                <p className="text-xs text-[#3b0764] mt-0.5 leading-relaxed">
                  Select the employees who must complete this competency test. (Leave empty to open access by department fallback).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer"
              >
                <span>Next: Configure Rules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368]" />
              <input
                type="search"
                placeholder="Search employees by name, email or code..."
                value={searchEmployee}
                onChange={e => setSearchEmployee(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#f1f3f4] focus:bg-white border border-[#dadce0] rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-3 py-1 rounded-full">
                {form.assigned_employee_ids.length} Selected
              </span>
              <button
                type="button"
                onClick={() => {
                  const allIds = employees.map(e => e.userId || e.id);
                  setForm(f => ({ ...f, assigned_employee_ids: allIds }));
                }}
                className="font-semibold text-[#1a73e8] hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-[#dadce0]">•</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, assigned_employee_ids: [] }))}
                className="font-semibold text-[#5f6368] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Employees Directory Table */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
            <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">Select</th>
                    <th className="px-4 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Designation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e3e7]">
                  {employees.filter(e => {
                    if (!searchEmployee) return true;
                    const s = searchEmployee.toLowerCase();
                    return (
                      (e.firstName?.toLowerCase().includes(s)) ||
                      (e.lastName?.toLowerCase().includes(s)) ||
                      (e.email?.toLowerCase().includes(s)) ||
                      (e.department?.toLowerCase().includes(s))
                    );
                  }).map(emp => {
                    const empId = emp.userId || emp.id;
                    const isSelected = form.assigned_employee_ids.includes(empId);
                    const initials = `${(emp.firstName || '').charAt(0)}${(emp.lastName || '').charAt(0)}`.toUpperCase() || 'E';

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => {
                          setForm(f => {
                            if (isSelected) {
                              return { ...f, assigned_employee_ids: f.assigned_employee_ids.filter(id => id !== empId) };
                            } else {
                              return { ...f, assigned_employee_ids: [...f.assigned_employee_ids, empId] };
                            }
                          });
                        }}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#e8f0fe]/40 hover:bg-[#e8f0fe]/60' : 'hover:bg-[#f8fafd]'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center align-middle" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setForm(f => {
                                if (isSelected) {
                                  return { ...f, assigned_employee_ids: f.assigned_employee_ids.filter(id => id !== empId) };
                                } else {
                                  return { ...f, assigned_employee_ids: [...f.assigned_employee_ids, empId] };
                                }
                              });
                            }}
                            className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                          />
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-[#1f1f1f]">{emp.firstName} {emp.lastName}</p>
                              <p className="text-[11px] text-[#5f6368]">{emp.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f8fafd] text-[#5f6368] border border-[#dadce0]">
                            <Building2 className="w-3 h-3" />
                            {emp.department || 'General'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-[#5f6368]">
                          {emp.position || 'Employee'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: CONFIGURE BASIC INFO & RULES */}
      {/* ========================================================= */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
          
          {/* Top Info Banner */}
          <div className="rounded-2xl border border-[#ceead6] bg-[#e6f4ea] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#0d5926] shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#ceead6] text-[#137333] shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#137333]">Step 3: Define Exam Parameters & Rules</h4>
                <p className="text-xs text-[#0d5926] mt-0.5 leading-relaxed">
                  Linked <span className="font-bold underline">{selectedIds.length} questions</span> and <span className="font-bold underline">{form.assigned_employee_ids.length > 0 ? `${form.assigned_employee_ids.length} employees` : 'all departmental staff'}</span>. Finalize timings, grading benchmarks, and anti-cheating controls below.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {/* Section 1: Basic Information */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
              <FileText className="w-4 h-4 text-[#1a73e8]" />
              <span>Basic Information</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                  Assessment Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Q3 IT Infrastructure & Cybersecurity Competency"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-semibold text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                    Department Category
                  </label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-medium text-[#1f1f1f] outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                    Scheduled Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.assessment_date || ''}
                    onChange={e => setForm({ ...form, assessment_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-medium text-[#1f1f1f] outline-none cursor-pointer"
                  />
                  <p className="text-[10px] text-[#5f6368] mt-1">Leave empty for anytime access</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                    Assessment Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-medium text-[#1f1f1f] outline-none cursor-pointer"
                  >
                    <option value="Active">Active & Visible</option>
                    <option value="Draft">Draft (Hidden)</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Timing & Grading + Security Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            
            {/* Timing & Grading */}
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
                <Clock className="w-4 h-4 text-[#1a73e8]" />
                <span>Timing & Grading Parameters</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1">
                    Exam Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-bold text-[#1f1f1f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1">
                    Passing Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={form.passing_percentage}
                    onChange={e => setForm({ ...form, passing_percentage: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-bold text-[#137333] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1">
                    Marks Per Question *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.marks_per_question}
                    onChange={e => setForm({ ...form, marks_per_question: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-bold text-[#1f1f1f] outline-none"
                  />
                  <div className="mt-2 p-2.5 bg-[#e8f0fe] rounded-xl border border-[#d2e3fc] flex items-center justify-between text-xs text-[#1a73e8] font-semibold">
                    <span>Total Test Marks:</span>
                    <span className="text-xs bg-white text-[#1a73e8] px-2.5 py-0.5 rounded-full border border-[#d2e3fc] font-bold">
                      {totalMarks} pts
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1">
                    Max Attempts Allowed *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.max_attempts}
                    onChange={e => setForm({ ...form, max_attempts: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-bold text-[#1f1f1f] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Security Controls */}
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
                <Shield className="w-4 h-4 text-[#8430ce]" />
                <span>Security & Anti-Cheating Controls</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-[#dadce0] hover:bg-[#f8fafd] transition cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-[#1f1f1f]">Shuffle Questions</div>
                    <div className="text-[11px] text-[#5f6368]">Randomize question presentation order</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.randomize_questions}
                    onChange={e => setForm({ ...form, randomize_questions: e.target.checked })}
                    className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-[#dadce0] hover:bg-[#f8fafd] transition cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-[#1f1f1f]">Shuffle Option Choices</div>
                    <div className="text-[11px] text-[#5f6368]">Randomize A/B/C/D choices order</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.randomize_options}
                    onChange={e => setForm({ ...form, randomize_options: e.target.checked })}
                    className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                  />
                </label>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5 mt-2">
                    Result Visibility
                  </label>
                  <select
                    value={form.result_visibility}
                    onChange={e => setForm({ ...form, result_visibility: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-xl text-xs font-medium text-[#1f1f1f] outline-none cursor-pointer"
                  >
                    <option value="immediate">Immediate (Show score upon submission)</option>
                    <option value="after_review">After Admin Review</option>
                    <option value="never">Never (Hidden from candidate)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-[#f8fafd] p-4 flex justify-end items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/admin/assessments/management')}
              className="px-5 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saveMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Update Assessment & Rules' : 'Publish Assessment'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AssessmentCreate;
