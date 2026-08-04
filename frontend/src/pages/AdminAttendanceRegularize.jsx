import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Search, Calendar, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import { createPortal } from 'react-dom';
import EmployeeSelect from '../components/EmployeeSelect';

const AdminAttendanceRegularize = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

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

  // Attendance calendar query — conditional on employee + month selection
  const { data: attendanceResponse, isLoading: loading, error } = useQuery({
    queryKey: ['admin', 'attendance-regularize', selectedEmployeeId, selectedMonth],
    queryFn: async () => {
      const response = await axios.get(`/admin/attendance/employee/${selectedEmployeeId}?month=${selectedMonth}`);
      return response.data;
    },
    enabled: !!selectedEmployeeId && !!selectedMonth,
    staleTime: 30 * 1000, // 30 sec — attendance data changes often
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
    
    // If there is no checkIn and no checkOut, return static non-present statuses
    if (!rec.checkIn && !rec.checkOut) {
      if (['paid leave', 'unpaid leave', 'sandwich leave', 'holiday', 'weekend', 'future', 'not-joined', 'not-marked'].includes(status)) {
        return status;
      }
      return 'missing';
    }

    // Has checkIn or checkOut: compute shift status
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
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', label: 'Present' };
      case 'present (late)':
      case 'late-checkin':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: 'Late' };
      case 'present (early)':
      case 'early-checkout':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', label: 'Early' };
      case 'present (early+late)':
      case 'late-and-early':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', label: 'Late+Early' };
      case 'present (checkout missing)':
      case 'missing-checkout':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: 'Checkout Missing' };
      case 'present (late+checkout missing)':
      case 'late-missing-checkout':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: 'Late + Checkout Missing' };
      case 'regularized':
        return { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700', label: 'Regularized' };
      case 'paid leave':
      case 'unpaid leave':
      case 'sandwich leave':
        let labelStr = computedStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (computedStatus === 'sandwich leave') labelStr = 'Sandwich';
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', label: labelStr };
      case 'holiday':
        return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', label: 'Holiday' };
      case 'weekend':
        return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', label: 'Week Off' };
      case 'not-marked':
        return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700 border border-slate-200', label: 'Not Marked' };
      case 'not-joined':
        return { bg: 'bg-white', border: 'border-slate-100 border-dashed', text: 'text-slate-400', badge: 'bg-slate-50 text-slate-400', label: 'Not Joined' };
      case 'missing':
      default:
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border border-red-200', label: 'Missing' };
      case 'future':
        return { bg: 'bg-white', border: 'border-slate-100 border-dashed', text: 'text-slate-400', badge: 'bg-slate-50 text-slate-400', label: 'Future' };
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
    const firstWeekday = firstDate.getDay(); // 0 is Sunday
    const daysInMonth = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0).getDate();

    const emptyCells = Array.from({ length: firstWeekday }).map((_, i) => (
      <div key={`empty-${i}`} className="min-h-[140px] rounded-2xl border border-slate-100 bg-slate-50/50"></div>
    ));

    const dayCells = attendanceData.map((rec, index) => {
      const dateObj = new Date(rec.date);
      const dayNum = dateObj.getDate();
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const computedStatus = getComputedStatus(rec);
      const palette = getStatusPalette(computedStatus);

      return (
        <div key={`day-${index}`} className={`min-h-[140px] rounded-2xl border p-3 flex flex-col justify-between ${palette.bg} ${palette.border} transition-all duration-200 hover:shadow-md`}>
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className={`text-lg font-bold ${palette.text}`}>{dayNum}</span>
                <span className="text-xs font-medium text-slate-500 ml-1">{dayName}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${palette.badge}`}>
                {palette.label}
              </span>
            </div>

            {rec.status === 'holiday' && (
              <div className="mt-2 text-center text-xs font-semibold text-amber-700">
                {rec.holidayImage && <img src={rec.holidayImage} alt={rec.holidayName} className="w-10 h-10 object-contain mx-auto mb-1 rounded-full shadow-sm bg-white" />}
                {rec.holidayName}
              </div>
            )}

            <div className="mt-2 space-y-1 text-sm">
              {rec.checkIn && (
                <div className="flex items-center text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                  In: <span className="font-medium ml-1">{formatTime(rec.checkIn)}</span>
                </div>
              )}
              {rec.checkOut && (
                <div className="flex items-center text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                  Out: <span className="font-medium ml-1">{formatTime(rec.checkOut)}</span>
                </div>
              )}
              {!rec.checkIn && !rec.checkOut && rec.status === 'missing' && (
                <div className="text-red-500 text-xs font-medium flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" /> No record
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {rec.status !== 'future' && (
              <button
                onClick={() => handleOpenModal(rec)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Regularize
              </button>
            )}
            {(rec.checkIn || rec.checkOut) && (
              <button
                onClick={() => navigate(`/admin/attendance/location?id=${rec.attendanceRecordId}&date=${rec.date}`, { state: { fromRegularize: true } })}
                className="flex-none px-2 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                title="View Location"
              >
                <MapPin className="w-4 h-4 mx-auto" />
              </button>
            )}
          </div>
        </div>
      );
    });

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Attendance Calendar - {new Date(`${selectedMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-3 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3">
            {emptyCells}
            {dayCells}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <PageLoader message="Loading Attendance Records..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance Regularization</h1>
          <p className="text-sm text-slate-500 mt-1">Regularize employee attendance for a full month</p>
        </div>
        <div>
          <button
            onClick={() => navigate('/admin/attendance')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-9 px-3 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Attendance
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Employee</label>
            <EmployeeSelect
              employees={employees}
              selectedId={selectedEmployeeId}
              onChange={(id) => setSelectedEmployeeId(id)}
              placeholder="Search and Select Employee..."
              valueKey="userId"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Month</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading calendar data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" /> {error?.message || 'Failed to fetch attendance data.'}
        </div>
      )}

      {!loading && !error && selectedEmployeeId && attendanceData.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderCalendar()}
        </div>
      )}

      {/* Regularize Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !modalLoading && setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Regularize Attendance</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                disabled={modalLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRegularize} className="p-6">
              {modalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="mb-5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-sm font-medium text-slate-700">Date: <span className="font-bold">{selectedRecord?.date}</span></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Check In Time</label>
                        <input
                          type="time"
                          value={modalCheckIn}
                          onChange={(e) => handleTimeChange('in', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                          required
                          disabled={modalLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Check Out Time</label>
                        <input
                          type="time"
                          value={modalCheckOut}
                          onChange={(e) => handleTimeChange('out', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                          disabled={modalLoading}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Working Hours</label>
                      <input
                        type="number"
                        step="0.01"
                        value={modalHours}
                        readOnly
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 cursor-not-allowed text-slate-500 font-medium"
                      />
                      <p className="text-xs text-slate-500 mt-1">Calculated automatically from check-in and check-out time.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : 'Save Regularization'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminAttendanceRegularize;
