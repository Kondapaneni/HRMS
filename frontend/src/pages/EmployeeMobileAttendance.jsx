import React, { useState } from 'react';
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
  CalendarCheck2
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const EmployeeMobileAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: history = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['employee', 'attendance', selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/employee/attendance?month=${selectedMonth}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

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

  const getStatusBadge = (record) => {
    const s = (record.status || '').toLowerCase();
    if (s === 'present') {
      return {
        bg: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
        label: 'Present'
      };
    }
    if (s.includes('late') || s.includes('checkout missing')) {
      return {
        bg: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',
        label: s.includes('checkout missing') ? 'Checkout Missing' : 'Present (Late)'
      };
    }
    if (s.includes('early')) {
      return {
        bg: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',
        label: 'Present (Early)'
      };
    }
    if (s.includes('leave')) {
      return {
        bg: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]',
        label: s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      };
    }
    if (s === 'missing') {
      return {
        bg: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]',
        label: 'Missing'
      };
    }
    if (s === 'regularized') {
      return {
        bg: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
        label: 'Regularized'
      };
    }
    if (s === 'holiday' || s === 'week-off' || s === 'weekend') {
      return {
        bg: 'bg-[#f3e8fd] text-[#8430ce] border-[#e9d5ff]',
        label: s === 'holiday' ? 'Holiday' : 'Week Off'
      };
    }
    return {
      bg: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]',
      label: record.status || 'Not Marked'
    };
  };

  if (loading) return <PageLoader message="Loading Attendance History..." />;

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
                Attendance Log
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              My Attendance
            </h1>
            <p className="text-xs text-[#5f6368]">
              Monthly record of biometric punches and approved leaves
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (4 Cards) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Present */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Present</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#137333]">{presentCount} Days</p>
          <p className="text-[10px] text-[#5f6368]">Logged present</p>
        </div>

        {/* Total Leaves */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">On Leave</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#8430ce]">{leaveCount} Days</p>
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
          <p className="text-xl font-bold text-[#1a73e8]">{paidLeaveCount} Days</p>
          <p className="text-[10px] text-[#5f6368]">Quota deducted</p>
        </div>

        {/* Unpaid / LOP */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Unpaid (LOP)</span>
            <div className="p-1.5 rounded-lg bg-[#fef7e0] text-[#b06000]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#b06000]">{unpaidLeaveCount} Days</p>
          <p className="text-[10px] text-[#5f6368]">Loss of pay</p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      {/* Filter Controls Bar (Side-by-Side) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          
          {/* Month Switcher Controls: [<] [Aug 2026] [>] */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const prev = new Date(y, m - 2, 1);
                setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="w-8 h-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#f8fafd] border border-[#dadce0] text-xs font-bold text-[#1f1f1f] shadow-2xs select-none">
              <CalendarIcon className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
              <span className="whitespace-nowrap">{format(new Date(selectedMonth + '-01'), 'MMM yyyy')}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const next = new Date(y, m, 1);
                setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="w-8 h-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status Filter Selector (Flexible Right Side) */}
          <div className="relative flex-1 min-w-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-7 py-1.5 rounded-full bg-[#f8fafd] border border-[#dadce0] text-xs font-semibold text-[#1f1f1f] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] appearance-none cursor-pointer shadow-2xs truncate"
            >
              <option value="all">All Records</option>
              <option value="present">Present</option>
              <option value="paid leave">Paid Leave</option>
              <option value="unpaid leave">Unpaid (LOP)</option>
              <option value="sandwich leave">Sandwich</option>
              <option value="missed">Missing</option>
            </select>
            <Filter className="w-3 h-3 text-[#5f6368] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>
      </div>

      {/* Attendance History Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Daily Ledger</h3>
          <span className="text-[10px] text-[#5f6368]">{filteredHistory.length} Days Recorded</span>
        </div>

        {error ? (
          <div className="bg-[#fce8e6] p-4 rounded-2xl text-[#c5221f] text-xs font-medium text-center border border-[#fad2cf]">
            {error}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No attendance records found</p>
            <p className="text-[11px] text-[#5f6368]">No log entries matching the selected criteria.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHistory.map((record, index) => {
              const recordDate = new Date(record.date);
              const inTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
              const outTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
              const badge = getStatusBadge(record);

              return (
                <div key={record.id || index} className="bg-white p-4 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#1f1f1f]">
                        {recordDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </h4>
                      <p className="text-[10px] font-semibold text-[#5f6368]">
                        {recordDate.toLocaleDateString('en-GB', { weekday: 'long' })}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[#f1f3f4] text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-[#5f6368] uppercase">In Time</p>
                        <p className="font-bold text-[#1f1f1f]">{inTime}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#fce8e6] text-[#c5221f] flex items-center justify-center shrink-0">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-[#5f6368] uppercase">Out Time</p>
                        <p className="font-bold text-[#1f1f1f]">{outTime}</p>
                      </div>
                    </div>
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

export default EmployeeMobileAttendance;
