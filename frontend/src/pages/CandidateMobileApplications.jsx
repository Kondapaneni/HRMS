import React from 'react';
import { 
  FileText, 
  ChevronRight, 
  Clock, 
  Calendar, 
  Sparkles, 
  ArrowRight,
  Folder
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CandidateMobileApplications = ({ 
  applications, getStatusBadge, setIsTimelineModalOpen, setTimelineApp 
}) => {
  const getBadgeStyle = (status) => {
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

  return (
    <div className="space-y-4 pb-14 antialiased select-none font-sans md:hidden">
      {/* Header */}
      <section className="pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--accent-pink-deep)]" />
            Recruitment Tracker • Candidate Portal
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Applications
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 shrink-0">
              {applications.length} {applications.length === 1 ? 'submission' : 'submissions'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--muted)] mt-1">
            Live stage and milestone tracking
          </p>
        </div>
      </section>

      {/* Applications List */}
      <div className="space-y-3.5 px-0.5">
        {applications.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-[20px] border border-dashed border-[var(--line)] p-8 text-center shadow-xs space-y-2.5">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center mx-auto border border-[var(--brand)]/20">
              <FileText size={20} />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text)]">No applications submitted yet</h3>
            <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
              You haven't submitted any job applications yet. Discover matched positions and apply today.
            </p>
            <Link
              to="/candidate/jobs"
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] shadow-xs transition-colors"
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
                className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3.5 hover:border-[var(--brand)]/30 transition-all"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-bold text-xs border border-[var(--brand)]/20 shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-semibold text-[var(--text)] text-sm leading-snug">
                        {app.jobTitle}
                      </h3>
                      <p className="text-xs font-medium text-[var(--muted)] flex items-center gap-1.5 truncate">
                        <span>{app.department || 'Department'}</span>
                        <span>&bull;</span>
                        <span>{app.location || 'Location'}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badgeClass}`}>
                    {app.status}
                  </span>
                </div>

                {/* 2x2 Details Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[var(--surface-alt)] rounded-[10px] p-2.5 border border-[var(--line)]">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Applied On</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5 flex items-center gap-1">
                      <Calendar size={12} className="text-[var(--brand-deep)]" />
                      {new Date(app.appliedDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-[var(--surface-alt)] rounded-[10px] p-2.5 border border-[var(--line)]">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Latest Activity</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5 flex items-center gap-1">
                      <Clock size={12} className="text-[#1F9D55]" />
                      {new Date(latestUpdate).toLocaleDateString()}
                    </p>
                  </div>

                  {app.resumeName && (
                    <div className="bg-[var(--surface-alt)] rounded-[10px] p-2.5 border border-[var(--line)] col-span-2 overflow-hidden">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Attached Resume</p>
                      <p className="text-xs font-semibold text-[var(--text)] mt-0.5 truncate flex items-center gap-1" title={app.resumeName}>
                        <FileText size={12} className="text-[var(--accent-pink-deep)] shrink-0" />
                        <span className="truncate">{app.resumeName}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className={`pt-2 border-t border-[var(--line)] ${app.status === 'Hired' ? 'grid grid-cols-2 gap-2' : 'flex'}`}>
                  {app.status === 'Hired' && (
                    <Link 
                      to="/candidate/documents"
                      className="h-10 rounded-full border border-[#CEEAD6] bg-[#E6F6EC] hover:bg-[#CEEAD6] text-[#1F9D55] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
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
                    className="w-full h-10 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-[var(--text)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-[var(--brand-deep)]" />
                    <span>{app.status === 'Hired' ? 'Timeline' : 'View Progress'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
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
