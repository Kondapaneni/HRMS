import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRefreshControl } from '../state/remote.js';
import { Camera, RefreshCw, UploadCloud, X, AlertCircle, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileCamera = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshControl = useRefreshControl();
  const { profile } = useAuth();

  const { action, latitude, longitude, address } = location.state || {};

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [currentFacingMode, setCurrentFacingMode] = useState('user'); // 'user' or 'environment'
  const [stream, setStream] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if missing data
  useEffect(() => {
    if (!action || !latitude || !longitude) {
      navigate('/employee', { replace: true });
    }
  }, [action, latitude, longitude, navigate]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.warn("Video play error:", e));
    }
    setIsReady(true);
  };

  const startCamera = useCallback(async (facing = 'user') => {
    try {
      setIsReady(false);
      setCameraError('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      let newStream = null;

      // 1. Try exact facingMode first
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facing } },
          audio: false
        });
      } catch (exactErr) {
        // 2. If exact fails, search enumerated video devices
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
              video: { deviceId: { exact: targetDevice.deviceId } },
              audio: false
            });
          }
        } catch (enumErr) {
          console.warn("Device enumeration fallback failed:", enumErr);
        }

        // 3. Fallback to standard facingMode request
        if (!newStream) {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false
          });
        }
      }

      setStream(newStream);
      streamRef.current = newStream;
      setCurrentFacingMode(facing);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera('user');
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const toggleCamera = () => {
    const nextFacing = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    // If using front camera, mirror image on canvas so it matches the preview
    if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress a bit to save bandwidth
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoDataUrl(dataUrl);

    // Stop tracks to save battery
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera(currentFacingMode);
  };

  const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data.split(',')[1]);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  };

  const handleSubmit = async () => {
    if (!photoDataUrl) return;
    setIsSubmitting(true);

    try {
      // 1. Upload photo to Supabase Storage (using 'avatars' bucket for convenience)
      const blob = b64toBlob(photoDataUrl, 'image/jpeg');
      const fileName = `attendance-${profile?.employeeId || 'emp'}-${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage.from('attendance').upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

      if (uploadError) throw new Error('Failed to upload photo: ' + uploadError.message);

      const publicUrl = window.location.origin + "/Attendance/" + uploadData.path;

      // 2. Submit Punch to backend
      const punchRes = await api.post('/employee/attendance/punch', {
        action,
        latitude,
        longitude,
        address,
        photo: publicUrl
      });

      const updatedAtt = punchRes.data?.attendance;

      if (updatedAtt) {
        // Optimistically update standalone attendance cache
        refreshControl.setQueryData(['employee', 'attendance'], (old = []) => {
          const list = Array.isArray(old) ? [...old] : [];
          const idx = list.findIndex(r => r.id === updatedAtt.id || r.date === updatedAtt.date);
          if (idx >= 0) {
            list[idx] = updatedAtt;
          } else {
            list.unshift(updatedAtt);
          }
          return list;
        });

        // Optimistically update composite dashboard cache
        refreshControl.setQueryData(['employee', 'dashboard'], (old) => {
          if (!old) return old;
          const oldAttendance = Array.isArray(old.attendance) ? [...old.attendance] : [];
          const idx = oldAttendance.findIndex(r => r.id === updatedAtt.id || r.date === updatedAtt.date);
          if (idx >= 0) {
            oldAttendance[idx] = updatedAtt;
          } else {
            oldAttendance.unshift(updatedAtt);
          }
          return {
            ...old,
            attendance: oldAttendance
          };
        });
      }

      toast.success(`Successfully ${action.replace('-', ' ')}ed!`);
      refreshControl.invalidateQueries({ scope: ['employee', 'attendance'] });
      refreshControl.invalidateQueries({ scope: ['employee', 'dashboard'] });
      navigate('/employee', { replace: true });

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || `Failed to ${action}.`);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/employee', { replace: true });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-900 overflow-hidden relative font-sans antialiased text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-transparent z-10 absolute top-0 left-0 right-0">
        <button
          onClick={handleCancel}
          disabled={isSubmitting}
          className="p-2 bg-black/40 text-white hover:bg-black/60 rounded-full transition-colors cursor-pointer backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="px-3 py-1 bg-black/40 text-white rounded-full text-xs font-semibold tracking-wider uppercase backdrop-blur-md">
          {action ? action.replace('-', ' ') : 'Camera'}
        </div>
        <div className="w-9"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">

        {cameraError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">Camera Error</h3>
            <p className="text-slate-400 text-sm">{cameraError}</p>
            <button
              onClick={startCamera}
              className="mt-6 px-6 py-2.5 bg-[var(--brand)] text-[var(--ink)] rounded-full font-semibold shadow-xs active:scale-95 transition-transform"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : (
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
            )}
            {/* Hidden canvas for capturing frame */}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}

        {/* Loading state while camera initializes */}
        {!isReady && !cameraError && !photoDataUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 pointer-events-none">
            <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[var(--brand)] animate-spin mb-3" />
            <span className="text-white/80 text-xs font-medium tracking-wide">Starting camera...</span>
          </div>
        )}

        {/* Overlay Guides - only show when camera is active */}
        {!photoDataUrl && !cameraError && isReady && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Face guide oval container */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-80 h-96">
              <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[100%] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"></div>
              <p className="absolute -bottom-12 left-0 right-0 text-center text-white text-xs font-medium drop-shadow-md">
                Position your face in the frame
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="bg-black pb-8 pt-6 px-6 shrink-0 relative z-10">
        {photoDataUrl ? (
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto w-full">
            <button
              type="button"
              onClick={retakePhoto}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4 text-white/90" />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-[var(--brand)] hover:opacity-90 text-[var(--ink)] rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-75 cursor-pointer shadow-md relative overflow-hidden"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center relative max-w-md mx-auto w-full">
            {/* Capture Button */}
            <button
              onClick={capturePhoto}
              disabled={!!cameraError || !isReady}
              className="w-20 h-20 rounded-full border-4 border-slate-400 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Camera className="w-8 h-8 text-[var(--ink)]" />
              </div>
            </button>

            {/* Switch / Flip Camera Button */}
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!!cameraError || !isReady}
              className="absolute right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeMobileCamera;
