import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, FileText, BadgeCheck, UserCheck, User, FileUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CandidateMobileDashboard from './CandidateMobileDashboard';

const CandidateDashboard = () => {
  const { profile } = useAuth();
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['candidate', 'dashboard', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const [profileRes, appsRes, jobsRes] = await Promise.all([
        supabase.from('candidate_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('applications').select('id, status, applied_date, job_id').eq('candidate_id', profile.id).order('applied_date', { ascending: false }),
        supabase.from('jobs').select('*').eq('status', 'Published').order('created_at', { ascending: false }).limit(4)
      ]);

      let appsData = appsRes.data || [];
      if (appsData.length > 0) {
        const jobIds = [...new Set(appsData.map(a => a.job_id))];
        const { data: jobData } = await supabase.from('jobs').select('id, title, department, location').in('id', jobIds);
        const jobsMap = jobData ? jobData.reduce((acc, job) => { acc[job.id] = job; return acc; }, {}) : {};
        appsData.forEach(app => {
          app.jobs = jobsMap[app.job_id] || null;
        });
      }

      return {
        profileData: profileRes.data || null,
        appsData: appsData,
        jobsData: jobsRes.data || []
      };
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000
  });

  const profileData = dashboardData?.profileData;
  const applications = dashboardData?.appsData || [];
  const jobs = dashboardData?.jobsData || [];

  // Calculate completion stats
  let percentage = 0;
  let isComplete = false;
  if (profileData) {
    const fields = ['phone', 'address', 'current_title', 'experience', 'bio'];
    let filledCount = fields.filter(f => profileData[f] && profileData[f].trim() !== '').length;
    if (profileData.avatar_url) filledCount++;
    const resumes = Array.isArray(profileData.resume_url) ? profileData.resume_url : [];
    if (resumes.length > 0) filledCount++;
    percentage = Math.round((filledCount / 7) * 100);
    isComplete = percentage === 100;
  }
  const completionStats = { percentage, isComplete };

  // Calculate app stats
  const totalApps = applications.length;
  const shortlisted = applications.filter(a => ['Shortlisted', 'Interviewing'].includes(a.status)).length;
  const recentApps = applications.slice(0, 4);

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
    return <div className="p-6 text-slate-500">Loading dashboard...</div>;
  }

  return (
    <>
      <div className="md:hidden">
        <CandidateMobileDashboard
          profileData={profileData}
          completionStats={completionStats}
          applications={applications}
          jobs={jobs}
          isLoading={isLoading}
        />
      </div>

      <div className="hidden md:block space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {profile?.firstName || 'Candidate'}!</h1>
          <p className="text-sm text-slate-500 mt-1">Track your applications, update your profile, and apply for new opportunities.</p>
        </div>

      {/* Completion Alert */}
      {!completionStats.isComplete && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Your candidate account is ready. Complete your profile and upload a resume before applying to more jobs.
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Applications</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalApps}</p>
          </div>
          <FileText size={32} className="text-blue-600 opacity-80" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Shortlisted</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{shortlisted}</p>
          </div>
          <BadgeCheck size={32} className="text-emerald-600 opacity-80" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Profile complete</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{completionStats.percentage}%</p>
          </div>
          <UserCheck size={32} className="text-blue-600 opacity-80" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Recent Applications */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent applications</h2>
              <p className="text-sm text-slate-500 mt-0.5">Latest activity from your applied jobs</p>
            </div>
            <Link to="/candidate/applications" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="p-6 flex-1 space-y-4">
            {recentApps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                You have not applied for any jobs yet.
              </div>
            ) : (
              recentApps.map(app => (
                <div key={app.id} className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{app.jobs?.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{app.jobs?.department} • {app.jobs?.location}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Applied on {new Date(app.applied_date).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Link to="/candidate/jobs" className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 text-sm font-medium transition-colors">
                <Briefcase className="mr-2 h-4 w-4" /> Browse jobs
              </Link>
              <Link to="/candidate/profile" className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 text-sm font-medium transition-colors">
                <User className="mr-2 h-4 w-4" /> Update profile
              </Link>
              <Link to="/candidate/profile" className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 text-sm font-medium transition-colors">
                <FileUp className="mr-2 h-4 w-4" /> Manage resume
              </Link>
            </div>
          </div>

          {/* Fresh Openings */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Fresh openings</h2>
                <p className="text-sm text-slate-500 mt-0.5">Published roles from recruitment</p>
              </div>
              <Link to="/candidate/jobs" className="text-sm font-medium text-blue-600 hover:text-blue-700">Browse</Link>
            </div>
            <div className="p-6 space-y-3">
              {jobs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No fresh openings.</p>
              ) : (
                jobs.map(job => (
                  <Link key={job.id} to="/candidate/jobs" className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{job.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{job.department} • {job.location}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                        New
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
