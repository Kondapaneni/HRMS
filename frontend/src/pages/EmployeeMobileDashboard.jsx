import React, { useState, useEffect, useRef, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  LogIn, 
  LogOut, 
  Clock, 
  Calendar, 
  Shield, 
  ChevronRight, 
  Briefcase, 
  Play, 
  Building2, 
  ShoppingBag,
  Cake,
  Search,
  X,
  Wallet,
  Award,
  Sparkles,
  MapPin,
  User
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import EmployeeMobileSearchBar from '../components/EmployeeMobileSearchBar';

const EmployeeMobileDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lockoutSeconds, setLockoutSeconds] = useState(null);
  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: trainingVideos = [] } = useQuery({
    queryKey: ['employee', 'trainingVideos'],
    queryFn: async () => {
      try {
        const res = await api.get('/employee/training/videos');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 60000,
  });

  const hasTrainingVideos = Array.isArray(trainingVideos) && trainingVideos.length > 0;



  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['employee', 'dashboard'],
    queryFn: async () => {
      const [attRes, leavesRes, perfRes, profileRes, payslipsRes, mapsRateRes, holidaysRes, expensesRes, birthdaysRes] = await Promise.all([
        api.get('/employee/attendance').catch(() => ({ data: [] })),
        api.get('/employee/leaves').catch(() => ({ data: null })),
        api.get('/employee/performance').catch(() => ({ data: {} })),
        api.get('/employee/profile').catch(() => ({ data: {} })),
        api.get('/employee/payroll').catch(() => ({ data: { payslips: [] } })),
        api.get('/employee/maps-rate-limit-status').catch(() => ({ data: { locked: false } })),
        api.get('/employee/holidays').catch(() => ({ data: [] })),
        api.get('/employee/expenses').catch(() => ({ data: { expenses: [] } })),
        api.get('/employee/birthdays').catch(() => ({ data: { birthdays: [] } }))
      ]);
      return {
        attendance: attRes.data,
        leaves: leavesRes.data,
        performance: perfRes.data?.currentMonthSummary || null,
        fullProfile: profileRes.data?.profile || null,
        latestPayslip: payslipsRes.data?.payslips?.[0] || null,
        mapsRateLimit: mapsRateRes.data,
        holidays: holidaysRes.data || [],
        expenses: expensesRes.data?.expenses || [],
        birthdays: birthdaysRes.data?.birthdays || []
      };
    },
    staleTime: 30 * 1000
  });

  // Dedicated query to poll rate-limit status dynamically
  const { data: rateLimitStatus } = useQuery({
    queryKey: ['employee', 'mapsRateLimit'],
    queryFn: async () => {
      try {
        const res = await api.get('/employee/maps-rate-limit-status');
        return res.data;
      } catch (e) {
        return { locked: false, secondsRemaining: null };
      }
    },
    refetchInterval: lockoutSeconds ? 5000 : 30000,
    staleTime: 4000,
  });

  const attendance = dashboardData?.attendance || [];
  const leaves = dashboardData?.leaves || null;
  const fullProfile = dashboardData?.fullProfile || profile;
  const holidays = dashboardData?.holidays || [];
  const expenses = dashboardData?.expenses || [];
  const birthdays = dashboardData?.birthdays || [];
  const latestPayslip = dashboardData?.latestPayslip || null;

  const upcomingBirthdays = birthdays.slice(0, 3);

  useEffect(() => {
    const status = rateLimitStatus || dashboardData?.mapsRateLimit;
    if (status?.locked && status.secondsRemaining > 0) {
      setLockoutSeconds(status.secondsRemaining);
    } else if (status && !status.locked) {
      setLockoutSeconds(null);
    }
  }, [rateLimitStatus, dashboardData]);

  useEffect(() => {
    if (lockoutSeconds !== null && lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev && prev > 1) return prev - 1;
          // When timer expires, immediately invalidate queries to unblock buttons
          queryClient.invalidateQueries({ queryKey: ['employee', 'mapsRateLimit'] });
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

  const leavesHistory = leaves?.history || [];
  const isOnLeaveToday = leavesHistory.some(leave => {
    if (leave.status?.toLowerCase() !== 'approved') return false;
    return todayStr >= leave.startDate && todayStr <= leave.endDate;
  });

  const handlePunch = async (action) => {
    navigate('/employee/attendance/map', { state: { action } });
  };

  // Calculate live seconds
  useEffect(() => {
    if (!todayRecord?.checkIn) {
      setLiveSeconds(0);
      return;
    }

    const inTime = new Date(todayRecord.checkIn).getTime();

    if (todayRecord.checkOut) {
      const outTime = new Date(todayRecord.checkOut).getTime();
      setLiveSeconds(Math.max(0, Math.floor((outTime - inTime) / 1000)));
      return;
    }

    // Calculate initial value immediately so it doesn't show 00:00:00 for 1 second
    const now = new Date().getTime();
    setLiveSeconds(Math.max(0, Math.floor((now - inTime) / 1000)));

    // Live timer
    const interval = setInterval(() => {
      const currentNow = new Date().getTime();
      setLiveSeconds(Math.max(0, Math.floor((currentNow - inTime) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [todayRecord]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} hrs`;
  };

  const getAttendanceBadge = (status) => {
    if (!status) return { label: 'Not Yet!', className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
    const s = String(status).toLowerCase().trim();
    const capitalize = (str) => String(str).replace(/\b\w/g, c => c.toUpperCase());

    if (s === 'present') {
      return { label: 'Present', className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20' };
    }
    if (s.includes('late') || s.includes('checkout missing')) {
      return { 
        label: s.includes('checkout missing') ? 'Checkout Missing' : 'Present (Late)', 
        className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20' 
      };
    }
    if (s.includes('early')) {
      return { label: 'Present (Early)', className: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20' };
    }
    if (s.includes('leave') || s === 'on leave') {
      return { label: capitalize(status), className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-text)]/20' };
    }
    if (s.includes('half')) {
      return { label: 'Half Day', className: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink-deep)]/20' };
    }
    if (s === 'missed') {
      return { label: 'Missed', className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
    }
    if (s === 'absent' || s === 'missing') {
      return { label: 'Absent', className: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-text)]/20' };
    }
    if (s === 'regularized') {
      return { label: 'Regularized', className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20' };
    }
    if (s === 'holiday') {
      return { label: 'Holiday', className: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-text)]/20' };
    }
    if (s.includes('weekend') || s.includes('week off')) {
      return { label: capitalize(status), className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
    }
    return { label: capitalize(status), className: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]' };
  };

  const isActiveSession = checkedIn && !checkOutTime;
  const heroSubtitle = [fullProfile?.position, fullProfile?.department].filter(Boolean).join(' · ') || 'Employee';
  const attendanceBadge = getAttendanceBadge(todayRecord?.status);

  if (loading) return <PageLoader message="Loading Dashboard..." />;

  return (
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Clean White Header & Personal Quick Page Search */}
      <section className="relative z-30 pt-1 pb-1 space-y-4">
        <EmployeeMobileSearchBar />

        {/* Header Greeting */}
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Employee Portal
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight">
            Hello, <span className="font-semibold text-[var(--brand-deep)]">{profile?.firstName || 'Employee'}</span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-0.5">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Attendance Tracker */}
      <section className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] overflow-hidden relative z-20">
        <div className="px-6 pt-6 pb-4 border-b border-[var(--line)] flex justify-between items-start">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)] tracking-tight leading-tight">
              Attendance <span className="text-[var(--brand-deep)]">Tracker</span>
            </h2>
            <p className="text-[11px] font-medium text-[var(--muted)] mt-1 uppercase tracking-wider">Today's Check-In Status</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shrink-0 shadow-2xs ${attendanceBadge.className}`}>
            {attendanceBadge.label}
          </span>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Circular Counter */}
          <div className="w-40 h-40 rounded-full relative mb-8 overflow-hidden bg-[var(--surface-alt)] flex items-center justify-center border border-[var(--line)]">

            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-full border-[6px] border-[var(--line)] z-20 pointer-events-none"></div>

            {isActiveSession && (
              <div className="absolute inset-0 z-0">
                {/* Liquid body */}
                <div className="absolute inset-0 bg-[var(--brand)] opacity-25"></div>
                <div className="absolute top-[-145%] left-[-50%] w-[200%] h-[200%] bg-[var(--surface-alt)]/60 rounded-[43%] animate-[spin_5s_linear_infinite]"></div>
                <div className="absolute top-[-135%] left-[-50%] w-[200%] h-[200%] bg-[var(--surface-alt)] rounded-[40%] animate-[spin_7s_linear_infinite]"></div>
              </div>
            )}

            <div className="relative z-10 flex flex-col items-center justify-center">
              {isActiveSession && (
                <div className="absolute inset-[-8px] bg-white/40 backdrop-blur-[2px] rounded-full -z-10 blur-sm"></div>
              )}
              <span className={`text-2xl font-bold tracking-tight ${isActiveSession ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                {formatTime(liveSeconds)}
              </span>
            </div>
          </div>

          <div className="w-full flex justify-between px-2 mb-8">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Check In</span>
              <span className="text-base font-bold text-[var(--text)] flex items-center gap-1.5">
                <LogIn className="w-4 h-4 text-[var(--status-success-text)]" />
                {todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Check Out</span>
              <span className="text-base font-bold text-[var(--text)] flex items-center gap-1.5">
                <LogOut className="w-4 h-4 text-[var(--status-danger-text)]" />
                {todayRecord?.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            {isOnLeaveToday ? (
              <div className="w-full rounded-[14px] bg-[var(--status-info-bg)] text-[var(--status-info-text)] font-semibold py-3 text-center text-sm border border-[var(--status-info-text)]/20 flex flex-col items-center gap-1.5">
                <Calendar className="w-5 h-5" />
                <span>You Are On An Approved Leave Today.</span>
              </div>
            ) : todayRecord?.status === 'Leave' ? (
              <div className="w-full rounded-[14px] bg-[var(--surface-alt)] text-[var(--muted)] font-semibold py-2.5 text-center text-sm">
                Attendance Blocked - Approved Leave Today
              </div>
            ) : !checkedIn && !checkOutTime ? (
              <button
                onClick={() => handlePunch('check-in')}
                disabled={isLocked}
                className="w-full flex items-center justify-center gap-2 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-[0.99] text-white rounded-full py-3.5 text-sm font-semibold tracking-wide shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLocked ? formatLockoutTimer(lockoutSeconds) : 'Check In'}</span>
              </button>
            ) : checkedIn && !checkOutTime ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => handlePunch('punch')}
                  disabled={isLocked}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-alt)] text-[var(--text)] rounded-full py-3 text-sm font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 text-[var(--muted)]" />
                  <span>{isLocked ? formatLockoutTimer(lockoutSeconds) : 'Punch'}</span>
                </button>
                <button
                  onClick={() => handlePunch('check-out')}
                  disabled={isLocked}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--status-danger-text)] hover:opacity-90 text-white rounded-full py-3 text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLocked ? formatLockoutTimer(lockoutSeconds) : 'Check Out'}</span>
                </button>
              </div>
            ) : (
              <div className="w-full rounded-[14px] bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20 font-semibold py-3 text-sm flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Attendance Completed</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Business Apps Entry */}
      {(profile?.featureAccess?.canLoanOrigination || profile?.featureAccess?.canSalesOrigination || profile?.featureAccess?.canBranchOperations) && (
        <section className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] overflow-hidden p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line)]">
            <div>
              <h2 className="text-base font-semibold text-[var(--text)] tracking-tight leading-tight">
                Business <span className="text-[var(--brand-deep)]">Apps</span>
              </h2>
              <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5">Tap to open application</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] shrink-0">
              Apps
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {profile?.featureAccess?.canLoanOrigination && (
              <Link to="/employee/loans/origination" className="flex flex-col items-center gap-1.5 group">
                <div className="w-13 h-13 rounded-[14px] bg-[var(--brand-tint)] border border-[var(--brand)]/20 flex items-center justify-center shadow-xs group-active:scale-95 transition-transform duration-150">
                  <Briefcase className="w-5 h-5 text-[var(--brand-deep)]" />
                </div>
                <span className="text-xs font-semibold text-[var(--text)] text-center leading-tight">Loans</span>
              </Link>
            )}

            {profile?.featureAccess?.canSalesOrigination && (
              <Link to="/employee/sales/origination" className="flex flex-col items-center gap-1.5 group">
                <div className="w-13 h-13 rounded-[14px] bg-[var(--accent-pink-tint)] border border-[var(--accent-pink)]/20 flex items-center justify-center shadow-xs group-active:scale-95 transition-transform duration-150">
                  <ShoppingBag className="w-5 h-5 text-[var(--accent-pink-deep)]" />
                </div>
                <span className="text-xs font-semibold text-[var(--text)] text-center leading-tight">Sales</span>
              </Link>
            )}

            {profile?.featureAccess?.canBranchOperations && (
              <Link to="/employee/branch-operations" className="flex flex-col items-center gap-1.5 group">
                <div className="w-13 h-13 rounded-[14px] bg-[var(--branch-tint)] border border-[var(--branch)]/20 flex items-center justify-center shadow-xs group-active:scale-95 transition-transform duration-150">
                  <Building2 className="w-5 h-5 text-[var(--branch-deep)]" />
                </div>
                <span className="text-xs font-semibold text-[var(--text)] text-center leading-tight">Branch Ops</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Upcoming Birthdays */}
      <section className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] overflow-hidden">
        <Link to="/employee/birthdays" className="px-6 pt-5 pb-4 border-b border-[var(--line)] flex justify-between items-center active:bg-[var(--surface-alt)] transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--accent-pink-tint)] p-2.5 rounded-[12px]">
              <Cake className="w-5 h-5 text-[var(--accent-pink-deep)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text)] tracking-tight leading-tight">
                Upcoming <span className="text-[var(--brand-deep)]">Birthdays</span>
              </h2>
              <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">Celebrate with team</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
        </Link>
        <div className="p-4 space-y-2.5">
          {upcomingBirthdays.length > 0 ? (
            upcomingBirthdays.map((birthday, idx) => {
              const bdayDate = birthday.date || birthday.dateOfBirth || birthday.dob || birthday.birthday;
              const bdayName = birthday.name || `${birthday.firstName || ''} ${birthday.lastName || ''}`.trim() || 'Team Member';
              return (
                <div key={birthday.id || idx} className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    {bdayDate && (
                      <div className="flex flex-col items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink-deep)]/20 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1">
                          {new Date(bdayDate).toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-base font-bold leading-none">
                          {new Date(bdayDate).getDate()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[var(--text)] text-sm">{bdayName}</h3>
                      <p className="text-xs text-[var(--muted)]">{birthday.department || 'Employee'}</p>
                    </div>
                  </div>
                  {birthday.avatar ? (
                    <img src={birthday.avatar} alt={bdayName} className="w-10 h-10 rounded-[14px] object-cover border border-[var(--line)]" />
                  ) : (
                    <div className="w-10 h-10 rounded-[14px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center font-semibold border border-[var(--accent-pink-deep)]/20 text-sm">
                      {bdayName.charAt(0)}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-[var(--muted)] text-sm py-4 font-medium">
              No upcoming birthdays.
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default EmployeeMobileDashboard;
