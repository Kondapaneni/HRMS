import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Award, Clock, Calendar, CheckCircle, XCircle, AlertCircle,
  Play, RotateCcw, Eye, FileText, ChevronRight, BarChart2, ShieldCheck, Check, X
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const EmployeeAssessments = () => {
  const navigate = useNavigate();
  const [selectedResultId, setSelectedResultId] = useState(null);

  const { data: assessments = [], isLoading, refetch } = useQuery({
    queryKey: ['employeeAssessments', 'list'],
    queryFn: async () => {
      const res = await api.get('/employee/assessments');
      return res.data;
    }
  });

  const { data: resultData, isLoading: resLoading } = useQuery({
    queryKey: ['employeeAssessments', 'result', selectedResultId],
    queryFn: async () => {
      const res = await api.get(`/employee/assessments/attempts/${selectedResultId}/result`);
      return res.data;
    },
    enabled: !!selectedResultId
  });

  const handleStartOrResume = (exam) => {
    // Navigate using clean route without ID in URL and without word "take"
    // We pass assessmentId in state and backup to sessionStorage
    sessionStorage.setItem('active_assessment_id', exam.id);
    navigate('/employee/assessments/session', {
      state: { assessmentId: exam.id, title: exam.title }
    });
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
            <Award size={16} />
            <span>Employee Assessment Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Assigned Assessments</h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Complete your assigned exams within the specified duration. Objective questions are evaluated automatically upon submission.
          </p>
        </div>
      </div>

      {/* Assessment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assessments.map(exam => {
          const isCompleted = exam.has_passed || (exam.max_attempts > 0 && exam.attempts_remaining <= 0);
          const isInProgress = !!exam.in_progress_attempt_id;
          const canAttempt = !isCompleted || (exam.max_attempts === 0 || exam.attempts_remaining > 0);

          return (
            <div key={exam.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    MCQ Exam
                  </span>
                  {exam.due_date && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Calendar size={13} className="text-slate-400" />
                      <span>Due: {exam.due_date}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{exam.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 min-h-[2.5rem]">{exam.description || 'No specific instructions provided.'}</p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-xs text-slate-400 font-medium">Questions</div>
                    <div className="text-sm font-bold text-slate-800">{exam.questions_count}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-xs text-slate-400 font-medium">Duration</div>
                    <div className="text-sm font-bold text-slate-800">{exam.duration_minutes}m</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <div className="text-xs text-slate-400 font-medium">Passing</div>
                    <div className="text-sm font-bold text-blue-600">{exam.passing_percentage}%</div>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Attempts: <strong className="text-slate-800">{exam.attempts_used}</strong> / {exam.max_attempts > 0 ? exam.max_attempts : '∞'}</span>
                  {exam.highest_score !== null && (
                    <span>Best Score: <strong className={`font-bold ${exam.has_passed ? 'text-emerald-600' : 'text-slate-800'}`}>{exam.highest_score}%</strong></span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isInProgress ? (
                    <button
                      onClick={() => handleStartOrResume(exam)}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={16} />
                      <span>Resume Attempt</span>
                    </button>
                  ) : canAttempt && !exam.has_passed ? (
                    <button
                      onClick={() => handleStartOrResume(exam)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      <span>Start Assessment</span>
                    </button>
                  ) : null}

                  {exam.latest_attempt_id && (
                    <button
                      onClick={() => setSelectedResultId(exam.latest_attempt_id)}
                      className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition flex items-center justify-center gap-1.5 ${
                        !canAttempt || exam.has_passed ? 'w-full bg-slate-900 text-white border-slate-900 hover:bg-slate-800' : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Eye size={16} />
                      <span>View Result</span>
                    </button>
                  )}
                </div>

                {exam.has_passed && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle size={14} />
                    <span>Assessment Completed & Passed</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {assessments.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            <Award size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No assessments assigned right now.</p>
            <p className="text-xs text-slate-400 mt-1">Check back later or contact your HR administrator if you expect an exam.</p>
          </div>
        )}
      </div>

      {/* RESULT MODAL (SIDEBAR DRAWER) */}
      {selectedResultId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white shadow-2xl w-full max-w-2xl h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 className="text-blue-600" size={20} />
                <span>Assessment Scorecard</span>
              </h2>
              <button onClick={() => setSelectedResultId(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {resLoading || !resultData ? <PageLoader /> : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                    <div>
                      <div className="text-xs text-slate-400 font-semibold uppercase">Assessment Title</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{resultData.assessment_title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Submitted: {new Date(resultData.end_time).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-semibold uppercase">Total Score</div>
                        <div className="text-xl font-extrabold text-slate-800">{resultData.total_score} / {resultData.max_score}</div>
                      </div>
                      <div className={`px-4 py-3 rounded-2xl font-extrabold text-xl flex items-center gap-2 border ${
                        resultData.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {resultData.passed ? <CheckCircle size={24} /> : <XCircle size={24} />}
                        <span>{resultData.percentage}%</span>
                      </div>
                    </div>
                  </div>

                  {resultData.result_visibility === 'hidden' ? (
                    <div className="p-8 text-center bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-sm">
                      <ShieldCheck size={28} className="mx-auto mb-2 text-amber-600" />
                      <p className="font-bold">Detailed Question Breakdown is Hidden</p>
                      <p className="text-xs mt-1">The administrator has configured this assessment to hide answer breakdown for security and integrity purposes.</p>
                    </div>
                  ) : resultData.breakdown && Object.keys(resultData.breakdown).length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Question Breakdown</h3>
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {Object.entries(resultData.breakdown).map(([qId, item], idx) => (
                          <div key={qId} className={`p-4 rounded-xl border text-sm space-y-2 ${
                            item.is_correct ? 'bg-emerald-50/40 border-emerald-200/80' : 'bg-rose-50/40 border-rose-200/80'
                          }`}>
                            <div className="flex items-start justify-between gap-2 font-medium text-slate-900">
                              <span>{idx + 1}. {item.title}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                                item.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.marks_awarded} / {item.max_marks} pts
                              </span>
                            </div>

                            <div className="text-xs space-y-1 pt-1 border-t border-slate-200/50">
                              <div className="text-slate-600">
                                <strong className="text-slate-700">Your Answer:</strong> {
                                  item.answer && item.answer.length ? item.answer.map(idxStr => {
                                    const i = parseInt(idxStr);
                                    return `${String.fromCharCode(65 + i)} (${item.options[i] || 'Option ' + idxStr})`;
                                  }).join(', ') : <span className="italic text-slate-400">No answer selected</span>
                                }
                              </div>
                              {!item.is_correct && resultData.result_visibility === 'immediate' && item.correct_answers && (
                                <div className="text-emerald-700 font-medium">
                                  <strong>Correct Answer:</strong> {
                                    item.correct_answers.map(idxStr => {
                                      const i = parseInt(idxStr);
                                      return `${String.fromCharCode(65 + i)} (${item.options[i] || 'Option ' + idxStr})`;
                                    }).join(', ')
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedResultId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAssessments;
