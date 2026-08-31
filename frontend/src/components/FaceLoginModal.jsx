import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Camera, 
  ScanFace, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  VideoOff, 
  KeyRound, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { loadModels, detectAndValidateFace } from '../utils/faceApiHelper';
import toast from 'react-hot-toast';

const FaceLoginModal = ({ isOpen, onClose, onFaceDetected, email }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('loading'); // 'loading', 'ready', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [flash, setFlash] = useState(false);

  // Real-time Face Alignment in Circle
  const [isAligned, setIsAligned] = useState(false);
  const [alignmentReason, setAlignmentReason] = useState('Position your face in the circle');

  const startCamera = async () => {
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
    if (isOpen) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Real-time alignment checker loop (runs every 220ms when camera is active)
  useEffect(() => {
    let intervalId;
    let isChecking = false;

    if (isOpen && cameraStatus === 'ready' && !isVerifying) {
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
  }, [isOpen, cameraStatus, isVerifying]);

  const handleVerify = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || isVerifying) return;

    // Strict circle validation
    if (!isAligned) {
      setErrorMessage('Please center your entire face inside the green circle before verifying.');
      toast.error('Face is not aligned inside the circle!');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    // Trigger visual camera shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    try {
      const result = await detectAndValidateFace(videoRef.current);

      if (!result.isAligned || !result.descriptor) {
        setErrorMessage(result.reason || 'Face moved outside the circle. Please center your face and try again.');
        toast.error('Face moved out of frame. Please align inside the green circle.');
        setIsVerifying(false);
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Submit face descriptor to login
      onFaceDetected(result.descriptor);

    } catch (err) {
      console.error('Face verification error:', err);
      const msg = err.message || 'Face verification failed.';
      setErrorMessage(msg);
      toast.error(msg);
      setIsVerifying(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isVerifying && onClose && onClose()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-[#e0e3e7] overflow-hidden z-10 p-5 sm:p-7 space-y-4"
        >
          {/* Top 4-Color Google Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shadow-2xs">
                <ScanFace className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1f1f1f] tracking-tight">
                  Biometric Face Login
                </h3>
                <p className="text-xs text-[#5f6368] truncate max-w-[240px] sm:max-w-xs">
                  Verifying account: <span className="font-medium text-[#1f1f1f]">{email}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-[#fce8e6] border border-[#f28b82] rounded-xl flex items-start gap-2.5 text-[#d93025] text-xs shadow-2xs"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-[#EA4335]" />
                <span className="font-medium">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera Viewport */}
          <div className="relative w-full h-[250px] sm:h-[280px] bg-[#1f1f1f] rounded-2xl overflow-hidden border border-[#dadce0] shadow-inner flex flex-col items-center justify-center">
            
            {/* Flash Effect */}
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

            {cameraStatus === 'error' ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-white z-20 space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <VideoOff size={24} />
                </div>
                <p className="text-xs text-slate-300 max-w-xs">
                  {errorMessage || 'Camera is not accessible.'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw size={13} />
                  <span>Retry Camera</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Circle / Oval Guide with Dynamic Green/Red Border */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                  <div
                    className={`relative w-40 sm:w-48 h-48 sm:h-56 rounded-[50%] transition-all duration-300 flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] ${
                      isAligned
                        ? 'border-[3.5px] border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.8),0_0_0_9999px_rgba(0,0,0,0.4)] bg-emerald-500/10'
                        : 'border-[3.5px] border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7),0_0_0_9999px_rgba(0,0,0,0.4)] bg-rose-500/10'
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
                        : isVerifying
                        ? 'bg-blue-600/90'
                        : isAligned
                        ? 'bg-emerald-600/90 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'bg-rose-600/90 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    }`}
                  >
                    {cameraStatus === 'loading' ? (
                      <span>Initializing AI camera...</span>
                    ) : isVerifying ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying face descriptor...</span>
                      </>
                    ) : isAligned ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Face Aligned! Ready to verify</span>
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
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 py-3 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-sm font-semibold text-[#1f1f1f] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={cameraStatus !== 'ready' || isVerifying}
              className={`flex-2 py-3 px-5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
                isAligned
                  ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-[0_2px_10px_rgba(26,115,232,0.3)]'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying &amp; Signing In...</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>{isAligned ? 'Verify & Sign In' : 'Align Face in Circle'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default FaceLoginModal;
