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
  Zap, 
  Lock 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { loadModels, getFaceDescriptor } from '../utils/faceApiHelper';

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

  // Initialize camera and face-api models
  const initCamera = async () => {
    setCameraStatus('loading');
    setErrorMessage('');

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

  // Capture face descriptor when user clicks the Capture Button
  const handleCapture = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || isCapturing) return;

    setIsCapturing(true);
    setErrorMessage('');

    // Trigger visual camera shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    try {
      const descriptor = await getFaceDescriptor(videoRef.current);

      if (!descriptor) {
        setErrorMessage('No face detected in the frame. Please look directly into the camera with good lighting and try again.');
        toast.error('No face detected. Please try again.');
        setIsCapturing(false);
        return;
      }

      // Convert Float32Array / Array to string format for pgvector '[1, 2, 3...]'
      const vectorString = `[${descriptor.join(',')}]`;

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
                Register your facial biometric descriptor for fast, contactless authentication and terminal attendance.
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
            <div className="relative w-full aspect-4/3 sm:aspect-16/11 bg-[#1f1f1f] rounded-2xl overflow-hidden border border-[#dadce0] shadow-inner flex flex-col items-center justify-center">
              
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

                  {/* Camera Overlay Framing Guide */}
                  <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                    {/* Face Target Oval */}
                    <div className="relative w-44 sm:w-52 h-56 sm:h-64 border-2 border-dashed border-white/60 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                      {/* Corner Target Markers */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#4285F4]" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#EA4335]" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#34A853]" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#FBBC05]" />
                    </div>

                    {/* Status Pill on Camera */}
                    <div className="absolute bottom-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-medium text-white shadow-xs">
                      {cameraStatus === 'loading'
                        ? 'Initializing AI camera...'
                        : isCapturing
                        ? 'Analyzing face descriptor...'
                        : 'Position face in oval & click Capture'}
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
                className="w-full py-3.5 px-6 rounded-full text-sm font-semibold bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCapturing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing &amp; Registering Face...</span>
                  </>
                ) : (
                  <>
                    <Camera size={16} />
                    <span>Capture &amp; Register Face</span>
                  </>
                )}
              </button>
            </div>

            {/* Bottom Subtext */}
            <p className="text-center text-[11px] text-[#5f6368] mt-2.5">
              Click the button above when your face is centered and clearly lit.
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
