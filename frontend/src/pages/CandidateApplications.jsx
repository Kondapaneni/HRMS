import React, { useState } from 'react';
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
  Sparkles
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
                    </div>
                  </div>

                  {/* Actions & Timeline Trigger */}
                  <div className="pt-4 mt-4 border-t border-[#f1f3f4] flex items-center justify-between">
                    <span className="text-[11px] text-[#5f6368]">
                      {app.timeline.length} stage {app.timeline.length === 1 ? 'event' : 'events'} recorded
                    </span>
                    <button 
                      type="button"
                      onClick={() => { setTimelineApp(app); setIsTimelineModalOpen(true); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-[#f8fafd] text-xs font-semibold text-[#1a73e8] hover:border-[#1a73e8] transition-all cursor-pointer shadow-2xs"
                    >
                      <span>View Progress Timeline</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Google Material 3 Timeline Modal */}
      {isTimelineModalOpen && timelineApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#e0e3e7] w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#f1f3f4] flex justify-between items-center bg-[#f8fafd]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0 border border-[#ceead6]">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1f1f1f]">Application Progress Timeline</h2>
                  <p className="text-xs text-[#5f6368]">{timelineApp.jobTitle} &bull; {timelineApp.department}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTimelineModalOpen(false)} 
                className="w-8 h-8 rounded-full text-[#5f6368] hover:bg-[#e8eaed] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Timeline Events Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
              {(!timelineApp.timeline || timelineApp.timeline.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-[#dadce0] bg-[#f8fafd] p-8 text-center text-xs text-[#5f6368]">
                  No detailed stage updates have been logged yet. Check back soon!
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#dadce0]">
                  {timelineApp.timeline.map((event, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="relative group">
                        {/* Status Dot */}
                        <div 
                          className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                            isLatest ? 'bg-[#1a73e8] ring-4 ring-[#e8f0fe]' : 'bg-[#dadce0]'
                          }`}
                        />

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
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#f1f3f4] bg-[#f8fafd] flex justify-end">
              <button 
                onClick={() => setIsTimelineModalOpen(false)} 
                className="px-6 py-2.5 text-xs font-semibold text-[#5f6368] hover:text-[#1f1f1f] bg-white border border-[#dadce0] rounded-full hover:bg-[#f1f3f4] transition-all cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CandidateApplications;
