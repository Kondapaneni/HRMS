import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  FileText, 
  Clock, 
  MapPin, 
  Users, 
  Check, 
  X, 
  CheckCircle2, 
  RotateCcw, 
  User, 
  Calendar,
  Tag
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';

// =========================================================================
// 1. FULL-PAGE MOBILE ACTIVITY CREATION COMPONENT (Like EditMobileProfile.jsx)
// =========================================================================
export const MobileActivityCreatePage = ({
  isOpen,
  onClose,
  onSave,
  isSales = false,
  isBranchOperations = false,
  assignableEmployees = [],
  theme,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState({
    title: '',
    priority: 'Medium',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '11:00',
    allDay: false,
    address: '',
    notes: '',
    status: 'Scheduled'
  });
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  // Hide bottom navigation dock and lock body scroll while create page is active
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd');
      const nowHour = now.getHours();
      const startHourStr = String(nowHour).padStart(2, '0') + ':00';
      const endHourStr = String(Math.min(23, nowHour + 1)).padStart(2, '0') + ':00';

      setFormData({
        title: '',
        priority: 'Medium',
        startDate: dateStr,
        startTime: startHourStr,
        endDate: dateStr,
        endTime: endHourStr,
        allDay: false,
        address: '',
        notes: '',
        status: 'Scheduled'
      });
      setSelectedAssignees([]);
      setFormErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Activity title is required';
    }
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    const payload = {
      title: formData.title.trim(),
      priority: formData.priority,
      startDate: formData.startDate,
      startTime: formData.allDay ? '00:00' : formData.startTime,
      endDate: formData.endDate || formData.startDate,
      endTime: formData.allDay ? '23:59' : formData.endTime,
      allDay: formData.allDay,
      address: formData.address.trim(),
      notes: formData.notes.trim(),
      status: formData.status,
      assignedTo: isBranchOperations && selectedAssignees.length > 0 ? selectedAssignees : undefined
    };

    onSave(payload);
  };

  return (
    <div className="space-y-4 pb-14 select-none">
      {/* 1. Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute -top-20 -left-10 w-72 h-72 ${theme?.orbs?.[0] || 'bg-blue-500'} rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none`}
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className={`absolute -top-10 -right-10 w-64 h-64 ${theme?.orbs?.[1] || 'bg-indigo-500'} rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none`}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className={`absolute bottom-0 left-20 w-80 h-80 ${theme?.orbs?.[2] || 'bg-sky-400'} rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none`}
        />

        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative z-10 px-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title="Back to Activities"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest drop-shadow-md">
              {theme?.tagText || 'ORIGINATION • ACTIVITIES'}
            </p>
            <h2 className="text-xl font-black text-white tracking-tight drop-shadow-sm">
              Schedule Activity
            </h2>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2.5 rounded-full ${theme?.primaryBtn || 'bg-[#1a73e8] text-white'} text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer shrink-0`}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>
        </div>
      </section>

      {/* 2. Elevated Form Cards Container */}
      <form onSubmit={handleSubmit} className="relative z-20 -mt-8 mx-0.5 space-y-3.5">
        
        {/* Card 1: Basic Information */}
        <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#f1f3f4]">
            <FileText className={`w-4 h-4 ${isSales ? 'text-emerald-600' : 'text-[#1a73e8]'}`} />
            <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
              Activity Details
            </h3>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5f6368] uppercase">
              Activity Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (formErrors.title) setFormErrors({ ...formErrors, title: null });
              }}
              placeholder="e.g., Client KYC Verification, Follow-up Call..."
              className={`w-full bg-[#f8fafd] border ${
                formErrors.title ? 'border-rose-400' : 'border-[#dadce0]'
              } rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] outline-none transition-all ${theme?.ringHighlight || 'focus:ring-[#1a73e8]'}`}
            />
            {formErrors.title && (
              <p className="text-[10px] text-rose-500 font-semibold px-2">{formErrors.title}</p>
            )}
          </div>

          {/* Priority Selector Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5f6368] uppercase">
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'Urgent', label: 'Urgent', color: 'bg-rose-50 border-rose-200 text-rose-700 font-bold' },
                { id: 'High', label: 'High', color: 'bg-amber-50 border-amber-200 text-amber-800 font-bold' },
                { id: 'Medium', label: 'Medium', color: 'bg-blue-50 border-blue-200 text-blue-700 font-bold' },
                { id: 'Low', label: 'Low', color: 'bg-slate-100 border-slate-200 text-slate-700 font-medium' }
              ].map((p) => {
                const isSelected = formData.priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.id })}
                    className={`py-2 px-1 rounded-full text-xs font-semibold text-center border transition-all cursor-pointer ${
                      isSelected
                        ? `${p.color} ring-2 ring-offset-1 ring-slate-400 shadow-2xs`
                        : 'bg-white border-[#e0e3e7] text-[#5f6368] hover:bg-[#f8fafd]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Date & Time Schedule (Mobile & iPhone Optimized) */}
        <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isSales ? 'text-emerald-600' : 'text-[#1a73e8]'}`} />
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                Schedule &amp; Timing
              </h3>
            </div>

            {/* All-Day Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-[#5f6368]">All Day</span>
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
              />
            </label>
          </div>

          {/* Start Date & Time */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#5f6368]" />
                <span>Start Date</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] transition-all ${theme?.ringHighlight || 'focus:ring-[#1a73e8]'}`}
              />
            </div>

            {!formData.allDay && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>Start Time</span>
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] transition-all ${theme?.ringHighlight || 'focus:ring-[#1a73e8]'}`}
                />
              </div>
            )}
          </div>

          {/* End Date & Time (if not all day) */}
          {!formData.allDay && (
            <div className="pt-2 border-t border-[#f1f3f4] space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] transition-all ${theme?.ringHighlight || 'focus:ring-[#1a73e8]'}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>End Time</span>
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] transition-all ${theme?.ringHighlight || 'focus:ring-[#1a73e8]'}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Location & Remarks */}
        <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#f1f3f4]">
            <MapPin className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
              Location &amp; Notes
            </h3>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5f6368] uppercase">
              Location / Client Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g., Gurunak Colony, Vijayawada..."
              className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] outline-none ${theme?.ringHighlight || 'focus:ring-[#1a73e8]'}`}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5f6368] uppercase">
              Remarks / Instructions
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add special instructions, document checklist, or notes..."
              className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-2xl p-3 text-xs font-medium text-[#1f1f1f] placeholder:text-[#80868b] outline-none ${theme?.ringHighlight || 'focus:ring-[#1a73e8]'}`}
            />
          </div>
        </div>

        {/* Card 4: Branch Staff Assignment (Only in Branch Operations) */}
        {isBranchOperations && assignableEmployees.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1a73e8]" />
                <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                  Assign Team Member
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#5f6368]">
                {selectedAssignees.length} selected
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {assignableEmployees.map((emp) => {
                const isChecked = selectedAssignees.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedAssignees(prev => 
                        prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                      );
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked 
                        ? 'bg-[#e8f0fe] border-[#d2e3fc] text-[#1a73e8]' 
                        : 'bg-[#f8fafd] border-[#e0e3e7] text-[#1f1f1f] hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white text-[#1a73e8] border border-[#d2e3fc] flex items-center justify-center font-bold text-xs shrink-0">
                        {(emp.name || 'E').charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate">{emp.name} {emp.isCurrentUser ? '(You)' : ''}</p>
                        <p className="text-[10px] text-[#5f6368] truncate">{emp.role || 'Staff'}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                      isChecked ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'border-[#dadce0] bg-white'
                    }`}>
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

// =========================================================================
// 2. POPUP MODAL FOR ACTIVITY DETAILS (Like EmployeeMobileProfile.jsx Popup)
// =========================================================================
export const MobileActivityDetailsModal = ({
  isOpen,
  onClose,
  event,
  onToggleStatus,
  getPriorityBadge
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const formatEventTime = (evt) => {
    if (evt.startTime && evt.endTime) {
      return `${evt.startTime} – ${evt.endTime}`;
    }
    return evt.startTime || 'All Day';
  };

  const formatEventDate = (evt) => {
    try {
      const parsed = parseISO(evt.startDate);
      if (isToday(parsed)) return 'Today';
      if (isTomorrow(parsed)) return 'Tomorrow';
      return format(parsed, 'MMM d, yyyy');
    } catch {
      return evt.startDate;
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Dialog Box Container */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-[#e0e3e7] overflow-hidden z-10 p-5 space-y-4"
        >
          {/* Header: Priority & Close Button */}
          <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
            <div className="flex items-center gap-2">
              {getPriorityBadge ? getPriorityBadge(event.priority) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  {event.priority || 'Medium'}
                </span>
              )}
              {event.status === 'Completed' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                  <CheckCircle2 size={12} /> Done
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                  <Clock size={12} /> Scheduled
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Title */}
          <div>
            <h3 className={`text-base sm:text-lg font-black text-[#1f1f1f] leading-snug ${
              event.status === 'Completed' ? 'line-through text-[#80868b]' : ''
            }`}>
              {event.title}
            </h3>
          </div>

          {/* Details List */}
          <div className="space-y-2.5 bg-[#f8fafd] rounded-2xl p-4 border border-[#e0e3e7]/80 text-xs">
            {/* Date & Time */}
            <div className="flex items-start gap-2.5 text-[#1f1f1f]">
              <Clock className="w-4 h-4 text-[#1a73e8] mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">{formatEventDate(event)}</p>
                <p className="text-[11px] text-[#5f6368]">{formatEventTime(event)}</p>
              </div>
            </div>

            {/* Location */}
            {event.address && (
              <div className="flex items-start gap-2.5 text-[#1f1f1f] pt-2 border-t border-[#e0e3e7]/60">
                <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Location</p>
                  <p className="text-[11px] text-[#5f6368]">{event.address}</p>
                </div>
              </div>
            )}

            {/* Assignee */}
            {event.assignedToName && (
              <div className="flex items-start gap-2.5 text-[#1f1f1f] pt-2 border-t border-[#e0e3e7]/60">
                <User className="w-4 h-4 text-[#1a73e8] mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Assigned To</p>
                  <p className="text-[11px] text-[#5f6368]">{event.assignedToName}</p>
                </div>
              </div>
            )}

            {/* Remarks / Notes */}
            {event.notes && (
              <div className="pt-2 border-t border-[#e0e3e7]/60">
                <p className="font-bold text-[#5f6368] mb-1">Remarks &amp; Notes</p>
                <p className="text-xs text-[#1f1f1f] italic bg-white p-2.5 rounded-xl border border-[#dadce0]">
                  "{event.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons: 1-Click Status Toggle & Close */}
          <div className="space-y-2 pt-1">
            {event.status !== 'Completed' ? (
              <button
                type="button"
                onClick={() => onToggleStatus && onToggleStatus(event)}
                className="w-full py-3 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2 bg-[#137333] hover:bg-[#0d5926] text-white shadow-xs transition-all cursor-pointer active:scale-[0.98]"
              >
                <CheckCircle2 size={14} />
                <span>Mark as Completed</span>
              </button>
            ) : (
              <div className="w-full py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                <CheckCircle2 size={14} />
                <span>Activity Completed</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer text-center active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
