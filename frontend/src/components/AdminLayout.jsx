import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Users, Settings, Activity, Briefcase, 
  Search, Bell, Menu, Home, Calendar, Clock, 
  BarChart2, ChevronDown, IndianRupee, Monitor, FileText, Shield, Network, Mail, Award, Smartphone, X, AlertCircle
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import EmployeeLayout from './EmployeeLayout';
import LogoutModal from './LogoutModal';
import api from '../api/axios';
import { supabase } from '../lib/supabase';

const AdminLayout = () => {
  const { profile } = useAuth();
  
  // If the user is an employee (with feature access), swap to the Employee layout entirely
  if (profile?.role === 'employee') {
    return <EmployeeLayout />;
  }

  return <AdminLayoutContent />;
};

const AdminLayoutContent = () => {
  const { profile, signOut } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const navItems = [
    { icon: <Home size={15} />, label: 'Dashboard', path: '/admin' },
    { icon: <Users size={15} />, label: 'Employees', path: '/admin/employees' },
    { icon: <Network size={15} />, label: 'Org Directory', path: '/admin/directory' },
    { icon: <Clock size={15} />, label: 'Attendance', path: '/admin/attendance', activePaths: ['/admin/attendance', '/admin/holidays'] },
    { icon: <Calendar size={15} />, label: 'Leave', path: '/admin/leaves' },
    { icon: <BarChart2 size={15} />, label: 'Performance', path: '/admin/performance' },
    { icon: <IndianRupee size={15} />, label: 'Payroll', path: '/admin/payroll' },
    { icon: <FileText size={15} />, label: 'Expenses', path: '/admin/expenses' },
    { icon: <Monitor size={15} />, label: 'Assets', path: '/admin/assets' },
    { icon: <Briefcase size={15} />, label: 'Recruitment', path: '/admin/recruitment' },
    { icon: <Award size={15} />, label: 'Assessment & Training', path: '/admin/assessments' },
    { icon: <Mail size={15} />, label: 'Email Templates', path: '/admin/email-templates' },
    { icon: <FileText size={15} />, label: 'Audit Logs', path: '/admin/audit-logs' },
    { icon: <Shield size={15} />, label: 'Feature Access', path: '/admin/feature-access' },
    { icon: <Settings size={15} />, label: 'Settings', path: '/admin/settings' },
  ];

  const { data: pendingDocsCount = 0 } = useQuery({
    queryKey: ['admin_pending_docs'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('candidate_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#f8fafd] text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] flex font-sans antialiased relative z-0">
      
      {/* Google Ambient Multi-color Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4285F4]/10 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EA4335]/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-[#FBBC05]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#34A853]/8 rounded-full blur-3xl" />
      </div>

      {/* Top Full-Width 4-Color Google Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0 right-0 z-50 pointer-events-none" />

      {/* Google-style Sleek Left Sidebar */}
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
              <span className="text-[10px] font-medium text-[#5f6368] ml-1">Workspace Admin</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-2 overflow-y-auto flex-1 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5 px-2.5 whitespace-nowrap">
            Management
          </p>
          <nav className="space-y-0.5">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path || 
                               (item.path !== '/admin' && location.pathname.startsWith(item.path)) ||
                               (item.activePaths && item.activePaths.some(p => location.pathname === p || location.pathname.startsWith(p)));
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

                  {item.label === 'Recruitment' && pendingDocsCount > 0 && (
                    <span className="bg-[#FBBC05] text-[#1f1f1f] text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 shrink-0 shadow-xs" title={`${pendingDocsCount} documents waiting for verification`}>
                      {pendingDocsCount}
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
            onClick={handleLogoutClick}
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
        <header className="h-14 bg-white border-b border-[#e0e3e7] px-5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-[#5f6368] hover:text-[#1f1f1f] p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors">
              <Menu size={20} />
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-4">
            <button 
              className="relative text-[#5f6368] hover:text-[#1f1f1f] p-2 rounded-full hover:bg-[#f1f3f4] transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA4335] rounded-full ring-2 ring-white"></span>
            </button>
            
            <div className="h-5 w-px bg-[#e0e3e7]"></div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 select-none bg-[#f8fafd] border border-[#e0e3e7] pl-1.5 pr-3 py-1 rounded-full">
              <div className="w-7 h-7 bg-[#e8f0fe] text-[#1a73e8] rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border border-[#d2e3fc]">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.email || 'A').charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-[#1f1f1f] leading-none">
                  {profile?.email?.split('@')[0] || 'Admin User'}
                </p>
                <p className="text-[10px] text-[#5f6368] mt-0.5 capitalize">{profile?.role || 'Administrator'}</p>
              </div>
            </div>

            {/* Mobile Logout Button */}
            <button
              type="button"
              onClick={handleLogoutClick}
              className="md:hidden flex items-center gap-1.5 text-[#d93025] hover:bg-[#fce8e6] transition-colors text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Route Outlet */}
        <div id="main-scroll-container" className="flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        .mobile-restriction-overlay {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-restriction-overlay {
            display: flex;
          }
        }
      `}</style>

      {/* Mobile Restriction Overlay for Admins */}
      <div className="mobile-restriction-overlay fixed inset-0 z-[9999] flex-col items-center justify-center bg-white/95 backdrop-blur-3xl p-6 text-center select-none border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_12px_40px_rgba(0,0,0,0.08)]">
        <div className="relative mb-5">
          {/* Animated monitor container with Google colors */}
          <div className="w-20 h-20 border border-dashed border-[#4285F4]/40 bg-[#e8f0fe]/60 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite]">
            <Monitor className="w-8 h-8 text-[#4285F4] opacity-30" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Monitor className="w-10 h-10 text-[#1a73e8]" />
            </motion.div>
          </div>
        </div>

        {/* 4 Google Colors Accent */}
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
            Desktop Portal
          </span>
        </div>

        <h3 className="text-xl font-black text-[#1f1f1f] mb-2 uppercase tracking-wide">Desktop Access Required</h3>
        <p className="text-[#5f6368] text-xs max-w-xs font-medium leading-relaxed mb-6">
          Admin accounts can only be accessed from a desktop or laptop. Please use the web application on a desktop device to continue.
        </p>
        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-[#dadce0] hover:bg-[#f8fafd] text-[#1f1f1f] text-xs font-semibold rounded-full shadow-2xs transition-all cursor-pointer"
        >
          <LogOut size={16} className="text-[#5f6368]" />
          <span>Sign Out</span>
        </button>
      </div>

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
      <div className="orientation-warning fixed inset-0 z-[9999] flex-col items-center justify-center bg-white/95 backdrop-blur-3xl p-6 text-center select-none border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_12px_40px_rgba(0,0,0,0.08)]">
        <div className="relative mb-5">
          {/* Animated phone rotation container */}
          <div className="w-20 h-20 border border-dashed border-[#4285F4]/40 bg-[#e8f0fe]/60 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite]">
            <Smartphone className="w-8 h-8 text-[#4285F4] opacity-30" />
          </div>
          {/* Main phone rotation icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, -90, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Smartphone className="w-10 h-10 text-[#1a73e8]" />
            </motion.div>
          </div>
        </div>

        {/* 4 Google Colors Accent */}
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-1">
            Display Orientation
          </span>
        </div>

        <h3 className="text-xl font-black text-[#1f1f1f] mb-2 uppercase tracking-wide">Rotate your device</h3>
        <p className="text-[#5f6368] text-xs max-w-xs font-medium leading-relaxed mb-6">
          Please rotate your screen back to portrait orientation for the best Acme HRMS experience.
        </p>
        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full font-semibold shadow-xs transition-all cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Global Logout Modal */}
      <LogoutModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        isLoading={loggingOut}
        title="Sign out of Acme HRMS?"
        description="Are you sure you want to end your session? You will need to log back in to access the administrator workspace."
      />

    </div>
  );
};

export default AdminLayout;
