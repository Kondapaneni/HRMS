import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  Home,
  Briefcase,
  FileText,
  User,
  Folder,
  Compass,
  FileCheck,
  Megaphone,
  Sparkles,
  Terminal
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import LogoutModal from './LogoutModal';
import MaintenanceOverlay from './MaintenanceOverlay';
import api from '../api/axios';

const CandidateLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [swipePath, setSwipePath] = useState(null);
  const [isDevBypassed, setIsDevBypassed] = useState(() => localStorage.getItem('dev_bypass_maintenance_session') === 'true');
  const [forceHideBottomNav, setForceHideBottomNav] = useState(false);

  const scrollContainerRef = useRef(null);
  const swipeRafRef = useRef(null);
  const lastSwipePathRef = useRef(null);

  useEffect(() => {
    const handleToggle = (e) => {
      setForceHideBottomNav(!!e.detail);
    };
    window.addEventListener('toggle-mobile-bottom-nav', handleToggle);
    return () => window.removeEventListener('toggle-mobile-bottom-nav', handleToggle);
  }, []);

  const hideBottomNavRoutes = ['/candidate/profile/edit'];
  const shouldHideBottomNav = forceHideBottomNav || hideBottomNavRoutes.some(p => location.pathname === p || location.pathname.startsWith(`${p}/`));

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

  const { data: profileData } = useQuery({
    queryKey: ['candidate', 'profile', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('candidate_profiles')
        .select('avatar_url, documents_tab_seen_at')
        .eq('user_id', profile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id
  });

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      navigate('/candidate/login');
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const { data: applications = [] } = useQuery({
    queryKey: ['candidate_applications_status', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('status')
        .eq('candidate_id', profile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const isHired = applications.some(app => app.status === 'Hired' || app.status === 'Selected');
  const [showDocumentsNewBadge, setShowDocumentsNewBadge] = useState(false);

  useEffect(() => {
    if (isHired && profile?.id && profileData !== undefined) {
      if (!profileData?.documents_tab_seen_at) {
        api.put('/candidate/profile/documents-seen').catch(console.error);
        setShowDocumentsNewBadge(true);
      } else {
        const timePassed = Date.now() - new Date(profileData.documents_tab_seen_at).getTime();
        if (timePassed < 24 * 60 * 60 * 1000) {
          setShowDocumentsNewBadge(true);
        } else {
          setShowDocumentsNewBadge(false);
        }
      }
    }
  }, [isHired, profile?.id, profileData]);

  // Fetch news & maintenance status
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
  const isMaintenanceMode = newsData?.maintenance_mode === true;
  const maintenanceMessage = newsData?.maintenance_message;
  const showMaintenanceOverlay = isMaintenanceMode && !isDevBypassed;

  const navItems = [
    { label: 'Dashboard', icon: <Home size={15} />, path: '/candidate/dashboard' },
    { label: 'Explore Jobs', icon: <Briefcase size={15} />, path: '/candidate/jobs' },
    { label: 'My Applications', icon: <FileText size={15} />, path: '/candidate/applications' },
    { label: 'My Profile', icon: <User size={15} />, path: '/candidate/profile' }
  ];

  const mobileNavItems = [
    { label: 'Home', icon: Home, path: '/candidate/dashboard' },
    { label: 'Jobs', icon: Briefcase, path: '/candidate/jobs' },
    { label: 'Applications', icon: FileText, path: '/candidate/applications' },
    { label: 'Profile', icon: User, path: '/candidate/profile' }
  ];

  const candidateDisplayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email?.split('@')[0] || 'Candidate';

  const avatarDisplay = profileData?.avatar_url || profile?.avatar;

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
                <span className="text-lg font-semibold tracking-tight text-[#4285F4]">HRMS</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-medium text-[#5f6368] ml-1">Candidate Portal</span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-2 overflow-y-auto flex-1 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5 px-2.5 whitespace-nowrap">
              Candidate Space
            </p>
            <nav className="space-y-0.5">
              {navItems.map((item, idx) => {
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
                    <span className={`shrink-0 ${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>
                      {item.icon}
                    </span>
                    <span className="flex-1 whitespace-nowrap truncate text-[11.5px]">{item.label}</span>
                    {item.isNew && (
                      <span className="bg-[#EA4335] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs animate-pulse">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="p-2.5 border-t border-[#f1f3f4] bg-white">
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
              {/* Desktop Portal Badge */}
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-[#e8f0fe] text-[#1967d2] rounded-full text-xs font-semibold border border-[#d2e3fc]">
                <Compass size={13} className="text-[#4285F4]" />
                <span>Candidate Portal</span>
              </div>

              {/* Mobile Left Edge: Profile Avatar */}
              <div className="md:hidden flex items-center">
                <Link
                  to="/candidate/profile"
                  className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                >
                  {avatarDisplay ? (
                    <img src={avatarDisplay} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-[#1a73e8]">
                      {(profile?.firstName || profile?.email || 'C').charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile Center: Acme HRMS with 4 Google dots */}
            <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-auto">
              <Link to="/candidate/dashboard" className="flex items-center gap-1.5 shrink-0">
                <span className="text-base font-bold tracking-tight text-[#1f1f1f]">Acme</span>
                <span className="text-base font-semibold tracking-tight text-[#4285F4]">HRMS</span>
                <div className="flex items-center gap-0.5 ml-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                </div>
              </Link>
            </div>

            {/* Scrolling News / Announcement Ticker (Desktop Google Pill) */}
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
              <div className="hidden md:flex items-center gap-2.5 select-none bg-[#f8fafd] border border-[#e0e3e7] pl-1.5 pr-3 py-1 rounded-full">
                <div className="w-7 h-7 bg-[#e8f0fe] text-[#1a73e8] rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border border-[#d2e3fc]">
                  {avatarDisplay ? (
                    <img src={avatarDisplay} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.firstName || profile?.email || 'C').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-[#1f1f1f] leading-none">
                    {candidateDisplayName}
                  </p>
                  <p className="text-[10px] text-[#5f6368] mt-0.5 capitalize">Candidate</p>
                </div>
              </div>

              {/* Mobile Right Side Actions: Logout Button */}
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
                {mobileNavItems.map((item) => {
                  const currentPath = swipePath || location.pathname;
                  const isHome = item.path === '/candidate/dashboard';
                  const isOtherTab = mobileNavItems.filter(n => n.path !== '/candidate/dashboard').some(p => currentPath.startsWith(p.path));
                  const isActive = isHome
                    ? (currentPath === '/candidate/dashboard' || !isOtherTab)
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
                          layoutId="candidateMobileNavBubble"
                          className="absolute inset-0 z-[-1] rounded-full bg-[#c2e7ff]/70 border border-[#b2d7ff]/80 shadow-2xs"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                        />
                      )}
                      {item.isNew && (
                        <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#EA4335] animate-pulse" />
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

        {/* Global Logout Modal */}
        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
          isLoading={loggingOut}
          title="Sign out of Candidate Account?"
          description="Are you sure you want to log out of your candidate account? You will need to sign in again to check application updates."
        />
      </div>
    </>
  );
};

export default CandidateLayout;
