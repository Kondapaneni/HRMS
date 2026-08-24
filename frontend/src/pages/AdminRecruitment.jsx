import React, { useState, useEffect, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
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
  Mail, 
  FileUp, 
  X, 
  CalendarDays, 
  BadgeCheck, 
  ChevronDown,
  Search,
  Building2,
  MapPin,
  IndianRupee,
  Phone,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Award,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import shortlistedEmailTemplateHtml from "../../../backend/src/Templates/candidate_shortlisted_email.html?raw";
import rejectedEmailTemplateHtml from "../../../backend/src/Templates/candidate_rejected_email.html?raw";
import interviewEmailTemplateHtml from "../../../backend/src/Templates/candidate_interview_email.html?raw";
import offerEmailTemplateHtml from "../../../backend/src/Templates/candidate_offer_email.html?raw";
import { pdf, PDFViewer } from '@react-pdf/renderer';
import OfferLetterPDF from '../components/offerLetter/OfferLetterPDF';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

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

  const { data: employeesList = [] } = useQuery({
    queryKey: ['admin', 'employees_list'],
    queryFn: async () => {
      const res = await api.get('/admin/employees');
      return res.data.employees || [];
    }
  });

  const isLoading = isLoadingJobs || isLoadingApps;

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
        const { error: uploadError } = await supabase.storage.from('job_descriptions').upload(fileName, jobFile);
        if (uploadError) throw uploadError;
        
        description_pdf_url = window.location.origin + "/Job-Description/" + fileName;
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
    mutationFn: async ({ app, userInfo, newStatus, additionalNotes = '', offerLetterUrl = null }) => {
      await api.put(`/admin/applications/${app.id}/status`, { 
        status: newStatus, 
        notes: additionalNotes || `Application status updated to ${newStatus}` 
      });
      
      // Queue email notification based on status
      if (userInfo?.email) {
        let subject = `Update on your application for ${app.jobs?.title}`;
        let emailBody = '';
        const frontendUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const dashboardLink = frontendUrl + "/candidate/applications";
        
        if (newStatus === 'Shortlisted') {
          subject = `Good News! You've been shortlisted for ${app.jobs?.title}`;
          emailBody = shortlistedEmailTemplateHtml
            .replace(/{{firstName}}/g, userInfo.firstName || 'Candidate')
            .replace(/{{jobTitle}}/g, app.jobs?.title)
            .replace(/{{dashboardLink}}/g, dashboardLink)
            .replace(/{{currentYear}}/g, new Date().getFullYear().toString());
        } else if (newStatus === 'Rejected') {
          subject = `Update regarding your application for ${app.jobs?.title}`;
          emailBody = rejectedEmailTemplateHtml
            .replace(/{{firstName}}/g, userInfo.firstName || 'Candidate')
            .replace(/{{jobTitle}}/g, app.jobs?.title)
            .replace(/{{dashboardLink}}/g, dashboardLink)
            .replace(/{{currentYear}}/g, new Date().getFullYear().toString());
        } else if (newStatus.includes('Interview')) {
          subject = `Interview Invitation for ${app.jobs?.title}`;
          emailBody = interviewEmailTemplateHtml
            .replace(/{{firstName}}/g, userInfo.firstName || 'Candidate')
            .replace(/{{jobTitle}}/g, app.jobs?.title)
            .replace(/{{interviewRound}}/g, newStatus)
            .replace(/{{additionalNotes}}/g, additionalNotes || `You have been invited for a ${newStatus}.`)
            .replace(/{{dashboardLink}}/g, dashboardLink)
            .replace(/{{currentYear}}/g, new Date().getFullYear().toString());
        } else if ((newStatus === 'Selected' || newStatus === 'Hired') && offerLetterUrl) {
          subject = `Job Offer: ${app.jobs?.title}`;
          emailBody = offerEmailTemplateHtml
            .replace(/{{firstName}}/g, userInfo.firstName || 'Candidate')
            .replace(/{{jobTitle}}/g, app.jobs?.title)
            .replace(/{{offerLetterUrl}}/g, offerLetterUrl)
            .replace(/{{dashboardLink}}/g, dashboardLink)
            .replace(/{{currentYear}}/g, new Date().getFullYear().toString());
        } else {
          let bodyContent = `<p>Your application status has been updated to: <strong>${newStatus}</strong>.</p>`;
          if (newStatus === 'Selected' || newStatus === 'Hired') {
            bodyContent = `<p>Congratulations! We are thrilled to inform you that you have been selected for the <strong>${app.jobs?.title}</strong> position. We will reach out to you soon with the next steps.</p>`;
          }
          
          emailBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a73e8;">Application Update</h2>
              <p>Hi ${userInfo?.firstName},</p>
              ${bodyContent}
              <p>Best regards,<br>The Acme HR Team</p>
            </div>
          `;
        }
        
        await api.post('/admin/send-email', {
          to: userInfo.email,
          subject: subject,
          body: emailBody
        });
      }
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
      const payload = {
        userId: selectedApp.candidate_id,
        firstName: convertData.firstName,
        lastName: convertData.lastName,
        email: convertData.email,
        phone: convertData.phone,
        department: convertData.department,
        position: convertData.position,
        branchId: convertData.branch,
        joiningDate: convertData.joinDate,
        salary: convertData.salary,
        status: convertData.status,
        managerId: convertData.managerId || null
      };

      await api.post('/admin/convert-candidate', payload);
    },
    onSuccess: () => {
      const userInfo = candidatesInfo.find(u => u.id === selectedApp.candidate_id);
      updateStatusMutation.mutate({ 
        app: selectedApp, 
        userInfo, 
        newStatus: 'Converted to Employee', 
        additionalNotes: `Candidate converted to employee. Designation: ${convertData.position}, Department: ${convertData.department}` 
      }, {
        onSuccess: () => {
          setIsConvertModalOpen(false);
          toast.success('Successfully converted candidate to employee');
        }
      });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to convert to employee');
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
      
      const safeFirstName = pdfData.firstName.trim().replace(/\s+/g, '-');
      const safeLastName = pdfData.lastName.trim().replace(/\s+/g, '-');
      const fileName = `${safeFirstName}-${safeLastName}.pdf`;
      
      const { error: uploadError } = await supabase.storage.from('offer_letters').upload(fileName, blob, {
        contentType: 'application/pdf',
        upsert: true
      });
      
      if (uploadError) throw uploadError;
      
      const proxyUrl = window.location.origin + "/Offer-Letter/" + fileName;
      
      const userInfo = candidatesInfo.find(u => u.id === selectedApp.candidate_id);
      updateStatusMutation.mutate({ 
        app: selectedApp, 
        userInfo, 
        newStatus: 'Hired',
        additionalNotes: `Candidate hired and offer letter generated.`,
        offerLetterUrl: proxyUrl
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

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('applied')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">Applied</span>;
    }
    if (s.includes('shortlisted')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">Shortlisted</span>;
    }
    if (s.includes('interview')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">{status}</span>;
    }
    if (s.includes('rejected')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">Rejected</span>;
    }
    if (s.includes('hired') || s.includes('selected')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">{status}</span>;
    }
    if (s.includes('converted')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">Converted to Employee</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status}</span>;
  };

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'CA';
  };

  const filteredApplications = applications.filter(app => {
    const userInfo = candidatesInfo.find(u => u.id === app.candidate_id);
    const matchesJob = jobFilter ? app.job_id === jobFilter : true;
    const matchesStatus = statusFilter ? app.status === statusFilter : true;
    return matchesJob && matchesStatus;
  });

  const openPositions = jobs.filter(j => j.status === 'Published').length;
  const totalApplicants = applications.length;
  const inInterview = applications.filter(a => (a.status || '').includes('Interview')).length;
  const hiredCount = applications.filter(a => ['Hired', 'Selected', 'Converted to Employee'].includes(a.status)).length;

  if (isLoadingJobs) return <PageLoader message="Loading Recruitment Data..." />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
            <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
            <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
            <span className="w-2 h-2 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Talent Acquisition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Recruitment & ATS <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{openPositions} Active Openings</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Manage job postings, applicant pipelines, interview rounds, and candidate employee conversions.
          </p>
        </div>

        <button 
          onClick={() => setIsJobModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Published Jobs" 
          value={openPositions} 
          subtitle="Active job postings" 
          icon={Briefcase} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Total Applicants" 
          value={totalApplicants} 
          subtitle="Received candidate profiles" 
          icon={Users} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Interviews Active" 
          value={inInterview} 
          subtitle="Across all interview rounds" 
          icon={CalendarDays} 
          colorTheme="amber" 
        />
        <StatCard 
          title="Hired / Converted" 
          value={hiredCount} 
          subtitle="Onboarded candidates" 
          icon={BadgeCheck} 
          colorTheme="green" 
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e0e3e7] pb-1">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'jobs'
              ? 'text-[#1a73e8] border-b-2 border-[#1a73e8] bg-[#e8f0fe]/50'
              : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Openings ({jobs.length})
        </button>
        <button
          onClick={() => { setActiveTab('applications'); setJobFilter(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'applications'
              ? 'text-[#1a73e8] border-b-2 border-[#1a73e8] bg-[#e8f0fe]/50'
              : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4]'
          }`}
        >
          <Users className="w-4 h-4" />
          Applicant Pipeline ({applications.length})
        </button>
      </div>

      {/* Content Body */}
      {activeTab === 'jobs' && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {jobs.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[#dadce0] bg-white p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
              <Briefcase className="w-12 h-12 text-[#dadce0] mb-1" />
              <p className="text-sm font-semibold text-[#1f1f1f]">No job requisitions posted</p>
              <p className="text-xs text-[#5f6368]">Click "+ Post New Job" to publish a requisition.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs p-5 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#1f1f1f] leading-snug">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
                          <Building2 className="w-3 h-3" /> {job.department}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded-full border border-[#dadce0]">
                          <MapPin className="w-3 h-3" /> {job.location}
                        </span>
                        <span className="text-[11px] text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded-full">
                          {job.type}
                        </span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      job.status === 'Published' 
                        ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' 
                        : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#f8fafd] border border-[#e0e3e7] rounded-xl p-3 text-[#5f6368]">
                    <div>
                      <span className="font-semibold text-[#1f1f1f]">Experience:</span> {job.experience || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-semibold text-[#1f1f1f]">Vacancies:</span> {job.vacancy || 1}
                    </div>
                    <div>
                      <span className="font-semibold text-[#1f1f1f]">Compensation:</span> {job.salary_min && job.salary_max ? `₹${Number(job.salary_min).toLocaleString('en-IN')} - ₹${Number(job.salary_max).toLocaleString('en-IN')}` : 'Disclosed upon request'}
                    </div>
                    <div>
                      <span className="font-semibold text-[#1f1f1f]">Deadline:</span> {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open until filled'}
                    </div>
                  </div>

                  <p className="text-xs text-[#5f6368] line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#e0e3e7] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1a73e8]">
                    {job.applications?.[0]?.count || 0} Candidate Applications
                  </span>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setActiveTab('applications'); setJobFilter(job.id); }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                    >
                      View Candidates
                    </button>
                    {job.status === 'Draft' ? (
                      <button 
                        onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'Published' })}
                        disabled={updateJobStatusMutation.isPending}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#137333] hover:bg-[#0d5926] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        Publish
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'Draft' })}
                        disabled={updateJobStatusMutation.isPending}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] transition-all cursor-pointer disabled:opacity-50"
                      >
                        Unpublish
                      </button>
                    )}
                    {job.description_pdf_url && (
                      <a 
                        href={job.description_pdf_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] transition-all"
                        title="Download JD Document"
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

      {activeTab === 'applications' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Google Pill Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
              <input 
                type="search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by name, email, or job..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Job Selector */}
              <select 
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs text-[#1f1f1f] outline-none cursor-pointer"
              >
                <option value="">All Job Positions</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>

              {/* Status Selector */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs text-[#1f1f1f] outline-none cursor-pointer"
              >
                <option value="">All Pipeline Statuses</option>
                {['Applied', 'Shortlisted', '1st Round Interview', '2nd Round Interview', '3rd Round Interview', 'Final Round Interview', 'Selected', 'Hired', 'Converted to Employee', 'Rejected'].map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Applications List */}
          <div className="grid gap-4">
            {isLoadingApps ? (
              <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a73e8]"></div></div>
            ) : filteredApplications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dadce0] bg-white p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
                <Users className="w-12 h-12 text-[#dadce0] mb-1" />
                <p className="text-sm font-semibold text-[#1f1f1f]">No candidates found</p>
                <p className="text-xs text-[#5f6368]">Try adjusting your search criteria or pipeline filters.</p>
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
                  <div key={app.id} className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs p-5 hover:shadow-md transition-all space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] font-bold text-sm shrink-0">
                          {getInitials(userInfo?.firstName, userInfo?.lastName)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#1f1f1f]">{userInfo?.firstName || 'Candidate'} {userInfo?.lastName || ''}</h3>
                            {getStatusBadge(status)}
                            {pendingDocsCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b06000] bg-[#fef7e0] border border-[#feefc3] px-2.5 py-0.5 rounded-full">
                                <FileText className="w-3 h-3" /> {pendingDocsCount} Docs Pending Review
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5f6368] mt-0.5">
                            Position: <span className="font-semibold text-[#1f1f1f]">{app.jobs?.title}</span> • {app.jobs?.department}
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#5f6368]" /> Resume
                          </a>
                        )}

                        {(isHired || isConverted) && (
                          <button 
                            onClick={() => navigate('/admin/recruitment/verify-documents/' + app.id, { state: { application: app } })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                          >
                            <BadgeCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
                            Verify Documents
                            {Number(app.pending_documents_count) > 0 && (
                              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold text-white bg-[#b06000] rounded-full">
                                {app.pending_documents_count}
                              </span>
                            )}
                          </button>
                        )}

                        {status === 'Applied' && (
                          <button 
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => updateApplicationStatus(app, 'Shortlisted')} 
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#137333] hover:bg-[#0d5926] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Shortlist
                          </button>
                        )}

                        {(status === 'Shortlisted' || isInterview) && (
                          <button 
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => openScheduleModal(app, nextInterviewRound)} 
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Schedule {isInterview ? 'Next ' : ''}Interview
                          </button>
                        )}

                        {isInterview && (
                          <button 
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => openOfferModal(app)} 
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#137333] hover:bg-[#0d5926] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Award className="w-3.5 h-3.5" /> Generate Offer
                          </button>
                        )}

                        {(status === 'Applied' || status === 'Shortlisted' || isInterview) && (
                          <button 
                            disabled={updateStatusMutation.isPending} 
                            onClick={() => updateApplicationStatus(app, 'Rejected')} 
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#fad2cf] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] transition-all cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}

                        {(isHired || isConverted) && (
                          <button 
                            onClick={() => openConvertModal(app)} 
                            disabled={isConverted || convertEmployeeMutation.isPending}
                            className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                              isConverted ? 'bg-[#f1f3f4] text-[#5f6368] cursor-not-allowed border border-[#dadce0]' : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {isConverted ? 'Converted to Employee' : 'Convert to Staff'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Candidate Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#f8fafd] border border-[#e0e3e7] rounded-xl p-3 text-xs text-[#5f6368]">
                      <div>
                        <span className="font-semibold text-[#1f1f1f] block mb-0.5">Email Address</span>
                        <span className="truncate block">{userInfo?.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-[#1f1f1f] block mb-0.5">Contact Number</span>
                        <span>{appProfile?.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-[#1f1f1f] block mb-0.5">Experience</span>
                        <span>{appProfile?.experience ? `${appProfile.experience} years` : 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-[#1f1f1f] block mb-0.5">Application Date</span>
                        <span>{new Date(app.applied_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => { setTimelineApp(app); setIsTimelineModalOpen(true); }}
                        className="inline-flex items-center text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        View Application Audit Timeline
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Offer Letter Drawer / Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-auto flex flex-col md:flex-row h-[90vh] overflow-hidden border border-[#e0e3e7]">
            <div className="flex-1 flex flex-col border-r border-[#e0e3e7]">
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-start bg-[#f8fafd]">
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Configure Job Offer Letter</h3>
                  <p className="text-xs text-[#5f6368]">Fill in compensation and joining details for {offerData.firstName} {offerData.lastName}</p>
                </div>
                <button onClick={() => setIsOfferModalOpen(false)} className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
                <form id="offerForm" onSubmit={handleSendOffer} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">First Name</label>
                      <input type="text" required value={offerData.firstName} onChange={(e) => setOfferData({...offerData, firstName: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Last Name</label>
                      <input type="text" required value={offerData.lastName} onChange={(e) => setOfferData({...offerData, lastName: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Department</label>
                      <input type="text" required value={offerData.department} onChange={(e) => setOfferData({...offerData, department: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Designation / Job Title</label>
                      <input type="text" required value={offerData.position} onChange={(e) => setOfferData({...offerData, position: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Joining Date</label>
                      <input type="date" required value={offerData.joiningDate} onChange={(e) => setOfferData({...offerData, joiningDate: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Offer Acceptance Deadline</label>
                      <input type="date" required value={offerData.offerDeadline} onChange={(e) => setOfferData({...offerData, offerDeadline: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Monthly Compensation (₹)</label>
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
                        className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all font-mono" 
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Annual CTC (₹)</label>
                      <input 
                        type="text" 
                        readOnly
                        placeholder="Auto-calculated"
                        value={offerData.annualSalary ? `₹${Number(offerData.annualSalary).toLocaleString('en-IN')}` : ''} 
                        className="w-full px-3.5 py-2 bg-[#f1f3f4] border border-[#dadce0] text-[#5f6368] rounded-xl text-xs outline-none cursor-not-allowed font-mono" 
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-2.5">
                <button type="button" onClick={() => setIsOfferModalOpen(false)} className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer">
                  Cancel
                </button>
                <button form="offerForm" type="submit" disabled={isGeneratingPdf || updateStatusMutation.isPending} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#137333] hover:bg-[#0d5926] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50">
                  <Award className="w-3.5 h-3.5" />
                  {isGeneratingPdf ? 'Generating PDF...' : updateStatusMutation.isPending ? 'Sending...' : 'Confirm & Dispatch Offer'}
                </button>
              </div>
            </div>
            
            {/* PDF Preview Sidebar */}
            <div className="hidden md:block w-1/2 bg-[#f8fafd] border-l border-[#e0e3e7] overflow-hidden relative">
              <PDFViewer width="100%" height="100%" className="border-none">
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
        </div>
      )}

      {/* Convert to Employee Sidebar Drawer */}
      {isConvertModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsConvertModalOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Convert to Employee</h3>
                  <p className="text-xs text-[#5f6368]">Create staff account and official employee profile</p>
                </div>
                <button onClick={() => setIsConvertModalOpen(false)} className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
                <form id="convert-candidate-form" onSubmit={handleConvertToEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">First Name *</label>
                      <input type="text" required value={convertData.firstName} onChange={e => setConvertData({...convertData, firstName: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Last Name *</label>
                      <input type="text" required value={convertData.lastName} onChange={e => setConvertData({...convertData, lastName: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Email *</label>
                    <input type="email" required value={convertData.email} onChange={e => setConvertData({...convertData, email: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Phone Number *</label>
                    <input type="text" value={convertData.phone} onChange={e => setConvertData({...convertData, phone: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Department *</label>
                      <input type="text" required value={convertData.department} onChange={e => setConvertData({...convertData, department: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Designation *</label>
                      <input type="text" required value={convertData.position} onChange={e => setConvertData({...convertData, position: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Branch *</label>
                      <select required value={convertData.branch} onChange={e => setConvertData({...convertData, branch: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all cursor-pointer">
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Join Date *</label>
                      <input type="date" required value={convertData.joinDate} onChange={e => setConvertData({...convertData, joinDate: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Monthly Salary (₹) *</label>
                    <input type="number" required value={convertData.salary} onChange={e => setConvertData({...convertData, salary: e.target.value})} placeholder="e.g. 50000" className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none font-mono transition-all" />
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-2.5">
                <button type="button" onClick={() => setIsConvertModalOpen(false)} className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer" disabled={convertEmployeeMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" form="convert-candidate-form" disabled={convertEmployeeMutation.isPending} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50">
                  <UserCheck className="w-3.5 h-3.5" />
                  {convertEmployeeMutation.isPending ? 'Converting...' : 'Convert Candidate'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Timeline Sidebar Drawer */}
      {isTimelineModalOpen && timelineApp && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsTimelineModalOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1f1f1f]">Application Timeline</h3>
                    <p className="text-xs text-[#5f6368]">Audit log of candidate pipeline progression</p>
                  </div>
                </div>
                <button onClick={() => setIsTimelineModalOpen(false)} className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
                {(!timelineApp.application_timeline || timelineApp.application_timeline.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-[#dadce0] bg-[#f8fafd] p-6 text-center text-xs text-[#5f6368]">
                    No status history recorded yet.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-[#e0e3e7] ml-3 pl-5 space-y-4">
                    {timelineApp.application_timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((event, idx) => {
                      const isLatest = idx === 0;
                      return (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${isLatest ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'}`} />
                          <div className={`rounded-2xl border p-3.5 space-y-1 ${isLatest ? 'border-[#d2e3fc] bg-[#e8f0fe]/50' : 'border-[#e0e3e7] bg-[#f8fafd]'}`}>
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-xs text-[#1f1f1f]">{event.status_change}</h4>
                              <span className="text-[10px] text-[#5f6368] bg-white border border-[#dadce0] px-2 py-0.5 rounded-full">
                                {new Date(event.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {event.notes && (
                              <p className="text-xs text-[#5f6368] leading-relaxed pt-1 whitespace-pre-line">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end">
                <button onClick={() => setIsTimelineModalOpen(false)} className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Interview Sidebar Drawer */}
      {isScheduleModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsScheduleModalOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Schedule {interviewData.status}</h3>
                  <p className="text-xs text-[#5f6368]">Configure interview round details and meeting link</p>
                </div>
                <button onClick={() => setIsScheduleModalOpen(false)} className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
                <form id="schedule-interview-form" onSubmit={handleScheduleInterview} className="space-y-4">
                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Interview Date *</label>
                    <input type="date" required value={interviewData.date} onChange={e => setInterviewData({...interviewData, date: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Interview Time *</label>
                    <input type="time" required value={interviewData.time} onChange={e => setInterviewData({...interviewData, time: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Meeting Link / Physical Location *</label>
                    <input type="text" required value={interviewData.location} onChange={e => setInterviewData({...interviewData, location: e.target.value})} placeholder="Google Meet link or Office meeting room" className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Preparation Instructions (Optional)</label>
                    <textarea rows="3" value={interviewData.notes} onChange={e => setInterviewData({...interviewData, notes: e.target.value})} placeholder="Instructions sent to candidate..." className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all resize-y" />
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-2.5">
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer" disabled={updateStatusMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" form="schedule-interview-form" disabled={updateStatusMutation.isPending} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50">
                  <Calendar className="w-3.5 h-3.5" />
                  {updateStatusMutation.isPending ? 'Dispatching...' : 'Schedule & Notify'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Post Job Sidebar Drawer */}
      {isJobModalOpen && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsJobModalOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col">
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Create Job Requisition</h3>
                  <p className="text-xs text-[#5f6368]">Publish a new career opportunity to portal</p>
                </div>
                <button onClick={() => setIsJobModalOpen(false)} className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
                <form id="post-job-form" onSubmit={handleCreateJob} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Job Title *</label>
                      <input type="text" required value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Department *</label>
                      <input type="text" required value={jobFormData.department} onChange={e => setJobFormData({...jobFormData, department: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Location *</label>
                      <input type="text" required value={jobFormData.location} onChange={e => setJobFormData({...jobFormData, location: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Employment Type *</label>
                      <select required value={jobFormData.type} onChange={e => setJobFormData({...jobFormData, type: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all cursor-pointer">
                        <option>Full Time</option>
                        <option>Part Time</option>
                        <option>Contract</option>
                        <option>Internship</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Experience *</label>
                      <input type="text" required value={jobFormData.experience} onChange={e => setJobFormData({...jobFormData, experience: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" placeholder="e.g. 3-5 Yrs" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Min Salary (₹)</label>
                      <input type="text" value={jobFormData.salary_min} onChange={e => setJobFormData({...jobFormData, salary_min: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none font-mono transition-all" placeholder="500000" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Max Salary (₹)</label>
                      <input type="text" value={jobFormData.salary_max} onChange={e => setJobFormData({...jobFormData, salary_max: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none font-mono transition-all" placeholder="1200000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Vacancies *</label>
                      <input type="number" required value={jobFormData.vacancy} onChange={e => setJobFormData({...jobFormData, vacancy: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Application Deadline</label>
                      <input type="date" value={jobFormData.deadline} onChange={e => setJobFormData({...jobFormData, deadline: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">JD Document (PDF Attachment)</label>
                    <input type="file" accept="application/pdf" onChange={e => setJobFile(e.target.files[0])} className="w-full text-xs text-[#5f6368] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#e8f0fe] file:text-[#1a73e8] hover:file:bg-[#d2e3fc] transition-colors" />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Required Skills</label>
                    <textarea rows={2} required value={jobFormData.skills} onChange={e => setJobFormData({...jobFormData, skills: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all resize-y" placeholder="e.g. React.js, PHP, PostgreSQL, Docker" />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#5f6368] uppercase tracking-wider mb-1">Job Description</label>
                    <textarea rows={3} required value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all resize-y" placeholder="Detailed role description and expectations..." />
                  </div>
                </form>
              </div>
              
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-2.5 shrink-0">
                <button type="button" onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer" disabled={createJobMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" form="post-job-form" onClick={() => setSubmitStatus('Draft')} disabled={createJobMutation.isPending} className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] transition-all cursor-pointer disabled:opacity-50">
                  {createJobMutation.isPending && submitStatus === 'Draft' ? 'Saving...' : 'Save Draft'}
                </button>
                <button type="submit" form="post-job-form" onClick={() => setSubmitStatus('Published')} disabled={createJobMutation.isPending} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50">
                  <Sparkles className="w-3.5 h-3.5" />
                  {createJobMutation.isPending && submitStatus === 'Published' ? 'Publishing...' : 'Publish Opening'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminRecruitment;
