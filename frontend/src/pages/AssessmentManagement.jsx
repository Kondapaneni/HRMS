import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Shield, 
  Clock, 
  Award, 
  Building2,
  CheckCircle2, 
  FileText, 
  AlertCircle, 
  HelpCircle, 
  Disc, 
  CheckSquare, 
  Sparkles, 
  X, 
  XCircle, 
  Calendar,
  Search,
  Filter,
  FileCheck2,
  Lock,
  Layers,
  ArrowRight
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

const AssessmentManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedAssessmentForRules, setSelectedAssessmentForRules] = useState(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all assessments
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['adminAssessments', selectedDeptFilter, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDeptFilter !== 'All') params.append('department', selectedDeptFilter);
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      
      const url = `/admin/assessments?${params.toString()}`;
      const res = await api.get(url);
      return res.data?.data || res.data || [];
    }
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = assessments.length;
    const active = assessments.filter(a => a.status === 'Active' || !a.status).length;
    const depts = new Set(assessments.map(a => a.department || 'General')).size;
    
    let totalQuestions = 0;
    let sumPass = 0;
    assessments.forEach(a => {
      const qs = Array.isArray(a.selected_questions) ? a.selected_questions.length : 0;
      totalQuestions += qs;
      sumPass += (parseInt(a.passing_percentage) || 70);
    });
    
    const avgPass = total > 0 ? Math.round(sumPass / total) : 70;
    return { total, active, depts, totalQuestions, avgPass };
  }, [assessments]);

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

  if (isLoading && !assessments.length) return <PageLoader message="Loading Assessment Hub..." />;

  return (
    <div className="space-y-6 pb-12">
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
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Assessment Management <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{assessments.length} Tests</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Configure department competency tests, exam timings, grading benchmarks, and anti-cheating controls.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => navigate('/admin/assessments/results')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
          >
            <Award className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Employee Results</span>
          </button>
          
          <button
            onClick={() => navigate('/admin/assessments/create')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active Tests" 
          value={stats.active} 
          subtitle="Available for employees" 
          icon={FileCheck2} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Covered Departments" 
          value={stats.depts} 
          subtitle="Active question categories" 
          icon={Building2} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Total Linked Questions" 
          value={stats.totalQuestions} 
          subtitle="Assigned to assessments" 
          icon={HelpCircle} 
          colorTheme="green" 
        />
        <StatCard 
          title="Avg Pass Benchmark" 
          value={`${stats.avgPass}%`} 
          subtitle="Passing requirement score" 
          icon={Award} 
          colorTheme="amber" 
        />
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
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
              All Departments ({selectedDeptFilter === 'All' ? assessments.length : 'All'})
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            <input
              type="search"
              placeholder="Search assessment title or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>
        </div>

        {/* Empty State */}
        {assessments.length === 0 ? (
          <div className="p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-3">
            <FileCheck2 className="w-12 h-12 text-[#dadce0]" />
            <p className="text-sm font-semibold text-[#1f1f1f]">No assessments found</p>
            <p className="text-xs text-[#5f6368] max-w-sm">
              {searchQuery ? "Try adjusting your search query or department filter." : "Click \"Create Assessment\" to build your first test by linking questions from your bank."}
            </p>
            <button
              onClick={() => navigate('/admin/assessments/create')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Assessment
            </button>
          </div>
        ) : (
          /* Assessments Cards Grid */
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessments.map((item) => {
              const qs = Array.isArray(item.selected_questions) ? item.selected_questions : [];
              const totalMarks = qs.length * (parseInt(item.marks_per_question) || 1);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs hover:shadow-md hover:border-[#dadce0] transition-all duration-200 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 space-y-3.5">
                    {/* Top Row: Department & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        {item.department || 'General'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'Active' || !item.status 
                          ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' 
                          : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                      }`}>
                        {item.status || 'Active'}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#1f1f1f] line-clamp-1" title={item.title}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-[#5f6368] line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* 3-Column Stats Box */}
                    <div className="grid grid-cols-3 gap-1 py-2.5 px-2 bg-[#f8fafd] rounded-xl border border-[#e0e3e7] text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#5f6368] block">Questions</span>
                        <span className="text-xs font-bold text-[#1f1f1f] mt-0.5 block">{qs.length} Qs</span>
                      </div>
                      <div className="border-x border-[#e0e3e7]">
                        <span className="text-[10px] uppercase font-bold text-[#5f6368] block">Duration</span>
                        <span className="text-xs font-bold text-[#1f1f1f] mt-0.5 block">{item.duration_minutes || 30} mins</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#5f6368] block">Pass Mark</span>
                        <span className="text-xs font-bold text-[#137333] mt-0.5 block">{item.passing_percentage || 70}%</span>
                      </div>
                    </div>

                    {/* Security Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.randomize_questions && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]">
                          <Shield className="w-2.5 h-2.5" /> Shuffle Qs
                        </span>
                      )}
                      {item.randomize_options && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]">
                          Shuffle Options
                        </span>
                      )}
                      {item.assessment_date && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                          <Calendar className="w-2.5 h-2.5" /> {item.assessment_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3 bg-[#f8fafd] border-t border-[#e0e3e7] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedAssessmentForRules(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Rules & Qs</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/admin/assessments/edit/${item.id}`)}
                        className="p-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#1a73e8] transition-all cursor-pointer"
                        title="Edit Assessment & Rules"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-full border border-[#fce8e6] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] transition-all cursor-pointer"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slideover Right Drawer for View Rules & Linked Questions */}
      {selectedAssessmentForRules && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedAssessmentForRules(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1f1f1f] line-clamp-1">
                      {selectedAssessmentForRules.title}
                    </h3>
                    <p className="text-xs text-[#5f6368]">
                      Assessment Configuration & Linked Questions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssessmentForRules(null)}
                  className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 text-xs">
                {/* Basic Details Card */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block">Department</span>
                    <p className="text-sm font-semibold text-[#1f1f1f] mt-0.5">
                      {selectedAssessmentForRules.department || 'General'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block">Scheduled Date</span>
                    <p className="text-sm font-semibold text-[#1f1f1f] mt-0.5 flex items-center gap-1">
                      {selectedAssessmentForRules.assessment_date ? (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-[#1a73e8]" />
                          <span>{selectedAssessmentForRules.assessment_date}</span>
                        </>
                      ) : (
                        <span className="text-[#5f6368] font-normal">Anytime Access</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Timing & Grading Specs */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
                    <Clock className="w-4 h-4 text-[#1a73e8]" />
                    <span>Timing & Evaluation Specs</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-[#dadce0]">
                      <span className="text-[10px] font-semibold text-[#5f6368] uppercase block">Duration</span>
                      <p className="text-sm font-bold text-[#1f1f1f] mt-0.5">{selectedAssessmentForRules.duration_minutes || 30} Mins</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#dadce0]">
                      <span className="text-[10px] font-semibold text-[#5f6368] uppercase block">Pass Mark</span>
                      <p className="text-sm font-bold text-[#137333] mt-0.5">{selectedAssessmentForRules.passing_percentage || 70}%</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#dadce0]">
                      <span className="text-[10px] font-semibold text-[#5f6368] uppercase block">Marks / Q</span>
                      <p className="text-sm font-bold text-[#1a73e8] mt-0.5">{selectedAssessmentForRules.marks_per_question || 1} Pts</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#dadce0]">
                      <span className="text-[10px] font-semibold text-[#5f6368] uppercase block">Attempts</span>
                      <p className="text-sm font-bold text-[#1f1f1f] mt-0.5">{selectedAssessmentForRules.max_attempts || 1} Max</p>
                    </div>
                  </div>
                </div>

                {/* Anti-Cheating & Security Controls */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f]">
                    <Shield className="w-4 h-4 text-[#8430ce]" />
                    <span>Security & Anti-Cheating Controls</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-[#dadce0] flex items-center justify-between">
                      <span className="font-semibold text-[#1f1f1f]">Shuffle Questions</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAssessmentForRules.randomize_questions
                          ? 'bg-[#e6f4ea] text-[#137333]'
                          : 'bg-[#f1f3f4] text-[#5f6368]'
                      }`}>
                        {selectedAssessmentForRules.randomize_questions ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#dadce0] flex items-center justify-between">
                      <span className="font-semibold text-[#1f1f1f]">Shuffle Option Order</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAssessmentForRules.randomize_options
                          ? 'bg-[#e6f4ea] text-[#137333]'
                          : 'bg-[#f1f3f4] text-[#5f6368]'
                      }`}>
                        {selectedAssessmentForRules.randomize_options ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linked Questions List */}
                <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#1f1f1f]">
                      <Layers className="w-4 h-4 text-[#1a73e8]" />
                      <span>Linked Questions ({Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0})</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
                      Total: {(Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0) * (selectedAssessmentForRules.marks_per_question || 1)} Marks
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                    {Array.isArray(selectedAssessmentForRules.selected_questions) && selectedAssessmentForRules.selected_questions.length > 0 ? (
                      selectedAssessmentForRules.selected_questions.map((q, idx) => {
                        const qText = typeof q === 'object' ? q.question_text : `Question ID: ${q}`;
                        const qType = typeof q === 'object' ? q.question_type : 'mcq_single';
                        return (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-[#dadce0] flex items-start gap-2.5">
                            <span className="font-mono text-[11px] font-bold text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="flex-1 font-medium text-[#1f1f1f] leading-relaxed">
                              {qText}
                            </span>
                            <span className="text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] px-2 py-0.5 rounded-full shrink-0 uppercase">
                              {qType === 'mcq_multiple' ? 'Multi' : 'Single'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-[#5f6368]">
                        No questions linked to this assessment yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAssessmentForRules(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = selectedAssessmentForRules.id;
                    setSelectedAssessmentForRules(null);
                    navigate(`/admin/assessments/edit/${targetId}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Assessment</span>
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

export default AssessmentManagement;
