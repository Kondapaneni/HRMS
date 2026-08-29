import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  FileText, 
  X, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Users, 
  Award, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import CandidateMobileJobs from './CandidateMobileJobs';

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
        api.get('/candidate/jobs'),
        api.get('/candidate/applications')
      ]);
      return {
        jobs: jobsRes.data.jobs || [],
        applications: appsRes.data.applications || []
      };
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000
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

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['candidate', 'profile_for_jobs', profile?.id],
    queryFn: async () => {
      const res = await api.get('/candidate/profile');
      return res.data.profile;
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000
  });

  const resumes = Array.isArray(profileData?.resume_url) ? profileData.resume_url : [];
  
  // Calculate completion percentage
  let isProfileComplete = false;
  if (profileData) {
    const fields = ['phone', 'address', 'current_title', 'experience'];
    let filledCount = fields.filter(f => profileData[f] && profileData[f].trim() !== '').length;
    if (profileData.avatar_url) filledCount++;
    if (resumes.length > 0) filledCount++;
    const percentage = Math.round((filledCount / 6) * 100);
    isProfileComplete = percentage === 100;
  }

  const isLoading = isLoadingJobs || isLoadingProfile;

  React.useEffect(() => {
    if (resumes.length > 0 && !selectedResumeUrl) {
      const primary = resumes.find(r => r.isPrimary);
      setSelectedResumeUrl(primary ? primary.url : resumes[0].url);
    }
  }, [resumes, selectedResumeUrl]);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDept === '' || job.department === filterDept;
    const matchesType = filterType === '' || (job.type && job.type.toLowerCase().replace(' ', '-') === filterType);
    return matchesSearch && matchesDept && matchesType;
  });

  const applyMutation = useMutation({
    mutationFn: async ({ job, resumeUrl }) => {
      await api.post('/candidate/applications', {
        job_id: job.id,
        resume_url: resumeUrl
      });
    },
    onSuccess: (_, variables) => {
      toast.success(`Successfully applied for ${variables.job.title}!`);
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
      case 'Published': return 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]';
      case 'Applied': return 'bg-[#e8f0fe] text-[#1967d2] border border-[#d2e3fc]';
      case 'Shortlisted': 
      case 'Interviewing': return 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]';
      case 'Rejected': return 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]';
      case 'Hired': 
      case 'Selected': return 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]';
      default: return 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]';
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterDept('');
    setFilterType('');
  };

  if ((isLoading || isLoadingJobs) && !pageData) {
    return <PageLoader message="Loading Jobs..." />;
  }

  return (
    <>
      {/* Mobile View - Preserved untouched */}
      <CandidateMobileJobs 
        jobs={jobs}
        appliedJobs={appliedJobs}
        departments={departments}
        jobTypes={jobTypes}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDept={filterDept}
        setFilterDept={setFilterDept}
        filterType={filterType}
        setFilterType={setFilterType}
        isProfileComplete={isProfileComplete}
        setSelectedJob={setSelectedJob}
        getStatusBadge={getStatusBadge}
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
                Career Opportunities
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Available Positions
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                {filteredJobs.length} Open Roles
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Explore published openings, review specifications, and apply directly through your portal.
            </p>
          </div>
        </div>

        {/* Google Workspace Search & Filter Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs">
          <form className="grid gap-4 md:grid-cols-12 items-end" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5 md:col-span-5">
              <label htmlFor="search" className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                Search Roles
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                <input
                  id="search"
                  type="search"
                  placeholder="Job title, department, skill..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#dadce0] bg-[#f8fafd] text-sm text-[#1f1f1f] placeholder:text-[#5f6368] focus:bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label htmlFor="department" className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                Department
              </label>
              <select
                id="department"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#dadce0] bg-[#f8fafd] text-sm text-[#1f1f1f] focus:bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all outline-none cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="type" className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                Job Type
              </label>
              <select
                id="type"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#dadce0] bg-[#f8fafd] text-sm text-[#1f1f1f] focus:bg-white focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all outline-none cursor-pointer"
              >
                <option value="">All Types</option>
                {jobTypes.map(type => (
                  <option key={type} value={type}>{type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full h-11 rounded-xl border border-[#dadce0] bg-white hover:bg-[#f8fafd] text-sm font-semibold text-[#5f6368] hover:text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
              >
                Reset Filters
              </button>
            </div>
          </form>
        </div>

        {/* Jobs List Grid */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#dadce0] p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto mb-3 text-[#5f6368]">
                <Search size={24} />
              </div>
              <h3 className="text-base font-bold text-[#1f1f1f]">No published jobs found</h3>
              <p className="text-xs text-[#5f6368] mt-1 max-w-sm mx-auto">
                No openings match your search criteria. Try modifying your search keywords or resetting filters.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] hover:bg-[#d2e3fc] transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredJobs.map(job => {
              const application = appliedJobs[job.id];
              const initials = job.title.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'JB';
              
              return (
                <div 
                  key={job.id} 
                  className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs hover:border-[#dadce0] hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      {/* Title & Status Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 font-bold text-base border border-[#d2e3fc] shadow-2xs">
                          {initials}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h2 className="text-xl font-bold text-[#1f1f1f] tracking-tight">{job.title}</h2>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(job.status)}`}>
                              {job.status}
                            </span>
                            {application && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(application.status)}`}>
                                {application.status === 'Applied' ? '✓ Applied' : `Status: ${application.status}`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-[#5f6368] flex items-center gap-2">
                            <span>{job.department}</span>
                            <span>&bull;</span>
                            <span>{job.location}</span>
                            <span>&bull;</span>
                            <span className="capitalize">{job.type}</span>
                          </p>
                        </div>
                      </div>

                      {/* Job Metadata Chips */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Required Experience</p>
                          <p className="text-xs font-bold text-[#1f1f1f] mt-0.5">{job.experience || 'Not specified'}</p>
                        </div>
                        <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Open Vacancies</p>
                          <p className="text-xs font-bold text-[#1f1f1f] mt-0.5">{job.vacancy || 1} Positions</p>
                        </div>
                        <div className="bg-[#f8fafd] rounded-xl p-3 border border-[#e0e3e7]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Application Deadline</p>
                          <p className="text-xs font-bold text-[#1f1f1f] mt-0.5">
                            {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open until filled'}
                          </p>
                        </div>
                      </div>

                      {/* Job Description Excerpt */}
                      {job.description && (
                        <div className="pt-1">
                          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1">
                            Role Description
                          </p>
                          <p className="text-sm text-[#444746] whitespace-pre-line line-clamp-3 leading-relaxed">
                            {job.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 lg:w-48 justify-center">
                      {job.description_pdf_url && (
                        <a 
                          href={job.description_pdf_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f8fafd] text-xs font-semibold text-[#5f6368] hover:text-[#1f1f1f] transition-all shadow-2xs"
                        >
                          <ExternalLink size={14} />
                          <span>View PDF Spec</span>
                        </a>
                      )}

                      {application ? (
                        <Link 
                          to="/candidate/applications"
                          className="w-full flex items-center justify-center gap-1.5 h-11 px-4 rounded-full bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6] text-xs font-bold transition-all border border-[#ceead6] shadow-2xs"
                        >
                          <CheckCircle2 size={14} />
                          <span>View Application</span>
                        </Link>
                      ) : (
                        <button 
                          onClick={() => {
                            if (!isProfileComplete) {
                              toast.error('Please complete your profile to 100% to apply for jobs.');
                              return;
                            }
                            setSelectedJob(job);
                          }}
                          className={`w-full flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer ${
                            isProfileComplete
                              ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0] active:bg-[#174ea6]'
                              : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] hover:bg-[#e8eaed]'
                          }`}
                        >
                          <Briefcase size={14} />
                          <span>{isProfileComplete ? 'Apply for Role' : 'Complete Profile First'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Google Workspace Application Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#e0e3e7] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#f1f3f4] flex justify-between items-center bg-[#f8fafd]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 border border-[#d2e3fc]">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1f1f1f]">Apply for Position</h2>
                  <p className="text-xs text-[#5f6368] truncate max-w-xs">{selectedJob.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedJob(null)} 
                className="w-8 h-8 rounded-full text-[#5f6368] hover:bg-[#e8eaed] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="bg-[#f8fafd] rounded-2xl p-4 border border-[#e0e3e7]">
                <h3 className="text-sm font-bold text-[#1f1f1f]">{selectedJob.title}</h3>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  {selectedJob.department} &bull; {selectedJob.location} &bull; {selectedJob.type}
                </p>
              </div>

              <form id="apply-job-form" onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#5f6368] uppercase tracking-wider mb-2.5">
                    Select Resume for Application
                  </label>
                  
                  {resumes.length === 0 ? (
                    <div className="bg-[#fef7e0] text-[#b06000] p-4 rounded-2xl border border-[#feefc3] text-xs leading-relaxed space-y-2">
                      <p className="font-semibold">No resumes uploaded yet.</p>
                      <p>Please visit your Candidate Profile to upload your resume before submitting.</p>
                      <Link 
                        to="/candidate/profile" 
                        className="inline-flex items-center gap-1 font-bold underline hover:text-[#8c4d00]"
                      >
                        Go to Profile <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {resumes.map((resume, index) => (
                        <label 
                          key={index} 
                          className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                            selectedResumeUrl === resume.url 
                              ? 'border-[#1a73e8] bg-[#e8f0fe]/60 shadow-2xs' 
                              : 'border-[#e0e3e7] bg-white hover:bg-[#f8fafd]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input 
                              type="radio" 
                              name="resumeSelection" 
                              value={resume.url}
                              checked={selectedResumeUrl === resume.url}
                              onChange={(e) => setSelectedResumeUrl(e.target.value)}
                              className="w-4 h-4 text-[#1a73e8] focus:ring-[#1a73e8] border-[#dadce0]"
                            />
                            <div className="min-w-0">
                              <p className={`text-xs font-bold truncate ${selectedResumeUrl === resume.url ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
                                {resume.name}
                              </p>
                              {resume.isPrimary && (
                                <span className="inline-flex text-[10px] font-bold text-[#1a73e8] bg-white border border-[#d2e3fc] px-1.5 py-0.2 rounded-md uppercase tracking-wider mt-0.5">
                                  Primary Resume
                                </span>
                              )}
                            </div>
                          </div>
                          <FileText className={`w-5 h-5 shrink-0 ${selectedResumeUrl === resume.url ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`} />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#f1f3f4] bg-[#f8fafd] flex justify-end gap-2.5">
              <button 
                type="button" 
                onClick={() => setSelectedJob(null)} 
                className="px-5 py-2.5 text-xs font-semibold text-[#5f6368] hover:text-[#1f1f1f] bg-white border border-[#dadce0] rounded-full hover:bg-[#f1f3f4] transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="apply-job-form"
                disabled={applyMutation.isPending || resumes.length === 0}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] rounded-full transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                {applyMutation.isPending ? 'Submitting Application...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CandidateJobs;
