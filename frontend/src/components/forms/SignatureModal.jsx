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
    <div className="fixed inset-0 z-[99999] bg-[var(--bg)] overflow-hidden animate-in fade-in duration-200 antialiased font-sans">
      <div 
        style={containerStyle}
        className="flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 bg-[var(--surface)] border-b border-[var(--line)] shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
              <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Origination Authorization
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text)] tracking-tight flex items-center gap-2">
              <PenTool className="w-4 h-4 text-[var(--brand-deep)]" />
              <span>{title}</span>
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Canvas Area */}
        <div className="flex-1 p-4 sm:p-8 flex flex-col min-h-0 relative">
          <div className="flex-1 w-full bg-[var(--surface)] border-2 border-dashed border-[var(--line)] rounded-[20px] overflow-hidden shadow-inner relative">
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
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-[var(--muted)] font-medium text-xl sm:text-2xl select-none opacity-40">
                Sign Here
              </div>
            )}
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[var(--surface)] border-t border-[var(--line)] flex items-center justify-between shrink-0 pb-safe">
          <div>
            <button 
              type="button"
              onClick={clearCanvas}
              disabled={isEmpty}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] border border-[var(--line)] transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <RotateCcw size={14} />
              <span>Clear</span>
            </button>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] px-4 sm:px-5 py-2 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isEmpty}
              className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs sm:text-sm font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white px-5 sm:px-6 py-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
