import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Award, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Download, 
  Trash2,
  Calendar, 
  User, 
  Building2, 
  FileText, 
  AlertTriangle, 
  RefreshCw,
  Clock, 
  BarChart2, 
  X, 
  ChevronRight, 
  HelpCircle, 
  ArrowUpRight,
  Shield,
  Layers,
  Sparkles,
  Settings,
  Loader2
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
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

const AssessmentResults = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const { data: attempts = [], isLoading, isFetching } = useQuery({
    queryKey: ['adminAssessmentAttempts'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments/attempts');
      return res.data?.data || res.data || [];
    },
    placeholderData: (previousData) => previousData,
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
    mutationFn: async ({ id }) => {
      await api.delete(`/admin/assessments/attempts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessmentAttempts'] });
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
          <CheckCircle2 className="w-3 h-3" /> Clean Session
        </span>
      );
    }
    switch (reason) {
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 className="w-3 h-3" /> Manual Submission
          </span>
        );
      case 'tab_switch_violation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <AlertTriangle className="w-3 h-3 text-[#b06000]" /> Tab Switch Violation
          </span>
        );
      case 'time_expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Clock className="w-3 h-3" /> Time Expired
          </span>
        );
      case 'page_refresh_or_close':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]">
            <RefreshCw className="w-3 h-3" /> Page Refresh
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] capitalize">
            {reason.replace(/_/g, ' ')}
          </span>
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

  if (isLoading && !attempts.length && !debouncedSearchTerm) return <PageLoader message="Loading Assessment Results..." />;

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
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
            Employee Assessment <span className="font-medium italic text-[#1a73e8]">Results</span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{attempts.length} Evaluated</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Monitor employee scores, pass benchmarks, integrity proctoring logs, and question-by-question breakdowns.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            to="/admin/assessments/management"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Manage Tests</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Evaluated" 
          value={stats.total} 
          subtitle="Submitted exam attempts" 
          icon={FileText} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Overall Pass Rate" 
          value={`${stats.passRate}%`} 
          subtitle={`${stats.passedCount} successful completions`} 
          icon={CheckCircle2} 
          colorTheme="green" 
        />
        <StatCard 
          title="Average Score" 
          value={`${stats.avgScore}%`} 
          subtitle="Across all department tests" 
          icon={BarChart2} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Security Flags" 
          value={stats.violationsCount} 
          subtitle="Tab switches / irregularities" 
          icon={ShieldAlert} 
          colorTheme="amber" 
        />
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        
        {/* Table Filters Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Google Search Bar */}
          <div className="relative w-full md:w-80 shrink-0">
            {isFetching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            )}
            <input
              type="search"
              placeholder="Search employee, email, code or test..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={assessmentFilter}
              onChange={(e) => setAssessmentFilter(e.target.value)}
              className="px-3.5 py-1.5 bg-white border border-[#dadce0] rounded-full text-xs font-semibold text-[#1f1f1f] outline-none cursor-pointer hover:bg-[#f1f3f4] transition-all"
            >
              <option value="all">All Assessments</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-1.5 bg-white border border-[#dadce0] rounded-full text-xs font-semibold text-[#1f1f1f] outline-none cursor-pointer hover:bg-[#f1f3f4] transition-all"
            >
              <option value="all">All Outcomes</option>
              <option value="passed">Passed Only</option>
              <option value="failed">Failed Only</option>
              <option value="violation">Security Flags / Auto-Submits</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto custom-scrollbar relative">
          {isLoading && attempts.length === 0 ? (
            <div className="p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin mb-1" />
              <p className="text-xs">Loading assessment results...</p>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
              <Award className="w-12 h-12 text-[#dadce0] mb-1" />
              <p className="text-sm font-semibold text-[#1f1f1f]">No assessment attempts found</p>
              <p className="text-xs text-[#5f6368]">
                {searchTerm ? "Try adjusting your search term or filter dropdowns." : "No employee attempts have been recorded yet."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Assessment Test</th>
                  <th className="px-5 py-3.5 text-center">Attempt</th>
                  <th className="px-5 py-3.5">Score & %</th>
                  <th className="px-5 py-3.5">Result</th>
                  <th className="px-5 py-3.5">Integrity Audit</th>
                  <th className="px-5 py-3.5 text-right">Submitted Date</th>
                  <th className="px-5 py-3.5 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e7]">
                {filteredAttempts.map((att) => {
                  const scoreVal = att.score ?? att.total_score ?? 0;
                  const maxVal = att.total_marks ?? att.max_score ?? 0;
                  const pct = att.percentage ?? 0;
                  const initials = (att.employee_name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <tr key={att.id} className="hover:bg-[#f8fafd] transition-colors">
                      {/* Employee Profile */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-[#1f1f1f]">
                              {att.employee_name || 'Unknown Employee'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#5f6368] mt-0.5">
                              {att.employee_code && <span>ID: {att.employee_code}</span>}
                              {att.employee_department && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 bg-[#f1f3f4] px-1.5 py-0.2 rounded text-[10px] font-medium text-[#5f6368]">
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
                      <td className="px-5 py-4 font-semibold text-[#1f1f1f] max-w-[200px] truncate">
                        {att.assessment_title || 'Assessment'}
                      </td>

                      {/* Attempt Number */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[#f1f3f4] border border-[#dadce0] text-[#5f6368] rounded-full text-[10px] font-bold">
                          #{att.attempt_number || 1}
                        </span>
                      </td>

                      {/* Score & Percentage */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 w-28">
                          <div className="flex items-baseline justify-between text-xs font-semibold">
                            <span className="text-[#1f1f1f]">{scoreVal} / {maxVal}</span>
                            <span className={pct >= (att.passing_percentage || 50) ? 'text-[#137333]' : 'text-[#c5221f]'}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#f1f3f4] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= (att.passing_percentage || 50) ? 'bg-[#137333]' : 'bg-[#c5221f]'}`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Result Badge */}
                      <td className="px-5 py-4">
                        {att.passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Integrity Audit */}
                      <td className="px-5 py-4">
                        {getSubmitReasonBadge(att.submit_reason)}
                      </td>

                      {/* Submitted Date */}
                      <td className="px-5 py-4 text-right text-[11px] text-[#5f6368] whitespace-nowrap">
                        {att.end_time || att.start_time ? new Date(att.end_time || att.start_time).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedAttempt(att)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc] rounded-full text-xs font-semibold transition-all cursor-pointer"
                            title="View Detailed Evaluation & Answers"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          <button
                            onClick={() => handleResetAttempt(att.id, att.employee_name, att.assessment_title)}
                            className="p-1.5 text-[#5f6368] hover:text-[#c5221f] hover:bg-[#fce8e6] rounded-full transition-all cursor-pointer"
                            title="Reset / Delete Attempt"
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
      {/* Attempt Details Slideover Modal */}
      {selectedAttempt && createPortal(
        <div 
          className="fixed inset-0 z-50 overflow-hidden font-editorial antialiased"
          style={{ fontFamily: "'Newsreader', Georgia, serif" }}
        >
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedAttempt(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300 border-l border-[#e0e3e7]">
              
              {/* Top 4-Color Google Accent Line */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

              {/* Header */}
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedAttempt.employee_name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-[#1f1f1f] font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
                        <span className="font-medium italic text-[#1a73e8]">{selectedAttempt.employee_name}</span>
                      </h3>
                      {selectedAttempt.employee_code && (
                        <span className="px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368] font-mono text-[10px] font-semibold">
                          {selectedAttempt.employee_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5f6368]">
                      {selectedAttempt.assessment_title} • Attempt #{selectedAttempt.attempt_number || 1}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 text-xs">
                
                {/* Score Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] text-center">
                    <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block">Total Score</span>
                    <p className="text-xl font-bold text-[#1f1f1f] mt-1">
                      {selectedAttempt.score ?? selectedAttempt.total_score ?? 0}
                      <span className="text-xs font-normal text-[#5f6368] ml-1">
                        / {selectedAttempt.total_marks ?? selectedAttempt.max_score ?? 0} pts
                      </span>
                    </p>
                  </div>

                  <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] text-center">
                    <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block">Percentage</span>
                    <p className={`text-xl font-bold mt-1 ${selectedAttempt.passed ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                      {selectedAttempt.percentage ?? 0}%
                    </p>
                  </div>

                  <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] text-center">
                    <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block">Result</span>
                    <div className="mt-1 flex justify-center">
                      {selectedAttempt.passed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
                          <XCircle className="w-3.5 h-3.5" /> FAILED
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Session Integrity */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
                    <ShieldAlert className="w-4 h-4 text-[#1a73e8]" />
                    <span>Proctoring & Session Integrity</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#dadce0]">
                    <span className="text-[#5f6368]">Submission Reason / Session Flag:</span>
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
                          <h4 className="text-xs font-semibold text-[#1f1f1f] flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#1a73e8]" />
                            <span>Question-by-Question Evaluation ({breakdownList.length} Questions)</span>
                          </h4>
                        </div>

                        {breakdownList.length === 0 ? (
                          <div className="p-6 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] text-center text-[#5f6368]">
                            Detailed per-question breakdown was not recorded for this attempt.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {breakdownList.map((q, idx) => (
                              <div
                                key={idx}
                                className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                                  q.correct 
                                    ? 'bg-[#e6f4ea]/30 border-[#ceead6]' 
                                    : 'bg-[#fce8e6]/30 border-[#fad2cf]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <div className="mt-0.5">
                                      {q.correct ? (
                                        <CheckCircle2 className="w-4 h-4 text-[#137333] shrink-0" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-[#c5221f] shrink-0" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-[#5f6368] uppercase">Question #{idx + 1}</span>
                                      <p className="font-semibold text-xs text-[#1f1f1f] mt-0.5 leading-relaxed">
                                        {q.title || `Question #${idx + 1}`}
                                      </p>
                                    </div>
                                  </div>

                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                                    q.correct ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'
                                  }`}>
                                    {q.marks_earned || 0} / {q.marks_possible || 1} pts
                                  </span>
                                </div>

                                {/* Answers tags */}
                                <div className="pt-2 border-t border-[#e0e3e7]/60 flex flex-wrap items-center gap-2">
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
                                        <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#dadce0]">
                                          <span className="font-semibold text-[#5f6368]">Selected:</span>
                                          <span className={`font-bold ${formattedAns ? (q.correct ? 'text-[#137333]' : 'text-[#c5221f]') : 'text-[#80868b] italic'}`}>
                                            {formattedAns || 'Skipped'}
                                          </span>
                                        </div>

                                        {!q.correct && formattedCorr && (
                                          <div className="inline-flex items-center gap-1.5 bg-[#e6f4ea] px-2.5 py-1 rounded-xl border border-[#ceead6] text-[#137333]">
                                            <span className="font-semibold">Correct:</span>
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
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-between items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleResetAttempt(selectedAttempt.id, selectedAttempt.employee_name, selectedAttempt.assessment_title)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[#fad2cf] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Attempt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-5 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
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
