import React, { useState, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, X, Trash2, ArrowLeft, Plus, Sparkles, Image as ImageIcon, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, getDay, getDate } from 'date-fns';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import api from '../api/axios';
import { Button } from '../components/ui';

const AdminHolidays = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayImage, setHolidayImage] = useState(null);
  const [existingImage, setExistingImage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const monthStr = format(currentMonth, 'yyyy-MM');

  const { data: holidays = [], isLoading: loading, isFetching } = useQuery({
    queryKey: ['admin', 'holidays', monthStr],
    queryFn: async () => {
      const response = await api.get(`/admin/holidays?month=${monthStr}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
    onError: () => toast.error('Failed to load holidays'),
  });

  const hasLoadedOnce = useRef(false);
  if (!loading && holidays) {
    hasLoadedOnce.current = true;
  }

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleMonthChange = (e) => setCurrentMonth(new Date(e.target.value + '-01'));

  const openModal = (dateStr) => {
    const existing = holidays.find(h => h.holidayDate === dateStr);
    setSelectedDate(dateStr);
    setHolidayName(existing ? existing.holidayName : '');
    setExistingImage(existing ? existing.holidayImage : '');
    setPreviewUrl(existing ? existing.holidayImage : '');
    setHolidayImage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate('');
    setHolidayName('');
    setHolidayImage(null);
    setExistingImage('');
    setPreviewUrl('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHolidayImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!holidayName.trim()) {
      return toast.error('Holiday name is required');
    }
    if (!holidayImage && !existingImage) {
      return toast.error('Holiday image is required');
    }

    try {
      setSaving(true);
      let imageUrl = existingImage;

      // Upload image to Supabase if a new file is selected
      if (holidayImage) {
        const fileExt = holidayImage.name.split('.').pop();
        const fileName = `holiday-${selectedDate}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('holidays')
          .upload(filePath, holidayImage);

        if (uploadError) {
          throw uploadError;
        }

        const proxyUrl = window.location.origin + "/Holiday/" + fileName;
        imageUrl = proxyUrl;
      }

      // Save to backend
      await api.post('/admin/holidays', {
        date: selectedDate,
        name: holidayName,
        image: imageUrl
      });

      toast.success('Holiday saved successfully');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] });
    } catch (err) {
      toast.error(err.message || 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveHoliday = async (dateStr) => {
    if (!window.confirm('Remove this holiday?')) return;
    try {
      await api.delete(`/admin/holidays/${dateStr}`);
      toast.success('Holiday removed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] });
    } catch (err) {
      toast.error('Failed to remove holiday');
    }
  };

  // Calendar rendering logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = getDay(monthStart);
  const daysInMonth = getDate(monthEnd);

  const getHolidayForDate = (dateStr) => holidays.find(h => h.holidayDate === dateStr);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcomingHolidays = holidays.filter(h => h.holidayDate >= todayStr);

  if (!hasLoadedOnce.current && loading && !holidays.length) {
    return <PageLoader message="Loading Company Holidays..." />;
  }

  return (
    <div className="space-y-4 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Company Holidays
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Manage official holidays and festival leaves for attendance regularization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/holidays/archive')}
          >
            <Archive size={14} className="mr-1.5" />
            <span>Archived Holidays</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/attendance')}
          >
            <ArrowLeft size={14} className="mr-1.5" />
            <span>Attendance</span>
          </Button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className={`rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col transition-opacity duration-150 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        {/* Calendar Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <CalendarIcon size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Holiday Calendar — {format(currentMonth, 'MMMM yyyy')}</h2>
              <p className="text-xs text-[var(--muted)]">Click any date to add or update holiday name and poster</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text-2)] transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="relative flex items-center">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--icon-muted)] pointer-events-none" />
              <input
                type="month"
                value={format(currentMonth, 'yyyy-MM')}
                onChange={handleMonthChange}
                className="h-8 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] px-3 py-1 text-xs pl-8 outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text)] cursor-pointer"
              />
              {isFetching && (
                <Loader2 className="w-3.5 h-3.5 text-[var(--brand-deep)] animate-spin ml-1.5 mr-0.5" />
              )}
            </div>
            <button
              onClick={handleNextMonth}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text-2)] transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-[var(--muted)] py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots for start of month */}
            {Array.from({ length: startDate }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] rounded-[16px] border border-[var(--line)] border-dashed bg-[var(--surface-alt)]/40"></div>
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
              const holiday = getHolidayForDate(dateStr);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => openModal(dateStr)}
                  className={`min-h-[120px] flex flex-col justify-between rounded-[16px] border p-2.5 text-left transition-all cursor-pointer overflow-hidden ${
                    holiday
                      ? 'border-[var(--brand)]/30 bg-[var(--brand-tint)] hover:bg-[var(--brand-tint)]/80'
                      : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--brand)]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className={`text-sm font-semibold ${holiday ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                        {day}
                      </span>
                      {holiday && (
                        <span className="bg-[var(--surface)] text-[var(--brand-deep)] px-2 py-0.5 rounded-[9px] text-[10px] font-semibold shadow-xs">
                          Holiday
                        </span>
                      )}
                    </div>

                    {holiday ? (
                      <div className="mt-1">
                        <p className="text-xs font-semibold text-[var(--brand-deep)] line-clamp-1 leading-tight" title={holiday.holidayName}>
                          {holiday.holidayName}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">Click to add</p>
                    )}
                  </div>

                  {holiday && holiday.holidayImage && (
                    <div className="mt-1.5 w-full h-10 rounded-[10px] overflow-hidden border border-[var(--line)] shadow-2xs bg-[var(--surface)]">
                      <img src={holiday.holidayImage} alt={holiday.holidayName} className="w-full h-full object-cover" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Holidays List */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--line)] mb-4">
          <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Upcoming Holidays</h2>
            <p className="text-xs text-[var(--muted)]">Active company holidays recognized for this period ({upcomingHolidays.length})</p>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-deep)]" /></div>
          ) : upcomingHolidays.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)] bg-[var(--surface-alt)] rounded-[16px] border border-dashed border-[var(--line)]">
              <CalendarIcon size={24} className="mx-auto mb-2 text-[var(--icon-muted)]" />
              <p className="text-xs font-semibold text-[var(--text)]">No upcoming holidays this month</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">Click any calendar date to schedule a new holiday.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {upcomingHolidays.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-[16px] border border-[var(--line)] bg-[var(--surface-alt)] p-3.5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {h.holidayImage ? (
                      <img src={h.holidayImage} alt={h.holidayName} className="h-12 w-12 rounded-[12px] border border-[var(--line)] object-cover shadow-2xs shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center shrink-0 text-[var(--brand-deep)]">
                        <CalendarIcon size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text)] truncate">{h.holidayName}</p>
                      <p className="text-xs font-medium text-[var(--brand-deep)] mt-0.5">{format(new Date(h.holidayDate), 'dd MMM yyyy, EEEE')}</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">{h.holidayDate}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveHoliday(h.holidayDate)}
                    className="p-1.5 text-[var(--muted)] hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] rounded-full transition-colors cursor-pointer shrink-0"
                    title="Remove Holiday"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Sidebar Drawer */}
      {showModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !saving) closeModal(); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs font-sans antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)]/50 shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-[var(--brand-deep)] mb-1">
                  <CalendarIcon size={16} />
                  <span className="text-xs font-semibold">Holiday Management</span>
                </div>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  {existingImage ? 'Edit Holiday' : 'Add Holiday'}
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">Date: <strong className="text-[var(--text)]">{selectedDate}</strong></p>
              </div>
              <button 
                type="button" 
                onClick={closeModal}
                disabled={saving}
                className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--surface-alt)] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="holiday-form" onSubmit={handleSaveHoliday} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                    Holiday Name <span className="text-[var(--status-danger-text)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g. Diwali, Independence Day"
                    required
                    className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] px-3.5 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                    Holiday Image Banner {(!existingImage) && <span className="text-[var(--status-danger-text)]">*</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-xs text-[var(--muted)] file:mr-3 file:py-2 file:px-3 file:rounded-[10px] file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-tint)] file:text-[var(--brand-deep)] hover:file:opacity-80 file:transition-colors file:cursor-pointer"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">Upload a festive banner or poster for the holiday card.</p>
                </div>

                {previewUrl && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-[var(--muted)] mb-1.5">Banner Preview:</p>
                    <div className="w-full h-36 rounded-[14px] overflow-hidden border border-[var(--line)] shadow-xs bg-[var(--surface-alt)]">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface-alt)]/50 flex justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="holiday-form"
                variant="primary"
                size="sm"
                loading={saving}
              >
                Save Holiday
              </Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminHolidays;