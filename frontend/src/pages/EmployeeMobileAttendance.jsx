import { useState, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { Clock, LogIn, LogOut, Filter, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, CalendarDays, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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
    if (!status) return { label: 'Not Yet!', className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
    const s = String(status).toLowerCase().trim();
    const capitalize = (str) => String(str).replace(/\b\w/g, c => c.toUpperCase());

    if (s === 'present') {
      return { label: 'Present', className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20' };
    }
    if (s.includes('late') || s.includes('checkout missing')) {
      return { 
        label: s.includes('checkout missing') ? 'Checkout Missing' : 'Present (Late)', 
        className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20' 
      };
    }
    if (s.includes('early')) {
      return { label: 'Present (Early)', className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20' };
    }
    if (s.includes('leave') || s === 'on leave') {
      return { label: capitalize(status), className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-text)]/20' };
    }
    if (s.includes('half')) {
      return { label: 'Half Day', className: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink-deep)]/20' };
    }
    if (s === 'missed') {
      return { label: 'Missed', className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
    }
    if (s === 'absent' || s === 'missing') {
      return { label: 'Absent', className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-text)]/20' };
    }
    if (s === 'regularized') {
      return { label: 'Regularized', className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20' };
    }
    if (s === 'holiday') {
      return { label: 'Holiday', className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-text)]/20' };
    }
    if (s.includes('weekend') || s.includes('week off')) {
      return { label: capitalize(status), className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
    }
    return { label: capitalize(status), className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
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
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            My Attendance
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight">
            Daily <span className="text-[var(--brand-deep)]">Attendance</span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-0.5">
            Track your daily punches and approved leaves
          </p>
        </div>
      </section>

      {/* KPI Stats Cards (2x2 Grid) */}
      <section className={`grid grid-cols-2 gap-3 relative z-20 mx-0.5 transition-opacity duration-150 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        {/* Present */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Present</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)]">{presentCount} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Logged present</p>
        </div>

        {/* On Leave */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">On Leave</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--accent-pink-deep)]">{leaveCount} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Approved leaves</p>
        </div>

        {/* Paid Leaves */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Paid Leaves</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--brand-deep)]">{paidLeaveCount} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Quota deducted</p>
        </div>

        {/* Unpaid / LOP */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Unpaid (LOP)</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-danger-text)]">{unpaidLeaveCount} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Loss of pay</p>
        </div>
      </section>

      {/* Filter Controls Bar */}
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs p-3.5 mx-0.5 space-y-3">
        {/* Row 1: Month Switcher Controls */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number);
              const prev = new Date(y, m - 2, 1);
              setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="w-9 h-9 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--text-2)] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-semibold text-[var(--text)] select-none flex items-center gap-1.5">
            {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            {isFetching && <Loader2 className="w-3.5 h-3.5 text-[var(--brand)] animate-spin inline-block" />}
          </span>

          <button
            type="button"
            onClick={() => {
              const [y, m] = selectedMonth.split('-').map(Number);
              const next = new Date(y, m, 1);
              setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="w-9 h-9 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--text-2)] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Status Filter Selector */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 pr-10 text-xs font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] appearance-none cursor-pointer shadow-2xs transition-all"
          >
            <option value="all">All Records</option>
            <option value="present">Present Only</option>
            <option value="paid leave">Paid Leave</option>
            <option value="unpaid leave">Unpaid Leave</option>
            <option value="holiday">Holiday</option>
            <option value="week-off">Week Off</option>
            <option value="missed">Missed / Absent</option>
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]">
            <Filter className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Attendance Records List */}
      <section className={`space-y-3 transition-opacity duration-150 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">
            Recent <span className="text-[var(--brand-deep)]">Records</span>
          </h3>
          <span className="text-xs font-medium text-[var(--muted)]">{filteredHistory.length} Days</span>
        </div>

        {error ? (
          <div className="bg-[var(--status-danger-bg)] p-4 rounded-[16px] text-[var(--status-danger-text)] text-xs font-semibold text-center border border-[var(--status-danger-text)]/20">
            {error}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 rounded-[20px] text-center border border-[var(--line)] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[var(--muted)] mx-auto opacity-60" />
            <p className="text-sm font-semibold text-[var(--text)]">No attendance records found</p>
            <p className="text-xs text-[var(--muted)]">There are no attendance punches logged for this period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((record, index) => {
              const dateObj = new Date(record.date);
              const badge = getAttendanceBadge(record.status);

              return (
                <div key={record.id || index} className="bg-[var(--surface)] p-4 rounded-[20px] border border-[var(--line)] shadow-xs flex flex-col gap-3">
                  
                  {/* Top Row: Date Chip + Day Name + Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center min-w-[3.2rem] px-2 py-1.5 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)] text-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] leading-none mb-0.5">
                          {format(dateObj, 'MMM')}
                        </span>
                        <span className="text-base font-bold text-[var(--text)] leading-none">
                          {format(dateObj, 'dd')}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">
                          {format(dateObj, 'EEEE')}
                        </h4>
                        <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5">
                          {format(dateObj, 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shrink-0 shadow-2xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Bottom Row: Check In and Check Out Times */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)]">
                    <div className="flex items-center gap-2 p-2 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)]">
                      <div className="w-7 h-7 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)] flex items-center justify-center shrink-0">
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] block leading-none">In Time</span>
                        <span className="text-xs font-semibold text-[var(--text)] truncate block mt-0.5">
                          {formatClockTime(record.checkIn)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)]">
                      <div className="w-7 h-7 rounded-[8px] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center justify-center shrink-0">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] block leading-none">Out Time</span>
                        <span className="text-xs font-semibold text-[var(--text)] truncate block mt-0.5">
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
