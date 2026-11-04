import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Search, 
  FileText, 
  X, 
  Briefcase, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  const [noticePeriod, setNoticePeriod] = useState('Immediate');
  const [coverNote, setCoverNote] = useState('');
  
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
    mutationFn: async ({ job, resumeUrl, noticePeriod, coverNote }) => {
      const res = await api.post('/candidate/applications', {
        job_id: job.id,
        resume_url: resumeUrl,
        notice_period: noticePeriod,
        cover_note: coverNote
      });
      return res.data;
    },
    onMutate: async ({ job, resumeUrl, noticePeriod, coverNote }) => {
      await queryClient.cancelQueries({ queryKey: ['candidate', 'jobs_page', profile?.id] });
      const previousPageData = queryClient.getQueryData(['candidate', 'jobs_page', profile?.id]);

      if (previousPageData) {
        const optimisticApp = {
          id: 'temp-' + Date.now(),
          job_id: job.id,
          candidate_id: profile?.id,
          resume_url: resumeUrl,
          notice_period: noticePeriod,
          cover_note: coverNote,
          status: 'Applied',
          applied_date: new Date().toISOString(),
          application_timeline: [
            { id: 'temp-t-1', status_change: 'Applied', notes: 'Application submitted successfully.', created_at: new Date().toISOString() }
          ],
          jobs: {
            title: job.title,
            department: job.department
          }
        };

        queryClient.setQueryData(['candidate', 'jobs_page', profile?.id], {
          ...previousPageData,
          applications: [optimisticApp, ...(previousPageData.applications || [])]
        });
      }

      setSelectedJob(null);
      setCoverNote('');
      setNoticePeriod('Immediate');

      return { previousPageData };
    },
    onSuccess: (data, variables) => {
      toast.success(`Successfully applied for ${variables.job.title}!`);
      
      if (data?.application) {
        queryClient.setQueryData(['candidate', 'jobs_page', profile?.id], (old) => {
          if (!old) return old;
          const filtered = (old.applications || []).filter(a => a.job_id !== variables.job.id);
          const realApp = {
            ...data.application,
            jobs: {
              title: variables.job.title,
              department: variables.job.department
            }
          };
          return {
            ...old,
            applications: [realApp, ...filtered]
          };
        });
      }

      queryClient.invalidateQueries({ queryKey: ['candidate', 'jobs_page'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', 'applications'] });
    },
    onError: (error, variables, context) => {
      if (context?.previousPageData) {
        queryClient.setQueryData(['candidate', 'jobs_page', profile?.id], context.previousPageData);
      }
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
    applyMutation.mutate({ 
      job: selectedJob, 
      resumeUrl: selectedResumeUrl,
      noticePeriod,
      coverNote
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Published': return 'bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC]';
      case 'Applied': return 'bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC]';
      case 'Shortlisted': 
      case 'Interviewing': return 'bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6]';
      case 'Rejected': return 'bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4]';
      case 'Hired': 
      case 'Selected': return 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20';
      default: return 'bg-[#EFEFF1] text-[#4A4A52] border border-[#E3E3E7]';
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
      {/* Mobile View */}
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

      {/* Web Desktop View */}
      <div className="space-y-6 hidden md:block pb-12 antialiased">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20">
                Career Opportunities
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>Available Positions</span>
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 px-2.5 py-0.5 rounded-full">
                {filteredJobs.length} Open Roles
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Explore published openings, review specifications, and apply directly through your portal.
            </p>
          </div>
        </div>

        {/* Search & Filter Card */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs">
          <form className="grid gap-4 md:grid-cols-12 items-end" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5 md:col-span-5">
              <label htmlFor="search" className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Search Roles
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="search"
                  type="search"
                  placeholder="Job title, department, skill..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label htmlFor="department" className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Department
              </label>
              <select
                id="department"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="w-full h-10 px-3.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="type" className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Job Type
              </label>
              <select
                id="type"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full h-10 px-3.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none cursor-pointer"
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
                className="w-full h-10 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer shadow-xs"
              >
                Reset Filters
              </button>
            </div>
          </form>
        </div>

        {/* Jobs List Grid */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-dashed border-[var(--line)] p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center mx-auto mb-3 text-[var(--muted)]">
                <Search size={24} />
              </div>
              <h3 className="text-base font-semibold text-[var(--text)]">No published jobs found</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                No openings match your search criteria. Try modifying your search keywords or resetting filters.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 hover:bg-[var(--brand)]/20 transition-colors cursor-pointer"
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
                  className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-6 shadow-xs hover:border-[var(--brand)]/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      {/* Title & Status Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 font-bold text-base border border-[var(--brand)]/20 shadow-xs">
                          {initials}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h2 className="text-xl font-semibold text-[var(--text)] tracking-tight">{job.title}</h2>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(job.status)}`}>
                              {job.status}
                            </span>
                            {application && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(application.status)}`}>
                                {application.status === 'Applied' ? '✓ Applied' : `Status: ${application.status}`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-[var(--muted)] flex items-center gap-2">
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
                        <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)]">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Required Experience</p>
                          <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{job.experience || 'Not specified'}</p>
                        </div>
                        <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)]">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Open Vacancies</p>
                          <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{job.vacancy || 1} Positions</p>
                        </div>
                        <div className="bg-[var(--surface-alt)] rounded-[12px] p-3 border border-[var(--line)]">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Application Deadline</p>
                          <p className="text-xs font-semibold text-[var(--text)] mt-0.5">
                            {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open until filled'}
                          </p>
                        </div>
                      </div>

                      {/* Job Description Excerpt */}
                      {job.description && (
                        <div className="pt-1">
                          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                            Role Description
                          </p>
                          <p className="text-sm text-[var(--text-2)] whitespace-pre-line line-clamp-3 leading-relaxed">
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
                          className="w-full flex items-center justify-center gap-1.5 h-10 px-4 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-all shadow-xs"
                        >
                          <ExternalLink size={14} />
                          <span>View PDF Spec</span>
                        </a>
                      )}

                      {application ? (
                        <Link 
                          to="/candidate/applications"
                          className="w-full flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-[#E6F6EC] text-[#1F9D55] hover:bg-[#CEEAD6] text-xs font-semibold transition-all border border-[#CEEAD6] shadow-xs"
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
                          className={`w-full flex items-center justify-center gap-1.5 h-10 px-4 rounded-full text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer ${
                            isProfileComplete
                              ? 'bg-[var(--ink)] text-white hover:bg-[var(--ink-2)] active:scale-95'
                              : 'bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)] hover:bg-[var(--line)]/50'
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

      {/* Slide-Over Application Drawer */}
      {selectedJob && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedJob(null); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[var(--surface)] shadow-2xl w-full max-w-lg h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-[var(--line)]">
            {/* Drawer Header */}
            <div className="px-6 py-4.5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text)]">Apply for Position</h2>
                  <p className="text-xs text-[var(--muted)]">{selectedJob.title} &bull; {selectedJob.department}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedJob(null)} 
                className="p-1.5 rounded-full hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[var(--surface)]">
              {/* Job Highlights Card */}
              <div className="bg-[var(--surface-alt)] rounded-[16px] p-4 border border-[var(--line)] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text)]">{selectedJob.title}</h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {selectedJob.department} &bull; {selectedJob.location}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full border border-[var(--brand)]/20 shrink-0">
                    {selectedJob.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px]">
                  <div>
                    <span className="text-[var(--muted)]">Experience: </span>
                    <span className="font-semibold text-[var(--text)]">{selectedJob.experience || 'Any experience'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Openings: </span>
                    <span className="font-semibold text-[#1F9D55]">{selectedJob.vacancy || 1} position(s)</span>
                  </div>
                </div>

                {selectedJob.description_pdf_url && (
                  <a
                    href={selectedJob.description_pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-deep)] hover:underline pt-1"
                  >
                    <FileText size={13} />
                    <span>View Full Role Specification (PDF)</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {/* Applicant Profile Verification Card */}
              <div className="bg-[var(--surface)] rounded-[16px] p-4 border border-[var(--line)] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E6F6EC] text-[#1F9D55] flex items-center justify-center">
                      <CheckCircle2 size={13} />
                    </div>
                    <h4 className="text-xs font-semibold text-[var(--text)]">Verified Applicant Profile</h4>
                  </div>
                  <Link 
                    to="/candidate/profile" 
                    className="text-[11px] font-semibold text-[var(--brand-deep)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Edit Profile</span>
                    <ArrowRight size={10} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">Candidate</p>
                    <p className="font-semibold text-[var(--text)] truncate mt-0.5">
                      {profile?.firstName} {profile?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">Email Address</p>
                    <p className="font-semibold text-[var(--text)] truncate mt-0.5">
                      {profile?.email}
                    </p>
                  </div>
                  {profileData?.phone && (
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">Phone</p>
                      <p className="font-semibold text-[var(--text)] truncate mt-0.5">
                        {profileData.phone}
                      </p>
                    </div>
                  )}
                  {profileData?.address && (
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">Location</p>
                      <p className="font-semibold text-[var(--text)] truncate mt-0.5">
                        {profileData.address}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resume Selection Form */}
              <form id="apply-job-form" onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
                      Attach Resume for Application <span className="text-[#D64550]">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-[var(--muted)]">
                      {resumes.length} {resumes.length === 1 ? 'file available' : 'files available'}
                    </span>
                  </div>
                  
                  {resumes.length === 0 ? (
                    <div className="bg-[#FDF3DC] text-[#B7791F] p-4 rounded-[14px] border border-[#FCE6B8] text-xs leading-relaxed space-y-2">
                      <p className="font-semibold">No resumes uploaded yet.</p>
                      <p>Please visit your Candidate Profile to upload your resume before submitting.</p>
                      <Link 
                        to="/candidate/profile" 
                        className="inline-flex items-center gap-1 font-semibold underline hover:text-[#8c4d00]"
                      >
                        Go to Profile <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {resumes.map((resume, index) => (
                        <label 
                          key={index} 
                          className={`flex items-center justify-between p-3.5 rounded-[14px] border cursor-pointer transition-all ${
                            selectedResumeUrl === resume.url 
                              ? 'border-[var(--brand)] bg-[var(--brand-tint)]/60 shadow-xs' 
                              : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input 
                              type="radio" 
                              name="resumeSelection" 
                              value={resume.url}
                              checked={selectedResumeUrl === resume.url}
                              onChange={(e) => setSelectedResumeUrl(e.target.value)}
                              className="w-4 h-4 text-[var(--brand)] focus:ring-[var(--brand)] border-[var(--line)]"
                            />
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${selectedResumeUrl === resume.url ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                                {resume.name}
                              </p>
                              {resume.isPrimary && (
                                <span className="inline-flex text-[9px] font-semibold text-[var(--brand-deep)] bg-[var(--surface)] border border-[var(--brand)]/20 px-1.5 py-0.2 rounded-md uppercase tracking-wider mt-0.5">
                                  Primary Resume
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={resume.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-semibold text-[var(--brand-deep)] hover:underline"
                            >
                              Preview
                            </a>
                            <FileText className={`w-4 h-4 ${selectedResumeUrl === resume.url ? 'text-[var(--brand-deep)]' : 'text-[var(--muted)]'}`} />
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notice Period Selection */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-[var(--text)]">
                    Earliest Start Availability / Notice Period
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Immediate', '15 Days', '30 Days', '45+ Days'].map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setNoticePeriod(period)}
                        className={`h-9 px-3 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                          noticePeriod === period
                            ? 'border-[var(--brand)] bg-[var(--brand-tint)] text-[var(--brand-deep)] shadow-xs'
                            : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-alt)]'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover Note (Optional) */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-[var(--text)]">
                    Cover Note to Hiring Manager <span className="text-[10px] font-normal text-[var(--muted)]">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Highlight your key achievements or why you are a great match for this role..."
                    className="w-full p-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none resize-none leading-relaxed placeholder:text-[var(--muted)]"
                  />
                </div>
              </form>

              {/* Recruiter Delivery Notice */}
              <div className="rounded-[16px] border border-[var(--brand)]/20 bg-[var(--brand-tint)]/40 p-3.5 flex items-start gap-2.5 text-xs text-[var(--brand-deep)]">
                <Sparkles size={16} className="shrink-0 mt-0.5 text-[var(--brand-deep)]" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-[var(--brand-deep)]">Direct Recruiter Delivery</p>
                  <p className="text-[11px] text-[var(--text-2)] leading-relaxed">
                    Your profile and selected resume will be forwarded directly to the hiring manager. You will receive live status updates in the <strong>Applications</strong> tab.
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setSelectedJob(null)} 
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="apply-job-form"
                disabled={applyMutation.isPending || resumes.length === 0}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 rounded-full transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                {applyMutation.isPending ? 'Submitting Application...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CandidateJobs;
