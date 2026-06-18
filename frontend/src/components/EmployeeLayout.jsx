import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut, User, Calendar,
  Home, Clock, BarChart2, DollarSign, Activity, Bell, Search, Menu, Wallet
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const EmployeeLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [swipePath, setSwipePath] = useState(null);

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

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navItems = [
    { icon: <Home size={18} />, label: 'Dashboard', path: '/employee' },
    { icon: <User size={18} />, label: 'My Profile', path: '/employee/profile' },
    { icon: <Clock size={18} />, label: 'Attendance', path: '/employee/attendance' },
    { icon: <Calendar size={18} />, label: 'Leaves', path: '/employee/leaves' },
    { icon: <Wallet size={18} />, label: 'Payroll', path: '/employee/payroll' },
    { icon: <BarChart2 size={18} />, label: 'Performance', path: '/employee/performance' },
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
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 flex font-sans text-slate-800 relative z-0">

      {/* Global Animated Background Graphics */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden fixed md:absolute">
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
      <aside className="w-56 h-screen sticky top-0 bg-white/80 backdrop-blur-md border-r border-slate-200 hidden md:flex flex-col z-20 shadow-sm">
        <div className="h-14 flex items-center px-4 border-b border-slate-200">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white mr-3">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">Acme HRMS</span>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Employee Portal</p>
          <nav className="space-y-1">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} className="text-slate-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-30 bg-transparent">

        {/* Top Header - Minimalist */}
        <header className="h-14 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between md:justify-end sticky top-0 z-40 md:relative md:z-10">
          <div className="flex items-center gap-5 flex-row-reverse md:flex-row">
            <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
              <Bell size={20} />
            </button>

            <div className="h-6 w-px bg-slate-200"></div>

            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                if (window.innerWidth < 768) {
                  navigate('/employee/profile');
                }
              }}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm overflow-hidden border border-slate-200">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.email || 'E').charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-700 leading-none group-hover:text-blue-600 transition-colors">
                  {profile?.email?.split('@')[0] || 'Employee'}
                </p>
                <p className="text-xs text-slate-500 mt-1 capitalize">{profile?.role || 'Employee'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="md:hidden flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors text-sm font-semibold bg-rose-50/50 hover:bg-rose-50 p-2.5 sm:px-3 sm:py-1.5 rounded-full"
          >
            <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 pb-[110px] md:pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center h-[100px] px-2 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] pb-8 pt-2 touch-none select-none"
          onTouchStart={handleTouchMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {[
            { label: 'Home', icon: Home, path: '/employee' },
            { label: 'Attendance', icon: Clock, path: '/employee/attendance' },
            { label: 'Leaves', icon: Calendar, path: '/employee/leaves' },
            { label: 'Payroll', icon: Wallet, path: '/employee/payroll' },
            { label: 'Profile', icon: User, path: '/employee/profile' }
          ].map((item) => {
            const isActive = (swipePath || location.pathname) === item.path;
            const Icon = item.icon;

            return (
              <Link 
                key={item.path} 
                to={item.path} 
                data-nav-path={item.path}
                onClick={(e) => {
                  if (swipePath) e.preventDefault();
                }}
                className="relative flex flex-col items-center justify-center w-full h-full z-10 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileNavBubble"
                    className="absolute z-[-1] rounded-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_16px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl border border-white/70 overflow-hidden"
                    style={{ width: '64px', height: '60px' }}
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  >
                    {/* Top highlight for glossy 3D water effect */}
                    <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-b from-white to-transparent opacity-80 rounded-full"></div>
                  </motion.div>
                )}
                <Icon className={`w-[26px] h-[26px] mb-1.5 transition-all duration-300 ${isActive ? 'text-[#ff928b] scale-110 drop-shadow-sm' : 'text-slate-400 group-hover:text-slate-500 group-active:scale-95'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${isActive ? 'text-[#ff928b]' : 'text-slate-400'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>

      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
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
                  setShowLogoutModal(false);
                }
              }}
              className="bg-white w-full max-w-sm rounded-[24px] sm:rounded-2xl p-6 shadow-2xl relative z-10 mb-4 sm:mb-0"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4 ring-4 ring-rose-50">
                  <LogOut size={28} className="ml-1" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Log Out</h3>
                <p className="text-slate-500 text-sm mb-6 px-2">
                  Are you sure you want to log out of your account? You will need to sign in again.
                </p>
                
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutModal(false);
                      handleLogout();
                    }}
                    className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/20"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default EmployeeLayout;
