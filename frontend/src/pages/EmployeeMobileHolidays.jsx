import React, { useState } from 'react';
import { 
  ArrowLeft,
  Calendar as CalendarIcon, 
  CalendarDays, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  PartyPopper,
  Flame,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';

const EmployeeMobileHolidays = () => {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState('upcoming'); // 'upcoming' | 'all' | 'past'

  const { data: holidays = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'holidays'],
    queryFn: async () => {
      const response = await api.get('/employee/holidays');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const todayStr = new Date().toLocaleDateString('en-CA');
  const currentYear = new Date().getFullYear();
  
  const thisYearHolidays = holidays
    .filter(h => new Date(h.holidayDate).getFullYear() === currentYear)
    .sort((a, b) => new Date(a.holidayDate) - new Date(b.holidayDate));

  const upcomingHolidays = thisYearHolidays.filter(h => h.holidayDate >= todayStr);
  const pastHolidays = thisYearHolidays.filter(h => h.holidayDate < todayStr);

  const nextHoliday = upcomingHolidays[0];

  const getDaysRemainingText = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date(todayStr);
    const target = new Date(dateStr);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow!';
    if (diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays <= 14) return 'In 2 weeks';
    if (diffDays <= 30) return `In ~${Math.round(diffDays / 7)} weeks`;
    return `In ~${Math.round(diffDays / 30)} months`;
  };

  const displayedHolidays = filterMode === 'upcoming' 
    ? upcomingHolidays 
    : filterMode === 'past' 
      ? pastHolidays 
      : thisYearHolidays;

  if (loading) return <PageLoader message="Loading Company Holidays..." />;

  return (
    <div className="space-y-6 pb-4">

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-6 pb-10 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">Company Holidays</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Official Calendar</h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Corporate observances and paid holidays in {currentYear}</p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Grid (2x2 Grid overlapping the hero) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 -mt-12 mx-0.5">
        {/* Upcoming */}
        <div 
          onClick={() => setFilterMode(filterMode === 'upcoming' ? 'all' : 'upcoming')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'upcoming' ? 'border-[#137333] ring-2 ring-[#ceead6]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Upcoming</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#137333]">{upcomingHolidays.length} Days</p>
          <p className="text-[10px] text-[#5f6368]">Remaining in year</p>
        </div>

        {/* Observed / Past */}
        <div 
          onClick={() => setFilterMode(filterMode === 'past' ? 'all' : 'past')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'past' ? 'border-[#5f6368] ring-2 ring-[#dadce0]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Observed</span>
            <div className="p-1.5 rounded-lg bg-[#f1f3f4] text-[#5f6368]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#5f6368]">{pastHolidays.length} Days</p>
          <p className="text-[10px] text-[#5f6368]">Past holidays</p>
        </div>

        {/* Total In Year */}
        <div 
          onClick={() => setFilterMode('all')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'all' ? 'border-[#1a73e8] ring-2 ring-[#d2e3fc]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Total Calendar</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1a73e8]">{thisYearHolidays.length} Days</p>
          <p className="text-[10px] text-[#5f6368]">Official in {currentYear}</p>
        </div>

        {/* Next Holiday Countdown */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Next Holiday</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <PartyPopper className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#8430ce] truncate">
            {nextHoliday ? getDaysRemainingText(nextHoliday.holidayDate) : 'All Observed'}
          </p>
          <p className="text-[10px] text-[#5f6368] truncate">
            {nextHoliday ? nextHoliday.holidayName : 'No pending dates'}
          </p>
        </div>
      </section>

      {/* Next Upcoming Holiday Highlight Card */}
      {nextHoliday && (
        <section className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-4 mx-0.5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8] flex items-center gap-1.5">
              <PartyPopper className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Next Upcoming Holiday</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
              {getDaysRemainingText(nextHoliday.holidayDate)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5 min-w-0 flex-1 pr-3">
              <h3 className="text-base font-bold text-[#1f1f1f] truncate">
                {nextHoliday.holidayName}
              </h3>
              <p className="text-xs text-[#5f6368]">
                {new Date(nextHoliday.holidayDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[3.5rem] px-3 py-1.5 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shadow-2xs shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                {new Date(nextHoliday.holidayDate).toLocaleDateString('en-GB', { month: 'short' })}
              </span>
              <span className="text-xl font-black leading-tight mt-0.5">
                {new Date(nextHoliday.holidayDate).getDate()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Horizontal Scrollable Status Filter Chips */}
      <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mx-0.5">
        {[
          { key: 'upcoming', label: 'Upcoming', count: upcomingHolidays.length },
          { key: 'all', label: 'All Holidays', count: thisYearHolidays.length },
          { key: 'past', label: 'Observed', count: pastHolidays.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterMode(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              filterMode === tab.key
                ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold'
                : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
              filterMode === tab.key
                ? 'bg-[#1a73e8] text-white'
                : 'bg-[#f1f3f4] text-[#5f6368]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Holidays List */}
      <div className="space-y-3 mx-0.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">
            {filterMode === 'upcoming' 
              ? 'Upcoming Schedule' 
              : filterMode === 'past' 
                ? 'Observed Holidays' 
                : `Full ${currentYear} Calendar`}
          </h3>
          <span className="text-[10px] text-[#5f6368]">{displayedHolidays.length} Holidays Displayed</span>
        </div>

        {displayedHolidays.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No holidays found</p>
            <p className="text-[11px] text-[#5f6368]">
              {filterMode === 'upcoming' 
                ? 'All company holidays for this year have already been observed.' 
                : 'No holidays listed for this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedHolidays.map((holiday) => {
              const holidayDate = new Date(holiday.holidayDate);
              const isPast = holiday.holidayDate < todayStr;
              const isToday = holiday.holidayDate === todayStr;

              return (
                <div 
                  key={holiday.id} 
                  className={`bg-white p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-3 transition-all ${
                    isToday 
                      ? 'border-[#137333] ring-2 ring-[#ceead6]' 
                      : isPast 
                        ? 'border-[#e0e3e7] opacity-65' 
                        : 'border-[#e0e3e7]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Date Block */}
                    <div className={`flex flex-col items-center justify-center min-w-[3.25rem] px-2.5 py-1.5 rounded-2xl border shadow-2xs shrink-0 ${
                      isToday
                        ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                        : isPast 
                          ? 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' 
                          : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                        {holidayDate.toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                      <span className="text-lg font-black leading-tight mt-0.5">
                        {holidayDate.getDate()}
                      </span>
                    </div>

                    {/* Holiday Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#1f1f1f] truncate">
                          {holiday.holidayName}
                        </h4>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#5f6368] font-medium mt-0.5">
                        {holidayDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {holiday.holidayImage ? (
                      <img 
                        src={holiday.holidayImage} 
                        alt={holiday.holidayName} 
                        className="w-10 h-10 rounded-xl object-cover border border-[#e0e3e7] shadow-2xs" 
                      />
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        isPast 
                          ? 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' 
                          : 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                      }`}>
                        {isPast ? 'Observed' : 'Upcoming'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default EmployeeMobileHolidays;
