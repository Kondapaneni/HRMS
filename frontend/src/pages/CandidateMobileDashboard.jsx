import React, { useState, useEffect } from 'react';
import { Briefcase, FileText, User, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const CandidateMobileDashboard = ({ profileData, completionStats, applications, jobs, isLoading }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const totalApps = applications.length;
  const shortlisted = applications.filter(a => ['Shortlisted', 'Interviewing'].includes(a.status)).length;
  const latestApp = applications[0] || null;

  const heroSubtitle = profileData?.current_title || 'Candidate';

  return (
    <div className="space-y-6 pb-2">

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-6 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs - Candidate Theme (Blues/Purples) */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#8b5cf6] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#06b6d4] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Candidate Portal</p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Hello, {profile?.firstName || 'Candidate'}</h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">{heroSubtitle}</p>
        </div>
      </section>

      {/* Profile Completion Tracker */}
      <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative z-20 -mt-12 mx-1">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Profile Status</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Completion Overview</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${completionStats.isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
            {completionStats.isComplete ? 'Complete' : 'Pending'}
          </span>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Circular Counter */}
          <div className="w-40 h-40 rounded-full relative mb-8 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner">
            {/* The Outer Ring */}
            <div className="absolute inset-0 rounded-full border-[6px] border-slate-100 z-20 pointer-events-none"></div>

            <div className="absolute inset-0 z-0 flex items-end">
              {/* Liquid body filling up based on percentage */}
              <div 
                className="w-full bg-[#3b82f6] transition-all duration-1000 ease-out relative"
                style={{ height: `${completionStats.percentage}%` }}
              >
                {/* Wave cutouts for liquid effect */}
                <div className="absolute top-[-10px] left-[-50%] w-[200%] h-[20px] bg-white/30 rounded-[50%] animate-[pulse_3s_linear_infinite] blur-[2px]"></div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="absolute inset-[-8px] bg-white/40 backdrop-blur-[2px] rounded-full -z-10 blur-sm"></div>
              <span className={`text-3xl font-black tracking-tighter ${completionStats.percentage > 50 ? 'text-white drop-shadow-md' : 'text-slate-800'}`}>
                {completionStats.percentage}%
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            {completionStats.isComplete ? (
              <div className="w-full rounded-xl bg-emerald-50 text-emerald-700 font-semibold py-3 flex items-center justify-center gap-2 border border-emerald-100 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Your profile is ready!</span>
              </div>
            ) : (
              <>
                <div className="w-full rounded-xl bg-amber-50 text-amber-800 font-medium py-3 text-center text-sm border border-amber-100 flex flex-col items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-5 h-5" />
                  <span>Complete your profile to stand out.</span>
                </div>
                <button
                  onClick={() => navigate('/candidate/profile')}
                  className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 flex items-center justify-center gap-2 text-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  <User className="w-4 h-4" />
                  Update Profile
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Applications Overview */}
      <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative mx-1">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Applications</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Your activity</p>
          </div>
          {latestApp && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
              {latestApp.status}
            </span>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
              <span className="text-3xl font-black text-slate-800 tracking-tight">{totalApps}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
            </div>
            <div className="bg-white rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
              <span className="text-3xl font-black text-slate-800 tracking-tight">{shortlisted}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Shortlisted</span>
            </div>
          </div>
          <Link to="/candidate/applications" className="flex items-center justify-center w-full rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold text-sm py-3 hover:bg-slate-50 active:scale-[0.98] transition-all">
            View All Applications
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative mx-1 mb-6">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Explore</h2>
          <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Find Opportunities</p>
        </div>
        <div className="p-6">
          <Link to="/candidate/jobs" className="flex items-center justify-between w-full rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold text-sm px-6 py-4 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                <Briefcase size={20} />
              </div>
              <div className="text-left">
                <div className="text-base">Browse Jobs</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">Find your next role</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default CandidateMobileDashboard;
