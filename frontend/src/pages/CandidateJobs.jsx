import React, { useState } from 'react';
import { Search, Filter, ChevronRight, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

const CandidateJobs = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Application Modal State
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResumeUrl, setSelectedResumeUrl] = useState('');
  
  const queryClient = useQueryClient();

  const { data: pageData, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['candidate', 'jobs_page', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const [jobsRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('status', 'Published').order('created_at', { ascending: false }),
        supabase.from('applications').select('job_id, status').eq('candidate_id', profile.id)
      ]);
      return {
        jobs: jobsRes.data || [],
        applications: appsRes.data || []
      };
    },
    enabled: !!profile?.id
  });

  const jobs = pageData?.jobs || [];
  const applications = pageData?.applications || [];
  
  // Map of job_id -> application
  const appliedJobs = applications.reduce((acc, app) => {
    acc[app.job_id] = app;
    return acc;
  }, {});

  const departments = [...new Set(jobs.map(job => job.department))];
  const jobTypes = ['full-time', 'part-time', 'contract', 'internship', 'temporary', 'remote'];

  const { data: resumes = [], isLoading: isLoadingResumes } = useQuery({
    queryKey: ['candidate', 'resumes', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('resume_url')
        .eq('user_id', profile.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return Array.isArray(data?.resume_url) ? data.resume_url : [];
    },
    enabled: !!profile?.id
  });

  const isLoading = isLoadingJobs || isLoadingResumes;

  React.useEffect(() => {
    if (resumes.length > 0 && !selectedResumeUrl) {
      const primary = resumes.find(r => r.isPrimary);
      setSelectedResumeUrl(primary ? primary.url : resumes[0].url);
    }
  }, [resumes, selectedResumeUrl]);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDept === '' || job.department === filterDept;
    // Basic type matching, standardizing case
    const matchesType = filterType === '' || (job.type && job.type.toLowerCase().replace(' ', '-') === filterType);
    return matchesSearch && matchesDept && matchesType;
  });

  const applyMutation = useMutation({
    mutationFn: async ({ job, resumeUrl }) => {
      // Submit Application
      const { data: newApp, error } = await supabase
        .from('applications')
        .insert([{
          job_id: job.id,
          candidate_id: profile.id,
          resume_url: resumeUrl,
          status: 'Applied'
        }])
        .select('id')
        .single();
        
      if (error) throw error;
      
      // Also log the timeline
      if (newApp) {
         await supabase.from('application_timeline').insert([{
           application_id: newApp.id,
           status_change: 'Applied',
           notes: 'Application submitted successfully'
         }]);

         // Queue email notification
         const emailBody = `
           <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
             <h2 style="color: #2563eb;">Application Received</h2>
             <p>Hi ${profile.firstName},</p>
             <p>Thank you for applying for the <strong>${job.title}</strong> position at Acme HRMS.</p>
             <p>Your application has been successfully received and is currently under review by our recruitment team. You can track your application status anytime from your Candidate Dashboard.</p>
             <p>Best regards,<br>The Acme Team</p>
           </div>
         `;
         
         await supabase.from('email_queue').insert([{
           to_email: profile.email,
           subject: `Application Received: ${job.title}`,
           body: emailBody
         }]);
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Successfully applied for the ${variables.job.title} position!`);
      setSelectedJob(null);
      queryClient.invalidateQueries(['candidate', 'jobs_page']);
      queryClient.invalidateQueries(['candidate', 'dashboard']);
      queryClient.invalidateQueries(['candidate', 'applications']);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to submit application.');
    }
  });

  const handleApplySubmit = (e) => {
    e.preventDefault();
    if (!selectedResumeUrl) {
      toast.error('Please select a resume to apply.');
      return;
    }
    applyMutation.mutate({ job: selectedJob, resumeUrl: selectedResumeUrl });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Published': return 'bg-blue-100 text-blue-700';
      case 'Applied': return 'bg-emerald-100 text-emerald-700';
      case 'Shortlisted': return 'bg-emerald-100 text-emerald-700';
      case 'Rejected': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterDept('');
    setFilterType('');
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">Loading jobs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Available Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">Search published openings and apply through your candidate account.</p>
        </div>
        <span className="text-sm text-slate-500">{filteredJobs.length} published roles found</span>
      </div>

      {/* Filter Form */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <form className="grid gap-4 md:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="search" className="text-sm font-medium text-slate-700">Search</label>
              <input
                id="search"
                type="search"
                placeholder="Job title, department, location, skill"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium text-slate-700">Department</label>
              <select
                id="department"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">All departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium text-slate-700">Job Type</label>
              <select
                id="type"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">All types</option>
                {jobTypes.map(type => (
                  <option key={type} value={type}>{type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4 flex flex-wrap gap-3 mt-2">
              <button type="button" className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 text-sm font-medium transition-colors">
                <Search className="mr-2 h-4 w-4" /> Filter jobs
              </button>
              <button type="button" onClick={handleReset} className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 text-sm font-medium transition-colors">
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Jobs List */}
      <div className="grid gap-4">
        {filteredJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500 bg-slate-50">
            No published jobs match your search.
          </div>
        ) : (
          filteredJobs.map(job => {
            const application = appliedJobs[job.id];
            
            return (
              <div key={job.id} className="rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                <div className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">{job.title}</h2>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(job.status)}`}>
                          {job.status}
                        </span>
                        {application && (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(application.status)}`}>
                            {application.status === 'Applied' ? 'Applied' : `Status: ${application.status}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{job.department} • {job.location} • {job.type}</p>
                      <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-2 mt-4">
                        <p><strong className="text-slate-700">Experience:</strong> {job.experience || 'Not specified'}</p>
                        <p><strong className="text-slate-700">Vacancy:</strong> {job.vacancy || 1}</p>
                        <p><strong className="text-slate-700">Last date:</strong> {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open until filled'}</p>
                      </div>
                      <div className="mt-4 space-y-1">
                        <p className="text-sm font-semibold text-slate-700">Detailed Job Description:</p>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{job.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 shrink-0">
                      {job.description_pdf_url && (
                        <a 
                          href={job.description_pdf_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 text-sm font-medium transition-colors"
                        >
                          View job
                        </a>
                      )}
                      {application ? (
                        <Link 
                          to="/candidate/applications"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 px-4 py-2 text-sm font-medium transition-colors"
                        >
                          Already applied
                        </Link>
                      ) : (
                        <button 
                          onClick={() => setSelectedJob(job)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 text-sm font-medium transition-colors"
                        >
                          Apply now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Application Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Apply for {selectedJob.title}</h2>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="apply-job-form" onSubmit={handleApplySubmit} className="space-y-4">
                <p className="text-sm text-slate-500 mb-6">{selectedJob.department} &bull; {selectedJob.location}</p>
                
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Resume</label>
                  {resumes.length === 0 ? (
                    <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 text-sm">
                      You don't have any resumes uploaded. Please go to your <Link to="/candidate/profile" className="font-bold underline">Profile</Link> to upload a resume first.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resumes.map((resume, index) => (
                        <label key={index} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${selectedResumeUrl === resume.url ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name="resumeSelection" 
                              value={resume.url}
                              checked={selectedResumeUrl === resume.url}
                              onChange={(e) => setSelectedResumeUrl(e.target.value)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <div className="flex flex-col">
                              <span className={`font-medium ${selectedResumeUrl === resume.url ? 'text-blue-900' : 'text-slate-800'}`}>{resume.name}</span>
                              {resume.isPrimary && <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">Primary</span>}
                            </div>
                          </div>
                          <FileText className={`w-5 h-5 ${selectedResumeUrl === resume.url ? 'text-blue-500' : 'text-slate-400'}`} />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedJob(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                form="apply-job-form"
                disabled={applyMutation.isPending || resumes.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateJobs;
