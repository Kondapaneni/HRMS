import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  HelpCircle, Plus, Edit2, Trash2, RefreshCw, X, Building2, CheckCircle2, Filter, CheckSquare, Disc
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

const DepartmentQuestionBank = () => {
  const queryClient = useQueryClient();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    department: 'Engineering',
    question_type: 'mcq_single', // 'mcq_single' or 'mcq_multiple'
    question_text: '',
    options: ['', '', '', ''],
    correct_options: [0] // array of integer indices
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['adminQuestions', selectedDeptFilter],
    queryFn: async () => {
      const url = selectedDeptFilter === 'All' 
        ? '/admin/questions' 
        : `/admin/questions?department=${encodeURIComponent(selectedDeptFilter)}`;
      const res = await api.get(url);
      return res.data?.data || res.data || [];
    }
  });

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
        // Keep modal open and reset fields for the next question
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

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Department Question Bank</h1>
          <p className="text-sm text-slate-500">
            Create and manage department-specific objective questions. Select whether questions have a single or multiple correct options.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Department Question
        </button>
      </div>

      {/* Department Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-2 shrink-0">
          <Filter size={13} /> Filter Dept:
        </span>
        <button
          onClick={() => setSelectedDeptFilter('All')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedDeptFilter === 'All'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Departments ({selectedDeptFilter === 'All' ? questions.length : 'All'})
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

      {/* Questions Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium w-52">Department & Type</th>
                <th className="px-6 py-4 font-medium">Question</th>
                <th className="px-6 py-4 font-medium">Options & Answers</th>
                <th className="px-6 py-4 font-medium text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
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
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 align-top space-y-1.5">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                          <Building2 size={13} className="shrink-0" />
                          {item.department}
                        </span>
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isMultiple 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {isMultiple ? <CheckSquare size={11} /> : <Disc size={11} />}
                          {isMultiple ? 'Multiple Correct' : 'Single Correct'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-semibold align-top max-w-md">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 font-mono text-xs mt-0.5">Q{idx + 1}.</span>
                        <span className="whitespace-pre-wrap">{item.question_text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                        {opts.map((optText, oIdx) => {
                          const isCorrect = cOpts.includes(oIdx);
                          return (
                            <div
                              key={oIdx}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-between gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="truncate" title={optText}>{optText || <span className="italic text-slate-400">Empty option</span>}</span>
                              </div>
                              {isCorrect && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Question"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this question?')) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {questions.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <HelpCircle size={44} className="text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700 text-base">No questions found for {selectedDeptFilter === 'All' ? 'any department' : selectedDeptFilter}</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Click "+ Add Department Question" above to create department-specific objective questions.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer Modal for Create / Edit Question */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white shadow-2xl w-full max-w-2xl h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300 animate-in slide-in-from-right">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                <HelpCircle className="text-blue-600" size={22} />
                <span>{editingId ? 'Edit Department Question' : 'Add Question to Department'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
              >
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              {/* Card 1: Department & Question Type */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Building2 size={16} /></span>
                  <span>Department & Question Type</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Link Question to Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white font-bold text-slate-900 transition cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Select Question Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => handleTypeChange('mcq_single')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        form.question_type === 'mcq_single'
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q_type"
                        checked={form.question_type === 'mcq_single'}
                        onChange={() => handleTypeChange('mcq_single')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-sm font-bold flex items-center gap-1.5">
                          <Disc size={15} className="text-blue-600" />
                          <span>Single Correct</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          Only 1 option can be chosen as correct.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleTypeChange('mcq_multiple')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        form.question_type === 'mcq_multiple'
                          ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q_type"
                        checked={form.question_type === 'mcq_multiple'}
                        onChange={() => handleTypeChange('mcq_multiple')}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-sm font-bold flex items-center gap-1.5">
                          <CheckSquare size={15} className="text-purple-600" />
                          <span>Multiple Correct</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          More than 1 option can be chosen as correct.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Question Text */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><HelpCircle size={16} /></span>
                  <span>Question Text</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Question Statement <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={form.question_text}
                    onChange={e => setForm({ ...form, question_text: e.target.value })}
                    placeholder="Enter the objective question statement here..."
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium text-slate-900 placeholder-slate-400 transition"
                  />
                </div>
              </div>

              {/* Card 3: 4 Options & Correct Answers */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={16} /></span>
                    <span>Answer Options</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                    form.question_type === 'mcq_multiple'
                      ? 'text-purple-700 bg-purple-50 border border-purple-200'
                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  }`}>
                    {form.question_type === 'mcq_multiple' ? 'Check All Correct Answers' : 'Select Radio Button for Correct Answer'}
                  </span>
                </div>

                <div className="space-y-3">
                  {form.options.map((opt, idx) => {
                    const isCorrect = form.correct_options.includes(idx);
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleCorrect(idx)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          {form.question_type === 'mcq_single' ? (
                            <input
                              type="radio"
                              name="correct_option_radio"
                              checked={isCorrect}
                              onChange={() => handleToggleCorrect(idx)}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isCorrect}
                              onChange={() => handleToggleCorrect(idx)}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          )}
                        </div>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Option ${letter}`}
                          className="flex-1 p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-900 placeholder-slate-400"
                        />
                        {isCorrect && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded shrink-0">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {form.correct_options.length === 0 && (
                  <p className="text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded-lg text-center">
                    Please select at least one correct option!
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
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
                className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
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
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
                <span>{editingId ? 'Update & Add Another' : 'Save & Add Next Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentQuestionBank;
