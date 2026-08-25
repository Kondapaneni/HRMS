import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, 
  RotateCcw, 
  Send, 
  PenTool, 
  ShieldCheck 
} from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Google Material 3 Workspace Signature Capture Modal
 * Full-screen landscape on mobile, centered modal on desktop.
 * High-DPI stylus & touch canvas with auto-rotation, signature baseline, and Material 3 controls.
 */
export function SignatureModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title = "Employee Signature",
  subtitle = "Draw your official signature to authorize application verification and handover to Branch Operations."
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Detect mobile & orientation
  useEffect(() => {
    if (!isOpen) return;
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsPortrait(mobile && window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [isOpen]);

  // Try to lock orientation to landscape on mobile
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } catch {}
    return () => {
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch {}
    };
  }, [isOpen, isMobile]);

  // Lock body scroll while modal is open & hide mobile nav
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [isOpen]);

  // Initialize Canvas with High-DPI Retina resolution
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsEmpty(true);
  }, []);

  // Re-measure on open or orientation switch
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(initCanvas, 80);
      window.addEventListener('resize', initCanvas);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('resize', initCanvas);
      };
    }
  }, [isOpen, isPortrait, initCanvas]);

  if (!isOpen) return null;

  // Normalized touch/mouse coordinates
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

    if (isMobile && isPortrait) {
      // When CSS rotated -90deg, remap coordinates
      const scaleX = rect.height > 0 ? (canvas.width / (window.devicePixelRatio || 1)) / rect.height : 1;
      const scaleY = rect.width > 0 ? (canvas.height / (window.devicePixelRatio || 1)) / rect.width : 1;
      return {
        x: (rect.bottom - clientY) * scaleX,
        y: (clientX - rect.left) * scaleY
      };
    } else {
      const scaleX = rect.width > 0 ? (canvas.width / (window.devicePixelRatio || 1)) / rect.width : 1;
      const scaleY = rect.height > 0 ? (canvas.height / (window.devicePixelRatio || 1)) / rect.height : 1;
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
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.fillStyle = '#1f1f1f';
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();

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
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 2.5;
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
        if (ctx) ctx.closePath();
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

  // On mobile portrait, force the entire modal to rotate into landscape
  const mobilePortraitStyle = (isMobile && isPortrait) ? {
    transform: 'rotate(-90deg)',
    transformOrigin: 'center center',
    width: '100dvh',
    height: '100dvw',
    position: 'fixed',
    top: '50%',
    left: '50%',
    marginTop: 'calc(-50dvw)',
    marginLeft: 'calc(-50dvh)',
    zIndex: 99999
  } : {};

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center overflow-hidden animate-in fade-in duration-200">
      <div 
        style={mobilePortraitStyle}
        className={`flex flex-col bg-white overflow-hidden shadow-2xl ${
          isMobile 
            ? 'w-full h-full' 
            : 'rounded-[28px] border border-[#e0e3e7] max-w-4xl max-h-[85vh] w-full mx-6'
        }`}
      >
        {/* Header — Compact on mobile, spacious on desktop */}
        <div className={`border-b border-[#e0e3e7] flex items-center justify-between shrink-0 bg-white ${
          isMobile ? 'px-4 py-3' : 'px-7 py-5'
        }`}>
          <div className="min-w-0">
            {/* Workspace dots — hide on mobile to save space */}
            <div className="hidden sm:flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Origination Authorization
              </span>
            </div>
            <h2 className={`font-bold text-[#1f1f1f] tracking-tight flex items-center gap-2 ${
              isMobile ? 'text-base' : 'text-xl sm:text-2xl font-normal'
            }`}>
              <PenTool className={`text-[#1a73e8] shrink-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span className="truncate">{title}</span>
            </h2>
            {!isMobile && (
              <p className="text-xs text-[#5f6368] mt-0.5 max-w-xl">
                {subtitle}
              </p>
            )}
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f8fafd] hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#1f1f1f] border border-[#dadce0] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Signature Canvas Drawing Box */}
        <div className={`flex-1 flex flex-col min-h-0 bg-[#f8fafd] ${
          isMobile ? 'p-2.5' : 'p-4 sm:p-6'
        }`}>
          <div className="flex-1 w-full bg-white border-2 border-[#dadce0] hover:border-[#1a73e8] focus-within:border-[#1a73e8] rounded-2xl overflow-hidden shadow-xs relative transition-all flex flex-col">
            
            {/* Top Helper Indicator — More compact on mobile */}
            <div className={`bg-[#f8fafd] border-b border-[#f1f3f4] flex items-center justify-between select-none ${
              isMobile ? 'px-3 py-1.5' : 'px-4 py-2'
            }`}>
              <span className="text-[11px] font-medium text-[#5f6368] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1a73e8] animate-pulse" />
                {isMobile ? 'Draw your signature' : 'Sign with mouse, stylus, or touchscreen'}
              </span>
              <span className="text-[10.5px] font-mono text-[#80868b]">
                {isEmpty ? 'Awaiting' : '✓ Recorded'}
              </span>
            </div>

            {/* Main HTML5 Canvas */}
            <div className="flex-1 relative w-full h-full min-h-[140px] sm:min-h-[220px]">
              <canvas
                ref={canvasRef}
                className="w-full h-full touch-none cursor-crosshair block"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />

              {/* Watermark placeholder */}
              {isEmpty && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-[#9aa0a6] select-none gap-2">
                  <div className={`rounded-full bg-[#f1f3f4] flex items-center justify-center text-[#80868b] ${
                    isMobile ? 'w-10 h-10' : 'w-12 h-12'
                  }`}>
                    <PenTool size={isMobile ? 18 : 22} className="text-[#80868b]" />
                  </div>
                  <p className={`font-semibold text-[#5f6368] ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Draw your signature here
                  </p>
                  {!isMobile && (
                    <p className="text-xs text-[#80868b]">
                      Use your fingertip, mouse, or stylus pen
                    </p>
                  )}
                </div>
              )}

              {/* Signature Baseline */}
              <div className={`absolute left-6 right-6 pointer-events-none border-b border-dashed border-[#dadce0] flex items-center justify-between pb-1 ${
                isMobile ? 'bottom-4' : 'bottom-6 left-8 right-8'
              }`}>
                <span className="text-[10px] font-semibold text-[#80868b] uppercase tracking-wider">
                  {isMobile ? 'Signature' : 'Authorized Signatory Baseline'}
                </span>
                <ShieldCheck size={14} className="text-[#80868b]" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Material 3 Action Toolbar */}
        <div className={`bg-white border-t border-[#e0e3e7] flex items-center justify-between shrink-0 ${
          isMobile ? 'px-3 py-2.5 pb-safe' : 'px-7 py-4'
        }`}>
          <div>
            <button 
              type="button"
              onClick={clearCanvas}
              disabled={isEmpty}
              className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-white text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] border border-[#dadce0] transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isMobile ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
              }`}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center justify-center rounded-full font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] transition-all shadow-2xs cursor-pointer ${
                isMobile ? 'px-3.5 py-1.5 text-[11px]' : 'px-5 py-2 text-xs'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isEmpty}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold bg-[#137333] hover:bg-[#0d652d] text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isMobile ? 'px-4 py-1.5 text-[11px]' : 'px-6 py-2 text-xs'
              }`}
            >
              <Send size={13} />
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

