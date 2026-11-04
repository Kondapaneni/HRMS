import React, { useState } from 'react';
import { 
  Gift, 
  Sparkles, 
  PartyPopper, 
  Calendar, 
  Clock, 
  Users, 
  Heart,
  Smile,
  CheckCircle2,
  Cake,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';
import toast from 'react-hot-toast';

const EmployeeMobileBirthdays = () => {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'week' | 'today'

  const { data: birthdays = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'birthdays'],
    queryFn: async () => {
      const res = await api.get('/employee/birthdays');
      return res.data?.birthdays || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const todayBirthdays = birthdays.filter(b => b.daysUntil === 0);
  const thisWeekBirthdays = birthdays.filter(b => b.daysUntil <= 7);
  const nextBirthday = birthdays[0];

  const getDaysText = (daysUntil) => {
    if (daysUntil === 0) return 'Today 🎉';
    if (daysUntil === 1) return 'Tomorrow 🎂';
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    return `In ${daysUntil} days`;
  };

  const displayedBirthdays = filterMode === 'today'
    ? todayBirthdays
    : filterMode === 'week'
      ? thisWeekBirthdays
      : birthdays;

  const handleSendWish = (name) => {
    toast.success(`🎉 Birthday wishes sent to ${name}!`, {
      icon: '🎂',
      duration: 3000
    });
  };

  if (loading) return <PageLoader message="Loading Birthday Celebrations..." />;

  return (
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Team Celebrations
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight">
            Upcoming <span className="text-[var(--brand-deep)]">Birthdays</span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-0.5">
            Celebrate your colleagues and share joy on their special days
          </p>
        </div>
      </section>

      {/* KPI Stats Grid (2x2 Grid) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 mx-0.5">
        {/* Today's Birthdays */}
        <div 
          onClick={() => setFilterMode(filterMode === 'today' ? 'all' : 'today')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'today' ? 'border-[var(--status-success-text)] ring-2 ring-[var(--status-success-bg)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Today</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <PartyPopper className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)]">{todayBirthdays.length} Today</p>
          <p className="text-[10px] text-[var(--muted)]">Birthday stars</p>
        </div>

        {/* This Week */}
        <div 
          onClick={() => setFilterMode(filterMode === 'week' ? 'all' : 'week')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'week' ? 'border-[var(--brand)] ring-2 ring-[var(--brand-tint)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">This Week</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--brand-deep)]">{thisWeekBirthdays.length} Members</p>
          <p className="text-[10px] text-[var(--muted)]">Next 7 days</p>
        </div>

        {/* This Month Total */}
        <div 
          onClick={() => setFilterMode('all')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'all' ? 'border-[var(--accent-pink-deep)] ring-2 ring-[var(--accent-pink-tint)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Next 30 Days</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--accent-pink-deep)]">{birthdays.length} Members</p>
          <p className="text-[10px] text-[var(--muted)]">Upcoming timeline</p>
        </div>

        {/* Next Celebration */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Next Up</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]">
              <Cake className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-warning-text)] truncate">
            {nextBirthday ? getDaysText(nextBirthday.daysUntil) : 'None'}
          </p>
          <p className="text-[10px] text-[var(--muted)] truncate">
            {nextBirthday ? nextBirthday.name : 'No upcoming dates'}
          </p>
        </div>
      </section>

      {/* Next Upcoming Birthday Spotlight Card */}
      {nextBirthday && (
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs p-4 mx-0.5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-deep)] flex items-center gap-1.5">
              <PartyPopper className="w-3.5 h-3.5 text-[var(--brand-deep)]" />
              <span>Next Upcoming Celebration</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
              nextBirthday.daysUntil === 0
                ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-text)]/20'
                : 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20'
            }`}>
              {getDaysText(nextBirthday.daysUntil)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-2">
              {nextBirthday.avatar ? (
                <img 
                  src={nextBirthday.avatar} 
                  alt={nextBirthday.name} 
                  className="w-12 h-12 rounded-[14px] object-cover border border-[var(--line)] shadow-xs shrink-0" 
                />
              ) : (
                <div className="w-12 h-12 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-bold text-sm flex items-center justify-center border border-[var(--brand)]/20 shadow-xs shrink-0">
                  {nextBirthday.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text)] truncate">
                  {nextBirthday.name}
                </h3>
                <p className="text-xs text-[var(--muted)] truncate">
                  {nextBirthday.department || 'Team Member'}
                </p>
                <p className="text-[11px] font-semibold text-[var(--brand-deep)]">
                  {new Date(nextBirthday.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSendWish(nextBirthday.name)}
              className="px-3.5 py-2 rounded-[14px] bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Wish</span>
            </button>
          </div>
        </section>
      )}

      {/* Horizontal Scrollable Status Filter Chips */}
      <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mx-0.5">
        {[
          { key: 'all', label: 'All Upcoming', count: birthdays.length },
          { key: 'week', label: 'This Week', count: thisWeekBirthdays.length },
          { key: 'today', label: 'Today', count: todayBirthdays.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterMode(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              filterMode === tab.key
                ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20 shadow-2xs font-semibold'
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

      {/* Birthdays List */}
      <div className="space-y-3 mx-0.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text)]">
            {filterMode === 'today'
              ? 'Today’s Celebrations'
              : filterMode === 'week'
                ? 'This Week’s Schedule'
                : 'Upcoming 30-Day Schedule'}
          </h3>
          <span className="text-[10px] text-[var(--muted)]">{displayedBirthdays.length} Colleagues</span>
        </div>

        {displayedBirthdays.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 rounded-[20px] text-center border border-[var(--line)] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[var(--muted)] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[var(--text)]">No upcoming birthdays found</p>
            <p className="text-[11px] text-[var(--muted)]">
              {filterMode === 'today'
                ? 'No team birthdays scheduled for today.'
                : 'No birthdays in this selected timeframe.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedBirthdays.map((bday) => {
              const bdayDate = new Date(bday.date);
              const isToday = bday.daysUntil === 0;

              return (
                <div 
                  key={bday.id || bday.name} 
                  className={`bg-[var(--surface)] p-4 rounded-[16px] border shadow-xs flex items-center justify-between gap-3 transition-all ${
                    isToday 
                      ? 'border-[var(--status-success-text)] ring-2 ring-[var(--status-success-bg)]' 
                      : 'border-[var(--line)]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar */}
                    {bday.avatar ? (
                      <img 
                        src={bday.avatar} 
                        alt={bday.name} 
                        className={`w-11 h-11 rounded-[14px] object-cover shrink-0 ${
                          isToday ? 'border-2 border-[var(--status-success-text)]' : 'border border-[var(--line)]'
                        }`} 
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-[14px] text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                        isToday 
                          ? 'bg-[var(--status-success-text)] shadow-xs' 
                          : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                      }`}>
                        {bday.name?.charAt(0) || 'U'}
                      </div>
                    )}

                    {/* Member Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-semibold text-[var(--text)] truncate">
                          {bday.name}
                        </h4>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] font-medium truncate mt-0.5">
                        {bday.department || 'Employee'} • {bdayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Countdown Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                      isToday 
                        ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-text)]/20' 
                        : 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)]'
                    }`}>
                      {getDaysText(bday.daysUntil)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendWish(bday.name)}
                      className="p-1.5 rounded-[10px] bg-[var(--surface-alt)] hover:bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--line)] active:scale-95 transition-all cursor-pointer"
                      title="Send Wishes"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
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

export default EmployeeMobileBirthdays;
