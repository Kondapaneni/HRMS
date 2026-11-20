import React, { useState, useEffect } from 'react';
import { useRemoteData } from '../state/remote.js';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import {
  Clock, Award, ShieldAlert, Video, AlertTriangle,
  ChevronRight, BookOpen, Target, Monitor, Camera,
  CheckCircle2, XCircle, ArrowLeft
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const EmployeeAssessmentInstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const assessmentId = location.state?.assessmentId;

  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/employee/assessments', { replace: true });
    }
  }, [assessmentId, navigate]);

  const { data: assessment, isLoading: loading, error: queryError } = useRemoteData({
    scope: ['employeeAssessment', assessmentId],
    load: async () => {
      const res = await api.get(`/employee/assessments/${assessmentId}`);
      return res.data;
    },
    enabled: !!assessmentId,
    reloadOnFocus: false,
    retry: 1
  });

  const error = queryError ? (queryError.response?.data?.error || 'Failed to load assessment details') : null;



  const handleBeginExam = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => {
        if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape', 'F11', 'F5']).catch(() => {});
        }
      }).catch(() => {});
    }
    navigate('/employee/assessments/session', {
      state: { assessmentId },
      replace: true
    });
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-8 w-64 bg-slate-200 rounded" />
              <div className="h-4 w-40 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                <div className="h-6 w-6 bg-slate-200 rounded mx-auto" />
                <div className="h-8 w-16 bg-slate-200 rounded mx-auto" />
                <div className="h-3 w-20 bg-slate-100 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 h-80 animate-pulse bg-slate-100/50" />
          <div className="bg-white rounded-2xl border border-slate-200 p-6 h-80 animate-pulse bg-slate-100/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 flex items-center gap-3">
          <ShieldAlert size={24} />
          <div>
            <p className="font-bold text-base">Unable to Load Assessment</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const questionsCount = assessment?.selected_questions?.length || 0;
  const totalMarks = questionsCount * (assessment?.marks_per_question || 1);

  return (
    <div className="w-full space-y-6 antialiased">
      {/* Side-by-Side Grid: Header & Rules */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* Header */}
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-8 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--brand-tint)] flex items-center justify-center text-[var(--brand-deep)]">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text)]">{assessment.title}</h1>
              <p className="text-[var(--muted)] text-sm font-medium mt-1">
                {assessment.department || 'General'} Department Assessment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[var(--line)] mt-6">
            <div className="bg-[var(--surface-alt)] border border-[var(--line)] rounded-[18px] p-4 text-center">
              <Clock size={20} className="mx-auto mb-1 text-[var(--muted)]" />
              <p className="text-2xl font-bold text-[var(--text)]">{assessment.duration_minutes}</p>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase">Minutes</p>
            </div>
            <div className="bg-[var(--surface-alt)] border border-[var(--line)] rounded-[18px] p-4 text-center">
              <BookOpen size={20} className="mx-auto mb-1 text-[var(--muted)]" />
              <p className="text-2xl font-bold text-[var(--text)]">{questionsCount}</p>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase">Questions</p>
            </div>
            <div className="bg-[var(--surface-alt)] border border-[var(--line)] rounded-[18px] p-4 text-center">
              <Target size={20} className="mx-auto mb-1 text-[var(--brand-deep)]" />
              <p className="text-2xl font-bold text-[var(--brand-deep)]">{totalMarks}</p>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase">Total Marks</p>
            </div>
            <div className="bg-[var(--surface-alt)] border border-[var(--line)] rounded-[18px] p-4 text-center">
              <Award size={20} className="mx-auto mb-1 text-[#1F9D55]" />
              <p className="text-2xl font-bold text-[#1F9D55]">{assessment.passing_percentage}%</p>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase">Pass %</p>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[var(--line)] bg-[var(--surface-alt)]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-[#B7791F]" />
              <h2 className="text-base font-semibold text-[var(--text)]">Exam Rules &amp; Security</h2>
            </div>
          </div>

          <div className="p-6 space-y-4 flex-1">
            <div className="flex items-start gap-3 p-4 bg-[#FDE8EA]/50 border border-[#FDE8EA] rounded-[18px]">
              <Monitor size={18} className="text-[#D64550] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-[#D64550]">Tab Switching is Strictly Monitored</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Switching to another tab or window during the exam will trigger a warning. 
                  On the <strong>second offense</strong>, the exam will be <strong>automatically submitted</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#FDE8EA]/50 border border-[#FDE8EA] rounded-[18px]">
              <ShieldAlert size={18} className="text-[#D64550] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-[#D64550]">No Page Refresh Allowed</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Refreshing the page or closing the tab will <strong>automatically submit your exam</strong>. 
                  Make sure your internet connection is stable.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--brand-tint)]/40 border border-[var(--line)] rounded-[18px]">
              <Clock size={18} className="text-[var(--brand-deep)] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-[var(--brand-deep)]">Timer is Strictly Enforced</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Once you begin, the countdown timer starts. When the time expires, the exam is 
                  <strong> automatically submitted</strong> with whatever answers you have completed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agreement & Start */}
      <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="w-5 h-5 rounded-[6px] text-[var(--brand-deep)] focus:ring-[var(--brand)] mt-0.5 cursor-pointer"
          />
          <span className="text-xs sm:text-sm text-[var(--text-2)] group-hover:text-[var(--text)] transition">
            I have read and understood all the rules. I agree that tab switching is monitored, 
            and any violation may result in automatic exam submission. 
            I am ready to begin.
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/employee/assessments')}
            className="px-5 py-2.5 bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] font-semibold text-xs rounded-full transition cursor-pointer inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Assessments
          </button>
          <button
            onClick={handleBeginExam}
            disabled={!agreed}
            className={`px-8 py-2.5 font-semibold text-xs rounded-full transition inline-flex items-center gap-2 cursor-pointer ${
              !agreed
                ? 'bg-[var(--surface-alt)] text-[var(--muted)] cursor-not-allowed'
                : 'bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white'
            }`}
          >
            Begin Exam
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAssessmentInstructions;
