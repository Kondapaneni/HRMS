import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { 
  TrendingUp, 
  Users, 
  ArrowLeft, 
  Smartphone, 
  Activity, 
  LogOut, 
  Megaphone,
  ChevronLeft,
  ShoppingBag
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LogoutModal from './LogoutModal';

const OriginationSalesLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [swipePath, setSwipePath] = useState(null);
  const [showBackModal, setShowBackModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const hideBottomNavPatterns = [
    '/employee/sales/origination/leads/add',
    '/employee/sales/origination/leads/details',
    '/employee/sales/origination/members/details',
    '/employee/sales/form',
  ];
  const shouldHideBottomNav = hideBottomNavPatterns.some((pattern) =>
    typeof pattern === 'string'
      ? location.pathname === pattern || location.pathname.startsWith(`${pattern}/`)
      : pattern.test(location.pathname)
  );

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

  // Fetch live news headlines & maintenance status
  const { data: newsData } = useQuery({
    queryKey: ['newsHeadlines'],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });
  const newsHeadlines = newsData?.news_headlines || profile?.news_headlines || [];

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
    { 
      icon: <Activity size={15} />, 
      label: 'Dashboard', 
      path: '/employee/sales/origination' 
    },
    { 
      icon: <TrendingUp size={15} />, 
      label: 'Leads', 
      path: '/employee/sales/origination/leads',
      activePaths: [
        '/employee/sales/origination/leads/add',
        '/employee/sales/origination/leads/details'
      ] 
    },
    { 
      icon: <Users size={15} />, 
      label: 'Members', 
      path: '/employee/sales/origination/members',
      activePaths: [
        '/employee/sales/origination/members/details',
        '/employee/sales/form'
      ] 
    },
  ];

  return (
    <>
      <div className="h-[100dvh] w-full overflow-hidden bg-[#f8fafd] flex font-sans text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] antialiased relative z-0">
        
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
        <aside className="w-[215px] h-full bg-white border-r border-[#e0e3e7] hidden md:flex flex-col z-20 relative shrink-0 shadow-none">
          {/* Brand Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#f1f3f4] shrink-0 mt-0.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-[#1f1f1f]">Acme</span>
                <span className="text-lg font-semibold tracking-tight text-[#4285F4]">Sales</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-medium text-[#5f6368] ml-1">Sales Origination Hub</span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-2 overflow-y-auto flex-1 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5 px-2.5 whitespace-nowrap">
              Sales Modules
            </p>
            <nav className="space-y-0.5">
              {navItems.map((item, idx) => {
                const isActive = item.activePaths 
                  ? item.activePaths.some(p => location.pathname.startsWith(p)) || location.pathname === item.path
                  : location.pathname === item.path;

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

          {/* Bottom Actions */}
          <div className="p-2.5 border-t border-[#f1f3f4] bg-white space-y-1">
            <Link
              to="/employee"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#444746] rounded-full hover:bg-[#f1f3f4] hover:text-[#1f1f1f] transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} className="text-[#5f6368]" />
              <span className="text-[11.5px]">Back to HRMS</span>
            </Link>

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
        <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-10 bg-transparent min-w-0">
          {/* Top Header */}
          <header className="h-14 bg-white border-b border-[#e0e3e7] px-4 sm:px-5 flex items-center justify-between z-10 shrink-0 relative">
            <div className="flex items-center gap-3 shrink-0">
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
                      {(profile?.firstName || profile?.name || profile?.email || 'E').charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile Center: Acme Sales with 4 Google dots */}
            <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-auto">
              <Link to="/employee/sales/origination" className="flex items-center gap-1.5 shrink-0">
                <span className="text-base font-bold tracking-tight text-[#1f1f1f]">Acme</span>
                <span className="text-base font-semibold tracking-tight text-[#4285F4]">Sales</span>
                <div className="flex items-center gap-0.5 ml-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                </div>
              </Link>
            </div>

            {/* Scrolling News Ticker (Desktop Google Pill) */}
            {newsHeadlines && newsHeadlines.length > 0 && (
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
                      {Array(4).fill(newsHeadlines.join("   •   ")).join("   •   ")}
                    </span>
                    <span className="text-[#1f1f1f] tracking-wide pr-10">
                      {Array(4).fill(newsHeadlines.join("   •   ")).join("   •   ")}
                    </span>
                  </motion.div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 shrink-0">
              {/* Desktop Profile Pill */}
              <div className="hidden md:flex items-center gap-2.5 select-none bg-[#f8fafd] border border-[#e0e3e7] pl-1.5 pr-3 py-1 rounded-full">
                <div className="w-7 h-7 bg-[#e8f0fe] text-[#1a73e8] rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border border-[#d2e3fc]">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.firstName || profile?.name || profile?.email || 'E').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-[#1f1f1f] leading-none">
                    {profile?.name || profile?.email?.split('@')[0] || 'Employee'}
                  </p>
                  <p className="text-[10px] text-[#5f6368] mt-0.5 capitalize">{profile?.role || 'Sales Officer'}</p>
                </div>
              </div>

              {/* Mobile Right Side Actions */}
              <div className="flex md:hidden items-center">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-1.5 rounded-full text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

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
                {/* Back to HRMS Button */}
                <button
                  type="button"
                  onClick={() => setShowBackModal(true)}
                  className="relative flex flex-col items-center justify-center flex-1 h-[52px] z-10 group cursor-pointer active:scale-95 transition-transform duration-100"
                >
                  <ArrowLeft className="relative z-10 w-5 h-5 mb-0.5 text-[#5f6368]" />
                  <span className="relative z-10 text-[10px] font-semibold tracking-wide text-[#5f6368]">HRMS</span>
                </button>

                {[
                  { label: 'Dashboard', icon: Activity, path: '/employee/sales/origination' },
                  { label: 'Leads', icon: TrendingUp, path: '/employee/sales/origination/leads' },
                  { label: 'Members', icon: Users, path: '/employee/sales/origination/members' },
                ].map((item) => {
                  const currentPath = swipePath || location.pathname;
                  const isDashboard = item.path === '/employee/sales/origination';
                  const isOtherTab = currentPath.startsWith('/employee/sales/origination/leads') || currentPath.startsWith('/employee/sales/origination/members');
                  const isActive = isDashboard 
                    ? (currentPath === '/employee/sales/origination' || !isOtherTab) 
                    : (currentPath === item.path || (!swipePath && currentPath.startsWith(item.path)));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-nav-path={item.path}
                      onClick={(e) => {
                        if (swipePath) e.preventDefault();
                      }}
                      className="relative flex flex-col items-center justify-center flex-1 h-[52px] z-10 group cursor-pointer active:scale-95 transition-transform duration-100"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="salesMobileNavBubble"
                          className="absolute inset-0 z-[-1] rounded-full bg-[#c2e7ff]/70 border border-[#b2d7ff]/80 shadow-2xs"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                        />
                      )}
                      <Icon className={`relative z-10 w-5 h-5 mb-0.5 transition-colors duration-150 ${isActive ? 'text-[#001d35] scale-105' : 'text-[#5f6368]'}`} />
                      <span className={`relative z-10 text-[10px] font-semibold tracking-wide transition-colors duration-150 ${isActive ? 'text-[#001d35]' : 'text-[#5f6368]'}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Back to HRMS Confirmation Modal */}
      {showBackModal && createPortal(
        <div 
          onClick={() => setShowBackModal(false)}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-center"
            >
              {/* Top Icon Badge */}
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                <ArrowLeft className="w-7 h-7" />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Back to HRMS Dashboard?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Return to the main Employee Workspace and attendance portal.
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBackModal(false)}
                  className="w-full py-3.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBackModal(false);
                    navigate('/employee');
                  }}
                  className="w-full py-3.5 px-4 rounded-full text-white text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-95 bg-[#1a73e8] hover:bg-[#1557b0]"
                >
                  Yes, Return
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {/* Global Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        isLoading={loggingOut}
      />

      {/* Landscape Orientation Warning Overlay */}
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
      <div className="orientation-warning fixed inset-0 z-[9999] flex-col items-center justify-center bg-white/95 backdrop-blur-xl p-6 text-center select-none">
        <div className="relative mb-5">
          <div className="w-20 h-20 border border-dashed border-[#4285F4]/40 bg-[#e8f0fe]/60 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite]">
            <Smartphone className="w-8 h-8 text-[#4285F4] opacity-30" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, -90, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Smartphone className="w-10 h-10 text-[#1a73e8]" />
            </motion.div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
            Display Orientation
          </span>
        </div>

        <h3 className="text-xl font-bold text-[#1f1f1f] mb-1">Rotate your device</h3>
        <p className="text-[#5f6368] text-xs max-w-xs font-medium leading-relaxed">
          Please rotate your screen back to portrait orientation for the best Acme HRMS experience.
        </p>
      </div>
    </>
  );
};

export default OriginationSalesLayout;
