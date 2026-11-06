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
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs antialiased font-sans"
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-[var(--surface)] text-[var(--text)] shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-deep)]" />
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isCompleted
                  ? 'bg-[#E6F6EC] text-[#1F9D55] border-[#1F9D55]/20'
                  : 'bg-[#E8F0FB] text-[#3B6FB6] border-[#3B6FB6]/20'
              }`}
            >
              {event.status || 'Scheduled'}
            </span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] p-2 rounded-full-[10px] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 [scrollbar-width:thin]">
          
          {/* Title */}
          <div>
            <h2 className={`text-xl font-bold text-[var(--text)] leading-snug ${isCompleted ? 'line-through text-[var(--muted)]' : ''}`}>
              {event.title}
            </h2>
          </div>

          {/* Time & Date Card */}
          <div className="bg-[var(--surface-alt)] p-4 rounded-[20px] border border-[var(--line)] space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--line)] text-[var(--brand-deep)]">
                <CalendarIcon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text)]">{formattedDate}</p>
                <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5 font-medium">
                  <Clock size={12} className="text-[var(--brand-deep)]" />
                  {formattedTime}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned By & Reassignment */}
          {(event.assigneeName || event.creatorName) && (
            <div className="bg-[var(--surface-alt)] rounded-[20px] border border-[var(--line)] p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  Assigned By
                </span>
                {assignableEmployees.length > 0 && onReassign && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReassignOpen(!isReassignOpen);
                      setSelectedTargetUser(event.assignedTo || event.createdBy || '');
                    }}
                    className="text-xs font-bold text-[var(--brand-deep)] hover:text-[var(--brand)] flex items-center gap-1 cursor-pointer bg-[var(--brand-tint)] hover:bg-[var(--brand-tint)]/80 px-2.5 py-1 rounded-full transition-colors"
                  >
                    <ArrowRightLeft size={12} />
                    <span>{isReassignOpen ? 'Cancel' : 'Reassign'}</span>
                  </button>
                )}
              </div>

              {/* Current Assignee Info */}
              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--line)] flex items-center justify-center font-bold text-xs shrink-0">
                  <UserCheck size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text)] truncate">
                    {event.assigneeName || event.creatorName} {event.isAssignedToMe ? '(You)' : ''}
                  </p>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {[event.assigneeEmployeeId || event.creatorEmployeeId, event.assigneeBranchName || event.creatorBranchName].filter(Boolean).join(' • ')}
                    {event.creatorName && event.creatorName !== (event.assigneeName || event.creatorName) && (
                      <span className="text-[var(--muted)]"> (Assigned by {event.creatorName})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Inline Reassign Box */}
              {isReassignOpen && (
                <div className="pt-2 border-t border-[var(--line)] space-y-2">
                  <label className="block text-[11px] font-semibold text-[var(--text-2)]">
                    Select New Assignee:
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTargetUser}
                      onChange={(e) => setSelectedTargetUser(e.target.value)}
                      className="flex-1 h-8.5 px-3 rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 cursor-pointer"
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
                      className="px-3.5 py-1.5 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] disabled:bg-[var(--surface-alt)] disabled:text-[var(--muted)] text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0"
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
            <div className="bg-[var(--surface-alt)] rounded-[20px] border border-[var(--line)] p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                Location / Video Call
              </span>
              <p className="text-xs font-semibold text-[var(--text)] flex items-start gap-2 pt-1">
                <MapPin size={14} className="text-[var(--status-danger)] mt-0.5 shrink-0" />
                <span>{event.address}</span>
              </p>
            </div>
          )}

          {/* Remarks & Notes */}
          {event.notes && (
            <div className="bg-[var(--surface-alt)] rounded-[20px] border border-[var(--line)] p-4 space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-[var(--brand-deep)]" />
                Remarks & Notes
              </span>
              <p className="text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                {event.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex items-center justify-end gap-2 shrink-0">
          {!isCompleted ? (
            <button
              type="button"
              onClick={() => {
                onToggleComplete?.(event.id);
                onClose();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-[#E6F6EC] hover:bg-[#E6F6EC]/80 text-[#1F9D55] border-[#1F9D55]/20"
            >
              <CheckCircle2 size={14} />
              <span>Mark as Completed</span>
            </button>
          ) : (
            <div className="w-full sm:w-auto px-5 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20">
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
