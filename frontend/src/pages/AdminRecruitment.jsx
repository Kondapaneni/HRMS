import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import SearchBar from '../components/ui/SearchBar';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

import { 
  Briefcase, 
  Users, 
  Plus, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  BadgeCheck, 
  Search, 
  Building2, 
  MapPin, 
  IndianRupee, 
  Sparkles, 
  ExternalLink, 
  UserCheck, 
  Award, 
  ArrowLeft,
  X,
  CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import OfferLetterPDF from '../components/offerLetter/OfferLetterPDF';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

const AdminRecruitment = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'applications'
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: async () => {
      const res = await api.get('/admin/jobs');
      return res.data.jobs || [];
    },
    onError: () => toast.error('Failed to load jobs')
  });

  const { data: applications = [], isLoading: isLoadingApps } = useQuery({
    queryKey: ['admin', 'applications', debouncedSearchQuery],
    queryFn: async () => {
      const res = await api.get(`/admin/applications?search=${encodeURIComponent(debouncedSearchQuery)}`);
      return res.data.applications || [];
    },
    onError: () => toast.error('Failed to load applications')
  });

  const { data: candidateProfiles = [] } = useQuery({
    queryKey: ['admin', 'candidate_profiles'],
    queryFn: async () => {
      const res = await api.get('/admin/candidate-profiles');
      return res.data.profiles || [];
    }
  });

  const { data: candidatesInfo = [] } = useQuery({
    queryKey: ['admin', 'candidates_info'],
    queryFn: async () => {
      const res = await api.get('/admin/candidates');
      return res.data.candidates || [];
    }
  });

  const { data: allCandidateDocuments = [] } = useQuery({
    queryKey: ['admin', 'all_candidate_documents'],
    queryFn: async () => {
      const res = await api.get('/admin/candidate-documents');
      return res.data.documents || [];
    }
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.branches || [];
    }
  });

  // Job Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobFormData, setJobFormData] = useState({
    title: '', department: '', location: '', type: 'Full Time', experience: '', salary_min: '', salary_max: '', vacancy: '1', skills: '', qualification: '', description: '', status: 'Draft', deadline: ''
  });
  const [jobFile, setJobFile] = useState(null);
  const [submitStatus, setSubmitStatus] = useState('Draft');

  // Modals State
  const [selectedApp, setSelectedApp] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [interviewData, setInterviewData] = useState({ date: '', time: '', location: '', notes: '', status: '1st Round Interview' });
  
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertData, setConvertData] = useState({
    firstName: '', lastName: '', email: '', phone: '', department: '', position: '', branch: '', joinDate: '', salary: '', status: 'Active', managerId: ''
  });

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerData, setOfferData] = useState({
    firstName: '', lastName: '', email: '', phone: '', department: '', position: '', joiningDate: '', workLocation: '', annualSalary: '', monthlySalary: '', offerDeadline: ''
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Timeline UI State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineApp, setTimelineApp] = useState(null);

  const createJobMutation = useMutation({
    mutationFn: async () => {
      let description_pdf_url = null;
      if (jobFile) {
        const fileExt = jobFile.name.split('.').pop();
        const safeTitle = jobFormData.title ? jobFormData.title.trim().replace(/\s+/g, '-') : 'Job';
        const fileName = `${safeTitle}-Job-Description-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('job_descriptions').upload(fileName, jobFile);
        if (uploadError) throw uploadError;
        
        description_pdf_url = window.location.origin + "/Job-Description/" + uploadData.path;
      }

      const jobDataToInsert = { ...jobFormData, description_pdf_url, status: submitStatus };
      if (!jobDataToInsert.deadline) {
        delete jobDataToInsert.deadline;
      }

      await api.post('/admin/jobs', jobDataToInsert);
      return submitStatus;
    },
    onSuccess: (status) => {
      toast.success(status === 'Published' ? 'Job published successfully' : 'Draft saved successfully');
      setIsJobModalOpen(false);
      setJobFormData({ title: '', department: '', location: '', type: 'Full Time', experience: '', salary_min: '', salary_max: '', vacancy: '1', skills: '', qualification: '', description: '', status: 'Draft', deadline: '' });
      setJobFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to post job');
    }
  });

  const handleCreateJob = (e) => {
    e.preventDefault();
    createJobMutation.mutate();
  };

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }) => {
      await api.put(`/admin/jobs/${jobId}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Job status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to update job status');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ app, userInfo, newStatus, additionalNotes = '', offerLetterPath = null }) => {
      await api.put(`/admin/applications/${app.id}/status`, {
        status: newStatus,
        notes: additionalNotes || `Application status updated to ${newStatus}`,
        ...(offerLetterPath ? { offerLetterPath } : {})
      });
      
      // SEC-015: only application identity and an approved notification category.
      // Server owns the recipient, subject, escaping, and HTML template.
      const type = newStatus === 'Shortlisted' ? 'shortlisted'
        : newStatus === 'Rejected' ? 'rejected'
        : newStatus.includes('Interview') ? 'interview'
        : (newStatus === 'Selected' || newStatus === 'Hired') && offerLetterPath ? 'offer'
        : 'status';
      await api.post('/admin/send-email', { applicationId: app.id, type });
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(`Application updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to update application status');
    }
  });

  const updateApplicationStatus = (app, status) => {
    const userInfo = candidatesInfo.find(u => u.id === app.candidate_id);
    updateStatusMutation.mutate({ app, userInfo, newStatus: status });
  };

  const handleScheduleInterview = (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    const userInfo = candidatesInfo.find(u => u.id === selectedApp.candidate_id);
    const notes = `Date: ${interviewData.date}, Time: ${interviewData.time}, Location: ${interviewData.location}. ${interviewData.notes}`;
    updateStatusMutation.mutate({ 
      app: selectedApp, 
      userInfo, 
      newStatus: interviewData.status, 
      additionalNotes: notes 
    }, {
      onSuccess: () => {
        setIsScheduleModalOpen(false);
        toast.success(`Interview scheduled: ${interviewData.status}`);
      }
    });
  };

  const convertEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedApp?.id || !selectedApp?.candidate_id) {
        throw new Error('Select a valid hired candidate application.');
      }
      const payload = {
        applicationId: selectedApp.id,
        userId: selectedApp.candidate_id,
        firstName: convertData.firstName,
        lastName: convertData.lastName,
        phone: convertData.phone,
        department: convertData.department,
        position: convertData.position,
        branch: convertData.branch,
        joinDate: convertData.joinDate,
        salary: convertData.salary,
        status: convertData.status,
        managerId: convertData.managerId || null
      };
      // The API atomically creates the employee, changes the user's role and
      // marks the application Converted to Employee with a timeline record.
      const response = await api.post('/admin/employees/convert', payload);
      return response.data;
    },
    onSuccess: ({ employeeId }) => {
      setIsConvertModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'candidates_info'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      toast.success(`Candidate converted to employee (ID: ${employeeId})`);
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.response?.data?.error || error.message || 'Failed to convert to employee');
    }
  });

  const handleConvertToEmployee = (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    convertEmployeeMutation.mutate();
  };

  const openScheduleModal = (app, nextRoundStatus) => {
    setSelectedApp(app);
    setInterviewData({ date: '', time: '', location: '', notes: '', status: nextRoundStatus });
    setIsScheduleModalOpen(true);
  };

  const openConvertModal = (app) => {
    const appProfile = candidateProfiles.find(p => p.user_id === app.candidate_id);
    const userInfo = candidatesInfo.find(u => u.id === app.candidate_id);
    setSelectedApp(app);
    setConvertData({
      firstName: userInfo?.firstName || '',
      lastName: userInfo?.lastName || '',
      email: userInfo?.email || '',
      phone: appProfile?.phone || '',
      department: app.jobs?.department || '',
      position: app.jobs?.title || '',
      branch: branches.length > 0 ? branches[0].id : '',
      joinDate: '',
      salary: '',
      status: 'Active',
      managerId: ''
    });
    setIsConvertModalOpen(true);
  };

  const openOfferModal = (app) => {
    const appProfile = candidateProfiles.find(p => p.user_id === app.candidate_id);
    const userInfo = candidatesInfo.find(u => u.id === app.candidate_id);
    setSelectedApp(app);
    setOfferData({
      firstName: userInfo?.firstName || '',
      lastName: userInfo?.lastName || '',
      email: userInfo?.email || '',
      phone: appProfile?.phone || '',
      department: app.jobs?.department || '',
      position: app.jobs?.title || '',
      joiningDate: '',
      workLocation: app.jobs?.location || '',
      annualSalary: '',
      monthlySalary: '',
      offerDeadline: ''
    });
    setIsOfferModalOpen(true);
  };

  const handleSendOffer = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsGeneratingPdf(true);
    
    try {
      const pdfData = {
        firstName: offerData.firstName,
        lastName: offerData.lastName,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        jobTitle: offerData.position,
        department: offerData.department,
        joiningDate: offerData.joiningDate,
        salary: offerData.annualSalary,
        deadlineDate: offerData.offerDeadline
      };

      const blob = await pdf(<OfferLetterPDF data={pdfData} />).toBlob();
      
      // SEC-003: do not embed candidate names or predictable timestamps in file paths.
      const fileName = `${selectedApp.id}/offer-${crypto.randomUUID()}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage.from('offer_letters').upload(fileName, blob, {
        contentType: 'application/pdf',
        upsert: false
      });
      
      if (uploadError) throw uploadError;
      
      // Associate the actual server-minted Storage path with this application
      // when committing Hired status; never send a caller-controlled URL.
      const offerLetterPath = uploadData.path;

      const userInfo = candidatesInfo.find(u => u.id === selectedApp.candidate_id);
      updateStatusMutation.mutate({ 
        app: selectedApp, 
        userInfo, 
        newStatus: 'Hired',
        additionalNotes: `Candidate hired and offer letter generated.`,
        offerLetterPath
      }, {
        onSuccess: () => {
          setIsOfferModalOpen(false);
          toast.success('Offer letter generated and sent successfully!');
        }
      });
    } catch (error) {
      console.error("Error generating/uploading offer letter:", error);
      toast.error("Failed to generate and send offer letter");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getNextInterviewRound = (status) => {
    if (status === 'Shortlisted') return '1st Round Interview';
    if (status === '1st Round Interview') return '2nd Round Interview';
    if (status === '2nd Round Interview') return '3rd Round Interview';
    if (status === '3rd Round Interview') return 'Final Round Interview';
    return 'Interview';
  };

  const renderStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('shortlisted')) return <StatusBadge variant="info">Shortlisted</StatusBadge>;
    if (s.includes('interview')) return <StatusBadge variant="warning">{status}</StatusBadge>;
    if (s.includes('rejected')) return <StatusBadge variant="danger">Rejected</StatusBadge>;
    if (s.includes('hired') || s.includes('selected')) return <StatusBadge variant="success">{status}</StatusBadge>;
    if (s.includes('converted')) return <StatusBadge variant="success">Converted to Employee</StatusBadge>;
    return <StatusBadge variant="neutral">{status || 'Applied'}</StatusBadge>;
  };

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'CA';
  };

  const filteredApplications = applications.filter(app => {
    const matchesJob = jobFilter ? app.job_id === jobFilter : true;
    const matchesStatus = statusFilter ? app.status === statusFilter : true;
    return matchesJob && matchesStatus;
  });

  const openPositions = jobs.filter(j => j.status === 'Published').length;
  const totalApplicants = applications.length;
  const inInterview = applications.filter(a => (a.status || '').includes('Interview')).length;
  const hiredCount = applications.filter(a => ['Hired', 'Selected', 'Converted to Employee'].includes(a.status)).length;

  if (isLoadingJobs) return <PageLoader message="Loading recruitment data..." />;

  return (
    <div className="space-y-6 pb-12 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
            Recruitment & ATS
            <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
              {openPositions} Active openings
            </span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Manage job postings, applicant pipelines, interview rounds, and candidate employee conversions.
          </p>
        </div>

        <Button 
          variant="primary"
          onClick={() => setIsJobModalOpen(true)}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Post new job
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Published jobs" 
          value={openPositions} 
          subtitle="Active job postings" 
          icon={Briefcase} 
        />
        <StatCard 
          title="Total applicants" 
          value={totalApplicants} 
          subtitle="Received candidate profiles" 
          icon={Users} 
        />
        <StatCard 
          title="Interviews active" 
          value={inInterview} 
          subtitle="Across interview rounds" 
          icon={CalendarDays} 
        />
        <StatCard 
          title="Hired / Converted" 
          value={hiredCount} 
          subtitle="Onboarded candidates" 
          icon={BadgeCheck} 
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-full transition-colors cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-[var(--ink)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job openings ({jobs.length})
        </button>
        <button
          onClick={() => { setActiveTab('applications'); setJobFilter(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-full transition-colors cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-[var(--ink)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
          }`}
        >
          <Users className="w-4 h-4" />
          Applicant pipeline ({applications.length})
        </button>
      </div>

      {/* Content Body: Jobs */}
      {activeTab === 'jobs' && (
        <div className="grid gap-[14px] grid-cols-1 md:grid-cols-2">
          {jobs.length === 0 ? (
            <div className="col-span-full rounded-[24px] bg-[var(--surface)] p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
              <Briefcase className="w-12 h-12 text-[var(--muted)]/40 mb-1" />
              <p className="text-[15px] font-medium text-[var(--text)]">No job requisitions posted</p>
              <p className="text-[13px] text-[var(--muted)]">Click "+ Post new job" to publish a requisition.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="rounded-[24px] bg-[var(--surface)] p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-medium text-[var(--text)] leading-snug">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                          <Building2 className="w-3 h-3" /> {job.department}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-[9px]">
                          <MapPin className="w-3 h-3" /> {job.location}
                        </span>
                        <span className="text-[12px] font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-[9px]">
                          {job.type}
                        </span>
                      </div>
                    </div>

                    <StatusBadge variant={job.status === 'Published' ? 'success' : 'neutral'}>
                      {job.status}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12px] bg-[var(--surface-alt)] rounded-[14px] p-3 text-[var(--muted)]">
                    <div>
                      <span className="font-medium text-[var(--text)]">Experience:</span> {job.experience || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-medium text-[var(--text)]">Vacancies:</span> {job.vacancy || 1}
                    </div>
                    <div>
                      <span className="font-medium text-[var(--text)]">Compensation:</span> {job.salary_min && job.salary_max ? `₹${Number(job.salary_min).toLocaleString('en-IN')} - ₹${Number(job.salary_max).toLocaleString('en-IN')}` : 'Disclosed upon request'}
                    </div>
                    <div>
                      <span className="font-medium text-[var(--text)]">Deadline:</span> {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open until filled'}
                    </div>
                  </div>

                  <p className="text-[13px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[var(--brand-deep)]">
                    {job.applications?.[0]?.count || 0} Candidate applications
                  </span>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="secondary"
                      size="sm"
                      onClick={() => { setActiveTab('applications'); setJobFilter(job.id); }}
                    >
                      View candidates
                    </Button>
                    {job.status === 'Draft' ? (
                      <Button 
                        variant="primary"
                        size="sm"
                        onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'Published' })}
                        disabled={updateJobStatusMutation.isPending}
                      >
                        Publish
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'Draft' })}
                        disabled={updateJobStatusMutation.isPending}
                      >
                        Unpublish
                      </Button>
                    )}
                    {job.description_pdf_url && (
                      <a 
                        href={job.description_pdf_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--muted)] flex items-center justify-center transition-colors"
                        title="Download JD document"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content Body: Applicant Pipeline */}
      {activeTab === 'applications' && (
        <div className="space-y-[14px]">
          {/* Search & Filter Toolbar */}
          <div className="rounded-[24px] bg-[var(--surface)] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <SearchBar
              placeholder="Search candidates by name, email, or job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-full lg:w-96"
            />

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select 
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full sm:w-auto h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
              >
                <option value="">All job positions</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>

              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none cursor-pointer"
              >
                <option value="">All pipeline statuses</option>
                {['Applied', 'Shortlisted', '1st Round Interview', '2nd Round Interview', '3rd Round Interview', 'Final Round Interview', 'Selected', 'Hired', 'Converted to Employee', 'Rejected'].map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Applications List */}
          <div className="grid gap-[14px]">
            {isLoadingApps ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--brand-deep)] border-t-transparent"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="rounded-[24px] bg-[var(--surface)] p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
                <Users className="w-12 h-12 text-[var(--muted)]/40 mb-1" />
                <p className="text-[15px] font-medium text-[var(--text)]">No candidates found</p>
                <p className="text-[13px] text-[var(--muted)]">Try adjusting your search criteria or pipeline filters.</p>
              </div>
            ) : (
              filteredApplications.map(app => {
                const status = app.status || 'Applied';
                const isConverted = status === 'Converted to Employee';
                const isHired = status === 'Hired' || status === 'Selected';
                const isInterview = status.includes('Interview');
                const nextInterviewRound = getNextInterviewRound(status);
                const appProfile = candidateProfiles.find(p => p.user_id === app.candidate_id);
                const userInfo = candidatesInfo.find(u => u.id === app.candidate_id);
                const candidateDocs = allCandidateDocuments.filter(d => d.candidate_id === app.candidate_id);
                const pendingDocsCount = candidateDocs.filter(d => d.status === 'pending').length;
                
                return (
                  <div key={app.id} className="rounded-[24px] bg-[var(--surface)] p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-[14px] bg-[var(--brand-tint)] flex items-center justify-center text-[var(--brand-deep)] font-semibold text-[14px] shrink-0">
                          {getInitials(userInfo?.firstName, userInfo?.lastName)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-medium text-[var(--text)]">{userInfo?.firstName || 'Candidate'} {userInfo?.lastName || ''}</h3>
                            {renderStatusBadge(status)}
                            {pendingDocsCount > 0 && (
                              <StatusBadge variant="warning">
                                <FileText className="w-3 h-3 mr-1 inline" /> {pendingDocsCount} docs pending review
                              </StatusBadge>
                            )}
                          </div>
                          <p className="text-[13px] text-[var(--muted)] mt-0.5">
                            Position: <span className="font-medium text-[var(--text)]">{app.jobs?.title}</span> • {app.jobs?.department}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
                        {app.resume_url && (
                          <a 
                            href={app.resume_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12px] font-medium bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-[var(--muted)]" /> Resume
                          </a>
                        )}

                        {(isHired || isConverted) && (
                          <button 
                            onClick={() => navigate('/admin/recruitment/verify-documents/' + app.id, { state: { application: app } })}
                            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12px] font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)] hover:opacity-85 transition-opacity cursor-pointer"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Verify documents
                            {Number(app.pending_documents_count) > 0 && (
                              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold text-white bg-[var(--warning-text)] rounded-full">
                                {app.pending_documents_count}
                              </span>
                            )}
                          </button>
                        )}

                        {status === 'Applied' && (
                          <Button 
                            variant="primary"
                            size="sm"
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => updateApplicationStatus(app, 'Shortlisted')} 
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Shortlist
                          </Button>
                        )}

                        {(status === 'Shortlisted' || isInterview) && (
                          <Button 
                            variant="primary"
                            size="sm"
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => openScheduleModal(app, nextInterviewRound)} 
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" /> Schedule {isInterview ? 'next ' : ''}interview
                          </Button>
                        )}

                        {isInterview && (
                          <Button 
                            variant="primary"
                            size="sm"
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => openOfferModal(app)} 
                            className="bg-[var(--accent-pink-deep)] text-white hover:opacity-90"
                          >
                            <Award className="w-3.5 h-3.5 mr-1" /> Generate offer
                          </Button>
                        )}

                        {(status === 'Applied' || status === 'Shortlisted' || isInterview) && (
                          <Button 
                            variant="danger"
                            size="sm"
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => updateApplicationStatus(app, 'Rejected')} 
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        )}

                        {(isHired || isConverted) && (
                          <Button 
                            variant={isConverted ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => openConvertModal(app)} 
                            disabled={isConverted || convertEmployeeMutation.isPending}
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            {isConverted ? 'Converted to employee' : 'Convert to staff'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Candidate Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--surface-alt)] rounded-[16px] p-3.5 text-[12px] text-[var(--muted)]">
                      <div>
                        <span className="font-medium text-[var(--text)] block mb-0.5">Email address</span>
                        <span className="truncate block">{userInfo?.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-[var(--text)] block mb-0.5">Contact number</span>
                        <span>{appProfile?.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-[var(--text)] block mb-0.5">Experience</span>
                        <span>{appProfile?.experience ? `${appProfile.experience} years` : (app.experience ? `${app.experience} years` : 'Not specified')}</span>
                      </div>
                      <div>
                        <span className="font-medium text-[var(--text)] block mb-0.5">Availability / Notice</span>
                        <span className="font-medium text-[var(--brand-deep)]">{app.notice_period || 'Immediate'}</span>
                      </div>
                      {app.cover_note && (
                        <div className="col-span-1 sm:col-span-2 md:col-span-4 bg-[var(--surface)] p-3 rounded-[12px]">
                          <span className="font-medium text-[var(--text)] block mb-0.5 text-[11px]">Cover note / message</span>
                          <p className="text-[12px] text-[var(--text-2)] italic leading-relaxed">"{app.cover_note}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => { setTimelineApp(app); setIsTimelineModalOpen(true); }}
                        className="inline-flex items-center text-[12px] font-medium text-[var(--brand-deep)] hover:underline cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        View application audit timeline
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Configure Job Offer Letter Full Screen Studio */}
      {isOfferModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] w-screen h-screen bg-[var(--bg)] flex flex-col overflow-hidden animate-in fade-in duration-200 antialiased">
          {/* Studio Top Header Bar */}
          <header className="h-16 px-6 bg-[var(--surface)] border-b border-[var(--line)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button 
                type="button" 
                onClick={() => setIsOfferModalOpen(false)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[13px] font-medium text-[var(--text)] transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to pipeline</span>
              </button>

              <div className="h-6 w-px bg-[var(--line)]" />

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h1 className="text-[15px] font-medium text-[var(--text)]">
                    Configure job offer letter
                  </h1>
                  <p className="text-[12px] text-[var(--muted)]">
                    Candidate: <strong className="text-[var(--text)]">{offerData.firstName} {offerData.lastName}</strong> &bull; {offerData.position || 'Software Engineer'}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="secondary"
                size="sm"
                onClick={() => setIsOfferModalOpen(false)} 
              >
                Cancel
              </Button>
              <Button 
                form="offerForm" 
                type="submit" 
                variant="primary"
                size="sm"
                disabled={isGeneratingPdf || updateStatusMutation.isPending} 
              >
                <Award className="w-3.5 h-3.5 mr-1" />
                {isGeneratingPdf ? 'Generating PDF...' : updateStatusMutation.isPending ? 'Sending...' : 'Confirm & dispatch offer letter'}
              </Button>
            </div>
          </header>

          {/* Full Screen Split Workspace: Form on Left, PDF on Right */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
            {/* Left Panel: Configuration Form */}
            <div className="w-full md:w-[480px] lg:w-[540px] xl:w-[580px] border-r border-[var(--line)] bg-[var(--surface)] flex flex-col h-full overflow-hidden shrink-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <form id="offerForm" onSubmit={handleSendOffer} className="space-y-5">
                  {/* Candidate Details Section */}
                  <div className="space-y-3">
                    <h3 className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                      <UserCheck size={14} className="text-[var(--brand-deep)]" />
                      Candidate information
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">First name *</label>
                        <input type="text" required value={offerData.firstName} onChange={(e) => setOfferData({...offerData, firstName: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">Last name *</label>
                        <input type="text" required value={offerData.lastName} onChange={(e) => setOfferData({...offerData, lastName: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Position & Department */}
                  <div className="space-y-3 pt-2 border-t border-[var(--line)]">
                    <h3 className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                      <Briefcase size={14} className="text-[var(--brand-deep)]" />
                      Position & department
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">Department *</label>
                        <input type="text" required value={offerData.department} onChange={(e) => setOfferData({...offerData, department: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">Designation / Job title *</label>
                        <input type="text" required value={offerData.position} onChange={(e) => setOfferData({...offerData, position: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-3 pt-2 border-t border-[var(--line)]">
                    <h3 className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                      <Calendar size={14} className="text-[var(--brand-deep)]" />
                      Joining & acceptance schedule
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">Expected joining date *</label>
                        <input type="date" required value={offerData.joiningDate} onChange={(e) => setOfferData({...offerData, joiningDate: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">Offer acceptance deadline *</label>
                        <input type="date" required value={offerData.offerDeadline} onChange={(e) => setOfferData({...offerData, offerDeadline: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="space-y-3 pt-2 border-t border-[var(--line)]">
                    <h3 className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                      <IndianRupee size={14} className="text-[var(--success-text)]" />
                      Compensation package (INR)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">Monthly compensation (₹) *</label>
                        <input 
                          type="number" 
                          required 
                          placeholder="e.g., 100000" 
                          value={offerData.monthlySalary} 
                          onChange={(e) => {
                            const monthly = e.target.value;
                            const annual = monthly ? String(Number(monthly) * 12) : '';
                            setOfferData({...offerData, monthlySalary: monthly, annualSalary: annual});
                          }} 
                          className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none font-mono transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[var(--text)] mb-1">Annual CTC (₹)</label>
                        <input 
                          type="text" 
                          readOnly
                          placeholder="Auto-calculated"
                          value={offerData.annualSalary ? `₹${Number(offerData.annualSalary).toLocaleString('en-IN')}` : ''} 
                          className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--muted)] rounded-[12px] text-[13px] outline-none cursor-not-allowed font-mono" 
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Bottom Pinned Footer */}
              <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
                <Button type="button" variant="secondary" onClick={() => setIsOfferModalOpen(false)}>
                  Cancel
                </Button>
                <Button form="offerForm" type="submit" variant="primary" disabled={isGeneratingPdf || updateStatusMutation.isPending}>
                  <Award className="w-3.5 h-3.5 mr-1" />
                  {isGeneratingPdf ? 'Generating PDF...' : updateStatusMutation.isPending ? 'Sending...' : 'Confirm & dispatch offer letter'}
                </Button>
              </div>
            </div>
            
            {/* Right Panel: Live PDF Studio Viewer */}
            <div className="hidden md:flex flex-1 h-full bg-[#2a2a2e] flex-col overflow-hidden relative">
              <PDFViewer width="100%" height="100%" className="border-none flex-1 w-full h-full">
                <OfferLetterPDF data={{
                  firstName: offerData.firstName || '[Candidate',
                  lastName: offerData.lastName || 'Name]',
                  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                  jobTitle: offerData.position || '[Position]',
                  department: offerData.department || '[Department]',
                  joiningDate: offerData.joiningDate || '[Joining Date]',
                  salary: offerData.annualSalary || '[Salary]',
                  deadlineDate: offerData.offerDeadline || '[Deadline]'
                }} />
              </PDFViewer>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Convert to Employee Sidebar Drawer */}
      {isConvertModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsConvertModalOpen(false); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-[var(--surface)] shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  TALENT ACQUISITION
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Convert to Employee
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsConvertModalOpen(false)} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-[13px]">
              <form id="convert-candidate-form" onSubmit={handleConvertToEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">First name *</label>
                    <input type="text" required value={convertData.firstName} onChange={e => setConvertData({...convertData, firstName: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Last name *</label>
                    <input type="text" required value={convertData.lastName} onChange={e => setConvertData({...convertData, lastName: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Email *</label>
                  <input type="email" required readOnly value={convertData.email} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Phone number *</label>
                  <input type="text" value={convertData.phone} onChange={e => setConvertData({...convertData, phone: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Department *</label>
                    <input type="text" required value={convertData.department} onChange={e => setConvertData({...convertData, department: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Designation *</label>
                    <input type="text" required value={convertData.position} onChange={e => setConvertData({...convertData, position: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Branch *</label>
                    <select required value={convertData.branch} onChange={e => setConvertData({...convertData, branch: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all cursor-pointer">
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Join date *</label>
                    <input type="date" required value={convertData.joinDate} onChange={e => setConvertData({...convertData, joinDate: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Monthly salary (₹) *</label>
                  <input type="number" required value={convertData.salary} onChange={e => setConvertData({...convertData, salary: e.target.value})} placeholder="e.g. 50000" className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none font-mono transition-all" />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                disabled={convertEmployeeMutation.isPending}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="convert-candidate-form"
                disabled={convertEmployeeMutation.isPending}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <UserCheck size={14} />
                <span>{convertEmployeeMutation.isPending ? 'Converting...' : 'Convert Candidate'}</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Timeline Sidebar Drawer */}
      {isTimelineModalOpen && timelineApp && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsTimelineModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-[var(--surface)] shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  APPLICATION PIPELINE
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Application Timeline
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsTimelineModalOpen(false)} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-[13px]">
              {(!timelineApp.application_timeline || timelineApp.application_timeline.length === 0) ? (
                <div className="rounded-[16px] bg-[var(--surface-alt)] p-6 text-center text-[13px] text-[var(--muted)]">
                  No status history recorded yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--line)] ml-3 pl-5 space-y-4">
                  {timelineApp.application_timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((event, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${isLatest ? 'bg-[var(--brand-deep)]' : 'bg-[var(--line)]'}`} />
                        <div className={`rounded-[14px] p-3.5 space-y-1 ${isLatest ? 'bg-[var(--brand-tint)]' : 'bg-[var(--surface-alt)]'}`}>
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-[13px] text-[var(--text)]">{event.status_change}</h4>
                            <span className="text-[11px] text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded-[6px]">
                              {new Date(event.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-[12px] text-[var(--muted)] leading-relaxed pt-1 whitespace-pre-line">{event.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsTimelineModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Schedule Interview Sidebar Drawer */}
      {isScheduleModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsScheduleModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-[var(--surface)] shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  CANDIDATE INTERVIEW
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Schedule {interviewData.status}
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsScheduleModalOpen(false)} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-[13px]">
              <form id="schedule-interview-form" onSubmit={handleScheduleInterview} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Interview date *</label>
                  <input type="date" required value={interviewData.date} onChange={e => setInterviewData({...interviewData, date: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Interview time *</label>
                  <input type="time" required value={interviewData.time} onChange={e => setInterviewData({...interviewData, time: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Meeting link / Physical location *</label>
                  <input type="text" required value={interviewData.location} onChange={e => setInterviewData({...interviewData, location: e.target.value})} placeholder="Google Meet link or Office meeting room" className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Preparation instructions (Optional)</label>
                  <textarea rows="3" value={interviewData.notes} onChange={e => setInterviewData({...interviewData, notes: e.target.value})} placeholder="Instructions sent to candidate..." className="w-full p-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all resize-y" />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                disabled={updateStatusMutation.isPending}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="schedule-interview-form"
                disabled={updateStatusMutation.isPending}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Calendar size={14} />
                <span>{updateStatusMutation.isPending ? 'Dispatching...' : 'Schedule & Notify'}</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Post Job Sidebar Drawer */}
      {isJobModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsJobModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-[var(--surface)] shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  RECRUITMENT OPENING
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Create Job Requisition
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsJobModalOpen(false)} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-[13px]">
              <form id="post-job-form" onSubmit={handleCreateJob} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Job title *</label>
                    <input type="text" required value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Department *</label>
                    <input type="text" required value={jobFormData.department} onChange={e => setJobFormData({...jobFormData, department: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Location *</label>
                    <input type="text" required value={jobFormData.location} onChange={e => setJobFormData({...jobFormData, location: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Employment type *</label>
                    <select required value={jobFormData.type} onChange={e => setJobFormData({...jobFormData, type: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all cursor-pointer">
                      <option>Full Time</option>
                      <option>Part Time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Experience *</label>
                    <input type="text" required value={jobFormData.experience} onChange={e => setJobFormData({...jobFormData, experience: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" placeholder="e.g. 3-5 Yrs" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Min salary (₹)</label>
                    <input type="text" value={jobFormData.salary_min} onChange={e => setJobFormData({...jobFormData, salary_min: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none font-mono transition-all" placeholder="500000" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Max salary (₹)</label>
                    <input type="text" value={jobFormData.salary_max} onChange={e => setJobFormData({...jobFormData, salary_max: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none font-mono transition-all" placeholder="1200000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Vacancies *</label>
                    <input type="number" required value={jobFormData.vacancy} onChange={e => setJobFormData({...jobFormData, vacancy: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Application deadline</label>
                    <input type="date" value={jobFormData.deadline} onChange={e => setJobFormData({...jobFormData, deadline: e.target.value})} className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">JD document (PDF attachment)</label>
                  <input type="file" accept="application/pdf" onChange={e => setJobFile(e.target.files[0])} className="w-full text-[12px] text-[var(--muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-[10px] file:border-0 file:text-[12px] file:font-medium file:bg-[var(--brand-tint)] file:text-[var(--brand-deep)] hover:file:opacity-85 transition-opacity" />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Required skills</label>
                  <textarea rows={2} required value={jobFormData.skills} onChange={e => setJobFormData({...jobFormData, skills: e.target.value})} className="w-full p-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all resize-y" placeholder="e.g. React.js, PHP, PostgreSQL, Docker" />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Job description</label>
                  <textarea rows={3} required value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} className="w-full p-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] text-[var(--text)] outline-none transition-all resize-y" placeholder="Detailed role description and expectations..." />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                disabled={createJobMutation.isPending}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="post-job-form"
                onClick={() => setSubmitStatus('Draft')}
                disabled={createJobMutation.isPending}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {createJobMutation.isPending && submitStatus === 'Draft' ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="submit"
                form="post-job-form"
                onClick={() => setSubmitStatus('Published')}
                disabled={createJobMutation.isPending}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>{createJobMutation.isPending && submitStatus === 'Published' ? 'Publishing...' : 'Publish Opening'}</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminRecruitment;
