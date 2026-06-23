import React, { useState } from 'react';
import { FileText, ChevronRight, X, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

const CandidateApplications = () => {
  const { profile } = useAuth();
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineApp, setTimelineApp] = useState(null);
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['candidate', 'applications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_date,
          resume_url,
          jobs (
            title,
            department,
            location,
            type,
            deadline
          ),
          application_timeline (
            status_change,
            notes,
            created_at
          )
        `)
        .eq('candidate_id', profile.id)
        .order('applied_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(app => {
        const timeline = Array.isArray(app.application_timeline) ? app.application_timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
        let resumeName = 'Default resume';
        if (app.resume_url) {
           try {
             // Extract filename from URL
             const urlParts = app.resume_url.split('/');
             resumeName = urlParts[urlParts.length - 1];
           } catch(e) {}
        }
        
        return {
          id: app.id,
          jobTitle: app.jobs?.title || 'Unknown Job',
          department: app.jobs?.department || '',
          location: app.jobs?.location || '',
          jobType: app.jobs?.type || '',
          deadline: app.jobs?.deadline,
          appliedDate: app.applied_date,
          status: app.status,
          resumeName: resumeName,
          timeline: timeline
        };
      });
    },
    enabled: !!profile?.id
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied': return 'bg-blue-100 text-blue-700';
      case 'Shortlisted': return 'bg-emerald-100 text-emerald-700';
      case 'Rejected': return 'bg-rose-100 text-rose-700';
      case 'Hired': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Applications</h1>
          <p className="text-sm text-slate-500 mt-1">Follow the latest status updates from recruitment.</p>
        </div>
        
        <div>
          <Link to="/candidate/jobs" className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 text-sm font-medium transition-colors">
            Browse jobs
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {applications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500 bg-slate-50 lg:col-span-2">
            You have not submitted any applications yet.
          </div>
        ) : (
          applications.map(app => {
            const latestUpdate = app.timeline.length > 0 ? app.timeline[0].created_at : app.appliedDate;

            return (
              <div 
                key={app.id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col h-full"
              >
                <div className="p-6 space-y-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{app.jobTitle}</h2>
                      <p className="text-sm text-slate-500 mt-1">{app.department} • {app.location} • {app.jobType}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold self-start ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </div>

                  {/* 2-column Grid for details */}
                  <div className="grid gap-3 grid-cols-2 text-sm flex-1 content-start">
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Applied On</p>
                      <p className="mt-1 font-semibold text-slate-800">{new Date(app.appliedDate).toLocaleDateString()}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Last Date</p>
                      <p className="mt-1 font-semibold text-slate-800">{app.deadline ? new Date(app.deadline).toLocaleDateString() : 'Open until filled'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 overflow-hidden">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Resume</p>
                      <p className="mt-1 font-semibold text-slate-800 truncate" title={app.resumeName}>{app.resumeName}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Latest Update</p>
                      <p className="mt-1 font-semibold text-slate-800">{new Date(latestUpdate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Timeline Button */}
                  {app.timeline.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => { setTimelineApp(app); setIsTimelineModalOpen(true); }}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 h-9 px-4 py-2 text-sm font-medium transition-colors"
                      >
                        View Full Timeline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Timeline Modal */}
      {isTimelineModalOpen && timelineApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50 rounded-t-lg">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Application Timeline</h2>
                <p className="mt-1 text-sm text-slate-500">History of status changes for this application.</p>
              </div>
              <button onClick={() => setIsTimelineModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto chat-scrollbar">
              <div className="relative wrap overflow-hidden p-2">
                <div className="absolute border-opacity-20 border-slate-300 h-full border-l-2" style={{left: '50%', transform: 'translateX(-50%)'}}></div>
                {(!timelineApp.timeline || timelineApp.timeline.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 relative z-10 mx-auto w-3/4">
                    Timeline history is not available yet.
                  </div>
                ) : (
                  timelineApp.timeline.map((event, idx, arr) => {
                    const isLatest = idx === 0;
                    const chronologicalIdx = arr.length - 1 - idx;
                    const isLeft = chronologicalIdx % 2 === 0;
                    return (
                      <div key={idx} className={`mb-8 flex justify-between items-center w-full ${isLeft ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="order-1 w-5/12"></div>
                        <div className="z-20 flex items-center justify-center order-1 bg-blue-50 shadow-sm border-[3px] border-white w-10 h-10 rounded-full relative">
                          {isLatest && (
                            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40 animate-ping"></span>
                          )}
                          <span className="relative text-blue-600">
                            {isLatest ? <CheckCircle2 size={18} className="text-blue-600" /> : <Clock size={16} />}
                          </span>
                        </div>
                        <div className={`order-1 rounded-lg border ${isLatest ? 'border-blue-200 bg-blue-50/50 shadow-md' : 'border-slate-200 bg-white shadow-sm'} w-5/12 p-4`}>
                          <div className="flex flex-col mb-1">
                            <h4 className={`font-semibold ${isLatest ? 'text-blue-900' : 'text-slate-900'}`}>{event.status_change}</h4>
                            <time className="text-xs font-medium text-slate-500 mt-1">
                              {new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </time>
                          </div>
                          {event.notes && (
                            <p className="text-sm text-slate-600 whitespace-pre-line mt-2">{event.notes}</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setIsTimelineModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateApplications;
