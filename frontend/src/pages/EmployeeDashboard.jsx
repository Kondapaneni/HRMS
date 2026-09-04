import React, { useState, useEffect, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Building, 
  Calendar, 
  Mail, 
  Briefcase, 
  LogIn, 
  LogOut, 
  Clock, 
  CalendarDays, 
  BarChart3, 
  AlertCircle, 
  Loader2, 
  Coffee,
  Sparkles,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Award,
  Wallet,
  TrendingUp,
  ExternalLink,
  Smartphone,
  Download
} from 'lucide-react';
import api, { isNativeApp } from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EmployeeMobileDashboard from './EmployeeMobileDashboard';

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
  const formatLockoutTimer = (seconds) => {
    if (!seconds || seconds <= 0) return 'Locked';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `Locked (${m}m ${String(s).padStart(2, '0')}s)`;
  };

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
            if (geofences.length > 0) {
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
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayRecord = attendance.find(r => r.date?.split('T')[0] === todayStr) || attendance.find(r => r.date && new Date(r.date).toDateString() === new Date().toDateString());
  const checkedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
  const checkOutTime = todayRecord && todayRecord.checkOut;

  // Stats calculation
  const availablePaidLeaves = leaves?.balance ? Math.max(0, leaves.balance.paidTotal - leaves.balance.paidUsed) : '--';
  const attendanceScore = performance?.attendancePct !== undefined ? `${performance.attendancePct}%` : '100%';
  const onTimeScore = performance?.onTimePct !== undefined ? `${performance.onTimePct}%` : '100%';

  if (loading) return <PageLoader message="Loading Workspace..." />;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileDashboard />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Workspace Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              {getGreeting()}, {profile?.firstName || 'Colleague'}! <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">Active Staff</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Daily attendance check-in, shift assignments, performance benchmarks, and leave balances.
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

        {/* KPI Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Today's Status" 
            value={checkedIn ? 'Checked In' : (checkOutTime ? 'Checked Out' : 'Not Checked In')} 
            subtitle={todayRecord?.checkIn ? `Since ${new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting punch'} 
            icon={Clock} 
            colorTheme={checkedIn ? 'green' : 'blue'} 
          />
          <StatCard 
            title="On-Time Score" 
            value={onTimeScore} 
            subtitle="Current month benchmark" 
            icon={TrendingUp} 
            colorTheme="purple" 
          />
          <StatCard 
            title="Paid Leaves" 
            value={`${availablePaidLeaves} Days`} 
            subtitle={`Out of ${leaves?.balance?.paidTotal || 12} annual days`} 
            icon={CalendarDays} 
            colorTheme="amber" 
          />
          <StatCard 
            title="Work Location" 
            value={fullProfile?.branch_name || 'Main Office'} 
            subtitle={fullProfile?.shiftTime ? `Shift: ${fullProfile.shiftTime}` : 'Standard 09:00 - 18:00'} 
            icon={Building} 
            colorTheme="green" 
          />
        </div>

        {/* Main Grid: Quick Punch (Left) + Profile & Details (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Quick Punch Terminal & Shift Schedule */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Quick Punch Terminal Card */}
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e7]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#1f1f1f]">Daily Attendance Terminal</h2>
                    <p className="text-xs text-[#5f6368]">Geofenced biometric check-in &amp; work hours logging</p>
                  </div>
                </div>

                {todayRecord?.checkIn && (
                  <span className="text-[11px] font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-3 py-1 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                  </span>
                )}
              </div>

              {/* Punch Status & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                <div className="space-y-1.5 text-center sm:text-left shrink-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5f6368] whitespace-nowrap block">Punch Status</span>
                  {todayRecord?.checkIn ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-[#1f1f1f] whitespace-nowrap">
                        <span className="text-[#5f6368] whitespace-nowrap">Check-in Time:</span>
                        <span className="font-semibold text-[#1f1f1f] bg-white px-2.5 py-0.5 rounded-lg border border-[#e0e3e7] whitespace-nowrap shrink-0 shadow-2xs">
                          {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      {todayRecord?.checkOut && (
                        <div className="flex items-center gap-2 text-[#1f1f1f] whitespace-nowrap">
                          <span className="text-[#5f6368] whitespace-nowrap">Check-out Time:</span>
                          <span className="font-semibold text-[#1f1f1f] bg-white px-2.5 py-0.5 rounded-lg border border-[#e0e3e7] whitespace-nowrap shrink-0 shadow-2xs">
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

                {/* Rate Limit Lockout Banner */}
                {isLocked && (
                  <div className="w-full rounded-2xl bg-[#fef7e0] border border-[#feefc3] p-3.5 flex items-center justify-between text-xs text-[#b06000] shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#b06000] shrink-0 animate-pulse" />
                      <span className="font-semibold">
                        Rate limit active: Multiple punches detected. Attendance buttons are temporarily locked.
                      </span>
                    </div>
                    <span className="font-semibold font-mono bg-white px-3 py-1 rounded-full border border-[#feefc3] text-[#b06000] shadow-2xs shrink-0">
                      Unlocks in {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}

                {/* Punch Action Buttons */}
                <div className="flex flex-wrap gap-2.5 justify-center sm:justify-end">
                  {!isWebAttendanceEnabled ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-[#fce8e6] text-[#c5221f] rounded-2xl border border-[#fad2cf] text-xs font-semibold w-full">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Web Attendance is disabled for your profile. Please use the mobile app.</span>
                      </div>
                      {!isNativeApp && (
                        <a
                          href="/downloads/Acme%20HRMS.apk"
                          download="Acme HRMS.apk"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#c5221f] hover:bg-[#a51d24] text-white text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Acme HRMS.apk</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePunch('check-in')}
                        disabled={punchingAction || checkedIn || checkOutTime || isLocked}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{punchingAction === 'check-in' ? 'Checking In...' : 'Check In'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePunch('punch')}
                        disabled={punchingAction || !checkedIn || checkOutTime || isLocked}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#1f1f1f] disabled:opacity-40 transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
                      >
                        <Clock className="w-4 h-4 text-[#5f6368]" />
                        <span>{punchingAction === 'punch' ? 'Punching...' : 'Interval Punch'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePunch('check-out')}
                        disabled={punchingAction || !checkedIn || checkOutTime || isLocked}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#d93025] hover:border-[#fad2cf] hover:bg-[#fce8e6] disabled:opacity-40 transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{punchingAction === 'check-out' ? 'Checking Out...' : 'Check Out'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Shift & Office Context Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Standard Shift</p>
                    <p className="text-xs font-bold text-[#1f1f1f] truncate">{fullProfile?.shiftTime || '09:00 AM - 06:00 PM'}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#f3e8fd] text-[#8430ce]">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Weekly Off</p>
                    <p className="text-xs font-bold text-[#1f1f1f] truncate">{fullProfile?.weekOff || 'Sunday'}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Assigned Branch</p>
                    <p className="text-xs font-bold text-[#1f1f1f] truncate">{fullProfile?.branch_name || 'Corporate HQ'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance & Leave Balances Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Performance Card */}
              <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#e0e3e7]">
                  <div className="p-2 rounded-xl bg-[#f3e8fd] text-[#8430ce]">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1f1f1f]">Monthly Performance</h3>
                    <p className="text-xs text-[#5f6368]">Attendance discipline &amp; punctuality</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#f8fafd] border border-[#e0e3e7] space-y-1">
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Attendance Rate</p>
                    <p className="text-xl font-bold text-[#1f1f1f]">{attendanceScore}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#f8fafd] border border-[#e0e3e7] space-y-1">
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Punctuality Score</p>
                    <p className="text-xl font-bold text-[#137333]">{onTimeScore}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#f8fafd] border border-[#e0e3e7] text-xs text-[#5f6368] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8430ce] shrink-0" />
                  <span>Maintain scores &gt;90% for monthly performance rewards.</span>
                </div>
              </div>

              {/* Leave Balances Card */}
              <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#e0e3e7]">
                  <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1f1f1f]">Leave Balances</h3>
                    <p className="text-xs text-[#5f6368]">Annual quota and taken leave ledger</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafd] border border-[#e0e3e7]">
                    <div>
                      <p className="font-semibold text-[#1f1f1f]">Paid Leaves (Annual)</p>
                      <p className="text-[10px] text-[#5f6368]">Available balance</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1f1f1f]">{availablePaidLeaves}</p>
                      <p className="text-[10px] text-[#5f6368]">of {leaves?.balance?.paidTotal || 12} Total</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafd] border border-[#e0e3e7]">
                    <div>
                      <p className="font-semibold text-[#1f1f1f]">Unpaid Leaves</p>
                      <p className="text-[10px] text-[#5f6368]">Logged this calendar year</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#5f6368]">{leaves?.balance?.unpaidUsed || 0}</p>
                      <p className="text-[10px] text-[#5f6368]">Days</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Employee Profile Summary & Quick Actions */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Profile Identity Card */}
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-bold text-2xl overflow-hidden border border-[#d2e3fc] shrink-0 shadow-xs">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.firstName || profile?.email || 'E').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="truncate">
                  <h3 className="text-base font-semibold text-[#1f1f1f] truncate">
                    {profile?.firstName} {profile?.lastName}
                  </h3>
                  <p className="text-xs text-[#5f6368] font-medium capitalize mt-0.5">
                    {profile?.designation || profile?.role || 'Staff Member'}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.2 rounded-full">
                    {profile?.department || 'General Staff'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#e0e3e7] text-xs">
                <div className="flex justify-between py-1 border-b border-[#f1f3f4]">
                  <span className="text-[#5f6368]">Email</span>
                  <span className="font-semibold text-[#1f1f1f] truncate max-w-[170px]" title={profile?.email}>
                    {profile?.email}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f1f3f4]">
                  <span className="text-[#5f6368]">Employee ID</span>
                  <span className="font-semibold text-[#1f1f1f]">
                    {fullProfile?.employeeId || profile?.employeeId || fullProfile?.employee_code || (fullProfile?.id ? `EMP-${fullProfile.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : 'EMP-001')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#f1f3f4]">
                  <span className="text-[#5f6368]">Joining Date</span>
                  <span className="font-semibold text-[#1f1f1f]">
                    {(fullProfile?.joinDate || fullProfile?.joiningDate) ? new Date(fullProfile.joinDate || fullProfile.joiningDate).toLocaleDateString() : 'Active Staff'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5f6368]">Employment Type</span>
                  <span className="font-semibold text-[#137333] capitalize">
                    {fullProfile?.employmentType || 'Full-Time Regular'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/employee/profile"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View Full Profile</span>
                </Link>
              </div>
            </div>

            {/* Mobile App Download Card (Web Only) */}
            {!isNativeApp && (
              <div className="bg-gradient-to-br from-[#1a73e8]/5 via-white to-[#4285F4]/10 rounded-2xl border border-[#d2e3fc] p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Acme HRMS Mobile App</h4>
                    <p className="text-[11px] text-[#5f6368]">Download Android APK for mobile punch &amp; location tracking</p>
                  </div>
                </div>
                <a
                  href="/downloads/Acme%20HRMS.apk"
                  download="Acme HRMS.apk"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Acme HRMS.apk</span>
                </a>
              </div>
            )}

            {/* Latest Payslip Quick Banner */}
            {latestPayslip && (
              <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Latest Payslip</h4>
                      <p className="text-[11px] text-[#5f6368]">
                        {latestPayslip.month && latestPayslip.year
                          ? new Date(latestPayslip.year, latestPayslip.month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                          : latestPayslip.month_year || 'Recent Cycle'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#137333] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#ceead6]">
                    ₹{Number(latestPayslip.netSalary ?? latestPayslip.net_salary ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <Link
                  to="/employee/payroll"
                  className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold text-[#1a73e8] hover:underline"
                >
                  <span>View Payslip Breakdown</span>
                  <ExternalLink className="w-3 h-3" />
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
