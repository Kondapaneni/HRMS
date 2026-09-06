import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Search, Calendar, MapPin, CheckCircle, Clock, AlertCircle, X, CalendarCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import EmployeeSelect from '../components/EmployeeSelect';

const AdminAttendanceRegularize = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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
  const { data: employees = [] } = useQuery({
    queryKey: ['admin', 'employees-dropdown-regularize'],
    queryFn: async () => {
      const response = await axios.get('/admin/employees');
      return response.data.employees || [];
    },
  });

  // Attendance calendar query
  const { data: attendanceResponse, isLoading: loading, error } = useQuery({
    queryKey: ['admin', 'attendance-regularize', selectedEmployeeId, selectedMonth],
    queryFn: async () => {
      const response = await axios.get(`/admin/attendance/employee/${selectedEmployeeId}?month=${selectedMonth}`);
      return response.data;
    },
    enabled: !!selectedEmployeeId && !!selectedMonth,
    staleTime: 30 * 1000,
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
        return { bg: 'bg-[#e6f4ea]', border: 'border-[#ceead6]', text: 'text-[#137333]', badge: 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]', label: 'Present' };
      case 'present (late)':
      case 'late-checkin':
        return { bg: 'bg-[#fef7e0]', border: 'border-[#feefc3]', text: 'text-[#b06000]', badge: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]', label: 'Late' };
      case 'present (early)':
      case 'early-checkout':
        return { bg: 'bg-[#fef7e0]', border: 'border-[#feefc3]', text: 'text-[#b06000]', badge: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]', label: 'Early' };
      case 'present (early+late)':
      case 'late-and-early':
        return { bg: 'bg-[#fef7e0]', border: 'border-[#feefc3]', text: 'text-[#b06000]', badge: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]', label: 'Late+Early' };
      case 'present (checkout missing)':
      case 'missing-checkout':
        return { bg: 'bg-[#fef7e0]', border: 'border-[#feefc3]', text: 'text-[#b06000]', badge: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]', label: 'No Checkout' };
      case 'present (late+checkout missing)':
      case 'late-missing-checkout':
        return { bg: 'bg-[#fef7e0]', border: 'border-[#feefc3]', text: 'text-[#b06000]', badge: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]', label: 'Late+No CO' };
      case 'regularized':
        return { bg: 'bg-[#e8f0fe]', border: 'border-[#d2e3fc]', text: 'text-[#1a73e8]', badge: 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]', label: 'Regularized' };
      case 'paid leave':
      case 'unpaid leave':
      case 'sandwich leave':
        let labelStr = computedStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (computedStatus === 'sandwich leave') labelStr = 'Sandwich';
        return { bg: 'bg-[#e8f0fe]', border: 'border-[#d2e3fc]', text: 'text-[#1a73e8]', badge: 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]', label: labelStr };
      case 'holiday':
        return { bg: 'bg-[#f3e8fd]', border: 'border-[#e9d2fd]', text: 'text-[#7627bb]', badge: 'bg-[#f3e8fd] text-[#7627bb] border border-[#e9d2fd]', label: 'Holiday' };
      case 'weekend':
        return { bg: 'bg-[#f3e8fd]', border: 'border-[#e9d2fd]', text: 'text-[#7627bb]', badge: 'bg-[#f3e8fd] text-[#7627bb] border border-[#e9d2fd]', label: 'Week Off' };
      case 'not-marked':
        return { bg: 'bg-[#f8fafd]', border: 'border-[#e0e3e7]', text: 'text-[#5f6368]', badge: 'bg-[#f1f3f4] text-[#5f6368] border border-[#e0e3e7]', label: 'Not Marked' };
      case 'not-joined':
        return { bg: 'bg-white', border: 'border-[#e0e3e7] border-dashed', text: 'text-[#9aa0a6]', badge: 'bg-[#f8fafd] text-[#9aa0a6] border border-dashed border-[#e0e3e7]', label: 'Not Joined' };
      case 'missing':
      default:
        return { bg: 'bg-[#fce8e6]', border: 'border-[#fad2cf]', text: 'text-[#c5221f]', badge: 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]', label: 'Missing' };
      case 'future':
        return { bg: 'bg-white', border: 'border-[#e0e3e7] border-dashed', text: 'text-[#9aa0a6]', badge: 'bg-[#f8fafd] text-[#9aa0a6] border border-dashed border-[#e0e3e7]', label: 'Future' };
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance-regularize'] });
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
    const daysInMonth = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0).getDate();

    const emptyCells = Array.from({ length: firstWeekday }).map((_, i) => (
      <div key={`empty-${i}`} className="min-h-[130px] rounded-xl border border-[#e0e3e7] border-dashed bg-[#f8fafd]/50"></div>
    ));

    const dayCells = attendanceData.map((rec, index) => {
      const dateObj = new Date(rec.date);
      const dayNum = dateObj.getDate();
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const computedStatus = getComputedStatus(rec);
      const palette = getStatusPalette(computedStatus);

      return (
        <div key={`day-${index}`} className={`min-h-[130px] rounded-xl border p-2.5 flex flex-col justify-between ${palette.bg} ${palette.border}`}>
          <div>
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <span className={`text-base font-bold ${palette.text}`}>{dayNum}</span>
                <span className="text-[10px] font-medium text-[#5f6368] ml-1">{dayName}</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap ${palette.badge}`}>
                {palette.label}
              </span>
            </div>

            {rec.status === 'holiday' && (
              <div className="mt-1 text-center text-[10px] font-semibold text-[#b06000]">
                {rec.holidayImage && <img src={rec.holidayImage} alt={rec.holidayName} className="w-8 h-8 object-contain mx-auto mb-0.5 rounded-full shadow-xs bg-white" />}
                {rec.holidayName}
              </div>
            )}

            <div className="mt-1.5 space-y-0.5 text-[11px]">
              {rec.checkIn && (
                <div className="flex items-center text-[#5f6368]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] mr-1"></span>
                  In: <span className="font-semibold ml-0.5 text-[#1f1f1f]">{formatTime(rec.checkIn)}</span>
                </div>
              )}
              {rec.checkOut && (
                <div className="flex items-center text-[#5f6368]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] mr-1"></span>
                  Out: <span className="font-semibold ml-0.5 text-[#1f1f1f]">{formatTime(rec.checkOut)}</span>
                </div>
              )}
              {!rec.checkIn && !rec.checkOut && rec.status === 'missing' && (
                <div className="text-[#c5221f] text-[10px] font-medium flex items-center">
                  <AlertCircle className="w-3 h-3 mr-0.5" /> No record
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 flex gap-1.5">
            {rec.status !== 'future' && (
              <button
                onClick={() => handleOpenModal(rec)}
                className="flex-1 bg-white border border-[#dadce0] text-[#444746] hover:bg-[#f1f3f4] text-[10px] font-semibold py-1 rounded-full transition-colors cursor-pointer"
              >
                Regularize
              </button>
            )}
            {(rec.checkIn || rec.checkOut) && (
              <button
                onClick={() => navigate(`/admin/attendance/location?id=${rec.attendanceRecordId}&date=${rec.date}`, { state: { fromRegularize: true } })}
                className="flex-none px-2 py-1 bg-white border border-[#dadce0] text-[#1a73e8] hover:bg-[#e8f0fe] text-[10px] font-semibold rounded-full transition-colors cursor-pointer"
                title="View Location"
              >
                <MapPin size={12} />
              </button>
            )}
          </div>
        </div>
      );
    });

    return (
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
            <Calendar size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1f1f1f]">Attendance Calendar — {new Date(`${selectedMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <p className="text-[11px] text-[#5f6368]">{employeeDetails ? `${employeeDetails.firstName} ${employeeDetails.lastName}` : 'Employee'} • {employeeDetails?.shiftTime || 'Default Shift'}</p>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider py-1.5">{d}</div>
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
    <div className="space-y-5 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Monthly Attendance Correction</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Attendance <span className="font-medium italic text-[#1a73e8]">Regularization</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Select an employee and month to view and regularize attendance records.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/attendance')}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft size={14} />
          <span>Back to Attendance</span>
        </button>
      </div>

      {/* Filter Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
            <Search size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1f1f1f]">Employee & Period Selection</h3>
            <p className="text-[11px] text-[#5f6368]">Choose an employee and target month</p>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#1f1f1f] mb-1.5">Select Employee</label>
              <EmployeeSelect
                employees={employees}
                selectedId={selectedEmployeeId}
                onChange={(id) => setSelectedEmployeeId(id)}
                placeholder="Search and Select Employee..."
                valueKey="userId"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1f1f1f] mb-1.5">Select Month</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368] pointer-events-none" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-xl border border-[#dadce0] pl-10 pr-4 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-7 h-7 border-3 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium text-[#5f6368]">Loading calendar data...</p>
        </div>
      )}

      {error && (
        <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-xl border border-[#fad2cf] flex items-center text-xs font-medium">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error?.message || 'Failed to fetch attendance data.'}
        </div>
      )}

      {!loading && !error && selectedEmployeeId && attendanceData.length > 0 && (
        <div className="space-y-5">
          {renderCalendar()}
        </div>
      )}

      {/* Regularize Slideover Drawer */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !modalLoading) setIsModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative"
          >
            {/* Top Accent Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] absolute top-0 left-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-[#1a73e8] mb-0.5">
                  <CalendarCheck size={15} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider">Attendance Regularization</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">Regularize Record</h2>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  Date: <strong className="text-[#1f1f1f] font-semibold">{selectedRecord?.date}</strong>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                disabled={modalLoading}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="regularize-form" onSubmit={handleSubmitRegularize} className="space-y-4">
                {modalError && (
                  <div className="p-3 bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs rounded-xl flex items-start font-medium">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer"
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
                        <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Check In Time</label>
                        <input
                          type="time"
                          value={modalCheckIn}
                          onChange={(e) => handleTimeChange('in', e.target.value)}
                          className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer"
                          required
                          disabled={modalLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Check Out Time</label>
                        <input
                          type="time"
                          value={modalCheckOut}
                          onChange={(e) => handleTimeChange('out', e.target.value)}
                          className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer"
                          disabled={modalLoading}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5f6368] mb-1">Working Hours (Auto-Calculated)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={modalHours}
                        readOnly
                        className="w-full rounded-xl border border-[#e0e3e7] bg-[#f8fafd] px-3.5 py-2 text-xs text-[#5f6368] font-semibold cursor-not-allowed outline-none"
                      />
                      <p className="text-[10px] text-[#5f6368] mt-1">Computed from check-in and check-out times automatically.</p>
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold border border-[#dadce0] rounded-full text-[#444746] bg-white hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="regularize-form"
                className="px-6 py-2 text-xs font-semibold rounded-full text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-md shadow-[#4285F4]/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : 'Save Regularization'}
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
