import React, { useRef, useEffect, useState } from 'react';
import { loadModels, getFaceDescriptor } from '../utils/faceApiHelper';

const FastFaceScanner = ({ onFaceDetected, isScanning, onCancel, mode }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('Loading models...');
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let active = true;

    const initScanner = async () => {
      try {
        await loadModels();
        if (!active) return;
        setStatus('Starting camera...');
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 400, height: 300 } 
        });
        
        if (!active) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStatus('Position your face in the frame');
      } catch (error) {
        setStatus(`Camera error: ${error.message}`);
      }
    };

    initScanner();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let scanInterval;

    const scanFace = async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState !== 4) return;
      
      try {
        const descriptor = await getFaceDescriptor(videoRef.current);
        if (descriptor) {
          onFaceDetected(descriptor);
        }
      } catch (err) {
        console.error('Face scanning error', err);
      }
    };

    if (isScanning && stream) {
      // Scan rapidly (every 300ms) for ultra-fast matching
      scanInterval = setInterval(scanFace, 300);
    }

    return () => clearInterval(scanInterval);
  }, [isScanning, stream, onFaceDetected]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-transparent z-20 absolute top-0 left-0 right-0">
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 bg-black/40 text-white hover:bg-black/60 rounded-full transition-colors cursor-pointer backdrop-blur-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
        <div className="px-3 py-1 bg-black/40 text-white rounded-full text-sm font-semibold tracking-wider uppercase backdrop-blur-md">
          {mode === 'register' ? 'Face Registration' : 'Face Verification'}
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Overlay Guides */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
          <div className="relative w-80 h-96 -mt-20">
            {/* Oval shape with shadow */}
            <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[100%] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"></div>
            {/* Status text placed below oval */}
            <p className={`absolute -bottom-12 left-0 right-0 text-center font-bold text-lg drop-shadow-md px-4 ${status.includes('error') ? 'text-rose-400' : 'text-white'}`}>
              {status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FastFaceScanner;
