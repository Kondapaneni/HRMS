import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertTriangle,
  Camera, Circle, CheckCircle2, Save, ShieldAlert, Loader2, ArrowLeft,
  Monitor, Lock, Eye
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

    // Trap browser back button using history.pushState
    const trapHistory = () => {
      window.history.pushState(null, '', window.location.href);
    };
    // Push initial state
    trapHistory();

    const handlePopState = (e) => {
      // Prevent back navigation - push state again
      trapHistory();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [examData]);

  // ===================== KEYBOARD BLOCKING =====================
  useEffect(() => {
    if (!examData) return;

    const handleKeyDown = (e) => {
      // Block Alt+Left (back), Alt+Right (forward)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Backspace when not focused on an input/textarea (browser back)
      if (e.key === 'Backspace') {
        const tag = e.target.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Block F5 (refresh)
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Ctrl+R (refresh), Ctrl+W (close tab), Ctrl+N (new window), Ctrl+T (new tab)
      if (e.ctrlKey && ['r', 'w', 'n', 't', 'l'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Ctrl+Shift+I (dev tools), Ctrl+Shift+J (console), F12 (dev tools)
      if ((e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) || e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Escape (would exit fullscreen)
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    // Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

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

        // Show preview
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        // Start recording
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
        mediaRecorderRef.current = mediaRecorder;
        videoChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            videoChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(5000); // Record in 5-second chunks
      } catch (err) {
        console.error('Webcam start failed:', err);
      }
    };

    startWebcam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [examData]);

  // ===================== COUNTDOWN TIMER =====================
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Time's up - auto submit
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
    }, 30000); // Every 30 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [examData]);

  // ===================== TAB SWITCH DETECTION =====================
  useEffect(() => {
    if (!examData) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current += 1;

        if (tabSwitchCount.current >= 2) {
          // Second offense: auto-submit
          submitExam('tab_switch_violation');
        } else {
          // First offense: show warning
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
        // Trigger auto-submit on refresh/close
        submitExam('page_refresh_or_close');
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examData, submitExam]);

  // ===================== RE-ENTER FULLSCREEN ON EXIT =====================
  useEffect(() => {
    if (!examData) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        // User exited fullscreen (e.g., pressed Escape) - re-enter
        setTimeout(() => {
          if (!submittedRef.current) {
            try {
              document.documentElement.requestFullscreen();
            } catch (e) { /* ignore */ }
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
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ===================== RENDER =====================
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
            <Monitor size={36} className="text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mt-6">Preparing Exam Environment...</h2>
        <p className="text-sm text-slate-400 mt-2">Setting up proctoring and loading questions</p>
        <Loader2 size={20} className="text-indigo-400 animate-spin mt-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} className="text-rose-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Cannot Start Assessment</h3>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/employee/assessments')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition cursor-pointer inline-flex items-center gap-2"
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
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Send size={32} className="text-white animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mt-6">Submitting Your Exam...</h2>
        <p className="text-sm text-slate-400 mt-2">Uploading responses and proctoring video</p>
        <Loader2 size={20} className="text-emerald-400 animate-spin mt-4" />
      </div>
    );
  }

  const questions = examData?.questions || [];
  const currentQ = questions[currentQuestion];
  const isUrgent = timeLeft !== null && timeLeft < 300; // Less than 5 minutes
  const isCritical = timeLeft !== null && timeLeft < 60; // Less than 1 minute
  const answeredCount = Object.values(answers).filter(a => a?.answer?.length > 0).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 select-none" style={{ userSelect: 'none' }}>
      {/* Tab Switch Warning Modal */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl shadow-rose-500/10 p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-rose-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">⚠️ Tab Switch Detected!</h3>
            <p className="text-sm text-slate-400 mb-6">
              You left the exam tab. This is your <strong className="text-rose-400">first and only warning</strong>. 
              If you switch tabs again, your exam will be <strong className="text-rose-400">automatically submitted</strong>.
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
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-5 shrink-0">
        {/* Left - Assessment Title & Lock Icon */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Lock size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight truncate max-w-xs">
              {examData?.assessment?.title || 'Assessment'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">SECURE EXAM MODE</p>
          </div>
        </div>

        {/* Center - Timer */}
        <div className={`flex items-center gap-2.5 px-5 py-1.5 rounded-full border ${
          isCritical
            ? 'bg-rose-500/20 border-rose-500/40'
            : isUrgent
              ? 'bg-amber-500/20 border-amber-500/40'
              : 'bg-slate-800 border-slate-700'
        }`}>
          <Clock size={16} className={isCritical ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-slate-400'} />
          <span className={`text-lg font-mono font-black tracking-wider ${
            isCritical ? 'text-rose-400 animate-pulse' : isUrgent ? 'text-amber-400' : 'text-white'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Right - Camera + Recording + Progress */}
        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-bold">{answeredCount}/{questions.length}</span>
          </div>

          {/* Recording badge */}
          <div className="flex items-center gap-1.5 bg-rose-500/20 px-2.5 py-1 rounded-full">
            <Circle size={6} className="text-rose-500 fill-rose-500 animate-pulse" />
            <span className="text-[10px] font-bold text-rose-400 uppercase">REC</span>
          </div>

          {/* Camera Preview (mini) */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 relative">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Auto-save */}
          {autoSaving && (
            <div className="flex items-center gap-1">
              <Save size={12} className="text-indigo-400 animate-pulse" />
              <span className="text-[10px] text-indigo-400 font-bold">Saving</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Navigator Sidebar */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Questions ({questions.length})
            </p>
          </div>

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
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-500/20'
                        : isAnswered
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded bg-indigo-600"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/40"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700"></div>
                <span>Unanswered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Question Header */}
          <div className="bg-slate-900/50 border-b border-slate-800 px-8 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-[11px] text-slate-600 font-medium">
                {currentQ?.marks || 1} mark{(currentQ?.marks || 1) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {answers[currentQ?.id]?.answer?.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  <CheckCircle2 size={12} /> Answered
                </span>
              )}
            </div>
          </div>

          {/* Question Body */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {currentQ && (
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl font-bold text-white mb-8 leading-relaxed">
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
                        className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-4 cursor-pointer group ${
                          isSelected
                            ? 'border-indigo-500/60 bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
                        }`}
                      >
                        <div className={`w-9 h-9 shrink-0 ${isMCQMulti ? 'rounded-lg' : 'rounded-full'} border-2 flex items-center justify-center transition ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-slate-600 group-hover:border-slate-400'
                        }`}>
                          {isSelected ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <span className="text-xs font-bold text-slate-500">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-300'}`}>
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
          <div className="bg-slate-900/50 border-t border-slate-800 px-8 py-3.5 flex items-center justify-between shrink-0">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${
                currentQuestion === 0
                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
              }`}
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer"
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
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
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
