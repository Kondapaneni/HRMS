import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import {
  Briefcase,
  FileText,
  User,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Folder,
  TrendingUp,
  Award,
  ArrowUpRight,
  ArrowRight,
  BadgeCheck,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CandidateMobileDashboard = ({ profileData, completionStats, applications, jobs, isLoading }) => {
  const { profile } = useAuth();
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC] shrink-0">
            <Clock size={11} /> Applied
          </span>
        );
      case 'Shortlisted':
      case 'Interviewing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6] shrink-0">
            <TrendingUp size={11} /> {status}
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4] shrink-0">
            <AlertCircle size={11} /> Rejected
          </span>
        );
      case 'Hired':
      case 'Selected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20 shrink-0">
            <Award size={11} /> Hired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EFEFF1] text-[#4A4A52] border border-[#E3E3E7] shrink-0">
            {status || 'Pending'}
          </span>
        );
    }
  };

  if (isLoading) return <PageLoader message="Loading candidate dashboard..." />;

  return (
    <div className="space-y-4 pb-14 antialiased select-none font-sans">
      {/* Header */}
      <section className="pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--accent-pink-deep)]" />
            {getGreeting()} • Candidate Portal
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Hello, <span className="text-[var(--accent-pink-deep)]">{candidateDisplayName}</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#1F9D55] bg-[#E6F6EC] border border-[#CEEAD6] shrink-0">
              Active
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--muted)] mt-1">
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {heroSubtitle}
          </p>
        </div>
      </section>

      {/* 4 KPI Metric Cards (2x2 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Total Applications */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Total Applications
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                {totalApps}
              </p>
              <span className="inline-flex items-center text-xs font-semibold text-[#1F9D55]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Roles submitted</p>
          </div>
          <div className="p-3 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--brand)]/20 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Shortlisted & Active */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Shortlisted &amp; Active
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[#1F9D55] tracking-tight">
                {shortlisted}
              </p>
              <span className="inline-flex items-center text-xs font-semibold text-[#1F9D55]">
                <TrendingUp className="w-3.5 h-3.5" />
                In Stage
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Interviewing &amp; reviews</p>
          </div>
          <div className="p-3 rounded-[12px] bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6] shrink-0">
            <BadgeCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Profile Readiness */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Profile Readiness
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                {completionStats?.percentage || 0}%
              </p>
              <span className={`inline-flex items-center text-xs font-semibold ${completionStats?.isComplete ? 'text-[#1F9D55]' : 'text-[#B7791F]'}`}>
                {completionStats?.isComplete ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {completionStats?.isComplete ? '100% Ready' : 'Pending'}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Profile score</p>
          </div>
          <div className="p-3 rounded-[12px] bg-[#FDF3DC] text-[#B7791F] border border-[#FCE6B8] shrink-0">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Published Openings */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Published Openings
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                {totalOpenings}
              </p>
              <span className="inline-flex items-center text-xs font-semibold text-[var(--brand-deep)]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Open Now
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Available for application</p>
          </div>
          <div className="p-3 rounded-[12px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Candidate Quick Apps Row */}
      <section className="bg-[var(--surface)] rounded-[20px] shadow-xs border border-[var(--line)] overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)] tracking-tight">Candidate Portal</h2>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Tap to open workspace module</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 shrink-0">
            Hub
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Jobs */}
          <Link to="/candidate/jobs" className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] group-hover:border-[var(--brand)]/30 flex items-center justify-center shadow-xs group-active:scale-95 transition-all">
              <Briefcase className="w-5 h-5 text-[var(--brand-deep)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text)] text-center leading-tight">Jobs</span>
          </Link>

          {/* Applications */}
          <Link to="/candidate/applications" className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] group-hover:border-[var(--brand)]/30 flex items-center justify-center shadow-xs group-active:scale-95 transition-all">
              <FileText className="w-5 h-5 text-[var(--accent-pink-deep)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text)] text-center leading-tight">Applications</span>
          </Link>

          {/* Documents */}
          <Link to="/candidate/documents" className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] group-hover:border-[var(--brand)]/30 flex items-center justify-center shadow-xs group-active:scale-95 transition-all">
              <Folder className="w-5 h-5 text-[var(--brand-deep)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text)] text-center leading-tight">Documents</span>
          </Link>

          {/* Profile */}
          <Link to="/candidate/profile" className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] group-hover:border-[var(--brand)]/30 flex items-center justify-center shadow-xs group-active:scale-95 transition-all">
              <User className="w-5 h-5 text-[var(--muted)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text)] text-center leading-tight">Profile</span>
          </Link>
        </div>
      </section>

      {/* Recent Applications Feed */}
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">My Applications</h3>
              <p className="text-[11px] text-[var(--muted)]">Live stage tracking</p>
            </div>
          </div>

          <Link
            to="/candidate/applications"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-deep)] hover:underline shrink-0"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {isLoading ? (
            <p className="text-center py-6 text-xs text-[var(--muted)]">Loading applications...</p>
          ) : recentApps.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-[var(--muted)]">No job applications submitted yet.</p>
              <Link
                to="/candidate/jobs"
                className="inline-flex items-center gap-1 text-[var(--brand-deep)] font-semibold text-xs hover:underline"
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
                  className="py-3 flex items-center justify-between gap-2 hover:bg-[var(--surface-alt)] transition-colors rounded-[12px] px-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--brand)]/20">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-semibold text-[var(--text)] text-sm truncate">
                        {jobTitle}
                      </h4>
                      <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)]">
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

      {/* Fresh Job Openings Feed */}
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Fresh Job Openings</h3>
              <p className="text-[11px] text-[var(--muted)]">Published positions open for applying</p>
            </div>
          </div>

          <Link
            to="/candidate/jobs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-deep)] hover:underline shrink-0"
          >
            <span>Browse All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {latestOpenings.length === 0 ? (
            <p className="text-center py-6 text-xs text-[var(--muted)]">No new openings at the moment.</p>
          ) : (
            latestOpenings.map((job) => (
              <Link
                key={job.id}
                to="/candidate/jobs"
                className="py-3 flex items-center justify-between gap-2 hover:bg-[var(--surface-alt)] transition-colors rounded-[12px] px-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[10px] bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)] flex items-center justify-center shrink-0 font-bold text-sm">
                    <Briefcase size={17} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-semibold text-[var(--text)] text-sm truncate">
                      {job.title}
                    </h4>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {job.department} &bull; {job.location}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6] shrink-0">
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
