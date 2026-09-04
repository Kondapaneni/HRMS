import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Camera, 
  AlertCircle, 
  RefreshCw, 
  VideoOff, 
  CheckCircle2 
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
  const [currentFacingMode, setCurrentFacingMode] = useState('user'); // 'user' or 'environment'
  const [isReady, setIsReady] = useState(false);

  // Real-time Face Alignment
  const [isAligned, setIsAligned] = useState(false);
  const [alignmentReason, setAlignmentReason] = useState('Position your face in the frame');

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.warn("Video play error:", e));
    }
    setIsReady(true);
  };

  const startCamera = useCallback(async (facing = 'user') => {
    setCameraStatus('loading');
    setIsReady(false);
    setErrorMessage('');
    setIsAligned(false);
    setAlignmentReason('Initializing AI camera...');

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      await loadModels();

      let newStream = null;

      // 1. Try exact facingMode first
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: facing },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
      } catch (exactErr) {
        // 2. Search enumerated video devices if exact fails
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          let targetDevice = null;
          if (facing === 'user') {
            targetDevice = videoDevices.find(d => {
              const label = (d.label || '').toLowerCase();
              return label.includes('front') || label.includes('user') || label.includes('selfie') || label.includes('facing front');
            });
          } else {
            targetDevice = videoDevices.find(d => {
              const label = (d.label || '').toLowerCase();
              return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('facing back');
            });
          }

          if (targetDevice && targetDevice.deviceId) {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: targetDevice.deviceId },
                width: { ideal: 640 },
                height: { ideal: 480 }
              },
              audio: false
            });
          }
        } catch (enumErr) {
          console.warn("Device enumeration fallback failed:", enumErr);
        }

        // 3. Fallback to standard facingMode
        if (!newStream) {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facing,
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            audio: false
          });
        }
      }

      streamRef.current = newStream;
      setCurrentFacingMode(facing);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setCameraStatus('ready');
      setAlignmentReason('Position your face in the frame');
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
  }, []);

  const toggleCamera = () => {
    const nextFacing = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera('user');
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, startCamera]);

  // Real-time alignment checker loop (runs every 220ms when camera is active)
  useEffect(() => {
    let intervalId;
    let isChecking = false;

    if (isOpen && cameraStatus === 'ready' && isReady && !isVerifying) {
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
  }, [isOpen, cameraStatus, isReady, isVerifying]);

  const handleVerify = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || isVerifying) return;

    if (!isAligned) {
      toast.error('Position your face inside the frame before verifying.');
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
        setErrorMessage(result.reason || 'Face moved outside the frame. Please center your face and try again.');
        toast.error('Face moved outside frame. Please center and retry.');
        setIsVerifying(false);
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
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
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black sm:bg-black/80 sm:backdrop-blur-sm sm:p-4">
        {/* Full Viewport Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full sm:max-w-md sm:h-[720px] sm:max-h-[95vh] sm:rounded-[32px] bg-slate-900 flex flex-col overflow-hidden relative shadow-2xl border-0 sm:border sm:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 bg-transparent z-20 absolute top-0 left-0 right-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="p-2.5 bg-black/40 text-white hover:bg-black/60 rounded-full transition-colors cursor-pointer backdrop-blur-md active:scale-95 disabled:opacity-50"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="px-3.5 py-1 bg-black/40 text-white rounded-full text-xs font-semibold tracking-wider uppercase backdrop-blur-md border border-white/10">
              FACE ID LOGIN
            </div>
            <div className="w-10"></div> {/* Spacer to center the title */}
          </div>

          {/* Camera Viewport */}
          <div className="flex-1 relative flex items-center justify-center bg-black min-h-0 overflow-hidden">
            {cameraStatus === 'error' ? (
              <div className="flex flex-col items-center justify-center p-8 text-center z-20 space-y-3">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <VideoOff className="w-7 h-7" />
                </div>
                <h3 className="text-white font-bold text-lg">Camera Unavailable</h3>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  {errorMessage || 'Camera access was denied or device was not found.'}
                </p>
                <button
                  type="button"
                  onClick={() => startCamera(currentFacingMode)}
                  className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-sm active:scale-95 transition-transform cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  muted
                  poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                  disablePictureInPicture
                  disableRemotePlayback
                  onLoadedMetadata={handleVideoLoaded}
                  onCanPlay={handleVideoLoaded}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'} ${currentFacingMode === 'user' ? '-scale-x-100' : ''}`}
                />
              </>
            )}

            {/* Visual Camera Shutter Flash */}
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

            {/* Loading state while camera initializes */}
            {!isReady && cameraStatus !== 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 pointer-events-none">
                <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[#4285F4] animate-spin mb-3" />
                <span className="text-white/80 text-xs font-medium tracking-wide">Starting AI camera...</span>
              </div>
            )}

            {/* Overlay Guides - Matching EmployeeMobileCamera.jsx */}
            {cameraStatus !== 'error' && isReady && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Face guide oval container */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-72 sm:w-80 h-88 sm:h-96">
                  {/* Oval shape with shadow */}
                  <div
                    className={`w-full h-full border-2 border-dashed ${
                      isAligned ? 'border-emerald-400' : 'border-white/50'
                    } rounded-[100%] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-colors duration-200`}
                  />
                  {/* Text placed right below the oval */}
                  <p className="absolute -bottom-12 left-0 right-0 text-center text-white font-medium drop-shadow-md text-sm px-4">
                    {isVerifying ? (
                      'Verifying face...'
                    ) : isAligned ? (
                      <span className="text-emerald-300 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                        Face aligned! Tap capture
                      </span>
                    ) : (
                      'Position your face in the frame'
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls Footer */}
          <div className="bg-black pb-8 pt-6 px-6 shrink-0 relative z-20">
            <div className="flex justify-center items-center relative max-w-md mx-auto w-full">
              {/* Shutter Capture Button */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={cameraStatus !== 'ready' || !isReady || isVerifying}
                className={`w-20 h-20 rounded-full border-4 ${
                  isAligned ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'border-slate-300'
                } flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 cursor-pointer shadow-lg`}
                title="Capture & Verify"
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                  {isVerifying ? (
                    <div className="w-6 h-6 border-3 border-slate-800 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-800" />
                  )}
                </div>
              </button>

              {/* Switch / Flip Camera Button */}
              <button
                type="button"
                onClick={toggleCamera}
                disabled={cameraStatus !== 'ready' || !isReady || isVerifying}
                className="absolute right-4 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Switch Camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Email caption */}
            {email && (
              <p className="text-center text-[11px] text-slate-400 mt-3 truncate max-w-xs mx-auto">
                Verifying: <span className="text-slate-200 font-medium">{email}</span>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default FaceLoginModal;
