import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, XCircle, Clock, BarChart2, Award,
  CheckCircle2, ArrowLeft, ShieldAlert, Eye, EyeOff, Lock, BookOpen
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
            <p className="font-bold text-base">No Result Data</p>
            <p className="text-sm mt-1">Result data was not found. Please return to your assessments dashboard.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/employee/assessments')}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer inline-flex items-center gap-2"
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
      {/* Header matching instructions & list pages */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/employee/assessments', { replace: true })}
              className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer shrink-0"
              title="Back to Assessments"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {assessmentTitle || 'Assessment Result'}
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Assessment Submission & Evaluation Summary
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid in Header (Only when visibility is immediate) */}
        {visibility === 'immediate' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center">
              <BarChart2 size={20} className="mx-auto mb-1 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{score !== undefined ? score : '0'}</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Score Earned</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center">
              <Award size={20} className="mx-auto mb-1 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{total_marks !== undefined ? total_marks : '0'}</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Marks</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center">
              <CheckCircle2 size={20} className={`mx-auto mb-1 ${passed ? 'text-emerald-600' : 'text-rose-600'}`} />
              <p className={`text-2xl font-bold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {percentage !== null && percentage !== undefined ? `${parseFloat(percentage).toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Percentage</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center">
              <Trophy size={20} className={`mx-auto mb-1 ${passed ? 'text-emerald-600' : 'text-rose-600'}`} />
              <p className={`text-2xl font-bold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {passed ? 'PASSED' : 'FAILED'}
              </p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Result Status</p>
            </div>
          </div>
        )}
      </div>

      {/* Submit Reason Banner */}
      {reasonLabel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
        >
          {reasonLabel}
        </motion.div>
      )}

      {/* Case 1: Results Never Visible */}
      {visibility === 'never' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6 border border-slate-200/60">
            <EyeOff size={36} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Exam Submitted Successfully</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your responses have been securely recorded. The detailed results and scores for this assessment are 
            <strong className="text-slate-700"> not available for viewing</strong>. Contact your administrator for more information.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200/60">
            <Lock size={14} />
            Results Hidden by Administrator
          </div>
        </motion.div>
      )}

      {/* Case 2: Results Pending Admin Review */}
      {visibility === 'after_review' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-6 border border-amber-100">
            <Clock size={36} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Exam Submitted Successfully</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your responses have been recorded and submitted for <strong className="text-slate-700">admin review</strong>. 
            Your scores and detailed feedback will become available once the administrator has evaluated your submission.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-amber-100 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 border border-amber-200/60">
            <Clock size={14} />
            Pending Administrator Review
          </div>
        </motion.div>
      )}

      {/* Case 3: Immediate Visibility - Main Status Card */}
      {visibility === 'immediate' && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 mx-auto sm:mx-0 border ${
                passed 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}>
                {passed ? <Trophy size={32} /> : <XCircle size={32} />}
              </div>
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider mb-2 border ${
                  passed 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {passed ? 'Threshold Met' : 'Threshold Not Met'}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {passed ? 'Congratulations, You Passed!' : 'Assessment Completed'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {passed 
                    ? 'You have successfully achieved or exceeded the passing threshold for this assessment.' 
                    : 'You did not meet the minimum required passing threshold for this evaluation.'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Question Breakdown */}
          {result.breakdown && result.breakdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Question Breakdown</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Detailed review of your performance across each question</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                  {result.breakdown.length} Questions
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {result.breakdown.map((item, idx) => (
                  <div key={idx} className="p-5 flex items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-bold text-sm border ${
                        item.correct 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' 
                          : 'bg-rose-50 text-rose-600 border-rose-200/60'
                      }`}>
                        {item.correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Question {idx + 1}</span>
                          <span>•</span>
                          <span className={item.correct ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                            {item.correct ? 'Correct Answer' : 'Incorrect Answer'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        item.correct 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        +{item.marks_earned} / {item.marks_possible} Marks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeAssessmentResult;
