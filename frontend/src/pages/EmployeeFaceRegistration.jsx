import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Camera, 
  ScanFace, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  VideoOff, 
  Lock 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { loadModels, detectAndValidateFace } from '../utils/faceApiHelper';

const EmployeeFaceRegistration = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('loading'); // 'loading', 'ready', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [flash, setFlash] = useState(false);

  // Real-time Face Alignment in Circle
  const [isAligned, setIsAligned] = useState(false);
  const [alignmentReason, setAlignmentReason] = useState('Position your face in the circle');

  // Initialize camera and face-api models
  const initCamera = async () => {
    setCameraStatus('loading');
    setErrorMessage('');
    setIsAligned(false);
    setAlignmentReason('Initializing AI camera...');

    try {
      await loadModels();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraStatus('ready');
      setAlignmentReason('Position your face inside the circle');
    } catch (err) {
      console.error('Camera initialization error:', err);
      setCameraStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device detected on your system.');
      } else {
        setErrorMessage(err.message || 'Failed to start camera. Please check camera permissions.');
      }
    }
  };

  useEffect(() => {
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Real-time alignment checker loop (runs every 200ms when camera is active)
  useEffect(() => {
    let intervalId;
    let isChecking = false;

    if (cameraStatus === 'ready' && !isSuccess && !isCapturing) {
      intervalId = setInterval(async () => {
        if (isChecking || !videoRef.current || videoRef.current.readyState !== 4) return;
        isChecking = true;

        try {
          const result = await detectAndValidateFace(videoRef.current);
          setIsAligned(result.isAligned);
          setAlignmentReason(result.reason);
        } catch (err) {
          console.error('Face alignment tracking error:', err);
        } finally {
          isChecking = false;
        }
      }, 220);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [cameraStatus, isSuccess, isCapturing]);

  // Capture face descriptor when user clicks the Capture Button
  const handleCapture = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || isCapturing) return;

    // Strict validation: Only accept if face is properly aligned inside the circle
    if (!isAligned) {
      setErrorMessage('Please align your entire face inside the green circle before capturing.');
      toast.error('Face is not aligned inside the circle!');
      return;
    }

    setIsCapturing(true);
    setErrorMessage('');

    // Trigger visual camera shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    try {
      // Final confirmation validation
      const result = await detectAndValidateFace(videoRef.current);

      if (!result.isAligned || !result.descriptor) {
        setErrorMessage(result.reason || 'Face moved outside the circle. Please center your face and try again.');
        toast.error('Face moved out of frame. Please align inside the green circle.');
        setIsCapturing(false);
        return;
      }

      // Convert Float32Array / Array to string format for pgvector '[1, 2, 3...]'
      const vectorString = `[${result.descriptor.join(',')}]`;

      await api.post('/employee/biometrics/face', {
        faceDescriptor: vectorString
      });

      if (fetchProfile) {
        await fetchProfile();
      }
      queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });

      setIsSuccess(true);
      toast.success('Face registered successfully!');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setTimeout(() => {
        navigate('/employee/profile');
      }, 1800);

    } catch (err) {
      console.error('Face capture error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to save face descriptor.';
      setErrorMessage(msg);
      toast.error(msg);
      setIsCapturing(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] md:h-screen md:max-h-screen w-full flex flex-col justify-between bg-[#f8fafd] text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] font-sans antialiased overflow-y-auto md:overflow-hidden relative">
      {/* Colorful Google Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4285F4]/12 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EA4335]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-[#FBBC05]/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#34A853]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Material 3 Card Container */}
      <div className="flex-1 flex items-center justify-center p-2.5 sm:p-4 md:p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-[980px] bg-white rounded-[24px] p-4 sm:p-8 md:p-9 border border-[#e0e3e7] shadow-[0_4px_24px_rgba(66,133,244,0.08),0_1px_3px_rgba(0,0,0,0.05)] md:grid md:grid-cols-2 md:gap-10 items-center relative overflow-hidden my-auto"
        >
          {/* Top 4-Color Google Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

          {/* Left Column: Branding & Information */}
          <div className="flex flex-col justify-between h-full pr-0 md:pr-2 mb-6 md:mb-0">
            <div>
              {/* Brand Header */}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1f1f1f]">Acme</span>
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#4285F4]">HRMS</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[11px] font-medium text-[#5f6368] ml-1">Biometric Security</span>
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[30px] font-normal text-[#1f1f1f] mt-3 md:mt-4 mb-1 leading-tight tracking-tight">
                Face Registration
              </h1>
              <p className="text-xs sm:text-sm text-[#5f6368] font-normal">
                Align your face inside the circle. When the border turns <span className="font-semibold text-emerald-600">Green</span>, click Capture to register.
              </p>

              {/* Colorful Google Feature Pills */}
              <div className="mt-4 md:mt-5 grid grid-cols-1 gap-2 md:gap-2.5">
                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e8f0fe]/70 border border-[#d2e3fc] text-[#1967d2] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e8f0fe]">
                  <div className="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={13} />
                  </div>
                  <span>1-Click Camera Login &amp; Punch Verification</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e6f4ea]/70 border border-[#ceead6] text-[#137333] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e6f4ea]">
                  <div className="w-6 h-6 rounded-lg bg-[#34A853] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck size={13} />
                  </div>
                  <span>High-Precision pgvector Face Matching</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fef7e0]/70 border border-[#feefc3] text-[#b06000] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fef7e0]">
                  <div className="w-6 h-6 rounded-lg bg-[#FBBC05] text-[#1f1f1f] flex items-center justify-center shrink-0 shadow-sm">
                    <Lock size={13} />
                  </div>
                  <span>Zero Photo Storage (Vector Descriptor Only)</span>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div className="mt-6 pt-4 border-t border-[#e0e3e7] text-[11px] text-[#5f6368] hidden md:block">
              <p>
                <strong>Privacy Guaranteed:</strong> We convert your facial features into an encrypted 128-dimensional mathematical vector. Actual photos are never saved to our servers.
              </p>
            </div>
          </div>

          {/* Right Column: Camera Viewport & Actions */}
          <div className="flex flex-col justify-between">
            {/* Top Navigation */}
            <div className="flex justify-between items-center mb-3">
              <Link
                to="/employee/profile"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Profile</span>
              </Link>

              <span className="text-[11px] font-semibold text-[#5f6368] bg-[#f1f3f4] px-2.5 py-0.5 rounded-full">
                Step 1 of 1
              </span>
            </div>

            {/* Error Notification Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-3 p-3 bg-[#fce8e6] border border-[#f28b82] rounded-[10px] flex items-start gap-2.5 text-[#d93025] text-xs shadow-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#EA4335]" />
                  <span className="font-medium">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camera Viewport Area */}
            <div className="relative w-full h-[230px] sm:h-[260px] bg-[#1f1f1f] rounded-2xl overflow-hidden border border-[#dadce0] shadow-inner flex flex-col items-center justify-center">
              
              {/* Shutter flash animation */}
              <AnimatePresence>
                {flash && (
                  <motion.div
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-white z-40 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Success View */}
              {isSuccess ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center mb-3 shadow-xs">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-lg font-bold text-[#1f1f1f]">Face Registered Successfully!</h3>
                  <p className="text-xs text-[#5f6368] mt-1 max-w-xs">
                    Your facial biometric descriptor is now active for biometric attendance and login.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#1a73e8]">
                    <div className="w-3.5 h-3.5 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
                    <span>Redirecting to profile...</span>
                  </div>
                </motion.div>
              ) : cameraStatus === 'error' ? (
                /* Camera Error State */
                <div className="flex flex-col items-center justify-center p-6 text-center text-white z-20 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <VideoOff size={24} />
                  </div>
                  <p className="text-xs text-slate-300 max-w-xs">
                    {errorMessage || 'Camera is not accessible.'}
                  </p>
                  <button
                    type="button"
                    onClick={initCamera}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
                  >
                    <RefreshCw size={13} />
                    <span>Retry Camera</span>
                  </button>
                </div>
              ) : (
                /* Active Video Stream */
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover mirror"
                    style={{ transform: 'scaleX(-1)' }}
                  />

                  {/* Camera Overlay Framing Guide with Green / Red Indicator Border */}
                  <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                    {/* Face Target Circle / Oval */}
                    <div 
                      className={`relative w-36 sm:w-44 h-44 sm:h-52 rounded-[50%] transition-all duration-300 flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.38)] ${
                        isAligned 
                          ? 'border-[3.5px] border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.8),0_0_0_9999px_rgba(0,0,0,0.38)] bg-emerald-500/10' 
                          : 'border-[3.5px] border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7),0_0_0_9999px_rgba(0,0,0,0.38)] bg-rose-500/10'
                      }`}
                    >
                      {/* Corner Target Markers */}
                      <div className={`absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 transition-colors duration-300 ${isAligned ? 'border-emerald-400' : 'border-rose-400'}`} />
                      <div className={`absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 transition-colors duration-300 ${isAligned ? 'border-emerald-400' : 'border-rose-400'}`} />
                      <div className={`absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 transition-colors duration-300 ${isAligned ? 'border-emerald-400' : 'border-rose-400'}`} />
                      <div className={`absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 transition-colors duration-300 ${isAligned ? 'border-emerald-400' : 'border-rose-400'}`} />
                    </div>

                    {/* Status Pill on Camera with Live Feedback */}
                    <div 
                      className={`absolute bottom-3 px-3.5 py-1 backdrop-blur-md rounded-full text-[11px] font-semibold text-white shadow-md flex items-center gap-1.5 transition-all duration-200 ${
                        cameraStatus === 'loading'
                          ? 'bg-black/70'
                          : isAligned
                          ? 'bg-emerald-600/90 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                          : 'bg-rose-600/90 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      }`}
                    >
                      {cameraStatus === 'loading' ? (
                        <span>Initializing AI camera...</span>
                      ) : isCapturing ? (
                        <span>Analyzing face descriptor...</span>
                      ) : isAligned ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Face Aligned! Ready to capture</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-white" />
                          <span>{alignmentReason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCapture}
                disabled={cameraStatus !== 'ready' || isCapturing || isSuccess}
                className={`w-full py-3 px-6 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAligned
                    ? 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white shadow-[0_2px_10px_rgba(26,115,232,0.3)]'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {isCapturing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering Face Biometrics...</span>
                  </>
                ) : (
                  <>
                    <Camera size={16} />
                    <span>{isAligned ? 'Capture & Register Face' : 'Align Face in Green Circle'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Bottom Subtext */}
            <p className="text-center text-[11px] text-[#5f6368] mt-2.5">
              {isAligned ? (
                <span className="text-emerald-700 font-semibold">✓ Face is aligned. Click button to complete registration.</span>
              ) : (
                <span>Position your full face inside the circle until the border turns green.</span>
              )}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Google-style Clean Bottom Footer */}
      <footer className="hidden sm:flex w-full max-w-[980px] mx-auto px-6 py-3 items-center justify-between text-[11px] text-[#5f6368] shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
          <span>Designed &amp; Developed by Gowtham Chowdary Kondapaneni</span>
        </div>

        <div className="flex items-center gap-5">
          <a
            href="mailto:gowthamkondapaneni2003@gmail.com"
            className="hover:text-[#4285F4] transition-colors"
          >
            Help
          </a>
          <span className="hover:text-[#4285F4] cursor-default transition-colors">
            Privacy
          </span>
          <span className="hover:text-[#4285F4] cursor-default transition-colors">
            Terms
          </span>
          <span className="text-[#5f6368]">
            © Acme HRMS
          </span>
        </div>
      </footer>
    </div>
  );
};

export default EmployeeFaceRegistration;
