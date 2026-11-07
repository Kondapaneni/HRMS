import { useState, useEffect } from 'react';
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
      const nextH = new Date(now.getTime() + 60 * 60 * 1000);
      const startHourStr = format(nextH, 'HH:00');
      const endH = new Date(nextH.getTime() + 60 * 60 * 1000);
      const endHourStr = format(endH, 'HH:00');

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
    const now = new Date();
    const currentTodayStr = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    } else if (formData.startDate < currentTodayStr) {
      errors.startDate = 'Cannot schedule activities for past dates';
    } else if (formData.startDate === currentTodayStr && !formData.allDay && formData.startTime && formData.startTime < currentTimeStr) {
      errors.startTime = 'Cannot schedule activities for past time today';
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
    <div className="space-y-4 pb-14 select-none antialiased font-sans">
      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">
            {theme?.tagText || (isSales ? 'ORIGINATION • SALES ACTIVITIES' : 'ORIGINATION • LOAN ACTIVITIES')}
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Schedule Activity
            </h2>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--muted)] mt-1">
            Register New Activity / Task
          </p>
        </div>
      </section>

      {/* 2. Form Container Card */}
      <div className="relative z-20 mx-0.5 space-y-4">
        <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 shadow-xs space-y-4.5">
          
          {/* Card Header */}
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--line)]">
            <div className="p-2 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">Activity Profile</h2>
              <p className="text-[10px] text-[var(--muted)]">Enter Activity Details For Schedule</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Activity Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                Activity Title <span className="text-[var(--status-danger)]">*</span>
              </label>
              <div className="relative flex items-center">
                <FileText size={16} className="text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: null });
                  }}
                  placeholder="e.g. Client KYC Verification, Follow-up Call"
                  required
                  className={`w-full bg-[var(--surface-alt)] border ${
                    formErrors.title 
                      ? 'border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-[var(--status-danger)]/20' 
                      : 'border-[var(--line)] focus:border-[var(--brand-deep)] focus:ring-[var(--brand)]/20'
                  } rounded-full pl-10 pr-4 py-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:ring-2 outline-none transition-all`}
                />
              </div>
              {formErrors.title && <p className="text-[10px] text-[var(--status-danger)] font-medium pl-3">{formErrors.title}</p>}
            </div>

            {/* Priority Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Urgent', label: 'Urgent', color: 'bg-[#FDE8EA] border-[#D64550]/20 text-[#D64550] font-bold' },
                  { id: 'High', label: 'High', color: 'bg-[#FDF3DC] border-[#B7791F]/20 text-[#B7791F] font-bold' },
                  { id: 'Medium', label: 'Medium', color: 'bg-[#E8F0FB] border-[#3B6FB6]/20 text-[#3B6FB6] font-bold' },
                  { id: 'Low', label: 'Low', color: 'bg-[#EFEFF1] border-[var(--line)] text-[#4A4A52] font-medium' }
                ].map((p) => {
                  const isSelected = formData.priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`py-2 px-1 rounded-full text-xs font-semibold text-center border transition-all cursor-pointer ${
                        isSelected
                          ? `${p.color} ring-2 ring-offset-1 ring-[var(--brand)] shadow-2xs`
                          : 'bg-[var(--surface)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-alt)]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time Schedule Section */}
            <div className="pt-2 border-t border-[var(--line)] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                  Schedule &amp; Timing
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-xs font-semibold text-[var(--muted)]">All Day</span>
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--brand-deep)] focus:ring-[var(--brand)] cursor-pointer"
                  />
                </label>
              </div>

              {/* Start Date & Time */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-[var(--muted)] uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span>Start Date</span> <span className="text-[var(--status-danger)]">*</span>
                  </label>
                  <input
                    type="date"
                    min={format(new Date(), 'yyyy-MM-dd')}
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
                    className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text)] outline-none min-h-[42px] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand-deep)] transition-all"
                  />
                </div>

                {!formData.allDay && (
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-[var(--muted)] uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Start Time</span>
                    </label>
                    <input
                      type="time"
                      min={formData.startDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined}
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
                      className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text)] outline-none min-h-[42px] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand-deep)] transition-all"
                    />
                  </div>
                )}
              </div>

              {/* End Date & Time */}
              {!formData.allDay && (
                <div className="pt-2 border-t border-[var(--line)] space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-[var(--muted)] uppercase flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
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
                      className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text)] outline-none min-h-[42px] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand-deep)] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-[var(--muted)] uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
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
                      className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text)] outline-none min-h-[42px] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand-deep)] transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location / Client Address */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                Location / Client Address
              </label>
              <div className="relative flex items-center">
                <MapPin size={16} className="text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Gurunanak Colony, Vijayawada"
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full pl-10 pr-4 py-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand-deep)] outline-none transition-all"
                />
              </div>
            </div>

            {/* Remarks / Notes */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                Remarks / Instructions
              </label>
              <div className="relative">
                <FileText size={16} className="text-[var(--muted)] absolute left-3.5 top-3.5 pointer-events-none z-10" />
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add special instructions, document checklist, or notes..."
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[18px] pl-10 pr-4 py-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand-deep)] outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Branch Staff Assignment (Only in Branch Operations) */}
            {isBranchOperations && assignableEmployees.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                    Assign Team Member
                  </label>
                  <span className="text-[11px] font-semibold text-[var(--muted)]">
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
                        className={`p-2.5 rounded-[14px] border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-[var(--brand-tint)] border-[var(--brand-deep)] text-[var(--brand-deep)]' 
                            : 'bg-[var(--surface-alt)] border-[var(--line)] text-[var(--text)] hover:bg-[var(--surface)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-[8px] bg-[var(--surface)] text-[var(--brand-deep)] border border-[var(--line)] flex items-center justify-center font-bold text-xs shrink-0">
                            {(emp.name || 'E').charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">{emp.name} {emp.isCurrentUser ? '(You)' : ''}</p>
                            <p className="text-[10px] text-[var(--muted)] truncate">{emp.role || 'Staff'}</p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                          isChecked 
                            ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]' 
                            : 'border-[var(--line)] bg-[var(--surface)]'
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
          <div className="pt-3 border-t border-[var(--line)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] active:scale-95 border border-[var(--line)] transition-all shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
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
  getPriorityBadge,
  isSales = false,
  isBranchOperations = false
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
          className="relative w-full max-w-sm sm:max-w-md bg-[var(--surface)] text-[var(--text)] rounded-[24px] shadow-2xl border border-[var(--line)] overflow-hidden z-10 p-5 space-y-4 antialiased font-sans"
        >
          {/* Header: Priority & Close Button */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              {getPriorityBadge ? getPriorityBadge(event.priority) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F0FB] text-[#3B6FB6] border border-[#3B6FB6]/20">
                  {event.priority || 'Medium'}
                </span>
              )}
              {event.status === 'Completed' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20">
                  <CheckCircle2 size={12} /> Done
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDF3DC] text-[#B7791F] border border-[#B7791F]/20">
                  <Clock size={12} /> Scheduled
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Title */}
          <div>
            <h3 className={`text-base sm:text-lg font-bold text-[var(--text)] leading-snug ${
              event.status === 'Completed' ? 'line-through text-[var(--muted)]' : ''
            }`}>
              {event.title}
            </h3>
          </div>

          {/* Details List */}
          <div className="space-y-2.5 bg-[var(--surface-alt)] rounded-[20px] p-4 border border-[var(--line)] text-xs">
            {/* Date & Time */}
            <div className="flex items-start gap-2.5 text-[var(--text)]">
              <Clock className="w-4 h-4 text-[var(--brand-deep)] mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">{formatEventDate(event)}</p>
                <p className="text-[11px] text-[var(--muted)]">{formatEventTime(event)}</p>
              </div>
            </div>

            {/* Location */}
            {event.address && (
              <div className="flex items-start gap-2.5 text-[var(--text)] pt-2 border-t border-[var(--line)]">
                <MapPin className="w-4 h-4 text-[var(--status-danger)] mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Location</p>
                  <p className="text-[11px] text-[var(--muted)]">{event.address}</p>
                </div>
              </div>
            )}

            {/* Assignee */}
            {event.assignedToName && (
              <div className="flex items-start gap-2.5 text-[var(--text)] pt-2 border-t border-[var(--line)]">
                <User className="w-4 h-4 text-[var(--brand-deep)] mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Assigned To</p>
                  <p className="text-[11px] text-[var(--muted)]">{event.assignedToName}</p>
                </div>
              </div>
            )}

            {/* Remarks / Notes */}
            {event.notes && (
              <div className="pt-2 border-t border-[var(--line)]">
                <p className="font-bold text-[var(--muted)] mb-1">Remarks &amp; Notes</p>
                <p className="text-xs text-[var(--text)] italic bg-[var(--surface)] p-2.5 rounded-[12px] border border-[var(--line)]">
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
                className="w-full py-3 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-2 bg-[#E6F6EC] hover:bg-[#E6F6EC]/80 text-[#1F9D55] border border-[#1F9D55]/20 shadow-xs transition-all cursor-pointer active:scale-[0.98]"
              >
                <CheckCircle2 size={14} />
                <span>Mark as Completed</span>
              </button>
            ) : (
              <div className="w-full py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20">
                <CheckCircle2 size={14} />
                <span>Activity Completed</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] transition-all cursor-pointer text-center active:scale-[0.98]"
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
