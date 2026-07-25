import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Award, Plus, Trash2, Edit2, Search, Filter, CheckCircle, XCircle,
  HelpCircle, Clock, AlertCircle, Users, BarChart2, BookOpen, Send,
  ChevronRight, ArrowLeft, Check, RefreshCw, Eye, EyeOff, Shuffle, Shield, X
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AdminAssessments = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('assessments'); // 'assessments' | 'questions' | 'assign' | 'analytics'
  
  // Question Bank State
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
    correct_answers: ['0'] // array of option indices as strings
  });

  // Assessment Builder State
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
    question_ids: [] // array of { id, marks, title }
  });

  // Assignment State
  const [selectedAssignExam, setSelectedAssignExam] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmps, setSelectedEmps] = useState(new Set());

  // --- QUERIES ---
  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ['adminAssessments', 'questions', qDifficulty],
    queryFn: async () => {
      const res = await api.get('/admin/assessments/questions', {
        params: { difficulty: qDifficulty }
      });
      return Array.isArray(res.data) ? res.data : (res.data?.questions || []);
    }
  });

  const { data: assessments = [], isLoading: aLoading } = useQuery({
    queryKey: ['adminAssessments', 'list'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return Array.isArray(res.data) ? res.data : (res.data?.assessments || []);
    }
  });

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employees', 'directory'],
    queryFn: async () => {
      const res = await api.get('/admin/employees');
      return Array.isArray(res.data) ? res.data : (res.data?.employees || []);
    },
    enabled: activeTab === 'assign'
  });

  const { data: analyticsData, isLoading: anaLoading } = useQuery({
    queryKey: ['adminAssessments', 'analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments/analytics');
      return res.data;
    },
    enabled: activeTab === 'analytics'
  });

  // --- MUTATIONS ---
  const saveQMutation = useMutation({
    mutationFn: async (data) => {
      if (editingQ) {
        return await api.put(`/admin/assessments/questions/${editingQ.id}`, data);
      } else {
        return await api.post('/admin/assessments/questions', data);
      }
    },
    onSuccess: () => {
      toast.success(editingQ ? 'Question updated!' : 'Question added to bank!');
      queryClient.invalidateQueries(['adminAssessments', 'questions']);
      setShowQModal(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save question')
  });

  const deleteQMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/admin/assessments/questions/${id}`),
    onSuccess: () => {
      toast.success('Question deleted');
      queryClient.invalidateQueries(['adminAssessments', 'questions']);
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
      toast.success(editingA ? 'Assessment updated!' : 'Assessment created!');
      queryClient.invalidateQueries(['adminAssessments', 'list']);
      setShowAModal(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save assessment')
  });

  const deleteAMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/admin/assessments/${id}`),
    onSuccess: () => {
      toast.success('Assessment deleted');
      queryClient.invalidateQueries(['adminAssessments', 'list']);
    }
  });

  const assignMutation = useMutation({
    mutationFn: async ({ examId, employeeIds, dueDate }) => {
      return await api.post(`/admin/assessments/${examId}/assign`, {
        employee_ids: Array.from(employeeIds),
        due_date: dueDate
      });
    },
    onSuccess: (res) => {
      toast.success(res.data.message || 'Assigned successfully!');
      setSelectedEmps(new Set());
      setAssignDueDate('');
      queryClient.invalidateQueries(['adminAssessments', 'list']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to assign assessment')
  });

  // --- HANDLERS ---
  const handleOpenQModal = (q = null) => {
    if (q) {
      setEditingQ(q);
      setQForm({
        title: q.title || '',
        question_type: q.question_type || 'mcq_single',
        difficulty: q.difficulty || 'Medium',
        marks: q.marks || 5,
        options: q.options && q.options.length ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answers: q.correct_answers || ['0']
      });
    } else {
      setEditingQ(null);
      setQForm({
        title: '',
        question_type: 'mcq_single',
        difficulty: 'Medium',
        marks: 5,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answers: ['0']
      });
    }
    setShowQModal(true);
  };

  const handleOpenAModal = async (a = null) => {
    if (a) {
      try {
        const res = await api.get(`/admin/assessments/${a.id}`);
        const full = res.data;
        setEditingA(full);
        setAForm({
          title: full.title || '',
          description: full.description || '',
          duration_minutes: full.duration_minutes || 30,
          passing_percentage: full.passing_percentage || 70,
          max_attempts: full.max_attempts || 1,
          randomize_questions: full.randomize_questions === true || full.randomize_questions === 'true' || full.randomize_questions == 1,
          randomize_options: full.randomize_options === true || full.randomize_options === 'true' || full.randomize_options == 1,
          result_visibility: full.result_visibility || 'immediate',
          status: full.status || 'published',
          question_ids: (full.questions || []).map(q => ({ id: q.id, marks: q.marks, title: q.title }))
        });
      } catch (e) {
        toast.error('Failed to load assessment details');
        return;
      }
    } else {
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
    }
    setShowAModal(true);
  };

  const toggleEmpSelection = (id) => {
    const next = new Set(selectedEmps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmps(next);
  };

  const selectAllEmps = () => {
    if (selectedEmps.size === filteredEmps.length) {
      setSelectedEmps(new Set());
    } else {
      setSelectedEmps(new Set(filteredEmps.map(e => e.id)));
    }
  };

  const filteredQuestions = (Array.isArray(questions) ? questions : []).filter(q => 
    q.title.toLowerCase().includes(qSearch.toLowerCase())
  );

  const filteredEmps = (Array.isArray(employees) ? employees : []).filter(e => 
    `${e.firstName} ${e.lastName} ${e.email} ${e.department || ''}`.toLowerCase().includes(empSearch.toLowerCase()) &&
    e.role !== 'admin'
  );

  if (qLoading && aLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Exams & Assessment Manager</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build reusable MCQ question banks, configure customizable exams with automated grading, and assign them to employees across departments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenQModal()}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2 text-slate-500" />
            Add Question
          </button>
          <button
            onClick={() => handleOpenAModal()}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Exam
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'assessments', label: 'Exams & Assessments', icon: <BookOpen className="w-4 h-4 mr-2" /> },
            { id: 'questions', label: 'MCQ Question Bank', icon: <HelpCircle className="w-4 h-4 mr-2" /> },
            { id: 'assign', label: 'Assign & Schedule', icon: <Send className="w-4 h-4 mr-2" /> },
            { id: 'analytics', label: 'Reports & Analytics', icon: <BarChart2 className="w-4 h-4 mr-2" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium'
              } flex items-center whitespace-nowrap py-4 px-1 border-b-2 text-sm transition-colors cursor-pointer`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: ASSESSMENTS LIST */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map(exam => (
              <div key={exam.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      exam.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                    }`}>
                      {exam.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{exam.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2 min-h-[2.5rem]">{exam.description || 'No description provided.'}</p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-xs text-slate-400 font-medium">Questions</div>
                      <div className="text-sm font-bold text-slate-800">{exam.questions_count}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-xs text-slate-400 font-medium">Duration</div>
                      <div className="text-sm font-bold text-slate-800">{exam.duration_minutes}m</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <div className="text-xs text-slate-400 font-medium">Pass Rate</div>
                      <div className="text-sm font-bold text-blue-600">{exam.pass_rate}%</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-sm">
                  <div className="text-xs text-slate-500">
                    Assigned: <span className="font-semibold text-slate-700">{exam.assigned_count}</span> | Attempts: <span className="font-semibold text-slate-700">{exam.attempts_count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAModal(exam)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Exam"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this assessment?')) {
                          deleteAMutation.mutate(exam.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Exam"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {assessments.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                <Award size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="font-medium">No assessments created yet.</p>
                <p className="text-xs text-slate-400 mt-1">Click "Create Exam" to build your first assessment using the question bank.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search questions by keyword..."
                value={qSearch}
                onChange={e => setQSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={qDifficulty}
                onChange={e => setQDifficulty(e.target.value)}
                className="py-2 px-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Question Title & Options</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Marks</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredQuestions.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-medium text-slate-900 max-w-md">
                      <div>{q.title}</div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2">
                        {q.options.map((opt, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded ${
                            q.correct_answers.includes(String(i)) ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {String.fromCharCode(65 + i)}: {opt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                        {q.question_type === 'mcq_multiple' ? 'MCQ (Multiple Choice)' : 'MCQ (Single Choice)'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                        q.difficulty === 'Medium' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{q.marks} pts</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleOpenQModal(q)} className="text-slate-400 hover:text-blue-600 p-1">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => {
                        if (window.confirm('Delete this question from the bank?')) {
                          deleteQMutation.mutate(q.id);
                        }
                      }} className="text-slate-400 hover:text-rose-600 p-1">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">No questions found in question bank.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGN & SCHEDULE */}
      {activeTab === 'assign' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Send size={18} className="text-blue-600" />
              <span>Assignment Settings</span>
            </h3>
            <p className="text-xs text-slate-500">Select an assessment and configure deadline to assign to selected employees.</p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Select Exam / Assessment</label>
                <select
                  value={selectedAssignExam}
                  onChange={e => setSelectedAssignExam(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <option value="">-- Choose an Assessment --</option>
                  {assessments.filter(a => a.status === 'published').map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({a.questions_count} Qs, {a.duration_minutes} mins)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Optional Due Date</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={e => setAssignDueDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-3">
                  <span>Selected Employees:</span>
                  <span className="font-bold text-blue-600">{selectedEmps.size}</span>
                </div>
                <button
                  onClick={() => {
                    if (!selectedAssignExam) return toast.error('Please select an assessment first');
                    if (selectedEmps.size === 0) return toast.error('Please select at least one employee');
                    assignMutation.mutate({ examId: selectedAssignExam, employeeIds: selectedEmps, dueDate: assignDueDate });
                  }}
                  disabled={assignMutation.isPending || !selectedAssignExam || selectedEmps.size === 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {assignMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>Assign Assessment</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-bold text-slate-900 text-lg">Select Employees ({filteredEmps.length})</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAllEmps}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  {selectedEmps.size === filteredEmps.length ? 'Deselect All' : 'Select All Filtered'}
                </button>
                <div className="relative w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, dept..."
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[450px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
              {filteredEmps.map(emp => {
                const isSelected = selectedEmps.has(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmpSelection(emp.id)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-slate-400">{emp.email} • <span className="font-medium text-slate-600">{emp.department || 'No Dept'}</span></div>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-600">{emp.position || 'Employee'}</span>
                  </div>
                );
              })}
              {filteredEmps.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">No employees match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS & REPORTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {anaLoading ? <PageLoader /> : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Total Assessments</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{analyticsData?.stats?.total_assessments || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Published & Draft</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Total Assigned</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{analyticsData?.stats?.total_assigned || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Employee assignments</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Overall Pass Rate</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{analyticsData?.stats?.overall_pass_rate || 0}%</div>
                  <div className="text-xs text-slate-500 mt-1">Across all completed attempts</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Average Score</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{analyticsData?.stats?.avg_score || 0}%</div>
                  <div className="text-xs text-slate-500 mt-1">Mean percentage score</div>
                </div>
              </div>

              {/* Recent Attempts Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 font-bold text-slate-900 text-lg flex items-center justify-between">
                  <span>Recent Employee Attempts</span>
                  <span className="text-xs font-normal text-slate-400">Showing last 15 submissions</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Employee</th>
                      <th className="p-4">Assessment</th>
                      <th className="p-4">Score</th>
                      <th className="p-4">Percentage</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Completed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {(analyticsData?.recent_attempts || []).map((ra, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-4 font-medium text-slate-900">
                          <div>{ra.firstName} {ra.lastName}</div>
                          <div className="text-xs text-slate-400">{ra.department || 'No Dept'}</div>
                        </td>
                        <td className="p-4 text-slate-700 font-medium">{ra.assessment_title}</td>
                        <td className="p-4 text-slate-600">{ra.total_score} / {ra.max_score}</td>
                        <td className="p-4 font-bold text-slate-800">{ra.percentage}%</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                            ra.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {ra.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            <span>{ra.passed ? 'PASSED' : 'FAILED'}</span>
                          </span>
                        </td>
                        <td className="p-4 text-right text-xs text-slate-400">
                          {new Date(ra.end_time).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(analyticsData?.recent_attempts || []).length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400">No completed assessment attempts recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

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
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
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
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white transition"
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
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white transition"
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
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white font-semibold"
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
                      <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border transition ${
                        isChecked ? 'bg-blue-50/60 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200/80'
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
                          className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-400"
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
                          Question bank is empty. Add questions in Tab 2 first.
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

export default AdminAssessments;
