import React, { useState } from 'react';
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

  const { data: holidays = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'holidays', monthStr],
    queryFn: async () => {
      const response = await api.get(`/admin/holidays?month=${monthStr}`);
      return response.data;
    },
    onError: () => toast.error('Failed to load holidays'),
  });

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

  if (loading) return <PageLoader message="Loading Company Holidays..." />;

  return (
    <div className="space-y-5 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Company Calendar & Observances</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Company Holidays <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{holidays.length} Holidays</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Manage official holidays and festival leaves for attendance regularization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/admin/holidays/archive')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs"
          >
            <Archive size={14} className="text-[#5f6368]" />
            <span>Archived Holidays</span>
          </button>
          <button
            onClick={() => navigate('/admin/attendance')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] px-3.5 py-2 transition-colors cursor-pointer gap-1 shadow-xs"
          >
            <ArrowLeft size={13} />
            <span>Attendance</span>
          </button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Calendar Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
              <CalendarIcon size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1f1f1f]">Holiday Calendar — {format(currentMonth, 'MMMM yyyy')}</h2>
              <p className="text-[11px] text-[#5f6368]">Click any date to add or update holiday name and poster</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368] pointer-events-none" />
              <input
                type="month"
                value={format(currentMonth, 'yyyy-MM')}
                onChange={handleMonthChange}
                className="h-8 rounded-full border border-[#dadce0] bg-white px-3 py-1 text-xs pl-8 outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 text-[#1f1f1f] cursor-pointer"
              />
            </div>
            <button
              onClick={handleNextMonth}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider py-1.5">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots for start of month */}
            {Array.from({ length: startDate }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] rounded-xl border border-[#e0e3e7] border-dashed bg-[#f8fafd]/50"></div>
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
                  className={`min-h-[120px] flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer overflow-hidden ${holiday
                      ? 'border-[#ceead6] bg-[#e6f4ea] hover:bg-[#d8edd9]'
                      : 'border-[#e0e3e7] bg-white hover:border-[#4285F4] hover:shadow-xs'
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className={`text-sm font-bold ${holiday ? 'text-[#137333]' : 'text-[#1f1f1f]'}`}>
                        {day}
                      </span>
                      {holiday && (
                        <span className="bg-[#137333] text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider">
                          Holiday
                        </span>
                      )}
                    </div>

                    {holiday ? (
                      <div className="mt-1">
                        <p className="text-[11px] font-semibold text-[#137333] line-clamp-1 leading-tight" title={holiday.holidayName}>
                          {holiday.holidayName}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] text-[#9aa0a6]">Click to add</p>
                    )}
                  </div>

                  {holiday && holiday.holidayImage && (
                    <div className="mt-1.5 w-full h-10 rounded-lg overflow-hidden border border-[#ceead6] shadow-2xs bg-white">
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
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
            <Sparkles size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1f1f1f]">Upcoming Holidays</h2>
            <p className="text-[11px] text-[#5f6368]">Active company holidays recognized for this period ({upcomingHolidays.length})</p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#4285F4]" /></div>
          ) : upcomingHolidays.length === 0 ? (
            <div className="text-center py-8 text-[#5f6368] bg-[#f8fafd] rounded-xl border border-dashed border-[#e0e3e7]">
              <CalendarIcon size={24} className="mx-auto mb-2 text-[#dadce0]" />
              <p className="text-xs font-semibold text-[#1f1f1f]">No upcoming holidays this month</p>
              <p className="text-[11px] text-[#5f6368] mt-0.5">Click any calendar date to schedule a new holiday.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {upcomingHolidays.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-[#e0e3e7] bg-white p-3.5 shadow-2xs hover:shadow-xs transition-shadow gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {h.holidayImage ? (
                      <img src={h.holidayImage} alt={h.holidayName} className="h-12 w-12 rounded-lg border border-[#e0e3e7] object-cover shadow-2xs shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg border border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-center shrink-0 text-[#1a73e8]">
                        <CalendarIcon size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1f1f1f] truncate">{h.holidayName}</p>
                      <p className="text-[11px] font-medium text-[#1a73e8] mt-0.5">{format(new Date(h.holidayDate), 'dd MMM yyyy, EEEE')}</p>
                      <p className="text-[10px] text-[#5f6368] mt-0.5">{h.holidayDate}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveHoliday(h.holidayDate)}
                    className="p-1.5 text-[#5f6368] hover:text-[#c5221f] hover:bg-[#fce8e6] rounded-full transition-colors cursor-pointer shrink-0"
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
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative"
          >
            {/* Top Accent Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] absolute top-0 left-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-[#1a73e8] mb-0.5">
                  <CalendarIcon size={15} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider">Holiday Management</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">
                  {existingImage ? 'Edit Holiday' : 'Add Holiday'}
                </h2>
                <p className="text-xs text-[#5f6368] mt-0.5">Date: <strong className="text-[#1f1f1f]">{selectedDate}</strong></p>
              </div>
              <button 
                type="button" 
                onClick={closeModal}
                disabled={saving}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="holiday-form" onSubmit={handleSaveHoliday} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                    Holiday Name <span className="text-[#EA4335]">*</span>
                  </label>
                  <input
                    type="text"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g. Diwali, Independence Day"
                    required
                    className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                    Holiday Image Banner {(!existingImage) && <span className="text-[#EA4335]">*</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-xs text-[#5f6368] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#e8f0fe] file:text-[#1a73e8] hover:file:bg-[#d2e3fc] file:transition-colors file:cursor-pointer"
                  />
                  <p className="text-[10px] text-[#5f6368] mt-1">Upload a festive banner or poster for the holiday card.</p>
                </div>

                {previewUrl && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold text-[#5f6368] mb-1.5">Banner Preview:</p>
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-[#e0e3e7] shadow-xs bg-[#f8fafd]">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold border border-[#dadce0] rounded-full text-[#444746] bg-white hover:bg-[#f1f3f4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="holiday-form"
                disabled={saving}
                className="px-6 py-2 text-xs font-semibold rounded-full text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-md shadow-[#4285F4]/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : 'Save Holiday'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminHolidays;
