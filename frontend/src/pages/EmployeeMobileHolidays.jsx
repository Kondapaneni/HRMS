import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  PartyPopper,
  Flame
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';

const EmployeeMobileHolidays = () => {
  const [filterMode, setFilterMode] = useState('upcoming'); // 'upcoming' | 'all'

  const { data: holidays = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'holidays'],
    queryFn: async () => {
      const response = await api.get('/employee/holidays');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  
  const thisYearHolidays = holidays
    .filter(h => new Date(h.holidayDate).getFullYear() === currentYear)
    .sort((a, b) => new Date(a.holidayDate) - new Date(b.holidayDate));

  const upcomingHolidays = thisYearHolidays.filter(h => h.holidayDate >= todayStr);
  const pastHolidays = thisYearHolidays.filter(h => h.holidayDate < todayStr);

  const nextHoliday = upcomingHolidays[0];

  const displayedHolidays = filterMode === 'upcoming' ? upcomingHolidays : thisYearHolidays;

  if (loading) return <PageLoader message="Loading Company Holidays..." />;

  return (
    <div className="space-y-4 pb-8">

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                Calendar &amp; Events
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Company Holidays
            </h1>
            <p className="text-xs text-[#5f6368]">
              Official public and festival holidays for {currentYear}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Next Upcoming Holiday Highlight Card */}
      {nextHoliday && (
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8] flex items-center gap-1">
              <PartyPopper className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Next Upcoming Holiday</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
              Upcoming
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-[#1f1f1f]">
                {nextHoliday.holidayName}
              </h3>
              <p className="text-xs text-[#5f6368]">
                {new Date(nextHoliday.holidayDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[3.25rem] px-3 py-1.5 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                {new Date(nextHoliday.holidayDate).toLocaleDateString('en-GB', { month: 'short' })}
              </span>
              <span className="text-lg font-bold leading-tight mt-0.5">
                {new Date(nextHoliday.holidayDate).getDate()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid (2 Cards) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total in Year */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Total in {currentYear}</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1a73e8]">{thisYearHolidays.length} Days</p>
          <p className="text-[10px] text-[#5f6368]">Official calendar</p>
        </div>

        {/* Remaining */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Remaining</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#137333]">{upcomingHolidays.length} Days</p>
          <p className="text-[10px] text-[#5f6368]">Yet to arrive</p>
        </div>
      </div>

      {/* Filter Mode Switcher */}
      <div className="flex p-1 rounded-full bg-[#f8fafd] border border-[#e0e3e7]">
        <button
          type="button"
          onClick={() => setFilterMode('upcoming')}
          className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filterMode === 'upcoming'
              ? 'bg-[#1a73e8] text-white shadow-2xs'
              : 'text-[#5f6368] hover:text-[#1f1f1f]'
          }`}
        >
          Upcoming ({upcomingHolidays.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filterMode === 'all'
              ? 'bg-[#1a73e8] text-white shadow-2xs'
              : 'text-[#5f6368] hover:text-[#1f1f1f]'
          }`}
        >
          All Holidays ({thisYearHolidays.length})
        </button>
      </div>

      {/* Holidays List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">
            {filterMode === 'upcoming' ? 'Upcoming Schedule' : `Full ${currentYear} Calendar`}
          </h3>
          <span className="text-[10px] text-[#5f6368]">{displayedHolidays.length} Holidays</span>
        </div>

        {displayedHolidays.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No holidays found</p>
            <p className="text-[11px] text-[#5f6368]">There are no remaining holidays scheduled for this period.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedHolidays.map((holiday) => {
              const holidayDate = new Date(holiday.holidayDate);
              const isPast = holiday.holidayDate < todayStr;

              return (
                <div 
                  key={holiday.id} 
                  className={`bg-white p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-3 ${
                    isPast ? 'border-[#e0e3e7] opacity-60' : 'border-[#e0e3e7]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Date Block */}
                    <div className={`flex flex-col items-center justify-center min-w-[3.25rem] px-2.5 py-1.5 rounded-2xl border shadow-2xs shrink-0 ${
                      isPast 
                        ? 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' 
                        : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                        {holidayDate.toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-tight mt-0.5">
                        {holidayDate.getDate()}
                      </span>
                    </div>

                    {/* Holiday Info */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#1f1f1f] truncate">
                        {holiday.holidayName}
                      </h4>
                      <p className="text-[10px] text-[#5f6368] font-medium mt-0.5">
                        {holidayDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {holiday.holidayImage && (
                    <img 
                      src={holiday.holidayImage} 
                      alt={holiday.holidayName} 
                      className="w-10 h-10 rounded-xl object-cover border border-[#e0e3e7] shrink-0" 
                    />
                  )}
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
