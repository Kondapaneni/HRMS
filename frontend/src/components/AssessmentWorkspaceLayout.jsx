import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Award,
  HelpCircle,
  Users,
  BarChart2,
  ArrowLeft,
  Home,
  LogOut,
  Settings,
  BookOpen,
  Menu,
  X,
  FileCheck2,
  PlaySquare,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LogoutModal from './LogoutModal';

const AssessmentWorkspaceLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    {
      icon: <HelpCircle size={15} />,
      label: 'Question Bank',
      path: '/admin/assessments/questions'
    },
    {
      icon: <FileCheck2 size={15} />,
      label: 'Assessment Management',
      path: '/admin/assessments/management',
      activeAliases: ['/admin/assessments/create', '/admin/assessments/edit']
    },
    {
      icon: <Award size={15} />,
      label: 'Results & Attempts',
      path: '/admin/assessments/results'
    },
    {
      icon: <PlaySquare size={15} />,
      label: 'Training Videos',
      path: '/admin/assessments/training',
      heading: 'Continuous Learning'
    },
  ];

  const getActiveTitle = () => {
    if (location.pathname.includes('/questions')) return 'Department Question Bank';
    if (location.pathname.includes('/management') || location.pathname.includes('/create') || location.pathname.includes('/edit')) return 'Assessment Management';
    if (location.pathname.includes('/results')) return 'Employee Results & Attempts';
    if (location.pathname.includes('/training')) return 'Training Modules & Videos';
    return 'Assessment Hub';
  };

  return (
    <div 
      className="h-[100dvh] w-full overflow-hidden bg-[#f8fafd] text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] flex font-editorial antialiased relative z-0"
      style={{ fontFamily: "'Newsreader', Georgia, serif" }}
    >

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4285F4]/10 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EA4335]/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-[#FBBC05]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#34A853]/8 rounded-full blur-3xl" />
      </div>

      {/* Top 4-Color Google Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0 right-0 z-50 pointer-events-none" />

      {/* Left Navigation Sidebar */}
      <aside className="w-[215px] h-full bg-white border-r border-[#e0e3e7] hidden md:flex flex-col z-20 relative shrink-0 shadow-none">

        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#f1f3f4] shrink-0 mt-0.5">
          <div>
            <div className="flex items-center gap-1.5 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
              <span className="text-xl font-medium tracking-tight text-[#1f1f1f]">Acme</span>
              <span className="text-xl font-medium italic tracking-tight text-[#4285F4]">Assessment</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-medium text-[#5f6368] ml-1">Training Hub</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-2 overflow-y-auto flex-1 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5 px-2.5 whitespace-nowrap">
            LMS &amp; Evaluations
          </p>

          <nav className="space-y-0.5">
            {navItems.map((item, idx) => {
              const isDirectActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              const isAliasActive = item.activeAliases?.some(alias => location.pathname.startsWith(alias));
              const isActive = isDirectActive || isAliasActive;

              return (
                <React.Fragment key={idx}>
                  {item.heading && (
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider mt-4 mb-1.5 px-2.5 whitespace-nowrap">
                      {item.heading}
                    </p>
                  )}
                  <Link
                    to={item.path}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs transition-all ${isActive
                        ? 'bg-[#c2e7ff]/70 text-[#001d35] font-semibold shadow-xs'
                        : 'text-[#444746] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] font-medium'
                      }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`}>
                      {item.icon}
                    </span>
                    <span className="flex-1 whitespace-nowrap truncate text-[11.5px]">{item.label}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-2.5 border-t border-[#f1f3f4] bg-white">
          <Link
            to="/admin"
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] rounded-full hover:bg-[#d2e3fc] transition-colors shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span className="text-[11.5px]">Back to HRMS</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-10 bg-transparent">

        {/* Top Header */}
        <header className="h-14 bg-white border-b border-[#e0e3e7] px-5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-[#5f6368] hover:text-[#1f1f1f] p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="md:hidden">
              <h2 className="text-sm font-semibold text-[#1f1f1f] flex items-center gap-2">
                {getActiveTitle()}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">

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
                <p className="text-xs font-medium text-[#1f1f1f] leading-none" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
                  <span className="font-medium italic text-[#1a73e8]">{profile?.email?.split('@')[0] || 'Admin'}</span>
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

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
            <div className="w-screen max-w-xs bg-white shadow-2xl flex flex-col">
              <div className="p-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div>
                  <div className="flex items-center gap-1.5 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
                    <span className="text-lg font-medium text-[#1f1f1f]">Acme</span>
                    <span className="text-lg font-medium italic text-[#4285F4]">Assessment</span>
                  </div>
                  <p className="text-[10px] text-[#5f6368]">Training Hub</p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 overflow-y-auto flex-1 space-y-1">
                {navItems.map((item, idx) => {
                  const isDirectActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  const isAliasActive = item.activeAliases?.some(alias => location.pathname.startsWith(alias));
                  const isActive = isDirectActive || isAliasActive;

                  return (
                    <Link
                      key={idx}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all ${isActive
                          ? 'bg-[#c2e7ff]/70 text-[#001d35]'
                          : 'text-[#444746] hover:bg-[#f1f3f4]'
                        }`}
                    >
                      <span className={isActive ? 'text-[#1a73e8]' : 'text-[#5f6368]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="p-3 border-t border-[#e0e3e7] bg-[#f8fafd] space-y-2">
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold bg-white border border-[#dadce0] text-[#1f1f1f]"
                >
                  <ArrowLeft size={14} /> Back to HRMS
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Logout Modal */}
      <LogoutModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        isLoading={loggingOut}
        title="Sign out of Acme HRMS?"
        description="Are you sure you want to end your session? You will need to log back in to access the workspace."
      />

    </div>
  );
};

export default AssessmentWorkspaceLayout;
