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
      label: 'Sales Leads', 
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
        '/employee/sales/origination/members/details'
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

          {/* Navigation Links */}
          <div className="px-2.5 py-4 overflow-y-auto flex-1 custom-scrollbar">
            <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-2 px-3">
              Sales Modules
            </p>
            <nav className="space-y-1">
              {navItems.map((item, idx) => {
                const isActive = item.activePaths 
                  ? item.activePaths.some(p => location.pathname.startsWith(p)) || location.pathname === item.path
                  : location.pathname === item.path;

                return (
                  <Link
                    key={idx}
                    to={item.path}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all relative ${
                      isActive
                        ? 'bg-[#c2e7ff] text-[#001d35] shadow-2xs font-semibold'
                        : 'text-[#444746] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-[#001d35]' : 'text-[#5f6368]'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-[#f1f3f4] mt-auto space-y-1 bg-white">
            <button
              type="button"
              onClick={() => setShowBackModal(true)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-medium text-[#444746] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] transition-all cursor-pointer text-left"
            >
              <ArrowLeft size={15} className="text-[#5f6368] shrink-0" />
              <span className="truncate">Back to HRMS</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-medium text-[#c5221f] hover:bg-[#fce8e6] transition-all cursor-pointer text-left"
            >
              <LogOut size={15} className="text-[#c5221f] shrink-0" />
              <span className="truncate">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-10 bg-transparent min-w-0">
          {/* Top Header */}
          <header className="h-14 shrink-0 bg-white/80 backdrop-blur-md border-b border-[#e0e3e7] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 overflow-hidden">
            {/* Left Header / Mobile Brand */}
            <div className="flex items-center gap-3">
              <div className="md:hidden flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                  <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
                  <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
                  <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                </div>
                <span className="font-bold text-sm text-[#1f1f1f]">Acme</span>
                <span className="font-semibold text-sm text-[#4285F4]">Sales</span>
              </div>

              {/* News Announcements Marquee */}
              {newsHeadlines && newsHeadlines.length > 0 && (
                <div className="hidden lg:flex items-center gap-2 bg-[#f8fafd] border border-[#dadce0] rounded-full px-3 py-1 text-xs text-[#444746] max-w-lg overflow-hidden">
                  <Megaphone size={13} className="text-[#1a73e8] shrink-0" />
                  <span className="font-semibold text-[#1a73e8] text-[11px] shrink-0">ANNOUNCEMENT:</span>
                  <div className="overflow-hidden whitespace-nowrap">
                    <span className="inline-block animate-marquee text-[11px]">
                      {newsHeadlines.map((h, i) => (
                        <span key={i} className="mr-6">
                          {typeof h === 'string' ? h : h.text || h.headline || ''}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Profile & Info */}
            <div className="flex items-center gap-3">
              {/* User Profile Pill Card */}
              <div className="flex items-center gap-2 bg-[#f8fafd] border border-[#dadce0] rounded-full pl-1.5 pr-3 py-1 shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs flex items-center justify-center border border-[#d2e3fc]">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : (profile?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#1f1f1f] leading-none">
                    {profile?.name || profile?.email?.split('@')[0] || 'Employee'}
                  </span>
                  <span className="text-[10px] text-[#5f6368] font-medium leading-tight capitalize">
                    {profile?.role || 'Sales Officer'}
                  </span>
                </div>
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBackModal(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm bg-white rounded-3xl border border-[#e0e3e7] shadow-2xl overflow-hidden relative z-10 flex flex-col"
          >
            {/* Top 4-Color Gradient Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc] text-[#1a73e8] flex items-center justify-center mx-auto shadow-2xs">
                <ArrowLeft className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#1f1f1f] tracking-tight">
                  Back to HRMS Dashboard?
                </h3>
                <p className="text-xs text-[#5f6368] leading-relaxed">
                  Return to the main Employee Workspace and attendance portal.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBackModal(false)}
                  className="flex-1 py-3 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBackModal(false);
                    navigate('/employee');
                  }}
                  className="flex-1 py-3 px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Return to HRMS
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Google Material 3 Logout Confirmation Modal (createPortal) */}
      {showLogoutModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loggingOut && setShowLogoutModal(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm bg-white rounded-3xl border border-[#e0e3e7] shadow-2xl overflow-hidden relative z-10 flex flex-col"
          >
            {/* Top 4-Color Gradient Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] border border-[#fad2cf] text-[#d93025] flex items-center justify-center mx-auto shadow-2xs">
                <LogOut className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#1f1f1f] tracking-tight">
                  Sign out of your account?
                </h3>
                <p className="text-xs text-[#5f6368] leading-relaxed">
                  Are you sure you want to end your session? You will need to sign in again to access the portal.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  disabled={loggingOut}
                  className="flex-1 py-3 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  disabled={loggingOut}
                  className="flex-1 py-3 px-4 rounded-full bg-[#d93025] hover:bg-[#b3261e] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loggingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Signing Out...</span>
                    </>
                  ) : (
                    <span>Sign Out</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

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
