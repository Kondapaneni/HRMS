import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  LogIn, 
  LogOut, 
  Clock, 
  Calendar, 
  Shield, 
  ChevronRight, 
  Receipt, 
  Briefcase, 
  Play, 
  Building2, 
  ShoppingBag,
  Cake
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

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

  const upcomingExpenses = expenses.slice(0, 3);
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
  const currentYear = new Date().getFullYear();
  const upcomingHolidays = holidays.filter(h => h.holidayDate >= todayStr && new Date(h.holidayDate).getFullYear() === currentYear).slice(0, 3);
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
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getAttendanceBadge = (status) => {
    if (!status) return { label: 'Not Marked', className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
    const s = String(status).toLowerCase().trim();
    const capitalize = (str) => String(str).replace(/\b\w/g, c => c.toUpperCase());

    if (s === 'present') {
      return { label: 'Present', className: 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' };
    }
    if (s.includes('late') || s.includes('checkout missing')) {
      return { 
        label: s.includes('checkout missing') ? 'Checkout Missing' : 'Present (Late)', 
        className: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]' 
      };
    }
    if (s.includes('early')) {
      return { label: 'Present (Early)', className: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]' };
    }
    if (s.includes('leave') || s === 'on leave') {
      return { label: capitalize(status), className: 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' };
    }
    if (s.includes('half')) {
      return { label: 'Half Day', className: 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]' };
    }
    if (s === 'missed') {
      return { label: 'Missed', className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
    }
    if (s === 'absent' || s === 'missing') {
      return { label: 'Absent', className: 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]' };
    }
    if (s === 'regularized') {
      return { label: 'Regularized', className: 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' };
    }
    if (s === 'holiday') {
      return { label: 'Holiday', className: 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' };
    }
    if (s.includes('weekend') || s.includes('week off')) {
      return { label: capitalize(status), className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
    }
    return { label: capitalize(status), className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
  };

  const isActiveSession = checkedIn && !checkOutTime;
  const heroSubtitle = [fullProfile?.position, fullProfile?.department].filter(Boolean).join(' · ') || 'Employee';
  const attendanceBadge = getAttendanceBadge(todayRecord?.status);

  if (loading) return <PageLoader message="Loading Dashboard..." />;

  return (
    <div className="space-y-6 pb-4">

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
            }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Employee Portal</p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Hello, {profile?.firstName || 'Employee'}</h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">{heroSubtitle}</p>
        </div>
      </section>

      {/* Attendance Tracker */}
      <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative z-20 -mt-12">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Attendance Tracker</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Today's Check-In Status</p>
          </div>
          <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs ${attendanceBadge.className}`}>
            {attendanceBadge.label}
          </span>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Circular Counter */}
          <div className="w-40 h-40 rounded-full relative mb-8 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner">

            {/* The Outer Ring */}
            <div className="absolute inset-0 rounded-full border-[6px] border-slate-100 z-20 pointer-events-none"></div>

            {isActiveSession && (
              <div className="absolute inset-0 z-0">
                {/* Liquid body */}
                <div className="absolute inset-0 bg-[#ff686b]"></div>

                {/* Wave cutouts - they rotate to create the liquid effect */}
                <div className="absolute top-[-145%] left-[-50%] w-[200%] h-[200%] bg-slate-50/60 rounded-[43%] animate-[spin_5s_linear_infinite]"></div>
                <div className="absolute top-[-135%] left-[-50%] w-[200%] h-[200%] bg-slate-50 rounded-[40%] animate-[spin_7s_linear_infinite]"></div>
              </div>
            )}

            <div className="relative z-10 flex flex-col items-center justify-center px-3.5 py-1.5 rounded-2xl bg-white/80 backdrop-blur-md shadow-xs border border-white/90">
              <span className={`text-xl font-black font-mono tracking-tight whitespace-nowrap ${isActiveSession ? 'text-[#e53935]' : 'text-slate-800'}`}>
                {formatTime(liveSeconds)}
              </span>
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 -mt-0.5">
                Working Time
              </span>
            </div>
          </div>

          <div className="w-full flex justify-between px-2 mb-8">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check In</span>
              <span className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <LogIn className="w-4 h-4 text-emerald-500" />
                {todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check Out</span>
              <span className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <LogOut className="w-4 h-4 text-rose-500" />
                {todayRecord?.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            {isOnLeaveToday ? (
              <div className="w-full rounded-xl bg-blue-50 text-blue-800 font-semibold py-3 text-center text-sm border border-blue-100 flex flex-col items-center gap-1.5 shadow-sm">
                <Calendar className="w-5 h-5" />
                <span>You Are On An Approved Leave Today.</span>
              </div>
            ) : todayRecord?.status === 'Leave' ? (
              <div className="w-full rounded-xl bg-slate-100 text-slate-500 font-semibold py-2.5 text-center text-sm">
                Attendance Blocked - Approved Leave Today
              </div>
            ) : !checkedIn && !checkOutTime ? (
              <button
                onClick={() => handlePunch('check-in')}
                disabled={isLocked}
                className="w-full flex items-center justify-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white rounded-full py-3.5 text-sm font-semibold tracking-wide shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLocked ? formatLockoutTimer(lockoutSeconds) : 'Check In'}</span>
              </button>
            ) : checkedIn && !checkOutTime ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => handlePunch('punch')}
                  disabled={isLocked}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#1f1f1f] rounded-full py-3 text-sm font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 text-[#5f6368]" />
                  <span>{isLocked ? formatLockoutTimer(lockoutSeconds) : 'Punch'}</span>
                </button>
                <button
                  onClick={() => handlePunch('check-out')}
                  disabled={isLocked}
                  className="w-full flex items-center justify-center gap-2 bg-[#d93025] hover:bg-[#b3261e] active:bg-[#a51d14] text-white rounded-full py-3 text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLocked ? formatLockoutTimer(lockoutSeconds) : 'Check Out'}</span>
                </button>
              </div>
            ) : (
              <div className="w-full rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] font-semibold py-3 text-sm flex items-center justify-center gap-2 shadow-2xs">
                <Shield className="w-4 h-4" />
                <span>Attendance Completed</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Business Apps Entry (Round Circle Apps in a Row) */}
      {(profile?.featureAccess?.canLoanOrigination || profile?.featureAccess?.canSalesOrigination || profile?.featureAccess?.canBranchOperations || hasTrainingVideos) && (
        <section className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">Business Apps</h2>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Tap to open application</p>
            </div>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-bold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] shrink-0 shadow-2xs">
              Apps
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {profile?.featureAccess?.canLoanOrigination && (
              <Link to="/employee/loans/origination" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
                  <Briefcase className="w-6 h-6 text-[#1a73e8]" />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Loans</span>
              </Link>
            )}

            {profile?.featureAccess?.canSalesOrigination && (
              <Link to="/employee/sales/origination" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-full bg-[#e6f4ea] border border-[#ceead6] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
                  <ShoppingBag className="w-6 h-6 text-[#137333]" />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Sales</span>
              </Link>
            )}

            {profile?.featureAccess?.canBranchOperations && (
              <Link to="/employee/branch-operations" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-full bg-[#f3e8fd] border border-[#e9d5ff] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
                  <Building2 className="w-6 h-6 text-[#7C4DFF]" />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Branch Ops</span>
              </Link>
            )}

            {hasTrainingVideos && (
              <Link to="/employee/training" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-full bg-[#fce8e6] border border-[#fad2cf] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
                  <Play className="w-6 h-6 text-[#d93025]" />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Training</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Expenses Overview */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <Link to="/employee/expenses" className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center active:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2 rounded-lg">
              <Receipt className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">My Expenses</h2>
              <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Track your claims</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="p-4 space-y-3">
          {upcomingExpenses.length > 0 ? (
            upcomingExpenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{expense.title}</h3>
                  <p className="text-xs text-slate-500">{new Date(expense.created_at || expense.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatCurrency(expense.amount)}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${
                    expense.status === 'Approved' ? 'text-emerald-600' :
                    expense.status === 'Rejected' ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {expense.status}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 text-sm py-4 font-medium">
              No recent expenses to show.
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Holidays */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <Link to="/employee/holidays" className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center active:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Upcoming Holidays</h2>
              <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Company calendar</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="p-4 space-y-3">
          {upcomingHolidays.length > 0 ? (
            upcomingHolidays.map(holiday => (
              <div key={holiday.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200/50 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1">
                      {new Date(holiday.holidayDate).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-lg font-black leading-none">
                      {new Date(holiday.holidayDate).getDate()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{holiday.holidayName}</h3>
                    <p className="text-xs text-slate-500">{new Date(holiday.holidayDate).toLocaleDateString(undefined, { weekday: 'long' })}</p>
                  </div>
                </div>
                {holiday.holidayImage && (
                  <img src={holiday.holidayImage} alt={holiday.holidayName} className="w-10 h-10 rounded-lg object-cover" />
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 text-sm py-4 font-medium">
              No upcoming holidays.
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Birthdays */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <Link to="/employee/birthdays" className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center active:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <Cake className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Upcoming Birthdays</h2>
              <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Celebrate with team</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="p-4 space-y-3">
          {upcomingBirthdays.length > 0 ? (
            upcomingBirthdays.map((birthday, idx) => {
              const bdayDate = birthday.date || birthday.dateOfBirth || birthday.dob || birthday.birthday;
              const bdayName = birthday.name || `${birthday.firstName || ''} ${birthday.lastName || ''}`.trim() || 'Team Member';
              return (
                <div key={birthday.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    {bdayDate && (
                      <div className="flex flex-col items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-xl bg-purple-100 text-purple-600 border border-purple-200/50 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1">
                          {new Date(bdayDate).toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {new Date(bdayDate).getDate()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{bdayName}</h3>
                      <p className="text-xs text-slate-500">{birthday.department || 'Employee'}</p>
                    </div>
                  </div>
                  {birthday.avatar ? (
                    <img src={birthday.avatar} alt={bdayName} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold border-2 border-white shadow-sm text-sm">
                      {bdayName.charAt(0)}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-500 text-sm py-4 font-medium">
              No upcoming birthdays.
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default EmployeeMobileDashboard;
