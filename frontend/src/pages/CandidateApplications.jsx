import { useState } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { FileText, ChevronRight, X, Clock, Calendar, ArrowRight, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import CandidateMobileApplications from './CandidateMobileApplications';

const CandidateApplications = () => {
  const { profile } = useAuth();
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineApp, setTimelineApp] = useState(null);
  
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['candidate', 'applications', profile?.id],
    queryFn: async () => {
      const res = await api.get('/candidate/applications');
      const apps = res.data.applications || [];

      return apps.map(app => {
        const timeline = Array.isArray(app.application_timeline) ? app.application_timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
        let resumeName = 'Primary Resume';
        if (app.resume_url) {
          if (/^[a-f0-9]{40}$/i.test(String(app.resume_url))) {
            resumeName = 'Selected Resume';
          } else {
            const urlParts = String(app.resume_url).split('/');
            resumeName = urlParts[urlParts.length - 1];
          }
        }
        
        return {
          id: app.id,
          jobTitle: app.jobs?.title || 'Unknown Position',
          department: app.jobs?.department || 'General',
          location: app.jobs?.location || 'Headquarters',
          jobType: app.jobs?.type || 'Full-time',
          deadline: app.jobs?.deadline,
          appliedDate: app.applied_date,
          status: app.status,
          resumeName: resumeName,
          resumeUrl: app.resume_url,
          offerLetterAvailable: Number(app.offer_letter_available) === 1,
          noticePeriod: app.notice_period,
          coverNote: app.cover_note,
          timeline: timeline
        };
      });
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000
  });

  const handlePreviewResume = async (resumeRef) => {
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) return;
    try {
      const isLegacyUrl = String(resumeRef || '').startsWith('http') || String(resumeRef || '').includes('/Resume/');
      const endpoint = isLegacyUrl
        ? `/candidate/resume-file?url=${encodeURIComponent(resumeRef)}`
        : `/candidate/resumes/${encodeURIComponent(resumeRef)}/file`;
      const response = await api.get(endpoint, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      previewWindow.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      previewWindow.close();
      toast.error('Unable to open this resume. Please try again.');
    }
  };


  const handlePreviewOfferLetter = async (applicationId) => {
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) {
      toast.error('Please allow pop-ups to preview the offer letter.');
      return;
    }
    try {
      const response = await api.get(
        `/candidate/applications/${encodeURIComponent(applicationId)}/offer-letter`,
        { responseType: 'blob' }
      );
      const objectUrl = URL.createObjectURL(response.data);
      previewWindow.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      previewWindow.close();
      toast.error('Unable to open this offer letter. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied': 
        return {
          label: 'Applied',
          className: 'bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC]'
        };
      case 'Shortlisted':
      case 'Interviewing': 
        return {
          label: status,
          className: 'bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6]'
        };
      case 'Rejected': 
        return {
          label: 'Rejected',
          className: 'bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4]'
        };
      case 'Hired':
      case 'Selected': 
        return {
          label: 'Hired',
          className: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20'
        };
      default: 
        return {
          label: status || 'Pending',
          className: 'bg-[#EFEFF1] text-[#4A4A52] border border-[#E3E3E7]'
        };
    }
  };

  if (isLoading && applications.length === 0) {
    return <PageLoader message="Loading Applications..." />;
  }

  return (
    <>
      {/* Mobile View */}
      <CandidateMobileApplications 
        applications={applications}
        getStatusBadge={(status) => getStatusBadge(status).className}
        setIsTimelineModalOpen={setIsTimelineModalOpen}
        setTimelineApp={setTimelineApp}
        handlePreviewOfferLetter={handlePreviewOfferLetter}
      />

      {/* Web Desktop View */}
      <div className="space-y-6 hidden md:block pb-12 antialiased">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20">
                Recruitment Tracking
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>My Applications</span>
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 px-2.5 py-0.5 rounded-full">
                {applications.length} Submissions
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Monitor live recruitment statuses, milestones, and hiring feedback for your submissions.
            </p>
          </div>
          
          <div>
            <Link 
              to="/candidate/jobs" 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white text-xs font-semibold tracking-wide transition-all shadow-xs"
            >
              <span>Explore More Jobs</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Applications List Grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          {applications.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-dashed border-[var(--line)] p-12 text-center shadow-xs lg:col-span-2">
              <div className="w-14 h-14 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center mx-auto mb-3 border border-[var(--brand)]/20">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-semibold text-[var(--text)]">No applications submitted yet</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                You haven't applied to any job openings. Browse our active listings and submit your profile today.
              </p>
              <Link 
                to="/candidate/jobs" 
                className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] shadow-xs transition-colors"
              >
                Browse Open Roles
              </Link>
            </div>
          ) : (
            applications.map(app => {
              const latestUpdate = app.timeline.length > 0 ? app.timeline[0].created_at : app.appliedDate;
              const badge = getStatusBadge(app.status);
              const initials = app.jobTitle.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AP';

              return (
                <div 
                  key={app.id}
                  className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-6 shadow-xs hover:border-[var(--brand)]/30 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-bold text-sm border border-[var(--brand)]/20 shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-[var(--text)] tracking-tight">{app.jobTitle}</h2>
                          <p className="text-xs font-medium text-[var(--muted)] mt-0.5">
                            {app.department} &bull; {app.location} &bull; <span className="capitalize">{app.jobType}</span>
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* 2x2 Detail Tiles */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)]">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Applied On</p>
                        <p className="text-xs font-semibold text-[var(--text)] mt-0.5 flex items-center gap-1.5">
                          <Calendar size={13} className="text-[var(--brand-deep)]" />
                          {new Date(app.appliedDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)]">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Latest Activity</p>
                        <p className="text-xs font-semibold text-[var(--text)] mt-0.5 flex items-center gap-1.5">
                          <Clock size={13} className="text-[#1F9D55]" />
                          {new Date(latestUpdate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)] col-span-2 overflow-hidden">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Attached Resume</p>
                        <p className="text-xs font-semibold text-[var(--text)] mt-0.5 truncate flex items-center gap-1.5" title={app.resumeName}>
                          <FileText size={13} className="text-[var(--accent-pink-deep)] shrink-0" />
                          <span className="truncate">{app.resumeName}</span>
                        </p>
                      </div>

                      {app.noticePeriod && (
                        <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)] col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Notice Period / Availability</p>
                          <p className="text-xs font-semibold text-[var(--brand-deep)] mt-0.5">
                            {app.noticePeriod}
                          </p>
                        </div>
                      )}

                      {app.coverNote && (
                        <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)] col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Submitted Cover Note</p>
                          <p className="text-xs text-[var(--text-2)] mt-1 whitespace-pre-line leading-relaxed italic bg-[var(--surface)] p-2.5 rounded-[8px] border border-[var(--line)]">
                            "{app.coverNote}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timeline Trigger */}
                  <div className="pt-4 mt-4 border-t border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-[var(--muted)]">
                      {app.timeline.length} stage {app.timeline.length === 1 ? 'event' : 'events'} recorded
                    </span>
                    <div className="flex items-center gap-2">
                      {app.offerLetterAvailable && (
                        <button
                          type="button"
                          onClick={() => handlePreviewOfferLetter(app.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand-tint)] hover:bg-[var(--brand)]/10 text-xs font-semibold text-[var(--brand-deep)] transition-all cursor-pointer"
                        >
                          <FileText size={13} />
                          <span>View Offer Letter</span>
                        </button>
                      )}
                      {['Hired'].includes(app.status) && (
                        <Link 
                          to="/candidate/documents"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#CEEAD6] bg-[#E6F6EC] hover:bg-[#CEEAD6] text-xs font-semibold text-[#1F9D55] transition-all cursor-pointer"
                        >
                          <Folder size={13} />
                          <span>Upload Docs</span>
                        </Link>
                      )}
                      <button 
                        type="button"
                        onClick={() => { setTimelineApp(app); setIsTimelineModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--brand-deep)] hover:border-[var(--brand)] transition-all cursor-pointer"
                      >
                        <span>View Progress</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Slide-Over Application Progress Timeline Drawer */}
      {isTimelineModalOpen && timelineApp && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsTimelineModalOpen(false); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[var(--surface)] shadow-2xl w-full max-w-lg h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-[var(--line)]">
            {/* Drawer Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  APPLICATION PIPELINE
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Application Progress Timeline
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsTimelineModalOpen(false)} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[var(--surface)]">
              {/* Application Summary Card */}
              <div className="bg-[var(--surface-alt)] rounded-[16px] p-4 border border-[var(--line)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text)]">{timelineApp.jobTitle}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(timelineApp.status).className}`}>
                    {getStatusBadge(timelineApp.status).label}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {timelineApp.department} &bull; {timelineApp.location}
                </p>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px]">
                  <div>
                    <span className="text-[var(--muted)]">Applied On: </span>
                    <span className="font-semibold text-[var(--text)]">{new Date(timelineApp.appliedDate).toLocaleDateString()}</span>
                  </div>
                  {timelineApp.noticePeriod && (
                    <div>
                      <span className="text-[var(--muted)]">Availability: </span>
                      <span className="font-semibold text-[var(--brand-deep)]">{timelineApp.noticePeriod}</span>
                    </div>
                  )}
                </div>

                {timelineApp.resumeUrl && (
                  <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)] truncate max-w-[200px] flex items-center gap-1">
                      <FileText size={12} className="text-[var(--accent-pink-deep)]" />
                      {timelineApp.resumeName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePreviewResume(timelineApp.resumeUrl)}
                      className="text-[11px] font-semibold text-[var(--brand-deep)] hover:underline"
                    >
                      View Resume
                    </button>
                  </div>
                )}

                {timelineApp.coverNote && (
                  <div className="pt-2 border-t border-[var(--line)] text-xs">
                    <span className="text-[10px] uppercase font-semibold text-[var(--muted)] block mb-1">Cover Note</span>
                    <p className="text-xs text-[var(--text-2)] bg-[var(--surface)] p-2.5 rounded-[10px] border border-[var(--line)] italic leading-relaxed">
                      "{timelineApp.coverNote}"
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline Section Title */}
              <div className="flex items-center justify-between pt-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Stage Milestones ({timelineApp.timeline.length})
                </h4>
              </div>

              {/* Timeline Events Body */}
              {(!timelineApp.timeline || timelineApp.timeline.length === 0) ? (
                <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--surface-alt)] p-8 text-center text-xs text-[var(--muted)]">
                  No detailed stage updates have been logged yet. Check back soon!
                </div>
              ) : (
                <div className="relative pl-8 space-y-4">
                  <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-[var(--line)]" />

                  {timelineApp.timeline.map((event, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-8 top-1 w-8 flex items-center justify-center z-10">
                          {isLatest ? (
                            <div className="relative flex items-center justify-center">
                              <span className="absolute w-6 h-6 rounded-full bg-[var(--brand)]/20 animate-ping pointer-events-none" />
                              <div className="relative z-10 w-4.5 h-4.5 rounded-full bg-[var(--brand)] border-2 border-[var(--surface)] shadow-xs" />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-[var(--line)] border-2 border-[var(--surface)]" />
                          )}
                        </div>

                        <div className={`p-4 rounded-[16px] border transition-all ${
                          isLatest ? 'bg-[var(--brand-tint)]/40 border-[var(--brand)]/20' : 'bg-[var(--surface-alt)] border-[var(--line)]'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs font-semibold ${isLatest ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                              {event.status_change}
                            </h4>
                            <span className="text-[10px] font-medium text-[var(--muted)]">
                              {new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-xs text-[var(--text-2)] mt-2 whitespace-pre-line leading-relaxed">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end shrink-0">
              <button 
                type="button"
                onClick={() => setIsTimelineModalOpen(false)} 
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CandidateApplications;
