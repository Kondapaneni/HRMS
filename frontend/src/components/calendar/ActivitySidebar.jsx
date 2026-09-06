import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  FileText,
  Loader2,
  Plus,
  Save,
  User,
  Phone,
  Tag
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Check, Users } from 'lucide-react';

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
      const baseDate = selectedDate || new Date();
      const baseDateStr = format(baseDate, 'yyyy-MM-dd');
      const nowHour = baseDate.getHours();
      const startHourStr = String(nowHour).padStart(2, '0') + ':00';
      const endHourStr = String(Math.min(23, nowHour + 1)).padStart(2, '0') + ':00';

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
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#dadce0]"
      >
        {/* Top Module Accent Line */}
        <div className={`h-1.5 w-full absolute top-0 left-0 ${
          resolvedIsSales 
            ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600' 
            : 'bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]'
        }`} />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              {resolvedIsSales ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#137333]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                </>
              )}
              <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                {resolvedIsSales ? 'Sales Origination Hub' : 'Loan Origination Hub'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-medium text-[#1f1f1f]" style={{ fontWeight: 500 }}>
              Schedule New <span className={`font-medium italic ${resolvedIsSales ? 'text-[#137333]' : 'text-[#1a73e8]'}`}>Activity</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#e8eaed] p-2 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 [scrollbar-width:thin]">
          <form id="activity-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#3c4043] mb-1.5">
                Activity Title <span className="text-[#d93025]">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. KYC Verification Visit, Follow-up Call or Document Collection"
                className={`w-full px-4 py-2.5 rounded-xl border border-[#dadce0] ${
                  resolvedIsSales ? 'focus:border-[#137333] focus:ring-[#137333]/20' : 'focus:border-[#1a73e8] focus:ring-[#1a73e8]/20'
                } focus:ring-2 outline-none text-xs sm:text-sm font-medium text-[#1f1f1f] transition-all bg-white`}
              />
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#3c4043] mb-1.5">
                Priority Level <span className="text-[#d93025]">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Low', label: 'Low', activeClass: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' },
                  { id: 'Medium', label: 'Medium', activeClass: resolvedIsSales ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]' },
                  { id: 'High', label: 'High', activeClass: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]' },
                  { id: 'Urgent', label: 'Urgent', activeClass: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]' }
                ].map((p) => {
                  const isSelected = formData.priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${isSelected
                          ? `${p.activeClass} shadow-xs scale-[1.02]`
                          : 'bg-white text-[#5f6368] border-[#dadce0] hover:bg-[#f8fafd]'
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
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1f1f1f] flex items-center gap-1.5">
                    <Users size={14} className="text-[#1a73e8]" />
                    Assign To Team Members
                  </label>
                  {assignableEmployees.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSelectAllAssignees}
                      className="text-[11px] font-semibold text-[#1a73e8] hover:underline cursor-pointer"
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
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-white border-[#1a73e8] shadow-xs ring-1 ring-[#1a73e8]'
                            : 'bg-white/70 border-[#dadce0] hover:bg-white hover:border-[#bdc1c6]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-[#1a73e8] border-[#1a73e8] text-white'
                              : 'border-[#dadce0] bg-white'
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#1f1f1f] truncate">
                            {emp.name} {emp.isCurrentUser ? '(You)' : ''}
                          </p>
                          <p className="text-[10.5px] text-[#5f6368] truncate">
                            {emp.employeeCode || emp.department || 'Staff'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedAssignees.length > 1 && (
                  <p className="text-[11px] font-semibold text-[#137333] bg-[#e6f4ea] px-2.5 py-1 rounded-lg border border-[#ceead6]">
                    ✓ Will schedule this activity for {selectedAssignees.length} team members at the same time.
                  </p>
                )}
              </div>
            )}

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#3c4043] mb-1.5">
                  Start Date <span className="text-[#d93025]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      startDate: e.target.value,
                      endDate: e.target.value > formData.endDate ? e.target.value : formData.endDate
                    })}
                    className={`w-full px-3.5 py-2 rounded-xl border border-[#dadce0] ${
                      resolvedIsSales ? 'focus:border-[#137333]' : 'focus:border-[#1a73e8]'
                    } outline-none text-xs text-[#1f1f1f] bg-white font-medium`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3c4043] mb-1.5">
                  End Date <span className="text-[#d93025]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border border-[#dadce0] ${
                      resolvedIsSales ? 'focus:border-[#137333]' : 'focus:border-[#1a73e8]'
                    } outline-none text-xs text-[#1f1f1f] bg-white font-medium`}
                  />
                </div>
              </div>
            </div>

            {/* Time Pickers & All-Day Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#3c4043]">Time Schedule</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                    className={`rounded ${resolvedIsSales ? 'text-[#137333] focus:ring-[#137333]' : 'text-[#1a73e8] focus:ring-[#1a73e8]'} w-3.5 h-3.5 cursor-pointer`}
                  />
                  <span className="text-xs font-semibold text-[#5f6368]">All day activity</span>
                </label>
              </div>

              {!formData.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                      From Time <span className="text-[#d93025]">*</span>
                    </label>
                    <input
                      type="time"
                      required={!formData.allDay}
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl border border-[#dadce0] ${
                        resolvedIsSales ? 'focus:border-[#137333]' : 'focus:border-[#1a73e8]'
                      } outline-none text-xs text-[#1f1f1f] bg-white font-medium`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                      To Time <span className="text-[#d93025]">*</span>
                    </label>
                    <input
                      type="time"
                      required={!formData.allDay}
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl border border-[#dadce0] ${
                        resolvedIsSales ? 'focus:border-[#137333]' : 'focus:border-[#1a73e8]'
                      } outline-none text-xs text-[#1f1f1f] bg-white font-medium`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location / Meeting Address */}
            <div>
              <label className="block text-xs font-semibold text-[#3c4043] mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#5f6368]" />
                <span>Location / Meeting Address <span className="text-[#d93025]">*</span></span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Applicant residence, branch office, Google Meet"
                className={`w-full px-3.5 py-2 rounded-xl border border-[#dadce0] ${
                  resolvedIsSales ? 'focus:border-[#137333]' : 'focus:border-[#1a73e8]'
                } outline-none text-xs text-[#1f1f1f] bg-white`}
              />
            </div>

            {/* Notes / Description */}
            <div>
              <label className="block text-xs font-semibold text-[#3c4043] mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-[#5f6368]" />
                <span>Remarks & Internal Notes <span className="text-[#d93025]">*</span></span>
              </label>
              <textarea
                rows={3}
                required
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Key points, documents required, borrower questions..."
                className={`w-full px-3.5 py-2 rounded-xl border border-[#dadce0] ${
                  resolvedIsSales ? 'focus:border-[#137333]' : 'focus:border-[#1a73e8]'
                } outline-none text-xs text-[#1f1f1f] resize-none bg-white`}
              />
            </div>

          </form>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-[#dadce0] bg-[#f8fafd] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#3c4043] transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="activity-form"
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-full ${
              resolvedIsSales 
                ? 'bg-[#137333] hover:bg-[#0b5324]' 
                : 'bg-[#1a73e8] hover:bg-[#1557b0]'
            } text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Schedule Activity</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ActivitySidebar;
