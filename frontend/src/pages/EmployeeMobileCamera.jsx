import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, RefreshCw, UploadCloud, X, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const EmployeeMobileCamera = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { action, latitude, longitude, address } = location.state || {};

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if missing data
  useEffect(() => {
    if (!action || !latitude || !longitude) {
      navigate("/employee", { replace: true });
    }
  }, [action, latitude, longitude, navigate]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError("");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(newStream);
      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please check permissions.");
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    // If using front camera, we might want to mirror it, but usually standard is fine.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress a bit to save bandwidth
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPhotoDataUrl(dataUrl);

    // Stop tracks to save battery
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const b64toBlob = (b64Data, contentType = "", sliceSize = 512) => {
    const byteCharacters = atob(b64Data.split(",")[1]);
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
      const blob = b64toBlob(photoDataUrl, "image/jpeg");
      const fileName = `attendance-${profile?.employeeId || "emp"}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("attendance")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError)
        throw new Error("Failed to upload photo: " + uploadError.message);

      const publicUrl = window.location.origin + "/Attendance/" + fileName;

      // 2. Submit Punch to backend
      await api.post("/employee/attendance/punch", {
        action,
        latitude,
        longitude,
        address,
        photo: publicUrl,
      });

      toast.success(`Successfully ${action.replace("-", " ")}ed!`);
      queryClient.invalidateQueries({ queryKey: ["employee", "dashboard"] });
      navigate("/employee", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || err.message || `Failed to ${action}.`,
      );
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/employee", { replace: true });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-900 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-transparent z-10 absolute top-0 left-0 right-0">
        <button
          onClick={handleCancel}
          disabled={isSubmitting}
          className="p-2 bg-black/40 text-white hover:bg-black/60 rounded-full transition-colors cursor-pointer backdrop-blur-md"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="px-3 py-1 bg-black/40 text-white rounded-full text-sm font-semibold tracking-wider uppercase backdrop-blur-md">
          {action ? action.replace("-", " ") : "Camera"}
        </div>
        <div className="w-10"></div> {/* Spacer to center the title */}
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
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-sm active:scale-95 transition-transform"
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
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            )}
            {/* Hidden canvas for capturing frame */}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}

        {/* Overlay Guides */}
        {!photoDataUrl && !cameraError && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Face guide oval container */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-80 h-96">
              {/* Oval shape with shadow */}
              <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[100%] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"></div>
              {/* Text placed right below the oval */}
              <p className="absolute -bottom-12 left-0 right-0 text-center text-white font-medium drop-shadow-md">
                Position your face in the frame
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="bg-black pb-8 pt-6 px-6 shrink-0 relative z-10">
        {photoDataUrl ? (
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={retakePhoto}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              Retake
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-80 relative overflow-hidden"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  Confirm
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            {/* Capture Button */}
            <button
              onClick={capturePhoto}
              disabled={!!cameraError}
              className="w-20 h-20 rounded-full border-4 border-slate-300 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-800" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeMobileCamera;
