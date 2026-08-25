import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Send, PenTool } from 'lucide-react';
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
    if (!canvas) return { x: 0, y: 0 };
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
      // Rotated -90deg: screen Y is canvas X, screen X is canvas Y
      const scaleX = rect.height > 0 ? canvas.width / rect.height : 1;
      const scaleY = rect.width > 0 ? canvas.height / rect.width : 1;
      return {
        x: (rect.bottom - clientY) * scaleX,
        y: (clientX - rect.left) * scaleY
      };
    } else {
      const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
      const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
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
    
    // 1. Draw a filled circular dot immediately (iOS Safari WebKit drops zero-length line strokes, but arc+fill is 100% reliable)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Begin path for continuous strokes if the user drags
    ctx.beginPath();
    ctx.moveTo(x, y);
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
    
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.closePath();
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
        {/* Google Material 3 Workspace Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 bg-white border-b border-[#dadce0] shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Origination Authorization
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#1f1f1f] tracking-tight flex items-center gap-2">
              <PenTool className="w-4 h-4 text-[#1a73e8]" />
              <span>{title}</span>
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#f8fafd] hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#1f1f1f] border border-[#dadce0] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Close"
          >
            <X size={18} />
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

        {/* Footer / Actions — Google Material 3 Workspace Toolbar */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-[#dadce0] flex items-center justify-between shrink-0 pb-safe">
          <div>
            <button 
              type="button"
              onClick={clearCanvas}
              disabled={isEmpty}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] border border-[#dadce0] transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <RotateCcw size={14} />
              <span>Clear</span>
            </button>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-4 sm:px-5 py-2 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isEmpty}
              className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs sm:text-sm font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 sm:px-6 py-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Send size={14} />
              <span>Submit & Transfer</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SignatureModal;
