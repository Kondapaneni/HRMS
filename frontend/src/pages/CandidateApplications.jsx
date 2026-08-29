import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  FileText, 
  ChevronRight, 
  X, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  MapPin, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Award,
  Sparkles,
  Folder
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../api/axios';
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
           try {
             const urlParts = app.resume_url.split('/');
             resumeName = urlParts[urlParts.length - 1];
           } catch(e) {}
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
          noticePeriod: app.notice_period,
          coverNote: app.cover_note,
          timeline: timeline
        };
      });
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied': 
        return {
          label: 'Applied',
          className: 'bg-[#e8f0fe] text-[#1967d2] border border-[#d2e3fc]'
        };
      case 'Shortlisted':
      case 'Interviewing': 
        return {
          label: status,
          className: 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
        };
      case 'Rejected': 
        return {
          label: 'Rejected',
          className: 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]'
        };
      case 'Hired':
      case 'Selected': 
        return {
          label: 'Hired',
          className: 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]'
        };
      default: 
        return {
          label: status || 'Pending',
          className: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
        };
    }
  };

  if (isLoading && applications.length === 0) {
    return <PageLoader message="Loading Applications..." />;
  }

  return (
    <>
      {/* Mobile View - Untouched */}
      <CandidateMobileApplications 
        applications={applications}
        getStatusBadge={(status) => getStatusBadge(status).className}
        setIsTimelineModalOpen={setIsTimelineModalOpen}
        setTimelineApp={setTimelineApp}
      />

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="space-y-6 hidden md:block pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Recruitment Tracking
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              My Applications
              <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">
                {applications.length} Submissions
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Monitor live recruitment statuses, milestones, and hiring feedback for your submissions.
            </p>
          </div>
          
          <div>
            <Link 
              to="/candidate/jobs" 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-xs font-semibold tracking-wide transition-all shadow-xs"
            >
              <span>Explore More Jobs</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Applications List Grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          {applications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#dadce0] p-12 text-center shadow-xs lg:col-span-2">
              <div className="w-14 h-14 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto mb-3 text-[#5f6368]">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-[#1f1f1f]">No applications submitted yet</h3>
              <p className="text-xs text-[#5f6368] mt-1 max-w-sm mx-auto">
                You haven't applied to any job openings. Browse our active listings and submit your profile today.
              </p>
              <Link 
                to="/candidate/jobs" 
                className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-xs transition-colors"
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
                  className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs hover:border-[#dadce0] hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center font-bold text-sm border border-[#ceead6] shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-[#1f1f1f] tracking-tight">{app.jobTitle}</h2>
                          <p className="text-xs font-medium text-[#5f6368] mt-0.5">
                            {app.department} &bull; {app.location} &bull; <span className="capitalize">{app.jobType}</span>
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold shrink-0 shadow-2xs ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* 2x2 Detail Tiles */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Applied On</p>
                        <p className="text-xs font-bold text-[#1f1f1f] mt-0.5 flex items-center gap-1.5">
                          <Calendar size={13} className="text-[#1a73e8]" />
                          {new Date(app.appliedDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Latest Activity</p>
                        <p className="text-xs font-bold text-[#1f1f1f] mt-0.5 flex items-center gap-1.5">
                          <Clock size={13} className="text-[#137333]" />
                          {new Date(latestUpdate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7] col-span-2 overflow-hidden">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Attached Resume</p>
                        <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5 truncate flex items-center gap-1.5" title={app.resumeName}>
                          <FileText size={13} className="text-[#8430ce] shrink-0" />
                          <span className="truncate">{app.resumeName}</span>
                        </p>
                      </div>

                      {app.noticePeriod && (
                        <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7] col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Notice Period / Availability</p>
                          <p className="text-xs font-semibold text-[#1a73e8] mt-0.5">
                            {app.noticePeriod}
                          </p>
                        </div>
                      )}

                      {app.coverNote && (
                        <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7] col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Submitted Cover Note</p>
                          <p className="text-xs text-[#444746] mt-1 whitespace-pre-line leading-relaxed italic bg-white p-2.5 rounded-lg border border-[#e0e3e7]">
                            "{app.coverNote}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timeline Trigger */}
                  <div className="pt-4 mt-4 border-t border-[#f1f3f4] flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-[#5f6368]">
                      {app.timeline.length} stage {app.timeline.length === 1 ? 'event' : 'events'} recorded
                    </span>
                    <div className="flex items-center gap-2">
                      <Link 
                        to="/candidate/documents"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#ceead6] bg-[#e6f4ea] hover:bg-[#ceead6] text-xs font-semibold text-[#137333] transition-all cursor-pointer shadow-2xs"
                      >
                        <Folder size={13} />
                        <span>Upload Docs</span>
                      </Link>
                      <button 
                        type="button"
                        onClick={() => { setTimelineApp(app); setIsTimelineModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f8fafd] text-xs font-semibold text-[#1a73e8] hover:border-[#1a73e8] transition-all cursor-pointer shadow-2xs"
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

      {/* Google Workspace Slide-Over Application Progress Timeline Drawer */}
      {isTimelineModalOpen && timelineApp && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsTimelineModalOpen(false); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white shadow-2xl w-full max-w-lg h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Top 4-Color Gradient Accent Line */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#1f1f1f]">Application Progress Timeline</h2>
                  <p className="text-xs text-[#5f6368]">{timelineApp.jobTitle} &bull; {timelineApp.department}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTimelineModalOpen(false)} 
                className="p-1.5 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Application Summary Card */}
              <div className="bg-[#f8fafd] rounded-2xl p-4 border border-[#e0e3e7] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1f1f1f]">{timelineApp.jobTitle}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(timelineApp.status).className}`}>
                    {getStatusBadge(timelineApp.status).label}
                  </span>
                </div>
                <p className="text-xs text-[#5f6368]">
                  {timelineApp.department} &bull; {timelineApp.location}
                </p>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e0e3e7]/80 text-[11px]">
                  <div>
                    <span className="text-[#5f6368]">Applied On: </span>
                    <span className="font-semibold text-[#1f1f1f]">{new Date(timelineApp.appliedDate).toLocaleDateString()}</span>
                  </div>
                  {timelineApp.noticePeriod && (
                    <div>
                      <span className="text-[#5f6368]">Availability: </span>
                      <span className="font-semibold text-[#1a73e8]">{timelineApp.noticePeriod}</span>
                    </div>
                  )}
                </div>

                {timelineApp.resumeUrl && (
                  <div className="pt-2 border-t border-[#e0e3e7]/80 flex items-center justify-between text-xs">
                    <span className="text-[#5f6368] truncate max-w-[200px] flex items-center gap-1">
                      <FileText size={12} className="text-[#8430ce]" />
                      {timelineApp.resumeName}
                    </span>
                    <a
                      href={timelineApp.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-[#1a73e8] hover:underline"
                    >
                      View Resume
                    </a>
                  </div>
                )}

                {timelineApp.coverNote && (
                  <div className="pt-2 border-t border-[#e0e3e7]/80 text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#5f6368] block mb-1">Cover Note</span>
                    <p className="text-xs text-[#444746] bg-white p-2.5 rounded-xl border border-[#dadce0] italic leading-relaxed">
                      "{timelineApp.coverNote}"
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline Section Title */}
              <div className="flex items-center justify-between pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5f6368]">
                  Stage Milestones ({timelineApp.timeline.length})
                </h4>
              </div>

              {/* Timeline Events Body */}
              {(!timelineApp.timeline || timelineApp.timeline.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-[#dadce0] bg-[#f8fafd] p-8 text-center text-xs text-[#5f6368]">
                  No detailed stage updates have been logged yet. Check back soon!
                </div>
              ) : (
                <div className="relative pl-8 space-y-4">
                  {/* Continuous Vertical Connector Line */}
                  <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-[#dadce0]" />

                  {timelineApp.timeline.map((event, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="relative group">
                        {/* Status Milestone Dot with Wave Ripple Animation */}
                        <div className="absolute -left-8 top-1 w-8 flex items-center justify-center z-10">
                          {isLatest ? (
                            <div className="relative flex items-center justify-center">
                              {/* Pulsing Wave Ripple Animations */}
                              <span className="absolute w-7 h-7 rounded-full bg-[#1a73e8]/25 animate-ping pointer-events-none" />
                              <span className="absolute w-5 h-5 rounded-full bg-[#1a73e8]/20 animate-pulse pointer-events-none" />
                              
                              {/* Core Milestone Pin */}
                              <div className="relative z-10 w-5 h-5 rounded-full bg-[#e8f0fe] border-2 border-white ring-2 ring-[#1a73e8]/40 flex items-center justify-center shadow-xs">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-[#dadce0] border-2 border-white shadow-2xs" />
                          )}
                        </div>

                        {/* Event Content Box */}
                        <div className={`p-4 rounded-2xl border transition-all ${
                          isLatest ? 'bg-[#e8f0fe]/40 border-[#d2e3fc] shadow-2xs' : 'bg-[#f8fafd] border-[#e0e3e7]'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs font-bold ${isLatest ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
                              {event.status_change}
                            </h4>
                            <span className="text-[10px] font-medium text-[#5f6368]">
                              {new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-xs text-[#444746] mt-2 whitespace-pre-line leading-relaxed">
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
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end shrink-0">
              <button 
                onClick={() => setIsTimelineModalOpen(false)} 
                className="px-6 py-2.5 text-xs font-semibold text-[#5f6368] hover:text-[#1f1f1f] bg-white border border-[#dadce0] rounded-full hover:bg-[#f1f3f4] transition-all cursor-pointer shadow-2xs"
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
