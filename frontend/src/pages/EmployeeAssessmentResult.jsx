import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, XCircle, Clock, BarChart2, Award,
  CheckCircle2, ArrowLeft, ShieldAlert, EyeOff, Lock
} from 'lucide-react';

const EmployeeAssessmentResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { result, assessmentTitle, resultVisibility } = location.state || {};

  if (!result) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 flex items-center gap-3 shadow-sm">
          <ShieldAlert size={24} className="shrink-0 text-rose-600" />
          <div>
            <p className="font-bold text-base">No Result Data Found</p>
            <p className="text-sm mt-1">Result evaluation data could not be loaded. Please return to your assessment dashboard.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/employee/assessments')}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition cursor-pointer inline-flex items-center gap-2 shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Assessments
        </button>
      </div>
    );
  }

  const visibility = resultVisibility || 'immediate';
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
    <div className="w-full space-y-6">
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
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:col-span-2"
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
              <div className="divide-y divide-slate-100">
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
