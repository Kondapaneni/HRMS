import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  FileText, 
  Clock, 
  MapPin, 
  Users, 
  Check, 
  X, 
  CheckCircle2, 
  User, 
  Calendar,
  CalendarDays,
  Tag
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';

// =========================================================================
// 1. FULL-PAGE MOBILE ACTIVITY CREATION COMPONENT (Matching AddLead layout)
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

  // Hide bottom navigation dock while create page is active
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
    if (formData.endDate && formData.endDate < formData.startDate) {
      errors.endDate = 'End date cannot be before start date';
    }
    if (
      !formData.allDay && 
      formData.startDate === formData.endDate && 
      formData.startTime && 
      formData.endTime && 
      formData.endTime < formData.startTime
    ) {
      errors.endTime = 'End time cannot be before start time on the same date';
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

        {/* Hero Content matching Add New Lead header */}
        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              {theme?.tagText || 'Origination • Loan Activities'}
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              Schedule Activity
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              Register New Activity / Task
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-full text-xs font-bold backdrop-blur-md border border-white/30 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
      </section>

      {/* 2. Elevated Form Container Card matching AddLead */}
      <div className="relative z-20 -mt-8 mx-0.5 space-y-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4.5">
          
          {/* Card Header */}
          <div className="flex items-center gap-2 pb-3 border-b border-[#e0e3e7]">
            <div className={`p-1.5 rounded-xl ${isSales ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#e8f0fe] text-[#1a73e8]'}`}>
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Activity Profile</h2>
              <p className="text-[10px] text-[#5f6368]">Enter Activity Details For Schedule</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Activity Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
                Activity Title <span className="text-[#d93025]">*</span>
              </label>
              <div className="relative flex items-center">
                <FileText size={16} className="text-[#80868b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: null });
                  }}
                  placeholder="e.g. Client KYC Verification, Follow-up Call"
                  required
                  className={`w-full bg-[#f8fafd] border ${
                    formErrors.title ? 'border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/20' : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-[#1a73e8]/20'
                  } rounded-full pl-10 pr-4 py-3 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] focus:bg-white focus:ring-2 outline-none transition-all`}
                />
              </div>
              {formErrors.title && <p className="text-[10px] text-[#d93025] font-medium pl-3">{formErrors.title}</p>}
            </div>

            {/* Priority Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
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

            {/* Date & Time Schedule Section */}
            <div className="pt-2 border-t border-[#f1f3f4] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
                  Schedule &amp; Timing
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
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
                  <label className="text-[10.5px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#80868b]" />
                    <span>Start Date</span> <span className="text-[#d93025]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        startDate: newStart,
                        endDate: prev.endDate && prev.endDate < newStart ? newStart : (prev.endDate || newStart)
                      }));
                      if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: null });
                      if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: null });
                    }}
                    className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  />
                </div>

                {!formData.allDay && (
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#80868b]" />
                      <span>Start Time</span>
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          startTime: newStartTime,
                          endTime: (prev.startDate === prev.endDate && prev.endTime && prev.endTime < newStartTime)
                            ? newStartTime
                            : prev.endTime
                        }));
                        if (formErrors.endTime) setFormErrors({ ...formErrors, endTime: null });
                      }}
                      className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* End Date & Time */}
              {!formData.allDay && (
                <div className="pt-2 border-t border-[#f1f3f4] space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#80868b]" />
                      <span>End Date</span>
                    </label>
                    <input
                      type="date"
                      min={formData.startDate}
                      value={formData.endDate}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        if (newEnd && newEnd < formData.startDate) {
                          toast.error('End date cannot be before start date');
                          setFormData((prev) => ({ ...prev, endDate: prev.startDate }));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, endDate: newEnd }));
                        if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: null });
                      }}
                      className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-[#5f6368] uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#80868b]" />
                      <span>End Time</span>
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => {
                        const newEndTime = e.target.value;
                        if (formData.startDate === formData.endDate && newEndTime && newEndTime < formData.startTime) {
                          toast.error('End time cannot be before start time');
                          setFormData((prev) => ({ ...prev, endTime: prev.startTime }));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, endTime: newEndTime }));
                        if (formErrors.endTime) setFormErrors({ ...formErrors, endTime: null });
                      }}
                      className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] outline-none min-h-[42px] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location / Client Address */}
            <div className="space-y-1.5 pt-2 border-t border-[#f1f3f4]">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
                Location / Client Address
              </label>
              <div className="relative flex items-center">
                <MapPin size={16} className="text-[#80868b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Gurunanak Colony, Vijayawada"
                  className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full pl-10 pr-4 py-3 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Remarks / Notes */}
            <div className="space-y-1.5 pt-2 border-t border-[#f1f3f4]">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
                Remarks / Instructions
              </label>
              <div className="relative">
                <FileText size={16} className="text-[#80868b] absolute left-3.5 top-3.5 pointer-events-none z-10" />
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add special instructions, document checklist, or notes..."
                  className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Branch Staff Assignment (Only in Branch Operations) */}
            {isBranchOperations && assignableEmployees.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#f1f3f4]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
                    Assign Team Member
                  </label>
                  <span className="text-[11px] font-semibold text-[#5f6368]">
                    {selectedAssignees.length} selected
                  </span>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto">
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
          </div>

          {/* Action Buttons matching Add New Lead */}
          <div className="pt-3 border-t border-[#e0e3e7] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-5 py-3 transition-all shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold ${
                isSales 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
              } px-6 py-3 transition-all shadow-xs cursor-pointer disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Activity...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &amp; Schedule Activity</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
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
