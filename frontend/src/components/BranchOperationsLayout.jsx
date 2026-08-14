import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { LogOut, Home, Building2, ArrowLeft, Megaphone } from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const BranchOperationsLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [swipePath, setSwipePath] = useState(null);
  const [showBackModal, setShowBackModal] = useState(false);

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
    { icon: Building2, label: 'Branch Operations', path: '/employee/branch-operations', feature: 'canBranchOperations' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header - Desktop & Tablet */}
      <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            to="/employee/dashboard"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold group bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Employee Portal</span>
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <Building2 size={18} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight text-sm">Branch Operations</h1>
              <p className="text-[10px] text-slate-500 font-medium">Enterprise Management</p>
            </div>
          </div>
        </div>

        {/* Center Desktop Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Header User Profile */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold ring-2 ring-indigo-50">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile?.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{profile?.name || 'User'}</p>
              <p className="text-[10px] text-slate-500 font-medium">{profile?.position || 'Operations Officer'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Breaking News Ticker Bar */}
      {newsHeadlines && newsHeadlines.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-xs py-1.5 px-4 overflow-hidden flex items-center shrink-0 border-b border-indigo-900/50 shadow-xs z-20">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-indigo-400 shrink-0 mr-3 pr-3 border-r border-slate-700">
            <Megaphone size={12} className="animate-pulse text-indigo-400" />
            <span>Notice</span>
          </div>
          <div className="flex-1 overflow-hidden relative whitespace-nowrap">
            <div className="inline-block animate-marquee pl-[100%]">
              {newsHeadlines.join('  •  ')}
            </div>
          </div>
        </div>
      )}

      {/* Main Outlet Container */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        <button
          onClick={() => setShowBackModal(true)}
          className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            <Building2 size={14} />
          </div>
          <span className="font-bold text-slate-900 text-sm">Branch Operations</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Mobile Back Modal */}
      <AnimatePresence>
        {showBackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs md:hidden">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Home size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Return to Portal?</h3>
                <p className="text-xs text-slate-500 mt-1">Navigate back to the standard employee dashboard.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBackModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBackModal(false);
                    navigate('/employee/dashboard');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Return
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BranchOperationsLayout;
