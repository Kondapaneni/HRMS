import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertTriangle,
  Circle, CheckCircle2, Save, ShieldAlert, Loader2, ArrowLeft,
  Lock, BookOpen
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

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

  // Timer
  const [timeLeft, setTimeLeft] = useState(null);

  // Tab switch tracking
  const tabSwitchCount = useRef(0);
  const [showTabWarning, setShowTabWarning] = useState(false);

  // Webcam recording
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const streamRef = useRef(null);
  const videoPreviewRef = useRef(null);

  // Refs for cleanup
  const autoSaveIntervalRef = useRef(null);
  const submittedRef = useRef(false);
  const examDataRef = useRef(null);
  const answersRef = useRef({});

  // Keep refs in sync with state
  useEffect(() => { examDataRef.current = examData; }, [examData]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // ===================== SUBMIT FUNCTION =====================
  const submitExam = useCallback(async (reason = 'manual') => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop auto-save
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    setSubmitting(true);

    try {
      const currentExamData = examDataRef.current;
      const currentAnswers = answersRef.current;

      if (!currentExamData) return;

      // Upload proctoring video to Supabase Storage
      let proctoringVideoUrl = null;
      if (videoChunksRef.current.length > 0) {
        try {
          const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          const fileName = `proctoring_${currentExamData.attempt_id}_${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from('proctoring_videos')
            .upload(fileName, videoBlob, { contentType: 'video/webm', upsert: false });

          if (!uploadError) {
            proctoringVideoUrl = fileName;
          }
        } catch (uploadErr) {
          console.error('Video upload failed:', uploadErr);
        }
      }

      // Submit exam to backend
      const res = await api.post(`/employee/assessments/attempts/${currentExamData.attempt_id}/submit`, {
        answers: currentAnswers,
        proctoring_video_url: proctoringVideoUrl,
        submit_reason: reason
      });

      // Stop webcam stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Exit fullscreen before navigating
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
      }

      // Navigate to result
      navigate('/employee/assessments/result', {
        state: {
          result: res.data,
          assessmentTitle: currentExamData.assessment?.title,
          resultVisibility: currentExamData.assessment?.result_visibility
        },
        replace: true
      });
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitting(false);
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
        setError(err.response?.data?.error || 'Failed to start assessment');
      } finally {
        setLoading(false);
      }
    };

    startExam();
  }, [assessmentId, navigate]);

  // ===================== FULLSCREEN + BACK BUTTON BLOCK =====================
  useEffect(() => {
    if (!examData) return;

    // Request fullscreen
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen request failed:', e);
      }
    };
    requestFullscreen();

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

  // ===================== START WEBCAM =====================
  useEffect(() => {
    if (!examData) return;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
        mediaRecorderRef.current = mediaRecorder;
        videoChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) videoChunksRef.current.push(e.data);
        };

        mediaRecorder.start(5000);
      } catch (err) {
        console.error('Webcam start failed:', err);
      }
    };

    startWebcam();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
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
        console.error('Auto-save failed:', err);
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
      if (!submittedRef.current) {
        submitExam('page_refresh_or_close');
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examData, submitExam]);

  // ===================== RE-ENTER FULLSCREEN =====================
  useEffect(() => {
    if (!examData) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        setTimeout(() => {
          if (!submittedRef.current) {
            try { document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ }
          }
        }, 300);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examData]);

  // ===================== ANSWER HANDLER =====================
  const handleAnswer = (questionId, value, questionType) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      if (questionType === 'mcq_multi') {
        const current = newAnswers[questionId]?.answer || [];
        if (current.includes(value)) {
          newAnswers[questionId] = { answer: current.filter(v => v !== value) };
        } else {
          newAnswers[questionId] = { answer: [...current, value] };
        }
      } else {
        newAnswers[questionId] = { answer: [value] };
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
        <p className="text-sm text-slate-500 mt-2">Please wait while we upload your responses and proctoring video.</p>
      </div>
    );
  }

  const questions = examData?.questions || [];
  const currentQ = questions[currentQuestion];
  const isUrgent = timeLeft !== null && timeLeft < 300;
  const isCritical = timeLeft !== null && timeLeft < 60;
  const answeredCount = Object.values(answers).filter(a => a?.answer?.length > 0).length;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 select-none" style={{ userSelect: 'none' }}>
      {/* Tab Switch Warning Modal */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-rose-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">⚠️ Tab Switch Detected!</h3>
            <p className="text-sm text-slate-600 mb-6">
              You left the exam tab. This is your <strong className="text-rose-600">first and only warning</strong>. 
              If you switch tabs again, your exam will be <strong className="text-rose-600">automatically submitted</strong>.
            </p>
            <button
              onClick={() => setShowTabWarning(false)}
              className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer"
            >
              I Understand, Continue Exam
            </button>
          </div>
        </div>
      )}

      {/* ===== TOP BAR ===== */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0 shadow-sm">
        {/* Left - Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Lock size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate max-w-xs">
              {examData?.assessment?.title || 'Assessment'}
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Secure Exam Mode</p>
          </div>
        </div>

        {/* Center - Timer */}
        <div className={`flex items-center gap-2.5 px-5 py-1.5 rounded-xl border ${
          isCritical
            ? 'bg-rose-50 border-rose-200'
            : isUrgent
              ? 'bg-amber-50 border-amber-200'
              : 'bg-slate-50 border-slate-200'
        }`}>
          <Clock size={16} className={isCritical ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-slate-500'} />
          <span className={`text-xl font-mono font-black tracking-wider ${
            isCritical ? 'text-rose-600 animate-pulse' : isUrgent ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Right - Recording + Camera + Auto-save */}
        <div className="flex items-center gap-3">
          {autoSaving && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
              <Save size={12} className="animate-pulse" /> Saving...
            </span>
          )}

          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
            <Circle size={6} className="text-rose-500 fill-rose-500 animate-pulse" />
            <span className="text-[10px] font-bold text-rose-600 uppercase">REC</span>
          </div>

          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 border-2 border-slate-300">
            <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Question Navigator */}
        <div className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Progress Summary */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Progress</span>
              <span className="text-[11px] font-bold text-slate-600">{answeredCount}/{questions.length}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Question Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id]?.answer?.length > 0;
                const isCurrent = idx === currentQuestion;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-full aspect-square rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : isAnswered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded bg-blue-600"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-200"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded bg-slate-50 border border-slate-200"></div>
                <span>Unanswered</span>
              </div>
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="p-3 border-t border-slate-100 text-center">
            <span className="text-[10px] font-semibold text-slate-400">Auto-save every 30s</span>
          </div>
        </div>

        {/* Question Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Question Header */}
          <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-blue-600 uppercase">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-xs text-slate-400">
                {currentQ?.marks || 1} mark{(currentQ?.marks || 1) > 1 ? 's' : ''}
              </span>
            </div>
            {answers[currentQ?.id]?.answer?.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <CheckCircle2 size={12} /> Answered
              </span>
            )}
          </div>

          {/* Question Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {currentQ && (
              <div className="max-w-3xl">
                <h2 className="text-lg font-bold text-slate-900 mb-6 leading-relaxed">
                  {currentQ.title}
                </h2>

                <div className="space-y-3">
                  {(currentQ.options || []).map((option, optIdx) => {
                    const optionText = typeof option === 'object' ? option.text : option;
                    const optionValue = typeof option === 'object' ? (option.text || option.value) : option;
                    const isSelected = answers[currentQ.id]?.answer?.includes(optionValue);
                    const isMCQMulti = currentQ.question_type === 'mcq_multi';

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswer(currentQ.id, optionValue, currentQ.question_type)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-4 cursor-pointer group ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className={`w-8 h-8 shrink-0 ${isMCQMulti ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center transition ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-slate-300 group-hover:border-blue-400'
                        }`}>
                          {isSelected ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
                          {optionText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="bg-white border-t border-slate-200 px-8 py-3.5 flex items-center justify-between shrink-0">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${
                currentQuestion === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
              }`}
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
                      submitExam('manual');
                    }
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-lg"
                >
                  <Send size={16} />
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAssessmentEngine;
