import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  Calendar, 
  Clock, 
  LogIn, 
  LogOut, 
  Search, 
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Filter,
  TrendingUp,
  MapPin,
  Sparkles
} from 'lucide-react';
import api from '../api/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmployeeMobileAttendance from './EmployeeMobileAttendance';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const EmployeeAttendance = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [punchingAction, setPunchingAction] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const isWebAttendanceEnabled = profile?.webAttendanceEnabled == 1 || profile?.webAttendanceEnabled === true || profile?.webAttendanceEnabled === '1' || profile?.webAttendanceEnabled === 'true';

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: history = [],
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ['employee', 'attendance', selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/employee/attendance?month=${selectedMonth}`);
      return res.data;
    },
    staleTime: 30 * 1000
  });

  const { data: leavesData } = useQuery({
    queryKey: ['employee', 'leaves'],
    queryFn: async () => {
      const res = await api.get('/employee/leaves');
      return res.data;
    },
    staleTime: 5 * 60 * 1000
  });

  const leavesHistory = leavesData?.history || [];
  const todayDateStr = new Date().toLocaleDateString('en-CA');
  const isOnLeaveToday = leavesHistory.some(leave => {
    if (leave.status?.toLowerCase() !== 'approved') return false;
    return todayDateStr >= leave.startDate && todayDateStr <= leave.endDate;
  });

  const punchMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/employee/attendance/punch', payload);
    },
    onSuccess: (data, variables) => {
      toast.success(`Successfully ${variables.action.replace('-', ' ')}ed!`);
      queryClient.invalidateQueries({
        queryKey: ['employee', 'attendance']
      });
      const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      if (selectedMonth !== currentMonthStr) {
        setSelectedMonth(currentMonthStr);
      }
    }
  });

  const reverseGeocode = async (lat, lng) => {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const handlePunch = async (action) => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setPunchingAction(action);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const addr = await reverseGeocode(lat, lng);

        try {
          await punchMutation.mutateAsync({
            action,
            latitude: lat,
            longitude: lng,
            address: addr
          });
        } catch (err) {
          console.error(err);
          const errorMsg = err.response?.data?.error || `Failed to ${action}.`;
          setError(errorMsg);
          toast.error(errorMsg);
        } finally {
          setPunchingAction(null);
        }
      },
      (error) => {
        const errorMsg = 'Unable to read your location. Please allow location access to check in/out.';
        setError(errorMsg);
        toast.error(errorMsg);
        setPunchingAction(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  };

  const resolveStatusKey = (record) => {
    if (!record || !record.status) return 'missing';
    const l = record.status.toLowerCase();

    if (l.includes('present')) return l;
    if (l === 'weekend') return 'week-off';
    if (l === 'holiday') return 'holiday';
    return l;
  };

  const formatDateStr = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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

  const todayStr = new Date().toLocaleDateString('en-CA');
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const isViewingCurrentMonth = selectedMonth === currentMonthStr;

  const todayRecord = history.find(r => r.date?.split('T')[0] === todayStr) || history.find(r => r.date && new Date(r.date).toDateString() === new Date().toDateString());

  const checkedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
  const checkOutTime = todayRecord && todayRecord.checkOut;

  const presentCount = history.filter(r => {
    const key = resolveStatusKey(r);
    return key.startsWith('present') || key.includes('missing-checkout');
  }).length;
  const leaveCount = history.filter(r => resolveStatusKey(r).endsWith('leave')).length;
  const paidLeaveCount = history.filter(r => resolveStatusKey(r) === 'paid leave').length;
  const unpaidLeaveCount = history.filter(r => resolveStatusKey(r) === 'unpaid leave').length;

  const statusPalette = {
    'present': { label: 'Present', classes: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' },
    'present (late)': { label: 'Present (Late)', classes: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]' },
    'present (early)': { label: 'Present (Early)', classes: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]' },
    'present (early+late)': { label: 'Present (Early+Late)', classes: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]' },
    'present (checkout missing)': { label: 'Checkout Missing', classes: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]' },
    'present (late+checkout missing)': { label: 'Late + Checkout Missing', classes: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]' },
    'paid leave': { label: 'Paid Leave', classes: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]' },
    'unpaid leave': { label: 'Unpaid Leave', classes: 'bg-[#f3e8fd] text-[#8430ce] border-[#e9d2fd]' },
    'sandwich leave': { label: 'Sandwich Leave', classes: 'bg-[#f3e8fd] text-[#8430ce] border-[#e9d2fd]' },
    'holiday': { label: 'Company Holiday', classes: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]' },
    'week-off': { label: 'Week Off', classes: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' },
    'missing': { label: 'Missing', classes: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]' },
    'regularized': { label: 'Regularized', classes: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' },
    'not-marked': { label: 'Not Marked', classes: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' },
  };

  const displayError = error || (queryError ? 'Failed to load attendance history.' : null);

  if (loading) return <PageLoader message="Loading Attendance History..." />;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileAttendance />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Attendance &amp; Work Hours</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Attendance Records <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{filteredHistory.length} Days Logged</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Daily biometric punch verification, monthly timesheets, and work hour compliance ledger.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto bg-white border border-[#e0e3e7] px-3.5 py-1.5 rounded-full shadow-xs">
            <Clock className="w-4 h-4 text-[#1a73e8]" />
            <div className="text-right">
              <p className="text-xs font-semibold text-[#1f1f1f] leading-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] text-[#5f6368] leading-tight">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {displayError && (
          <div className="rounded-2xl border border-[#fad2cf] bg-[#fce8e6] p-4 text-xs font-medium text-[#c5221f] flex items-center gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {isOnLeaveToday && (
          <div className="rounded-2xl border border-[#d2e3fc] bg-[#e8f0fe] p-4 text-xs font-semibold text-[#1a73e8] flex items-center gap-2.5 shadow-2xs">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>You have an approved leave scheduled for today. Automated attendance recording is paused.</span>
          </div>
        )}

        {/* Check-in / Check-out Terminal Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e7]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#1f1f1f]">Today's Biometric Punch Terminal</h2>
                <p className="text-xs text-[#5f6368]">{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>

            {todayRecord?.checkIn && (
              <span className="text-[11px] font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-3 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Checked In Today
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
            <div className="space-y-1.5 text-center sm:text-left shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] whitespace-nowrap block">Today's Timestamp Record</span>
              {todayRecord?.checkIn ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-[#1f1f1f] whitespace-nowrap">
                    <span className="text-[#5f6368] whitespace-nowrap">Check-in Time:</span>
                    <span className="font-semibold text-[#1f1f1f] bg-white px-3 py-0.5 rounded-full border border-[#e0e3e7] whitespace-nowrap shrink-0 shadow-2xs">
                      {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  {todayRecord?.checkOut && (
                    <div className="flex items-center gap-2 text-[#1f1f1f] whitespace-nowrap">
                      <span className="text-[#5f6368] whitespace-nowrap">Check-out Time:</span>
                      <span className="font-semibold text-[#1f1f1f] bg-white px-3 py-0.5 rounded-full border border-[#e0e3e7] whitespace-nowrap shrink-0 shadow-2xs">
                        {new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs font-semibold text-[#b06000] bg-[#fef7e0] border border-[#feefc3] px-3 py-1 rounded-full inline-block whitespace-nowrap">
                  No punch recorded today
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2.5">
              {!isWebAttendanceEnabled ? (
                <div className="flex items-center gap-2 p-3 bg-[#fce8e6] text-[#c5221f] rounded-2xl border border-[#fad2cf] text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Web Attendance is disabled for your account. Please use the mobile app.</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePunch('check-in')}
                    disabled={!isViewingCurrentMonth || punchingAction || checkedIn || checkOutTime || isOnLeaveToday}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{punchingAction === 'check-in' ? 'Checking In...' : 'Check In'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePunch('punch')}
                    disabled={!isViewingCurrentMonth || punchingAction || !checkedIn || checkOutTime || isOnLeaveToday}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#1f1f1f] disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                  >
                    <Clock className="w-4 h-4 text-[#5f6368]" />
                    <span>{punchingAction === 'punch' ? 'Punching...' : 'Interval Punch'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePunch('check-out')}
                    disabled={!isViewingCurrentMonth || punchingAction || !checkedIn || checkOutTime || isOnLeaveToday}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#d93025] hover:border-[#fad2cf] hover:bg-[#fce8e6] disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{punchingAction === 'check-out' ? 'Checking Out...' : 'Check Out'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Summary KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Present Days" 
            value={`${presentCount} Days`} 
            subtitle="Marked present this month" 
            icon={CheckCircle2} 
            colorTheme="green" 
          />
          <StatCard 
            title="On Leave" 
            value={`${leaveCount} Days`} 
            subtitle="Total leave requests taken" 
            icon={Calendar} 
            colorTheme="purple" 
          />
          <StatCard 
            title="Paid Leave Days" 
            value={`${paidLeaveCount} Days`} 
            subtitle="Approved paid time off" 
            icon={CalendarDays} 
            colorTheme="blue" 
          />
          <StatCard 
            title="Unpaid Leaves" 
            value={`${unpaidLeaveCount} Days`} 
            subtitle="Unpaid loss of pay days" 
            icon={Clock} 
            colorTheme="amber" 
          />
        </div>

        {/* Attendance History Table Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#e0e3e7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#1f1f1f]">Monthly Attendance Ledger</h3>
              <p className="text-xs text-[#5f6368]">Review daily work hours, check-in timestamps, and punch exceptions</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 rounded-full border border-[#dadce0] px-3.5 text-xs text-[#1f1f1f] bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all cursor-pointer shadow-2xs"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-full border border-[#dadce0] px-3.5 text-xs text-[#1f1f1f] bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all cursor-pointer shadow-2xs"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="paid leave">Paid Leave</option>
                <option value="unpaid leave">Unpaid Leave</option>
                <option value="sandwich leave">Sandwich Leave</option>
                <option value="missed">Missing</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Calendar Date</th>
                  <th className="p-4">Check-In Time</th>
                  <th className="p-4">Check-Out Time</th>
                  <th className="p-4">Total Work Hours</th>
                  <th className="p-4">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-[#5f6368]">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-[#5f6368]">
                      No attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((record, i) => {
                    const statusKey = resolveStatusKey(record);
                    const config = statusPalette[statusKey] || statusPalette['missing'];
                    return (
                      <tr key={i} className="hover:bg-[#f8fafd] transition-colors">
                        <td className="p-4 font-semibold text-[#1f1f1f]">
                          {formatDateStr(record.date)}
                        </td>
                        <td className="p-4 text-[#1f1f1f] font-semibold">
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-4 text-[#1f1f1f] font-semibold">
                          {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-4 text-[#5f6368]">
                          {record.hours ? `${record.hours} hrs` : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.classes}`}>
                            {config.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
};

export default EmployeeAttendance;
