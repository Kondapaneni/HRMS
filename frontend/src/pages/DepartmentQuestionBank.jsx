import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  HelpCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  X, 
  Building2, 
  CheckCircle2, 
  Filter, 
  CheckSquare, 
  Disc,
  Search,
  Sparkles,
  Layers,
  Check,
  AlertCircle,
  Loader2
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

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const DepartmentQuestionBank = () => {
  const queryClient = useQueryClient();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [form, setForm] = useState({
    department: 'Engineering',
    question_type: 'mcq_single', // 'mcq_single' or 'mcq_multiple'
    question_text: '',
    options: ['', '', '', ''],
    correct_options: [0] // array of integer indices
  });

  const { data: questions = [], isLoading, isFetching } = useQuery({
    queryKey: ['adminQuestions', selectedDeptFilter, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDeptFilter !== 'All') params.append('department', selectedDeptFilter);
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      
      const url = `/admin/questions?${params.toString()}`;
      const res = await api.get(url);
      return res.data?.data || res.data || [];
    },
    placeholderData: (previousData) => previousData,
  });

  const stats = useMemo(() => {
    const total = questions.length;
    const single = questions.filter(q => q.question_type === 'mcq_single' || !q.question_type).length;
    const multiple = questions.filter(q => q.question_type === 'mcq_multiple').length;
    const depts = new Set(questions.map(q => q.department)).size;
    return { total, single, multiple, depts };
  }, [questions]);

  const saveMutation = useMutation({
    mutationFn: async ({ formData }) => {
      if (editingId) {
        return await api.put(`/admin/questions/${editingId}`, formData);
      } else {
        return await api.post('/admin/questions', formData);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      toast.success(editingId ? 'Question updated successfully!' : 'Question added to bank!');
      if (variables?.closeAfterSave) {
        setShowModal(false);
        resetForm();
      } else {
        const currentDept = form.department;
        const currentType = form.question_type;
        setEditingId(null);
        setForm({
          department: currentDept,
          question_type: currentType,
          question_text: '',
          options: ['', '', '', ''],
          correct_options: [0]
        });
        setShowModal(true);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save question');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/admin/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      toast.success('Question deleted successfully!');
    },
    onError: () => toast.error('Failed to delete question')
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      department: selectedDeptFilter !== 'All' ? selectedDeptFilter : 'Engineering',
      question_type: 'mcq_single',
      question_text: '',
      options: ['', '', '', ''],
      correct_options: [0]
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    let opts = item.options || ['', '', '', ''];
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch (e) { opts = ['', '', '', '']; }
    }
    while (opts.length < 4) opts.push('');

    let cOpts = item.correct_options;
    if (typeof cOpts === 'string') {
      try { cOpts = JSON.parse(cOpts); } catch (e) { cOpts = null; }
    }
    if (!Array.isArray(cOpts) || cOpts.length === 0) {
      cOpts = [parseInt(item.correct_option) || 0];
    }
    cOpts = cOpts.map(i => parseInt(i)).filter(i => !isNaN(i));

    setForm({
      department: item.department || 'Engineering',
      question_type: item.question_type || 'mcq_single',
      question_text: item.question_text || '',
      options: opts.slice(0, 4),
      correct_options: cOpts.length ? cOpts : [0]
    });
    setShowModal(true);
  };

  const handleOptionChange = (index, value) => {
    const newOpts = [...form.options];
    newOpts[index] = value;
    setForm({ ...form, options: newOpts });
  };

  const handleToggleCorrect = (index) => {
    if (form.question_type === 'mcq_single') {
      setForm({ ...form, correct_options: [index] });
    } else {
      const exists = form.correct_options.includes(index);
      const next = exists
        ? form.correct_options.filter(i => i !== index)
        : [...form.correct_options, index].sort();
      setForm({ ...form, correct_options: next });
    }
  };

  const handleTypeChange = (newType) => {
    let nextCorrect = [...form.correct_options];
    if (newType === 'mcq_single' && nextCorrect.length > 1) {
      nextCorrect = [nextCorrect[0] || 0];
    }
    if (nextCorrect.length === 0) {
      nextCorrect = [0];
    }
    setForm({ ...form, question_type: newType, correct_options: nextCorrect });
  };

  if (isLoading && !questions.length && !debouncedSearchQuery) return <PageLoader message="Loading Question Bank..." />;

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Test Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Department Question <span className="font-medium italic text-[#1a73e8]">Bank</span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{questions.length} Items</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Curate objective single and multiple-choice questions for employee competency evaluations.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Question Pool" 
          value={stats.total} 
          subtitle="Total questions loaded" 
          icon={HelpCircle} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Single Choice (MCQ)" 
          value={stats.single} 
          subtitle="Single correct answers" 
          icon={Disc} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Multiple Choice" 
          value={stats.multiple} 
          subtitle="Multi-select questions" 
          icon={CheckSquare} 
          colorTheme="green" 
        />
        <StatCard 
          title="Active Departments" 
          value={stats.depts} 
          subtitle="Covered question groups" 
          icon={Building2} 
          colorTheme="amber" 
        />
      </div>

      {/* Main Content Table Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Department Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
            <button
              onClick={() => setSelectedDeptFilter('All')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedDeptFilter === 'All'
                  ? 'bg-[#1a73e8] text-white shadow-xs'
                  : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
              }`}
            >
              All Departments ({selectedDeptFilter === 'All' ? questions.length : 'All'})
            </button>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDeptFilter(dept)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedDeptFilter === dept
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Google Pill Search */}
          <div className="relative w-full lg:w-72 shrink-0">
            {isFetching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            )}
            <input
              type="search"
              placeholder="Search question text or options..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>
        </div>

        {/* Questions Table */}
        <div className="overflow-x-auto custom-scrollbar relative">
          {isLoading && questions.length === 0 ? (
            <div className="p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin mb-1" />
              <p className="text-xs">Loading question bank...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
              <HelpCircle className="w-12 h-12 text-[#dadce0] mb-1" />
              <p className="text-sm font-semibold text-[#1f1f1f]">No questions found</p>
              <p className="text-xs text-[#5f6368]">
                {searchQuery ? "Try adjusting your search query or department filter." : "Click \"Add Question\" to register your first objective item."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5 w-48">Department & Type</th>
                  <th className="px-5 py-3.5">Question Statement</th>
                  <th className="px-5 py-3.5">Option Choices & Answers</th>
                  <th className="px-5 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e7]">
                {questions.map((item, idx) => {
                  let opts = item.options || [];
                  if (typeof opts === 'string') {
                    try { opts = JSON.parse(opts); } catch (e) { opts = []; }
                  }
                  let cOpts = item.correct_options;
                  if (typeof cOpts === 'string') {
                    try { cOpts = JSON.parse(cOpts); } catch (e) { cOpts = []; }
                  }
                  if (!Array.isArray(cOpts) || cOpts.length === 0) {
                    cOpts = [parseInt(item.correct_option) || 0];
                  }
                  cOpts = cOpts.map(i => parseInt(i));

                  const isMultiple = item.question_type === 'mcq_multiple';

                  return (
                    <tr key={item.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="px-5 py-4 align-top space-y-1.5">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            {item.department}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            isMultiple 
                              ? 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]' 
                              : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                          }`}>
                            {isMultiple ? <CheckSquare className="w-3 h-3" /> : <Disc className="w-3 h-3" />}
                            {isMultiple ? 'Multi-Select' : 'Single MCQ'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top max-w-md">
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-xs font-bold text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded shrink-0">
                            Q{idx + 1}
                          </span>
                          <span className="font-semibold text-xs text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">
                            {item.question_text}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                          {opts.map((optText, oIdx) => {
                            const isCorrect = cOpts.includes(oIdx);
                            return (
                              <div
                                key={oIdx}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center justify-between gap-2 transition-all ${
                                  isCorrect
                                    ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333] font-bold shadow-2xs'
                                    : 'bg-[#f8fafd] border-[#e0e3e7] text-[#5f6368]'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    isCorrect ? 'bg-[#137333] text-white' : 'bg-[#e0e3e7] text-[#5f6368]'
                                  }`}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="truncate" title={optText}>
                                    {optText || <span className="italic text-[#80868b]">Empty option</span>}
                                  </span>
                                </div>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-[#137333] shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right align-top whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#1a73e8] transition-all cursor-pointer"
                            title="Edit Question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this question?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="p-1.5 rounded-full border border-[#fce8e6] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] transition-all cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slideover Right Drawer (createPortal) */}
      {showModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm font-editorial antialiased"
          style={{ fontFamily: "'Newsreader', Georgia, serif" }}
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-2xl h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
          >
            {/* Top 4-Color Google Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Question Bank</span>
                </div>
                <h2 className="text-xl font-medium text-[#1f1f1f]" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
                  {editingId ? (
                    <>Edit <span className="font-medium italic text-[#1a73e8]">Department Question</span></>
                  ) : (
                    <>Add Question to <span className="font-medium italic text-[#1a73e8]">Bank</span></>
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 text-xs">
                
                {/* Department & Type */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
                    <Building2 className="w-4 h-4 text-[#1a73e8]" />
                    <span>Department & Classification</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                      Target Department *
                    </label>
                    <select
                      value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none cursor-pointer transition-all"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                      Question Type *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => handleTypeChange('mcq_single')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          form.question_type === 'mcq_single'
                            ? 'bg-[#e8f0fe] border-[#4285F4] text-[#1a73e8] font-bold shadow-2xs'
                            : 'bg-white border-[#e0e3e7] text-[#5f6368] hover:border-[#4285F4]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q_type"
                          checked={form.question_type === 'mcq_single'}
                          onChange={() => handleTypeChange('mcq_single')}
                          className="mt-0.5 text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5 text-[#1f1f1f]">
                            <Disc className="w-3.5 h-3.5 text-[#1a73e8]" />
                            <span>Single Correct (MCQ)</span>
                          </div>
                          <p className="text-[11px] text-[#5f6368] font-normal mt-0.5">
                            Candidates select exactly 1 correct option.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => handleTypeChange('mcq_multiple')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          form.question_type === 'mcq_multiple'
                            ? 'bg-[#f3e8fd] border-[#8430ce] text-[#8430ce] font-bold shadow-2xs'
                            : 'bg-white border-[#e0e3e7] text-[#5f6368] hover:border-[#8430ce]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q_type"
                          checked={form.question_type === 'mcq_multiple'}
                          onChange={() => handleTypeChange('mcq_multiple')}
                          className="mt-0.5 text-[#8430ce] focus:ring-[#8430ce] cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5 text-[#1f1f1f]">
                            <CheckSquare className="w-3.5 h-3.5 text-[#8430ce]" />
                            <span>Multiple Correct</span>
                          </div>
                          <p className="text-[11px] text-[#5f6368] font-normal mt-0.5">
                            One or more options can be valid.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
                    <HelpCircle className="w-4 h-4 text-[#1a73e8]" />
                    <span>Question Statement</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                      Question Text *
                    </label>
                    <textarea
                      rows={3}
                      value={form.question_text}
                      onChange={e => setForm({ ...form, question_text: e.target.value })}
                      placeholder="Type the objective question statement here..."
                      className="w-full p-3.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-medium text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all resize-y"
                    />
                  </div>
                </div>

                {/* 4 Options & Correct Answers */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#1f1f1f]">
                      <CheckCircle2 className="w-4 h-4 text-[#137333]" />
                      <span>Answer Choices (Click row to toggle correct answer)</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      form.question_type === 'mcq_multiple'
                        ? 'text-[#8430ce] bg-[#f3e8fd] border border-[#e9d5ff]'
                        : 'text-[#137333] bg-[#e6f4ea] border border-[#ceead6]'
                    }`}>
                      {form.question_type === 'mcq_multiple' ? 'Multiple allowed' : 'Single radio choice'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {form.options.map((opt, idx) => {
                      const isCorrect = form.correct_options.includes(idx);
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleCorrect(idx)}
                          className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            isCorrect
                              ? 'bg-[#e6f4ea] border-[#ceead6] shadow-2xs'
                              : 'bg-white border-[#e0e3e7] hover:border-[#4285F4]'
                          }`}
                        >
                          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {form.question_type === 'mcq_single' ? (
                              <input
                                type="radio"
                                name="correct_option_radio"
                                checked={isCorrect}
                                onChange={() => handleToggleCorrect(idx)}
                                className="w-4 h-4 text-[#137333] focus:ring-[#137333] cursor-pointer"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isCorrect}
                                onChange={() => handleToggleCorrect(idx)}
                                className="w-4 h-4 rounded text-[#8430ce] focus:ring-[#8430ce] cursor-pointer"
                              />
                            )}
                          </div>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect ? 'bg-[#137333] text-white shadow-xs' : 'bg-[#f1f3f4] text-[#5f6368]'
                          }`}>
                            {letter}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Option ${letter}`}
                            className="flex-1 px-3 py-1.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-medium text-[#1f1f1f] placeholder:text-[#5f6368] outline-none"
                          />
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-[#137333] bg-white border border-[#ceead6] px-2 py-0.5 rounded-full shrink-0">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {form.correct_options.length === 0 && (
                    <p className="text-xs font-bold text-[#c5221f] bg-[#fce8e6] border border-[#fad2cf] p-2 rounded-xl text-center">
                      Please select at least one correct option answer!
                    </p>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveMutation.mutate({ formData: form, closeAfterSave: true })}
                  disabled={
                    saveMutation.isPending ||
                    !form.question_text.trim() ||
                    form.options.some(o => !o.trim()) ||
                    form.correct_options.length === 0
                  }
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer disabled:opacity-50"
                >
                  Save & Close
                </button>
                <button
                  type="button"
                  onClick={() => saveMutation.mutate({ formData: form, closeAfterSave: false })}
                  disabled={
                    saveMutation.isPending ||
                    !form.question_text.trim() ||
                    form.options.some(o => !o.trim()) ||
                    form.correct_options.length === 0
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {saveMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{editingId ? 'Update & Add Another' : 'Save & Add Next'}</span>
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DepartmentQuestionBank;
