import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  FileText,
  BadgeCheck,
  UserCheck,
  User,
  FileUp,
  ChevronRight,
  Sparkles,
  Compass,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  ArrowRight,
  Folder
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import CandidateMobileDashboard from './CandidateMobileDashboard';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const CandidateDashboard = () => {
  const { profile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['candidate', 'dashboard', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const [profileRes, appsRes, jobsRes] = await Promise.all([
        api.get('/candidate/profile').catch(() => ({ data: { profile: null } })),
        api.get('/candidate/applications').catch(() => ({ data: { applications: [] } })),
        api.get('/candidate/jobs').catch(() => ({ data: { jobs: [] } }))
      ]);

      return {
        profileData: profileRes.data.profile || null,
        appsData: appsRes.data.applications || [],
        jobsData: jobsRes.data.jobs || []
      };
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000
  });

  const profileData = dashboardData?.profileData;
  const applications = dashboardData?.appsData || [];
  const allJobs = dashboardData?.jobsData || [];
  const jobs = allJobs.slice(0, 4);

  // Calculate completion stats
  let percentage = 0;
  let isComplete = false;
  if (profileData) {
    const fields = ['phone', 'address', 'current_title', 'experience'];
    let filledCount = fields.filter(f => profileData[f] && profileData[f].trim() !== '').length;
    if (profileData.avatar_url) filledCount++;
    const resumes = Array.isArray(profileData.resume_url) ? profileData.resume_url : [];
    if (resumes.length > 0) filledCount++;
    percentage = Math.round((filledCount / 6) * 100);
    isComplete = percentage === 100;
  }
  const completionStats = { percentage, isComplete };

  // Calculate app stats
  const totalApps = applications.length;
  const shortlisted = applications.filter(a => ['Shortlisted', 'Interviewing'].includes(a.status)).length;
  const totalOpenings = allJobs.length;
  const recentApps = applications.slice(0, 4);

  const candidateDisplayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email?.split('@')[0] || 'Candidate';

  const getStatusBadge = (status) => {
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

  if (isLoading && !dashboardData) {
    return <PageLoader message="Loading Candidate Dashboard..." />;
  }

  return (
    <>
      {/* Mobile View - Untouched */}
      <div className="md:hidden">
        <CandidateMobileDashboard
          profileData={profileData}
          completionStats={completionStats}
          applications={applications}
          jobs={allJobs}
          isLoading={isLoading}
        />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI matching Employee Web UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        {/* 1. Workspace Header Bar with 4 Dots & Live Clock Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Workspace Overview
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              {getGreeting()}, {candidateDisplayName}!{' '}
              <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">
                Active Candidate
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Track your hiring stages, discover matched job openings, and manage your credentials.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto bg-white border border-[#e0e3e7] px-3.5 py-1.5 rounded-full shadow-xs">
            <Clock className="w-4 h-4 text-[#1a73e8]" />
            <div className="text-right">
              <p className="text-xs font-semibold text-[#1f1f1f] leading-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] text-[#5f6368] leading-tight">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* 2. KPI Stats Cards (4 Columns matching Employee Layout) */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Applications"
            value={totalApps}
            subtitle={totalApps === 1 ? '1 role submitted' : `${totalApps} roles submitted`}
            icon={FileText}
            colorTheme="blue"
          />
          <StatCard
            title="Shortlisted & Active"
            value={shortlisted}
            subtitle={shortlisted === 1 ? '1 active interview stage' : `${shortlisted} active interview stages`}
            icon={BadgeCheck}
            colorTheme="green"
          />
          <StatCard
            title="Profile Readiness"
            value={`${completionStats.percentage}%`}
            subtitle={completionStats.isComplete ? '100% verified & ready' : 'Profile setup in progress'}
            icon={UserCheck}
            colorTheme="amber"
          />
          <StatCard
            title="Published Openings"
            value={`${totalOpenings} Roles`}
            subtitle="Available for application"
            icon={Briefcase}
            colorTheme="purple"
          />
        </div>

        {/* 3. Profile Completion Alert / Banner if Incomplete */}
        {!completionStats.isComplete && (
          <div className="rounded-2xl border border-[#feefc3] bg-[#fef7e0]/60 p-4.5 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FBBC05] text-[#1f1f1f] flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                {completionStats.percentage}%
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1f1f1f]">
                  Complete your profile to increase your recruiter visibility
                </p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">
                  Add your contact details, experience, and upload your latest resume.
                </p>
              </div>
            </div>
            <Link
              to="/candidate/profile"
              className="inline-flex items-center gap-1 shrink-0 text-xs font-bold text-[#b06000] hover:text-[#8a4b00] hover:underline whitespace-nowrap"
            >
              Complete Profile <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* 4. Main 2-Column Section */}
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          {/* Left: Recent Applications Feed */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs flex flex-col overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[#f1f3f4]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1f1f1f]">Recent Applications</h2>
                  <p className="text-xs text-[#5f6368]">Live recruitment status updates on submitted roles</p>
                </div>
              </div>
              <Link
                to="/candidate/applications"
                className="text-xs font-bold text-[#1a73e8] hover:text-[#1557b0] hover:underline"
              >
                View all ({totalApps})
              </Link>
            </div>

            <div className="p-5 flex-1 space-y-3">
              {recentApps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#dadce0] p-8 text-center bg-[#f8fafd]">
                  <FileText className="w-8 h-8 text-[#5f6368] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-[#1f1f1f]">No applications submitted yet</p>
                  <p className="text-[11px] text-[#5f6368] mt-1">Explore our current job openings and apply in minutes.</p>
                  <Link
                    to="/candidate/jobs"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full bg-[#1a73e8] text-white text-xs font-semibold shadow-xs hover:bg-[#1557b0] transition-colors"
                  >
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                recentApps.map((app) => {
                  const jobTitle = app.jobs?.title || 'Open Position';
                  const initials = jobTitle.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'JB';

                  return (
                    <div
                      key={app.id}
                      className="rounded-xl border border-[#e0e3e7] p-4 hover:bg-[#f8fafd] transition-all hover:border-[#dadce0]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center font-bold text-xs border border-[#ceead6] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-semibold text-xs text-[#1f1f1f]">{jobTitle}</h3>
                            <p className="text-[11px] text-[#5f6368] mt-0.5">
                              {app.jobs?.department || 'Department'} &bull; {app.jobs?.location || 'Location'}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[#5f6368] border-t border-[#f1f3f4] pt-2">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-[#5f6368]" />
                          Applied on {new Date(app.applied_date).toLocaleDateString()}
                        </span>
                        <Link
                          to="/candidate/applications"
                          className="text-[#1a73e8] hover:underline font-semibold"
                        >
                          View Details &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Quick Actions & Fresh Openings */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs p-5">
              <h2 className="text-sm font-bold text-[#1f1f1f] mb-3">Quick Navigation</h2>
              <div className="flex flex-col gap-2">
                <Link
                  to="/candidate/jobs"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafd] hover:bg-[#e8f0fe] border border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 border border-[#d2e3fc]">
                      <Briefcase size={16} />
                    </div>
                    <span>Explore Open Roles</span>
                  </div>
                  <ChevronRight size={15} className="text-[#5f6368] group-hover:text-[#1a73e8] transition-colors" />
                </Link>

                <Link
                  to="/candidate/applications"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafd] hover:bg-[#e6f4ea] border border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0 border border-[#ceead6]">
                      <FileText size={16} />
                    </div>
                    <span>My Applications</span>
                  </div>
                  <ChevronRight size={15} className="text-[#5f6368] group-hover:text-[#137333] transition-colors" />
                </Link>

                <Link
                  to="/candidate/profile"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafd] hover:bg-[#fef7e0] border border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#fef7e0] text-[#b06000] flex items-center justify-center shrink-0 border border-[#feefc3]">
                      <User size={16} />
                    </div>
                    <span>Update Profile &amp; Resume</span>
                  </div>
                  <ChevronRight size={15} className="text-[#5f6368] group-hover:text-[#b06000] transition-colors" />
                </Link>
              </div>
            </div>

            {/* Fresh Openings */}
            <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs flex flex-col overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-[#f1f3f4]">
                <div>
                  <h2 className="text-sm font-bold text-[#1f1f1f]">Fresh Openings</h2>
                  <p className="text-xs text-[#5f6368] mt-0.5">Recently published opportunities</p>
                </div>
                <Link
                  to="/candidate/jobs"
                  className="text-xs font-bold text-[#1a73e8] hover:text-[#1557b0] hover:underline"
                >
                  Browse
                </Link>
              </div>

              <div className="p-4 space-y-2.5">
                {jobs.length === 0 ? (
                  <p className="text-xs text-[#5f6368] text-center py-4">No open positions currently.</p>
                ) : (
                  jobs.map((job) => (
                    <Link
                      key={job.id}
                      to="/candidate/jobs"
                      className="block rounded-xl border border-[#e0e3e7] p-3 hover:bg-[#f8fafd] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-xs text-[#1f1f1f]">{job.title}</p>
                          <p className="text-[10px] text-[#5f6368] mt-0.5">{job.department} &bull; {job.location}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                          Apply
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CandidateDashboard;
