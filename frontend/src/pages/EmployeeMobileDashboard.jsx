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
  Wallet,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cake,
  Sparkles,
  MapPin
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

    const now = new Date().getTime();
    setLiveSeconds(Math.max(0, Math.floor((now - inTime) / 1000)));

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
    }).format(amount || 0);
  };

  const isActiveSession = checkedIn && !checkOutTime;
  const paidRemaining = leaves?.balance ? Math.max(0, leaves.balance.paidTotal - leaves.balance.paidUsed) : 12;

  if (loading) return <PageLoader message="Loading Mobile Dashboard..." />;

  return (
    <div className="space-y-4 pb-8">

      {/* Hero Welcome Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                {getGreeting()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              {profile?.firstName || 'Employee'} {profile?.lastName || ''}
            </h1>
            <p className="text-xs text-[#5f6368]">
              {fullProfile?.position || 'Staff'} &bull; {fullProfile?.department || 'General'}
            </p>
          </div>

          <div className="h-12 w-12 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {fullProfile?.avatar ? (
              <img src={fullProfile.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[#1a73e8]">
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Biometric Attendance Tracker Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e7]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Attendance Terminal</h2>
              <p className="text-[10px] text-[#5f6368]">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            todayRecord?.checkIn 
              ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' 
              : 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]'
          }`}>
            {todayRecord?.checkIn ? 'Logged Today' : 'Not Marked'}
          </span>
        </div>

        {/* Circular Live Clock with Liquid Wave Animation */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="w-36 h-36 rounded-full relative overflow-hidden bg-[#f8fafd] flex items-center justify-center shadow-inner">

            {/* The Outer Ring */}
            <div className="absolute inset-0 rounded-full border-[5px] border-[#e8f0fe] z-20 pointer-events-none" />

            {isActiveSession && (
              <div className="absolute inset-0 z-0">
                {/* Liquid body */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a73e8] to-[#4285F4]" />

                {/* Wave cutouts - they rotate to create the liquid effect */}
                <div className="absolute top-[-145%] left-[-50%] w-[200%] h-[200%] bg-white/70 rounded-[43%] animate-[spin_5s_linear_infinite]" />
                <div className="absolute top-[-135%] left-[-50%] w-[200%] h-[200%] bg-[#f8fafd] rounded-[40%] animate-[spin_7s_linear_infinite]" />
              </div>
            )}

            <div className="relative z-10 flex flex-col items-center justify-center">
              {isActiveSession && (
                <div className="absolute inset-[-8px] bg-white/50 backdrop-blur-[2px] rounded-full -z-10 blur-xs" />
              )}
              <span className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isActiveSession ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>
                Work Session
              </span>
              <span className={`text-xl font-black tracking-tight ${isActiveSession ? 'text-[#1a73e8] drop-shadow-xs' : 'text-[#1f1f1f]'}`}>
                {formatTime(liveSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Timestamps Row */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] text-xs">
          <div>
            <span className="text-[10px] text-[#5f6368] uppercase font-semibold">Check-In</span>
            <div className="flex items-center gap-1.5 font-bold text-[#1f1f1f] mt-0.5">
              <LogIn className="w-3.5 h-3.5 text-[#137333]" />
              <span>{todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#5f6368] uppercase font-semibold">Check-Out</span>
            <div className="flex items-center justify-end gap-1.5 font-bold text-[#1f1f1f] mt-0.5">
              <LogOut className="w-3.5 h-3.5 text-[#c5221f]" />
              <span>{todayRecord?.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
          </div>
        </div>

        {/* Rate Limit Lockout Alert Banner */}
        {isLocked && (
          <div className="rounded-2xl bg-[#fef7e0] border border-[#feefc3] p-3 flex items-center justify-between text-xs text-[#b06000] animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-[#b06000] shrink-0 animate-pulse" />
              <span className="font-bold text-[#b06000] truncate">Punch Rate Limit Active</span>
            </div>
            <span className="font-mono font-bold text-xs bg-white px-2.5 py-1 rounded-full border border-[#feefc3] text-[#b06000] shadow-2xs shrink-0">
              Unlocks in {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {isOnLeaveToday ? (
            <div className="rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc] p-3 text-center text-xs font-semibold text-[#1a73e8] flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Approved Leave Scheduled Today</span>
            </div>
          ) : !checkedIn && !checkOutTime ? (
            <button
              onClick={() => handlePunch('check-in')}
              disabled={isLocked}
              className="w-full flex items-center justify-center gap-2 bg-[#1a73e8] text-white rounded-full py-3 text-xs font-semibold hover:bg-[#1557b0] disabled:opacity-50 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              <span>Punch Check In</span>
            </button>
          ) : checkedIn && !checkOutTime ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handlePunch('punch')}
                disabled={isLocked}
                className="w-full flex items-center justify-center gap-1.5 bg-white border border-[#dadce0] text-[#1f1f1f] rounded-full py-2.5 text-xs font-semibold hover:bg-[#f1f3f4] disabled:opacity-50 transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                <Clock className="w-3.5 h-3.5 text-[#5f6368] shrink-0" />
                <span>Interval Punch</span>
              </button>
              <button
                onClick={() => handlePunch('check-out')}
                disabled={isLocked}
                className="w-full flex items-center justify-center gap-1.5 bg-white border border-[#dadce0] hover:border-[#fad2cf] hover:bg-[#fce8e6] text-[#d93025] rounded-full py-2.5 text-xs font-semibold disabled:opacity-50 transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Punch Check Out</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#e6f4ea] border border-[#ceead6] p-2.5 text-center text-xs font-semibold text-[#137333] flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Daily Attendance Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Paid Leaves */}
        <Link to="/employee/leaves" className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1 block hover:border-[#dadce0] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Paid Leaves</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1f1f1f]">{paidRemaining} Days</p>
          <p className="text-[10px] text-[#5f6368]">Available quota</p>
        </Link>

        {/* Latest Payslip */}
        <Link to="/employee/payroll" className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1 block hover:border-[#dadce0] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Latest Payslip</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#137333]">
            ₹{Number(latestPayslip?.netSalary ?? latestPayslip?.net_salary ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-[#5f6368] truncate">
            {latestPayslip?.month && latestPayslip?.year 
              ? new Date(latestPayslip.year, latestPayslip.month - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
              : 'Recent Cycle'}
          </p>
        </Link>
      </div>

      {/* Business Apps (App-style Round Icons) */}
      {(profile?.featureAccess?.canLoanOrigination || profile?.featureAccess?.canSalesOrigination || profile?.featureAccess?.canBranchOperations || hasTrainingVideos) && (
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
            <h2 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Business Apps</h2>
            <span className="text-[10px] text-[#5f6368]">Tap to open</span>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-1">
            {profile?.featureAccess?.canLoanOrigination && (
              <Link to="/employee/loans/origination" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-[1.25rem] bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center shadow-2xs group-active:scale-90 transition-transform duration-100">
                  <Briefcase className="w-6 h-6 text-[#1a73e8]" />
                </div>
                <span className="text-[10px] font-semibold text-[#1f1f1f] text-center leading-tight">Loans</span>
              </Link>
            )}

            {profile?.featureAccess?.canSalesOrigination && (
              <Link to="/employee/sales/origination" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-[1.25rem] bg-[#e6f4ea] border border-[#ceead6] flex items-center justify-center shadow-2xs group-active:scale-90 transition-transform duration-100">
                  <ShoppingBag className="w-6 h-6 text-[#137333]" />
                </div>
                <span className="text-[10px] font-semibold text-[#1f1f1f] text-center leading-tight">Sales</span>
              </Link>
            )}

            {profile?.featureAccess?.canBranchOperations && (
              <Link to="/employee/branch-operations" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-[1.25rem] bg-[#fef7e0] border border-[#feefc3] flex items-center justify-center shadow-2xs group-active:scale-90 transition-transform duration-100">
                  <Building2 className="w-6 h-6 text-[#b06000]" />
                </div>
                <span className="text-[10px] font-semibold text-[#1f1f1f] text-center leading-tight">Branch Ops</span>
              </Link>
            )}

            {hasTrainingVideos && (
              <Link to="/employee/training" className="flex flex-col items-center gap-1.5 group">
                <div className="w-14 h-14 rounded-[1.25rem] bg-[#fce8e6] border border-[#fad2cf] flex items-center justify-center shadow-2xs group-active:scale-90 transition-transform duration-100">
                  <Play className="w-6 h-6 text-[#d93025]" />
                </div>
                <span className="text-[10px] font-semibold text-[#1f1f1f] text-center leading-tight">Training</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Expenses Overview */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <Link to="/employee/expenses" className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#fef7e0] text-[#b06000]">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">My Expenses</h2>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8]">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <div className="space-y-2">
          {upcomingExpenses.length > 0 ? (
            upcomingExpenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] text-xs">
                <div>
                  <h3 className="font-bold text-[#1f1f1f]">{expense.title}</h3>
                  <p className="text-[10px] text-[#5f6368] mt-0.5">{new Date(expense.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#1f1f1f]">{formatCurrency(expense.amount)}</div>
                  <div className={`text-[9px] font-bold uppercase tracking-wider ${
                    expense.status === 'Approved' ? 'text-[#137333]' :
                    expense.status === 'Rejected' ? 'text-[#c5221f]' : 'text-[#b06000]'
                  }`}>
                    {expense.status}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-[#5f6368] text-xs py-3">
              No recent expense claims recorded.
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Holidays */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <Link to="/employee/holidays" className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#e6f4ea] text-[#137333]">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Company Holidays</h2>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8]">
            <span>Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <div className="space-y-2">
          {upcomingHolidays.length > 0 ? (
            upcomingHolidays.map(holiday => (
              <div key={holiday.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center justify-center min-w-[2.75rem] px-1.5 py-1 rounded-xl bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                    <span className="text-[9px] font-bold uppercase leading-none mb-0.5">
                      {new Date(holiday.holidayDate).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-sm font-bold leading-none">
                      {new Date(holiday.holidayDate).getDate()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1f1f1f]">{holiday.holidayName}</h3>
                    <p className="text-[10px] text-[#5f6368]">{new Date(holiday.holidayDate).toLocaleDateString(undefined, { weekday: 'long' })}</p>
                  </div>
                </div>
                {holiday.holidayImage && (
                  <img src={holiday.holidayImage} alt={holiday.holidayName} className="w-8 h-8 rounded-lg object-cover border border-[#e0e3e7]" />
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-[#5f6368] text-xs py-3">
              No upcoming company holidays.
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Birthdays This Month */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#fce8e6] text-[#d93025]">
              <Cake className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Birthdays This Month</h2>
          </div>
          <span className="text-[10px] text-[#5f6368]">{new Date().toLocaleString('en-US', { month: 'long' })}</span>
        </div>

        <div className="space-y-2">
          {upcomingBirthdays.length > 0 ? (
            upcomingBirthdays.map((bday, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] text-xs">
                <div className="w-9 h-9 rounded-full bg-[#fce8e6] border border-[#fad2cf] flex items-center justify-center shrink-0 overflow-hidden">
                  {bday.avatar ? (
                    <img src={bday.avatar} alt={bday.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-[#d93025]">
                      {(bday.name || bday.firstName || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1f1f1f] truncate">{bday.name || `${bday.firstName || ''} ${bday.lastName || ''}`.trim()}</h3>
                  <p className="text-[10px] text-[#5f6368]">{bday.department || 'Team Member'}</p>
                </div>
                <div className="flex flex-col items-center justify-center min-w-[2.75rem] px-1.5 py-1 rounded-xl bg-[#fce8e6] text-[#d93025] border border-[#fad2cf]">
                  <span className="text-[9px] font-bold uppercase leading-none mb-0.5">
                    {new Date(bday.dateOfBirth || bday.dob || bday.birthday).toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {new Date(bday.dateOfBirth || bday.dob || bday.birthday).getDate()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-[#5f6368] text-xs py-3">
              No birthdays this month.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default EmployeeMobileDashboard;
