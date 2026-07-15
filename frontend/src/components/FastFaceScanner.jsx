import React, { useRef, useEffect, useState } from 'react';
import { loadModels, getFaceDescriptor } from '../utils/faceApiHelper';

const FastFaceScanner = ({ onFaceDetected, isScanning, onCancel }) => {
  const videoRef = useRef(null);
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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
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
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl overflow-hidden relative">
      <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden border-2 border-slate-700 shadow-inner">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* Overlay targeting box */}
        <div className="absolute inset-0 border-4 border-dashed border-white/30 rounded-lg pointer-events-none m-4"></div>
      </div>
      
      <div className="mt-4 text-center">
        <p className={`font-semibold ${status.includes('error') ? 'text-red-400' : 'text-blue-300'}`}>
          {status}
        </p>
      </div>

      {onCancel && (
        <button 
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default FastFaceScanner;
