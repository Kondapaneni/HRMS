import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  // Personal Page & Feature Search
  const searchRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filterable pages and actions available to the employee
  const searchablePages = useMemo(() => {
    const items = [
      {
        id: 'attendance-punch',
        title: 'Punch In / Punch Out',
        subtitle: 'Record GPS check-in or check-out',
        category: 'Attendance',
        path: '/employee/attendance/map',
        icon: MapPin,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['punch', 'check in', 'check out', 'map', 'gps', 'time', 'attendance', 'clock in', 'clock out']
      },
      {
        id: 'attendance-history',
        title: 'Attendance History',
        subtitle: 'View monthly logs, work hours & punch timings',
        category: 'Attendance',
        path: '/employee/attendance',
        icon: Clock,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['attendance', 'history', 'logs', 'hours', 'calendar', 'present', 'absent', 'late', 'records']
      },
      {
        id: 'leaves-apply',
        title: 'Apply For Leave',
        subtitle: 'Submit sick, casual, or earned leave request',
        category: 'Leaves',
        path: '/employee/leaves/apply',
        icon: Calendar,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['apply leave', 'take off', 'sick leave', 'casual leave', 'vacation', 'time off', 'request leave']
      },
      {
        id: 'leaves-overview',
        title: 'My Leaves & Balance',
        subtitle: 'Check leave quota, approvals & history',
        category: 'Leaves',
        path: '/employee/leaves',
        icon: Calendar,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['leaves', 'leave balance', 'leave history', 'quota', 'paid leave', 'casual leave', 'status']
      },
      {
        id: 'payroll-slips',
        title: 'Payslips & Salary',
        subtitle: 'Download monthly salary slips & breakdown',
        category: 'Payroll',
        path: '/employee/payroll',
        icon: Wallet,
        color: 'bg-[#fef7e0] text-[#b06000]',
        keywords: ['payslip', 'salary', 'salary slip', 'compensation', 'earnings', 'deductions', 'payroll', 'wages']
      },
      {
        id: 'expenses-claims',
        title: 'My Expenses & Claims',
        subtitle: 'Submit travel, food & fuel claims',
        category: 'Expenses',
        path: '/employee/expenses',
        icon: Receipt,
        color: 'bg-orange-50 text-orange-600',
        keywords: ['expenses', 'claims', 'reimbursement', 'travel', 'food', 'fuel', 'bills', 'receipts']
      },
      {
        id: 'holidays',
        title: 'Holidays Calendar',
        subtitle: 'Upcoming public, national & company holidays',
        category: 'Holidays',
        path: '/employee/holidays',
        icon: Sparkles,
        color: 'bg-[#f3e8fd] text-[#8430ce]',
        keywords: ['holidays', 'calendar', 'festival', 'public holiday', 'off days', 'company holidays']
      },
      {
        id: 'profile',
        title: 'My Profile & Documents',
        subtitle: 'Personal details, KYC, bank info & badge',
        category: 'Profile',
        path: '/employee/profile',
        icon: User,
        color: 'bg-slate-100 text-slate-700',
        keywords: ['profile', 'documents', 'kyc', 'bank', 'aadhaar', 'pan', 'address', 'account', 'personal']
      },
      {
        id: 'birthdays',
        title: 'Team Birthdays',
        subtitle: 'Upcoming colleague birthdays & celebrations',
        category: 'Team',
        path: '/employee/birthdays',
        icon: Cake,
        color: 'bg-rose-50 text-rose-600',
        keywords: ['birthdays', 'colleagues', 'team', 'celebrations', 'events']
      },
      {
        id: 'performance',
        title: 'My Performance',
        subtitle: 'Attendance benchmarks, metrics & scores',
        category: 'Performance',
        path: '/employee/performance',
        icon: Award,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['performance', 'attendance score', 'on time', 'benchmarks', 'review', 'rating']
      }
    ];

    if (profile?.featureAccess?.canLoanOrigination) {
      items.push({
        id: 'loan-origination',
        title: 'Loan Origination Hub',
        subtitle: 'Manage loan leads, forms & applications',
        category: 'Origination',
        path: '/employee/loans/origination',
        icon: Briefcase,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['loans', 'origination', 'loan leads', 'loan applications', 'credit', 'borrowers']
      });
      items.push({
        id: 'loan-activities',
        title: 'Loan Activities & Schedule',
        subtitle: 'Scheduled loan visits, KYC verifications & tasks',
        category: 'Origination',
        path: '/employee/loans/origination/activities',
        icon: Clock,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['loan activities', 'schedule', 'tasks', 'visit', 'kyc visit', 'followup']
      });
    }

    if (profile?.featureAccess?.canSalesOrigination) {
      items.push({
        id: 'sales-origination',
        title: 'Sales Origination Hub',
        subtitle: 'Sales pipeline, prospective leads & targets',
        category: 'Origination',
        path: '/employee/sales/origination',
        icon: ShoppingBag,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['sales', 'leads', 'origination', 'pipeline', 'prospects', 'clients']
      });
      items.push({
        id: 'sales-activities',
        title: 'Sales Activities & Schedule',
        subtitle: 'Field visits, client meetings & scheduled tasks',
        category: 'Origination',
        path: '/employee/sales/origination/activities',
        icon: Clock,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['sales activities', 'schedule', 'meetings', 'client visit', 'tasks']
      });
    }

    if (profile?.featureAccess?.canBranchOperations) {
      items.push({
        id: 'branch-operations',
        title: 'Branch Operations Hub',
        subtitle: 'Branch team operations, activities & approvals',
        category: 'Operations',
        path: '/employee/branch-operations',
        icon: Building2,
        color: 'bg-[#f3e8fd] text-[#7C4DFF]',
        keywords: ['branch', 'branch operations', 'team', 'approvals', 'office']
      });
    }

    if (hasTrainingVideos) {
      items.push({
        id: 'training-videos',
        title: 'Training & Learning Videos',
        subtitle: 'Watch courses, training modules & onboarding videos',
        category: 'Learning',
        path: '/employee/training',
        icon: Play,
        color: 'bg-[#fce8e6] text-[#d93025]',
        keywords: ['training', 'videos', 'learning', 'courses', 'onboarding', 'skills']
      });
    }

    return items;
  }, [profile, hasTrainingVideos]);

  const filteredPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return searchablePages.slice(0, 6);
    }
    return searchablePages.filter(page => {
      return (
        page.title.toLowerCase().includes(query) ||
        page.subtitle.toLowerCase().includes(query) ||
        page.category.toLowerCase().includes(query) ||
        page.keywords?.some(k => k.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, searchablePages]);

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
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} hrs`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getAttendanceBadge = (status) => {
    if (!status) return { label: 'Not Yet!', className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' };
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
    <div className="space-y-6 pb-4 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Clean White Hero Header & Personal Quick Page Search */}
      <section className="bg-white rounded-3xl p-5 border border-[#e0e3e7] shadow-xs relative z-30 space-y-4">
        {/* Header Greeting & Profile Avatar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#f1f3f4]">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider ml-0.5">
                Employee Portal
              </p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight" style={{ fontWeight: 500 }}>
              Hello, <span className="font-medium italic text-[#1a73e8]">{profile?.firstName || 'Employee'}</span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-0.5">
              {heroSubtitle}
            </p>
          </div>

          <Link
            to="/employee/profile"
            className="w-11 h-11 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs active:scale-95 transition-transform"
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[#1a73e8]">
                {(profile?.firstName || profile?.email || 'E').charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
        </div>

        {/* Page / Feature Navigation Search Bar (Employee Pages & Data Only) */}
        <div ref={searchRef} className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#80868b] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search your pages, leaves, payslips, attendance..."
              className="w-full bg-[#f8fafd] border border-[#dadce0] focus:border-[#1a73e8] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 rounded-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-[#1f1f1f] placeholder:text-[#80868b] outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-[#80868b] hover:text-[#1f1f1f] rounded-full transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Dropdown Results / Suggestions */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#dadce0] shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-[#f1f3f4] [scrollbar-width:thin]">
              <div className="px-3.5 py-2 bg-[#f8fafd] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">
                  {searchQuery.trim() ? `Matching Pages (${filteredPages.length})` : 'Quick Navigation Pages'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-[11px] font-semibold text-[#1a73e8] hover:underline cursor-pointer"
                >
                  Close
                </button>
              </div>

              {filteredPages.length > 0 ? (
                filteredPages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <div
                      key={page.id}
                      onClick={() => {
                        navigate(page.path);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#f8fafd] active:bg-slate-100 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${page.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1f1f1f] group-hover:text-[#1a73e8] transition-colors truncate">
                            {page.title}
                          </p>
                          <p className="text-[10.5px] text-[#5f6368] truncate">
                            {page.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#5f6368] border border-slate-200">
                          {page.category}
                        </span>
                        <ChevronRight size={14} className="text-[#80868b] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-5 text-center text-[#5f6368] space-y-1">
                  <p className="text-xs font-semibold">No pages found matching "{searchQuery}"</p>
                  <p className="text-[11px] text-[#80868b]">Try searching for attendance, leaves, payroll, claims, or origination</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Attendance Tracker */}
      <section className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden relative z-20">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-medium text-slate-900 tracking-tight leading-tight" style={{ fontWeight: 500 }}>
              Attendance <span className="font-medium italic text-[#1a73e8]">Tracker</span>
            </h2>
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
              <h2 className="text-base font-medium text-slate-900 tracking-tight leading-tight" style={{ fontWeight: 500 }}>
                Business <span className="font-medium italic text-[#1a73e8]">Apps</span>
              </h2>
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
              <h2 className="text-lg font-medium text-slate-900 tracking-tight leading-tight" style={{ fontWeight: 500 }}>
                My <span className="font-medium italic text-[#1a73e8]">Expenses</span>
              </h2>
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
              <h2 className="text-lg font-medium text-slate-900 tracking-tight leading-tight" style={{ fontWeight: 500 }}>
                Upcoming <span className="font-medium italic text-[#1a73e8]">Holidays</span>
              </h2>
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
              <h2 className="text-lg font-medium text-slate-900 tracking-tight leading-tight" style={{ fontWeight: 500 }}>
                Upcoming <span className="font-medium italic text-[#1a73e8]">Birthdays</span>
              </h2>
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
