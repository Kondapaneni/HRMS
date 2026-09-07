import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut, User, Calendar, Users, Briefcase, Monitor,
  Home, Clock, BarChart2, DollarSign, Activity, Bell, Search, Menu, Wallet,
  Award, Megaphone, Play, Palmtree, Terminal, ShieldCheck, Building2, ShoppingBag,
  Sparkles, X, Smartphone, Download
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import MaintenanceOverlay from './MaintenanceOverlay';
import LogoutModal from './LogoutModal';
import api, { isNativeApp, isIOS } from '../api/axios';
import GlobalSearch from './GlobalSearch';

const EmployeeLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [swipePath, setSwipePath] = useState(null);
  const [isDevBypassed, setIsDevBypassed] = useState(() => localStorage.getItem('dev_bypass_maintenance_session') === 'true');
  
  const [forceHideBottomNav, setForceHideBottomNav] = useState(false);

  useEffect(() => {
    const handleToggle = (e) => {
      setForceHideBottomNav(!!e.detail);
    };
    window.addEventListener('toggle-mobile-bottom-nav', handleToggle);
    return () => window.removeEventListener('toggle-mobile-bottom-nav', handleToggle);
  }, []);

  const hideBottomNavRoutes = ['/employee/leaves/apply', '/employee/profile/edit', '/employee/expenses/claim'];
  const shouldHideBottomNav = forceHideBottomNav || hideBottomNavRoutes.some(p => location.pathname === p || location.pathname.startsWith(`${p}/`));

  const scrollContainerRef = useRef(null);
  const swipeRafRef = useRef(null);
  const lastSwipePathRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  const handleExitBypass = () => {
    localStorage.removeItem('dev_bypass_maintenance_session');
    setIsDevBypassed(false);
  };

  const handleTouchMove = (e) => {
    if (swipeRafRef.current) return;
    swipeRafRef.current = requestAnimationFrame(() => {
      swipeRafRef.current = null;
      const touch = e.touches?.[0];
      if (!touch) return;
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!element) return;
      const navItem = element.closest('[data-nav-path]');
      if (navItem) {
        const path = navItem.getAttribute('data-nav-path');
        if (path && path !== lastSwipePathRef.current) {
          lastSwipePathRef.current = path;
          setSwipePath(path);
        }
      }
    });
  };

  const handleTouchEnd = () => {
    if (swipeRafRef.current) {
      cancelAnimationFrame(swipeRafRef.current);
      swipeRafRef.current = null;
    }
    const target = lastSwipePathRef.current;
    if (target && target !== location.pathname) {
      navigate(target);
    }
    lastSwipePathRef.current = null;
    setSwipePath(null);
  };

  useEffect(() => {
    if (showLogoutModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLogoutModal]);

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const navItems = [
    { icon: <Home size={15} />, label: 'Dashboard', path: '/employee' },
    { icon: <User size={15} />, label: 'My Profile', path: '/employee/profile', activePaths: ['/employee/profile'] },
    { icon: <Clock size={15} />, label: 'Attendance', path: '/employee/attendance' },
    { icon: <Calendar size={15} />, label: 'Leaves', path: '/employee/leaves', activePaths: ['/employee/leaves'] },
    { icon: <Palmtree size={15} />, label: 'Company Holidays', path: '/employee/holidays' },
    { icon: <Wallet size={15} />, label: 'Payroll', path: '/employee/payroll' },
    { icon: <DollarSign size={15} />, label: 'Expenses', path: '/employee/expenses' },
    { icon: <BarChart2 size={15} />, label: 'Performance', path: '/employee/performance' },
  ];

  const businessApps = [
    { icon: <Briefcase size={15} />, label: 'Loans Origination', path: '/employee/loans/origination', feature: 'canLoanOrigination' },
    { icon: <ShoppingBag size={15} />, label: 'Sales Origination', path: '/employee/sales/origination', feature: 'canSalesOrigination' },
    { icon: <Building2 size={15} />, label: 'Branch Operations', path: '/employee/branch-operations', feature: 'canBranchOperations' },
    { icon: <Award size={15} />, label: 'Assessments', path: '/employee/assessments', isAssessment: true },
    { icon: <Play size={15} />, label: 'Training Videos', path: '/employee/training', isTraining: true },
  ];

  // Automatically check if an assessment is scheduled for TODAY for the current employee
  const { data: employeeAssessments = [] } = useQuery({
    queryKey: ['employeeAssessmentsList'],
    queryFn: async () => {
      try {
        const res = await api.get('/employee/assessments');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Automatically check if training videos are assigned to the current employee
  const { data: employeeTrainingVideos = [] } = useQuery({
    queryKey: ['employeeTrainingVideosList'],
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

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const hasAssessmentToday = useMemo(() => {
    return Array.isArray(employeeAssessments) && employeeAssessments.some(a => a.assessment_date && a.assessment_date === todayStr);
  }, [employeeAssessments, todayStr]);

  const hasTrainingVideos = useMemo(() => {
    return Array.isArray(employeeTrainingVideos) && employeeTrainingVideos.length > 0;
  }, [employeeTrainingVideos]);

  const visibleBusinessApps = useMemo(() => {
    return businessApps.filter(item => {
      if (item.isAssessment) {
        return profile?.role === 'admin' || hasAssessmentToday;
      }
      if (item.isTraining) {
        return profile?.role === 'admin' || hasTrainingVideos;
      }
      return !item.feature || profile?.featureAccess?.[item.feature];
    });
  }, [businessApps, profile, hasAssessmentToday, hasTrainingVideos]);

  // Fetch live news headlines & maintenance status
  const { data: newsData } = useQuery({
    queryKey: ['newsHeadlines'],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15 seconds for near-instant maintenance mode detection
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });
  const newsHeadlines = newsData?.news_headlines || profile?.news_headlines || [];
  const isMaintenanceMode = newsData?.maintenance_mode === true;
  const maintenanceMessage = newsData?.maintenance_message;
  const showMaintenanceOverlay = isMaintenanceMode && !isDevBypassed;

  const adminFeatures = [
    { icon: <Users size={15} />, label: 'Employees', path: '/admin/employees', feature: 'canEmployees', activePaths: ['/admin/employees', '/admin/directory'] },
    { icon: <Clock size={15} />, label: 'Attendance', path: '/admin/attendance', feature: 'canAttendance', activePaths: ['/admin/attendance'] },
    { icon: <Calendar size={15} />, label: 'Leave Management', path: '/admin/leaves', feature: 'canLeave', activePaths: ['/admin/leaves'] },
    { icon: <Wallet size={15} />, label: 'Payroll', path: '/admin/payroll', feature: 'canPayroll', activePaths: ['/admin/payroll'] },
    { icon: <Monitor size={15} />, label: 'Assets', path: '/admin/assets', feature: 'canAssets', activePaths: ['/admin/assets'] },
    { icon: <Briefcase size={15} />, label: 'Recruitment', path: '/admin/recruitment', feature: 'canRecruitment', activePaths: ['/admin/recruitment'] },
    { icon: <Award size={15} />, label: 'Assessment and Training', path: '/admin/assessments', feature: 'canAdminAssessments', activePaths: ['/admin/assessments'] },
  ];

  const visibleAdminFeatures = profile?.featureAccess ? adminFeatures.filter(f => profile.featureAccess[f.feature]) : [];

  return (
    <>
      {showMaintenanceOverlay && (
        <MaintenanceOverlay 
          message={maintenanceMessage} 
          onBypassSuccess={() => setIsDevBypassed(true)} 
        />
      )}

      {/* Floating Developer Bypass Badge */}
      {isMaintenanceMode && isDevBypassed && (
        <motion.div 
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed top-3 right-3 sm:right-6 z-[95] bg-[#1f1f1f]/95 backdrop-blur-md text-white px-3 sm:px-4 py-1.5 rounded-full border border-white/10 shadow-xl flex items-center gap-2 sm:gap-3 text-xs font-semibold max-w-[calc(100vw-1.5rem)]"
        >
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34A853] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34A853]"></span>
            </span>
            <Terminal size={14} className="text-[#34A853] shrink-0" />
            <span className="hidden sm:inline text-white">Dev Bypass Active</span>
            <span className="sm:hidden text-white text-[11px]">Dev Bypass</span>
            <span className="hidden md:inline text-[10px] px-2 py-0.5 bg-[#FBBC05]/20 text-[#FBBC05] rounded-full font-medium border border-[#FBBC05]/30">
              Maintenance ON
            </span>
          </div>

          <button 
            onClick={handleExitBypass}
            className="bg-[#EA4335]/20 hover:bg-[#EA4335]/30 text-[#EA4335] border border-[#EA4335]/30 px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer text-[11px] shrink-0 active:scale-95"
          >
            Exit
          </button>
        </motion.div>
      )}

      <div className="h-[100dvh] w-full overflow-hidden bg-[#f8fafd] flex font-editorial text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] antialiased relative z-0" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

        {/* Google Ambient Multi-color Background Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4285F4]/10 rounded-full blur-3xl" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EA4335]/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-[#FBBC05]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#34A853]/8 rounded-full blur-3xl" />
        </div>

        {/* Top Full-Width 4-Color Google Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0 right-0 z-50 pointer-events-none" />

        {/* Google Material 3 Left Sidebar (w-[215px]) */}
        <aside className="w-[215px] h-full bg-white border-r border-[#e0e3e7] hidden md:flex flex-col z-20 relative shrink-0 shadow-none font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
          {/* Brand Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#f1f3f4] shrink-0 mt-0.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-medium tracking-tight text-[#1f1f1f]">Acme</span>
                <span className="text-xl font-medium italic tracking-tight text-[#4285F4]">HRMS</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-medium text-[#5f6368] ml-1">Employee Workspace</span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-2 overflow-y-auto flex-1 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5 px-2.5 whitespace-nowrap">
              My Workspace
            </p>
            <nav className="space-y-0.5">
              {navItems.filter(item => !item.feature || profile?.featureAccess?.[item.feature]).map((item, idx) => {
                const isActive = location.pathname === item.path || (item.activePaths && item.activePaths.some(p => location.pathname === p || location.pathname.startsWith(`${p}/`)));
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                      isActive 
                        ? 'bg-[#c2e7ff]/70 text-[#001d35] font-semibold shadow-xs' 
                        : 'text-[#444746] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] font-medium'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>{item.icon}</span>
                    <span className="flex-1 whitespace-nowrap truncate text-[11.5px]">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {visibleBusinessApps.length > 0 && (
              <div className="pt-3 mt-3 border-t border-[#f1f3f4]">
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] whitespace-nowrap">
                  Business Apps
                </p>
                <nav className="space-y-0.5">
                  {visibleBusinessApps.map((item, idx) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Link
                        key={idx}
                        to={item.path}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                          isActive 
                            ? 'bg-[#c2e7ff]/70 text-[#001d35] font-semibold shadow-xs' 
                            : 'text-[#444746] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] font-medium'
                        }`}
                      >
                        <span className={`shrink-0 ${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>{item.icon}</span>
                        <span className="flex-1 whitespace-nowrap truncate text-[11.5px]">{item.label}</span>
                        {item.isAssessment && hasAssessmentToday && (
                          <span className="w-2 h-2 rounded-full bg-[#EA4335] animate-pulse" title="Assessment scheduled for today" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}

            {visibleAdminFeatures.length > 0 && (
              <div className="pt-3 mt-3 border-t border-[#f1f3f4]">
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] whitespace-nowrap">
                  Manager Portal
                </p>
                <nav className="space-y-0.5">
                  {visibleAdminFeatures.map((item, idx) => {
                    const isActive = item.activePaths.some(p => location.pathname === p || location.pathname.startsWith(`${p}/`));
                    return (
                      <Link
                        key={idx}
                        to={item.path}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                          isActive 
                            ? 'bg-[#c2e7ff]/70 text-[#001d35] font-semibold shadow-xs' 
                            : 'text-[#444746] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] font-medium'
                        }`}
                      >
                        <span className={`shrink-0 ${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>{item.icon}</span>
                        <span className="flex-1 whitespace-nowrap truncate text-[11.5px]">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="p-2.5 border-t border-[#f1f3f4] bg-white space-y-1">
            {!isNativeApp && !isIOS && (
              <a
                href="/downloads/Acme%20HRMS.apk"
                download="Acme HRMS.apk"
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] rounded-full hover:bg-[#d2e3fc] transition-all shadow-2xs group cursor-pointer"
                title="Download Acme HRMS Mobile App (APK)"
              >
                <Smartphone size={14} className="text-[#1a73e8] shrink-0" />
                <span className="text-[11px] truncate flex-1">Download App</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#5f6368] rounded-full hover:bg-[#fce8e6] hover:text-[#d93025] transition-colors cursor-pointer"
            >
              <LogOut size={15} className="text-[#5f6368]" />
              <span className="text-[11.5px]">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-10 bg-transparent">

          {/* Top Header */}
          <header className="h-14 bg-white border-b border-[#e0e3e7] px-4 sm:px-5 flex items-center justify-between z-10 shrink-0 relative">
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:block">
                {profile?.featureAccess?.canEmployees && <GlobalSearch />}
              </div>
              
              {/* Mobile Left Edge: Profile Avatar */}
              <div className="md:hidden flex items-center">
                <Link
                  to="/employee/profile"
                  className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                >
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-[#1a73e8]">
                      {(profile?.firstName || profile?.email || 'E').charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile Center: Acme HRMS with 4 Google dots */}
            <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-auto">
              <Link to="/employee" className="flex items-center gap-1.5 shrink-0">
                <span className="text-base font-medium tracking-tight text-[#1f1f1f]">Acme</span>
                <span className="text-base font-medium italic tracking-tight text-[#4285F4]">HRMS</span>
                <div className="flex items-center gap-0.5 ml-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                </div>
              </Link>
            </div>

            {/* Scrolling News Ticker (Desktop Google Pill) */}
            {newsHeadlines.length > 0 && (
              <div className="hidden md:flex flex-1 mx-6 overflow-hidden items-center text-xs font-medium text-[#1f1f1f] bg-[#f8fafd] rounded-full h-8 px-4 border border-[#e0e3e7] shadow-2xs relative group">
                <Megaphone size={14} className="text-[#1a73e8] mr-2.5 shrink-0" />
                <div className="flex-1 overflow-hidden relative h-full flex items-center">
                  <motion.div
                    key={newsHeadlines.join(" • ")}
                    className="flex whitespace-nowrap"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ repeat: Infinity, duration: Math.max(30, newsHeadlines.join("   •   ").length * 0.5), ease: "linear" }}
                  >
                    <span className="text-[#1f1f1f] tracking-wide pr-10">
                      {Array(4).fill(newsHeadlines.join("   •   ")).join("   •   ")}
                    </span>
                    <span className="text-[#1f1f1f] tracking-wide pr-10">
                      {Array(4).fill(newsHeadlines.join("   •   ")).join("   •   ")}
                    </span>
                  </motion.div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 shrink-0">
              {/* Desktop Profile Pill */}
              <div className="hidden md:flex items-center gap-2.5 select-none bg-[#f8fafd] border border-[#e0e3e7] pl-1.5 pr-3 py-1 rounded-full font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
                <div className="w-7 h-7 bg-[#e8f0fe] text-[#1a73e8] rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border border-[#d2e3fc]">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.email || 'E').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-[#1f1f1f] leading-none">
                    <span className="italic text-[#1a73e8]">{profile?.email?.split('@')[0] || 'Employee'}</span>
                  </p>
                  <p className="text-[10px] text-[#5f6368] mt-0.5 capitalize">{profile?.role || 'Employee'}</p>
                </div>
              </div>

              {/* Mobile Right Side Actions */}
              <div className="flex md:hidden items-center">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2.5 rounded-full text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] transition-colors cursor-pointer active:scale-95"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Scrolling News Ticker */}
          {newsHeadlines.length > 0 && (
            <div className="md:hidden shrink-0 bg-[#f8fafd] border-b border-[#e0e3e7] px-4 py-2 flex items-center overflow-hidden">
              <Megaphone size={13} className="text-[#1a73e8] mr-2 shrink-0" />
              <div className="flex-1 overflow-hidden relative h-5 flex items-center text-xs font-medium text-[#1f1f1f]">
                <motion.div
                  key={newsHeadlines.join(" • ")}
                  className="flex whitespace-nowrap"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ repeat: Infinity, duration: Math.max(30, newsHeadlines.join("   •   ").length * 0.5), ease: "linear" }}
                >
                  <span className="tracking-wide pr-10">
                    {Array(4).fill(newsHeadlines.join("   •   ")).join("   •   ")}
                  </span>
                  <span className="tracking-wide pr-10">
                    {Array(4).fill(newsHeadlines.join("   •   ")).join("   •   ")}
                  </span>
                </motion.div>
              </div>
            </div>
          )}

          {/* Dynamic Page Content */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 ${shouldHideBottomNav ? 'pb-6' : 'pb-[96px]'} md:pb-6`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <Outlet />
          </div>

          {/* Mobile Bottom Navigation (Google Material 3 Floating Pill Dock) */}
          {!shouldHideBottomNav && (
            <div
              className="mobile-bottom-nav md:hidden fixed bottom-4 left-4 right-4 z-50 select-none"
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div className="bg-white/90 backdrop-blur-2xl border border-[#e0e3e7] shadow-lg rounded-full p-1.5 flex justify-around items-center" style={{ willChange: 'transform' }}>
                {[
                  { label: 'Home', icon: Home, path: '/employee' },
                  { label: 'Attendance', icon: Clock, path: '/employee/attendance' },
                  { label: 'Leaves', icon: Calendar, path: '/employee/leaves' },
                  { label: 'Payroll', icon: Wallet, path: '/employee/payroll' },
                  { label: 'Profile', icon: User, path: '/employee/profile' }
                ].map((item) => {
                  const currentPath = swipePath || location.pathname;
                  const isHome = item.path === '/employee';
                  const isOtherTab = ['/employee/attendance', '/employee/leaves', '/employee/payroll', '/employee/profile'].some(p => currentPath.startsWith(p));
                  const isActive = isHome 
                    ? (currentPath === '/employee' || !isOtherTab) 
                    : (currentPath === item.path || (!swipePath && currentPath.startsWith(item.path)));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-nav-path={item.path}
                      onClick={(e) => { if (swipePath) e.preventDefault(); }}
                      className="relative flex flex-col items-center justify-center flex-1 h-[52px] z-10 group cursor-pointer active:scale-95 transition-transform duration-100"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="mobileNavBubble"
                          className="absolute inset-0 z-[-1] rounded-full bg-[#c2e7ff]/70 border border-[#b2d7ff]/80 shadow-2xs"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                        />
                      )}
                      <Icon className={`relative z-10 w-5 h-5 mb-0.5 transition-colors duration-150 ${isActive ? 'text-[#001d35] scale-105' : 'text-[#5f6368]'}`} />
                      <span className={`relative z-10 text-[10px] font-semibold tracking-wide transition-colors duration-150 ${isActive ? 'text-[#001d35]' : 'text-[#5f6368]'}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </main>

        {/* Global Logout Modal */}
        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
          isLoading={loggingOut}
        />

      </div>
    </>
  );
};

export default EmployeeLayout;
