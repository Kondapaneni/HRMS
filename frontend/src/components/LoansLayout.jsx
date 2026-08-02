import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Briefcase, FileText, Activity, ArrowLeft, Bell } from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LoansLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navItems = [
    { icon: <FileText size={18} />, label: 'Origination', path: '/employee/loans/origination', feature: 'canLoanOrigination' },
  ];

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 flex font-sans text-slate-800 relative z-0">
      
      {/* Sidebar - Clean, Professional */}
      <aside className="w-[260px] h-screen sticky top-0 bg-white/80 backdrop-blur-md border-r border-slate-200 hidden md:flex flex-col z-20 shadow-sm shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white mr-3 shrink-0">
            <Briefcase size={18} strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap">Loans Origination</span>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">Loan Modules</p>
          <nav className="space-y-1">
            {navItems.filter(item => !item.feature || profile?.featureAccess?.[item.feature]).map((item, idx) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{item.icon}</span>
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
        <header className="h-14 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-40 md:relative md:z-10 overflow-hidden">
          <div className="flex items-center gap-4 shrink-0">
            <div className="md:hidden flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm overflow-hidden border border-slate-200">
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

          <div className="flex items-center gap-5 shrink-0">
            {profile?.featureAccess?.canChat && (
              <button
                className="md:hidden relative text-slate-500 hover:text-slate-700 transition-colors ml-1"
                onClick={() => navigate('/employee/chat/mobile')}
              >
                <Bell size={20} />
              </button>
            )}
            <div className="hidden md:flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm overflow-hidden border border-slate-200">
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
        <div className="flex-1 overflow-y-auto overscroll-y-contain bg-slate-50 pb-24 md:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Outlet />
        </div>
        
        {/* Mobile Bottom Navigation (iOS Liquid Glass) */}
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 pointer-events-none touch-none select-none">
          <div className="bg-white/50 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-1.5 flex justify-around items-center pointer-events-auto">
            <Link 
              to="/employee" 
              className="relative flex flex-col items-center justify-center w-[72px] h-[58px] z-10 group"
            >
              <Home className="relative z-10 w-6 h-6 mb-0.5 transition-all duration-300 text-slate-500 group-hover:text-slate-600 group-active:scale-95" strokeWidth={2} />
              <span className="relative z-10 text-[10px] text-center leading-tight font-medium tracking-wide transition-all duration-300 text-slate-500">Back to HRMS</span>
            </Link>
            
            {navItems.filter(item => !item.feature || profile?.featureAccess?.[item.feature]).map((item, idx) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              
              return (
                <Link 
                  key={idx} 
                  to={item.path} 
                  className="relative flex flex-col items-center justify-center w-[72px] h-[58px] z-10 group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="loansMobileNavBubble"
                      className="absolute inset-0 z-[-1] rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.06)] bg-white/40 backdrop-blur-xl border border-white/80 overflow-hidden"
                      transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                  <span className={`relative z-10 flex justify-center mb-0.5 transition-all duration-300 ${isActive ? 'text-[#ff2d55] scale-105' : 'text-slate-500 group-hover:text-slate-600 group-active:scale-95'}`}>
                    {React.cloneElement(item.icon, { strokeWidth: isActive ? 2.5 : 2, size: 24, className: '' })}
                  </span>
                  <span className={`relative z-10 text-[10px] text-center leading-tight font-medium tracking-wide transition-all duration-300 ${isActive ? 'text-[#ff2d55]' : 'text-slate-500'}`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoansLayout;
