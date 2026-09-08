import React, { useState, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  LogIn, 
  LogOut, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  CalendarDays,
  CalendarCheck2,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const EmployeeMobileAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: history = [], isLoading: loading, isFetching, error: queryError } = useQuery({
    queryKey: ['employee', 'attendance', selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/employee/attendance?month=${selectedMonth}`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const hasLoadedOnce = useRef(false);
  if (!loading && history) {
    hasLoadedOnce.current = true;
  }

  const error = queryError ? 'Failed to load attendance history.' : null;
  const presentCount = history.filter(r => r.status?.toLowerCase().startsWith('present')).length;
  const leaveCount = history.filter(r => r.status?.toLowerCase().includes('leave')).length;
  const paidLeaveCount = history.filter(r => r.status?.toLowerCase() === 'paid leave').length;
  const unpaidLeaveCount = history.filter(r => r.status?.toLowerCase() === 'unpaid leave' || r.status?.toLowerCase() === 'sandwich leave').length;

  const [statusFilter, setStatusFilter] = useState('all');

  const resolveStatusKey = (record) => {
    if (!record || !record.status) return 'missing';
    const l = record.status.toLowerCase();

    if (l.includes('present')) return l;
    if (l === 'weekend') return 'week-off';
    if (l === 'holiday') return 'holiday';
    return l;
  };

  const filteredHistory = history.filter(record => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rDateZero = new Date(record.date);
    rDateZero.setHours(0, 0, 0, 0);

    if (rDateZero > today) {
      return false;
    }

    if (statusFilter !== 'all') {
      const recordStatus = resolveStatusKey(record);
      if (statusFilter === 'present') {
        if (!recordStatus.startsWith('present') && !recordStatus.includes('missing-checkout')) return false;
      } else if (statusFilter === 'missed') {
        if (recordStatus !== 'missed') return false;
      } else if (recordStatus !== statusFilter) {
        return false;
      }
    }
    return true;
  });

  const getAttendanceBadge = (status) => {
    if (!status) return { label: 'Not Yet!', className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
    const s = String(status).toLowerCase().trim();
    const capitalize = (str) => String(str).replace(/\b\w/g, c => c.toUpperCase());

    if (s === 'present') {
      return { label: 'Present', className: 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' };
    }
    if (s.includes('late') || s.includes('checkout missing')) {
      return { 
        label: s.includes('checkout missing') ? 'Checkout Missing' : 'Present (Late)', 
        className: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]' 
      };
    }
    if (s.includes('early')) {
      return { label: 'Present (Early)', className: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]' };
    }
    if (s.includes('leave') || s === 'on leave') {
      return { label: capitalize(status), className: 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' };
    }
    if (s.includes('half')) {
      return { label: 'Half Day', className: 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]' };
    }
    if (s === 'missed') {
      return { label: 'Missed', className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
    }
    if (s === 'absent' || s === 'missing') {
      return { label: 'Absent', className: 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]' };
    }
    if (s === 'regularized') {
      return { label: 'Regularized', className: 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' };
    }
    if (s === 'holiday') {
      return { label: 'Holiday', className: 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' };
    }
    if (s.includes('weekend') || s.includes('week off')) {
      return { label: capitalize(status), className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
    }
    return { label: capitalize(status), className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
  };

  const formatClockTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  };

  if (!hasLoadedOnce.current && loading && !history.length) {
    return <PageLoader message="Loading Attendance History..." />;
  }

  return (
    <div className="space-y-6 pb-4 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Clean White Header (Direct Page Layout, Non-Card) */}
      <section className="relative z-30 pt-1 pb-1">
        {/* Header Title */}
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            My Attendance
          </p>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight" style={{ fontWeight: 500 }}>
            Daily <span className="font-medium italic text-[#1a73e8]">Attendance</span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-0.5">
            Track your daily punches and approved leaves
          </p>
        </div>
      </section>

      {/* KPI Stats Cards (2x2 Grid) */}
      <section className={`grid grid-cols-2 gap-3 relative z-20 mx-0.5 transition-opacity duration-150 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        {/* Present */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Present</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#137333]">{presentCount} Days</p>
          <p className="text-[10px] text-[#5f6368]">Logged present</p>
        </div>

        {/* On Leave */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">On Leave</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#8430ce]">{leaveCount} Days</p>
          <p className="text-[10px] text-[#5f6368]">Approved leaves</p>
        </div>

        {/* Paid Leaves */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Paid Leaves</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1a73e8]">{paidLeaveCount} Days</p>
          <p className="text-[10px] text-[#5f6368]">Quota deducted</p>
        </div>

        {/* Unpaid / LOP */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Unpaid (LOP)</span>
            <div className="p-1.5 rounded-lg bg-[#fce8e6] text-[#c5221f]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#c5221f]">{unpaidLeaveCount} Days</p>
          <p className="text-[10px] text-[#5f6368]">Loss of pay</p>
        </div>
      </section>

      {/* Filter Controls Bar (Stacked: Up and Down) */}
      <section className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-3.5 mx-0.5 space-y-3">
        {/* Row 1 (Up): Month Switcher Controls */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number);
              const prev = new Date(y, m - 2, 1);
              setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold text-slate-800 select-none flex items-center gap-1.5">
            {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            {isFetching && <Loader2 className="w-3.5 h-3.5 text-[#1a73e8] animate-spin inline-block" />}
          </span>

          <button
            type="button"
            onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number);
              const next = new Date(y, m, 1);
              setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2 (Down): Status Filter Selector */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-full px-5 py-3 pr-10 text-[13.5px] font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer shadow-xs transition-all"
          >
            <option value="all">All Records</option>
            <option value="present">Present Only</option>
            <option value="paid leave">Paid Leave</option>
            <option value="unpaid leave">Unpaid Leave</option>
            <option value="holiday">Holiday</option>
            <option value="week-off">Week Off</option>
            <option value="missed">Missed / Absent</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Filter className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Attendance Records List */}
      <section className={`space-y-3 transition-opacity duration-150 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-medium text-slate-900 tracking-tight" style={{ fontWeight: 500 }}>
            Recent <span className="font-medium italic text-[#1a73e8]">Records</span>
          </h3>
          <span className="text-xs font-semibold text-slate-400">{filteredHistory.length} Days</span>
        </div>

        {error ? (
          <div className="bg-red-50 p-4 rounded-2xl text-red-600 text-xs font-medium text-center border border-red-100">
            {error}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white p-8 rounded-[1.5rem] text-center border border-slate-200 shadow-sm space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
            <p className="text-sm font-bold text-slate-800">No attendance records found</p>
            <p className="text-xs text-slate-500">There are no attendance punches logged for this period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((record, index) => {
              const dateObj = new Date(record.date);
              const badge = getAttendanceBadge(record.status);

              return (
                <div key={record.id || index} className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col gap-3">
                  
                  {/* Top Row: Date Chip + Day Name + Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center min-w-[3.2rem] px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                          {format(dateObj, 'MMM')}
                        </span>
                        <span className="text-base font-black text-slate-800 leading-none">
                          {format(dateObj, 'dd')}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          {format(dateObj, 'EEEE')}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {format(dateObj, 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Bottom Row: Check In and Check Out Times */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none">In Time</span>
                        <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                          {formatClockTime(record.checkIn)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none">Out Time</span>
                        <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                          {formatClockTime(record.checkOut)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};

export default EmployeeMobileAttendance;
