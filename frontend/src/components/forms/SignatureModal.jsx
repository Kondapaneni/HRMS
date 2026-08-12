import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser } from 'lucide-react';
import { createPortal } from 'react-dom';

export function SignatureModal({ isOpen, onClose, onSubmit, title = "Employee Signature" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    
    // Set internal resolution to match display size for sharp drawing
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a'; // slate-950
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsEmpty(true);
  };

  // Initialize canvas context and handle resize
  useEffect(() => {
    if (isOpen) {
      initCanvas();
      window.addEventListener('resize', initCanvas);
      return () => window.removeEventListener('resize', initCanvas);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Support touch or mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext('2d').closePath();
      }
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    initCanvas();
  };

  const handleSubmit = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSubmit(dataUrl);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-50 flex flex-col animate-in fade-in duration-200 h-[100dvh] w-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button 
          onClick={onClose}
          className="p-2 -mr-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 p-4 sm:p-8 flex flex-col min-h-0 relative">
        <div className="flex justify-between items-end mb-4 shrink-0">
          <p className="text-sm sm:text-base font-medium text-slate-600">
            Please sign in the area below:
          </p>
          <button 
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm active:scale-95"
          >
            <Eraser size={16} /> Clear
          </button>
        </div>

        <div className="flex-1 w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden shadow-inner relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {isEmpty && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 font-medium text-xl sm:text-2xl select-none">
              Sign Here
            </div>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-4 sm:px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3 sm:gap-4 shrink-0 pb-safe">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 rounded-xl text-base font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isEmpty}
          className="px-8 py-3 rounded-xl text-base font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-95"
        >
          Submit & Transfer
        </button>
      </div>
    </div>,
    document.body
  );
}
