import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Settings, FileText, Clock, ShieldAlert, Plus, Edit2, Trash2,
  RefreshCw, X, Award
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const BasicInformationRulesPage = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: '',
    duration_minutes: 20,
    passing_percentage: 70,
    max_attempts: 1,
    randomize_questions: true,
    randomize_options: true,
    result_visibility: 'immediate'
  });

  const { data: rulesList = [], isLoading } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      if (editingId) {
        return await api.put(`/admin/assessments/${editingId}`, formData);
      } else {
        return await api.post('/admin/assessments', formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success(editingId ? 'Basic Information & Rules updated!' : 'Basic Information & Rules saved!');
      setShowModal(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save rules');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/admin/assessments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success('Deleted successfully!');
    },
    onError: () => toast.error('Failed to delete')
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      duration_minutes: 20,
      passing_percentage: 70,
      max_attempts: 1,
      randomize_questions: true,
      randomize_options: true,
      result_visibility: 'immediate'
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      duration_minutes: parseInt(item.duration_minutes) || 20,
      passing_percentage: parseInt(item.passing_percentage) || 70,
      max_attempts: parseInt(item.max_attempts) !== undefined ? parseInt(item.max_attempts) : 1,
      randomize_questions: item.randomize_questions === true || item.randomize_questions === 'true',
      randomize_options: item.randomize_options === true || item.randomize_options === 'true',
      result_visibility: item.result_visibility || 'immediate'
    });
    setShowModal(true);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Basic Information & Rules</h1>
          <p className="text-sm text-slate-500">
            Define and manage core assessment rules, timing, grading criteria, and security settings.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Basic Information & Rules
        </button>
      </div>

      {/* Rules List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Passing Criteria</th>
                <th className="px-6 py-4 font-medium">Max Attempts</th>
                <th className="px-6 py-4 font-medium">Result Visibility</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rulesList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock size={15} className="text-slate-400" /> {item.duration_minutes || 30} mins
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {item.passing_percentage || 70}%
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.max_attempts == 0 ? 'Unlimited' : `${item.max_attempts} max`}
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">
                    {item.result_visibility?.replace('_', ' ') || 'Immediate'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Rules"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this rule?')) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Delete Rules"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {rulesList.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Settings size={40} className="text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">No Basic Information & Rules created yet</p>
                      <p className="text-xs mt-1">Click "+ Add Basic Information & Rules" above to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer Modal for Basic Information & Rules */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white shadow-2xl w-full max-w-2xl h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300 animate-in slide-in-from-right">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                <Settings className="text-blue-600" size={22} />
                <span>Basic Information & Rules</span>
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
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Annual Information Security Exam"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-900 placeholder-slate-400 transition"
                  />
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
                      value={form.duration_minutes}
                      onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 10 })}
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
                      value={form.passing_percentage}
                      onChange={e => setForm({ ...form, passing_percentage: parseInt(e.target.value) || 60 })}
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
                    value={form.max_attempts}
                    onChange={e => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })}
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
                    value={form.result_visibility}
                    onChange={e => setForm({ ...form, result_visibility: e.target.value })}
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
                      value={form.randomize_questions ? 'yes' : 'no'}
                      onChange={e => setForm({ ...form, randomize_questions: e.target.value === 'yes' })}
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
                      value={form.randomize_options ? 'yes' : 'no'}
                      onChange={e => setForm({ ...form, randomize_options: e.target.value === 'yes' })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white font-semibold text-slate-800 transition cursor-pointer"
                    >
                      <option value="no">No (Fixed A,B,C,D)</option>
                      <option value="yes">Yes (Shuffle Choices)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.title.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
                <span>{editingId ? 'Update Rules' : 'Save Rules'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicInformationRulesPage;
