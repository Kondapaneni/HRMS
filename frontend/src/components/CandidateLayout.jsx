import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  LogOut,
  Home,
  Briefcase,
  FileText,
  User,
  Menu,
  X,
  Bell,
  Folder,
} from "lucide-react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

const CandidateLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["candidate", "profile", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidate_profiles")
        .select("avatar_url")
        .eq("user_id", profile.id)
        .single();
      return data;
    },
    enabled: !!profile?.id,
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/candidate/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const { data: applications = [] } = useQuery({
    queryKey: ["candidate_applications_status", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("status")
        .eq("candidate_id", profile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const isHired = applications.some(
    (app) => app.status === "Hired" || app.status === "Selected",
  );

  const navItems = [
    {
      label: "Dashboard",
      icon: <Home size={18} />,
      path: "/candidate/dashboard",
    },
    { label: "Jobs", icon: <Briefcase size={18} />, path: "/candidate/jobs" },
    {
      label: "Applications",
      icon: <FileText size={18} />,
      path: "/candidate/applications",
    },
    ...(isHired
      ? [
          {
            label: "Documents",
            icon: <Folder size={18} />,
            path: "/candidate/documents",
          },
        ]
      : []),
    { label: "Profile", icon: <User size={18} />, path: "/candidate/profile" },
  ];

  const shapeVariants = {
    animate: (i) => ({
      y: [0, -20, 0],
      x: [0, 15, 0],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 5 + i * 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    }),
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 flex flex-col font-sans text-slate-800 relative z-0">
      {/* Global Animated Background Graphics */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          custom={1}
          variants={shapeVariants}
          animate="animate"
          className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-10 -top-20 -right-20"
        />
        <motion.div
          custom={2}
          variants={shapeVariants}
          animate="animate"
          className="absolute w-48 h-48 bg-[#10B981] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12"
        />
        <motion.div
          custom={3}
          variants={shapeVariants}
          animate="animate"
          className="absolute w-96 h-96 bg-[#3B82F6] rounded-full opacity-5 top-1/2 left-1/3"
        />
        <motion.div
          custom={4}
          variants={shapeVariants}
          animate="animate"
          className="absolute w-32 h-32 bg-[#EC4899] rounded-xl opacity-10 top-20 left-10 -rotate-12"
        />
        <motion.div
          custom={5}
          variants={shapeVariants}
          animate="animate"
          className="absolute w-72 h-72 bg-[#8B5CF6] rounded-full opacity-10 bottom-20 right-1/4"
        />
      </div>

      {/* Top Floating Navigation (Desktop) */}
      <header className="hidden md:flex fixed top-6 left-0 right-0 z-50 justify-center pointer-events-none">
        <div className="bg-white/50 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full p-2 px-4 flex items-center pointer-events-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 pr-6 border-r border-slate-300/40 mr-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-white overflow-hidden p-0.5 border border-slate-100">
              <img
                src="/pwa-192x192.png"
                alt="Acme Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-800 leading-tight">
                Acme
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-blue-600 uppercase leading-none">
                Careers
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon.type;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center w-[86px] h-[66px] z-10 group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="candidateTopNavBubble"
                      className="absolute inset-0 z-[-1] rounded-2xl shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.06)] bg-white/60 backdrop-blur-xl border border-white/80 overflow-hidden"
                      transition={{
                        type: "spring",
                        bounce: 0.25,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-6 h-6 mb-1 transition-all duration-300 ${isActive ? "text-blue-600 scale-110" : "text-slate-500 group-hover:text-slate-600 group-active:scale-95"}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={`relative z-10 text-[11px] font-semibold tracking-wide transition-all duration-300 ${isActive ? "text-blue-600" : "text-slate-500"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4 pl-6 border-l border-slate-300/40 ml-2">
            <button className="p-2.5 text-slate-500 hover:text-slate-700 transition-colors relative rounded-full hover:bg-white/80">
              <Bell size={22} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold text-base">
              {profileData?.avatar_url ? (
                <img
                  src={profileData.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                profile?.firstName?.charAt(0) ||
                profile?.email?.charAt(0).toUpperCase() ||
                "C"
              )}
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50/80 rounded-full transition-colors"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:pt-32 pb-24 md:pb-8 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
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
                <Icon
                  className={`relative z-10 w-5 h-5 mb-1 transition-all duration-300 ${isActive ? "text-blue-600 scale-110" : "text-slate-400 group-active:scale-95"}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`relative z-10 text-[9px] font-bold tracking-wide transition-colors ${isActive ? "text-blue-600" : "text-slate-400"}`}
                >
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%", scale: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white/90 backdrop-blur-xl w-full max-w-sm rounded-[24px] sm:rounded-3xl p-6 shadow-2xl border border-white/50 relative z-10 mb-4 sm:mb-0"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-100/80 text-rose-500 rounded-full flex items-center justify-center mb-4 ring-4 ring-rose-50">
                  <LogOut size={28} className="ml-1" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Log Out
                </h3>
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
