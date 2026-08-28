import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { Search, ChevronLeft, ChevronRight, Calendar, MapPin, Loader2, Clock, Globe, CalendarCheck, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AdminAttendance = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const isHumanResourcesOrAdmin = 
    profile?.role === 'admin' ||
    profile?.department?.trim().toLowerCase() === 'human resources' ||
    profile?.department?.trim().toLowerCase() === 'hr';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Attendance data query — 30s staleTime since attendance changes frequently
  const { data: attendanceResponse, isLoading: loading } = useQuery({
    queryKey: ['admin', 'attendance', date, debouncedSearch, page],
    queryFn: async () => {
      const res = await api.get(`/admin/attendance?date=${date}&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=10`);
      return res.data;
    },
    staleTime: 30 * 1000,
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

  const parseShiftWindow = (shiftTime) => {
    const defaultShift = { start: '09:45', end: '18:30' };
    if (!shiftTime) return defaultShift;

    const regex = /(\d{1,2}:\d{2}\s*[AP]M)\s*(?:to|-|–)\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
    const match = shiftTime.match(regex);
    if (!match) return defaultShift;

    const parseTime = (timeStr) => {
      const d = new Date(`1970-01-01 ${timeStr}`);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    return {
      start: parseTime(match[1]),
      end: parseTime(match[2])
    };
  };

  const getComputedStatus = (rec) => {
    const status = (rec.status || 'missing').toLowerCase();
    if (rec.isRegularized === true || rec.isRegularized === 'true' || rec.isRegularized === 'yes') return 'regularized';
    return status;
  };

  const getStatusPalette = (computedStatus) => {
    switch (computedStatus) {
      case 'present':
        return { badge: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]', label: 'Present' };
      case 'present (late)':
        return { badge: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]', label: 'Present (Late)' };
      case 'present (early)':
        return { badge: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]', label: 'Present (Early)' };
      case 'present (early+late)':
        return { badge: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]', label: 'Present (Early+Late)' };
      case 'present (checkout missing)':
        return { badge: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]', label: 'Checkout Missing' };
      case 'present (late+checkout missing)':
        return { badge: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]', label: 'Late + No Checkout' };
      case 'regularized':
        return { badge: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]', label: 'Regularized' };
      case 'paid leave':
      case 'unpaid leave':
      case 'sandwich leave':
        const labelStr = computedStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return { badge: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]', label: labelStr };
      case 'holiday':
        return { badge: 'bg-[#f3e8fd] text-[#7627bb] border-[#e9d2fd]', label: 'Holiday' };
      case 'weekend':
        return { badge: 'bg-[#f3e8fd] text-[#7627bb] border-[#e9d2fd]', label: 'Week Off' };
      case 'not-marked':
        return { badge: 'bg-[#f1f3f4] text-[#5f6368] border-[#e0e3e7]', label: 'Not Marked' };
      case 'not-joined':
        return { badge: 'bg-[#f8fafd] text-[#5f6368] border-[#e0e3e7] border-dashed', label: 'Not Joined' };
      case 'missing':
      default:
        return { badge: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]', label: 'Missing' };
      case 'future':
        return { badge: 'bg-[#f8fafd] text-[#5f6368] border-[#e0e3e7] border-dashed', label: 'Future' };
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const parsed = new Date(timeStr.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToTop = () => {
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  if (loading) return <PageLoader message="Loading Attendance Records..." />;

  const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Workforce Attendance Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight">
            Daily Attendance <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{attendanceRows.length} Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            {formattedDate}
          </p>
        </div>

        {isHumanResourcesOrAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/admin/attendance/regularize')}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs"
            >
              <CalendarCheck size={14} className="text-[#5f6368]" />
              <span>Regularize</span>
            </button>
            <button
              onClick={() => navigate('/admin/attendance/config')}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs"
            >
              <Globe size={14} className="text-[#5f6368]" />
              <span>Locations & Shifts</span>
            </button>
            <button
              onClick={() => navigate('/admin/holidays')}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs"
            >
              <CalendarDays size={14} className="text-[#5f6368]" />
              <span>Company Holidays</span>
            </button>
          </div>
        )}
      </div>

      {/* Attendance Records Table Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#f1f3f4] bg-[#f8fafd]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
              <Clock size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Attendance Records</h3>
              <p className="text-[11px] text-[#5f6368]">Check-in / check-out logs with status tracking</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Google Pill Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
              <input
                type="search"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all"
              />
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-1">
              <button onClick={handlePrevDay} className="flex items-center justify-center h-8 w-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer">
                <ChevronLeft size={14} />
              </button>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368] pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 rounded-full border border-[#dadce0] bg-white px-3 py-1 text-xs pl-8 outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 text-[#1f1f1f] cursor-pointer"
                />
              </div>
              <button onClick={handleNextDay} className="flex items-center justify-center h-8 w-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto min-h-[300px] custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-7 w-7 animate-spin text-[#4285F4]" />
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#5f6368]">
              <Clock size={28} className="text-[#dadce0] mb-2" />
              <p className="text-xs font-medium text-[#1f1f1f]">No attendance records found</p>
              <p className="text-[11px] text-[#5f6368]">Try changing the date or search filter</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7]">
                <tr>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Employee</th>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Employee ID</th>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Date</th>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Check In</th>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Check Out</th>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Hours</th>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Status</th>
                  <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4]">
                {attendanceRows.map((row) => {
                  const computedStatus = getComputedStatus(row);
                  const palette = getStatusPalette(computedStatus);
                  const displayLabel = row.status === 'holiday' && row.holidayName ? `Holiday: ${row.holidayName}` : palette.label;

                  return (
                    <tr key={row.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1f1f1f]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-bold text-[10px] shrink-0">
                            {(row.employeeName || '').split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span className="truncate">{row.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#444746]">{row.employeeCode}</td>
                      <td className="px-4 py-3 text-xs text-[#5f6368]">{new Date(row.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 text-xs text-[#1f1f1f] font-medium">{formatTime(row.checkIn)}</td>
                      <td className="px-4 py-3 text-xs text-[#1f1f1f] font-medium">{formatTime(row.checkOut)}</td>
                      <td className="px-4 py-3 text-xs text-[#5f6368]">{row.hours ? `${row.hours} hrs` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${palette.badge}`}>
                          {displayLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(row.checkIn || row.checkOut) && (
                            <button
                              onClick={() => navigate(`/admin/attendance/location?id=${row.attendanceRecordId}&date=${date}`)}
                              className="inline-flex items-center justify-center rounded-full text-[10px] font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] h-6 px-2.5 transition-colors cursor-pointer gap-1"
                            >
                              <MapPin size={11} /> View
                            </button>
                          )}
                        </div>
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
          <div className="p-4 border-t border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center justify-between text-xs text-[#5f6368]">
            <div className="font-medium">Page {page} of {totalPages}</div>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3.5 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[11px]"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3.5 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[11px]"
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
