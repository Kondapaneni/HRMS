import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import {
  Award, Search, Filter, ShieldAlert, CheckCircle2, XCircle, Eye, Trash2,
  Calendar, User, Building2, FileText, AlertTriangle, Video, RefreshCw,
  Clock, BarChart2, X, ChevronRight, HelpCircle, ArrowUpRight
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentResultsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assessmentFilter, setAssessmentFilter] = useState('all');
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  // Fetch attempts
  const { data: attempts = [], isLoading, refetch } = useQuery({
    queryKey: ['adminAssessmentAttempts'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments/attempts');
      return res.data?.data || res.data || [];
    },
    refetchInterval: 30000
  });

  // Fetch assessments for dropdown filter
  const { data: assessments = [] } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  // Delete/Reset mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, proctoringVideoUrl }) => {
      if (proctoringVideoUrl && proctoringVideoUrl !== 'UPLOAD_FAILED') {
        try {
          await supabase.storage
            .from('proctoring_videos')
            .remove([proctoringVideoUrl]);
        } catch (err) {
          console.error('Failed to remove proctoring video from storage:', err);
        }
      }
      await api.delete(`/admin/assessments/attempts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessmentAttempts'] });
      toast.success('Attempt record and video deleted successfully');
      if (selectedAttempt) setSelectedAttempt(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to reset attempt');
    }
  });

  const handleResetAttempt = (id, empName, title, proctoringVideoUrl) => {
    if (window.confirm(`Are you sure you want to reset and delete this assessment attempt for "${empName}" (${title})? The recorded proctoring video will also be deleted from storage.`)) {
      deleteMutation.mutate({ id, proctoringVideoUrl });
    }
  };

  const getSubmitReasonBadge = (reason) => {
    if (!reason || reason === 'normal') return null;
    switch (reason) {
      case 'tab_switch_violation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle size={12} className="text-amber-600" />
            Tab Switch Violation
          </span>
        );
      case 'time_expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} />
            Time Expired
          </span>
        );
      case 'page_refresh_or_close':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw size={12} />
            Page Refresh / Close
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            {reason}
          </span>
        );
    }
  };

  const filteredAttempts = useMemo(() => {
    return attempts.filter(att => {
      const matchSearch = searchTerm === '' ||
        (att.employee_name && att.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (att.employee_email && att.employee_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (att.employee_code && att.employee_code.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (att.assessment_title && att.assessment_title.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchAssessment = assessmentFilter === 'all' || att.assessment_id === assessmentFilter;

      let matchStatus = true;
      if (statusFilter === 'passed') matchStatus = att.passed === true;
      else if (statusFilter === 'failed') matchStatus = att.passed === false;
      else if (statusFilter === 'violation') matchStatus = att.submit_reason && att.submit_reason !== 'normal';

      return matchSearch && matchAssessment && matchStatus;
    });
  }, [attempts, searchTerm, statusFilter, assessmentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = attempts.length;
    const passedCount = attempts.filter(a => a.passed).length;
    const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;
    const avgScore = total > 0 ? Math.round(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / total) : 0;
    const violationsCount = attempts.filter(a => a.submit_reason && a.submit_reason !== 'normal').length;
    return { total, passedCount, passRate, avgScore, violationsCount };
  }, [attempts]);

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Employee Assessment Results</h1>
          <p className="text-sm text-slate-500">
            Monitor employee exam performances, review security integrity logs, and inspect detailed question breakdown reports.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center justify-center rounded-md text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-3.5 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className="mr-1.5" />
          Refresh Results
        </button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Evaluated</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Pass Rate</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-extrabold text-emerald-600">{stats.passRate}%</p>
              <span className="text-xs font-medium text-slate-500">({stats.passedCount} passed)</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Score</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.avgScore}%</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Violations</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.violationsCount}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:w-auto">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name, email, code, or assessment title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={assessmentFilter}
              onChange={(e) => setAssessmentFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Assessments</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Results</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
            <option value="violation">Violations / Auto-Submits</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Assessment</th>
                <th className="py-3.5 px-4 text-center">Attempt</th>
                <th className="py-3.5 px-4">Score & %</th>
                <th className="py-3.5 px-4">Result</th>
                <th className="py-3.5 px-4">Security / Integrity</th>
                <th className="py-3.5 px-4 text-right">Submitted At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No assessment results found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((att) => {
                  const scoreVal = att.score ?? att.total_score ?? 0;
                  const maxVal = att.total_marks ?? att.max_score ?? 0;
                  const pct = att.percentage ?? 0;
                  const initials = (att.employee_name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {att.employee_name || 'Unknown Employee'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              {att.employee_code && <span>ID: {att.employee_code}</span>}
                              {att.employee_department && (
                                <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                  <Building2 size={10} />
                                  {att.employee_department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {att.assessment_title || 'Assessment'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                          #{att.attempt_number || 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between text-xs font-bold">
                            <span className="text-slate-900">{scoreVal} / {maxVal} pts</span>
                            <span className={pct >= (att.passing_percentage || 50) ? 'text-emerald-600' : 'text-rose-600'}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= (att.passing_percentage || 50) ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {att.passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={13} className="text-rose-600" />
                            Failed
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getSubmitReasonBadge(att.submit_reason) || (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                              <CheckCircle2 size={12} />
                              Clean Session
                            </span>
                          )}
                          {att.proctoring_video_url && att.proctoring_video_url !== 'UPLOAD_FAILED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAttempt(att);
                              }}
                              title="Click to watch webcam proctoring recording"
                              className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-bold text-xs transition cursor-pointer whitespace-nowrap"
                            >
                              <CheckCircle2 size={13} className="text-purple-600" />
                              Recorded Available
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs text-slate-500 font-normal">
                        {att.end_time || att.start_time ? new Date(att.end_time || att.start_time).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedAttempt(att)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="View Detailed Evaluation & Qs"
                          >
                            <Eye size={14} />
                            Details
                          </button>
                          <button
                            onClick={() => handleResetAttempt(att.id, att.employee_name, att.assessment_title, att.proctoring_video_url)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Reset / Delete Attempt"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================= DETAILED EVALUATION SIDEBAR DRAWER ======================= */}
      {selectedAttempt && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedAttempt(null)}
        >
          <div
            className="w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Drawer Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-base border border-blue-200 shadow-xs">
                  {(selectedAttempt.employee_name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-900">{selectedAttempt.employee_name}</h3>
                    {selectedAttempt.employee_code && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-xs font-semibold">
                        {selectedAttempt.employee_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
                    <span>{selectedAttempt.employee_email}</span>
                    <span>•</span>
                    <span className="text-blue-600 font-bold">{selectedAttempt.assessment_title}</span>
                    <span className="text-slate-400 font-normal">(Attempt #{selectedAttempt.attempt_number || 1})</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              
              {/* Score Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Score</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {selectedAttempt.score ?? selectedAttempt.total_score ?? 0}
                    <span className="text-sm font-medium text-slate-400 ml-1">
                      / {selectedAttempt.total_marks ?? selectedAttempt.max_score ?? 0} pts
                    </span>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Percentage Achieved</p>
                  <p className={`text-2xl font-black mt-1 ${selectedAttempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedAttempt.percentage ?? 0}%
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Result Evaluation</p>
                  <div className="mt-1 flex justify-center">
                    {selectedAttempt.passed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={15} />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={15} />
                        FAILED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Proctoring & Integrity Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert size={15} className="text-blue-600" />
                  Proctoring & Session Integrity Audit
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Submission Reason:</span>
                    <div className="font-bold">
                      {getSubmitReasonBadge(selectedAttempt.submit_reason) || (
                        <span className="text-emerald-600 flex items-center gap-1 font-bold">
                          <CheckCircle2 size={13} />
                          Normal Completion
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Webcam Proctoring:</span>
                    <div className="font-bold">
                      {selectedAttempt.proctoring_video_url && selectedAttempt.proctoring_video_url !== 'UPLOAD_FAILED' ? (
                        <span className="text-purple-700 flex items-center gap-1.5 text-xs font-bold whitespace-nowrap">
                          <CheckCircle2 size={14} className="text-purple-600" />
                          Recorded Available
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No video stream uploaded</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedAttempt.proctoring_video_url && selectedAttempt.proctoring_video_url !== 'UPLOAD_FAILED' && (
                  <div className="mt-4 p-4 bg-purple-50/70 rounded-2xl border border-purple-200 text-slate-900 space-y-3 shadow-xs animate-fade-in">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-purple-950 font-extrabold text-xs">
                        <Video size={16} className="text-purple-600 animate-pulse shrink-0" />
                        <span>Live Session Webcam Recording</span>
                      </div>
                      <a
                        href={selectedAttempt.proctoring_video_url.startsWith('http') ? selectedAttempt.proctoring_video_url : `/Proctoring-Video/${selectedAttempt.proctoring_video_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={selectedAttempt.proctoring_video_url}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                      >
                        <Eye size={13} />
                        Open in New Tab / Download
                      </a>
                    </div>
                    <div className="rounded-xl overflow-hidden bg-slate-950 border border-purple-200 aspect-video flex items-center justify-center max-h-[380px] w-full shadow-inner">
                      <video
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        src={selectedAttempt.proctoring_video_url.startsWith('http') ? selectedAttempt.proctoring_video_url : `/Proctoring-Video/${selectedAttempt.proctoring_video_url}`}
                      >
                        Your browser does not support HTML5 webcam video playback.
                      </video>
                    </div>
                  </div>
                )}
              </div>

              {/* Question Breakdown Section */}
              <div className="space-y-3">
                {(() => {
                  const breakdownList = Array.isArray(selectedAttempt.breakdown)
                    ? selectedAttempt.breakdown
                    : Object.values(selectedAttempt.breakdown || {});
                  
                  return (
                    <>
                      <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Award size={15} className="text-blue-600" />
                        Question-by-Question Evaluation ({breakdownList.length} Questions)
                      </h4>

                      {breakdownList.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
                          Detailed question breakdown was not recorded or is hidden for this attempt.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {breakdownList.map((q, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                q.correct ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950' : 'bg-rose-50/40 border-rose-200/80 text-rose-950'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="mt-0.5">
                                    {q.correct ? (
                                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                    ) : (
                                      <XCircle size={18} className="text-rose-600 shrink-0" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-60">Question {idx + 1}</p>
                                    <p className="font-bold text-sm text-slate-900 mt-0.5">{q.title || `Question #${idx + 1}`}</p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                                    q.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {q.marks_earned || 0} / {q.marks_possible || 1} pts
                                  </span>
                                </div>
                              </div>

                              {/* Display Employee Selected Answer & Correct Answer */}
                              <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2.5 text-xs font-medium">
                                {(() => {
                                  const rawAns = q.selected_answer ?? q.answer ?? q.user_answer;
                                  let formattedAns = null;
                                  if (rawAns !== undefined && rawAns !== null && rawAns !== '') {
                                    if (Array.isArray(rawAns)) {
                                      if (rawAns.length > 0) formattedAns = rawAns.join(', ');
                                    } else {
                                      formattedAns = String(rawAns);
                                    }
                                  }

                                  const rawCorr = q.correct_answers ?? q.correct_answer;
                                  let formattedCorr = null;
                                  if (rawCorr !== undefined && rawCorr !== null && rawCorr !== '') {
                                    if (Array.isArray(rawCorr)) {
                                      if (rawCorr.length > 0) formattedCorr = rawCorr.join(', ');
                                    } else {
                                      formattedCorr = String(rawCorr);
                                    }
                                  }

                                  return (
                                    <>
                                      <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                                        <span className="font-bold text-slate-500">Employee Selected:</span>
                                        <span className={`font-black ${formattedAns ? (q.correct ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400 italic'}`}>
                                          {formattedAns || 'No answer selected / Skipped'}
                                        </span>
                                      </div>

                                      {!q.correct && formattedCorr && (
                                        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 text-emerald-900">
                                          <span className="font-bold text-emerald-700">Correct Answer:</span>
                                          <span className="font-black text-emerald-800">
                                            {formattedCorr}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                )}
              </>
            );
          })()}
        </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => handleResetAttempt(selectedAttempt.id, selectedAttempt.employee_name, selectedAttempt.assessment_title, selectedAttempt.proctoring_video_url)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                Reset Employee Attempt
              </button>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentResultsPage;
