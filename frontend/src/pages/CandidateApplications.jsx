import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

const CandidateApplications = () => {
  const { profile } = useAuth();
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

      <div className="grid gap-4">
        {applications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500 bg-slate-50">
            You have not submitted any applications yet.
          </div>
        ) : (
          applications.map(app => {
            const latestUpdate = app.timeline.length > 0 ? app.timeline[0].created_at : app.appliedDate;

            return (
              <div 
                key={app.id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{app.jobTitle}</h2>
                      <p className="text-sm text-slate-500 mt-1">{app.department} • {app.location} • {app.jobType}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </div>

                  {/* 4-column Grid */}
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Applied On</p>
                      <p className="mt-2 font-semibold text-slate-800">{new Date(app.appliedDate).toLocaleDateString()}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Last Date</p>
                      <p className="mt-2 font-semibold text-slate-800">{app.deadline ? new Date(app.deadline).toLocaleDateString() : 'Open until filled'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 overflow-hidden">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Resume</p>
                      <p className="mt-2 font-semibold text-slate-800 truncate" title={app.resumeName}>{app.resumeName}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest Update</p>
                      <p className="mt-2 font-semibold text-slate-800">{new Date(latestUpdate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Status History */}
                  {app.timeline.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-3">Status history</h3>
                      <div className="space-y-3">
                        {app.timeline.slice(0, 3).map((log, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 bg-white">
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{log.status_change}</p>
                              {log.notes && (
                                <p className="text-sm text-slate-500 mt-1">{log.notes}</p>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CandidateApplications;
