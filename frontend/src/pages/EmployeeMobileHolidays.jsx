import { useState, useRef } from 'react';
import { Calendar as CalendarIcon, Sparkles, AlertCircle, CheckCircle2, PartyPopper } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';

const EmployeeMobileHolidays = () => {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState('upcoming'); // 'upcoming' | 'all' | 'past'

  const { data: holidays = [], isLoading: loading, isFetching } = useQuery({
    queryKey: ['employee', 'holidays'],
    queryFn: async () => {
      const response = await api.get('/employee/holidays');
      return response.data || [];
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const hasLoadedOnce = useRef(false);
  if (!loading && holidays) {
    hasLoadedOnce.current = true;
  }

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

  if (!hasLoadedOnce.current && loading && !holidays.length) {
    return <PageLoader message="Loading Company Holidays..." />;
  }

  return (
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Company Holidays
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight">
            Upcoming <span className="text-[var(--brand-deep)]">Holidays</span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-0.5">
            Corporate observances and paid holidays in {currentYear}
          </p>
        </div>
      </section>

      {/* KPI Stats Grid (2x2 Grid) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 mx-0.5">
        {/* Upcoming */}
        <div 
          onClick={() => setFilterMode(filterMode === 'upcoming' ? 'all' : 'upcoming')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'upcoming' ? 'border-[var(--status-success-text)] ring-2 ring-[var(--status-success-bg)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Upcoming</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)]">{upcomingHolidays.length} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Remaining in year</p>
        </div>

        {/* Observed / Past */}
        <div 
          onClick={() => setFilterMode(filterMode === 'past' ? 'all' : 'past')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'past' ? 'border-[var(--text-2)] ring-2 ring-[var(--line)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Observed</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--surface-alt)] text-[var(--muted)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--text-2)]">{pastHolidays.length} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Past holidays</p>
        </div>

        {/* Total In Year */}
        <div 
          onClick={() => setFilterMode('all')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'all' ? 'border-[var(--brand)] ring-2 ring-[var(--brand-tint)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Total Calendar</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--brand-deep)]">{thisYearHolidays.length} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Official in {currentYear}</p>
        </div>

        {/* Next Holiday Countdown */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Next Holiday</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              <PartyPopper className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--accent-pink-deep)] truncate">
            {nextHoliday ? getDaysRemainingText(nextHoliday.holidayDate) : 'All Observed'}
          </p>
          <p className="text-[10px] text-[var(--muted)] truncate">
            {nextHoliday ? nextHoliday.holidayName : 'No pending dates'}
          </p>
        </div>
      </section>

      {/* Next Upcoming Holiday Highlight Card */}
      {nextHoliday && (
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs p-4 mx-0.5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-deep)] flex items-center gap-1.5">
              <PartyPopper className="w-3.5 h-3.5 text-[var(--brand-deep)]" />
              <span>Next Upcoming Holiday</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20">
              {getDaysRemainingText(nextHoliday.holidayDate)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5 min-w-0 flex-1 pr-3">
              <h3 className="text-sm font-semibold text-[var(--text)] truncate">
                {nextHoliday.holidayName}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {new Date(nextHoliday.holidayDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[3.25rem] px-2.5 py-1.5 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--brand)]/20 shadow-2xs shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                {new Date(nextHoliday.holidayDate).toLocaleDateString('en-GB', { month: 'short' })}
              </span>
              <span className="text-lg font-bold leading-tight mt-0.5">
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
                ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20 shadow-2xs'
                : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--line)] hover:bg-[var(--surface-alt)]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
              filterMode === tab.key
                ? 'bg-[var(--brand-deep)] text-white'
                : 'bg-[var(--surface-alt)] text-[var(--muted)]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Holidays List */}
      <div className="space-y-3 mx-0.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text)]">
            {filterMode === 'upcoming' 
              ? 'Upcoming Schedule' 
              : filterMode === 'past' 
                ? 'Observed Holidays' 
                : `Full ${currentYear} Calendar`}
          </h3>
          <span className="text-[10px] text-[var(--muted)]">{displayedHolidays.length} Holidays Displayed</span>
        </div>

        {displayedHolidays.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 rounded-[20px] text-center border border-[var(--line)] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[var(--muted)] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[var(--text)]">No holidays found</p>
            <p className="text-[11px] text-[var(--muted)]">
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
                  className={`bg-[var(--surface)] p-4 rounded-[16px] border shadow-xs flex items-center justify-between gap-3 transition-all ${
                    isToday 
                      ? 'border-[var(--status-success-text)] ring-2 ring-[var(--status-success-bg)]' 
                      : isPast 
                        ? 'border-[var(--line)] opacity-60' 
                        : 'border-[var(--line)]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Date Block */}
                    <div className={`flex flex-col items-center justify-center min-w-[3.25rem] px-2.5 py-1.5 rounded-[12px] border shadow-2xs shrink-0 ${
                      isToday
                        ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-text)]/20'
                        : isPast 
                          ? 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)]' 
                          : 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20'
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
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-semibold text-[var(--text)] truncate">
                          {holiday.holidayName}
                        </h4>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] font-medium mt-0.5">
                        {holidayDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {holiday.holidayImage ? (
                      <img 
                        src={holiday.holidayImage} 
                        alt={holiday.holidayName} 
                        className="w-10 h-10 rounded-[10px] object-cover border border-[var(--line)] shadow-2xs" 
                      />
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                        isPast 
                          ? 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)]' 
                          : 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-text)]/20'
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
