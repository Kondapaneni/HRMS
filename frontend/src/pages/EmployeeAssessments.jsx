import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Award, Clock, CheckCircle2, PlayCircle, 
  Calendar, Building2, BarChart2, ShieldAlert
} from 'lucide-react';

// Memoized Card Component (Requirement 8)
const EmployeeAssessmentCard = React.memo(({ assessment, onStart, todayStr }) => {
  const isCompleted = assessment.attempts_remaining <= 0;
  const inProgressId = assessment.in_progress_attempt_id;
  
  // Date calculations using memoized todayStr prop instead of creating new Date() in render
  const isScheduledToday = assessment.assessment_date && assessment.assessment_date === todayStr;
  const isBlockedByDate = assessment.assessment_date && !isScheduledToday;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex-1 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-800 text-base leading-tight">
            {assessment.title}
          </h3>
          {assessment.has_passed && (
            <span className="shrink-0 bg-emerald-100 text-emerald-700 p-1 rounded-md">
              <CheckCircle2 size={16} />
            </span>
          )}
        </div>
        
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Building2 size={14} className="text-slate-400" />
            <span>{assessment.department || 'General'}</span>
          </div>
          {assessment.assessment_date ? (
            <div className={`flex items-center gap-2 text-xs font-bold ${isScheduledToday ? 'text-indigo-600' : 'text-amber-600'}`}>
              <Calendar size={14} />
              <span>Scheduled: {assessment.assessment_date}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar size={14} className="text-slate-400" />
              <span>Anytime Access</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
              <Clock size={12} className="text-slate-400" />
              {assessment.duration_minutes}m
            </p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-400">Questions</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{assessment.questions_count}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Marks</p>
            <p className="text-xs font-bold text-blue-600 mt-0.5">{assessment.total_marks}</p>
          </div>
        </div>

        {/* Score & Attempts Info */}
        {assessment.attempts_used > 0 && (
          <div className="flex items-center justify-between text-xs font-semibold p-2 bg-blue-50/50 rounded-lg">
            <span className="text-blue-800 flex items-center gap-1.5">
              <BarChart2 size={14} /> 
              Highest Score: {assessment.highest_score !== null ? `${assessment.highest_score}%` : 'N/A'}
            </span>
            <span className="text-slate-500">
              {assessment.attempts_used} / {assessment.max_attempts} attempts
            </span>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        {isCompleted ? (
          <button disabled className="w-full py-2.5 rounded-lg bg-slate-200 text-slate-500 font-bold text-sm cursor-not-allowed">
            Max Attempts Reached
          </button>
        ) : isBlockedByDate ? (
          <button disabled className="w-full py-2.5 rounded-lg bg-amber-100 text-amber-700 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
            <Calendar size={16} /> Scheduled for {assessment.assessment_date}
          </button>
        ) : (
          <button
            onClick={() => onStart(assessment.id, inProgressId)}
            className={`w-full py-2.5 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
              inProgressId 
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            <PlayCircle size={16} />
            {inProgressId ? 'Resume Assessment' : 'Start Assessment'}
          </button>
        )}
      </div>
    </div>
  );
});

// Lightweight Virtualized Grid for large lists (> 20 items) (Requirement 9)
const VirtualizedAssessmentGrid = ({ assessments, onStart, todayStr }) => {
  const containerRef = useRef(null);
  const [scrollState, setScrollState] = useState({ scrollY: 0, height: typeof window !== 'undefined' ? window.innerHeight : 800, cols: 3 });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const cols = width >= 1280 ? 3 : width >= 768 ? 2 : 1;
      setScrollState({
        scrollY: window.scrollY,
        height: window.innerHeight,
        cols
      });
    };

    updateDimensions();
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateDimensions();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const ROW_HEIGHT = 284; // Approximate height of card + gap
  const cols = scrollState.cols;
  const rowCount = Math.ceil(assessments.length / cols);
  const totalHeight = rowCount * ROW_HEIGHT;

  const containerTop = containerRef.current ? containerRef.current.offsetTop : 0;
  const relativeScroll = Math.max(0, scrollState.scrollY - containerTop);
  
  const firstVisibleRow = Math.floor(relativeScroll / ROW_HEIGHT);
  const visibleRows = Math.ceil(scrollState.height / ROW_HEIGHT);

  const startRow = Math.max(0, firstVisibleRow - 3);
  const endRow = Math.min(rowCount, firstVisibleRow + visibleRows + 5);

  const startIndex = startRow * cols;
  const endIndex = Math.min(assessments.length, endRow * cols);

  const visibleAssessments = assessments.slice(startIndex, endIndex);

  return (
    <div ref={containerRef} style={{ height: `${totalHeight}px`, position: 'relative' }} className="w-full">
      <div style={{ transform: `translateY(${startRow * ROW_HEIGHT}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleAssessments.map((assessment) => (
            <EmployeeAssessmentCard 
              key={assessment.id} 
              assessment={assessment} 
              onStart={onStart} 
              todayStr={todayStr} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const EmployeeAssessments = () => {
  const navigate = useNavigate();

  // Memoize today's date outside map/render (Requirement 8)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Optimized React Query config (Requirement 7)
  const { data: assessments = [], isLoading, isError } = useQuery({
    queryKey: ['employeeAssessments'],
    queryFn: async () => {
      const res = await api.get('/employee/assessments');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: keepPreviousData
  });

  // Memoize start handler (Requirement 8)
  const handleStart = useCallback((assessmentId) => {
    navigate('/employee/assessments/instructions', { state: { assessmentId } });
  }, [navigate]);

  // Skeleton loader instead of blank screen (Requirement 9)
  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-80 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-8 w-28 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-pulse flex flex-col">
              <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="h-8 bg-slate-200 rounded" />
                <div className="h-8 bg-slate-200 rounded" />
                <div className="h-8 bg-slate-200 rounded" />
              </div>
              <div className="h-10 w-full bg-slate-200 rounded-lg mt-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 flex items-center gap-3">
          <ShieldAlert size={20} />
          <p className="font-semibold text-sm">Failed to load assessments. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Assessment and Training</h1>
          <p className="text-sm text-slate-500 mt-1">Your assigned employee assessments and evaluations.</p>
        </div>
        <div className="text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          {assessments.length} Available
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm w-full">
          <Award size={56} className="text-blue-500/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Assessments Found</h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            You currently have no active assessments assigned to you. When new exams are published, they will appear here.
          </p>
        </div>
      ) : assessments.length > 20 ? (
        /* Virtualized rendering for large lists (Requirement 9) */
        <VirtualizedAssessmentGrid 
          assessments={assessments} 
          onStart={handleStart} 
          todayStr={todayStr} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assessments.map((assessment) => (
            <EmployeeAssessmentCard 
              key={assessment.id} 
              assessment={assessment} 
              onStart={handleStart} 
              todayStr={todayStr} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeAssessments;
