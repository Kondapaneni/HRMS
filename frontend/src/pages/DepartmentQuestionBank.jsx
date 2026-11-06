import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import {
  HelpCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  X, 
  Building2, 
  CheckCircle2, 
  CheckSquare, 
  Disc,
  Search,
  Sparkles,
  Loader2
} from 'lucide-react';
import PageLoader from '../components/PageLoader';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
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

  if (isLoading && !questions.length && !debouncedSearchQuery) return <PageLoader message="Loading question bank..." />;

  return (
    <div className="space-y-6 pb-12 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
            Department question bank
            <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
              {questions.length} Items
            </span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Curate objective single and multiple-choice questions for employee competency evaluations.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1" /> Add question
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Question pool" 
          value={stats.total} 
          subtitle="Total questions loaded" 
          icon={HelpCircle} 
        />
        <StatCard 
          title="Single choice (MCQ)" 
          value={stats.single} 
          subtitle="Single correct answers" 
          icon={Disc} 
        />
        <StatCard 
          title="Multiple choice" 
          value={stats.multiple} 
          subtitle="Multi-select questions" 
          icon={CheckSquare} 
        />
        <StatCard 
          title="Active departments" 
          value={stats.depts} 
          subtitle="Covered question groups" 
          icon={Building2} 
        />
      </div>

      {/* Main Content Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-4 sm:p-5 space-y-4">
        {/* Table Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Department Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedDeptFilter('All')}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors shrink-0 cursor-pointer ${
                selectedDeptFilter === 'All'
                  ? 'bg-[var(--ink)] text-white'
                  : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              All departments ({selectedDeptFilter === 'All' ? questions.length : 'All'})
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

          {/* Search Bar */}
          <SearchBar
            placeholder="Search question text or options..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            isFetching={isFetching}
            wrapperClassName="w-full lg:w-72 shrink-0"
          />
        </div>

        {/* Questions Table */}
        <div className="overflow-x-auto">
          {isLoading && questions.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 text-[var(--brand-deep)] animate-spin mb-1" />
              <p className="text-[13px]">Loading question bank...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
              <HelpCircle className="w-12 h-12 text-[var(--muted)]/40 mb-1" />
              <p className="text-[15px] font-medium text-[var(--text)]">No questions found</p>
              <p className="text-[13px] text-[var(--muted)]">
                {searchQuery ? "Try adjusting your search query or department filter." : "Click \"Add question\" to register your first objective item."}
              </p>
            </div>
          ) : (
            <table className="w-full text-[13px] text-left">
              <thead className="bg-[var(--surface-alt)] text-[var(--muted)] font-medium text-[12px]">
                <tr>
                  <th className="px-5 py-3.5 w-48">Department & type</th>
                  <th className="px-5 py-3.5">Question statement</th>
                  <th className="px-5 py-3.5">Option choices & answers</th>
                  <th className="px-5 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
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
                    <tr key={item.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                      <td className="px-5 py-4 align-top space-y-1.5">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[9px] text-[12px] font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            {item.department}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-medium ${
                            isMultiple 
                              ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]' 
                              : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                          }`}>
                            {isMultiple ? <CheckSquare className="w-3 h-3" /> : <Disc className="w-3 h-3" />}
                            {isMultiple ? 'Multi-select' : 'Single MCQ'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top max-w-md">
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-[11px] font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-1.5 py-0.5 rounded-[6px] shrink-0">
                            Q{idx + 1}
                          </span>
                          <span className="font-medium text-[13px] text-[var(--text)] leading-relaxed whitespace-pre-wrap">
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
                                className={`px-2.5 py-1.5 rounded-[12px] text-[12px] font-medium flex items-center justify-between gap-2 transition-all ${
                                  isCorrect
                                    ? 'bg-[var(--success-bg)] text-[var(--success-text)] font-semibold'
                                    : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    isCorrect ? 'bg-[var(--success-text)] text-white' : 'bg-[var(--line)] text-[var(--muted)]'
                                  }`}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="truncate" title={optText}>
                                    {optText || <span className="italic opacity-60">Empty option</span>}
                                  </span>
                                </div>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right align-top whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this question?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="w-8 h-8 rounded-full bg-[var(--danger-bg)] text-[var(--danger-text)] hover:opacity-80 flex items-center justify-center transition-opacity cursor-pointer"
                            title="Delete question"
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

      {/* Slideover Right Drawer */}
      {showModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-[var(--surface)] shadow-2xl w-full max-w-2xl h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  QUESTION BANK
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  {editingId ? 'Edit Department Question' : 'Add Question to Bank'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-[13px]">
              
              {/* Department & Type */}
              <div className="bg-[var(--surface-alt)] rounded-[20px] p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
                  <Building2 className="w-4 h-4 text-[var(--brand-deep)]" />
                  <span>Department & classification</span>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                    Target department *
                  </label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer transition-all"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                    Question type *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => handleTypeChange('mcq_single')}
                      className={`p-3.5 rounded-[14px] cursor-pointer transition-all flex items-start gap-3 ${
                        form.question_type === 'mcq_single'
                          ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)] font-medium'
                          : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface)]/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q_type"
                        checked={form.question_type === 'mcq_single'}
                        onChange={() => handleTypeChange('mcq_single')}
                        className="mt-0.5 text-[var(--brand-deep)] focus:ring-[var(--brand-deep)] cursor-pointer"
                      />
                      <div>
                        <div className="text-[13px] font-medium flex items-center gap-1.5 text-[var(--text)]">
                          <Disc className="w-3.5 h-3.5 text-[var(--brand-deep)]" />
                          <span>Single correct (MCQ)</span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] font-normal mt-0.5">
                          Candidates select exactly 1 correct option.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleTypeChange('mcq_multiple')}
                      className={`p-3.5 rounded-[14px] cursor-pointer transition-all flex items-start gap-3 ${
                        form.question_type === 'mcq_multiple'
                          ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] font-medium'
                          : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface)]/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q_type"
                        checked={form.question_type === 'mcq_multiple'}
                        onChange={() => handleTypeChange('mcq_multiple')}
                        className="mt-0.5 text-[var(--accent-pink-deep)] focus:ring-[var(--accent-pink-deep)] cursor-pointer"
                      />
                      <div>
                        <div className="text-[13px] font-medium flex items-center gap-1.5 text-[var(--text)]">
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-pink-deep)]" />
                          <span>Multiple correct</span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] font-normal mt-0.5">
                          One or more options can be valid.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Question Statement */}
              <div className="bg-[var(--surface-alt)] rounded-[20px] p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
                  <HelpCircle className="w-4 h-4 text-[var(--brand-deep)]" />
                  <span>Question statement</span>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1.5">
                    Question text *
                  </label>
                  <textarea
                    rows={3}
                    value={form.question_text}
                    onChange={e => setForm({ ...form, question_text: e.target.value })}
                    placeholder="Type the objective question statement here..."
                    className="w-full p-3.5 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] font-normal text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all resize-y"
                  />
                </div>
              </div>

              {/* 4 Options & Correct Answers */}
              <div className="bg-[var(--surface-alt)] rounded-[20px] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success-text)]" />
                    <span>Answer choices (Click row to toggle correct answer)</span>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[6px] ${
                    form.question_type === 'mcq_multiple'
                      ? 'text-[var(--accent-pink-deep)] bg-[var(--accent-pink-tint)]'
                      : 'text-[var(--success-text)] bg-[var(--success-bg)]'
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
                        className={`flex items-center gap-3 p-2.5 rounded-[14px] transition-all cursor-pointer ${
                          isCorrect
                            ? 'bg-[var(--success-bg)]'
                            : 'bg-[var(--surface)] hover:bg-[var(--line)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          {form.question_type === 'mcq_single' ? (
                            <input
                              type="radio"
                              name="correct_option_radio"
                              checked={isCorrect}
                              onChange={() => handleToggleCorrect(idx)}
                              className="w-4 h-4 text-[var(--success-text)] focus:ring-[var(--success-text)] cursor-pointer"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isCorrect}
                              onChange={() => handleToggleCorrect(idx)}
                              className="w-4 h-4 rounded text-[var(--accent-pink-deep)] focus:ring-[var(--accent-pink-deep)] cursor-pointer"
                            />
                          )}
                        </div>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          isCorrect ? 'bg-[var(--success-text)] text-white' : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                        }`}>
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Option ${letter}`}
                          className="flex-1 h-9 px-3 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[10px] text-[13px] font-normal text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
                        />
                        {isCorrect && (
                          <span className="text-[11px] font-medium text-[var(--success-text)] bg-[var(--surface)] px-2 py-0.5 rounded-[6px] shrink-0">
                            Correct answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {form.correct_options.length === 0 && (
                  <p className="text-[12px] font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] p-2 rounded-[10px] text-center">
                    Please select at least one correct option answer!
                  </p>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
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
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
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
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
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
