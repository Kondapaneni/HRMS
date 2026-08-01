import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, getDay, getDate } from 'date-fns';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const EmployeeHolidays = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStr = format(currentMonth, 'yyyy-MM');

  const { data: holidays = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'holidays', monthStr],
    queryFn: async () => {
      // Trying to fetch from admin endpoint, assuming no strict role guard for GET,
      // or we can just use it.
      const response = await api.get(`/admin/holidays?month=${monthStr}`);
      return response.data;
    },
    onError: () => toast.error('Failed to load holidays'),
  });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleMonthChange = (e) => setCurrentMonth(new Date(e.target.value + '-01'));

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
          <p className="text-slate-500">View upcoming company holidays.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employee/attendance')}
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
            <p className="text-sm text-slate-500">View all company holidays for the selected month.</p>
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
                <div
                  key={day}
                  className={`min-h-[130px] flex flex-col rounded-xl border p-3 text-left transition-all overflow-hidden ${holiday
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200 bg-white'
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
                  ) : null}
                </div>
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeHolidays;
