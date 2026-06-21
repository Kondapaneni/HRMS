import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, FileText, Calendar, CheckCircle2, AlertCircle, ArrowRight, Activity, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';

const CandidateDashboard = () => {
  const { profile } = useAuth();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['candidate', 'dashboard', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const [profileRes, appsRes] = await Promise.all([
        supabase.from('candidate_profiles').select('*').eq('user_id', profile.id).single(),
        supabase.from('applications').select('status').eq('candidate_id', profile.id)
      ]);

      return {
        profileData: profileRes.data || null,
        appsData: appsRes.data || []
      };
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000
  });

  const profileData = dashboardData?.profileData;
  const appsData = dashboardData?.appsData || [];

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
  const activeApps = appsData.filter(a => ['Applied', 'Shortlisted', 'Interviewing'].includes(a.status)).length;
  const interviews = appsData.filter(a => a.status === 'Interviewing').length;
  const stats = { activeApps, interviews };
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{getGreeting()}, {profile?.firstName || 'Candidate'}!</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome to your candidate dashboard. Track your applications and find new opportunities.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold text-blue-600">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Profile Completion Banner */}
      {!completionStats.isComplete && (
        <div 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent -z-10" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex-1 w-full">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-500" />
                Complete Your Profile
              </h2>
              <p className="text-slate-600 text-sm mt-1 mb-4">You have only completed {completionStats.percentage}% of your profile. Add your resume and experience to improve your chances of getting hired.</p>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${completionStats.percentage}%` }}></div>
              </div>
              <p className="text-xs font-semibold text-amber-600">{completionStats.percentage}% Completed</p>
            </div>
            
            <Link to="/candidate/profile" className="shrink-0 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-sm">
              Update Profile <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Active Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[80px] -z-10"></div>
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 border border-white shadow-sm">
            <FileText size={24} />
          </div>
          <p className="text-3xl font-black text-slate-800 mb-1">{stats.activeApps}</p>
          <h3 className="text-sm font-semibold text-slate-500">Active Applications</h3>
        </div>

        {/* Interviews */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[80px] -z-10"></div>
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4 border border-white shadow-sm">
            <Calendar size={24} />
          </div>
          <p className="text-3xl font-black text-slate-800 mb-1">{stats.interviews}</p>
          <h3 className="text-sm font-semibold text-slate-500">Upcoming Interviews</h3>
        </div>

        {/* Total Views */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[80px] -z-10"></div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 border border-white shadow-sm">
            <TrendingUp size={24} />
          </div>
          <p className="text-3xl font-black text-slate-800 mb-1">0</p>
          <h3 className="text-sm font-semibold text-slate-500">Profile Views</h3>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-indigo-500" />
            Recent Activity
          </h2>
          
          <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300 mb-3 border border-slate-100">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-slate-600 font-medium mb-1">No recent activity</p>
            <p className="text-sm text-slate-400">Apply to a job to see your timeline update here.</p>
          </div>
        </div>

        {/* Recommended Jobs CTA */}
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-8 relative overflow-hidden text-white flex flex-col justify-center min-h-[250px]">
          {/* Static Background Graphics for Dark Theme */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute w-40 h-40 bg-blue-500 rounded-full opacity-20 -top-10 -right-10 blur-xl" />
            <div className="absolute w-32 h-32 bg-indigo-500 rounded-full opacity-20 bottom-[-20px] left-10 blur-xl" />
          </div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-6 border border-white/20">
              <Briefcase size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Find Your Next Role</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed max-w-sm">We are actively hiring across multiple departments. Check out our open positions and find the perfect fit for your skills.</p>
            <Link to="/candidate/jobs" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20">
              Browse Open Jobs <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CandidateDashboard;
