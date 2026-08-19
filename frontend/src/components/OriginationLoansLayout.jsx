import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { LogOut, Home, Briefcase, FileText, Activity, ArrowLeft, Smartphone, Users, Megaphone } from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const OriginationLoansLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [swipePath, setSwipePath] = useState(null);
  const [showBackModal, setShowBackModal] = useState(false);

  const hideBottomNavPatterns = [
    '/employee/loans/form',
    '/employee/loans/view-application',
    '/employee/loans/origination/leads/add',
    /\/employee\/loans\/origination\/leads\/[^/]+\/details/,
    /\/employee\/loans\/origination\/members\/[^/]+\/details/,
  ];
  const shouldHideBottomNav = hideBottomNavPatterns.some((pattern) =>
    typeof pattern === 'string'
      ? location.pathname === pattern || location.pathname.startsWith(`${pattern}/`)
      : pattern.test(location.pathname)
  );

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const navItem = element.closest('[data-nav-path]');
    if (navItem) {
      const path = navItem.getAttribute('data-nav-path');
      if (path && path !== swipePath) {
        setSwipePath(path);
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipePath && swipePath !== location.pathname) {
      navigate(swipePath);
    }
    setSwipePath(null);
  };

  // Fetch live news headlines
  const { data: newsData } = useQuery({
    queryKey: ['newsHeadlines'],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data;
    },
    refetchInterval: 180000, // Poll every 3 minutes (180 seconds)
    staleTime: 180000,
    refetchOnWindowFocus: true,
  });
  const newsHeadlines = newsData?.news_headlines || profile?.news_headlines || [];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navItems = [
    { icon: Activity, label: 'Dashboard', path: '/employee/loans/origination', feature: 'canLoanOrigination' },
    { icon: FileText, label: 'Leads', path: '/employee/loans/origination/leads', feature: 'canLoanOrigination' },
    { icon: Users, label: 'Members', path: '/employee/loans/origination/members', feature: 'canLoanOrigination' },
    { icon: Briefcase, label: 'Applications', path: '/employee/loans/origination/applications', feature: 'canLoanOrigination' },
  ];

  const shapeVariants = {
    animate: (i) => ({
      y: [0, -20, 0],
      x: [0, 15, 0],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 5 + i * 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    })
  };

  return (
    <>
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 flex font-sans text-slate-800 relative z-0">
      
      {/* Global Animated Background Graphics */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden fixed md:absolute print:hidden">
        <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-10 -top-20 -right-20" />
        <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#10B981] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12" />
        <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-96 h-96 bg-[#3B82F6] rounded-full opacity-5 top-1/2 left-1/3" />
        <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#EC4899] rounded-xl opacity-10 top-20 left-10 -rotate-12" />
        <motion.div custom={5} variants={shapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#8B5CF6] rounded-full opacity-10 bottom-20 right-1/4" />

        {/* Additional top-left boxes */}
        <motion.div custom={6} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-40 h-40 bg-[#14B8A6] rounded-2xl opacity-10 top-[-20px] left-[18rem] rotate-45" />
        <motion.div custom={7} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-28 h-28 bg-[#F43F5E] rounded-3xl opacity-10 top-32 left-[24rem] -rotate-12" />
        <motion.div custom={8} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-56 h-56 bg-[#6366F1] rounded-full opacity-[0.06] top-10 left-[35%]" />

        {/* Additional bottom-right boxes */}
        <motion.div custom={9} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-36 h-36 bg-[#EAB308] rounded-2xl opacity-10 bottom-10 right-10 -rotate-12" />
        <motion.div custom={10} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-24 h-24 bg-[#06B6D4] rounded-full opacity-10 bottom-40 right-28 rotate-45" />
      </div>

      {/* Sidebar - Clean, Professional */}
      <aside className="w-[260px] h-screen sticky top-0 bg-white/80 backdrop-blur-md border-r border-slate-200 hidden md:flex flex-col z-20 shadow-sm shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 bg-[#0066FF] rounded flex items-center justify-center text-white mr-3 shrink-0 shadow-sm shadow-[#0066FF]/20">
            <Briefcase size={18} strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap">Loans Origination</span>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">Loan Modules</p>
          <nav className="space-y-1">
            {navItems.filter(item => !item.feature || profile?.featureAccess?.[item.feature]).map((item, idx) => {
              const isFormPage = location.pathname === '/employee/loans/form' || location.pathname.startsWith('/employee/loans/form/');
              const isViewApplicationPage = location.pathname === '/employee/loans/view-application' || location.pathname.startsWith('/employee/loans/view-application/');

              let isActive;
              if (isFormPage && item.label === 'Members') {
                isActive = true;
              } else if (isViewApplicationPage && item.label === 'Applications') {
                isActive = true;
              } else if (isFormPage || isViewApplicationPage) {
                isActive = false;
              } else if (item.path === '/employee/loans/origination') {
                isActive = location.pathname === item.path;
              } else {
                isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              }
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'bg-[#0066FF]/10 text-[#0066FF] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-[#0066FF]' : 'text-slate-400'}`}>
                    <item.icon size={18} />
                  </span>
                  <span className="flex-1 whitespace-nowrap truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200 mt-auto shrink-0">
          <Link
            to="/employee"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="text-slate-400 shrink-0"><ArrowLeft size={18} /></span>
            <span className="flex-1 whitespace-nowrap">Back to HRMS</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-30 bg-transparent">

        {/* Top Header */}
        <header className="h-14 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 hidden md:flex items-center justify-between sticky top-0 z-40 md:relative md:z-10 overflow-hidden">
          <div className="flex items-center gap-4 shrink-0">
            {/* Mobile Back Button */}
            <button
              onClick={() => navigate('/employee')}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            {/* Mobile Profile Avatar */}
            <div className="md:hidden flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-semibold text-sm overflow-hidden border border-slate-200">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.email || 'E').charAt(0).toUpperCase()
                )}
              </div>
            </div>

            {/* Desktop Profile Header Block */}
            <div className="hidden md:flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-semibold text-sm overflow-hidden border border-slate-200">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.email || 'E').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-700 leading-none">
                    {profile?.email?.split('@')[0] || 'Employee'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{profile?.role || 'Employee'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto overscroll-y-contain bg-transparent ${shouldHideBottomNav ? 'pb-6' : 'pb-24'} md:pb-0`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <Outlet />
        </div>
        
        {/* Mobile Bottom Navigation (iOS Liquid Glass) */}
        {!shouldHideBottomNav && (
          <div
            data-mobile-nav="true"
            className="mobile-bottom-nav md:hidden fixed bottom-6 left-4 right-4 z-50 pointer-events-none touch-none select-none transition-all duration-200"
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div className="bg-white/50 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-1.5 flex justify-around items-center pointer-events-auto">
              {/* Back to HRMS Button */}
              <button
                onClick={() => setShowBackModal(true)}
                className="relative flex flex-col items-center justify-center w-[72px] h-[58px] z-10 group"
              >
                <ArrowLeft className="relative z-10 w-6 h-6 mb-0.5 transition-all duration-300 text-slate-500 group-hover:text-slate-600 group-active:scale-95" strokeWidth={2} />
                <span className="relative z-10 text-[10px] font-medium tracking-wide transition-all duration-300 text-slate-500">Back</span>
              </button>

              {navItems.filter(item => !item.feature || profile?.featureAccess?.[item.feature]).map((item, idx) => {
                const currentPath = swipePath || location.pathname;
                const isActive = item.path === '/employee/loans/origination'
                  ? currentPath === item.path
                  : (currentPath === item.path || currentPath.startsWith(`${item.path}/`));
                
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.path || idx}
                    to={item.path}
                    data-nav-path={item.path}
                    onClick={(e) => {
                      if (swipePath) e.preventDefault();
                    }}
                    className="relative flex flex-col items-center justify-center w-[72px] h-[58px] z-10 group"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="loansMobileNavBubble"
                        className="absolute inset-0 z-[-1] rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.06)] bg-white/40 backdrop-blur-xl border border-white/80 overflow-hidden"
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                      />
                    )}
                    <Icon className={`relative z-10 w-6 h-6 mb-0.5 transition-all duration-300 ${isActive ? 'text-[#0066FF] scale-105' : 'text-slate-500 group-hover:text-slate-600 group-active:scale-95'}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`relative z-10 text-[10px] text-center leading-tight font-medium tracking-wide transition-all duration-300 max-w-[62px] w-full truncate block ${isActive ? 'text-[#0066FF] font-semibold' : 'text-slate-500'}`} title={item.label}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>

    {/* Back to HRMS Confirmation Modal */}
    <AnimatePresence>
      {showBackModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBackModal(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%', scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: '100%', scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) {
                setShowBackModal(false);
              }
            }}
            className="bg-white w-full max-w-sm rounded-[24px] sm:rounded-2xl p-6 shadow-2xl relative z-10 mb-4 sm:mb-0"
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#0066FF]/10 text-[#0066FF] rounded-full flex items-center justify-center mb-4 ring-4 ring-[#0066FF]/20">
                <ArrowLeft size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Back to HRMS</h3>
              <p className="text-slate-500 text-sm mb-6 px-2">
                Are you sure you want to return to the main HRMS application?
              </p>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowBackModal(false)}
                  className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowBackModal(false);
                    navigate('/employee');
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-white bg-[#0066FF] hover:bg-[#0052cc] transition-colors shadow-sm shadow-[#0066FF]/20"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <style>{`
      .orientation-warning {
        display: none;
      }
      @media (orientation: landscape) and (max-width: 1024px) {
        .orientation-warning {
          display: flex;
        }
      }
    `}</style>

    {/* Landscape Orientation Warning Overlay for Mobile/Tablet */}
    <div className="orientation-warning fixed inset-0 z-[9999] flex-col items-center justify-center bg-slate-50 p-6 text-center select-none">
      <div className="relative mb-6">
        {/* Animated phone rotation container */}
        <div className="w-20 h-20 border border-dashed border-slate-300 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite]">
          <Smartphone className="w-8 h-8 text-[#ff2d55] opacity-20" />
        </div>
        {/* Main phone rotation icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: [0, -90, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Smartphone className="w-10 h-10 text-slate-800" />
          </motion.div>
        </div>
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wide">Rotate your device</h3>
      <p className="text-slate-500 text-sm max-w-xs font-medium leading-relaxed">
        Please rotate your screen back to portrait orientation for the best Acme HRMS experience.
      </p>
    </div>
    </>
  );
};

export default OriginationLoansLayout;
