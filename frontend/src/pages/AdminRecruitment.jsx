import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

import { Briefcase, Users, Plus, FileText, CheckCircle2, XCircle, Clock, Calendar, Mail, FileUp, X, CalendarDays, BadgeCheck, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import shortlistedEmailTemplateHtml from "../../../backend/src/Templates/candidate_shortlisted_email.html?raw";
import rejectedEmailTemplateHtml from "../../../backend/src/Templates/candidate_rejected_email.html?raw";
import interviewEmailTemplateHtml from "../../../backend/src/Templates/candidate_interview_email.html?raw";
import offerEmailTemplateHtml from "../../../backend/src/Templates/candidate_offer_email.html?raw";
import { pdf, PDFViewer } from '@react-pdf/renderer';
import OfferLetterPDF from '../components/offerLetter/OfferLetterPDF';

const AdminRecruitment = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'applications'
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: async () => {
      const res = await api.get('/admin/jobs');
      return res.data.jobs || [];
    },
    onError: () => toast.error('Failed to load jobs')
  });

  const { data: applications = [], isLoading: isLoadingApps } = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: async () => {
      const res = await api.get('/admin/applications');
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

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
    firstName: '', lastName: '', email: '', phone: '', department: '', position: '', joiningDate: '', workLocation: '', annualSalary: '', offerDeadline: ''
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Timeline UI State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineApp, setTimelineApp] = useState(null);

  // Documents Verification State
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [docsModalApp, setDocsModalApp] = useState(null);

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
              <h2 style="color: #2563eb;">Application Update</h2>
              <p>Hi ${userInfo?.firstName},</p>
              ${bodyContent}
              <p>Best regards,<br>The Acme Team</p>
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
      toast.success(`Application status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to update status');
    }
  });

  const updateApplicationStatus = (app, newStatus, additionalNotes = '') => {
    const userInfo = candidatesInfo.find(u => u.id === app.candidate_id);
    updateStatusMutation.mutate({ app, userInfo, newStatus, additionalNotes });
  };

  const handleScheduleInterview = (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    const userInfo = candidatesInfo.find(u => u.id === selectedApp.candidate_id);
    const notes = `Interview scheduled for ${interviewData.date} at ${interviewData.time}, Location: ${interviewData.location}. ${interviewData.notes}`;
    updateStatusMutation.mutate({ app: selectedApp, userInfo, newStatus: interviewData.status, additionalNotes: notes }, {
      onSuccess: () => {
        setIsScheduleModalOpen(false);
      }
    });
  };

  const convertEmployeeMutation = useMutation({
    mutationFn: async () => {
      const empId = `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const payload = {
        userId: selectedApp.candidate_id,
        employeeId: empId,
        firstName: convertData.firstName,
        lastName: convertData.lastName,
        email: convertData.email,
        phone: convertData.phone,
        department: convertData.department,
        position: convertData.position,
        branch: convertData.branch,
        joinDate: convertData.joinDate,
        salary: parseFloat(convertData.salary),
        status: convertData.status.toLowerCase(),
        managerId: convertData.managerId || null
      };

      await api.post('/admin/employees/convert', payload);
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

  // Helper functions
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

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('applied')) return 'bg-slate-100 text-slate-800 border-slate-200';
    if (s.includes('shortlisted')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s.includes('interview')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (s.includes('rejected')) return 'bg-red-100 text-red-800 border-red-200';
    if (s.includes('hired') || s.includes('selected')) return 'bg-green-100 text-green-800 border-green-200';
    if (s.includes('converted')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const filteredApplications = applications.filter(app => {
    const appProfile = candidateProfiles.find(p => p.user_id === app.candidate_id);
    const userInfo = candidatesInfo.find(u => u.id === app.candidate_id);
    const matchesSearch = (userInfo?.firstName + ' ' + userInfo?.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (userInfo?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (app.jobs?.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJob = jobFilter ? app.job_id === jobFilter : true;
    const matchesStatus = statusFilter ? app.status === statusFilter : true;
    return matchesSearch && matchesJob && matchesStatus;
  });

  const openPositions = jobs.filter(j => j.status === 'Published').length;
  const totalApplicants = applications.length;
  const inInterview = applications.filter(a => (a.status || '').includes('Interview')).length;
  const hiredCount = applications.filter(a => ['Hired', 'Selected', 'Converted to Employee'].includes(a.status)).length;


  if (isLoadingJobs) return <PageLoader message="Loading Recruitment Data..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recruitment</h1>
          <p className="text-sm text-slate-500 mt-1">Manage published jobs, candidate applications, and employee conversion.</p>
        </div>
        <button 
          onClick={() => setIsJobModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Post New Job
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Published Jobs', value: openPositions, icon: <Briefcase className="w-8 h-8 text-blue-600" />, color: 'text-blue-600' },
          { label: 'Total Applicants', value: totalApplicants, icon: <Users className="w-8 h-8 text-green-600" />, color: 'text-green-600' },
          { label: 'Interview Scheduled', value: inInterview, icon: <CalendarDays className="w-8 h-8 text-purple-600" />, color: 'text-purple-600' },
          { label: 'Hired / Converted', value: hiredCount, icon: <BadgeCheck className="w-8 h-8 text-orange-600" />, color: 'text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="border-b border-slate-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`${activeTab === 'jobs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Job Postings
            </button>
            <button
              onClick={() => { setActiveTab('applications'); setJobFilter(''); }}
              className={`${activeTab === 'applications' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Applicants
            </button>
          </nav>
        </div>

        {activeTab === 'jobs' && (
          <div className="grid gap-4">
            {isLoadingJobs ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : jobs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
                No job postings yet. Use "Post New Job" to create one.
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="rounded-lg border border-slate-200 bg-white shadow-sm p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${job.status === 'Published' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span>{job.department}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.type}</span>
                        <span>•</span>
                        <span>{job.applications?.[0]?.count || 0} applicants</span>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                        <p><strong className="text-slate-700">Experience:</strong> {job.experience || 'Not specified'}</p>
                        <p><strong className="text-slate-700">Vacancy:</strong> {job.vacancy || 1}</p>
                        <p><strong className="text-slate-700">Qualification:</strong> {job.qualification || 'Not specified'}</p>
                        <p><strong className="text-slate-700">Last Date:</strong> {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open until filled'}</p>
                      </div>
                      <div className="mt-4 space-y-1">
                        <p className="text-sm font-semibold text-slate-700">Detailed Job Description:</p>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{job.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4 xl:mt-0 shrink-0">
                      <button 
                        onClick={() => { setActiveTab('applications'); setJobFilter(job.id); }}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-10 px-4 py-2 text-sm font-medium text-slate-700 transition-colors"
                      >
                        View Applicants
                      </button>
                      {job.status === 'Draft' ? (
                        <button 
                          onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'Published' })}
                          disabled={updateJobStatusMutation.isPending}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-emerald-600 hover:bg-emerald-700 h-10 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                        >
                          Publish
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateJobStatusMutation.mutate({ jobId: job.id, status: 'Draft' })}
                          disabled={updateJobStatusMutation.isPending}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-10 px-4 py-2 text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      )}
                      {job.description_pdf_url && (
                        <a 
                          href={job.description_pdf_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-10 px-4 py-2 text-sm font-medium text-slate-700 transition-colors"
                        >
                          Attachment
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
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Search Applicants</label>
                  <input 
                    type="search" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Candidate name, email, or job title"
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Job</label>
                  <select 
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="">All jobs</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="">All statuses</option>
                    {Array.from(new Set(applications.map(a => a.status || 'Applied'))).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {isLoadingApps ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : filteredApplications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
                  No applications found.
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
                    <div key={app.id} className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">{userInfo?.firstName || 'Candidate'} {userInfo?.lastName || ''}</h3>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(status)}`}>
                              {status}
                            </span>
                            {pendingDocsCount > 0 && (
                              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-0.5 text-xs font-bold shadow-sm" title={`${pendingDocsCount} document(s) waiting for verification`}>
                                <FileText size={12} className="mr-1.5 opacity-70" /> {pendingDocsCount} Docs Pending
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{app.jobs?.title} • {app.jobs?.department}</p>
                        </div>
                        
                        <div className="flex flex-wrap justify-end gap-2">
                          {app.resume_url && (
                            <a href={app.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-9 px-3 py-2 text-sm font-medium text-slate-700">
                              View Resume
                            </a>
                          )}

                          {(isHired || isConverted) && (
                          <button 
                            onClick={() => navigate('/admin/recruitment/verify-documents/' + app.id, { state: { application: app } })}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-9 px-3 py-2 text-sm font-medium text-slate-700"
                          >
                            Verify Documents
                          </button>
                          )}

                          {status === 'Applied' && (
                            <button disabled={updateStatusMutation.isPending} onClick={() => updateApplicationStatus(app, 'Shortlisted')} className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-9 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
                              Shortlist
                            </button>
                          )}

                          {(status === 'Shortlisted' || isInterview) && (
                            <button disabled={updateStatusMutation.isPending} onClick={() => openScheduleModal(app, nextInterviewRound)} className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-9 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
                              Schedule {isInterview ? 'Next ' : ''}Interview
                            </button>
                          )}

                          {isInterview && (
                            <button disabled={updateStatusMutation.isPending} onClick={() => openOfferModal(app)} className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-9 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
                              Hire Candidate
                            </button>
                          )}

                          {(status === 'Applied' || status === 'Shortlisted' || isInterview) && (
                            <button disabled={updateStatusMutation.isPending} onClick={() => updateApplicationStatus(app, 'Rejected')} className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 h-9 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
                              Reject
                            </button>
                          )}

                          {(isHired || isConverted) && (
                            <button 
                              onClick={() => openConvertModal(app)} 
                              disabled={isConverted || convertEmployeeMutation.isPending}
                              className={`inline-flex items-center justify-center rounded-md h-9 px-3 py-2 text-sm font-medium disabled:opacity-50 ${isConverted ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'}`}
                            >
                              {isConverted ? 'Converted' : 'Convert to Employee'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                        <div className="min-w-0 break-words">
                          <p className="text-sm font-semibold text-slate-700 mb-1">Email</p>
                          <p className="text-sm text-slate-500 truncate">{userInfo?.email || 'N/A'}</p>
                        </div>
                        <div className="min-w-0 break-words">
                          <p className="text-sm font-semibold text-slate-700 mb-1">Phone</p>
                          <p className="text-sm text-slate-500">{appProfile?.phone || 'N/A'}</p>
                        </div>
                        <div className="min-w-0 break-words">
                          <p className="text-sm font-semibold text-slate-700 mb-1">Experience</p>
                          <p className="text-sm text-slate-500">{appProfile?.experience ? `${appProfile.experience} years` : 'Not specified'}</p>
                        </div>
                        <div className="min-w-0 break-words">
                          <p className="text-sm font-semibold text-slate-700 mb-1">Designation</p>
                          <p className="text-sm text-slate-500">{appProfile?.current_title || 'Not specified'}</p>
                        </div>
                        <div className="min-w-0 break-words">
                          <p className="text-sm font-semibold text-slate-700 mb-1">Applied</p>
                          <p className="text-sm text-slate-500">{new Date(app.applied_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button 
                          onClick={() => { setTimelineApp(app); setIsTimelineModalOpen(true); }}
                          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          <Clock className="w-4 h-4 mr-1.5" />
                          View Full Timeline
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offer Letter Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-auto flex flex-col md:flex-row h-[90vh]">
            <div className="flex-1 flex flex-col border-r border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50 rounded-tl-lg">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Configure Offer Letter</h3>
                  <p className="text-sm text-slate-500">Fill in the offer details for {offerData.firstName} {offerData.lastName}</p>
                </div>
                <button onClick={() => setIsOfferModalOpen(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form id="offerForm" onSubmit={handleSendOffer} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">First Name</label>
                      <input type="text" required value={offerData.firstName} onChange={(e) => setOfferData({...offerData, firstName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Last Name</label>
                      <input type="text" required value={offerData.lastName} onChange={(e) => setOfferData({...offerData, lastName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Department</label>
                      <input type="text" required value={offerData.department} onChange={(e) => setOfferData({...offerData, department: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Designation / Job Title</label>
                      <input type="text" required value={offerData.position} onChange={(e) => setOfferData({...offerData, position: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Joining Date</label>
                      <input type="date" required value={offerData.joiningDate} onChange={(e) => setOfferData({...offerData, joiningDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Offer Deadline</label>
                      <input type="date" required value={offerData.offerDeadline} onChange={(e) => setOfferData({...offerData, offerDeadline: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Annual Compensation (INR)</label>
                    <input type="text" required placeholder="e.g., ₹12,00,000" value={offerData.annualSalary} onChange={(e) => setOfferData({...offerData, annualSalary: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-bl-lg">
                <button type="button" onClick={() => setIsOfferModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button form="offerForm" type="submit" disabled={isGeneratingPdf || updateStatusMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50">
                  {isGeneratingPdf ? 'Generating PDF...' : updateStatusMutation.isPending ? 'Sending...' : 'Confirm & Send Offer'}
                </button>
              </div>
            </div>
            
            {/* PDF Preview Sidebar */}
            <div className="hidden md:block w-1/2 bg-slate-200 rounded-r-lg overflow-hidden relative">
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

      {/* Convert to Employee Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50 rounded-t-lg">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Convert Candidate to Employee</h2>
                <p className="mt-1 text-sm text-slate-500">Create a staff user and employee record for this candidate.</p>
              </div>
              <button onClick={() => setIsConvertModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleConvertToEmployee} className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">First Name</label>
                  <input type="text" required value={convertData.firstName} onChange={e => setConvertData({...convertData, firstName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Last Name</label>
                  <input type="text" required value={convertData.lastName} onChange={e => setConvertData({...convertData, lastName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input type="email" required value={convertData.email} onChange={e => setConvertData({...convertData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <input type="text" value={convertData.phone} onChange={e => setConvertData({...convertData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Department</label>
                  <input type="text" required value={convertData.department} onChange={e => setConvertData({...convertData, department: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Designation</label>
                  <input type="text" required value={convertData.position} onChange={e => setConvertData({...convertData, position: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Branch</label>
                  <select required value={convertData.branch} onChange={e => setConvertData({...convertData, branch: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white">
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Join Date</label>
                  <input type="date" required value={convertData.joinDate} onChange={e => setConvertData({...convertData, joinDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Annual Compensation (INR)</label>
                  <input type="number" required value={convertData.salary} onChange={e => setConvertData({...convertData, salary: e.target.value})} placeholder="e.g. 600000" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select required value={convertData.status} onChange={e => setConvertData({...convertData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Manager (Optional)</label>
                <select 
                  value={convertData.managerId} 
                  onChange={e => setConvertData({...convertData, managerId: e.target.value})} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white" 
                >
                  <option value="">Select a Manager...</option>
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setIsConvertModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer" disabled={convertEmployeeMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" disabled={convertEmployeeMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
                  {convertEmployeeMutation.isPending ? 'Converting...' : 'Convert to Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Sidebar Modal */}
      {isTimelineModalOpen && timelineApp && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Application Timeline</h2>
                <p className="mt-1 text-sm text-slate-500">History of status changes for this application.</p>
              </div>
              <button onClick={() => setIsTimelineModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="relative wrap overflow-hidden p-2">
                <div className="absolute border-opacity-20 border-slate-300 h-full border-l-2" style={{left: '2rem'}}></div>
                {(!timelineApp.application_timeline || timelineApp.application_timeline.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 relative z-10 w-full ml-12">
                    Timeline history is not available yet.
                  </div>
                ) : (
                  timelineApp.application_timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((event, idx, arr) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="mb-8 flex justify-start items-start w-full relative">
                        <div className="z-20 flex items-center justify-center bg-blue-50 shadow-sm border-[3px] border-white w-10 h-10 rounded-full shrink-0 mr-6 ml-3">
                          {isLatest && (
                            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40 animate-ping"></span>
                          )}
                          <span className="relative text-blue-600">
                            {isLatest ? <CheckCircle2 size={18} className="text-blue-600" /> : <Clock size={16} />}
                          </span>
                        </div>
                        <div className={`rounded-lg border ${isLatest ? 'border-blue-200 bg-blue-50/50 shadow-md' : 'border-slate-200 bg-white shadow-sm'} w-full p-4`}>
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
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-end">
              <button onClick={() => setIsTimelineModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Schedule Interview Sidebar Modal */}
      {isScheduleModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Schedule {interviewData.status}</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the interview details to notify the candidate.</p>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="schedule-interview-form" onSubmit={handleScheduleInterview} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Date</label>
                    <input type="date" required value={interviewData.date} onChange={e => setInterviewData({...interviewData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Time</label>
                    <input type="time" required value={interviewData.time} onChange={e => setInterviewData({...interviewData, time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Location / Link</label>
                    <input type="text" required value={interviewData.location} onChange={e => setInterviewData({...interviewData, location: e.target.value})} placeholder="Zoom link, Office, etc." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Additional Notes (optional)</label>
                  <textarea rows="4" value={interviewData.notes} onChange={e => setInterviewData({...interviewData, notes: e.target.value})} placeholder="Any preparation instructions..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer" disabled={updateStatusMutation.isPending}>
                Cancel
              </button>
              <button type="submit" form="schedule-interview-form" disabled={updateStatusMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
                {updateStatusMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Post Job Sidebar Modal */}
      {isJobModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white shadow-2xl w-full max-w-2xl h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">Post New Job</h2>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="post-job-form" onSubmit={handleCreateJob} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Job Title *</label>
                    <input type="text" required value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Department *</label>
                    <input type="text" required value={jobFormData.department} onChange={e => setJobFormData({...jobFormData, department: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Location *</label>
                    <input type="text" required value={jobFormData.location} onChange={e => setJobFormData({...jobFormData, location: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Job Type *</label>
                    <select required value={jobFormData.type} onChange={e => setJobFormData({...jobFormData, type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-white cursor-pointer">
                      <option>Full Time</option>
                      <option>Part Time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Experience *</label>
                    <input type="text" required value={jobFormData.experience} onChange={e => setJobFormData({...jobFormData, experience: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Salary Min *</label>
                    <input type="text" required value={jobFormData.salary_min} onChange={e => setJobFormData({...jobFormData, salary_min: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Salary Max *</label>
                    <input type="text" required value={jobFormData.salary_max} onChange={e => setJobFormData({...jobFormData, salary_max: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Vacancy *</label>
                    <input type="number" required value={jobFormData.vacancy} onChange={e => setJobFormData({...jobFormData, vacancy: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Application Deadline</label>
                    <input type="date" value={jobFormData.deadline} onChange={e => setJobFormData({...jobFormData, deadline: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Attachment (PDF)</label>
                    <input type="file" accept="application/pdf" onChange={e => setJobFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Skills</label>
                  <textarea rows={3} required value={jobFormData.skills} onChange={e => setJobFormData({...jobFormData, skills: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-y" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qualification</label>
                  <textarea rows={3} required value={jobFormData.qualification} onChange={e => setJobFormData({...jobFormData, qualification: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-y" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Detailed Job Description</label>
                  <textarea rows={4} required value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-y" />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer" disabled={createJobMutation.isPending}>
                Cancel
              </button>
              <button type="submit" form="post-job-form" onClick={() => setSubmitStatus('Draft')} disabled={createJobMutation.isPending} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
                {createJobMutation.isPending && submitStatus === 'Draft' ? 'Saving...' : 'Save Draft'}
              </button>
              <button type="submit" form="post-job-form" onClick={() => setSubmitStatus('Published')} disabled={createJobMutation.isPending} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50">
                {createJobMutation.isPending && submitStatus === 'Published' ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Documents Verification Modal */}
      {isDocsModalOpen && docsModalApp && (
        <AdminDocumentsVerificationModal 
          application={docsModalApp} 
          onClose={() => { setIsDocsModalOpen(false); setDocsModalApp(null); }} 
        />
      )}

    </div>
  );
};

export default AdminRecruitment;
