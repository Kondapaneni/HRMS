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
  AlertCircle,
  User,
  UserCheck, 
  ArrowRightLeft, 
  Loader2 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const EventDetailsSidebar = ({ 
  isOpen, 
  onClose, 
  event, 
  onToggleComplete,
  onReassign,
  assignableEmployees = []
}) => {
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [selectedTargetUser, setSelectedTargetUser] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

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

          {/* Assigned By & Reassignment */}
          {(event.assigneeName || event.creatorName) && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#80868b] uppercase tracking-wider">
                  Assigned By
                </span>
                {assignableEmployees.length > 0 && onReassign && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReassignOpen(!isReassignOpen);
                      setSelectedTargetUser(event.assignedTo || event.createdBy || '');
                    }}
                    className="text-xs font-bold text-[#1a73e8] hover:text-[#1557b0] flex items-center gap-1 cursor-pointer bg-[#e8f0fe] hover:bg-[#d2e3fc] px-2.5 py-1 rounded-full transition-colors"
                  >
                    <ArrowRightLeft size={12} />
                    <span>{isReassignOpen ? 'Cancel' : 'Reassign'}</span>
                  </button>
                )}
              </div>

              {/* Current Assignee Info */}
              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] flex items-center justify-center font-bold text-xs shrink-0">
                  <UserCheck size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#1f1f1f] truncate">
                    {event.assigneeName || event.creatorName} {event.isAssignedToMe ? '(You)' : ''}
                  </p>
                  <p className="text-[11px] text-[#5f6368] truncate">
                    {[event.assigneeEmployeeId || event.creatorEmployeeId, event.assigneeBranchName || event.creatorBranchName].filter(Boolean).join(' • ')}
                    {event.creatorName && event.creatorName !== (event.assigneeName || event.creatorName) && (
                      <span className="text-[#80868b]"> (Assigned by {event.creatorName})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Inline Reassign Box */}
              {isReassignOpen && (
                <div className="pt-2 border-t border-[#f1f3f4] space-y-2">
                  <label className="block text-[11px] font-semibold text-[#3c4043]">
                    Select New Assignee:
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTargetUser}
                      onChange={(e) => setSelectedTargetUser(e.target.value)}
                      className="flex-1 h-8.5 px-3 rounded-xl border border-[#dadce0] bg-[#f8fafd] text-xs font-semibold text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 cursor-pointer"
                    >
                      <option value="">Select Employee...</option>
                      {assignableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''} {emp.isCurrentUser ? '- You' : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedTargetUser || selectedTargetUser === (event.assignedTo || event.createdBy) || isReassigning}
                      onClick={async () => {
                        try {
                          setIsReassigning(true);
                          await onReassign?.(event.id, selectedTargetUser);
                          setIsReassignOpen(false);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsReassigning(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-[#dadce0] disabled:text-[#80868b] text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0"
                    >
                      {isReassigning ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                      <span>Confirm</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
          {!isCompleted ? (
            <button
              type="button"
              onClick={() => {
                onToggleComplete?.(event.id);
                onClose();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] border-[#ceead6]"
            >
              <CheckCircle2 size={14} />
              <span>Mark as Completed</span>
            </button>
          ) : (
            <div className="w-full sm:w-auto px-5 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
              <CheckCircle2 size={14} />
              <span>Activity Completed</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default EventDetailsSidebar;
