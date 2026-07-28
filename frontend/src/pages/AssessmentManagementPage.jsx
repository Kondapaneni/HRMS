import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, Eye, Shield, Clock, Award, Building2,
  CheckCircle2, FileText, AlertCircle, HelpCircle, Disc, CheckSquare, Sparkles, X, XCircle, Calendar
} from 'lucide-react';

const renderBooleanBadge = (val) => val ? (
  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
    <span>Yes</span>
  </span>
) : (
  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/60 shadow-2xs">
    <XCircle size={13} className="text-rose-500 shrink-0" />
    <span>No</span>
  </span>
);
import PageLoader from '../components/PageLoader';

const AssessmentManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAssessmentForRules, setSelectedAssessmentForRules] = useState(null);

  // Fetch all assessments
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/assessments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success('Assessment deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete assessment');
    }
  });

  const handleDelete = (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header - Matching Question Bank Page Ref */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Assessment Management</h1>
          <p className="text-sm text-slate-500">
            Create and manage assessments by linking questions from the bank and defining unique timing, grading, and security rules.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => navigate('/admin/assessments/results')}
            className="inline-flex items-center justify-center rounded-md text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4 py-2 transition-colors shadow-2xs cursor-pointer"
          >
            <Award className="w-4 h-4 mr-2 text-blue-600" />
            View Employee Results
          </button>
          <button
            onClick={() => navigate('/admin/assessments/create')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assessment
          </button>
        </div>
      </div>

      {/* Empty State */}
      {assessments.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <FileText size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Assessments Created Yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Start by selecting questions from your Department Question Bank and setting up unique timing & security rules.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/assessments/create')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Assessment
          </button>
        </div>
      )}

      {/* Assessments Grid */}
      {assessments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((item) => {
            const qs = Array.isArray(item.selected_questions) ? item.selected_questions : [];
            const totalMarks = qs.length * (parseInt(item.marks_per_question) || 1);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Top Banner inside Card */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                      <Building2 size={13} className="shrink-0" />
                      {item.department || 'General'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status || 'Active'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1" title={item.title}>
                      {item.title}
                    </h3>
                  </div>

                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 bg-slate-50/50 rounded-lg px-3 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Questions</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{qs.length} Qs</div>
                    </div>
                    <div className="border-x border-slate-200/60">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{item.duration_minutes || 30} mins</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Marks</div>
                      <div className="text-sm font-bold text-blue-600 mt-0.5">{totalMarks} pts</div>
                    </div>
                  </div>

                  {/* Security Preview */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.randomize_questions && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                          Shuffle Qs
                        </span>
                      )}
                      {item.assessment_date && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded flex items-center gap-1">
                          <Calendar size={10} />
                          <span>Date: {item.assessment_date}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedAssessmentForRules(item)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1.5 px-2 hover:bg-blue-50 rounded-md transition cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>View Rules & Qs</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/admin/assessments/edit/${item.id}`)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition cursor-pointer"
                      title="Edit Assessment & Rules"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 text-slate-600 hover:text-rose-600 hover:bg-white rounded-md transition cursor-pointer"
                      title="Delete Assessment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* SIDE MODAL: VIEW UNIQUE BASIC INFORMATION & RULES */}
      {/* ========================================================= */}
      {selectedAssessmentForRules && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white shadow-2xl w-full max-w-2xl h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300 animate-in slide-in-from-right">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-600 text-white rounded-xl"><FileText size={20} /></span>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedAssessmentForRules.title}</h3>
                  <p className="text-xs text-slate-500">Unique Assessment Rules & Linked Questions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssessmentForRules(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
              >
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700 divide-y divide-slate-100">
              {/* Section 1: Basic Info */}
              <div className="pt-2 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-bold text-slate-900 text-base mt-0.5">{selectedAssessmentForRules.department || 'General'}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Assessment Date</span>
                  <p className="font-bold text-slate-900 text-base mt-0.5 flex items-center gap-1.5">
                    {selectedAssessmentForRules.assessment_date ? (
                      <>
                        <Calendar size={15} className="text-indigo-600" />
                        <span className="text-indigo-700">{selectedAssessmentForRules.assessment_date}</span>
                      </>
                    ) : (
                      <span className="text-slate-500 font-normal">Anytime Access</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Section 2: Timing & Grading */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Duration</span>
                  <p className="font-bold text-slate-900 text-base mt-0.5">{selectedAssessmentForRules.duration_minutes || 30} Mins</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Pass Percentage</span>
                  <p className="font-bold text-emerald-600 text-base mt-0.5">{selectedAssessmentForRules.passing_percentage || 70}%</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Marks / Question</span>
                  <p className="font-bold text-blue-600 text-base mt-0.5">{selectedAssessmentForRules.marks_per_question || 1} Pts</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Max Attempts</span>
                  <p className="font-bold text-slate-900 text-base mt-0.5">{selectedAssessmentForRules.max_attempts || 1} Attempt(s)</p>
                </div>
              </div>

              {/* Section 3: Security Controls */}
              <div className="pt-6 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Security & Display Controls</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Shuffle Questions</span>
                    {renderBooleanBadge(selectedAssessmentForRules.randomize_questions)}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Shuffle Options</span>
                    {renderBooleanBadge(selectedAssessmentForRules.randomize_options)}
                  </div>

                </div>
              </div>

              {/* Section 4: Linked Questions Preview */}
              <div className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Linked Questions ({Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0})
                  </span>
                  <span className="text-xs font-bold text-blue-600">
                    Total: {(Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0) * (selectedAssessmentForRules.marks_per_question || 1)} Marks
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {Array.isArray(selectedAssessmentForRules.selected_questions) && selectedAssessmentForRules.selected_questions.length > 0 ? (
                    selectedAssessmentForRules.selected_questions.map((q, idx) => {
                      const qText = typeof q === 'object' ? q.question_text : `Question ID: ${q}`;
                      const qType = typeof q === 'object' ? q.question_type : 'mcq_single';
                      return (
                        <div key={idx} className="p-3 text-xs flex items-start gap-2 bg-white">
                          <span className="font-mono text-slate-400 font-bold shrink-0">#{idx + 1}.</span>
                          <span className="flex-1 font-medium text-slate-800">{qText}</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase text-slate-600 shrink-0">
                            {qType === 'mcq_multiple' ? 'Multi Correct' : 'Single Correct'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">No questions linked.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  const targetId = selectedAssessmentForRules.id;
                  setSelectedAssessmentForRules(null);
                  navigate(`/admin/assessments/edit/${targetId}`);
                }}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Edit size={14} />
                <span>Edit This Assessment & Rules</span>
              </button>
              <button
                onClick={() => setSelectedAssessmentForRules(null)}
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentManagementPage;
