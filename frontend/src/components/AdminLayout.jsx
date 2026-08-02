import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Users, Settings, Activity, Briefcase, 
  Search, Bell, Menu, Home, Calendar, Clock, 
  BarChart2, ChevronDown, DollarSign, Monitor, FileText, Shield, Network, Mail, MessageSquare, Award, Smartphone
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import EmployeeLayout from './EmployeeLayout';
import api from '../api/axios';
import { supabase } from '../lib/supabase';

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  
  // If the user is an employee (with feature access), swap to the Employee layout entirely
  if (profile?.role === 'employee') {
    return <EmployeeLayout />;
  }

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
    { icon: <Home size={18} />, label: 'Dashboard', path: '/admin' },
    { icon: <Users size={18} />, label: 'Employees', path: '/admin/employees' },
    { icon: <Network size={18} />, label: 'Org Directory', path: '/admin/directory' },
    { icon: <Clock size={18} />, label: 'Attendance', path: '/admin/attendance' },
    { icon: <Calendar size={18} />, label: 'Leave', path: '/admin/leaves' },
    { icon: <BarChart2 size={18} />, label: 'Performance', path: '/admin/performance' },
    { icon: <DollarSign size={18} />, label: 'Payroll', path: '/admin/payroll' },
    { icon: <FileText size={18} />, label: 'Expenses', path: '/admin/expenses' },
    { icon: <Monitor size={18} />, label: 'Assets', path: '/admin/assets' },
    { icon: <Briefcase size={18} />, label: 'Recruitment', path: '/admin/recruitment' },
    { icon: <Award size={18} />, label: 'Exams & Assessments', path: '/admin/assessments' },
    { icon: <Mail size={18} />, label: 'Email Templates', path: '/admin/email-templates' },
    { icon: <MessageSquare size={18} />, label: 'Secure Chat', path: '/admin/chat' },
    { icon: <FileText size={18} />, label: 'Audit Logs', path: '/admin/audit-logs' },
    { icon: <Shield size={18} />, label: 'Feature Access', path: '/admin/feature-access' },
    { icon: <Settings size={18} />, label: 'Settings', path: '/admin/settings' },
  ];

  // Fetch chat list (shared cache with Chat.jsx) to keep unread badges perfectly synced
  const { data: chats = [] } = useQuery({
    queryKey: ['chat', 'list'],
    queryFn: async () => {
      const res = await api.get('/chat');
      return res.data;
    },
    refetchInterval: 1500,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

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

  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);

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
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-10 -top-20 -right-20" />
        <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#10B981] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12" />
        <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-96 h-96 bg-[#3B82F6] rounded-full opacity-5 top-1/2 left-1/3" />
        <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#EC4899] rounded-xl opacity-10 top-20 left-10 -rotate-12" />
        <motion.div custom={5} variants={shapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#8B5CF6] rounded-full opacity-10 bottom-20 right-1/4" />
        
        {/* Additional top-left boxes */}
        <motion.div custom={6} variants={shapeVariants} animate="animate" className="absolute w-40 h-40 bg-[#14B8A6] rounded-2xl opacity-10 top-[-20px] left-[18rem] rotate-45" />
        <motion.div custom={7} variants={shapeVariants} animate="animate" className="absolute w-28 h-28 bg-[#F43F5E] rounded-3xl opacity-10 top-32 left-[24rem] -rotate-12" />
        <motion.div custom={8} variants={shapeVariants} animate="animate" className="absolute w-56 h-56 bg-[#6366F1] rounded-full opacity-[0.06] top-10 left-[35%]" />
        
        {/* Additional bottom-right boxes */}
        <motion.div custom={9} variants={shapeVariants} animate="animate" className="absolute w-36 h-36 bg-[#EAB308] rounded-2xl opacity-10 bottom-10 right-10 -rotate-12" />
        <motion.div custom={10} variants={shapeVariants} animate="animate" className="absolute w-24 h-24 bg-[#06B6D4] rounded-full opacity-10 bottom-40 right-28 rotate-45" />
      </div>

      {/* Sidebar */}
      <aside className="w-[260px] h-full bg-white/80 backdrop-blur-md border-r border-slate-200 hidden md:flex flex-col z-20 shadow-sm relative shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white mr-3 shrink-0">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap">Acme HRMS</span>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">Main Menu</p>
          <nav className="space-y-1">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link 
                  key={idx}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{item.icon}</span>
                  <span className="flex-1 whitespace-nowrap truncate">{item.label}</span>
                  {item.label === 'Secure Chat' && totalUnread > 0 && (
                    <span className="bg-[#25d366] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                      {totalUnread}
                    </span>
                  )}
                  {item.label === 'Recruitment' && pendingDocsCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0" title={`${pendingDocsCount} documents waiting for verification`}>
                      {pendingDocsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} className="text-slate-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-30 bg-transparent">
        
        {/* Top Header */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-500 hover:text-slate-700">
              <Menu size={20} />
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-5">
            <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-6 w-px bg-slate-200"></div>

            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate('/admin/profile')}
              title="View Profile & Settings"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm overflow-hidden border border-slate-200">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.email || 'A').charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-700 leading-none group-hover:text-blue-600 transition-colors">
                  {profile?.email?.split('@')[0] || 'Admin User'}
                </p>
                <p className="text-xs text-slate-500 mt-1">{profile?.role || 'Administrator'}</p>
              </div>
            </div>

            {/* Mobile Logout Button */}
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors text-sm font-semibold bg-rose-50/50 hover:bg-rose-50 p-2.5 sm:px-3 sm:py-1.5 rounded-full"
            >
              <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

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
      <div className="mobile-restriction-overlay fixed inset-0 z-[9999] flex-col items-center justify-center bg-white/60 backdrop-blur-3xl p-6 text-center select-none border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_12px_40px_rgba(0,0,0,0.08)]">
        <div className="relative mb-6">
          <div className="w-20 h-20 border border-dashed border-slate-300 rounded-full flex items-center justify-center animate-[spin_8s_linear_infinite]">
            <Monitor className="w-8 h-8 text-[#ff2d55] opacity-20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Monitor className="w-10 h-10 text-slate-800" />
            </motion.div>
          </div>
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wide">Desktop Access Required</h3>
        <p className="text-slate-500 text-sm max-w-xs font-medium leading-relaxed mb-6">
          Admin accounts can only be accessed from a desktop or laptop. Please use the web application on a desktop device to continue.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl font-semibold shadow-sm transition-all"
        >
          <LogOut size={18} />
          Sign Out
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
      <div className="orientation-warning fixed inset-0 z-[9999] flex-col items-center justify-center bg-white/60 backdrop-blur-3xl p-6 text-center select-none border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_12px_40px_rgba(0,0,0,0.08)]">
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
        <p className="text-slate-500 text-sm max-w-xs font-medium leading-relaxed mb-6">
          Please rotate your screen back to portrait orientation for the best Acme HRMS experience.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl font-semibold shadow-sm transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

    </div>
  );
};

export default AdminLayout;
