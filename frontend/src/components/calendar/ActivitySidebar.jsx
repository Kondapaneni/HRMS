import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

const ActivitySidebar = ({
  isOpen,
  onClose,
  onSave,
  selectedDate = null
}) => {
  const [formData, setFormData] = useState({
    title: '',
    leadName: '',
    phone: '',
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
    }
  }, [isOpen, selectedDate]);

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
        status: formData.status || 'Scheduled'
      };

      await onSave?.(payload);
      onClose();
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
        {/* Top 4-Color Google Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Loan Origination Hub
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#1f1f1f]">
              Schedule New Activity
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
                className="w-full px-4 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-xs sm:text-sm font-medium text-[#1f1f1f] transition-all bg-white"
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
                  { id: 'Medium', label: 'Medium', activeClass: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]' },
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
                    className="w-full px-3.5 py-2 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] outline-none text-xs text-[#1f1f1f] bg-white font-medium"
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
                    className="w-full px-3.5 py-2 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] outline-none text-xs text-[#1f1f1f] bg-white font-medium"
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
                    className="rounded text-[#1a73e8] focus:ring-[#1a73e8] w-3.5 h-3.5 cursor-pointer"
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
                      className="w-full px-3.5 py-2 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] outline-none text-xs text-[#1f1f1f] bg-white font-medium"
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
                      className="w-full px-3.5 py-2 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] outline-none text-xs text-[#1f1f1f] bg-white font-medium"
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
                className="w-full px-3.5 py-2 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] outline-none text-xs text-[#1f1f1f] bg-white"
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
                className="w-full px-3.5 py-2 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] outline-none text-xs text-[#1f1f1f] resize-none bg-white"
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
            className="px-5 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
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
