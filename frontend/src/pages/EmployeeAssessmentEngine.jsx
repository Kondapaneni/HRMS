import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertTriangle,
  Circle, CheckCircle2, Save, ShieldAlert, Loader2, ArrowLeft,
  Lock, BookOpen, ShieldCheck, Monitor
} from 'lucide-react';
import PageLoader from '../components/PageLoader';
import { motion, AnimatePresence } from 'framer-motion';

const EmployeeAssessmentEngine = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const assessmentId = location.state?.assessmentId;

  // Core exam state
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Modals state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(null);

  // Tab switch tracking
  const tabSwitchCount = useRef(0);



  // Refs for cleanup and race condition prevention
  const autoSaveIntervalRef = useRef(null);
  const submittedRef = useRef(false);
  const autoSavingRef = useRef(false);
  const examDataRef = useRef(null);
  const answersRef = useRef({});

  // Keep refs in sync with state
  useEffect(() => { examDataRef.current = examData; }, [examData]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { autoSavingRef.current = autoSaving; }, [autoSaving]);



  // ===================== SUBMIT FUNCTION =====================
  const submitExam = useCallback(async (reason = 'manual') => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // Stop regular auto-save timer immediately
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    setSubmitting(true);

    try {
      const currentExamData = examDataRef.current;
      const currentAnswers = answersRef.current;
      if (!currentExamData) return;

      // STEP 1: Final Pre-Submit Auto-Save (prevent race condition with ongoing saves)
      setUploadProgress('Saving final progress...');
      try {
        while (autoSavingRef.current) {
          await new Promise(r => setTimeout(r, 100));
        }
        await api.put(`/employee/assessments/attempts/${currentExamData.attempt_id}/save`, {
          answers: currentAnswers
        });
      } catch (saveErr) {
        // Final auto-save failed, proceed with submission.
      }



      // STEP 4: Submit assessment for final evaluation
      setUploadProgress('Submitting assessment for evaluation...');
      const res = await api.post(`/employee/assessments/attempts/${currentExamData.attempt_id}/submit`, {
        answers: currentAnswers,
        submit_reason: reason
      });

      // Exit fullscreen safely
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
      }

      // STEP 5: Navigate to result page
      const finalAttemptId = res.data.attempt_id || currentExamData.attempt_id;
      navigate(`/employee/assessments/result?attemptId=${finalAttemptId}`, {
        state: {
          result: res.data,
          attemptId: finalAttemptId,
          assessmentTitle: currentExamData.assessment?.title,
          resultVisibility: currentExamData.assessment?.result_visibility
        },
        replace: true
      });
    } catch (err) {
      setSubmitting(false);
      setUploadProgress('');
      submittedRef.current = false;
    }
  }, [navigate]);

  // ===================== INITIAL LOAD =====================
  useEffect(() => {
    if (!assessmentId) {
      navigate('/employee/assessments', { replace: true });
      return;
    }

    const startExam = async () => {
      try {
        const res = await api.post(`/employee/assessments/${assessmentId}/start`);
        setExamData(res.data);
        setAnswers(res.data.saved_answers || {});

        // Calculate time left from deadline
        if (res.data.deadline_timestamp > 0) {
          const serverNow = res.data.server_time;
          const secondsLeft = res.data.deadline_timestamp - serverNow;
          setTimeLeft(Math.max(0, secondsLeft));
        }
      } catch (err) {
        const errMsg = err.response?.data?.error || 'Failed to start assessment';
        if (errMsg.toLowerCase().includes('already submitted') || errMsg.toLowerCase().includes('allowable attempts')) {
          navigate('/employee/assessments', { replace: true });
          return;
        }
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    startExam();
  }, [assessmentId, navigate]);

  // ===================== FULLSCREEN + BACK BUTTON BLOCK =====================
  useEffect(() => {
    if (!examData) return;

    // Request fullscreen and lock ESC key
    const enforceFullscreen = () => {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().then(() => {
            if (navigator.keyboard && navigator.keyboard.lock) {
              navigator.keyboard.lock(['Escape', 'F11', 'F5']).catch(() => {});
            }
          }).catch(() => {
            setShowFullscreenModal(true);
          });
        } else {
          setShowFullscreenModal(true);
        }
      } else {
        if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape', 'F11', 'F5']).catch(() => {});
        }
      }
    };

    enforceFullscreen();

    // Trap browser back button
    const trapHistory = () => {
      window.history.pushState(null, '', window.location.href);
    };
    trapHistory();

    const handlePopState = () => {
      trapHistory();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [examData]);

  // ===================== KEYBOARD BLOCKING =====================
  useEffect(() => {
    if (!examData) return;

    const handleKeyDown = (e) => {
      // Block Alt+Left/Right (browser back/forward)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault(); e.stopPropagation(); return;
      }
      // Block Backspace when not in input (browser back)
      if (e.key === 'Backspace') {
        const tag = e.target.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
          e.preventDefault(); e.stopPropagation(); return;
        }
      }
      // Block F5 (refresh)
      if (e.key === 'F5') { e.preventDefault(); e.stopPropagation(); return; }
      // Block Ctrl+R/W/N/T/L
      if (e.ctrlKey && ['r', 'w', 'n', 't', 'l'].includes(e.key.toLowerCase())) {
        e.preventDefault(); e.stopPropagation(); return;
      }
      // Block dev tools shortcuts
      if ((e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) || e.key === 'F12') {
        e.preventDefault(); e.stopPropagation(); return;
      }
      // Block Escape (exit fullscreen)
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return; }
    };

    const handleContextMenu = (e) => e.preventDefault();

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [examData]);

  // ===================== TOUCHPAD & GESTURE BLOCKING =====================
  useEffect(() => {
    if (!examData) return;

    // 1. Block CSS overscroll navigation (two-finger horizontal swipe back/forward & pull-to-refresh)
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    // 2. Intercept touchpad wheel navigation (horizontal swipe) & touchpad pinch-to-zoom (ctrl+wheel)
    const handleWheel = (e) => {
      // If horizontal scrolling is greater than vertical (two-finger swipe left/right navigation)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 0) {
        e.preventDefault();
      }
      // If holding Ctrl during wheel (touchpad pinch-to-zoom in Windows Chrome/Edge)
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // 3. Intercept Safari/Mac touchpad zoom gestures
    const preventGesture = (e) => e.preventDefault();

    // 4. Intercept multi-finger touchscreen swipes
    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('gesturestart', preventGesture, { passive: false });
    window.addEventListener('gesturechange', preventGesture, { passive: false });
    window.addEventListener('gestureend', preventGesture, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      window.removeEventListener('wheel', handleWheel, { passive: false });
      window.removeEventListener('gesturestart', preventGesture, { passive: false });
      window.removeEventListener('gesturechange', preventGesture, { passive: false });
      window.removeEventListener('gestureend', preventGesture, { passive: false });
      window.removeEventListener('touchmove', handleTouchMove, { passive: false });
    };
  }, [examData]);



  // ===================== COUNTDOWN TIMER =====================
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          submitExam('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, submitExam]);

  // ===================== AUTO-SAVE =====================
  useEffect(() => {
    if (!examData) return;

    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        setAutoSaving(true);
        await api.put(`/employee/assessments/attempts/${examData.attempt_id}/save`, {
          answers: answersRef.current
        });
      } catch (err) {
        // ignore periodic save failures, form state remains.
      } finally {
        setAutoSaving(false);
      }
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [examData]);

  // ===================== TAB SWITCH DETECTION =====================
  useEffect(() => {
    if (!examData) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current += 1;
        if (tabSwitchCount.current >= 2) {
          submitExam('tab_switch_violation');
        } else {
          setShowTabWarning(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examData, submitExam]);

  // ===================== PREVENT REFRESH / CLOSE =====================
  useEffect(() => {
    if (!examData) return;

    const handleBeforeUnload = (e) => {
      if (!submittedRef.current && examDataRef.current) {
        try {
          const payload = JSON.stringify({ answers: answersRef.current });
          const url = `${api.defaults.baseURL}/employee/assessments/attempts/${examDataRef.current.attempt_id}/save`;
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
          } else {
            fetch(url, { method: 'PUT', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
          }
        } catch (err) { /* ignore */ }
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examData]);

  // ===================== RE-ENTER FULLSCREEN & AGGRESSIVE RECOVERY =====================
  useEffect(() => {
    if (!examData) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        setShowFullscreenModal(true);
      } else {
        if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape', 'F11', 'F5']).catch(() => {});
        }
        setShowFullscreenModal(false);
      }
    };

    const forceReturnFullscreen = () => {
      if (showFullscreenModal && !document.fullscreenElement && !submittedRef.current) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().then(() => {
            if (navigator.keyboard && navigator.keyboard.lock) {
              navigator.keyboard.lock(['Escape', 'F11', 'F5']).catch(() => {});
            }
            setShowFullscreenModal(false);
          }).catch(() => {});
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('click', forceReturnFullscreen, true);
    window.addEventListener('keydown', forceReturnFullscreen, true);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('click', forceReturnFullscreen, true);
      window.removeEventListener('keydown', forceReturnFullscreen, true);
    };
  }, [examData, showFullscreenModal]);

  // ===================== ANSWER HANDLER =====================
  const handleAnswer = (questionId, value, questionType) => {
    const key = String(questionId);
    const isMulti = ['mcq_multi', 'mcq_multiple', 'multiple'].includes(questionType);
    setAnswers(prev => {
      const newAnswers = { ...prev };
      if (isMulti) {
        const current = newAnswers[key]?.answer || [];
        if (current.includes(value)) {
          newAnswers[key] = { answer: current.filter(v => v !== value) };
        } else {
          newAnswers[key] = { answer: [...current, value] };
        }
      } else {
        newAnswers[key] = { answer: [value] };
      }
      return newAnswers;
    });
  };

  // ===================== TIME FORMATTING =====================
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ===================== RENDER =====================
  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Cannot Start Assessment</h3>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/employee/assessments')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 bg-white/95 backdrop-blur flex flex-col items-center justify-center z-50">
        <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
        <h2 className="text-2xl font-black text-slate-900">Submitting Your Exam...</h2>
        <p className="text-sm font-bold text-blue-600 mt-2 animate-pulse">{uploadProgress || 'Please wait while we upload your responses and proctoring video.'}</p>
        <p className="text-xs text-slate-400 mt-2">Do not close or refresh this browser window.</p>
      </div>
    );
  }

  const questions = examData?.questions || [];
  const currentQ = questions[currentQuestion];
  const isUrgent = timeLeft !== null && timeLeft < 300;
  const isCritical = timeLeft !== null && timeLeft < 60;
  const answeredCount = Object.values(answers).filter(a => a?.answer?.length > 0).length;
  const isMCQMulti = ['mcq_multi', 'mcq_multiple', 'multiple'].includes(currentQ?.question_type);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex flex-col bg-slate-50 select-none" 
      style={{ userSelect: 'none' }}
    >
      {/* Custom Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-7 max-w-md w-full text-center border border-slate-200"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Send size={30} className="text-blue-600 ml-1" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Submit Your Assessment?</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                You have answered <strong className="text-emerald-600 font-bold">{answeredCount}</strong> of <strong className="text-slate-900 font-bold">{questions.length}</strong> questions.
                {questions.length - answeredCount > 0 && (
                  <span className="block mt-1.5 text-amber-600 font-semibold">
                    ⚠️ You still have {questions.length - answeredCount} unanswered question{(questions.length - answeredCount) > 1 ? 's' : ''}.
                  </span>
                )}
                Once submitted, you cannot change your answers.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  Continue Reviewing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitModal(false);
                    submitExam('manual');
                  }}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Yes, Submit Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Switch Warning Modal */}
      <AnimatePresence>
        {showTabWarning && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border border-slate-200"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">⚠️ Tab Switch Detected!</h3>
              <p className="text-sm text-slate-600 mb-6">
                You left the exam tab. This is your <strong className="text-rose-600">first and only warning</strong>. 
                If you switch tabs again, your exam will be <strong className="text-rose-600">automatically submitted</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowTabWarning(false)}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer"
              >
                I Understand, Continue Exam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Requirement Modal */}
      <AnimatePresence>
        {showFullscreenModal && !submitting && !submittedRef.current && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border border-slate-200"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <ShieldAlert size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Full Screen Required</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                To maintain assessment security and proctoring integrity, this exam must be completed in full screen mode.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().then(() => {
                      if (navigator.keyboard && navigator.keyboard.lock) {
                        navigator.keyboard.lock(['Escape', 'F11', 'F5']).catch(() => {});
                      }
                      setShowFullscreenModal(false);
                    }).catch(() => {});
                  } else {
                    setShowFullscreenModal(false);
                  }
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/25 cursor-pointer"
              >
                Enter Full Screen Mode
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== TOP BAR ===== */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
        {/* Left - Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
            <Lock size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate max-w-sm">
              {examData?.assessment?.title || 'Assessment'}
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Secure Exam Mode</p>
          </div>
        </div>

        {/* Center - Timer */}
        <div className={`flex items-center gap-3 px-6 py-2 rounded-xl border shadow-sm ${
          isCritical
            ? 'bg-rose-50 border-rose-300'
            : isUrgent
              ? 'bg-amber-50 border-amber-300'
              : 'bg-slate-50 border-slate-200'
        }`}>
          <Clock size={18} className={isCritical ? 'text-rose-500 animate-bounce' : isUrgent ? 'text-amber-500' : 'text-slate-500'} />
          <span className={`text-xl font-mono font-black tracking-wider ${
            isCritical ? 'text-rose-600 animate-pulse' : isUrgent ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Right - Auto-save indicator & Progress */}
        <div className="flex items-center gap-4">
          {autoSaving ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              <Save size={14} className="animate-pulse" /> Saving...
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
              Auto-saved
            </span>
          )}

          <div className="h-4 w-px bg-slate-200" />

          <div className="text-right">
            <span className="text-xs font-bold text-slate-900">{answeredCount}</span>
            <span className="text-xs text-slate-400 font-medium"> / {questions.length} Answered</span>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Question Navigator */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Progress Summary */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Progress</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{Math.round(questions.length > 0 ? (answeredCount / questions.length) * 100 : 0)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Question Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Questions</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id]?.answer?.length > 0;
                const isCurrent = idx === currentQuestion;
                return (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={q.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentQuestion(idx);
                    }}
                    className={`w-full aspect-square rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-300'
                        : isAnswered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-extrabold'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </motion.button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <div className="w-4 h-4 rounded-md bg-blue-600 shadow-sm shrink-0"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <div className="w-4 h-4 rounded-md bg-emerald-50 border border-emerald-300 shrink-0"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <div className="w-4 h-4 rounded-md bg-slate-50 border border-slate-200 shrink-0"></div>
                <span>Unanswered</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Info */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>Browser Locked</span>
          </div>
        </div>

        {/* Center - Question Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Question Header */}
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {currentQ?.marks || 1} mark{(currentQ?.marks || 1) > 1 ? 's' : ''}
              </span>
            </div>
            {answers[currentQ?.id]?.answer?.length > 0 && (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 shadow-sm"
              >
                <CheckCircle2 size={14} className="text-emerald-600" /> Answered
              </motion.span>
            )}
          </div>

          {/* Question Body */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <AnimatePresence mode="wait">
              {currentQ && (
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-3xl"
                >
                  <h2 className="text-xl font-bold text-slate-900 mb-8 leading-relaxed">
                    {currentQ.title}
                  </h2>

                  <div className="space-y-3.5">
                    {(currentQ.options || []).map((option, optIdx) => {
                      const optionText = typeof option === 'object' ? option.text : option;
                      const optionValue = typeof option === 'object' ? (option.text || option.value) : option;
                      const isSelected = answers[currentQ.id]?.answer?.includes(optionValue);

                      return (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.003, x: 2 }}
                          whileTap={{ scale: 0.995 }}
                          key={optIdx}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAnswer(currentQ.id, optionValue, currentQ.question_type);
                          }}
                          className={`w-full text-left p-4.5 rounded-2xl border-2 transition flex items-center gap-4 cursor-pointer group shadow-sm ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/80 ring-1 ring-blue-600 shadow-blue-500/5'
                              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
                          }`}
                        >
                          <div className={`w-9 h-9 shrink-0 ${isMCQMulti ? 'rounded-lg' : 'rounded-full'} border-2 flex items-center justify-center transition shadow-sm ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-slate-50 group-hover:border-blue-400 group-hover:bg-white'
                          }`}>
                            {isSelected ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-medium leading-relaxed ${isSelected ? 'text-blue-900 font-semibold' : 'text-slate-700'}`}>
                            {optionText}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <motion.button
              type="button"
              whileHover={currentQuestion !== 0 ? { scale: 1.02 } : {}}
              whileTap={currentQuestion !== 0 ? { scale: 0.98 } : {}}
              onClick={(e) => {
                e.preventDefault();
                setCurrentQuestion(prev => Math.max(0, prev - 1));
              }}
              disabled={currentQuestion === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${
                currentQuestion === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-sm'
              }`}
            >
              <ChevronLeft size={16} />
              Previous
            </motion.button>

            <div className="flex items-center gap-3">
              {currentQuestion < questions.length - 1 ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1));
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Next
                  <ChevronRight size={16} />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowSubmitModal(true);
                  }}
                  className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Send size={16} />
                  Submit Exam
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Exam Security beside questions */}
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 p-5">
          <div className="space-y-3.5 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Exam Security</span>
            
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0"></div>
              <span>Tab Protection Enabled</span>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0"></div>
              <span>Fullscreen Lock Active</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeAssessmentEngine;
