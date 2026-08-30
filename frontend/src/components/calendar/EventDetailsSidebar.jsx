import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  FileText, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const EventDetailsSidebar = ({ 
  isOpen, 
  onClose, 
  event, 
  onToggleComplete 
}) => {
  if (!isOpen || !event) return null;

  const isCompleted = event.status === 'Completed';

  const formatTimeString = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let hours = parseInt(hStr, 10);
    const minutes = mStr ? mStr.slice(0, 2) : '00';
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  let formattedDate = '';
  let formattedTime = 'All Day';

  try {
    if (event.startDate) {
      const dateOnly = typeof event.startDate === 'string' ? event.startDate.split('T')[0] : event.startDate;
      const s = typeof dateOnly === 'string' ? parseISO(dateOnly) : dateOnly;
      formattedDate = format(s, 'EEEE, MMMM d, yyyy');
    }

    if (event.allDay) {
      formattedTime = 'All Day';
    } else if (event.startTime) {
      const startFormatted = formatTimeString(event.startTime);
      if (event.endTime && event.endTime !== event.startTime) {
        const endFormatted = formatTimeString(event.endTime);
        formattedTime = `${startFormatted} – ${endFormatted}`;
      } else {
        formattedTime = startFormatted;
      }
    }
  } catch {}

  return createPortal(
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs"
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#dadce0]"
      >
        {/* Top 4-Color Google Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex justify-between items-center bg-white mt-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isCompleted
                  ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                  : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
              }`}
            >
              {event.status || 'Scheduled'}
            </span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 [scrollbar-width:thin]">
          
          {/* Title */}
          <div>
            <h2 className={`text-xl font-bold text-[#1f1f1f] leading-snug ${isCompleted ? 'line-through text-[#80868b]' : ''}`}>
              {event.title}
            </h2>
          </div>

          {/* Time & Date Card */}
          <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-[#dadce0] text-[#1a73e8]">
                <CalendarIcon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1f1f1f]">{formattedDate}</p>
                <p className="text-xs text-[#5f6368] flex items-center gap-1 mt-0.5 font-medium">
                  <Clock size={12} className="text-[#1a73e8]" />
                  {formattedTime}
                </p>
              </div>
            </div>
          </div>

          {/* Location / Meeting Link */}
          {event.address && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-[#80868b] uppercase tracking-wider">
                Location / Video Call
              </span>
              <p className="text-xs font-semibold text-[#1f1f1f] flex items-start gap-2 pt-1">
                <MapPin size={14} className="text-[#ea4335] mt-0.5 shrink-0" />
                <span>{event.address}</span>
              </p>
            </div>
          )}

          {/* Remarks & Notes */}
          {event.notes && (
            <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-[#80868b] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-[#1a73e8]" />
                Remarks & Notes
              </span>
              <p className="text-xs text-[#1f1f1f] whitespace-pre-wrap leading-relaxed">
                {event.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#dadce0] bg-[#f8fafd] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onToggleComplete?.(event.id);
              onClose();
            }}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isCompleted
                ? 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                : 'bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] border-[#ceead6]'
            }`}
          >
            {isCompleted ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
            <span>{isCompleted ? 'Mark Pending' : 'Mark Completed'}</span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default EventDetailsSidebar;
