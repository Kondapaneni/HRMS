import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Search, Calendar, MapPin, AlertCircle, X, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRemoteData, useRefreshControl } from '../state/remote.js';
import axios from '../api/axios';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { format, addMonths, subMonths } from 'date-fns';
import EmployeeSelect from '../components/EmployeeSelect';
import { Button } from '../components/ui';

const AdminAttendanceRegularize = () => {
  const navigate = useNavigate();
  const refreshControl = useRefreshControl();
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const selectedEmployeeId = searchParams.get('employee') || '';
  const selectedMonth = searchParams.get('month') || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const setSelectedEmployeeId = (id) => {
    const newParams = new URLSearchParams(searchParams);
    if (id) newParams.set('employee', id);
    else newParams.delete('employee');
    setSearchParams(newParams, { replace: true });
  };

  const setSelectedMonth = (month) => {
    const newParams = new URLSearchParams(searchParams);
    if (month) newParams.set('month', month);
    else newParams.delete('month');
    setSearchParams(newParams, { replace: true });
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const prev = subMonths(date, 1);
    setSelectedMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const next = addMonths(date, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalStatus, setModalStatus] = useState('present');
  const [modalCheckIn, setModalCheckIn] = useState('');
  const [modalCheckOut, setModalCheckOut] = useState('');
  const [modalHours, setModalHours] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Employees dropdown query
  const { data: employees = [] } = useRemoteData({
    scope: ['admin', 'employees-dropdown-regularize'],
    load: async () => {
      const response = await axios.get('/admin/employees?limit=500');
      return response.data.employees || [];
    },
    reloadOnFocus: false,
  });

  // Attendance calendar query
  const { data: attendanceResponse, isLoading: loading, error } = useRemoteData({
    scope: ['admin', 'attendance-regularize', selectedEmployeeId, selectedMonth],
    load: async () => {
      const response = await axios.get(`/admin/attendance/employee/${selectedEmployeeId}?month=${selectedMonth}`);
      return response.data;
    },
    enabled: !!selectedEmployeeId && !!selectedMonth,
    onError: () => console.error('Failed to fetch attendance'),
  });

  const attendanceData = attendanceResponse?.attendance || [];
  const employeeDetails = attendanceResponse?.employee || null;

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
    if (!rec) return 'missing';
    if (rec.isRegularized === true || rec.isRegularized === 'true' || rec.isRegularized === 'yes') return 'regularized';
    
    const status = (rec.status || 'missing').toLowerCase();
    
    if (!rec.checkIn && !rec.checkOut) {
      if (['paid leave', 'unpaid leave', 'sandwich leave', 'holiday', 'weekend', 'future', 'not-joined', 'not-marked'].includes(status)) {
        return status;
      }
      return 'missing';
    }

    const isToday = new Date(rec.date).toDateString() === new Date().toDateString();
    const shiftWindow = parseShiftWindow(employeeDetails?.shiftTime);

    if (rec.checkIn && !rec.checkOut) {
      if (isToday) return 'present';
      if (shiftWindow) {
        const checkInValue = new Date(rec.checkIn).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        if (checkInValue > shiftWindow.start) return 'present (late+checkout missing)';
      }
      return 'present (checkout missing)';
    }

    if (rec.checkIn && rec.checkOut) {
      if (!shiftWindow) return 'present';
      
      const checkInValue = new Date(rec.checkIn).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const checkOutValue = new Date(rec.checkOut).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      const isLateCheckIn = checkInValue > shiftWindow.start;
      const isEarlyCheckout = checkOutValue < shiftWindow.end;

      if (isLateCheckIn && isEarlyCheckout) return 'present (early+late)';
      if (isLateCheckIn) return 'present (late)';
      if (isEarlyCheckout) return 'present (early)';

      return 'present';
    }

    return status !== 'missing' ? status : 'present';
  };

  const getStatusPalette = (computedStatus) => {
    switch (computedStatus) {
      case 'present':
      case 'present-full-shift':
        return {
          bg: 'bg-[var(--status-success-bg)]',
          border: 'border-[var(--status-success-text)]/20',
          text: 'text-[var(--status-success-text)]',
          badge: 'bg-[var(--surface)] text-[var(--status-success-text)]',
          label: 'Present'
        };
      case 'present (late)':
      case 'late-checkin':
        return {
          bg: 'bg-[var(--status-warning-bg)]',
          border: 'border-[var(--status-warning-text)]/20',
          text: 'text-[var(--status-warning-text)]',
          badge: 'bg-[var(--surface)] text-[var(--status-warning-text)]',
          label: 'Late'
        };
      case 'present (early)':
      case 'early-checkout':
        return {
          bg: 'bg-[var(--status-warning-bg)]',
          border: 'border-[var(--status-warning-text)]/20',
          text: 'text-[var(--status-warning-text)]',
          badge: 'bg-[var(--surface)] text-[var(--status-warning-text)]',
          label: 'Early'
        };
      case 'present (early+late)':
      case 'late-and-early':
        return {
          bg: 'bg-[var(--status-warning-bg)]',
          border: 'border-[var(--status-warning-text)]/20',
          text: 'text-[var(--status-warning-text)]',
          badge: 'bg-[var(--surface)] text-[var(--status-warning-text)]',
          label: 'Late+Early'
        };
      case 'present (checkout missing)':
      case 'missing-checkout':
        return {
          bg: 'bg-[var(--status-warning-bg)]',
          border: 'border-[var(--status-warning-text)]/20',
          text: 'text-[var(--status-warning-text)]',
          badge: 'bg-[var(--surface)] text-[var(--status-warning-text)]',
          label: 'No Checkout'
        };
      case 'present (late+checkout missing)':
      case 'late-missing-checkout':
        return {
          bg: 'bg-[var(--status-warning-bg)]',
          border: 'border-[var(--status-warning-text)]/20',
          text: 'text-[var(--status-warning-text)]',
          badge: 'bg-[var(--surface)] text-[var(--status-warning-text)]',
          label: 'Late+No CO'
        };
      case 'regularized':
        return {
          bg: 'bg-[var(--brand-tint)]',
          border: 'border-[var(--brand)]/20',
          text: 'text-[var(--brand-deep)]',
          badge: 'bg-[var(--surface)] text-[var(--brand-deep)]',
          label: 'Regularized'
        };
      case 'paid leave':
      case 'unpaid leave':
      case 'sandwich leave':
        let labelStr = computedStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (computedStatus === 'sandwich leave') labelStr = 'Sandwich';
        return {
          bg: 'bg-[var(--accent-pink-tint)]',
          border: 'border-[var(--accent-pink-deep)]/20',
          text: 'text-[var(--accent-pink-deep)]',
          badge: 'bg-[var(--surface)] text-[var(--accent-pink-deep)]',
          label: labelStr
        };
      case 'holiday':
        return {
          bg: 'bg-[var(--surface-alt)]',
          border: 'border-[var(--line)]',
          text: 'text-[var(--brand-deep)]',
          badge: 'bg-[var(--surface)] text-[var(--brand-deep)]',
          label: 'Holiday'
        };
      case 'weekend':
        return {
          bg: 'bg-[var(--surface-alt)]',
          border: 'border-[var(--line)]',
          text: 'text-[var(--text-2)]',
          badge: 'bg-[var(--surface)] text-[var(--text-2)]',
          label: 'Week Off'
        };
      case 'not-marked':
        return {
          bg: 'bg-[var(--surface-alt)]',
          border: 'border-[var(--line)]',
          text: 'text-[var(--muted)]',
          badge: 'bg-[var(--surface)] text-[var(--muted)]',
          label: 'Not Marked'
        };
      case 'not-joined':
        return {
          bg: 'bg-[var(--surface)]',
          border: 'border-[var(--line)] border-dashed',
          text: 'text-[var(--muted)]',
          badge: 'bg-[var(--surface-alt)] text-[var(--muted)]',
          label: 'Not Joined'
        };
      case 'missing':
      default:
        return {
          bg: 'bg-[var(--status-danger-bg)]',
          border: 'border-[var(--status-danger-text)]/20',
          text: 'text-[var(--status-danger-text)]',
          badge: 'bg-[var(--surface)] text-[var(--status-danger-text)]',
          label: 'Missing'
        };
      case 'future':
        return {
          bg: 'bg-[var(--surface)]',
          border: 'border-[var(--line)] border-dashed',
          text: 'text-[var(--muted)]',
          badge: 'bg-[var(--surface-alt)] text-[var(--muted)]',
          label: 'Future'
        };
    }
  };

  const formatTime = (datetime) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (inTime, outTime) => {
    if (!inTime || !outTime) return '';
    const start = new Date(`1970-01-01T${inTime}`);
    let end = new Date(`1970-01-01T${outTime}`);
    if (end < start) {
      end = new Date(`1970-01-02T${outTime}`);
    }
    const diffHours = (end - start) / 1000 / 3600;
    return diffHours > 0 ? diffHours.toFixed(2) : '';
  };

  const handleOpenModal = (record) => {
    setSelectedRecord(record);
    let initStatus = '';
    if (record.status) {
      const lower = record.status.toLowerCase();
      if (lower.startsWith('present')) initStatus = 'present';
      else if (['leave', 'absent'].includes(lower)) initStatus = lower;
    }
    setModalStatus(initStatus);

    let inTime = '';
    let outTime = '';
    if (record.checkIn) {
      const d = new Date(record.checkIn);
      inTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (record.checkOut) {
      const d = new Date(record.checkOut);
      outTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    setModalCheckIn(inTime);
    setModalCheckOut(outTime);
    setModalHours(record.hours || '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleTimeChange = (type, value) => {
    if (type === 'in') setModalCheckIn(value);
    if (type === 'out') setModalCheckOut(value);

    const inT = type === 'in' ? value : modalCheckIn;
    const outT = type === 'out' ? value : modalCheckOut;

    if (inT && outT) {
      setModalHours(calculateHours(inT, outT));
    } else {
      setModalHours('');
    }
  };

  const handleSubmitRegularize = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!modalStatus) {
      setModalError('Please select a status to regularize.');
      return;
    }

    if (modalStatus === 'present' && modalCheckIn && modalCheckOut) {
      if (modalCheckOut <= modalCheckIn) {
        setModalError('Check-Out time must be greater than Check-In time.');
        return;
      }
    }

    setModalLoading(true);

    try {
      const payload = {
        employeeId: selectedRecord.employeeId,
        date: selectedRecord.date,
        status: modalStatus,
        checkIn: modalCheckIn,
        checkOut: modalCheckOut,
        hours: modalHours,
        attendanceId: selectedRecord.attendanceRecordId
      };

      await axios.post('/admin/attendance/regularize', payload);
      setIsModalOpen(false);
      refreshControl.invalidateQueries({ scope: ['admin', 'attendance-regularize'] });
      refreshControl.invalidateQueries({ scope: ['admin', 'attendance'] });
      refreshControl.invalidateQueries({ scope: ['admin', 'dashboard'] });
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to regularize attendance');
    } finally {
      setModalLoading(false);
    }
  };

  // Calendar logic
  const renderCalendar = () => {
    if (attendanceData.length === 0) return null;

    const firstDate = new Date(`${selectedMonth}-01`);
    const firstWeekday = firstDate.getDay();

    const emptyCells = Array.from({ length: firstWeekday }).map((_, i) => (
      <div key={`empty-${i}`} className="min-h-[130px] rounded-[16px] border border-[var(--line)] border-dashed bg-[var(--surface-alt)]/40"></div>
    ));

    const dayCells = attendanceData.map((rec, index) => {
      const dateObj = new Date(rec.date);
      const dayNum = dateObj.getDate();
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const computedStatus = getComputedStatus(rec);
      const palette = getStatusPalette(computedStatus);

      return (
        <div key={`day-${index}`} className={`min-h-[130px] rounded-[16px] border p-2.5 flex flex-col justify-between ${palette.bg} ${palette.border}`}>
          <div>
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <span className={`text-base font-semibold ${palette.text}`}>{dayNum}</span>
                <span className="text-[11px] font-medium text-[var(--muted)] ml-1">{dayName}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-[9px] text-[10px] font-semibold whitespace-nowrap shadow-xs ${palette.badge}`}>
                {palette.label}
              </span>
            </div>

            {rec.status === 'holiday' && (
              <div className="mt-1 text-center text-xs font-semibold text-[var(--brand-deep)]">
                {rec.holidayImage && <img src={rec.holidayImage} alt={rec.holidayName} className="w-8 h-8 object-contain mx-auto mb-0.5 rounded-[8px] bg-[var(--surface)]" />}
                {rec.holidayName}
              </div>
            )}

            <div className="mt-1.5 space-y-0.5 text-xs">
              {rec.checkIn && (
                <div className="flex items-center text-[var(--text-2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-text)] mr-1"></span>
                  In: <span className="font-semibold ml-0.5 text-[var(--text)]">{formatTime(rec.checkIn)}</span>
                </div>
              )}
              {rec.checkOut && (
                <div className="flex items-center text-[var(--text-2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-danger-text)] mr-1"></span>
                  Out: <span className="font-semibold ml-0.5 text-[var(--text)]">{formatTime(rec.checkOut)}</span>
                </div>
              )}
              {!rec.checkIn && !rec.checkOut && rec.status === 'missing' && (
                <div className="text-[var(--status-danger-text)] text-[11px] font-medium flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-0.5" /> No record
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 flex gap-1.5">
            {rec.status !== 'future' && (
              <button
                onClick={() => handleOpenModal(rec)}
                className="flex-1 bg-[var(--surface)] border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] text-[11px] font-semibold py-1 rounded-full transition-colors cursor-pointer shadow-xs"
              >
                Regularize
              </button>
            )}
            {(rec.checkIn || rec.checkOut) && (
              <button
                onClick={() => navigate(`/admin/attendance/location?id=${rec.attendanceRecordId}&date=${rec.date}`, { state: { fromRegularize: true } })}
                className="flex-none px-2 py-1 bg-[var(--surface)] border border-[var(--line)] text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] text-[11px] font-semibold rounded-full transition-colors cursor-pointer shadow-xs"
                title="View Location"
              >
                <MapPin size={13} />
              </button>
            )}
          </div>
        </div>
      );
    });

    return (
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--line)] mb-4">
          <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Attendance Calendar — {new Date(`${selectedMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <p className="text-xs text-[var(--muted)]">{employeeDetails ? `${employeeDetails.firstName} ${employeeDetails.lastName}` : 'Employee'} • {employeeDetails?.shiftTime || 'Default Shift'}</p>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-xs font-medium text-[var(--muted)] py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {emptyCells}
            {dayCells}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <PageLoader message="Loading Attendance Records..." />;

  return (
    <div className="space-y-4 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Attendance Regularization
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Select an employee and month to view and regularize attendance records.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/attendance')}
          className="self-start sm:self-auto"
        >
          <ArrowLeft size={14} className="mr-1.5" />
          <span>Back to Attendance</span>
        </Button>
      </div>

      {/* Filter Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--line)] mb-4">
          <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
            <Search size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Employee & Period Selection</h3>
            <p className="text-xs text-[var(--muted)]">Choose an employee and target month</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Select Employee</label>
            <EmployeeSelect
              employees={employees}
              selectedId={selectedEmployeeId}
              onChange={(id) => setSelectedEmployeeId(id)}
              placeholder="Search and Select Employee..."
              valueKey="userId"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Select Month</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex items-center justify-center h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text-2)] transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="relative flex items-center">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--icon-muted)] pointer-events-none" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-8 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs pl-8 outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text)] cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="flex items-center justify-center h-8 w-8 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text-2)] transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-7 h-7 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium text-[var(--muted)]">Loading calendar data...</p>
        </div>
      )}

      {error && (
        <div className="bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] p-4 rounded-[16px] border border-[var(--status-danger-text)]/20 flex items-center text-xs font-medium">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error?.message || 'Failed to fetch attendance data.'}
        </div>
      )}

      {!loading && !error && selectedEmployeeId && attendanceData.length > 0 && (
        <div className="space-y-4">
          {renderCalendar()}
        </div>
      )}

      {/* Regularize Slideover Drawer */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !modalLoading) setIsModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs font-sans antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative"
          >
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">Attendance Regularization</span>
                </div>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Regularize Record
                </h2>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                disabled={modalLoading}
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="regularize-form" onSubmit={handleSubmitRegularize} className="space-y-4">
                {modalError && (
                  <div className="p-3 bg-[var(--status-danger-bg)] border border-[var(--status-danger-text)]/20 text-[var(--status-danger-text)] text-xs rounded-[12px] flex items-start font-medium">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all bg-[var(--surface-alt)] cursor-pointer"
                    disabled={modalLoading}
                  >
                    <option value="" disabled>Select Status</option>
                    <option value="present">Present</option>
                    <option value="leave">Leave</option>
                    <option value="not-marked">Not Marked (Clear)</option>
                  </select>
                </div>

                {modalStatus === 'present' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Check In Time</label>
                        <input
                          type="time"
                          value={modalCheckIn}
                          onChange={(e) => handleTimeChange('in', e.target.value)}
                          className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all bg-[var(--surface-alt)] cursor-pointer"
                          required
                          disabled={modalLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Check Out Time</label>
                        <input
                          type="time"
                          value={modalCheckOut}
                          onChange={(e) => handleTimeChange('out', e.target.value)}
                          className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all bg-[var(--surface-alt)] cursor-pointer"
                          disabled={modalLoading}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Working Hours (Auto-Calculated)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={modalHours}
                        readOnly
                        className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] px-3.5 text-xs text-[var(--muted)] font-semibold cursor-not-allowed outline-none"
                      />
                      <p className="text-[11px] text-[var(--muted)] mt-1">Computed from check-in and check-out times automatically.</p>
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={modalLoading}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="regularize-form"
                disabled={modalLoading}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {modalLoading ? 'Saving...' : 'Save Regularization'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminAttendanceRegularize;