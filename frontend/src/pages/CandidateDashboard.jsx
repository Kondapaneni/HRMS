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
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import CandidateMobileDashboard from './CandidateMobileDashboard';

const StatCard = ({ title, value, subtitle, icon: Icon, theme = 'blue' }) => {
  const themeClasses = {
    blue: {
      bg: 'bg-[var(--brand-tint)]',
      text: 'text-[var(--brand-deep)]',
      border: 'border-[var(--brand)]/20',
    },
    green: {
      bg: 'bg-[#E6F6EC]',
      text: 'text-[#1F9D55]',
      border: 'border-[#CEEAD6]',
    },
    amber: {
      bg: 'bg-[#FDF3DC]',
      text: 'text-[#B7791F]',
      border: 'border-[#FCE6B8]',
    },
    pink: {
      bg: 'bg-[var(--accent-pink-tint)]',
      text: 'text-[var(--accent-pink-deep)]',
      border: 'border-[var(--accent-pink)]/20',
    }
  }[theme] || {
    bg: 'bg-[var(--brand-tint)]',
    text: 'text-[var(--brand-deep)]',
    border: 'border-[var(--brand)]/20',
  };

  return (
    <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs transition-all duration-200 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[var(--muted)] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-[14px] ${themeClasses.bg} ${themeClasses.text} border ${themeClasses.border} shrink-0`}>
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
        return 'bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC]';
      case 'Shortlisted':
      case 'Interviewing':
        return 'bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6]';
      case 'Rejected':
        return 'bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4]';
      case 'Hired':
      case 'Selected':
        return 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20';
      default:
        return 'bg-[#EFEFF1] text-[#4A4A52] border border-[#E3E3E7]';
    }
  };

  if (isLoading && !dashboardData) {
    return <PageLoader message="Loading Candidate Dashboard..." />;
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <CandidateMobileDashboard
          profileData={profileData}
          completionStats={completionStats}
          applications={applications}
          jobs={allJobs}
          isLoading={isLoading}
        />
      </div>

      {/* Web Desktop View */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        {/* Workspace Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20">
                Candidate Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>{getGreeting()}, {candidateDisplayName}!</span>
              <span className="text-xs font-semibold text-[#1F9D55] bg-[#E6F6EC] border border-[#CEEAD6] px-2.5 py-0.5 rounded-full">
                Active Candidate
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Track your hiring stages, discover matched job openings, and manage your credentials.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto bg-[var(--surface)] border border-[var(--line)] px-4 py-2 rounded-full shadow-xs">
            <Clock className="w-4 h-4 text-[var(--brand-deep)]" />
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--text)] leading-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] text-[var(--muted)] leading-tight">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* KPI Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Applications"
            value={totalApps}
            subtitle={totalApps === 1 ? '1 role submitted' : `${totalApps} roles submitted`}
            icon={FileText}
            theme="blue"
          />
          <StatCard
            title="Shortlisted & Active"
            value={shortlisted}
            subtitle={shortlisted === 1 ? '1 active interview stage' : `${shortlisted} active interview stages`}
            icon={BadgeCheck}
            theme="green"
          />
          <StatCard
            title="Profile Readiness"
            value={`${completionStats.percentage}%`}
            subtitle={completionStats.isComplete ? '100% verified & ready' : 'Profile setup in progress'}
            icon={UserCheck}
            theme="amber"
          />
          <StatCard
            title="Published Openings"
            value={`${totalOpenings} Roles`}
            subtitle="Available for application"
            icon={Briefcase}
            theme="pink"
          />
        </div>

        {/* Profile Completion Alert */}
        {!completionStats.isComplete && (
          <div className="rounded-[20px] border border-[#FCE6B8] bg-[#FDF3DC] p-4.5 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-[var(--surface)] text-[#B7791F] border border-[#FCE6B8] flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                {completionStats.percentage}%
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">
                  Complete your profile to increase your recruiter visibility
                </p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Add your contact details, experience, and upload your latest resume.
                </p>
              </div>
            </div>
            <Link
              to="/candidate/profile"
              className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-[#B7791F] hover:underline whitespace-nowrap"
            >
              Complete Profile <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Main 2-Column Section */}
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          {/* Left: Recent Applications Feed */}
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-xs flex flex-col overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">Recent Applications</h2>
                  <p className="text-xs text-[var(--muted)]">Live recruitment status updates on submitted roles</p>
                </div>
              </div>
              <Link
                to="/candidate/applications"
                className="text-xs font-semibold text-[var(--brand-deep)] hover:underline"
              >
                View all ({totalApps})
              </Link>
            </div>

            <div className="p-5 flex-1 space-y-3">
              {recentApps.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[var(--line)] p-8 text-center bg-[var(--surface-alt)]">
                  <FileText className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-[var(--text)]">No applications submitted yet</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1">Explore our current job openings and apply in minutes.</p>
                  <Link
                    to="/candidate/jobs"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full bg-[var(--ink)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--ink-2)] transition-colors"
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
                      className="rounded-[16px] border border-[var(--line)] p-4 bg-[var(--surface)] hover:bg-[var(--surface-alt)] transition-all hover:border-[var(--brand)]/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-bold text-xs border border-[var(--brand)]/20 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-semibold text-xs text-[var(--text)]">{jobTitle}</h3>
                            <p className="text-[11px] text-[var(--muted)] mt-0.5">
                              {app.jobs?.department || 'Department'} &bull; {app.jobs?.location || 'Location'}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)] border-t border-[var(--line)] pt-2">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-[var(--muted)]" />
                          Applied on {new Date(app.applied_date).toLocaleDateString()}
                        </span>
                        <Link
                          to="/candidate/applications"
                          className="text-[var(--brand-deep)] hover:underline font-semibold"
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
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-xs p-5">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Quick Navigation</h2>
              <div className="flex flex-col gap-2">
                <Link
                  to="/candidate/jobs"
                  className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--brand-tint)]/50 border border-[var(--line)] text-xs font-semibold text-[var(--text)] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 border border-[var(--brand)]/20">
                      <Briefcase size={16} />
                    </div>
                    <span>Explore Open Roles</span>
                  </div>
                  <ChevronRight size={15} className="text-[var(--muted)] group-hover:text-[var(--brand-deep)] transition-colors" />
                </Link>

                <Link
                  to="/candidate/applications"
                  className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--accent-pink-tint)]/50 border border-[var(--line)] text-xs font-semibold text-[var(--text)] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center shrink-0 border border-[var(--accent-pink)]/20">
                      <FileText size={16} />
                    </div>
                    <span>My Applications</span>
                  </div>
                  <ChevronRight size={15} className="text-[var(--muted)] group-hover:text-[var(--accent-pink-deep)] transition-colors" />
                </Link>

                <Link
                  to="/candidate/profile"
                  className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--line)]/60 border border-[var(--line)] text-xs font-semibold text-[var(--text)] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] text-[var(--muted)] flex items-center justify-center shrink-0 border border-[var(--line)]">
                      <User size={16} />
                    </div>
                    <span>Update Profile &amp; Resume</span>
                  </div>
                  <ChevronRight size={15} className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" />
                </Link>
              </div>
            </div>

            {/* Fresh Openings */}
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-xs flex flex-col overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-[var(--line)]">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">Fresh Openings</h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Recently published opportunities</p>
                </div>
                <Link
                  to="/candidate/jobs"
                  className="text-xs font-semibold text-[var(--brand-deep)] hover:underline"
                >
                  Browse
                </Link>
              </div>

              <div className="p-4 space-y-2.5">
                {jobs.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] text-center py-4">No open positions currently.</p>
                ) : (
                  jobs.map((job) => (
                    <Link
                      key={job.id}
                      to="/candidate/jobs"
                      className="block rounded-[14px] border border-[var(--line)] p-3 hover:bg-[var(--surface-alt)] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-xs text-[var(--text)]">{job.title}</p>
                          <p className="text-[10px] text-[var(--muted)] mt-0.5">{job.department} &bull; {job.location}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6]">
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
