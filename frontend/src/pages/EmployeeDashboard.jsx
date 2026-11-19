import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Building, 
  LogIn, 
  LogOut, 
  Clock, 
  CalendarDays, 
  BarChart3, 
  AlertCircle, 
  Coffee,
  Sparkles,
  CheckCircle2,
  Wallet,
  TrendingUp,
  ExternalLink,
  Briefcase,
  ShoppingBag,
  Building2
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EmployeeMobileDashboard from './EmployeeMobileDashboard';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import {
  APPROVED_LEAVE_TOAST_ID,
  APPROVED_LEAVE_TOAST_MESSAGE,
  findTodayAttendanceRecord,
  isEmployeeOnLeaveToday,
} from '../utils/attendanceUtils';

const EmployeeDashboard = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [punchingAction, setPunchingAction] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lockoutSeconds, setLockoutSeconds] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['employee', 'dashboard'],
    queryFn: async () => {
      const [attRes, leavesRes, perfRes, profileRes, payslipsRes, mapsRateRes] = await Promise.all([
        api.get('/employee/attendance').catch(() => ({ data: [] })),
        api.get('/employee/leaves').catch(() => ({ data: null })),
        api.get('/employee/performance').catch(() => ({ data: {} })),
        api.get('/employee/profile').catch(() => ({ data: {} })),
        api.get('/employee/payroll').catch(() => ({ data: { payslips: [] } })),
        api.get('/employee/maps-rate-limit-status').catch(() => ({ data: { locked: false } }))
      ]);
      return {
        attendance: attRes.data,
        leaves: leavesRes.data,
        performance: perfRes.data?.currentMonthSummary || null,
        fullProfile: profileRes.data?.profile || null,
        latestPayslip: payslipsRes.data?.payslips?.[0] || null,
        mapsRateLimit: mapsRateRes.data
      };
    },
    staleTime: 30 * 1000
  });

  const attendance = dashboardData?.attendance || [];
  const leaves = dashboardData?.leaves || null;
  const performance = dashboardData?.performance || null;
  const fullProfile = dashboardData?.fullProfile || profile;
  const latestPayslip = dashboardData?.latestPayslip || null;
  const todayRecord = findTodayAttendanceRecord(attendance);
  const checkedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
  const checkOutTime = todayRecord && todayRecord.checkOut;
  const isOnLeaveToday = isEmployeeOnLeaveToday(leaves?.history || [], todayRecord);

  useEffect(() => {
    if (dashboardData?.mapsRateLimit?.locked && dashboardData.mapsRateLimit.secondsRemaining > 0) {
      setLockoutSeconds(dashboardData.mapsRateLimit.secondsRemaining);
    } else if (dashboardData?.mapsRateLimit && !dashboardData.mapsRateLimit.locked) {
      setLockoutSeconds(null);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (lockoutSeconds !== null && lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev && prev > 1) return prev - 1;
          queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
          return null;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds, queryClient]);

  const isLocked = lockoutSeconds !== null && lockoutSeconds > 0;

  const isWebAttendanceEnabled = fullProfile?.webAttendanceEnabled == 1 || fullProfile?.webAttendanceEnabled === true || fullProfile?.webAttendanceEnabled === '1' || fullProfile?.webAttendanceEnabled === 'true';

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handlePunch = async (action) => {
    if (isOnLeaveToday) {
      toast.error(APPROVED_LEAVE_TOAST_MESSAGE, { id: APPROVED_LEAVE_TOAST_ID });
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setPunchingAction(action);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let isAllowed = true;

        try {
          const geofenceRes = await api.get('/employee/geofences');
          const serverGeoFenceEnabled = geofenceRes.data?.geoFenceEnabled;
          const isGeoFenceEnabled = serverGeoFenceEnabled == 1 || serverGeoFenceEnabled === true || serverGeoFenceEnabled === '1' || serverGeoFenceEnabled === 'true';

          if (isGeoFenceEnabled && action !== 'punch') {
            const geofences = geofenceRes.data?.geofences || [];
            // SEC-014: If no office is configured, fail closed just as the
            // backend does; do not silently allow remote check-in/out.
            {
              let insideAny = false;
              geofences.forEach(gf => {
                const d = getDistanceFromLatLonInMeters(lat, lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                if (d <= parseFloat(gf.radius)) insideAny = true;
              });
              if (!insideAny) isAllowed = false;
            }
          }
        } catch (err) {
          console.error('Failed to validate geofences:', err);
          toast.error('Failed to validate geofence. Please try again.');
          setPunchingAction(null);
          return;
        }

        if (!isAllowed) {
          toast.error(`You are outside company premises. Geofencing is required to ${action.replace('-', ' ')}.`);
          setPunchingAction(null);
          return;
        }

        try {
          const punchRes = await api.post('/employee/attendance/punch', {
            action,
            latitude: lat,
            longitude: lng
          });

          const updatedAtt = punchRes.data?.attendance;
          if (updatedAtt) {
            queryClient.setQueryData(['employee', 'dashboard'], (old) => {
              if (!old) return old;
              const oldAttendance = Array.isArray(old.attendance) ? [...old.attendance] : [];
              const idx = oldAttendance.findIndex(r => r.id === updatedAtt.id || r.date === updatedAtt.date);
              if (idx >= 0) {
                oldAttendance[idx] = updatedAtt;
              } else {
                oldAttendance.unshift(updatedAtt);
              }
              return {
                ...old,
                attendance: oldAttendance
              };
            });
          }

          toast.success(`Successfully ${action.replace('-', ' ')}ed!`);
          queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
        } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.error || `Failed to ${action}.`);
        } finally {
          setPunchingAction(null);
        }
      },
      (error) => {
        toast.error('Unable to read location. Please allow location access in your browser.');
        setPunchingAction(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Stats calculation
  const availablePaidLeaves = leaves?.balance ? Math.max(0, leaves.balance.paidTotal - leaves.balance.paidUsed) : '--';
  const onTimeScore = performance?.onTimePct !== undefined ? `${performance.onTimePct}%` : '100%';

  // Keep the dashboard layout visible during its first data fetch rather than
  // showing a second full-page loading screen after the maintenance status check.
  // Attendance controls stay hidden until their authoritative data is ready.
  if (loading) {
    return (
      <div className="animate-pulse space-y-5 pb-6" role="status" aria-label="Loading employee dashboard data" aria-busy="true">
        <div className="h-8 w-48 max-w-full rounded-xl bg-[var(--surface-alt)]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 rounded-[20px] border border-[var(--line)] bg-[var(--surface-alt)]" />
          ))}
        </div>
        <div className="h-52 rounded-[24px] border border-[var(--line)] bg-[var(--surface-alt)]" />
      </div>
    );
  }

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileDashboard />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Workspace overview</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>{getGreeting()}, <span className="text-[var(--brand-deep)] font-semibold">{profile?.firstName || 'Colleague'}</span>!</span>
              <StatusBadge variant="success">Active staff</StatusBadge>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Daily attendance check-in, shift assignments, performance benchmarks, and leave balances.
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

        {/* KPI Stats Cards */}
        <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Today's status" 
            value={checkedIn ? 'Checked in' : (checkOutTime ? 'Checked out' : 'Not yet')} 
            subtitle={todayRecord?.checkIn ? `Since ${new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting punch'} 
            icon={Clock} 
          />
          <StatCard 
            title="On-time score" 
            value={onTimeScore} 
            subtitle="Current month benchmark" 
            icon={TrendingUp} 
          />
          <StatCard 
            title="Paid leaves" 
            value={`${availablePaidLeaves} Days`} 
            subtitle={`Out of ${leaves?.balance?.paidTotal || 12} annual days`} 
            icon={CalendarDays} 
          />
          <StatCard 
            title="Work location" 
            value={fullProfile?.branch_name || 'Main office'} 
            subtitle={fullProfile?.shiftTime ? `Shift: ${fullProfile.shiftTime}` : 'Standard 09:00 - 18:00'} 
            icon={Building} 
          />
        </div>

        {/* Main Grid: Quick Punch (Left) + Profile & Details (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[14px] items-start">
          
          {/* Left Column: Quick Punch Terminal & Shift Schedule */}
          <div className="lg:col-span-8 space-y-[14px]">
            
            {/* Quick Punch Terminal Card */}
            <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-medium text-[var(--text)]">Daily attendance terminal</h2>
                    <p className="text-[12px] text-[var(--muted)]">Geofenced biometric check-in & work hours logging</p>
                  </div>
                </div>

                {todayRecord?.checkIn && (
                  <StatusBadge variant="success">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Checked in
                  </StatusBadge>
                )}
              </div>

              {/* Punch Status & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-[20px] bg-[var(--surface-alt)]">
                <div className="space-y-1.5 text-center sm:text-left shrink-0">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)] whitespace-nowrap block">Punch status</span>
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

                {/* Rate Limit Lockout Banner */}
                {isLocked && (
                  <div className="w-full rounded-[14px] bg-[var(--warning-bg)] p-3 flex items-center justify-between text-[12px] text-[var(--warning-text)]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--warning-text)] shrink-0 animate-pulse" />
                      <span className="font-medium">
                        Rate limit active: Attendance buttons temporarily locked.
                      </span>
                    </div>
                    <span className="font-medium font-mono bg-[var(--surface)] px-2.5 py-0.5 rounded-full">
                      Unlocks in {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}

                {/* Punch Action Buttons */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                  {!isWebAttendanceEnabled ? (
                    <div className="flex items-center gap-2 p-3 bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[14px] text-[12px] font-medium w-full">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Web attendance is disabled for your profile. Please use the mobile app.</span>
                    </div>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handlePunch('check-in')}
                        disabled={punchingAction || checkedIn || checkOutTime || isLocked}
                      >
                        <LogIn className="w-4 h-4 mr-1.5" />
                        <span>{punchingAction === 'check-in' ? 'Checking in...' : 'Check in'}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handlePunch('punch')}
                        disabled={punchingAction || (!isOnLeaveToday && !checkedIn) || checkOutTime || isLocked}
                        className={isOnLeaveToday && !checkedIn ? 'opacity-50' : ''}
                      >
                        <Clock className="w-4 h-4 mr-1.5 text-[var(--muted)]" />
                        <span>{punchingAction === 'punch' ? 'Punching...' : 'Interval punch'}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handlePunch('check-out')}
                        disabled={punchingAction || (!isOnLeaveToday && !checkedIn) || checkOutTime || isLocked}
                        className={isOnLeaveToday && !checkedIn ? 'opacity-50' : ''}
                      >
                        <LogOut className="w-4 h-4 mr-1.5" />
                        <span>{punchingAction === 'check-out' ? 'Checking out...' : 'Check out'}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Shift & Office Context Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Standard shift</p>
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">{fullProfile?.shiftTime || '09:00 AM - 06:00 PM'}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center shrink-0">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Weekly off</p>
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">{fullProfile?.weekOff || 'Sunday'}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-[var(--success-bg)] text-[var(--success-text)] flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Assigned branch</p>
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">{fullProfile?.branch_name || 'Corporate HQ'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance & Leave Balances Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
              
              {/* Performance Card */}
              <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--line)]">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-[var(--text)]">Monthly performance</h3>
                    <p className="text-[12px] text-[var(--muted)]">Attendance discipline & punctuality</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] space-y-1">
                    <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Attendance rate</p>
                    <p className="text-[20px] font-medium text-[var(--text)]">{performance?.attendancePct !== undefined ? `${performance.attendancePct}%` : '100%'}</p>
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] space-y-1">
                    <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Punctuality score</p>
                    <p className="text-[20px] font-medium text-[var(--success-text)]">{onTimeScore}</p>
                  </div>
                </div>

                <div className="p-3 rounded-[14px] bg-[var(--brand-tint)] text-[12px] text-[var(--text-2)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--brand-deep)] shrink-0" />
                  <span>Maintain scores &gt;90% for monthly performance recognition.</span>
                </div>
              </div>

              {/* Leave Balances Card */}
              <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--line)]">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--success-bg)] text-[var(--success-text)] flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-[var(--text)]">Leave balances</h3>
                    <p className="text-[12px] text-[var(--muted)]">Annual quota and taken leave ledger</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-[13px]">
                  <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-[var(--surface-alt)]">
                    <div>
                      <p className="font-medium text-[var(--text)]">Paid leaves (Annual)</p>
                      <p className="text-[11px] text-[var(--muted)]">Available balance</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-medium text-[var(--text)]">{availablePaidLeaves}</p>
                      <p className="text-[11px] text-[var(--muted)]">of {leaves?.balance?.paidTotal || 12} total</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-[var(--surface-alt)]">
                    <div>
                      <p className="font-medium text-[var(--text)]">Unpaid leaves</p>
                      <p className="text-[11px] text-[var(--muted)]">Logged this year</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-medium text-[var(--muted)]">{leaves?.balance?.unpaidUsed || 0}</p>
                      <p className="text-[11px] text-[var(--muted)]">Days</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Employee Profile Summary & Quick Actions */}
          <div className="lg:col-span-4 space-y-[14px]">
            
            {/* Profile Identity Card */}
            <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-semibold text-[20px] overflow-hidden shrink-0">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.firstName || profile?.email || 'E').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="truncate">
                  <h3 className="text-[16px] font-medium text-[var(--text)] truncate">
                    {profile?.firstName} {profile?.lastName}
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] capitalize mt-0.5">
                    {profile?.designation || profile?.role || 'Staff member'}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[6px]">
                    {profile?.department || 'General staff'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[var(--line)] text-[13px]">
                <div className="flex justify-between py-1 border-b border-[var(--line)]/50">
                  <span className="text-[var(--muted)]">Email</span>
                  <span className="font-medium text-[var(--text)] truncate max-w-[170px]" title={profile?.email}>
                    {profile?.email}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line)]/50">
                  <span className="text-[var(--muted)]">Employee ID</span>
                  <span className="font-medium text-[var(--text)]">
                    {fullProfile?.employeeId || profile?.employeeId || fullProfile?.employee_code || (fullProfile?.id ? `EMP-${fullProfile.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : 'EMP-001')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line)]/50">
                  <span className="text-[var(--muted)]">Joining date</span>
                  <span className="font-medium text-[var(--text)]">
                    {(fullProfile?.joinDate || fullProfile?.joiningDate) ? new Date(fullProfile.joinDate || fullProfile.joiningDate).toLocaleDateString() : 'Active staff'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--muted)]">Employment type</span>
                  <span className="font-medium text-[var(--success-text)] capitalize">
                    {fullProfile?.employmentType || 'Full-time regular'}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <Link to="/employee/profile">
                  <Button variant="secondary" className="w-full">
                    <User className="w-3.5 h-3.5 mr-1" />
                    <span>View full profile</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Business Applications Card */}
            {(profile?.featureAccess?.canLoanOrigination || profile?.featureAccess?.canSalesOrigination || profile?.featureAccess?.canBranchOperations) && (
              <div className="bg-[var(--surface)] rounded-[24px] p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-medium text-[var(--text)]">Business Applications</h4>
                      <p className="text-[11px] text-[var(--muted)]">Authorized workspace tools</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {profile?.featureAccess?.canLoanOrigination && (
                    <Link
                      to="/employee/loans/origination"
                      className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--brand-tint)] transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] flex items-center justify-center border border-[var(--line)]">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[var(--text)] group-hover:text-[var(--brand-deep)] transition-colors">
                            Loans Origination
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">Loan pipeline & borrower KYC</p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--brand-deep)] transition-colors" />
                    </Link>
                  )}

                  {profile?.featureAccess?.canSalesOrigination && (
                    <Link
                      to="/employee/sales/origination"
                      className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--accent-pink-tint)] transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] text-[var(--accent-pink-deep)] flex items-center justify-center border border-[var(--line)]">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[var(--text)] group-hover:text-[var(--accent-pink-deep)] transition-colors">
                            Sales Origination
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">Sales pipeline & lead records</p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent-pink-deep)] transition-colors" />
                    </Link>
                  )}

                  {profile?.featureAccess?.canBranchOperations && (
                    <Link
                      to="/employee/branch-operations"
                      className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--branch-tint)] transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] text-[var(--branch-deep,#0D9488)] flex items-center justify-center border border-[var(--line)]">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[var(--text)] group-hover:text-[var(--branch-deep,#0D9488)] transition-colors">
                            Branch Operations
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">Branch desk, leads & applications</p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--branch-deep,#0D9488)] transition-colors" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Latest Payslip Quick Banner */}
            {latestPayslip && (
              <div className="bg-[var(--surface)] rounded-[24px] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--success-bg)] text-[var(--success-text)] flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-medium text-[var(--text)]">Latest payslip</h4>
                      <p className="text-[11px] text-[var(--muted)]">
                        {latestPayslip.month && latestPayslip.year
                          ? new Date(latestPayslip.year, latestPayslip.month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                          : latestPayslip.month_year || 'Recent cycle'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge variant="success">
                    ₹{Number(latestPayslip.netSalary ?? latestPayslip.net_salary ?? 0).toLocaleString('en-IN')}
                  </StatusBadge>
                </div>

                <Link
                  to="/employee/payroll"
                  className="w-full flex items-center justify-center gap-1 py-1 text-[12px] font-medium text-[var(--brand-deep)] hover:underline"
                >
                  <span>View payslip breakdown</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Link>
              </div>
            )}

          </div>

        </div>

      </div>
    </>
  );
};

export default EmployeeDashboard;
