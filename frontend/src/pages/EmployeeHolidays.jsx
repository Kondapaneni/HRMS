import React, { useState, useRef } from 'react';
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
      iconBg: 'bg-[var(--brand-tint)]',
      iconColor: 'text-[var(--brand-deep)]',
    },
    green: {
      iconBg: 'bg-[#E6F6EC]',
      iconColor: 'text-[#1F9D55]',
    },
    purple: {
      iconBg: 'bg-[var(--accent-pink-tint)]',
      iconColor: 'text-[var(--accent-pink-deep)]',
    },
    amber: {
      iconBg: 'bg-[#FDF3DC]',
      iconColor: 'text-[#B7791F]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 transition-all duration-200 hover:border-[var(--brand)]/40">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[var(--text)] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[var(--muted)] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-[14px] ${theme.iconBg} ${theme.iconColor} shrink-0`}>
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

  const { data: holidays = [], isLoading: loading, isFetching } = useQuery({
    queryKey: ['employee', 'holidays', monthStr],
    queryFn: async () => {
      const response = await api.get(`/employee/holidays?month=${monthStr}`);
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

  if (!hasLoadedOnce.current && loading && !holidays.length) {
    return <PageLoader message="Loading Company Holidays..." />;
  }

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileHolidays />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Workplace calendar &amp; holidays</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>Company holidays</span>
              <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                {holidays.length} Annual holidays
              </span>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Official corporate paid holidays, cultural observances, and seasonal facility closures.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] p-1.5 rounded-[14px]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-[10px] hover:bg-[var(--surface-alt)] text-[var(--muted)] transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center">
              <input
                type="month"
                value={format(currentMonth, 'yyyy-MM')}
                onChange={handleMonthChange}
                className="h-8 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text)] focus:outline-none cursor-pointer"
              />
              {isFetching && (
                <Loader2 className="w-3.5 h-3.5 text-[var(--brand-deep)] animate-spin ml-1 mr-1" />
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-[10px] hover:bg-[var(--surface-alt)] text-[var(--muted)] transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 transition-opacity duration-150 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
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
        <div className={`bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden transition-opacity duration-150 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          <div className="p-6 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text)]">Monthly Calendar View</h2>
                <p className="text-xs text-[var(--muted)]">{format(currentMonth, 'MMMM yyyy')} schedule and declared observances</p>
              </div>
            </div>

            <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-3 py-1 rounded-full border border-[var(--brand)]/30 flex items-center gap-1.5">
              {format(currentMonth, 'MMMM yyyy')}
              {isFetching && <Loader2 className="w-3 h-3 text-[var(--brand-deep)] animate-spin" />}
            </span>
          </div>

          <div className="p-6">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2.5">
              {/* Empty padding slots */}
              {Array.from({ length: startDate }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] rounded-[18px] border border-[var(--line)] bg-[var(--surface-alt)]/50"></div>
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
                    className={`min-h-[120px] flex flex-col rounded-[18px] border p-3 text-left transition-all overflow-hidden ${
                      holiday
                        ? 'border-[#E6F6EC] bg-[#E6F6EC]/40 hover:bg-[#E6F6EC]/60'
                        : isToday
                        ? 'border-[var(--brand)] bg-[var(--brand-tint)]/30 ring-1 ring-[var(--brand)]/40'
                        : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isToday ? 'h-6 w-6 rounded-full bg-[var(--ink)] text-white flex items-center justify-center' : 'text-[var(--text)]'}`}>
                        {day}
                      </span>
                      {holiday && (
                        <span className="text-[9px] font-semibold text-[#1F9D55] bg-[#E6F6EC] border border-[#E6F6EC] px-1.5 py-0.5 rounded-full">
                          Holiday
                        </span>
                      )}
                    </div>

                    {holiday && (
                      <div className="flex-1 flex flex-col justify-between mt-2">
                        <p className="text-[11px] font-semibold text-[#1F9D55] line-clamp-2 leading-tight" title={holiday.holidayName}>
                          {holiday.holidayName}
                        </p>
                        {holiday.holidayImage && (
                          <div className="mt-1.5 w-full h-8 rounded-[10px] overflow-hidden border border-[#E6F6EC]">
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
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden">
          <div className="p-6 border-b border-[var(--line)]">
            <h2 className="text-base font-semibold text-[var(--text)]">Upcoming Holidays in {currentYear}</h2>
            <p className="text-xs text-[var(--muted)]">Declared corporate paid days off applied to attendance and timesheets</p>
          </div>

          <div className="p-6">
            {upcomingHolidays.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted)] bg-[var(--surface-alt)] rounded-[18px] border border-[var(--line)]">
                <CalendarIcon className="w-8 h-8 text-[var(--line)] mx-auto mb-2" />
                <p className="text-xs font-semibold">No remaining upcoming holidays scheduled for this period.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingHolidays.map((h, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 rounded-[18px] border border-[var(--line)] bg-[var(--surface-alt)] p-4 hover:border-[var(--brand)] transition-all"
                  >
                    {h.holidayImage ? (
                      <img src={h.holidayImage} alt={h.holidayName} className="h-14 w-14 rounded-[14px] border border-[var(--line)] object-cover shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-[14px] border border-[var(--brand)]/20 bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                        <Palmtree className="w-6 h-6" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-[var(--text)] truncate">{h.holidayName}</p>
                      <p className="text-xs font-semibold text-[var(--brand-deep)] mt-0.5">
                        {format(new Date(h.holidayDate), 'EEEE, dd MMMM yyyy')}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-[#1F9D55] bg-[#E6F6EC] px-2 py-0.5 rounded-full">
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
