import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Award, Clock, AlertCircle, CheckCircle, XCircle, ChevronLeft,
  ChevronRight, Flag, Send, ShieldAlert, RefreshCw, BookOpen, Check
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const EmployeeAssessmentSession = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get ID from state or sessionStorage without exposing in URL
  const assessmentId = location.state?.assessmentId || sessionStorage.getItem('active_assessment_id');

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null); // { attempt_id, assessment, deadline_timestamp, questions, saved_answers }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: { answer: ['0'], flagged: false } }
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null); // stores immediate evaluation result

  const timerRef = useRef(null);

  // Initialize Session
  useEffect(() => {
    if (!assessmentId) {
      toast.error('No active assessment session found.');
      navigate('/employee/assessments', { replace: true });
      return;
    }

    const initSession = async () => {
      try {
        const res = await api.post(`/employee/assessments/${assessmentId}/start`);
        const data = res.data;
        setSessionData(data);

        // Map saved answers
        const initialAnswers = {};
        if (data.saved_answers) {
          Object.entries(data.saved_answers).forEach(([qId, val]) => {
            initialAnswers[qId] = {
              answer: Array.isArray(val?.answer) ? val.answer : (val?.answer ? [val.answer] : []),
              flagged: !!val?.flagged
            };
          });
        }
        setAnswers(initialAnswers);

        // Calculate time left
        if (data.deadline_timestamp > 0) {
          const rem = Math.max(0, data.deadline_timestamp - Math.floor(Date.now() / 1000));
          setTimeLeft(rem);
        } else {
          setTimeLeft(999999);
        }

        setLoading(false);
      } catch (e) {
        toast.error(e.response?.data?.error || 'Failed to start assessment session.');
        navigate('/employee/assessments', { replace: true });
      }
    };

    initSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assessmentId, navigate]);

  // Timer countdown
  useEffect(() => {
    if (loading || !sessionData || submittedResult) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmitTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, sessionData, submittedResult]);

  // Background Auto-save
  const triggerAutoSave = async (updatedAnswers) => {
    if (!sessionData?.attempt_id || submittedResult) return;
    try {
      await api.put(`/employee/assessments/attempts/${sessionData.attempt_id}/save`, {
        answers: updatedAnswers
      });
    } catch (e) {
      console.warn('Auto-save failed silently:', e);
    }
  };

  const handleSelectOption = (qId, optIdxStr, isMultiple) => {
    const prevAns = answers[qId]?.answer || [];
    let nextAns;
    if (isMultiple) {
      const set = new Set(prevAns);
      if (set.has(optIdxStr)) set.delete(optIdxStr);
      else set.add(optIdxStr);
      nextAns = Array.from(set);
    } else {
      nextAns = [optIdxStr];
    }

    const updated = {
      ...answers,
      [qId]: { ...answers[qId], answer: nextAns }
    };
    setAnswers(updated);
    triggerAutoSave(updated);
  };

  const handleToggleFlag = (qId) => {
    const updated = {
      ...answers,
      [qId]: { ...answers[qId], flagged: !answers[qId]?.flagged }
    };
    setAnswers(updated);
    triggerAutoSave(updated);
  };

  const handleAutoSubmitTimeUp = async () => {
    toast.error('Time is up! Submitting your assessment automatically...');
    await executeSubmit();
  };

  const executeSubmit = async () => {
    if (!sessionData?.attempt_id || submitting || submittedResult) return;
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      const res = await api.post(`/employee/assessments/attempts/${sessionData.attempt_id}/submit`, {
        answers: answers
      });
      setSubmittedResult(res.data.result);
      sessionStorage.removeItem('active_assessment_id');
      toast.success('Assessment submitted successfully!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  // FORMAT TIME
  const formatTime = (secs) => {
    if (secs > 999000) return 'Unlimited';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // IF SUBMITTED: SHOW SCORECARD SUMMARY
  if (submittedResult) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-700 max-w-3xl w-full rounded-3xl p-8 shadow-2xl space-y-8 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-indigo-500/20 border-2 border-indigo-500">
              <Award size={40} className="text-indigo-400" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Assessment Evaluation Complete</h1>
            <p className="text-slate-400 text-sm">Thank you for completing <strong className="text-white">{sessionData.assessment.title}</strong>.</p>
          </div>

          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Score</div>
              <div className="text-3xl font-extrabold text-white mt-1">{submittedResult.total_score} / {submittedResult.max_score}</div>
              <div className="text-xs text-slate-500 mt-1">points awarded</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Percentage</div>
              <div className="text-3xl font-extrabold text-indigo-400 mt-1">{submittedResult.percentage}%</div>
              <div className="text-xs text-slate-500 mt-1">passing: {submittedResult.passing_percentage}%</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</div>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm border ${
                submittedResult.passed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}>
                {submittedResult.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span>{submittedResult.passed ? 'PASSED' : 'DID NOT PASS'}</span>
              </div>
            </div>
          </div>

          {submittedResult.result_visibility === 'hidden' ? (
            <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl text-center text-xs text-slate-400">
              Detailed question breakdown has been hidden by the administrator for this assessment.
            </div>
          ) : submittedResult.breakdown && Object.keys(submittedResult.breakdown).length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Your Responses Breakdown</h3>
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 divide-y divide-slate-700/50">
                {Object.entries(submittedResult.breakdown).map(([qId, item], idx) => (
                  <div key={qId} className="pt-3 first:pt-0 space-y-1.5 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-slate-200">{idx + 1}. {item.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                        item.is_correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {item.marks_awarded} / {item.max_marks} pts
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      <strong>Selected Answer:</strong> {
                        item.answer && item.answer.length ? item.answer.map(idxStr => {
                          const i = parseInt(idxStr);
                          return `${String.fromCharCode(65 + i)} (${item.options[i] || 'Option ' + idxStr})`;
                        }).join(', ') : <span className="italic">No answer selected</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-center pt-4 border-t border-slate-700">
            <button
              onClick={() => navigate('/employee/assessments', { replace: true })}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-500/30"
            >
              Return to Assessment Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questions = sessionData.questions || [];
  const currentQ = questions[currentIdx];
  const qAnsObj = answers[currentQ?.id] || {};
  const currentAnsList = qAnsObj.answer || [];
  const isFlagged = !!qAnsObj.flagged;
  const isMultiple = currentQ?.question_type === 'mcq_multiple';

  const answeredCount = questions.filter(q => (answers[q.id]?.answer || []).length > 0).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to exit? Your progress is saved, but time will continue if not paused.')) {
                navigate('/employee/assessments');
              }
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
            title="Exit to portal"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-base md:text-lg text-white leading-tight">{sessionData.assessment.title}</h1>
            <div className="text-xs text-slate-400">Question {currentIdx + 1} of {questions.length} • {currentQ?.marks} pts</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm border ${
            timeLeft < 300 ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse' : 'bg-slate-700/80 text-indigo-300 border-slate-600'
          }`}>
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Question Area (3 cols) */}
        <div className="lg:col-span-3 bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-700/60 pb-5">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                {isMultiple ? 'Multiple Choice (Select all that apply)' : 'Single Choice (Select one)'}
              </span>
              <h2 className="text-lg md:text-xl font-bold text-white pt-2 leading-relaxed">{currentQ?.title}</h2>
            </div>

            <button
              onClick={() => handleToggleFlag(currentQ?.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isFlagged ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:text-white'
              }`}
            >
              <Flag size={14} className={isFlagged ? 'fill-amber-400' : ''} />
              <span>{isFlagged ? 'Flagged' : 'Flag for review'}</span>
            </button>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            {currentQ?.options.map((opt, idx) => {
              const idxStr = String(idx);
              const isSelected = currentAnsList.includes(idxStr);
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectOption(currentQ?.id, idxStr, isMultiple)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium shadow-md shadow-indigo-500/10'
                      : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-700/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border transition ${
                      isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700/80 border-slate-600 text-slate-400'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm md:text-base">{opt}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                    isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 bg-transparent'
                  }`}>
                    {isSelected && <Check size={12} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-700/60">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white rounded-xl font-medium text-sm transition"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-indigo-600/20"
              >
                <span>Next Question</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/30"
              >
                <span>Review & Submit</span>
                <Send size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Palette (1 col) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6 sticky top-24">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs font-normal text-slate-400">{answeredCount} / {questions.length} answered</span>
            </h3>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const qAns = answers[q.id] || {};
              const isAns = (qAns.answer || []).length > 0;
              const isFlg = !!qAns.flagged;
              const isCur = idx === currentIdx;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-11 rounded-xl font-bold text-xs relative flex items-center justify-center border transition ${
                    isCur ? 'ring-2 ring-white border-white' : ''
                  } ${
                    isFlg ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                    isAns ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' :
                    'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isFlg && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-700/60 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-600 border border-indigo-500" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50" />
              <span>Flagged for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-700/50 border border-slate-600" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800">
        Acme HRMS Assessment Engine • All responses are saved automatically in real-time.
      </footer>

      {/* SUBMIT CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center gap-3 text-white font-bold text-lg">
              <ShieldAlert className="text-emerald-400" size={24} />
              <span>Ready to Submit Assessment?</span>
            </div>

            <p className="text-slate-300 text-sm">
              You are about to finalize your attempt for <strong className="text-white">{sessionData.assessment.title}</strong>. Please review your completion summary:
            </p>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/80 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Questions:</span>
                <span className="font-bold text-white">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Answered Questions:</span>
                <span className="font-bold text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unanswered Questions:</span>
                <span className="font-bold text-rose-400">{questions.length - answeredCount}</span>
              </div>
            </div>

            {questions.length - answeredCount > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>You have {questions.length - answeredCount} unanswered question(s). Are you sure you want to proceed without answering?</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-medium"
              >
                Continue Review
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Submit Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAssessmentSession;
