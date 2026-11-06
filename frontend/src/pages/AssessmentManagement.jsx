import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import {
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Shield, 
  Clock, 
  Award, 
  Building2,
  FileText, 
  HelpCircle, 
  Calendar,
  Search,
  FileCheck2,
  Layers,
  Loader2,
  X
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
  const { data: assessments = [], isLoading, isFetching } = useQuery({
    queryKey: ['adminAssessments', selectedDeptFilter, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDeptFilter !== 'All') params.append('department', selectedDeptFilter);
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      
      const url = `/admin/assessments?${params.toString()}`;
      const res = await api.get(url);
      return res.data?.data || res.data || [];
    },
    placeholderData: (previousData) => previousData,
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

  if (isLoading && !assessments.length && !debouncedSearchQuery) return <PageLoader message="Loading assessment hub..." />;

  return (
    <div className="space-y-6 pb-12 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
            Assessment management
            <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
              {assessments.length} Tests
            </span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Configure department competency tests, exam timings, grading benchmarks, and anti-cheating controls.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/assessments/results')}
          >
            <Award className="w-4 h-4 mr-1 text-[var(--brand-deep)]" />
            <span>Employee results</span>
          </Button>
          
          <Button
            variant="primary"
            onClick={() => navigate('/admin/assessments/create')}
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Create assessment</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active tests" 
          value={stats.active} 
          subtitle="Available for employees" 
          icon={FileCheck2} 
        />
        <StatCard 
          title="Covered departments" 
          value={stats.depts} 
          subtitle="Active question categories" 
          icon={Building2} 
        />
        <StatCard 
          title="Linked questions" 
          value={stats.totalQuestions} 
          subtitle="Assigned to assessments" 
          icon={HelpCircle} 
        />
        <StatCard 
          title="Avg pass benchmark" 
          value={`${stats.avgPass}%`} 
          subtitle="Passing requirement score" 
          icon={Award} 
        />
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="rounded-[24px] bg-[var(--surface)] p-4 sm:p-5 space-y-4">
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
              All departments ({selectedDeptFilter === 'All' ? assessments.length : 'All'})
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

          {/* Search Box */}
          <SearchBar
            placeholder="Search assessment title or dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            isFetching={isFetching}
            wrapperClassName="w-full lg:w-72 shrink-0"
          />
        </div>

        {/* Loading / Empty / Content State */}
        {isLoading && assessments.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 text-[var(--brand-deep)] animate-spin mb-1" />
            <p className="text-[13px]">Loading assessments...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-3">
            <FileCheck2 className="w-12 h-12 text-[var(--muted)]/40" />
            <p className="text-[15px] font-medium text-[var(--text)]">No assessments found</p>
            <p className="text-[13px] text-[var(--muted)] max-w-sm">
              {searchQuery ? "Try adjusting your search query or department filter." : "Click \"Create assessment\" to build your first test by linking questions from your bank."}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/admin/assessments/create')}
            >
              <Plus className="w-4 h-4 mr-1" /> Create assessment
            </Button>
          </div>
        ) : (
          /* Assessments Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px]">
            {assessments.map((item) => {
              const qs = Array.isArray(item.selected_questions) ? item.selected_questions : [];

              return (
                <div
                  key={item.id}
                  className="bg-[var(--surface-alt)] rounded-[20px] p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Department & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[9px] text-[12px] font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        {item.department || 'General'}
                      </span>
                      <StatusBadge variant={item.status === 'Active' || !item.status ? 'success' : 'neutral'}>
                        {item.status || 'Active'}
                      </StatusBadge>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-[15px] font-medium text-[var(--text)] line-clamp-1" title={item.title}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-[12px] text-[var(--muted)] line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* 3-Column Stats Box */}
                    <div className="grid grid-cols-3 gap-1 py-2 px-2 bg-[var(--surface)] rounded-[14px] text-center">
                      <div>
                        <span className="text-[10px] uppercase font-medium text-[var(--muted)] block">Questions</span>
                        <span className="text-[13px] font-medium text-[var(--text)] mt-0.5 block">{qs.length} Qs</span>
                      </div>
                      <div className="border-x border-[var(--line)]">
                        <span className="text-[10px] uppercase font-medium text-[var(--muted)] block">Duration</span>
                        <span className="text-[13px] font-medium text-[var(--text)] mt-0.5 block">{item.duration_minutes || 30}m</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-medium text-[var(--muted)] block">Pass mark</span>
                        <span className="text-[13px] font-medium text-[var(--success-text)] mt-0.5 block">{item.passing_percentage || 70}%</span>
                      </div>
                    </div>

                    {/* Security Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.randomize_questions && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-medium bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
                          <Shield className="w-2.5 h-2.5" /> Shuffle Qs
                        </span>
                      )}
                      {item.randomize_options && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-medium bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
                          Shuffle options
                        </span>
                      )}
                      {item.assessment_date && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                          <Calendar className="w-2.5 h-2.5" /> {item.assessment_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedAssessmentForRules(item)}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-deep)] hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect rules & Qs</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/assessments/edit/${item.id}`)}
                        className="w-8 h-8 rounded-full bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit assessment"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="w-8 h-8 rounded-full bg-[var(--danger-bg)] text-[var(--danger-text)] hover:opacity-80 flex items-center justify-center transition-opacity cursor-pointer"
                        title="Delete assessment"
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
        <div className="fixed inset-0 z-50 overflow-hidden antialiased">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedAssessmentForRules(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-[var(--surface)] shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="p-5 border-b border-[var(--line)] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-medium text-[var(--text)] line-clamp-1">
                      {selectedAssessmentForRules.title}
                    </h3>
                    <p className="text-[12px] text-[var(--muted)]">
                      Assessment configuration & linked questions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssessmentForRules(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4 text-[13px]">
                {/* Basic Details Card */}
                <div className="bg-[var(--surface-alt)] rounded-[20px] p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">Department</span>
                    <p className="text-[14px] font-medium text-[var(--text)] mt-0.5">
                      {selectedAssessmentForRules.department || 'General'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">Scheduled date</span>
                    <p className="text-[14px] font-medium text-[var(--text)] mt-0.5 flex items-center gap-1">
                      {selectedAssessmentForRules.assessment_date ? (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-[var(--brand-deep)]" />
                          <span>{selectedAssessmentForRules.assessment_date}</span>
                        </>
                      ) : (
                        <span className="text-[var(--muted)] font-normal">Anytime access</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Timing & Grading Specs */}
                <div className="bg-[var(--surface-alt)] rounded-[20px] p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
                    <Clock className="w-4 h-4 text-[var(--brand-deep)]" />
                    <span>Timing & evaluation specs</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="bg-[var(--surface)] p-3 rounded-[14px]">
                      <span className="text-[10px] font-medium text-[var(--muted)] uppercase block">Duration</span>
                      <p className="text-[14px] font-medium text-[var(--text)] mt-0.5">{selectedAssessmentForRules.duration_minutes || 30}m</p>
                    </div>
                    <div className="bg-[var(--surface)] p-3 rounded-[14px]">
                      <span className="text-[10px] font-medium text-[var(--muted)] uppercase block">Pass mark</span>
                      <p className="text-[14px] font-medium text-[var(--success-text)] mt-0.5">{selectedAssessmentForRules.passing_percentage || 70}%</p>
                    </div>
                    <div className="bg-[var(--surface)] p-3 rounded-[14px]">
                      <span className="text-[10px] font-medium text-[var(--muted)] uppercase block">Marks / Q</span>
                      <p className="text-[14px] font-medium text-[var(--brand-deep)] mt-0.5">{selectedAssessmentForRules.marks_per_question || 1} pts</p>
                    </div>
                    <div className="bg-[var(--surface)] p-3 rounded-[14px]">
                      <span className="text-[10px] font-medium text-[var(--muted)] uppercase block">Attempts</span>
                      <p className="text-[14px] font-medium text-[var(--text)] mt-0.5">{selectedAssessmentForRules.max_attempts || 1} max</p>
                    </div>
                  </div>
                </div>

                {/* Anti-Cheating & Security Controls */}
                <div className="bg-[var(--surface-alt)] rounded-[20px] p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)] text-[13px] font-medium text-[var(--text)]">
                    <Shield className="w-4 h-4 text-[var(--accent-pink-deep)]" />
                    <span>Security & anti-cheating controls</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--surface)] p-3 rounded-[14px] flex items-center justify-between">
                      <span className="font-medium text-[var(--text)]">Shuffle questions</span>
                      <StatusBadge variant={selectedAssessmentForRules.randomize_questions ? 'success' : 'neutral'}>
                        {selectedAssessmentForRules.randomize_questions ? 'Enabled' : 'Disabled'}
                      </StatusBadge>
                    </div>
                    <div className="bg-[var(--surface)] p-3 rounded-[14px] flex items-center justify-between">
                      <span className="font-medium text-[var(--text)]">Shuffle options</span>
                      <StatusBadge variant={selectedAssessmentForRules.randomize_options ? 'success' : 'neutral'}>
                        {selectedAssessmentForRules.randomize_options ? 'Enabled' : 'Disabled'}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                {/* Linked Questions List */}
                <div className="bg-[var(--surface-alt)] rounded-[20px] p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
                      <Layers className="w-4 h-4 text-[var(--brand-deep)]" />
                      <span>Linked questions ({Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0})</span>
                    </div>
                    <span className="text-[11px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                      Total: {(Array.isArray(selectedAssessmentForRules.selected_questions) ? selectedAssessmentForRules.selected_questions.length : 0) * (selectedAssessmentForRules.marks_per_question || 1)} marks
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {Array.isArray(selectedAssessmentForRules.selected_questions) && selectedAssessmentForRules.selected_questions.length > 0 ? (
                      selectedAssessmentForRules.selected_questions.map((q, idx) => {
                        const qText = typeof q === 'object' ? q.question_text : `Question ID: ${q}`;
                        const qType = typeof q === 'object' ? q.question_type : 'mcq_single';
                        return (
                          <div key={idx} className="p-3 bg-[var(--surface)] rounded-[14px] flex items-start gap-2.5">
                            <span className="font-mono text-[11px] font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-1.5 py-0.5 rounded-[6px] shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="flex-1 font-medium text-[13px] text-[var(--text)] leading-relaxed">
                              {qText}
                            </span>
                            <span className="text-[10px] font-medium bg-[var(--surface-alt)] text-[var(--muted)] px-2 py-0.5 rounded-[6px] shrink-0 uppercase">
                              {qType === 'mcq_multiple' ? 'Multi' : 'Single'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-[var(--muted)]">
                        No questions linked to this assessment yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end items-center gap-2.5 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedAssessmentForRules(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const targetId = selectedAssessmentForRules.id;
                    setSelectedAssessmentForRules(null);
                    navigate(`/admin/assessments/edit/${targetId}`);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  <span>Edit assessment</span>
                </Button>
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
