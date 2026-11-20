import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Loader2,
  Clock,
  CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRemoteData } from '../state/remote.js';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from '../components/ui/SearchBar';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Avatar from '../components/ui/Avatar';

const AdminAttendance = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isHumanResourcesOrAdmin =
    profile?.role === 'admin' ||
    profile?.department?.trim().toLowerCase() === 'human resources' ||
    profile?.department?.trim().toLowerCase() === 'hr';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: attendanceResponse, isLoading: initialLoading, isFetching } = useRemoteData({
    scope: ['admin', 'attendance', date, debouncedSearch, page],
    load: async ({ signal }) => {
      const res = await api.get(
        `/admin/attendance?date=${date}&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=10`,
        { signal }
      );
      return res.data;
    },
    onError: () => toast.error('Failed to load attendance'),
  });

  const attendanceRows = attendanceResponse?.attendance || [];
  const totalPages = attendanceResponse?.pagination?.totalPages || 1;

  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const getComputedStatus = (rec) => {
    const status = (rec.status || 'missing').toLowerCase();
    if (rec.isRegularized === true || rec.isRegularized === 'true' || rec.isRegularized === 'yes') {
      return 'regularized';
    }
    return status;
  };

  const renderStatusBadge = (computedStatus, holidayName) => {
    switch (computedStatus) {
      case 'present':
        return <StatusBadge status="Success">Present</StatusBadge>;
      case 'present (late)':
        return <StatusBadge status="Warning">Late</StatusBadge>;
      case 'present (early)':
        return <StatusBadge status="Warning">Early</StatusBadge>;
      case 'present (early+late)':
        return <StatusBadge status="Warning">Early + late</StatusBadge>;
      case 'present (checkout missing)':
        return <StatusBadge status="Warning">Checkout missing</StatusBadge>;
      case 'present (late+checkout missing)':
        return <StatusBadge status="Warning">Late + no checkout</StatusBadge>;
      case 'regularized':
        return <StatusBadge status="Success">Regularized</StatusBadge>;
      case 'paid leave':
      case 'unpaid leave':
      case 'sandwich leave':
        return <StatusBadge status="Info">{computedStatus}</StatusBadge>;
      case 'holiday':
        return <StatusBadge status="Neutral">{holidayName ? `Holiday: ${holidayName}` : 'Holiday'}</StatusBadge>;
      case 'weekend':
        return <StatusBadge status="Neutral">Week off</StatusBadge>;
      case 'not-marked':
        return <StatusBadge status="Neutral">Not marked</StatusBadge>;
      case 'not-joined':
        return <StatusBadge status="Neutral">Not joined</StatusBadge>;
      case 'future':
        return <StatusBadge status="Neutral">Future</StatusBadge>;
      case 'missing':
      default:
        return <StatusBadge status="Danger">Missing</StatusBadge>;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const parsed = new Date(timeStr.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (initialLoading && !attendanceRows.length && !debouncedSearch) {
    return <PageLoader message="Loading attendance records..." />;
  }

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-5 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
              Daily attendance
            </h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              {attendanceRows.length} records
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">{formattedDate}</p>
        </div>

        {isHumanResourcesOrAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/admin/attendance/regularize')}
              className="h-9 px-3.5 rounded-full text-xs font-medium"
            >
              <CalendarCheck size={14} />
              <span>Regularize</span>
            </Button>
          </div>
        )}
      </div>

      {/* Attendance Records Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-alt)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Attendance records</h3>
              <p className="text-[11px] text-[var(--muted)]">Check-in and check-out logs with status tracking</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search */}
            <SearchBar
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              isFetching={isFetching}
              wrapperClassName="w-full sm:w-64"
            />

            {/* Date Picker */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevDay}
                className="flex items-center justify-center h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--muted)] transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs pl-8 outline-none focus:border-[var(--brand)] text-[var(--text)] cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={handleNextDay}
                className="flex items-center justify-center h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--muted)] transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-x-auto min-h-[300px] custom-scrollbar relative">
          {initialLoading && attendanceRows.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--brand-deep)]" />
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--muted)]">
              <Clock size={28} className="opacity-30 mb-2" />
              <p className="text-xs font-medium text-[var(--text)]">No attendance records found</p>
              <p className="text-[11px] text-[var(--muted)]">Try changing the date or search filter</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[13px] font-normal text-[var(--muted)]">
                <tr>
                  <th className="h-10 px-4">Employee</th>
                  <th className="h-10 px-4">Employee ID</th>
                  <th className="h-10 px-4">Date</th>
                  <th className="h-10 px-4">Check in</th>
                  <th className="h-10 px-4">Check out</th>
                  <th className="h-10 px-4">Hours</th>
                  <th className="h-10 px-4 text-center">Status</th>
                  <th className="h-10 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] text-[13px]">
                {attendanceRows.map((row) => {
                  const computedStatus = getComputedStatus(row);

                  return (
                    <tr key={row.id} className="hover:bg-[var(--brand-tint)]/40 transition-colors">
                      <td className="px-4 py-3 align-middle font-medium text-[var(--text)]">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={row.employeeName || ''}
                            size={28}
                            shape="square"
                            radius={8}
                          />
                          <span className="truncate">{row.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs font-medium text-[var(--text-2)]">
                        {row.employeeCode}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[var(--muted)]">
                        {new Date(row.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[var(--text)] font-medium">
                        {formatTime(row.checkIn)}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[var(--text)] font-medium">
                        {formatTime(row.checkOut)}
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[var(--muted)]">
                        {row.hours ? `${row.hours} hrs` : '-'}
                      </td>
                      <td className="px-4 py-3 align-middle text-center">
                        {renderStatusBadge(computedStatus, row.holidayName)}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        {(row.checkIn || row.checkOut) && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/attendance/location?id=${row.attendanceRecordId}&date=${date}`)
                            }
                            className="inline-flex items-center justify-center rounded-full text-xs font-medium border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text-2)] h-7 px-3 transition-colors cursor-pointer gap-1"
                          >
                            <MapPin size={12} />
                            <span>View</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex items-center justify-between text-xs text-[var(--muted)]">
            <div className="font-medium">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3.5 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text)] font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text)] font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAttendance;
