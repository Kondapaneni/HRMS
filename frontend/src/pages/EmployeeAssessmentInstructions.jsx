import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import {
  Clock, Award, ShieldAlert, Video, AlertTriangle,
  ChevronRight, BookOpen, Target, Monitor, Camera,
  CheckCircle2, XCircle
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const EmployeeAssessmentInstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const assessmentId = location.state?.assessmentId;

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null); // null, 'granted', 'denied'
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/employee/assessments', { replace: true });
      return;
    }
    const fetchAssessment = async () => {
      try {
        // Use admin get endpoint to fetch rules (we can also create an employee-specific one)
        const res = await api.get(`/admin/assessments/${assessmentId}`);
        setAssessment(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load assessment details');
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [assessmentId, navigate]);

  const handleCheckCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraPermission('granted');
      // Stop the stream immediately after checking
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setCameraPermission('denied');
    }
  };

  const handleBeginExam = () => {
    navigate('/employee/assessments/session', {
      state: { assessmentId },
      replace: true
    });
  };

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="p-6 w-full max-w-3xl mx-auto">
        <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 flex items-center gap-3">
          <ShieldAlert size={24} />
          <div>
            <p className="font-bold text-base">Unable to Load Assessment</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const questionsCount = assessment?.selected_questions?.length || 0;
  const totalMarks = questionsCount * (assessment?.marks_per_question || 1);

  return (
    <div className="p-6 w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black">{assessment.title}</h1>
            <p className="text-blue-200 text-sm font-medium mt-0.5">
              {assessment.department || 'General'} Department
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <Clock size={20} className="mx-auto mb-1 text-blue-200" />
            <p className="text-2xl font-black">{assessment.duration_minutes}</p>
            <p className="text-[11px] font-bold text-blue-200 uppercase">Minutes</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <BookOpen size={20} className="mx-auto mb-1 text-blue-200" />
            <p className="text-2xl font-black">{questionsCount}</p>
            <p className="text-[11px] font-bold text-blue-200 uppercase">Questions</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <Target size={20} className="mx-auto mb-1 text-blue-200" />
            <p className="text-2xl font-black">{totalMarks}</p>
            <p className="text-[11px] font-bold text-blue-200 uppercase">Total Marks</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <Award size={20} className="mx-auto mb-1 text-blue-200" />
            <p className="text-2xl font-black">{assessment.passing_percentage}%</p>
            <p className="text-[11px] font-bold text-blue-200 uppercase">Pass %</p>
          </div>
        </div>
      </div>

      {/* Strict Rules Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-amber-50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-600" />
            <h2 className="text-lg font-black text-slate-900">Exam Rules & Security</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <Monitor size={18} className="text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm text-rose-800">Tab Switching is Strictly Monitored</p>
              <p className="text-xs text-rose-600 mt-0.5">
                Switching to another tab or window during the exam will trigger a warning. 
                On the <strong>second offense</strong>, the exam will be <strong>automatically submitted</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <ShieldAlert size={18} className="text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm text-rose-800">No Page Refresh Allowed</p>
              <p className="text-xs text-rose-600 mt-0.5">
                Refreshing the page or closing the tab will <strong>automatically submit your exam</strong>. 
                Make sure your internet connection is stable.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <Camera size={18} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm text-indigo-800">Webcam Proctoring is Active</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Your webcam and microphone will be <strong>recording throughout the exam</strong>. 
                The recording will be submitted to the admin for review.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Clock size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm text-blue-800">Timer is Strictly Enforced</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Once you begin, the countdown timer starts. When the time expires, the exam is 
                <strong> automatically submitted</strong> with whatever answers you have completed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Check */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Video size={18} className="text-indigo-600" />
          Pre-Exam Camera Check
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Before you can begin, please verify that your camera and microphone are working.
        </p>

        {cameraPermission === null && (
          <button
            onClick={handleCheckCamera}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <Camera size={16} />
            Check Camera & Microphone
          </button>
        )}

        {cameraPermission === 'granted' && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">Camera and Microphone access granted. You're good to go!</span>
          </div>
        )}

        {cameraPermission === 'denied' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <XCircle size={18} className="text-rose-600" />
              <span className="text-sm font-bold text-rose-700">Camera or Microphone access was denied. Please allow access in your browser settings and try again.</span>
            </div>
            <button
              onClick={handleCheckCamera}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Agreement & Start */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
          />
          <span className="text-sm text-slate-700 group-hover:text-slate-900 transition">
            I have read and understood all the rules. I agree that my webcam will record during the exam, 
            tab switching is monitored, and any violation may result in automatic exam submission. 
            I am ready to begin.
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/employee/assessments')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer"
          >
            ← Back to Assessments
          </button>
          <button
            onClick={handleBeginExam}
            disabled={!agreed || cameraPermission !== 'granted'}
            className={`px-8 py-3 rounded-xl font-black text-sm transition flex items-center gap-2 ${
              agreed && cameraPermission === 'granted'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Begin Exam
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAssessmentInstructions;
