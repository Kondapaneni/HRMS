import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, Calendar, Bell, Shield, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileDashboard = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [punchingAction, setPunchingAction] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['employee', 'dashboard'],
    queryFn: async () => {
      const [attRes, leavesRes, perfRes, profileRes, payslipsRes] = await Promise.all([
        api.get('/employee/attendance').catch(() => ({ data: [] })),
        api.get('/employee/leaves').catch(() => ({ data: null })),
        api.get('/employee/performance').catch(() => ({ data: {} })),
        api.get('/employee/profile').catch(() => ({ data: {} })),
        api.get('/employee/payroll').catch(() => ({ data: { payslips: [] } }))
      ]);
      return {
        attendance: attRes.data,
        leaves: leavesRes.data,
        performance: perfRes.data?.currentMonthSummary || null,
        fullProfile: profileRes.data?.profile || null,
        latestPayslip: payslipsRes.data?.payslips?.[0] || null
      };
    },
    staleTime: 30 * 1000
  });

  const attendance = dashboardData?.attendance || [];
  const leaves = dashboardData?.leaves || null;
  const fullProfile = dashboardData?.fullProfile || profile;
  const latestPayslip = dashboardData?.latestPayslip || null;

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

  const reverseGeocode = async (lat, lng) => {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const handlePunch = async (action) => {
    navigate('/employee/attendance/map', { state: { action } });
  };
  const [liveSeconds, setLiveSeconds] = useState(0);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isActiveSession = checkedIn && !checkOutTime;
  const leaveRemaining = leaves?.balance ? Math.max(0, leaves.balance.paidTotal - leaves.balance.paidUsed) : 12;
  const unpaidUsed = leaves?.balance?.unpaidUsed || 0;

  const heroSubtitle = [fullProfile?.position, fullProfile?.department].filter(Boolean).join(' · ') || 'Employee';

  return (
    <div className="space-y-6 pb-2">

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
      <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative z-20 -mt-12 mx-1">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Attendance Tracker</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Today's Check-In Status</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${todayRecord?.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
              todayRecord?.status === 'Absent' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-600'
            }`}>
            {todayRecord?.status || 'Not Marked'}
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

            <div className="relative z-10 flex flex-col items-center justify-center">
              {isActiveSession && (
                <div className="absolute inset-[-8px] bg-white/40 backdrop-blur-[2px] rounded-full -z-10 blur-sm"></div>
              )}
              <span className={`text-2xl font-black tracking-tighter ${isActiveSession ? 'text-[#ff686b] drop-shadow-md' : 'text-slate-800'}`}>
                {formatTime(liveSeconds)}
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
                <span>You are on an approved leave today.</span>
              </div>
            ) : todayRecord?.status === 'Leave' ? (
              <div className="w-full rounded-xl bg-slate-100 text-slate-500 font-semibold py-2.5 text-center text-sm">
                Attendance Blocked - Approved Leave Today
              </div>
            ) : !checkedIn && !checkOutTime ? (
              <button
                onClick={() => handlePunch('check-in')}
                disabled={punchingAction}
                className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 flex items-center justify-center gap-2 text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Check In
              </button>
            ) : checkedIn && !checkOutTime ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => handlePunch('punch')}
                  disabled={punchingAction}
                  className="rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold py-2.5 flex items-center justify-center gap-2 text-sm hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                  Punch
                </button>
                <button
                  onClick={() => handlePunch('check-out')}
                  disabled={punchingAction}
                  className="rounded-xl bg-slate-900 text-white font-semibold py-2.5 flex items-center justify-center gap-2 text-sm hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  Check Out
                </button>
              </div>
            ) : (
              <div className="w-full rounded-xl bg-emerald-50 text-emerald-700 font-semibold py-2.5 text-sm flex items-center justify-center gap-2 border border-emerald-100">
                <Shield className="w-4 h-4" />
                Attendance Completed
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Leave Balance */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Leave balance</h2>
          <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Paid leave remaining</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-100">
              <span className="text-3xl font-black text-slate-800 tracking-tight">{leaveRemaining}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Remaining</span>
            </div>
            <div className="bg-slate-50 rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-100">
              <span className="text-3xl font-black text-slate-800 tracking-tight">{unpaidUsed}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unpaid Used</span>
            </div>
          </div>
          <Link to="/employee/leaves/apply" className="flex items-center justify-center w-full rounded-xl bg-[#84dcc6] text-slate-900 font-semibold text-sm py-3 hover:bg-[#7bcab4] active:scale-[0.98] transition-all">
            Apply leave
          </Link>
        </div>
      </section>

      {/* Salary Overview */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Salary overview</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Latest payslip snapshot</p>
          </div>
          {latestPayslip && (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${latestPayslip.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
              {latestPayslip.status}
            </span>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-col mb-6">
            <span className="text-3xl font-black text-slate-800 tracking-tight">
              {latestPayslip ? formatCurrency(latestPayslip.netSalary) : '₹0'}
            </span>
            <span className="text-xs font-bold text-slate-400 mt-1">
              {latestPayslip ? `${new Date(latestPayslip.year, latestPayslip.month - 1).toLocaleString('default', { month: 'long' })} ${latestPayslip.year}` : 'No payslip available'}
            </span>
          </div>
          <Link to="/employee/payroll" className="flex items-center justify-center w-full rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold text-sm py-3 hover:bg-slate-50 active:scale-[0.98] transition-all">
            View payroll
          </Link>
        </div>
      </section>

      {/* Recent Notifications */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Recent notifications</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Unread: 0</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <Bell className="w-10 h-10 text-slate-300 mb-3" />
          <h3 className="text-slate-700 font-bold">No notifications</h3>
          <p className="text-sm text-slate-500 mt-1">You are all caught up.</p>
        </div>
      </section>

    </div>
  );
};

export default EmployeeMobileDashboard;
