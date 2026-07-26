import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Settings, FileText, Clock, ShieldAlert, ArrowLeft, RefreshCw, X
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentBuilderPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [aForm, setAForm] = useState({
    title: '',
    duration_minutes: 20,
    passing_percentage: 70,
    max_attempts: 1,
    randomize_questions: true,
    randomize_options: true,
    result_visibility: 'immediate'
  });

  // Fetch single assessment when editing
  const { data: existingAssessment, isLoading: loadingAssessment } = useQuery({
    queryKey: ['adminAssessment', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/admin/assessments/${id}`);
      return res.data?.data || res.data || null;
    },
    enabled: !!id
  });

  useEffect(() => {
    if (existingAssessment) {
      setAForm({
        title: existingAssessment.title || '',
        duration_minutes: parseInt(existingAssessment.duration_minutes) || 20,
        passing_percentage: parseInt(existingAssessment.passing_percentage) || 70,
        max_attempts: parseInt(existingAssessment.max_attempts) !== undefined ? parseInt(existingAssessment.max_attempts) : 1,
        randomize_questions: existingAssessment.randomize_questions === true || existingAssessment.randomize_questions === 'true',
        randomize_options: existingAssessment.randomize_options === true || existingAssessment.randomize_options === 'true',
        result_visibility: existingAssessment.result_visibility || 'immediate'
      });
    } else if (!id) {
      setAForm({
        title: '',
        duration_minutes: 20,
        passing_percentage: 70,
        max_attempts: 1,
        randomize_questions: true,
        randomize_options: true,
        result_visibility: 'immediate'
      });
    }
  }, [existingAssessment, id]);

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      if (id) {
        return await api.put(`/admin/assessments/${id}`, formData);
      } else {
        return await api.post('/admin/assessments', formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success(id ? 'Assessment updated successfully!' : 'Assessment created successfully!');
      navigate('/admin/assessments/exams');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save assessment');
    }
  });

  if (loadingAssessment) return <PageLoader />;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/assessments/exams')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs"
        >
          <ArrowLeft size={16} />
          Back to Exams
        </button>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {id ? 'Edit Assessment' : 'New Assessment'}
        </span>
      </div>

      {/* Basic Information & Rules Modal / Card */}
      <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden flex flex-col transform transition-all duration-300">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Settings className="text-blue-600" size={22} />
            <span>Basic Information & Rules</span>
          </h2>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
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
                value={aForm.title}
                onChange={e => setAForm({ ...aForm, title: e.target.value })}
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
                  value={aForm.duration_minutes}
                  onChange={e => setAForm({ ...aForm, duration_minutes: parseInt(e.target.value) || 10 })}
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
                  value={aForm.passing_percentage}
                  onChange={e => setAForm({ ...aForm, passing_percentage: parseInt(e.target.value) || 60 })}
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
                value={aForm.max_attempts}
                onChange={e => setAForm({ ...aForm, max_attempts: parseInt(e.target.value) || 1 })}
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
                value={aForm.result_visibility}
                onChange={e => setAForm({ ...aForm, result_visibility: e.target.value })}
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
                  value={aForm.randomize_questions ? 'yes' : 'no'}
                  onChange={e => setAForm({ ...aForm, randomize_questions: e.target.value === 'yes' })}
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
                  value={aForm.randomize_options ? 'yes' : 'no'}
                  onChange={e => setAForm({ ...aForm, randomize_options: e.target.value === 'yes' })}
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
            onClick={() => navigate('/admin/assessments/exams')}
            className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate(aForm)}
            disabled={saveMutation.isPending || !aForm.title.trim()}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {saveMutation.isPending && <RefreshCw size={16} className="animate-spin" />}
            <span>{id ? 'Update Assessment' : 'Save Assessment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentBuilderPage;
