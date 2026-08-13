import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser } from 'lucide-react';
import { createPortal } from 'react-dom';

export function SignatureModal({ isOpen, onClose, onSubmit, title = "Employee Signature" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);

  // Check orientation
  useEffect(() => {
    if (!isOpen) return;
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, [isOpen]);

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
      // Small delay to ensure the DOM layout is complete before measuring
      const timeout = setTimeout(initCanvas, 50);
      window.addEventListener('resize', initCanvas);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('resize', initCanvas);
      };
    }
  }, [isOpen, isPortrait]); // re-init if orientation changes

  if (!isOpen) return null;

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch =
      e.touches && e.touches.length > 0
        ? e.touches[0]
        : e.changedTouches && e.changedTouches.length > 0
          ? e.changedTouches[0]
          : null;
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;

    if (isPortrait) {
      // Rotated -90deg
      return {
        x: rect.bottom - clientY,
        y: clientX - rect.left
      };
    } else {
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  };

  const startDrawing = (e) => {
    if (e.cancelable && e.type && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Draw immediately so single taps/clicks render a clean dot (e.g. dots on i, j, or periods)
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable && e.type && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
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

  const containerStyle = isPortrait ? {
    transform: 'rotate(-90deg)',
    transformOrigin: 'center center',
    width: '100dvh',
    height: '100dvw',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: 'calc(-50dvw)',
    marginLeft: 'calc(-50dvh)'
  } : {
    width: '100%',
    height: '100%'
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-50 overflow-hidden animate-in fade-in duration-200">
      <div 
        style={containerStyle}
        className="flex flex-col"
      >
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
        <div className="px-4 sm:px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 pb-safe">
          <div className="flex items-center">
            <button 
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm active:scale-95"
            >
              <Eraser size={16} /> Clear
            </button>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isEmpty}
              className="px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-95"
            >
              Submit & Transfer
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
