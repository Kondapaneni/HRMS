import React, { useState } from 'react';
import { 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Briefcase, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Award,
  Folder
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const CandidateMobileApplications = ({ 
  applications, getStatusBadge, setIsTimelineModalOpen, setTimelineApp 
}) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Applied':
        return 'bg-[#e8f0fe] text-[#1967d2] border border-[#d2e3fc]';
      case 'Shortlisted':
      case 'Interviewing':
        return 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]';
      case 'Rejected':
        return 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]';
      case 'Hired':
      case 'Selected':
        return 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]';
      default:
        return 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]';
    }
  };

  return (
    <div className="space-y-4 pb-12 md:hidden">
      {/* 1. Hero Section with Animated Motion Graphics (Soft Emerald Theme) */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Soft Glowing Emerald, Teal, and Cyan Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-300" />
            Recruitment Tracker &bull; Candidate Portal
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
            Applications
          </h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
            {applications.length} {applications.length === 1 ? 'submission' : 'submissions'} &bull; Live stage tracking
          </p>
        </div>
      </section>

      {/* 2. Applications List */}
      <div className="space-y-3.5 px-0.5 -mt-8 relative z-20">
        {applications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-[#dadce0] p-8 text-center shadow-xs space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-[#f8fafd] text-[#5f6368] flex items-center justify-center mx-auto border border-[#e0e3e7]">
              <FileText size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#1f1f1f]">No applications submitted yet</h3>
            <p className="text-xs text-[#5f6368] max-w-xs mx-auto">
              You haven't submitted any job applications yet. Discover matched positions and apply today.
            </p>
            <Link
              to="/candidate/jobs"
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#137333] hover:bg-[#0f5b28] shadow-xs transition-colors"
            >
              Browse Open Roles <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          applications.map(app => {
            const latestUpdate = app.timeline && app.timeline.length > 0 ? app.timeline[0].created_at : app.appliedDate;
            const badgeClass = getBadgeStyle(app.status);
            const initials = app.jobTitle ? app.jobTitle.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'AP';

            return (
              <section 
                key={app.id} 
                className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4 hover:border-[#dadce0] transition-all"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center font-bold text-sm border border-[#ceead6] shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-bold text-[#1f1f1f] text-sm leading-snug">
                        {app.jobTitle}
                      </h3>
                      <p className="text-xs font-medium text-[#5f6368] flex items-center gap-1.5 truncate">
                        <span>{app.department || 'Department'}</span>
                        <span>&bull;</span>
                        <span>{app.location || 'Location'}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-2xs ${badgeClass}`}>
                    {app.status}
                  </span>
                </div>

                {/* 2x2 Details Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#f8fafd] rounded-xl p-2.5 border border-[#e0e3e7]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Applied On</p>
                    <p className="text-xs font-bold text-[#1f1f1f] mt-0.5 flex items-center gap-1">
                      <Calendar size={12} className="text-[#1a73e8]" />
                      {new Date(app.appliedDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-[#f8fafd] rounded-xl p-2.5 border border-[#e0e3e7]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Latest Activity</p>
                    <p className="text-xs font-bold text-[#1f1f1f] mt-0.5 flex items-center gap-1">
                      <Clock size={12} className="text-[#137333]" />
                      {new Date(latestUpdate).toLocaleDateString()}
                    </p>
                  </div>

                  {app.resumeName && (
                    <div className="bg-[#f8fafd] rounded-xl p-2.5 border border-[#e0e3e7] col-span-2 overflow-hidden">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Attached Resume</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5 truncate flex items-center gap-1" title={app.resumeName}>
                        <FileText size={12} className="text-[#8430ce] shrink-0" />
                        <span className="truncate">{app.resumeName}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className={`pt-2 border-t border-[#f1f3f4] ${app.status === 'Hired' ? 'grid grid-cols-2 gap-2' : 'flex'}`}>
                  {app.status === 'Hired' && (
                    <Link 
                      to="/candidate/documents"
                      className="h-11 rounded-full border border-[#ceead6] bg-[#e6f4ea] hover:bg-[#ceead6] active:bg-[#ceead6] text-[#137333] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Upload Docs</span>
                    </Link>
                  )}

                  <button 
                    type="button"
                    onClick={() => {
                      setTimelineApp(app);
                      setIsTimelineModalOpen(true);
                    }}
                    className="w-full h-11 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] active:bg-[#d2e3fc] text-[#1a73e8] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{app.status === 'Hired' ? 'Timeline' : 'View Progress Timeline'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#1a73e8]" />
                  </button>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CandidateMobileApplications;
