import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { LogIn, LogOut, Clock, Calendar, Bell, Shield, ChevronRight, Receipt, Briefcase } from 'lucide-react';
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
  
  const [lockoutSeconds, setLockoutSeconds] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const attendance = dashboardData?.attendance || [];
  const leaves = dashboardData?.leaves || null;
  const fullProfile = dashboardData?.fullProfile || profile;
  const holidays = dashboardData?.holidays || [];
  const expenses = dashboardData?.expenses || [];
  const birthdays = dashboardData?.birthdays || [];
  
  const upcomingExpenses = expenses.slice(0, 3);
  const upcomingBirthdays = birthdays.slice(0, 3);
  const latestPayslip = dashboardData?.latestPayslip || null;

  useEffect(() => {
    if (dashboardData?.mapsRateLimit?.locked && dashboardData.mapsRateLimit.secondsRemaining > 0) {
      setLockoutSeconds(dashboardData.mapsRateLimit.secondsRemaining);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (lockoutSeconds !== null && lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds(prev => (prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  const isLocked = lockoutSeconds !== null && lockoutSeconds > 0;
  const formatLockoutTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `Locked (${m}m ${s}s)`;
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

  if (loading) return <PageLoader message="Loading Dashboard..." />;

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
      <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative z-20 -mt-12">
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
                disabled={isLocked}
                className="w-full flex items-center justify-center bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <LogIn className="mr-2" size={18} />
                {isLocked ? formatLockoutTimer(lockoutSeconds) : 'Check In'}
              </button>
            ) : checkedIn && !checkOutTime ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => handlePunch('punch')}
                  disabled={isLocked}
                  className="w-full flex items-center justify-center bg-white border border-slate-300 text-slate-700 rounded-xl py-3 font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Clock className="mr-2" size={18} />
                  {isLocked ? formatLockoutTimer(lockoutSeconds) : 'Punch'}
                </button>
                <button
                  onClick={() => handlePunch('check-out')}
                  disabled={isLocked}
                  className="w-full flex items-center justify-center bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <LogOut className="mr-2" size={18} />
                  {isLocked ? formatLockoutTimer(lockoutSeconds) : 'Check Out'}
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

      {/* Business Apps Entry */}
      {(profile?.featureAccess?.canChat || profile?.featureAccess?.canLoanOrigination) && (
        <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Business Apps</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Company Applications</p>
          </div>
          <div className="p-6 space-y-4">
            {profile?.featureAccess?.canChat && (
              <Link to="/employee/chat/mobile" className="flex items-center justify-between w-full rounded-xl bg-blue-600 text-white font-semibold text-sm px-6 py-4 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-base">Open Mobile Chat</div>
                    <div className="text-xs text-blue-200 font-normal mt-0.5">Connect with your colleagues</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-200" />
              </Link>
            )}

            {profile?.featureAccess?.canLoanOrigination && (
              <Link to="/employee/loans/origination" className="flex items-center justify-between w-full rounded-xl bg-slate-900 text-white font-semibold text-sm px-6 py-4 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-base">Acme Loans</div>
                    <div className="text-xs text-slate-300 font-normal mt-0.5">Apply for a business loan</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
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
                  <p className="text-xs text-slate-500">{new Date(expense.created_at).toLocaleDateString()}</p>
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
        <Link to="/employee/mobile/holidays" className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center active:bg-slate-50 transition-colors">
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
        <Link to="/employee/mobile/birthdays" className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center active:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
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
            upcomingBirthdays.map(birthday => (
              <div key={birthday.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-xl bg-purple-100 text-purple-600 border border-purple-200/50 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1">
                      {new Date(birthday.date).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-lg font-black leading-none">
                      {new Date(birthday.date).getDate()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{birthday.name}</h3>
                    <p className="text-xs text-slate-500">{birthday.department}</p>
                  </div>
                </div>
                {birthday.avatar ? (
                  <img src={birthday.avatar} alt={birthday.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                    {birthday.name.charAt(0)}
                  </div>
                )}
              </div>
            ))
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
