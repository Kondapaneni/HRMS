import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut, Home, Briefcase, FileText, User, Menu, X, Bell
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CandidateLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/candidate/login');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navItems = [
    { icon: <Home size={18} />, label: 'Dashboard', path: '/candidate/dashboard' },
    { icon: <Briefcase size={18} />, label: 'Jobs', path: '/candidate/jobs' },
    { icon: <FileText size={18} />, label: 'Applications', path: '/candidate/applications' },
    { icon: <User size={18} />, label: 'Profile', path: '/candidate/profile' },
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
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans text-slate-800 relative z-0">
      
      {/* Global Animated Background Graphics */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-10 -top-20 -right-20" />
        <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#10B981] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12" />
        <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-96 h-96 bg-[#3B82F6] rounded-full opacity-5 top-1/2 left-1/3" />
        <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#EC4899] rounded-xl opacity-10 top-20 left-10 -rotate-12" />
        <motion.div custom={5} variants={shapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#8B5CF6] rounded-full opacity-10 bottom-20 right-1/4" />
      </div>

      {/* Top Glassmorphic Navigation */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white shadow-md">
                <Briefcase size={18} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Careers</span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isActive 
                        ? 'text-blue-600' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="candidateNavBackground"
                        className="absolute inset-0 bg-blue-50/80 rounded-xl z-0"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <span className={isActive ? 'text-blue-500' : 'text-slate-400'}>{item.icon}</span>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative rounded-full hover:bg-slate-100/50">
                <Bell size={20} />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
              
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              {/* Avatar Profile */}
              <div className="hidden sm:flex items-center gap-2 cursor-pointer group px-2 py-1 rounded-full hover:bg-slate-100/50 transition-colors">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 border border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {profile?.firstName?.charAt(0) || profile?.email?.charAt(0).toUpperCase() || 'C'}
                </div>
              </div>

              {/* Logout Button Desktop */}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="hidden md:flex items-center gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ml-2"
              >
                <LogOut size={16} />
                Logout
              </button>

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (Glassmorphic) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-2 flex justify-around items-center pointer-events-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon.type;
            
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className="relative flex flex-col items-center justify-center w-14 h-14 z-10 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileNavHighlight"
                    className="absolute inset-0 bg-blue-50 rounded-2xl z-0"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <Icon className={`relative z-10 w-5 h-5 mb-1 transition-all duration-300 ${isActive ? 'text-blue-600 scale-110' : 'text-slate-400 group-active:scale-95'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`relative z-10 text-[9px] font-bold tracking-wide transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%', scale: 1 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white/90 backdrop-blur-xl w-full max-w-sm rounded-[24px] sm:rounded-3xl p-6 shadow-2xl border border-white/50 relative z-10 mb-4 sm:mb-0"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-100/80 text-rose-500 rounded-full flex items-center justify-center mb-4 ring-4 ring-rose-50">
                  <LogOut size={28} className="ml-1" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Log Out</h3>
                <p className="text-slate-500 text-sm mb-6 px-2">
                  Are you sure you want to log out of your candidate account?
                </p>
                
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-slate-700 bg-slate-100/80 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutModal(false);
                      handleLogout();
                    }}
                    className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
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

export default CandidateLayout;
