import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, Eye, Shield, Clock, Award, Building2,
  CheckCircle2, FileText, AlertCircle, HelpCircle, Users, Disc, CheckSquare, Sparkles
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const BasicInformationRulesPage = () => {
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
    <div className="space-y-6 p-6 max-w-7xl mx-auto pb-24">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">
              Assessment Management
            </span>
            <span className="text-xs font-bold text-slate-400">• Unique Rules per Assessment</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Created Assessments & Rules</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Each assessment maintains its own unique set of linked objective questions, timing, grading weights, and security parameters.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/assessments/create')}
          className="px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-md flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Plus size={18} />
          <span>+ Create Assessment</span>
        </button>
      </div>

      {/* Empty State */}
      {assessments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4 max-w-2xl mx-auto shadow-2xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Assessments Created Yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Start by selecting questions from your Department Question Bank and setting up unique timing & security rules.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/assessments/create')}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            <span>Create First Assessment</span>
          </button>
        </div>
      )}

      {/* Assessments Grid / Table */}
      {assessments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((item) => {
            const qs = Array.isArray(item.selected_questions) ? item.selected_questions : [];
            const roles = Array.isArray(item.target_roles) ? item.target_roles : [];
            const totalMarks = qs.length * (parseInt(item.marks_per_question) || 1);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Top Banner inside Card */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/60">
                      <Building2 size={13} className="text-blue-600" />
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
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                      {item.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 bg-slate-50/50 rounded-xl px-3 text-center">
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

                  {/* Target Roles & Security Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Users size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold truncate">
                        {roles.length > 0 ? roles.join(', ') : 'All Staff'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.randomize_questions && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                          Shuffle Qs
                        </span>
                      )}
                      {item.prevent_tab_switch && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded">
                          No Tab Switch
                        </span>
                      )}
                      {item.proctored_mode && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded">
                          Proctored
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedAssessmentForRules(item)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1.5 px-2 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>View Rules & Qs</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/admin/assessments/edit/${item.id}`)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition cursor-pointer"
                      title="Edit Assessment & Rules"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
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
      {/* MODAL: VIEW UNIQUE BASIC INFORMATION & RULES FOR ASSESSMENT */}
      {/* ========================================================= */}
      {selectedAssessmentForRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-600 text-white rounded-xl"><FileText size={20} /></span>
                <div>
                  <h3 className="text-base font-bold">{selectedAssessmentForRules.title}</h3>
                  <p className="text-xs text-slate-300">Unique Assessment Rules & Linked Questions</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAssessmentForRules(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 divide-y divide-slate-100">
              {/* Section 1: Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-bold text-slate-900 text-base mt-0.5">{selectedAssessmentForRules.department || 'General'}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Target Roles</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(selectedAssessmentForRules.target_roles) ? selectedAssessmentForRules.target_roles : ['All Staff']).map((r, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded border border-blue-200">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Description</span>
                  <p className="mt-1 text-slate-700">{selectedAssessmentForRules.description || 'No description provided.'}</p>
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

              {/* Section 3: Candidate Instructions */}
              <div className="pt-6 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Candidate Instructions</span>
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl font-mono text-xs text-amber-950 whitespace-pre-wrap">
                  {selectedAssessmentForRules.instructions || 'No special instructions.'}
                </div>
              </div>

              {/* Section 4: Security Controls */}
              <div className="pt-6 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Security & Display Controls</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Shuffle Questions</span>
                    <span className="font-bold">{selectedAssessmentForRules.randomize_questions ? '✅ Yes' : '❌ No'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Shuffle Options</span>
                    <span className="font-bold">{selectedAssessmentForRules.randomize_options ? '✅ Yes' : '❌ No'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Prevent Tab Switch</span>
                    <span className="font-bold">{selectedAssessmentForRules.prevent_tab_switch ? '✅ Yes' : '❌ No'}</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Linked Questions Preview */}
              <div className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Linked Questions ({Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0})
                  </span>
                  <span className="text-xs font-bold text-blue-600">
                    Total: {(Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0) * (selectedAssessmentForRules.marks_per_question || 1)} Marks
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
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

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  const targetId = selectedAssessmentForRules.id;
                  setSelectedAssessmentForRules(null);
                  navigate(`/admin/assessments/edit/${targetId}`);
                }}
                className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit size={14} />
                <span>Edit This Assessment & Rules</span>
              </button>
              <button
                onClick={() => setSelectedAssessmentForRules(null)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
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

export default BasicInformationRulesPage;
