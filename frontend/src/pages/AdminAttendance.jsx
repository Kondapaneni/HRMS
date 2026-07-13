import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Calendar, MapPin, Loader2, Plus, Clock, Globe, ChevronUp, ChevronDown, CalendarCheck, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AdminAttendance = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

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
    staleTime: 30 * 1000, // attendance changes frequently — 30 sec cache
    onError: () => toast.error('Failed to load attendance'),
  });

  const attendanceRows = attendanceResponse?.attendance || [];
  const totalPages = attendanceResponse?.pagination?.totalPages || 1;

  // Scroll listener — pure UI, no data fetching
  useEffect(() => {
    const handleScroll = () => {
      const container = document.getElementById('main-scroll-container');
      if (container) {
        setShowScrollTop(container.scrollTop > 300);
        setIsScrollable(container.scrollHeight > container.clientHeight);
      }
    };

    const container = document.getElementById('main-scroll-container');
    if (container) {
      setIsScrollable(container.scrollHeight > container.clientHeight);
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [attendanceRows]);

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
        return { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Present' };
      case 'present (late)':
        return { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Present (Late)' };
      case 'present (early)':
        return { badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Present (Early)' };
      case 'present (early+late)':
        return { badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Present (Early+Late)' };
      case 'present (checkout missing)':
        return { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Checkout Missing' };
      case 'present (late+checkout missing)':
        return { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Late + Checkout Missing' };
      case 'regularized':
        return { badge: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Regularized' };
      case 'paid leave':
      case 'unpaid leave':
      case 'sandwich leave':
        const labelStr = computedStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return { badge: 'bg-blue-100 text-blue-700 border-blue-200', label: labelStr };
      case 'holiday':
        return { badge: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Holiday' };
      case 'weekend':
        return { badge: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Week Off' };
      case 'not-marked':
        return { badge: 'bg-slate-100 text-slate-700 border border-slate-200', label: 'Not Marked' };
      case 'not-joined':
        return { badge: 'bg-slate-50 text-slate-400 border-slate-100 border-dashed', label: 'Not Joined' };
      case 'missing':
      default:
        return { badge: 'bg-red-100 text-red-700 border-red-200', label: 'Missing' };
      case 'future':
        return { badge: 'bg-slate-50 text-slate-400 border-slate-100 border-dashed', label: 'Future' };
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage employee attendance</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/attendance/regularize')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 mr-2 text-slate-500" /> Regularize
          </button>
          <button
            onClick={() => navigate('/admin/attendance/config')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 mr-2 text-slate-500" /> Locations & Shifts
          </button>
          <button
            onClick={() => navigate('/admin/holidays')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 mr-2 text-slate-500" /> Company Holidays
          </button>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-900">Attendance Records</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm pl-9 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevDay} className="flex items-center justify-center h-10 w-10 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm pl-9 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button onClick={handleNextDay} className="flex items-center justify-center h-10 w-10 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No employees found
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="h-12 px-4 font-medium">Employee</th>
                  <th className="h-12 px-4 font-medium">Employee ID</th>
                  <th className="h-12 px-4 font-medium">Date</th>
                  <th className="h-12 px-4 font-medium">Check In</th>
                  <th className="h-12 px-4 font-medium">Check Out</th>
                  <th className="h-12 px-4 font-medium">Hours</th>
                  <th className="h-12 px-4 font-medium">Status</th>
                  <th className="h-12 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRows.map((row) => {
                  const computedStatus = getComputedStatus(row);
                  const palette = getStatusPalette(computedStatus);
                  const displayLabel = row.status === 'holiday' && row.holidayName ? `Holiday: ${row.holidayName}` : palette.label;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.employeeName}</td>
                      <td className="px-4 py-3 text-slate-600">{row.employeeCode}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(row.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(row.checkIn)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(row.checkOut)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.hours ? `${row.hours} hrs` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${palette.badge}`}>
                          {displayLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(row.checkIn || row.checkOut) && (
                            <button
                              onClick={() => navigate(`/admin/attendance/location?id=${row.attendanceRecordId}&date=${date}`)}
                              className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-7 px-2.5 transition-colors cursor-pointer"
                            >
                              <MapPin className="w-3 h-3 mr-1 text-slate-500" /> View
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
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
            <div>Page {page} of {totalPages}</div>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>



      {/* Floating Scroll Button */}
      {isScrollable && (
        <button
          onClick={showScrollTop ? scrollToTop : scrollToBottom}
          className="fixed bottom-8 right-8 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center animate-in fade-in zoom-in-95 cursor-pointer"
          aria-label={showScrollTop ? 'Scroll to top' : 'Scroll to bottom'}
        >
          {showScrollTop ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
};

export default AdminAttendance;
