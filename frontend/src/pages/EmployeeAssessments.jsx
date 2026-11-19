import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRemoteData } from '../state/remote.js';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAssessmentBusinessDate from '../hooks/useAssessmentBusinessDate';
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
    <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] transition-all flex flex-col overflow-hidden hover:border-[var(--brand)]/40">
      <div className="p-5 border-b border-[var(--line)] flex-1 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[var(--text)] text-base leading-tight">
            {assessment.title}
          </h3>
          {assessment.has_passed && (
            <span className="shrink-0 bg-[#E6F6EC] text-[#1F9D55] p-1.5 rounded-[10px]">
              <CheckCircle2 size={16} />
            </span>
          )}
        </div>
        
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-2)]">
            <Building2 size={14} className="text-[var(--muted)]" />
            <span>{assessment.department || 'General'}</span>
          </div>
          {assessment.assessment_date ? (
            <div className={`flex items-center gap-2 text-xs font-semibold ${isScheduledToday ? 'text-[var(--brand-deep)]' : 'text-[#B7791F]'}`}>
              <Calendar size={14} />
              <span>Scheduled: {assessment.assessment_date}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <Calendar size={14} className="text-[var(--muted)]" />
              <span>Anytime Access</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 bg-[var(--surface-alt)] rounded-[18px] p-3 border border-[var(--line)]">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Duration</p>
            <p className="text-xs font-bold text-[var(--text)] mt-0.5 flex items-center justify-center gap-1">
              <Clock size={12} className="text-[var(--muted)]" />
              {assessment.duration_minutes}m
            </p>
          </div>
          <div className="text-center border-x border-[var(--line)]">
            <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Questions</p>
            <p className="text-xs font-bold text-[var(--text)] mt-0.5">{assessment.questions_count}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Marks</p>
            <p className="text-xs font-bold text-[var(--brand-deep)] mt-0.5">{assessment.total_marks}</p>
          </div>
        </div>

        {/* Score & Attempts Info */}
        {assessment.attempts_used > 0 && (
          <div className="flex items-center justify-between text-xs font-semibold p-2.5 bg-[var(--brand-tint)]/60 rounded-[14px]">
            <span className="text-[var(--brand-deep)] flex items-center gap-1.5">
              <BarChart2 size={14} /> 
              Highest Score: {assessment.highest_score !== null ? `${assessment.highest_score}%` : 'N/A'}
            </span>
            <span className="text-[var(--muted)]">
              {assessment.attempts_used} / {assessment.max_attempts} attempts
            </span>
          </div>
        )}
      </div>

      <div className="p-4 bg-[var(--surface-alt)] border-t border-[var(--line)]">
        {assessment.attempts_used >= assessment.max_attempts && !inProgressId ? (
          <button disabled className="w-full py-2.5 rounded-full bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--muted)] font-semibold text-xs cursor-not-allowed">
            Max Attempts Reached
          </button>
        ) : isBlockedByDate ? (
          <button disabled className="w-full py-2.5 rounded-full bg-[#FDF3DC] text-[#B7791F] font-semibold text-xs cursor-not-allowed flex items-center justify-center gap-2">
            <Calendar size={15} /> Scheduled for {assessment.assessment_date}
          </button>
        ) : (
          <button
            onClick={() => onStart(assessment.id, inProgressId)}
            className={`w-full py-2.5 rounded-full font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
              inProgressId 
                ? 'bg-[#B7791F] hover:bg-[#9c6414] text-white'
                : 'bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white'
            }`}
          >
            <PlayCircle size={15} />
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

  // Match the backend's Asia/Kolkata assessment-date checks even when UTC
  // is still on the previous day. Refresh on India midnight/tab resume.
  const todayStr = useAssessmentBusinessDate();

  // Optimized React Query config (Requirement 7)
  const { data: assessments = [], isLoading, isError } = useRemoteData({
    scope: ['employeeAssessments', todayStr],
    load: async () => {
      const res = await api.get('/employee/assessments');
      return res.data;
    },
    reloadOnFocus: false,
    retry: 1,
  });

  // Memoize start handler (Requirement 8)
  const handleStart = useCallback((assessmentId) => {
    navigate('/employee/assessments/instructions', { state: { assessmentId } });
  }, [navigate]);

  // Filter assessments that are scheduled for TODAY
  const todayAssessments = useMemo(() => {
    return Array.isArray(assessments) ? assessments.filter(a => a.assessment_date && a.assessment_date === todayStr) : [];
  }, [assessments, todayStr]);

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
    <div className="w-full space-y-6 antialiased">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-medium text-[var(--muted)]">Learning &amp; evaluations</span>
          </div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
            <span>Scheduled assessments</span>
            <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
              {todayAssessments.length} Scheduled today
            </span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">Your scheduled employee assessments and evaluations for today.</p>
        </div>
      </div>

      {todayAssessments.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-12 text-center w-full max-w-xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 bg-[#FDF3DC] rounded-[18px] flex items-center justify-center mx-auto text-[#B7791F] mb-2">
            <Calendar size={32} />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text)] tracking-tight">No Assessment Scheduled for Today</h3>
          <p className="text-[var(--muted)] text-sm leading-relaxed max-w-md mx-auto">
            You can access the Assessment Portal only on the specific day an assessment is scheduled for you.
          </p>
          <div className="inline-block px-3.5 py-1.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-full text-xs font-semibold text-[var(--text)]">
            Today's Date: {todayStr}
          </div>
          <div className="pt-2">
            <button 
              onClick={() => navigate('/employee')}
              className="px-6 py-2.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white font-semibold text-xs rounded-full transition-all cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : todayAssessments.length > 20 ? (
        /* Virtualized rendering for large lists (Requirement 9) */
        <VirtualizedAssessmentGrid 
          assessments={todayAssessments} 
          onStart={handleStart} 
          todayStr={todayStr} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {todayAssessments.map((assessment) => (
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
