import { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  Calendar, 
  Clock, 
  LogIn, 
  LogOut, 
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Loader2
} from 'lucide-react';
import api from '../api/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import EmployeeMobileAttendance from './EmployeeMobileAttendance';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

const EmployeeAttendance = () => {
  const { profile } = useAuth();
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
    isFetching,
    error: queryError
  } = useQuery({
    queryKey: ['employee', 'attendance', selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/employee/attendance?month=${selectedMonth}`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
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
      () => {
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

  const renderAttendanceStatusBadge = (record) => {
    const statusKey = resolveStatusKey(record);
    if (statusKey === 'present') return <StatusBadge variant="success">Present</StatusBadge>;
    if (statusKey.includes('present')) return <StatusBadge variant="warning">{record.status || 'Present'}</StatusBadge>;
    if (statusKey === 'paid leave') return <StatusBadge variant="info">Paid leave</StatusBadge>;
    if (statusKey === 'unpaid leave' || statusKey === 'sandwich leave') return <StatusBadge variant="warning">{statusKey === 'sandwich leave' ? 'Sandwich leave' : 'Unpaid leave'}</StatusBadge>;
    if (statusKey === 'holiday') return <StatusBadge variant="info">Holiday</StatusBadge>;
    if (statusKey === 'week-off') return <StatusBadge variant="neutral">Week off</StatusBadge>;
    if (statusKey === 'regularized') return <StatusBadge variant="success">Regularized</StatusBadge>;
    return <StatusBadge variant="danger">{record.status || 'Missing'}</StatusBadge>;
  };

  const displayError = error || (queryError ? 'Failed to load attendance history.' : null);

  if (loading && !history.length) {
    return <PageLoader message="Loading attendance history..." />;
  }

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileAttendance />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Attendance & work hours</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>Daily attendance</span>
              <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                {filteredHistory.length} Days logged
              </span>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Daily biometric punch verification, monthly timesheets, and work hour compliance ledger.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto bg-[var(--surface)] px-4 py-2 rounded-full">
            <Clock className="w-4 h-4 text-[var(--brand-deep)]" />
            <div className="text-right">
              <p className="text-[13px] font-medium text-[var(--text)] leading-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[11px] text-[var(--muted)] leading-tight">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {displayError && (
          <div className="rounded-[16px] bg-[var(--danger-bg)] p-4 text-[13px] font-medium text-[var(--danger-text)] flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {isOnLeaveToday && (
          <div className="rounded-[16px] bg-[var(--brand-tint)] p-4 text-[13px] font-medium text-[var(--brand-deep)] flex items-center gap-2.5">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>You have an approved leave scheduled for today. Automated attendance recording is paused.</span>
          </div>
        )}

        {/* Check-in / Check-out Terminal Card */}
        <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-medium text-[var(--text)]">Today's biometric punch terminal</h2>
                <p className="text-[12px] text-[var(--muted)]">{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>

            {todayRecord?.checkIn && (
              <StatusBadge variant="success">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Checked in today
              </StatusBadge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-[20px] bg-[var(--surface-alt)]">
            <div className="space-y-1.5 text-center sm:text-left shrink-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)] whitespace-nowrap block">Today's timestamp record</span>
              {todayRecord?.checkIn ? (
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-2 text-[var(--text)] whitespace-nowrap">
                    <span className="text-[var(--muted)] whitespace-nowrap">Check-in time:</span>
                    <span className="font-medium text-[var(--text)] bg-[var(--surface)] px-2.5 py-0.5 rounded-full">
                      {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  {todayRecord?.checkOut && (
                    <div className="flex items-center gap-2 text-[var(--text)] whitespace-nowrap">
                      <span className="text-[var(--muted)] whitespace-nowrap">Check-out time:</span>
                      <span className="font-medium text-[var(--text)] bg-[var(--surface)] px-2.5 py-0.5 rounded-full">
                        {new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <StatusBadge variant="warning">
                  No punch recorded today
                </StatusBadge>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {!isWebAttendanceEnabled ? (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[14px] text-[12px] font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Web attendance is disabled for your account. Please use the mobile app.</span>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handlePunch('check-in')}
                    disabled={!isViewingCurrentMonth || punchingAction || checkedIn || checkOutTime || isOnLeaveToday}
                  >
                    <LogIn className="w-4 h-4 mr-1.5" />
                    <span>{punchingAction === 'check-in' ? 'Checking in...' : 'Check in'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handlePunch('punch')}
                    disabled={!isViewingCurrentMonth || punchingAction || !checkedIn || checkOutTime || isOnLeaveToday}
                  >
                    <Clock className="w-4 h-4 mr-1.5 text-[var(--muted)]" />
                    <span>{punchingAction === 'punch' ? 'Punching...' : 'Interval punch'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handlePunch('check-out')}
                    disabled={!isViewingCurrentMonth || punchingAction || !checkedIn || checkOutTime || isOnLeaveToday}
                  >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    <span>{punchingAction === 'check-out' ? 'Checking out...' : 'Check out'}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Summary KPI Cards */}
        <div className={`grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 transition-opacity duration-150 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
          <StatCard 
            title="Present days" 
            value={`${presentCount}d`} 
            subtitle="Marked present this month" 
            icon={CheckCircle2} 
          />
          <StatCard 
            title="On leave" 
            value={`${leaveCount}d`} 
            subtitle="Total leave requests taken" 
            icon={Calendar} 
          />
          <StatCard 
            title="Paid leave days" 
            value={`${paidLeaveCount}d`} 
            subtitle="Approved paid time off" 
            icon={CalendarDays} 
          />
          <StatCard 
            title="Unpaid leaves" 
            value={`${unpaidLeaveCount}d`} 
            subtitle="Loss of pay days" 
            icon={Clock} 
          />
        </div>

        {/* Attendance History Table Card */}
        <div className="bg-[var(--surface)] rounded-[24px] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--line)]">
            <div>
              <h3 className="text-[15px] font-medium text-[var(--text)]">Monthly attendance ledger</h3>
              <p className="text-[12px] text-[var(--muted)]">Review daily work hours, check-in timestamps, and punch exceptions</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-10 rounded-[12px] border border-[var(--line)] px-3 text-[13px] text-[var(--text)] bg-[var(--surface-alt)] focus:border-[var(--brand)] focus:outline-none transition-all cursor-pointer"
                />
                {isFetching && (
                  <Loader2 className="w-3.5 h-3.5 text-[var(--brand-deep)] animate-spin ml-2" />
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-[12px] border border-[var(--line)] px-3 text-[13px] text-[var(--text)] bg-[var(--surface-alt)] focus:border-[var(--brand)] focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="present">Present</option>
                <option value="paid leave">Paid leave</option>
                <option value="unpaid leave">Unpaid leave</option>
                <option value="sandwich leave">Sandwich leave</option>
                <option value="missed">Missing</option>
              </select>
            </div>
          </div>

          <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
            <table className="w-full text-[13px] text-left">
              <thead className="bg-[var(--surface-alt)] text-[var(--muted)] font-medium text-[12px]">
                <tr>
                  <th className="p-3.5">Calendar date</th>
                  <th className="p-3.5">Check-in time</th>
                  <th className="p-3.5">Check-out time</th>
                  <th className="p-3.5">Total work hours</th>
                  <th className="p-3.5">Attendance status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {loading && !history.length ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-[var(--muted)]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-deep)]" />
                        <span>Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-[var(--muted)]">
                      No attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((record, i) => {
                    return (
                      <tr key={i} className="hover:bg-[var(--surface-alt)] transition-colors">
                        <td className="p-3.5 font-medium text-[var(--text)]">
                          {formatDateStr(record.date)}
                        </td>
                        <td className="p-3.5 text-[var(--text)] font-medium">
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3.5 text-[var(--text)] font-medium">
                          {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3.5 text-[var(--muted)]">
                          {record.hours ? `${record.hours} hrs` : '—'}
                        </td>
                        <td className="p-3.5">
                          {renderAttendanceStatusBadge(record)}
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
