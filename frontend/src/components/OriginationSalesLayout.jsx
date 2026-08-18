import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { LogOut, Home, ShoppingBag, FileText, Activity, ArrowLeft, Smartphone, Users, TrendingUp, DollarSign } from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const OriginationSalesLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [swipePath, setSwipePath] = useState(null);
  const [showBackModal, setShowBackModal] = useState(false);

  const hideBottomNavPatterns = [
    '/employee/sales/form',
    '/employee/sales/view-order',
    '/employee/sales/origination/leads/add',
    /\/employee\/sales\/origination\/leads\/[^/]+\/details/,
    /\/employee\/sales\/origination\/customers\/[^/]+\/details/,
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
    refetchInterval: 180000,
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
    { icon: Activity, label: 'Dashboard', path: '/employee/sales/origination', feature: 'canSalesOrigination' },
    { icon: FileText, label: 'Leads', path: '/employee/sales/origination/leads', feature: 'canSalesOrigination' },
    { icon: Users, label: 'Customers', path: '/employee/sales/origination/customers', feature: 'canSalesOrigination' },
    { icon: ShoppingBag, label: 'Deals & Orders', path: '/employee/sales/origination/deals', feature: 'canSalesOrigination' },
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
        <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#10B981] rounded-full opacity-10 -top-20 -right-20" />
        <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#3B82F6] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12" />
        <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-96 h-96 bg-[#8B5CF6] rounded-full opacity-5 top-1/2 left-1/3" />
        <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#F59E0B] rounded-xl opacity-10 top-20 left-10 -rotate-12" />
        <motion.div custom={5} variants={shapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#EC4899] rounded-full opacity-10 bottom-20 right-1/4" />

        {/* Additional top-left boxes */}
        <motion.div custom={6} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-40 h-40 bg-[#06B6D4] rounded-2xl opacity-10 top-[-20px] left-[18rem] rotate-45" />
        <motion.div custom={7} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-28 h-28 bg-[#10B981] rounded-3xl opacity-10 top-32 left-[24rem] -rotate-12" />
        <motion.div custom={8} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-56 h-56 bg-[#3B82F6] rounded-full opacity-[0.06] top-10 left-[35%]" />

        {/* Additional bottom-right boxes */}
        <motion.div custom={9} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-36 h-36 bg-[#F59E0B] rounded-2xl opacity-10 bottom-10 right-10 -rotate-12" />
        <motion.div custom={10} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-24 h-24 bg-[#6366F1] rounded-full opacity-10 bottom-40 right-28 rotate-45" />
      </div>

      {/* Sidebar - Clean, Professional */}
      <aside className="w-[260px] h-screen sticky top-0 bg-white/80 backdrop-blur-md border-r border-slate-200 hidden md:flex flex-col z-20 shadow-sm shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-white mr-3 shrink-0 shadow-sm shadow-emerald-600/20">
            <ShoppingBag size={18} strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap">Sales Origination</span>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">Sales Modules</p>
          <nav className="space-y-1">
            {navItems.filter(item => !item.feature || profile?.featureAccess?.[item.feature]).map((item, idx) => {
              const isActive = item.path === '/employee/sales/origination'
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
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
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm overflow-hidden border border-slate-200">
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
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm overflow-hidden border border-slate-200">
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
            <div className="relative mx-auto max-w-sm rounded-[32px] bg-slate-900/90 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] px-3 py-2 flex items-center justify-around pointer-events-auto overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />

              {/* Back to Employee HRMS button */}
              <button
                type="button"
                onClick={() => setShowBackModal(true)}
                className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 group cursor-pointer text-slate-400 hover:text-white"
              >
                <div className="p-1 rounded-xl group-active:scale-90 transition-transform">
                  <ArrowLeft size={20} className="stroke-[2.25]" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight transition-colors">
                  HRMS
                </span>
              </button>

              {navItems.filter(item => !item.feature || profile?.featureAccess?.[item.feature]).map((item, idx) => {
                const isActive = location.pathname === item.path || (item.path !== '/employee/sales/origination' && location.pathname.startsWith(`${item.path}/`));
                const isHovered = swipePath === item.path;

                return (
                  <Link
                    key={idx}
                    to={item.path}
                    data-nav-path={item.path}
                    className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 group cursor-pointer ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill-sales"
                        className="absolute inset-0 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    <div
                      className={`relative z-10 p-1 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'scale-110 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                          : isHovered
                          ? 'scale-125 text-white'
                          : 'group-active:scale-95'
                      }`}
                    >
                      <item.icon size={20} className="stroke-[2.25]" />
                    </div>

                    <span
                      className={`relative z-10 text-[10px] font-semibold tracking-tight transition-colors ${
                        isActive ? 'text-white font-bold' : isHovered ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>

                    {isActive && (
                      <motion.div
                        layoutId="active-dot-sales"
                        className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_6px_#34d399]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>

    {/* Confirmation Modal for Back to HRMS */}
    <AnimatePresence>
      {showBackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowBackModal(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 z-10"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">Back to Main HRMS?</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to exit Sales Origination and return to the main Employee dashboard?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBackModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBackModal(false);
                  navigate('/employee');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
              >
                Exit to HRMS
              </button>
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
        <div className="w-20 h-20 border border-dashed border-slate-300 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite]">
          <Smartphone className="w-8 h-8 text-[#10B981] opacity-20" />
        </div>
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

export default OriginationSalesLayout;
