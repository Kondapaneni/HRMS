import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Trophy, XCircle, Clock, BarChart2, Award,
  CheckCircle2, ArrowLeft, ShieldAlert, Eye, EyeOff, Lock
} from 'lucide-react';

const EmployeeAssessmentResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { result, assessmentTitle, resultVisibility } = location.state || {};

  if (!result) {
    return (
      <div className="p-6 w-full max-w-3xl mx-auto">
        <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 flex items-center gap-3">
          <ShieldAlert size={24} />
          <div>
            <p className="font-bold">No Result Data</p>
            <p className="text-sm mt-1">Result data was not found. Please go back to your assessments.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/employee/assessments')}
          className="mt-4 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer"
        >
          ← Back to Assessments
        </button>
      </div>
    );
  }

  const visibility = resultVisibility || 'immediate';

  // If result_visibility is "never" - show nothing
  if (visibility === 'never') {
    return (
      <div className="p-6 w-full max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <EyeOff size={36} className="text-slate-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Exam Submitted Successfully</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your responses have been recorded. The results for this assessment are 
            <strong> not available for viewing</strong>. Contact your administrator for more details.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500">
            <Lock size={12} />
            Results Hidden by Admin
          </div>
        </div>

        <button
          onClick={() => navigate('/employee/assessments', { replace: true })}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Assessments
        </button>
      </div>
    );
  }

  // If result_visibility is "after_review" - show pending
  if (visibility === 'after_review') {
    return (
      <div className="p-6 w-full max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <Eye size={36} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Exam Submitted Successfully</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your responses have been recorded and submitted for <strong>admin review</strong>. 
            Your results will be available once the administrator has reviewed your submission.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700">
            <Clock size={12} />
            Pending Admin Review
          </div>
        </div>

        <button
          onClick={() => navigate('/employee/assessments', { replace: true })}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Assessments
        </button>
      </div>
    );
  }

  // Immediate visibility - show full results
  const { score, total_marks, percentage, passed, submit_reason } = result;

  const getSubmitReasonLabel = (reason) => {
    switch (reason) {
      case 'tab_switch_violation': return '⚠️ Auto-submitted due to tab switching violation';
      case 'time_expired': return '⏰ Auto-submitted because time expired';
      case 'page_refresh_or_close': return '🔄 Auto-submitted because you left the exam page';
      default: return null;
    }
  };

  const reasonLabel = getSubmitReasonLabel(submit_reason);

  return (
    <div className="p-6 w-full max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assessment Result</h2>
        <h1 className="text-xl font-black text-slate-900 mt-1">{assessmentTitle || 'Assessment'}</h1>
      </div>

      {/* Submit Reason Banner */}
      {reasonLabel && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-sm font-semibold text-center">
          {reasonLabel}
        </div>
      )}

      {/* Result Card */}
      <div className={`rounded-2xl border-2 shadow-lg p-8 text-center ${
        passed ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
      }`}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
          passed ? 'bg-emerald-100' : 'bg-rose-100'
        }`}>
          {passed ? (
            <Trophy size={48} className="text-emerald-600" />
          ) : (
            <XCircle size={48} className="text-rose-600" />
          )}
        </div>

        <h2 className={`text-3xl font-black mb-1 ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
          {passed ? '🎉 Congratulations!' : 'Better Luck Next Time'}
        </h2>

        <p className={`text-sm font-semibold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
          {passed ? 'You have passed this assessment!' : 'You did not meet the passing threshold.'}
        </p>

        {/* Score Display */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/80 rounded-xl p-4">
            <BarChart2 size={20} className="mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-black text-slate-900">{score}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400">Score</p>
          </div>
          <div className="bg-white/80 rounded-xl p-4">
            <Award size={20} className="mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-black text-slate-900">{total_marks}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Marks</p>
          </div>
          <div className="bg-white/80 rounded-xl p-4">
            <CheckCircle2 size={20} className={`mx-auto mb-1 ${passed ? 'text-emerald-500' : 'text-rose-500'}`} />
            <p className={`text-2xl font-black ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
              {percentage !== null && percentage !== undefined ? `${parseFloat(percentage).toFixed(1)}%` : 'N/A'}
            </p>
            <p className="text-[10px] uppercase font-bold text-slate-400">Percentage</p>
          </div>
        </div>
      </div>

      {/* Question Breakdown */}
      {result.breakdown && result.breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Question Breakdown</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {result.breakdown.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  item.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {item.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {item.correct ? `+${item.marks_earned}` : '0'} / {item.marks_possible} marks
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/employee/assessments', { replace: true })}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Assessments
      </button>
    </div>
  );
};

export default EmployeeAssessmentResult;
