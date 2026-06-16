import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, X, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, getDay, getDate } from 'date-fns';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    setHolidayImage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate('');
    setHolidayName('');
    setHolidayImage(null);
    setExistingImage('');
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

        const { data: publicUrlData } = supabase.storage
          .from('holidays')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrlData.publicUrl;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Holidays</h1>
          <p className="text-slate-500">Manage dates used in attendance regularization.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/holidays/archive')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
          >
            Archived Holidays
          </button>
          <button
            onClick={() => navigate('/admin/attendance')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Attendance
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Holiday Calendar</h2>
            <p className="text-sm text-slate-500">Click any date to add or update holiday name and image.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="month"
                value={format(currentMonth, 'yyyy-MM')}
                onChange={handleMonthChange}
                className="flex h-10 w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleNextMonth}
              className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Selected month: <span className="font-semibold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {/* Empty slots for start of month */}
            {Array.from({ length: startDate }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] rounded-xl border border-slate-100 bg-slate-50/50"></div>
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
              const holiday = getHolidayForDate(dateStr);

              return (
                <button
                  key={day}
                  onClick={() => openModal(dateStr)}
                  className={`min-h-[130px] flex flex-col rounded-xl border p-3 text-left transition-all overflow-hidden ${
                    holiday
                      ? 'border-green-300 bg-green-50 hover:bg-green-100'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{day}</p>
                  {holiday ? (
                    <div className="flex-1 flex flex-col w-full">
                      <div className="mt-1.5">
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Holiday</span>
                      </div>
                      {holiday.holidayName && (
                        <p className="mt-1 line-clamp-1 text-xs font-medium text-green-900 leading-tight" title={holiday.holidayName}>{holiday.holidayName}</p>
                      )}
                      {holiday.holidayImage && (
                        <div className="mt-2 flex-1 w-full min-h-[40px] rounded border border-green-200/50 overflow-hidden">
                          <img src={holiday.holidayImage} alt={holiday.holidayName} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs font-medium text-slate-400">Add Holiday</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Holidays List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Holidays</h2>
          <p className="text-sm text-slate-500">These upcoming dates are treated as a holiday in attendance regularization.</p>
        </div>
        
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : upcomingHolidays.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              No upcoming holidays found for this month.
            </div>
          ) : (
            upcomingHolidays.map((h, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow gap-4">
                <div className="flex items-center gap-4">
                  {h.holidayImage ? (
                    <img src={h.holidayImage} alt={h.holidayName} className="h-14 w-14 rounded-lg border border-slate-200 object-cover shadow-sm" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-slate-900">{format(new Date(h.holidayDate), 'dd MMM yyyy, EEEE')}</p>
                    <p className="text-sm font-medium text-blue-600 mt-0.5">{h.holidayName}</p>
                    <p className="text-xs text-slate-500 mt-1">{h.holidayDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveHoliday(h.holidayDate)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 h-9 px-4 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {existingImage ? 'Edit Holiday' : 'Add Holiday'}
                </h3>
                <p className="text-sm text-slate-500">Save holiday details for {selectedDate}</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveHoliday} className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  readOnly
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Holiday Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Example: Diwali"
                  required
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Holiday Image {(!existingImage) && <span className="text-red-500">*</span>}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setHolidayImage(e.target.files[0])}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                />
                <p className="text-xs text-slate-500">Upload an image for the holiday banner.</p>
              </div>


              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 h-10 px-4 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHolidays;
