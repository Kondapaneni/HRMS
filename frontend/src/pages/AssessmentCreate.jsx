import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import { ArrowLeft, ArrowRight, CheckCircle2, Shield, Clock, Building2, CheckSquare, Disc, Layers, Check, Sparkles, RefreshCw, FileText, Users } from 'lucide-react';
import PageLoader from '../components/PageLoader';
import Button from '../components/ui/Button';

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

  if (loadingQuestions || loadingAssessment || loadingEmployees) return <PageLoader message="Loading assessment builder..." />;

  const totalMarks = selectedIds.length * (parseInt(form.marks_per_question) || 1);

  const stepsList = [
    { num: 1, label: 'Choose questions', desc: `${selectedIds.length} selected` },
    { num: 2, label: 'Assign employees', desc: `${form.assigned_employee_ids.length} enrolled` },
    { num: 3, label: 'Configure rules', desc: `${form.duration_minutes}m • ${form.passing_percentage}% pass` }
  ];

  return (
    <div className="space-y-6 pb-12 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em]">
            {isEditing ? `Edit: ${form.title || 'Assessment'}` : 'Create new assessment'}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Select questions from bank, assign targeted staff, and set custom timings & anti-cheating controls.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-3 py-1 rounded-full">
            {selectedIds.length} Qs • {totalMarks} Total pts
          </span>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="rounded-[24px] bg-[var(--surface)] p-3">
        <div className="grid grid-cols-3 gap-2">
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
                className={`p-3 rounded-[16px] transition-all cursor-pointer flex items-center gap-3 ${
                  isActive 
                    ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)]' 
                    : isDone 
                      ? 'bg-[var(--success-bg)] text-[var(--success-text)]' 
                      : 'bg-[var(--surface-alt)] text-[var(--muted)] opacity-60'
                }`}
              >
                <div className={`w-7 h-7 rounded-[10px] flex items-center justify-center font-medium text-[12px] shrink-0 ${
                  isActive 
                    ? 'bg-[var(--brand-deep)] text-white' 
                    : isDone 
                      ? 'bg-[var(--success-text)] text-white' 
                      : 'bg-[var(--line)] text-[var(--muted)]'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p className="text-[13px] font-medium truncate">
                    {s.label}
                  </p>
                  <p className="text-[11px] opacity-80 truncate">{s.desc}</p>
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
        <div className="space-y-[14px] animate-in fade-in duration-300">
          
          {/* Top Info Banner */}
          <div className="rounded-[24px] bg-[var(--surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[14px] font-medium text-[var(--text)]">Step 1: Select objective questions</h4>
                <p className="text-[13px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  Choose questions from your question bank. You will configure uniform or custom mark distributions in Step 3.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                if (selectedIds.length === 0) {
                  toast.error('Please select at least 1 question to proceed');
                  return;
                }
                setStep(2);
              }}
              disabled={selectedIds.length === 0}
              className="shrink-0 self-start sm:self-auto"
            >
              <span>Next: Assign staff</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {/* Department Filter & Search Bar */}
          <div className="rounded-[24px] bg-[var(--surface)] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedDeptFilter('All')}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedDeptFilter === 'All'
                    ? 'bg-[var(--ink)] text-white'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                All departments ({selectedDeptFilter === 'All' ? questionBank.length : 'All'})
              </button>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors shrink-0 cursor-pointer ${
                    selectedDeptFilter === dept
                      ? 'bg-[var(--ink)] text-white'
                      : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <SearchBar
                placeholder="Search question text..."
                value={questionSearch}
                onChange={e => setQuestionSearch(e.target.value)}
                wrapperClassName="w-full sm:w-64"
              />

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSelectAllFiltered}
              >
                {filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.includes(q.id))
                  ? 'Deselect all'
                  : 'Select all'}
              </Button>
            </div>
          </div>

          {/* Questions Selection Table */}
          <div className="rounded-[24px] bg-[var(--surface)] overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] text-left">
                <thead className="bg-[var(--surface-alt)] text-[var(--muted)] font-medium text-[12px]">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">Select</th>
                    <th className="px-4 py-3.5 w-44">Department & type</th>
                    <th className="px-4 py-3.5">Question statement</th>
                    <th className="px-4 py-3.5">Options preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredQuestions.map((item, idx) => {
                    const isChecked = selectedIds.includes(item.id);
                    const isMultiple = item.question_type === 'mcq_multiple';
                    let opts = item.options || [];
                    if (typeof opts === 'string') {
                      try { opts = JSON.parse(opts); } catch { opts = []; }
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleToggleQuestion(item.id)}
                        className={`transition-colors cursor-pointer ${
                          isChecked ? 'bg-[var(--brand-tint)]/60' : 'hover:bg-[var(--surface-alt)]'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center align-middle" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleQuestion(item.id)}
                            className="w-4 h-4 rounded text-[var(--brand-deep)] focus:ring-[var(--brand-deep)] cursor-pointer"
                          />
                        </td>

                        <td className="px-4 py-3.5 align-top space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[9px] text-[12px] font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                            <Building2 className="w-3 h-3" /> {item.department}
                          </span>
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[9px] text-[11px] font-medium ${
                              isMultiple ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]' : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                            }`}>
                              {isMultiple ? <CheckSquare className="w-2.5 h-2.5" /> : <Disc className="w-2.5 h-2.5" />}
                              {isMultiple ? 'Multi-select' : 'Single MCQ'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top max-w-md">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-[11px] font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-1.5 py-0.5 rounded-[6px] shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-medium text-[13px] text-[var(--text)] leading-relaxed whitespace-pre-wrap">
                              {item.question_text}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top text-[12px] text-[var(--muted)]">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {opts.map((o, oIdx) => (
                              <span key={oIdx} className="px-2 py-0.5 bg-[var(--surface-alt)] rounded-[8px] text-[var(--muted)] truncate max-w-[140px]">
                                <strong className="text-[var(--brand-deep)] mr-1">{String.fromCharCode(65 + oIdx)}:</strong>{o}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredQuestions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-[var(--muted)]">
                        <p className="font-medium text-[15px] text-[var(--text)]">No questions found</p>
                        <p className="text-[12px] text-[var(--muted)] mt-0.5">Please adjust your search or department filter.</p>
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
        <div className="space-y-[14px] animate-in fade-in duration-300">
          
          {/* Top Info Banner */}
          <div className="rounded-[24px] bg-[var(--surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[14px] font-medium text-[var(--text)]">Step 2: Enroll specific employees</h4>
                <p className="text-[13px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  Select the employees who must complete this competency test. (Leave empty to open access by department fallback).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep(3)}
              >
                <span>Next: Configure rules</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="rounded-[24px] bg-[var(--surface)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SearchBar
              placeholder="Search employees by name, email or code..."
              value={searchEmployee}
              onChange={e => setSearchEmployee(e.target.value)}
              wrapperClassName="w-full sm:w-80"
            />

            <div className="flex items-center gap-3 text-[12px]">
              <span className="font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-3 py-1 rounded-full">
                {form.assigned_employee_ids.length} Selected
              </span>
              <button
                type="button"
                onClick={() => {
                  const allIds = employees.map(e => e.userId || e.id);
                  setForm(f => ({ ...f, assigned_employee_ids: allIds }));
                }}
                className="font-medium text-[var(--brand-deep)] hover:underline cursor-pointer"
              >
                Select all
              </button>
              <span className="text-[var(--line)]">•</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, assigned_employee_ids: [] }))}
                className="font-medium text-[var(--muted)] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Employees Directory Table */}
          <div className="rounded-[24px] bg-[var(--surface)] overflow-hidden flex flex-col">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-[13px] text-left">
                <thead className="bg-[var(--surface-alt)] text-[var(--muted)] font-medium text-[12px] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">Select</th>
                    <th className="px-4 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Designation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
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
                          isSelected ? 'bg-[var(--brand-tint)]/60' : 'hover:bg-[var(--surface-alt)]'
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
                            className="w-4 h-4 rounded text-[var(--brand-deep)] focus:ring-[var(--brand-deep)] cursor-pointer"
                          />
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-medium text-[11px] shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-[13px] text-[var(--text)]">{emp.firstName} {emp.lastName}</p>
                              <p className="text-[11px] text-[var(--muted)]">{emp.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[9px] text-[12px] font-medium bg-[var(--surface-alt)] text-[var(--muted)]">
                            <Building2 className="w-3 h-3" />
                            {emp.department || 'General'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-[12px] text-[var(--muted)]">
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
        <form onSubmit={handleSubmit} className="space-y-[14px] animate-in fade-in duration-300">
          
          {/* Top Info Banner */}
          <div className="rounded-[24px] bg-[var(--surface)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--success-bg)] text-[var(--success-text)] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[14px] font-medium text-[var(--text)]">Step 3: Define exam parameters & rules</h4>
                <p className="text-[13px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  Linked <span className="font-medium text-[var(--text)] underline">{selectedIds.length} questions</span> and <span className="font-medium text-[var(--text)] underline">{form.assigned_employee_ids.length > 0 ? `${form.assigned_employee_ids.length} employees` : 'all departmental staff'}</span>. Finalize timings, grading benchmarks, and anti-cheating controls below.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(2)}
              className="self-start sm:self-auto shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          {/* Section 1: Basic Information */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
              <FileText className="w-4 h-4 text-[var(--brand-deep)]" />
              <span>Basic information</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                  Assessment title / name *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Q3 IT Infrastructure & Cybersecurity Competency"
                  className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] font-medium text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                    Department category
                  </label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full h-10 px-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                    Scheduled date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.assessment_date || ''}
                    onChange={e => setForm({ ...form, assessment_date: e.target.value })}
                    className="w-full h-10 px-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">Leave empty for anytime access</p>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                    Assessment status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full h-10 px-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] items-start">
            
            {/* Timing & Grading */}
            <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
                <Clock className="w-4 h-4 text-[var(--brand-deep)]" />
                <span>Timing & grading parameters</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                    Exam duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] font-medium text-[var(--text)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                    Passing percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={form.passing_percentage}
                    onChange={e => setForm({ ...form, passing_percentage: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] font-medium text-[var(--success-text)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                    Marks per question *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.marks_per_question}
                    onChange={e => setForm({ ...form, marks_per_question: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] font-medium text-[var(--text)] outline-none"
                  />
                  <div className="mt-2 p-2.5 bg-[var(--brand-tint)] rounded-[12px] flex items-center justify-between text-[12px] text-[var(--brand-deep)] font-medium">
                    <span>Total test marks:</span>
                    <span className="bg-[var(--surface)] text-[var(--brand-deep)] px-2.5 py-0.5 rounded-full font-bold">
                      {totalMarks} pts
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                    Max attempts allowed *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.max_attempts}
                    onChange={e => setForm({ ...form, max_attempts: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] font-medium text-[var(--text)] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Security Controls */}
            <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
                <Shield className="w-4 h-4 text-[var(--accent-pink-deep)]" />
                <span>Security & anti-cheating controls</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 transition cursor-pointer">
                  <div>
                    <div className="text-[13px] font-medium text-[var(--text)]">Shuffle questions</div>
                    <div className="text-[11px] text-[var(--muted)]">Randomize question presentation order</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.randomize_questions}
                    onChange={e => setForm({ ...form, randomize_questions: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--brand-deep)] focus:ring-[var(--brand-deep)] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 transition cursor-pointer">
                  <div>
                    <div className="text-[13px] font-medium text-[var(--text)]">Shuffle option choices</div>
                    <div className="text-[11px] text-[var(--muted)]">Randomize A/B/C/D choices order</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.randomize_options}
                    onChange={e => setForm({ ...form, randomize_options: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--brand-deep)] focus:ring-[var(--brand-deep)] cursor-pointer"
                  />
                </label>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5 mt-2">
                    Result visibility
                  </label>
                  <select
                    value={form.result_visibility}
                    onChange={e => setForm({ ...form, result_visibility: e.target.value })}
                    className="w-full h-10 px-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
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
          <div className="rounded-[24px] bg-[var(--surface)] p-4 flex justify-end items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/assessments/management')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              <span>{isEditing ? 'Update assessment & rules' : 'Publish assessment'}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AssessmentCreate;
