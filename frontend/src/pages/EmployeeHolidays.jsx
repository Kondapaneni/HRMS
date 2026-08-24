import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Loader2, 
  CalendarDays,
  Palmtree,
  Sparkles,
  Clock,
  Building,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, getDay, getDate } from 'date-fns';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import EmployeeMobileHolidays from './EmployeeMobileHolidays';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const EmployeeHolidays = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStr = format(currentMonth, 'yyyy-MM');

  const { data: holidays = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'holidays', monthStr],
    queryFn: async () => {
      const response = await api.get(`/employee/holidays?month=${monthStr}`);
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
  const currentYear = new Date().getFullYear();
  const upcomingHolidays = holidays.filter(h => h.holidayDate >= todayStr && new Date(h.holidayDate).getFullYear() === currentYear);

  const nextHoliday = upcomingHolidays[0] || null;

  if (loading) return <PageLoader message="Loading Company Holidays..." />;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileHolidays />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Workplace Calendar</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Company Holidays &amp; Observances <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">Official Calendar</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Official corporate paid holidays, cultural observances, and seasonal facility closures.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white border border-[#e0e3e7] p-1.5 rounded-full shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <input
                type="month"
                value={format(currentMonth, 'yyyy-MM')}
                onChange={handleMonthChange}
                className="h-8 rounded-full border-0 bg-[#f8fafd] px-3 text-xs font-semibold text-[#1f1f1f] focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Selected Month" 
            value={format(currentMonth, 'MMMM yyyy')} 
            subtitle={`${holidays.length} Holidays recorded`} 
            icon={CalendarIcon} 
            colorTheme="blue" 
          />
          <StatCard 
            title="Next Upcoming Holiday" 
            value={nextHoliday ? nextHoliday.holidayName : 'None Pending'} 
            subtitle={nextHoliday ? format(new Date(nextHoliday.holidayDate), 'EEEE, dd MMM yyyy') : 'All holidays observed'} 
            icon={Sparkles} 
            colorTheme="green" 
          />
          <StatCard 
            title="Upcoming Remaining" 
            value={`${upcomingHolidays.length} Days`} 
            subtitle="Scheduled in current calendar year" 
            icon={CalendarDays} 
            colorTheme="purple" 
          />
          <StatCard 
            title="Policy Standard" 
            value="Paid Day-Off" 
            subtitle="Auto-credited in payroll & attendance" 
            icon={CheckCircle2} 
            colorTheme="amber" 
          />
        </div>

        {/* Calendar Card Container */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#e0e3e7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#1f1f1f]">Monthly Calendar View</h2>
                <p className="text-xs text-[#5f6368]">{format(currentMonth, 'MMMM yyyy')} schedule and declared observances</p>
              </div>
            </div>

            <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] px-3 py-1 rounded-full border border-[#d2e3fc]">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
          </div>

          <div className="p-6">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2.5">
              {/* Empty padding slots */}
              {Array.from({ length: startDate }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] rounded-2xl border border-[#f1f3f4] bg-[#f8fafd]/50"></div>
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
                const holiday = getHolidayForDate(dateStr);
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={day}
                    className={`min-h-[120px] flex flex-col rounded-2xl border p-3 text-left transition-all overflow-hidden ${
                      holiday
                        ? 'border-[#ceead6] bg-[#e6f4ea]/40 hover:bg-[#e6f4ea]/60'
                        : isToday
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/30 ring-1 ring-[#d2e3fc]'
                        : 'border-[#e0e3e7] bg-white hover:bg-[#f8fafd]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isToday ? 'h-6 w-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center' : 'text-[#1f1f1f]'}`}>
                        {day}
                      </span>
                      {holiday && (
                        <span className="text-[9px] font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-1.5 py-0.2 rounded-full">
                          Holiday
                        </span>
                      )}
                    </div>

                    {holiday && (
                      <div className="flex-1 flex flex-col justify-between mt-2">
                        <p className="text-[11px] font-semibold text-[#137333] line-clamp-2 leading-tight" title={holiday.holidayName}>
                          {holiday.holidayName}
                        </p>
                        {holiday.holidayImage && (
                          <div className="mt-1.5 w-full h-8 rounded-lg overflow-hidden border border-[#ceead6]">
                            <img src={holiday.holidayImage} alt={holiday.holidayName} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Holidays List Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#e0e3e7]">
            <h2 className="text-base font-semibold text-[#1f1f1f]">Upcoming Holidays in {currentYear}</h2>
            <p className="text-xs text-[#5f6368]">Declared corporate paid days off applied to attendance and timesheets</p>
          </div>

          <div className="p-6">
            {upcomingHolidays.length === 0 ? (
              <div className="text-center py-12 text-[#5f6368] bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
                <CalendarIcon className="w-8 h-8 text-[#dadce0] mx-auto mb-2" />
                <p className="text-xs font-semibold">No remaining upcoming holidays scheduled for this period.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingHolidays.map((h, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 rounded-2xl border border-[#e0e3e7] bg-white p-4 shadow-xs hover:border-[#1a73e8] transition-all"
                  >
                    {h.holidayImage ? (
                      <img src={h.holidayImage} alt={h.holidayName} className="h-14 w-14 rounded-xl border border-[#e0e3e7] object-cover shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl border border-[#d2e3fc] bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                        <Palmtree className="w-6 h-6" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-[#1f1f1f] truncate">{h.holidayName}</p>
                      <p className="text-xs font-semibold text-[#1a73e8] mt-0.5">
                        {format(new Date(h.holidayDate), 'EEEE, dd MMMM yyyy')}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2 py-0.2 rounded-full">
                        Official Holiday
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
};

export default EmployeeHolidays;
