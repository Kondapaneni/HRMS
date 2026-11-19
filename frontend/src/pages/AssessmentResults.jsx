import React, { useState, useMemo, useEffect } from 'react';
import { useRemoteData, useRemoteTask, useRefreshControl } from '../state/remote.js';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import {
  Award, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Trash2,
  Building2, 
  FileText, 
  AlertTriangle, 
  RefreshCw,
  Clock, 
  BarChart2, 
  X, 
  Layers,
  Settings,
  Loader2
} from 'lucide-react';
import PageLoader from '../components/PageLoader';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

const AssessmentResults = () => {
  const refreshControl = useRefreshControl();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assessmentFilter, setAssessmentFilter] = useState('all');
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch attempts
  const { data: attempts = [], isLoading, isFetching } = useRemoteData({
    scope: ['adminAssessmentAttempts'],
    load: async () => {
      const res = await api.get('/admin/assessments/attempts');
      return res.data?.data || res.data || [];
    },
    pollEveryMs: 30000
  });

  // Fetch assessments for dropdown filter
  const { data: assessments = [] } = useRemoteData({
    scope: ['adminAssessments'],
    load: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  // Delete/Reset mutation
  const deleteMutation = useRemoteTask({
    run: async ({ id }) => {
      await api.delete(`/admin/assessments/attempts/${id}`);
    },
    onSuccess: () => {
      refreshControl.refresh({ scope: ['adminAssessmentAttempts'] });
      toast.success('Attempt record deleted successfully');
      if (selectedAttempt) setSelectedAttempt(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to reset attempt');
    }
  });

  const handleResetAttempt = (id, empName, title) => {
    if (window.confirm(`Are you sure you want to reset and delete this assessment attempt for "${empName}" (${title})?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const getSubmitReasonBadge = (reason) => {
    if (!reason || reason === 'normal' || reason === 'clean') {
      return (
        <StatusBadge variant="success">
          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Clean session
        </StatusBadge>
      );
    }
    switch (reason) {
      case 'manual':
        return (
          <StatusBadge variant="success">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Manual submission
          </StatusBadge>
        );
      case 'tab_switch_violation':
        return (
          <StatusBadge variant="warning">
            <AlertTriangle className="w-3 h-3 mr-1 inline" /> Tab switch violation
          </StatusBadge>
        );
      case 'time_expired':
        return (
          <StatusBadge variant="info">
            <Clock className="w-3 h-3 mr-1 inline" /> Time expired
          </StatusBadge>
        );
      case 'page_refresh_or_close':
        return (
          <StatusBadge variant="danger">
            <RefreshCw className="w-3 h-3 mr-1 inline" /> Page refresh
          </StatusBadge>
        );
      default:
        return (
          <StatusBadge variant="neutral">
            {reason.replace(/_/g, ' ')}
          </StatusBadge>
        );
    }
  };

  const filteredAttempts = useMemo(() => {
    return attempts.filter(att => {
      const q = debouncedSearchTerm.toLowerCase();
      const matchSearch = q === '' ||
        (att.employee_name && att.employee_name.toLowerCase().includes(q)) ||
        (att.employee_email && att.employee_email.toLowerCase().includes(q)) ||
        (att.employee_code && att.employee_code.toString().toLowerCase().includes(q)) ||
        (att.assessment_title && att.assessment_title.toLowerCase().includes(q));

      const matchAssessment = assessmentFilter === 'all' || att.assessment_id === assessmentFilter;

      let matchStatus = true;
      if (statusFilter === 'passed') matchStatus = att.passed === true;
      else if (statusFilter === 'failed') matchStatus = att.passed === false;
      else if (statusFilter === 'violation') matchStatus = att.submit_reason && att.submit_reason !== 'manual' && att.submit_reason !== 'normal' && att.submit_reason !== 'time_expired';

      return matchSearch && matchAssessment && matchStatus;
    });
  }, [attempts, debouncedSearchTerm, statusFilter, assessmentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = attempts.length;
    const passedCount = attempts.filter(a => a.passed).length;
    const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;
    const avgScore = total > 0 ? Math.round(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / total) : 0;
    const violationsCount = attempts.filter(a => a.submit_reason && a.submit_reason !== 'manual' && a.submit_reason !== 'normal' && a.submit_reason !== 'time_expired').length;
    return { total, passedCount, passRate, avgScore, violationsCount };
  }, [attempts]);

  if (isLoading && !attempts.length && !debouncedSearchTerm) return <PageLoader message="Loading assessment results..." />;

  return (
    <div className="space-y-6 pb-12 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
            Employee assessment results
            <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
              {attempts.length} Evaluated
            </span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Monitor employee scores, pass benchmarks, integrity proctoring logs, and question-by-question breakdowns.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link to="/admin/assessments/management">
            <Button variant="secondary">
              <Settings className="w-4 h-4 mr-1 text-[var(--muted)]" />
              <span>Manage tests</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total evaluated" 
          value={stats.total} 
          subtitle="Submitted exam attempts" 
          icon={FileText} 
        />
        <StatCard 
          title="Overall pass rate" 
          value={`${stats.passRate}%`} 
          subtitle={`${stats.passedCount} successful completions`} 
          icon={CheckCircle2} 
        />
        <StatCard 
          title="Average score" 
          value={`${stats.avgScore}%`} 
          subtitle="Across department tests" 
          icon={BarChart2} 
        />
        <StatCard 
          title="Security flags" 
          value={stats.violationsCount} 
          subtitle="Tab switches / irregularities" 
          icon={ShieldAlert} 
        />
      </div>

      {/* Main Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-4 sm:p-5 space-y-4">
        
        {/* Table Filters Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <SearchBar
            placeholder="Search employee, email, code or test..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            isFetching={isFetching}
            wrapperClassName="w-full md:w-80 shrink-0"
          />

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={assessmentFilter}
              onChange={(e) => setAssessmentFilter(e.target.value)}
              className="h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
            >
              <option value="all">All assessments</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
            >
              <option value="all">All outcomes</option>
              <option value="passed">Passed only</option>
              <option value="failed">Failed only</option>
              <option value="violation">Security flags / Auto-submits</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          {isLoading && attempts.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 text-[var(--brand-deep)] animate-spin mb-1" />
              <p className="text-[13px]">Loading assessment results...</p>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
              <Award className="w-12 h-12 text-[var(--muted)]/40 mb-1" />
              <p className="text-[15px] font-medium text-[var(--text)]">No assessment attempts found</p>
              <p className="text-[13px] text-[var(--muted)]">
                {searchTerm ? "Try adjusting your search term or filter dropdowns." : "No employee attempts have been recorded yet."}
              </p>
            </div>
          ) : (
            <table className="w-full text-[13px] text-left">
              <thead className="bg-[var(--surface-alt)] text-[var(--muted)] font-medium text-[12px]">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Assessment test</th>
                  <th className="px-5 py-3.5 text-center">Attempt</th>
                  <th className="px-5 py-3.5">Score & %</th>
                  <th className="px-5 py-3.5">Result</th>
                  <th className="px-5 py-3.5">Integrity audit</th>
                  <th className="px-5 py-3.5 text-right">Submitted date</th>
                  <th className="px-5 py-3.5 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredAttempts.map((att) => {
                  const scoreVal = att.score ?? att.total_score ?? 0;
                  const maxVal = att.total_marks ?? att.max_score ?? 0;
                  const pct = att.percentage ?? 0;
                  const initials = (att.employee_name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <tr key={att.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                      {/* Employee Profile */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-medium text-[11px] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-[13px] text-[var(--text)]">
                              {att.employee_name || 'Unknown Employee'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] mt-0.5">
                              {att.employee_code && <span>ID: {att.employee_code}</span>}
                              {att.employee_department && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 bg-[var(--surface-alt)] px-1.5 py-0.2 rounded text-[10px] font-medium text-[var(--muted)]">
                                    <Building2 className="w-2.5 h-2.5" />
                                    {att.employee_department}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assessment Title */}
                      <td className="px-5 py-4 font-medium text-[var(--text)] max-w-[200px] truncate">
                        {att.assessment_title || 'Assessment'}
                      </td>

                      {/* Attempt Number */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[var(--surface-alt)] text-[var(--muted)] rounded-full text-[11px] font-medium">
                          #{att.attempt_number || 1}
                        </span>
                      </td>

                      {/* Score & Percentage */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 w-28">
                          <div className="flex items-baseline justify-between text-[12px] font-medium">
                            <span className="text-[var(--text)]">{scoreVal} / {maxVal}</span>
                            <span className={pct >= (att.passing_percentage || 50) ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--line)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= (att.passing_percentage || 50) ? 'bg-[var(--success-text)]' : 'bg-[var(--danger-text)]'}`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Result Badge */}
                      <td className="px-5 py-4">
                        <StatusBadge variant={att.passed ? 'success' : 'danger'}>
                          {att.passed ? 'Passed' : 'Failed'}
                        </StatusBadge>
                      </td>

                      {/* Integrity Audit */}
                      <td className="px-5 py-4">
                        {getSubmitReasonBadge(att.submit_reason)}
                      </td>

                      {/* Submitted Date */}
                      <td className="px-5 py-4 text-right text-[12px] text-[var(--muted)] whitespace-nowrap">
                        {att.end_time || att.start_time ? new Date(att.end_time || att.start_time).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedAttempt(att)}
                            title="View detailed evaluation & answers"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>Details</span>
                          </Button>
                          <button
                            onClick={() => handleResetAttempt(att.id, att.employee_name, att.assessment_title)}
                            className="w-8 h-8 rounded-full bg-[var(--danger-bg)] text-[var(--danger-text)] hover:opacity-80 flex items-center justify-center transition-opacity cursor-pointer"
                            title="Reset / delete attempt"
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

      {/* Slideover Right Drawer for Detailed Evaluation Sheet */}
      {selectedAttempt && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden antialiased">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedAttempt(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-[var(--surface)] shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
                <div>
                  <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                    ASSESSMENT EVALUATION
                  </span>
                  <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                    {selectedAttempt.employee_name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4 text-[13px]">
                
                {/* Score Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] text-center">
                    <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">Total score</span>
                    <p className="text-[20px] font-medium text-[var(--text)] mt-1">
                      {selectedAttempt.score ?? selectedAttempt.total_score ?? 0}
                      <span className="text-[12px] font-normal text-[var(--muted)] ml-1">
                        / {selectedAttempt.total_marks ?? selectedAttempt.max_score ?? 0} pts
                      </span>
                    </p>
                  </div>

                  <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] text-center">
                    <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">Percentage</span>
                    <p className={`text-[20px] font-medium mt-1 ${selectedAttempt.passed ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>
                      {selectedAttempt.percentage ?? 0}%
                    </p>
                  </div>

                  <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] text-center">
                    <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">Result</span>
                    <div className="mt-2 flex justify-center">
                      <StatusBadge variant={selectedAttempt.passed ? 'success' : 'danger'}>
                        {selectedAttempt.passed ? 'PASSED' : 'FAILED'}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                {/* Session Integrity */}
                <div className="bg-[var(--surface-alt)] rounded-[16px] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
                    <ShieldAlert className="w-4 h-4 text-[var(--brand-deep)]" />
                    <span>Proctoring & session integrity</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-[12px]">
                    <span className="text-[var(--muted)]">Submission reason / session flag:</span>
                    <div>{getSubmitReasonBadge(selectedAttempt.submit_reason)}</div>
                  </div>
                </div>

                {/* Question Breakdown List */}
                <div className="space-y-3">
                  {(() => {
                    const breakdownList = Array.isArray(selectedAttempt.breakdown)
                      ? selectedAttempt.breakdown
                      : Object.values(selectedAttempt.breakdown || {});

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-[13px] font-medium text-[var(--text)] flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[var(--brand-deep)]" />
                            <span>Question-by-question evaluation ({breakdownList.length} questions)</span>
                          </h4>
                        </div>

                        {breakdownList.length === 0 ? (
                          <div className="p-6 bg-[var(--surface-alt)] rounded-[16px] text-center text-[var(--muted)]">
                            Detailed per-question breakdown was not recorded for this attempt.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {breakdownList.map((q, idx) => (
                              <div
                                key={idx}
                                className={`p-4 rounded-[16px] transition-all space-y-2.5 ${
                                  q.correct 
                                    ? 'bg-[var(--success-bg)]' 
                                    : 'bg-[var(--danger-bg)]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <div className="mt-0.5">
                                      {q.correct ? (
                                        <CheckCircle2 className="w-4 h-4 text-[var(--success-text)] shrink-0" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-[var(--danger-text)] shrink-0" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-medium text-[var(--muted)] uppercase">Question #{idx + 1}</span>
                                      <p className="font-medium text-[13px] text-[var(--text)] mt-0.5 leading-relaxed">
                                        {q.title || `Question #${idx + 1}`}
                                      </p>
                                    </div>
                                  </div>

                                  <StatusBadge variant={q.correct ? 'success' : 'danger'}>
                                    {q.marks_earned || 0} / {q.marks_possible || 1} pts
                                  </StatusBadge>
                                </div>

                                {/* Answers tags */}
                                <div className="pt-2 border-t border-[var(--line)]/60 flex flex-wrap items-center gap-2">
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
                                        <div className="inline-flex items-center gap-1.5 bg-[var(--surface)] px-2.5 py-1 rounded-[8px]">
                                          <span className="font-medium text-[var(--muted)]">Selected:</span>
                                          <span className={`font-medium ${formattedAns ? (q.correct ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]') : 'text-[var(--muted)] italic'}`}>
                                            {formattedAns || 'Skipped'}
                                          </span>
                                        </div>

                                        {!q.correct && formattedCorr && (
                                          <div className="inline-flex items-center gap-1.5 bg-[var(--success-bg)] px-2.5 py-1 rounded-[8px] text-[var(--success-text)]">
                                            <span className="font-medium">Correct:</span>
                                            <span className="font-bold">{formattedCorr}</span>
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

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-between items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleResetAttempt(selectedAttempt.id, selectedAttempt.employee_name, selectedAttempt.assessment_title)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#D64550] hover:bg-[#b83540] rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Reset Attempt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AssessmentResults;
