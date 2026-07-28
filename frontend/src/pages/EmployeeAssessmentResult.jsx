import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../api/axios';
import {
  Trophy, XCircle, Clock, BarChart2, Award,
  CheckCircle2, ArrowLeft, ShieldAlert, EyeOff, Lock
} from 'lucide-react';

const EmployeeAssessmentResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateResult = location.state?.result;
  const attemptId = location.state?.attemptId || stateResult?.attempt_id || new URLSearchParams(location.search).get('attemptId');

  // ===================== BLOCK GOING BACK TO SESSION / INSTRUCTIONS =====================
  React.useEffect(() => {
    // Safety kill: stop any lingering background webcam/mic tracks from the exam session
    if (window._activeAssessmentStreams) {
      window._activeAssessmentStreams.forEach(stream => {
        try {
          stream.getTracks().forEach(track => {
            try { track.enabled = false; track.stop(); } catch (e) {}
          });
        } catch (e) {}
      });
      window._activeAssessmentStreams.clear();
    }

    // Push state into browser history stack so Back button triggers popstate
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e) => {
      // Intercept back button/gesture and redirect immediately to assessments dashboard
      navigate('/employee/assessments', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  const { data: result, isLoading: loading } = useQuery({
    queryKey: ['assessmentResult', attemptId],
    queryFn: async () => {
      const res = await api.get(`/employee/assessments/attempts/${attemptId}/result`);
      const d = res.data;
      return {
        ...d,
        score: d.total_score ?? d.score ?? 0,
        total_marks: d.max_score ?? d.total_marks ?? 0
      };
    },
    enabled: !!attemptId && !stateResult,
    initialData: stateResult ? {
      ...stateResult,
      score: stateResult.score ?? stateResult.total_score ?? 0,
      total_marks: stateResult.total_marks ?? stateResult.max_score ?? 0
    } : undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false
  });

  if (loading) {
    return (
      <div className="w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
          <div className="h-8 w-32 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 h-96 bg-slate-100/50" />
          <div className="bg-white rounded-2xl border border-slate-200 p-6 h-96 bg-slate-100/50 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-center p-8 relative transform transition-all">
          <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-inner">
            <ShieldAlert size={36} className="text-rose-600 animate-pulse" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-2">No Result Data Found</h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
            We couldn't load the evaluation data for this session. The result may still be evaluating or the session history was reset. Please return to your assessment dashboard.
          </p>
          <button
            onClick={() => navigate('/employee/assessments')}
            className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm rounded-2xl transition-all shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center gap-2.5 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const assessmentTitle = location.state?.assessmentTitle || result.assessment_title || 'Assessment Result';
  const visibility = location.state?.resultVisibility || result.result_visibility || 'immediate';
  const { score, total_marks, percentage, passed, submit_reason } = result;

  const getSubmitReasonLabel = (reason) => {
    switch (reason) {
      case 'tab_switch_violation': return '⚠️ Exam was auto-submitted due to tab switching / window focus violation.';
      case 'time_expired': return '⏰ Exam was auto-submitted because the allocated time expired.';
      case 'page_refresh_or_close': return '🔄 Exam was auto-submitted because you navigated away or refreshed the page.';
      default: return null;
    }
  };

  const reasonLabel = getSubmitReasonLabel(submit_reason);

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Clean Top Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/employee/assessments', { replace: true })}
            className="p-2.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200 transition cursor-pointer bg-white shadow-sm"
            title="Back to Assessments"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {assessmentTitle || 'Assessment Result'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Assessment submission report and performance evaluation
            </p>
          </div>
        </div>

        {visibility === 'immediate' && (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider border shadow-sm ${
            passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {passed ? 'Passed Evaluation' : 'Did Not Pass'}
          </div>
        )}
      </div>

      {/* Case 1: Results Never Visible */}
      {visibility === 'never' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-2xl mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center mx-auto mb-5 border border-slate-200">
            <EyeOff size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Exam Submitted Successfully</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your responses have been securely recorded. The detailed results and scores for this assessment are currently hidden by the administrator.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200/60">
            <Lock size={14} />
            Results Hidden by Administrator
          </div>
          <div className="mt-8">
            <button
              onClick={() => navigate('/employee/assessments', { replace: true })}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition cursor-pointer shadow-sm"
            >
              Return to Assessments
            </button>
          </div>
        </motion.div>
      )}

      {/* Case 2: Results Pending Admin Review */}
      {visibility === 'after_review' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-2xl mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 border border-amber-200">
            <Clock size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Exam Submitted Successfully</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your responses have been recorded and submitted for <strong className="text-slate-700">admin review</strong>. 
            Your scores and detailed feedback will become available once the administrator has evaluated your submission.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-amber-100 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 border border-amber-200/60">
            <Clock size={14} />
            Pending Administrator Review
          </div>
          <div className="mt-8">
            <button
              onClick={() => navigate('/employee/assessments', { replace: true })}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition cursor-pointer shadow-sm"
            >
              Return to Assessments
            </button>
          </div>
        </motion.div>
      )}

      {/* Case 3: Immediate Visibility - 2-Column Dashboard Grid */}
      {visibility === 'immediate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Summary & Score Meter */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 lg:col-span-1"
          >
            {/* Submit Reason Banner */}
            {reasonLabel && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                <span>{reasonLabel}</span>
              </div>
            )}

            {/* Hero Badge */}
            <div className="text-center pb-6 border-b border-slate-100">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-sm ${
                passed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}>
                {passed ? <Trophy size={32} /> : <XCircle size={32} />}
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {passed ? 'Congratulations!' : 'Threshold Not Met'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {passed 
                  ? 'You have passed this evaluation.' 
                  : 'You did not achieve the required pass mark.'}
              </p>
            </div>

            {/* Score Metrics */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={16} className="text-slate-400" /> Score Earned
                </span>
                <span className="text-base font-bold text-slate-900">
                  {score !== undefined ? score : '0'} <span className="text-xs font-normal text-slate-500">/ {total_marks || 0}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-slate-400" /> Percentage
                </span>
                <span className={`text-base font-bold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {percentage !== null && percentage !== undefined ? `${parseFloat(percentage).toFixed(1)}%` : '0%'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Award size={16} className="text-slate-400" /> Passing Threshold
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {result.passing_percentage || 70}%
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => navigate('/employee/assessments', { replace: true })}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <ArrowLeft size={16} />
              Return to Dashboard
            </button>
          </motion.div>

          {/* Right Column: Detailed Question Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:col-span-2 min-h-[540px]"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Detailed Response Analysis</h3>
                <p className="text-xs text-slate-500 mt-0.5">Review your individual answer correctness and points awarded</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                {result.breakdown ? result.breakdown.length : 0} Questions
              </span>
            </div>

            {result.breakdown && result.breakdown.length > 0 ? (
              <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {result.breakdown.map((item, idx) => (
                  <div key={idx} className="p-5 flex items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-sm font-bold border ${
                        item.correct 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {item.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-snug">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Q{idx + 1}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className={`text-xs font-semibold ${item.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.correct ? 'Correct Answer' : 'Incorrect Response'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border shadow-2xs ${
                        item.correct 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        +{item.marks_earned} / {item.marks_possible} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                No question breakdown available for this assessment.
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAssessmentResult;
