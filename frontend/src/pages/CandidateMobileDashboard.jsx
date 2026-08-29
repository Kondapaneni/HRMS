import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  FileText,
  User,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Compass,
  FileUp,
  Clock,
  Sparkles,
  Folder,
  TrendingUp,
  Award,
  ArrowUpRight,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const CandidateMobileDashboard = ({ profileData, completionStats, applications, jobs, isLoading }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalApps = applications?.length || 0;
  const shortlisted = (applications || []).filter((a) => ['Shortlisted', 'Interviewing'].includes(a.status)).length;
  const totalOpenings = jobs?.length || 0;
  const recentApps = (applications || []).slice(0, 4);
  const latestOpenings = (jobs || []).slice(0, 4);

  const candidateDisplayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email?.split('@')[0] || 'Candidate';

  const heroSubtitle = profileData?.current_title || 'Candidate Portal';

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0 shadow-2xs">
            <Clock size={12} /> Applied
          </span>
        );
      case 'Shortlisted':
      case 'Interviewing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0 shadow-2xs">
            <TrendingUp size={12} /> {status}
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] shrink-0 shadow-2xs">
            <AlertCircle size={12} /> Rejected
          </span>
        );
      case 'Hired':
      case 'Selected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff] shrink-0 shadow-2xs">
            <Award size={12} /> Hired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0 shadow-2xs">
            {status || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Hero Section with Animated Emerald/Teal Motion Graphics */}
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
            {getGreeting()} &bull; Candidate Portal
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
            Hello, {candidateDisplayName}
          </h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} &bull; {heroSubtitle}
          </p>
        </div>
      </section>

      {/* 2. 4 KPI Metric Cards (2x2 Grid) Exactly like Sales Origination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-20 -mt-8 mx-0.5">
        {/* Card 1: Total Applications */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
              Total Applications
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                {totalApps}
              </p>
              <span className="inline-flex items-center text-xs font-bold text-[#137333]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">Roles submitted</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#e6f4ea] text-[#137333] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Shortlisted & Active */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
              Shortlisted &amp; Active
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#137333] tracking-tight">
                {shortlisted}
              </p>
              <span className="inline-flex items-center text-xs font-bold text-[#137333]">
                <TrendingUp className="w-3.5 h-3.5" />
                In Stage
              </span>
            </div>
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">Interviewing &amp; reviews</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#e6f4ea] text-[#137333] shrink-0">
            <BadgeCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Profile Readiness */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
              Profile Readiness
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                {completionStats?.percentage || 0}%
              </p>
              <span className={`inline-flex items-center text-xs font-bold ${completionStats?.isComplete ? 'text-[#137333]' : 'text-[#b06000]'}`}>
                {completionStats?.isComplete ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {completionStats?.isComplete ? '100% Ready' : 'Pending'}
              </span>
            </div>
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">Profile &amp; resume score</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#fef7e0] text-[#b06000] shrink-0">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Published Openings */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
              Published Openings
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                {totalOpenings}
              </p>
              <span className="inline-flex items-center text-xs font-bold text-[#1a73e8]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Open Now
              </span>
            </div>
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">Available for application</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Candidate Quick Apps Row (Round Circle Apps in a Row matching Sales Origination style) */}
      <section className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">Candidate Portal</h2>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Tap to open workspace module</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] shrink-0 shadow-2xs">
            Hub
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Jobs */}
          <Link to="/candidate/jobs" className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-full bg-[#e6f4ea] border border-[#ceead6] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
              <Briefcase className="w-6 h-6 text-[#137333]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Jobs</span>
          </Link>

          {/* Applications */}
          <Link to="/candidate/applications" className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
              <FileText className="w-6 h-6 text-[#1a73e8]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Applications</span>
          </Link>

          {/* Documents */}
          <Link to="/candidate/documents" className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-full bg-[#f3e8fd] border border-[#e9d5ff] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
              <Folder className="w-6 h-6 text-[#8430ce]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Documents</span>
          </Link>

          {/* Profile */}
          <Link to="/candidate/profile" className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-full bg-[#fef7e0] border border-[#feefc3] flex items-center justify-center shadow-xs group-active:scale-90 transition-transform duration-150">
              <User className="w-6 h-6 text-[#b06000]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 text-center leading-tight">Profile</span>
          </Link>
        </div>
      </section>

      {/* 4. Recent Applications Feed (Matching Pipeline Leads Feed style) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1f1f1f]">My Applications</h3>
              <p className="text-[11px] text-[#5f6368]">Live stage tracking</p>
            </div>
          </div>

          <Link
            to="/candidate/applications"
            className="inline-flex items-center gap-1 text-[13px] font-bold text-[#137333] hover:text-[#0b5324] transition-colors shrink-0"
          >
            <span>View All</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        <div className="divide-y divide-[#f1f3f4]">
          {isLoading ? (
            <p className="text-center py-6 text-xs text-[#5f6368]">Loading applications...</p>
          ) : recentApps.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-[#5f6368]">No job applications submitted yet.</p>
              <Link
                to="/candidate/jobs"
                className="inline-flex items-center gap-1 text-[#137333] font-bold text-xs hover:underline"
              >
                Browse Open Roles <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            recentApps.map((app) => {
              const jobTitle = app.jobs?.title || 'Applied Position';
              const initials = jobTitle.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'JB';

              return (
                <Link
                  key={app.id}
                  to="/candidate/applications"
                  className="py-3.5 flex items-center justify-between gap-2 hover:bg-[#f8fafd] transition-colors rounded-xl px-1.5 -mx-1.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-xs flex items-center justify-center shrink-0 border border-[#ceead6]">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-[#1f1f1f] text-sm truncate">
                        {jobTitle}
                      </h4>
                      <div className="flex items-center gap-2 text-[10.5px] text-[#5f6368]">
                        <span className="truncate">
                          {app.jobs?.department || 'Department'} &bull; {app.jobs?.location || 'Location'}
                        </span>
                        <span>&bull;</span>
                        <span className="shrink-0 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(app.applied_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {getStatusBadge(app.status)}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Fresh Job Openings Feed */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1f1f1f]">Fresh Job Openings</h3>
              <p className="text-[11px] text-[#5f6368]">Published positions open for applying</p>
            </div>
          </div>

          <Link
            to="/candidate/jobs"
            className="inline-flex items-center gap-1 text-[13px] font-bold text-[#1a73e8] hover:text-[#1557b0] transition-colors shrink-0"
          >
            <span>Browse All</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        <div className="divide-y divide-[#f1f3f4]">
          {latestOpenings.length === 0 ? (
            <p className="text-center py-6 text-xs text-[#5f6368]">No new openings at the moment.</p>
          ) : (
            latestOpenings.map((job) => (
              <Link
                key={job.id}
                to="/candidate/jobs"
                className="py-3.5 flex items-center justify-between gap-2 hover:bg-[#f8fafd] transition-colors rounded-xl px-1.5 -mx-1.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 font-bold text-sm border border-[#d2e3fc]">
                    <Briefcase size={18} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-bold text-[#1f1f1f] text-sm truncate">
                      {job.title}
                    </h4>
                    <p className="text-xs text-[#5f6368] truncate">
                      {job.department} &bull; {job.location}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0 shadow-2xs">
                  Apply
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateMobileDashboard;
