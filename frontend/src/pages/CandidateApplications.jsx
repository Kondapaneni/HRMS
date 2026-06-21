import React from 'react';
import { CheckCircle2, Clock, Calendar, FileText, ChevronRight, XCircle, AlertCircle } from 'lucide-react';
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
          jobs (
            title,
            department
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

      // Transform data for UI
      return (data || []).map(app => {
        // Sort timeline
        const timeline = Array.isArray(app.application_timeline) ? app.application_timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
        const latestNote = timeline.length > 0 ? timeline[0].notes : 'Awaiting review';

        let mappedStatus = 'applied';
        const rawStatus = app.status ? app.status.toLowerCase() : 'applied';
        
        if (rawStatus === 'applied') mappedStatus = 'applied';
        else if (rawStatus === 'shortlisted') mappedStatus = 'review';
        else if (rawStatus === 'interviewing') mappedStatus = 'interview';
        else if (rawStatus === 'offered') mappedStatus = 'offer';
        else if (rawStatus === 'rejected') mappedStatus = 'rejected';
        else mappedStatus = 'applied'; // Default fallback

        return {
          id: app.id,
          jobTitle: app.jobs?.title || 'Unknown Job',
          department: app.jobs?.department || '',
          appliedDate: app.applied_date,
          status: mappedStatus,
          nextStep: latestNote
        };
      });
    },
    enabled: !!profile?.id
  });

  const statusConfig = {
    applied: { label: 'Applied', icon: <FileText size={16} />, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', step: 1 },
    review: { label: 'Under Review', icon: <Clock size={16} />, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200', step: 2 },
    interview: { label: 'Interviewing', icon: <Calendar size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200', step: 3 },
    offer: { label: 'Offer Extended', icon: <CheckCircle2 size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', step: 4 },
    rejected: { label: 'Not Selected', icon: <XCircle size={16} />, color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200', step: -1 },
  };

  const timelineSteps = [
    { key: 'applied', label: 'Applied' },
    { key: 'review', label: 'Review' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Applications</h1>
          <p className="text-sm text-slate-500 mt-1">Track the status of your recent job applications.</p>
        </div>
        
        <div>
          <Link to="/candidate/jobs" className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
            Browse More Jobs <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {applications.length === 0 ? (
          <div className="col-span-1 md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No applications yet</h3>
            <p className="text-slate-500 mb-6">You haven't applied to any open positions at Acme.</p>
            <Link to="/candidate/jobs" className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-blue-600/20">
              View Open Jobs
            </Link>
          </div>
        ) : (
          applications.map((app, index) => {
            const config = statusConfig[app.status];
            const currentStep = config.step;

            return (
              <div 
                key={app.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group"
              >
                {/* Header Section */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-1">{app.jobTitle}</h2>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{app.department}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>{new Date(app.appliedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    <div className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.color} ${config.border} font-semibold text-sm`}>
                      {config.icon}
                      {config.label}
                    </div>
                  </div>
                </div>

                {/* Status Timeline Section */}
                <div className="p-6 bg-slate-50/50">
                  {app.status === 'rejected' ? (
                    <div className="flex items-center gap-3 text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100">
                      <XCircle className="shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Application Closed</p>
                        <p className="text-sm text-rose-700/80 mt-0.5">Unfortunately, we will not be moving forward with your application at this time. Thank you for your interest in Acme.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Timeline UI */}
                      <div className="relative flex justify-between items-start mb-8 w-full">
                        {/* Connecting Line background */}
                        <div className="absolute top-4 left-[12.5%] right-[12.5%] h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                        
                        {/* Active Line foreground */}
                        <div 
                          className="absolute top-4 left-[12.5%] h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-1000 ease-out"
                          style={{ width: `calc(${(currentStep - 1) / (timelineSteps.length - 1) * 75}%)` }}
                        ></div>

                        {timelineSteps.map((step, idx) => {
                          const stepNum = idx + 1;
                          const isCompleted = stepNum <= currentStep;
                          const isCurrent = stepNum === currentStep;

                          return (
                            <div key={step.key} className="relative z-10 flex flex-col items-center flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                                isCompleted 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' 
                                  : 'bg-white border-slate-300 text-slate-300'
                              } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                                {isCompleted ? <CheckCircle2 size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{stepNum}</span>}
                              </div>
                              <span className={`mt-2 text-xs font-bold uppercase tracking-wider text-center ${isCurrent ? 'text-blue-600' : (isCompleted ? 'text-slate-700' : 'text-slate-400')}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Next Step Info */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3 shadow-sm">
                        <div className="mt-0.5 text-indigo-500"><AlertCircle size={18} /></div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Next Steps</p>
                          <p className="text-sm font-medium text-slate-800">{app.nextStep}</p>
                        </div>
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
