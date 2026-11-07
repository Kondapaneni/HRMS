import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Calendar as CalendarIcon, MapPin, FileText, Loader2 } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';

const ActivitySidebar = ({
  isOpen,
  onClose,
  onSave,
  selectedDate = null,
  assignableEmployees = [],
  showAssigneeSelector = false,
  isSales = false
}) => {
  const location = useLocation();
  const resolvedIsSales = isSales || location?.pathname?.startsWith('/employee/sales');
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      let baseDate = selectedDate || now;
      if (isBefore(baseDate, startOfDay(now))) {
        baseDate = now;
      }
      const baseDateStr = format(baseDate, 'yyyy-MM-dd');

      // Compute smart start & end hours
      let startHourStr = '10:00';
      let endHourStr = '11:00';
      if (baseDateStr === todayStr) {
        const nextH = new Date(now.getTime() + 60 * 60 * 1000);
        startHourStr = format(nextH, 'HH:00');
        const endH = new Date(nextH.getTime() + 60 * 60 * 1000);
        endHourStr = format(endH, 'HH:00');
      }

      setFormData({
        title: '',
        priority: 'Medium',
        startDate: baseDateStr,
        startTime: startHourStr,
        endDate: baseDateStr,
        endTime: endHourStr,
        allDay: false,
        address: '',
        notes: '',
        status: 'Scheduled'
      });

      // Default to current user if available in assignable list
      const currentUser = assignableEmployees.find(e => e.isCurrentUser);
      if (currentUser) {
        setSelectedAssignees([currentUser.id]);
      } else if (assignableEmployees.length > 0) {
        setSelectedAssignees([assignableEmployees[0].id]);
      } else {
        setSelectedAssignees([]);
      }
    }
  }, [isOpen, selectedDate, assignableEmployees]);

  const handleToggleAssignee = (userId) => {
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        // Prevent deselecting if it's the only selected one
        if (prev.length === 1) {
          toast('At least one employee must be assigned', { icon: 'ℹ️' });
          return prev;
        }
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAllAssignees = () => {
    if (selectedAssignees.length === assignableEmployees.length) {
      // Revert to current user only
      const currentUser = assignableEmployees.find(e => e.isCurrentUser);
      setSelectedAssignees(currentUser ? [currentUser.id] : [assignableEmployees[0].id]);
    } else {
      setSelectedAssignees(assignableEmployees.map(e => e.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter an activity title');
      return;
    }

    if (!formData.startDate) {
      toast.error('Please select a start date');
      return;
    }

    if (!formData.endDate) {
      toast.error('Please select an end date');
      return;
    }

    if (!formData.allDay && !formData.startTime) {
      toast.error('Please select a start time');
      return;
    }

    if (!formData.allDay && !formData.endTime) {
      toast.error('Please select an end time');
      return;
    }

    if (!formData.address.trim()) {
      toast.error('Please enter a location or meeting address');
      return;
    }

    if (!formData.notes.trim()) {
      toast.error('Please enter remarks or internal notes');
      return;
    }

    const now = new Date();
    const currentTodayStr = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');

    if (formData.startDate < currentTodayStr) {
      toast.error('Cannot schedule activities for past dates');
      return;
    }

    if (formData.startDate === currentTodayStr && !formData.allDay) {
      if (!formData.startTime) {
        toast.error('Please select a start time');
        return;
      }
      if (formData.startTime < currentTimeStr) {
        toast.error('Cannot schedule activities for past time today');
        return;
      }
    }

    if (formData.endDate && formData.endDate < formData.startDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    if (
      !formData.allDay && 
      formData.startDate === formData.endDate && 
      formData.startTime && 
      formData.endTime && 
      formData.endTime < formData.startTime
    ) {
      toast.error('End time cannot be before start time on the same date');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        title: formData.title.trim(),
        priority: formData.priority,
        startDate: formData.startDate,
        startTime: formData.allDay ? '00:00' : (formData.startTime || '10:00'),
        endDate: formData.endDate || formData.startDate,
        endTime: formData.allDay ? '23:59' : (formData.endTime || '11:00'),
        allDay: Boolean(formData.allDay),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        status: formData.status || 'Scheduled',
        assignedTo: selectedAssignees.length > 0 ? selectedAssignees : null
      };

      await onSave?.(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
        className="bg-[var(--surface)] text-[var(--text)] shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                {resolvedIsSales ? 'Sales Origination Hub' : 'Loan Origination Hub'}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
              Schedule New Activity
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 [scrollbar-width:thin]">
          <form id="activity-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                Activity Title <span className="text-[var(--status-danger)]">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. KYC Verification Visit, Follow-up Call or Document Collection"
                className="w-full px-4 py-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] focus:bg-[var(--surface)] focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none text-xs sm:text-sm font-medium text-[var(--text)] transition-all"
              />
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                Priority Level <span className="text-[var(--status-danger)]">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Low', label: 'Low', activeClass: 'bg-[#EFEFF1] text-[#4A4A52] border-[var(--line)]' },
                  { id: 'Medium', label: 'Medium', activeClass: 'bg-[#E8F0FB] text-[#3B6FB6] border-[#3B6FB6]/20' },
                  { id: 'High', label: 'High', activeClass: 'bg-[#FDF3DC] text-[#B7791F] border-[#B7791F]/20' },
                  { id: 'Urgent', label: 'Urgent', activeClass: 'bg-[#FDE8EA] text-[#D64550] border-[#D64550]/20' }
                ].map((p) => {
                  const isSelected = formData.priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`py-2 px-1 text-center rounded-full text-xs font-bold transition-all border cursor-pointer ${isSelected
                          ? `${p.activeClass} shadow-xs scale-[1.02]`
                          : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--surface-alt)]'
                        }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assign To Employees (Multi-Assign) - Only shown in Branch Operations */}
            {showAssigneeSelector && assignableEmployees.length > 0 && (
              <div className="bg-[var(--surface-alt)] p-4 rounded-[20px] border border-[var(--line)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                    <Users size={14} className="text-[var(--brand-deep)]" />
                    Assign To Team Members
                  </label>
                  {assignableEmployees.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSelectAllAssignees}
                      className="text-[11px] font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer"
                    >
                      {selectedAssignees.length === assignableEmployees.length ? 'Reset to Mine' : 'Select All Branch Staff'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assignableEmployees.map((emp) => {
                    const isChecked = selectedAssignees.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => handleToggleAssignee(emp.id)}
                        className={`p-2.5 rounded-[14px] border flex items-center gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-[var(--surface)] border-[var(--brand-deep)] shadow-xs ring-1 ring-[var(--brand-deep)]'
                            : 'bg-[var(--surface)] border-[var(--line)] hover:border-[var(--brand)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-[var(--brand-deep)] border-[var(--brand-deep)] text-white'
                              : 'border-[var(--line)] bg-[var(--surface)]'
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text)] truncate">
                            {emp.name} {emp.isCurrentUser ? '(You)' : ''}
                          </p>
                          <p className="text-[10.5px] text-[var(--muted)] truncate">
                            {emp.employeeCode || emp.department || 'Staff'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedAssignees.length > 1 && (
                  <p className="text-[11px] font-semibold text-[#1F9D55] bg-[#E6F6EC] px-2.5 py-1 rounded-lg border border-[#1F9D55]/20">
                    ✓ Will schedule this activity for {selectedAssignees.length} team members at the same time.
                  </p>
                )}
              </div>
            )}

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                  Start Date <span className="text-[var(--status-danger)]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    min={format(new Date(), 'yyyy-MM-dd')}
                    value={formData.startDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      startDate: e.target.value,
                      endDate: e.target.value > formData.endDate ? e.target.value : formData.endDate
                    })}
                    className="w-full px-3.5 py-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] focus:bg-[var(--surface)] focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none text-xs text-[var(--text)] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                  End Date <span className="text-[var(--status-danger)]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] focus:bg-[var(--surface)] focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none text-xs text-[var(--text)] font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Time Pickers & All-Day Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--muted)]">Time Schedule</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                    className="rounded text-[var(--brand-deep)] focus:ring-[var(--brand)] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[var(--muted)]">All day activity</span>
                </label>
              </div>

              {!formData.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                      From Time <span className="text-[var(--status-danger)]">*</span>
                    </label>
                    <input
                      type="time"
                      required={!formData.allDay}
                      min={formData.startDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined}
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] focus:bg-[var(--surface)] focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none text-xs text-[var(--text)] font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                      To Time <span className="text-[var(--status-danger)]">*</span>
                    </label>
                    <input
                      type="time"
                      required={!formData.allDay}
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] focus:bg-[var(--surface)] focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none text-xs text-[var(--text)] font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location / Meeting Address */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-[var(--muted)]" />
                <span>Location / Meeting Address <span className="text-[var(--status-danger)]">*</span></span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Applicant residence, branch office, Google Meet"
                className="w-full px-3.5 py-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] focus:bg-[var(--surface)] focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none text-xs text-[var(--text)]"
              />
            </div>

            {/* Notes / Description */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-[var(--muted)]" />
                <span>Remarks & Internal Notes <span className="text-[var(--status-danger)]">*</span></span>
              </label>
              <textarea
                rows={3}
                required
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Key points, documents required, borrower questions..."
                className="w-full px-3.5 py-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] focus:bg-[var(--surface)] focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none text-xs text-[var(--text)] resize-none"
              />
            </div>

          </form>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="activity-form"
            disabled={isSubmitting}
            className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Schedule Activity</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ActivitySidebar;
