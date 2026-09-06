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
    <div className="space-y-6 pb-4 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
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
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Team Celebrations</p>
              <h2 className="text-3xl font-medium text-white tracking-tight mb-0.5 drop-shadow-sm" style={{ fontWeight: 500 }}>
                Upcoming <span className="font-medium italic text-[#1a73e8]">Birthdays</span>
              </h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Celebrate your colleagues and share joy on their special days</p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Grid (2x2 Grid overlapping the hero) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 -mt-12 mx-0.5">
        {/* Today's Birthdays */}
        <div 
          onClick={() => setFilterMode(filterMode === 'today' ? 'all' : 'today')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'today' ? 'border-[#137333] ring-2 ring-[#ceead6]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Today</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <PartyPopper className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#137333]">{todayBirthdays.length} Today</p>
          <p className="text-[10px] text-[#5f6368]">Birthday stars</p>
        </div>

        {/* This Week */}
        <div 
          onClick={() => setFilterMode(filterMode === 'week' ? 'all' : 'week')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'week' ? 'border-[#1a73e8] ring-2 ring-[#d2e3fc]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">This Week</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1a73e8]">{thisWeekBirthdays.length} Members</p>
          <p className="text-[10px] text-[#5f6368]">Next 7 days</p>
        </div>

        {/* This Month Total */}
        <div 
          onClick={() => setFilterMode('all')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterMode === 'all' ? 'border-[#8430ce] ring-2 ring-[#e9d5ff]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Next 30 Days</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#8430ce]">{birthdays.length} Members</p>
          <p className="text-[10px] text-[#5f6368]">Upcoming timeline</p>
        </div>

        {/* Next Celebration */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Next Up</span>
            <div className="p-1.5 rounded-lg bg-[#fef7e0] text-[#b06000]">
              <Cake className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#b06000] truncate">
            {nextBirthday ? getDaysText(nextBirthday.daysUntil) : 'None'}
          </p>
          <p className="text-[10px] text-[#5f6368] truncate">
            {nextBirthday ? nextBirthday.name : 'No upcoming dates'}
          </p>
        </div>
      </section>

      {/* Next Upcoming Birthday Spotlight Card */}
      {nextBirthday && (
        <section className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-4 mx-0.5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8] flex items-center gap-1.5">
              <PartyPopper className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Next Upcoming Celebration</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              nextBirthday.daysUntil === 0
                ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
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
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#1a73e8] shadow-sm shrink-0" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#1a73e8] to-[#7bdff2] text-white font-black text-sm flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                  {nextBirthday.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-base font-bold text-[#1f1f1f] truncate">
                  {nextBirthday.name}
                </h3>
                <p className="text-xs text-[#5f6368] truncate">
                  {nextBirthday.department || 'Team Member'}
                </p>
                <p className="text-[11px] font-semibold text-[#1a73e8]">
                  {new Date(nextBirthday.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSendWish(nextBirthday.name)}
              className="px-3.5 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
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

      {/* Birthdays List */}
      <div className="space-y-3 mx-0.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">
            {filterMode === 'today'
              ? 'Today’s Celebrations'
              : filterMode === 'week'
                ? 'This Week’s Schedule'
                : 'Upcoming 30-Day Schedule'}
          </h3>
          <span className="text-[10px] text-[#5f6368]">{displayedBirthdays.length} Colleagues</span>
        </div>

        {displayedBirthdays.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No upcoming birthdays found</p>
            <p className="text-[11px] text-[#5f6368]">
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
                  className={`bg-white p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-3 transition-all ${
                    isToday 
                      ? 'border-[#137333] ring-2 ring-[#ceead6]' 
                      : 'border-[#e0e3e7]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar */}
                    {bday.avatar ? (
                      <img 
                        src={bday.avatar} 
                        alt={bday.name} 
                        className={`w-11 h-11 rounded-full object-cover shrink-0 ${
                          isToday ? 'border-2 border-[#137333] ring-2 ring-[#ceead6]' : 'border border-[#dadce0]'
                        }`} 
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                        isToday 
                          ? 'bg-[#137333] shadow-xs' 
                          : 'bg-gradient-to-tr from-[#1a73e8] to-[#7bdff2]'
                      }`}>
                        {bday.name?.charAt(0) || 'U'}
                      </div>
                    )}

                    {/* Member Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#1f1f1f] truncate">
                          {bday.name}
                        </h4>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#5f6368] font-medium truncate mt-0.5">
                        {bday.department || 'Employee'} • {bdayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Countdown Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isToday 
                        ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' 
                        : 'bg-[#f8fafd] text-[#5f6368] border-[#dadce0]'
                    }`}>
                      {getDaysText(bday.daysUntil)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendWish(bday.name)}
                      className="p-1.5 rounded-full bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1a73e8] border border-[#dadce0] hover:border-[#d2e3fc] active:scale-95 transition-all cursor-pointer"
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
