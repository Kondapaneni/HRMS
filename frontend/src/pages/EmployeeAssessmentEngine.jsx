import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertTriangle,
  Camera, Circle, CheckCircle2, Save, ShieldAlert, Loader2
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ===================== RENDER =====================
  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 flex items-center gap-3">
          <ShieldAlert size={24} />
          <div>
            <p className="font-bold text-base">Cannot Start Assessment</p>
            <p className="text-sm mt-1">{error}</p>
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
  const isUrgent = timeLeft !== null && timeLeft < 300; // Less than 5 minutes

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Tab Switch Warning Modal */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-rose-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">⚠️ Warning: Tab Switch Detected!</h3>
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

      {/* Left Sidebar - Question Navigator */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Header with Timer */}
        <div className={`p-4 border-b border-slate-200 ${isUrgent ? 'bg-rose-50' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">Time Left</span>
            <div className="flex items-center gap-1">
              <Circle size={8} className="text-rose-500 fill-rose-500 animate-pulse" />
              <span className="text-[10px] font-bold text-rose-600">RECORDING</span>
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${isUrgent ? 'text-rose-600' : 'text-blue-700'}`}>
            <Clock size={20} className="inline mr-2" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Camera Preview */}
        <div className="p-3 border-b border-slate-200">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-rose-600 px-2 py-0.5 rounded text-white text-[10px] font-bold">
              <Circle size={6} className="fill-white animate-pulse" />
              REC
            </div>
          </div>
        </div>

        {/* Question Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[11px] font-bold uppercase text-slate-400 mb-3">
            Questions ({questions.length})
          </p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id]?.answer?.length > 0;
              const isCurrent = idx === currentQuestion;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`w-full aspect-square rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                      : isAnswered
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded bg-blue-600"></div>
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
              <span>Unanswered</span>
            </div>
          </div>
        </div>

        {/* Auto-save indicator */}
        <div className="p-3 border-t border-slate-200 text-center">
          {autoSaving ? (
            <span className="text-[11px] font-bold text-blue-600 flex items-center justify-center gap-1">
              <Save size={12} className="animate-pulse" /> Auto-saving...
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-400">
              Auto-save every 30s
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Question Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-xs text-slate-400 ml-3">
              {currentQ?.marks || 1} mark{(currentQ?.marks || 1) > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {answers[currentQ?.id]?.answer?.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                <CheckCircle2 size={12} /> Answered
              </span>
            )}
          </div>
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
        <div className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
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
  );
};

export default EmployeeAssessmentEngine;
