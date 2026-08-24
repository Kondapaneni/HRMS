import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Settings, 
  Send, 
  UserPlus, 
  Info, 
  ArrowLeft, 
  Archive, 
  Trash2, 
  MailOpen, 
  Clock, 
  MoreVertical, 
  CornerUpLeft, 
  CornerUpRight, 
  Star, 
  Lock, 
  ShieldCheck, 
  UserCheck, 
  CalendarDays, 
  Briefcase, 
  CheckCircle2, 
  XCircle,
  Search,
  Users,
  Sparkles,
  ExternalLink,
  ChevronDown,
  FileCheck2,
  Award,
  GraduationCap
} from 'lucide-react';
import WelcomeEmailTemplate from '../components/emailTemplates/WelcomeEmailTemplate';
import LeaveEmailTemplate from '../components/emailTemplates/LeaveEmailTemplate';
import ResetPasswordEmailTemplate from '../components/emailTemplates/ResetPasswordEmailTemplate';
import CandidateActivateEmailTemplate from '../components/emailTemplates/CandidateActivateEmailTemplate';
import CandidateApplicationSuccessEmailTemplate from '../components/emailTemplates/CandidateApplicationSuccessEmailTemplate';
import CandidateShortlistedEmailTemplate from '../components/emailTemplates/CandidateShortlistedEmailTemplate';
import CandidateInterviewEmailTemplate from '../components/emailTemplates/CandidateInterviewEmailTemplate';
import CandidateOfferEmailTemplate from '../components/emailTemplates/CandidateOfferEmailTemplate';
import CandidateRejectedEmailTemplate from '../components/emailTemplates/CandidateRejectedEmailTemplate';
import CandidateDocumentsVerifiedEmailTemplate from '../components/emailTemplates/CandidateDocumentsVerifiedEmailTemplate';
import AssessmentAssignedEmailTemplate from '../components/emailTemplates/AssessmentAssignedEmailTemplate';
import AssessmentResultEmailTemplate from '../components/emailTemplates/AssessmentResultEmailTemplate';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
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

const AdminEmailTemplates = () => {
  const [activeTemplate, setActiveTemplate] = useState('welcome');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const templates = [
    {
      id: 'welcome',
      name: 'Welcome Email (Employees)',
      category: 'Employee HR',
      description: 'Dispatched to new employees upon account registration with their initial login credentials.',
      icon: Mail,
      subject: 'Welcome to Acme HRMS - Account Details & Onboarding Access',
      content: <WelcomeEmailTemplate />
    },
    {
      id: 'leave',
      name: 'Leave Request Status',
      category: 'Employee HR',
      description: 'Dispatched to employees immediately when their leave application is approved or rejected by management.',
      icon: CalendarDays,
      subject: 'Update on your Leave Request Status',
      content: <LeaveEmailTemplate />
    },
    {
      id: 'assessment_assigned',
      name: 'Assessment Assigned Invitation',
      category: 'Assessments & LMS',
      description: 'Dispatched when an employee is enrolled in a department exam or competency evaluation.',
      icon: FileCheck2,
      subject: 'New Assessment Assigned: Q3 Information Security & Cloud Architecture',
      content: <AssessmentAssignedEmailTemplate />
    },
    {
      id: 'assessment_result',
      name: 'Assessment Results & Scorecard',
      category: 'Assessments & LMS',
      description: 'Dispatched once an employee completes an assessment or after admin releases the score report.',
      icon: Award,
      subject: 'Your Assessment Results: Q3 Information Security & Cloud Architecture',
      content: <AssessmentResultEmailTemplate />
    },
    {
      id: 'reset',
      name: 'Password Reset Notification',
      category: 'Security & Access',
      description: 'Sent when an employee or administrator triggers a secure password reset.',
      icon: ShieldCheck,
      subject: 'Password Reset Instructions for Acme HRMS',
      content: <ResetPasswordEmailTemplate />
    },
    {
      id: 'candidate_activate',
      name: 'Candidate Account Activation',
      category: 'Candidate ATS',
      description: 'Dispatched to external job applicants following registration to verify email authenticity.',
      icon: UserCheck,
      subject: 'Activate your Acme HRMS Candidate Account',
      content: <CandidateActivateEmailTemplate />
    },
    {
      id: 'candidate_application_success',
      name: 'Application Received Confirmation',
      category: 'Candidate ATS',
      description: 'Sent to candidates immediately after submitting an application for a published job opening.',
      icon: Briefcase,
      subject: 'Application Received Successfully - Acme HRMS',
      content: <CandidateApplicationSuccessEmailTemplate />
    },
    {
      id: 'candidate_shortlisted',
      name: 'Candidate Shortlisted',
      category: 'Candidate ATS',
      description: 'Dispatched when HR moves a candidate to the Shortlisted stage in the recruiting pipeline.',
      icon: CheckCircle2,
      subject: "Good News! You've been shortlisted at Acme Corp",
      content: <CandidateShortlistedEmailTemplate />
    },
    {
      id: 'candidate_interview',
      name: 'Interview Scheduled Invitation',
      category: 'Candidate ATS',
      description: 'Contains Google Meet link, interview date, time, and instructions for upcoming rounds.',
      icon: CalendarDays,
      subject: 'Interview Invitation for Software Engineer Position',
      content: <CandidateInterviewEmailTemplate />
    },
    {
      id: 'candidate_offer',
      name: 'Job Offer Extended',
      category: 'Candidate ATS',
      description: 'Dispatched with official compensation details and offer letter acceptance link.',
      icon: CheckCircle2,
      subject: 'Job Offer: Congratulations on your selection at Acme Corp!',
      content: <CandidateOfferEmailTemplate />
    },
    {
      id: 'candidate_rejected',
      name: 'Application Update (Rejection)',
      category: 'Candidate ATS',
      description: 'Polite notification sent to candidates whose applications will not proceed further.',
      icon: XCircle,
      subject: 'Update regarding your job application at Acme Corp',
      content: <CandidateRejectedEmailTemplate />
    },
    {
      id: 'candidate_documents_verified',
      name: 'Pre-Employment Documents Verified',
      category: 'Candidate ATS',
      description: 'Sent once HR approves all mandatory certificates, ID proof, and legal forms.',
      icon: ShieldCheck,
      subject: 'Document Verification Successful - Onboarding Cleared',
      content: <CandidateDocumentsVerifiedEmailTemplate />
    }
  ];

  // Category counts
  const categoryCounts = useMemo(() => {
    const hrCount = templates.filter(t => t.category === 'Employee HR').length;
    const atsCount = templates.filter(t => t.category === 'Candidate ATS').length;
    const lmsCount = templates.filter(t => t.category === 'Assessments & LMS').length;
    const secCount = templates.filter(t => t.category === 'Security & Access').length;
    return { hrCount, atsCount, lmsCount, secCount };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchCat = categoryFilter === 'All' || t.category === categoryFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = q === '' || 
        t.name.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [templates, categoryFilter, searchQuery]);

  const currentTemplate = templates.find(t => t.id === activeTemplate) || templates[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
            <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
            <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
            <span className="w-2 h-2 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Communications &amp; Notifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Automated Email Templates <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{templates.length} Templates</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Audit and preview automated transactional messages dispatched across employee HR, assessments, and candidate recruiting workflows.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="System Templates" 
          value={templates.length} 
          subtitle="Transactional email blueprints" 
          icon={Mail} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Employee Lifecycle" 
          value={categoryCounts.hrCount} 
          subtitle="Welcome, leaves, onboarding" 
          icon={Users} 
          colorTheme="green" 
        />
        <StatCard 
          title="Recruiting & ATS" 
          value={categoryCounts.atsCount} 
          subtitle="Interviews, offers, verification" 
          icon={Briefcase} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Assessments & LMS" 
          value={categoryCounts.lmsCount} 
          subtitle="Test invites & scorecards" 
          icon={GraduationCap} 
          colorTheme="amber" 
        />
      </div>

      {/* Main Grid: Template List (Left) + Gmail-Style Mockup (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Template List */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
            {['All', 'Employee HR', 'Candidate ATS', 'Assessments & LMS', 'Security & Access'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368]" />
            <input
              type="search"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all"
            />
          </div>

          {/* Templates Cards List */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
            {filteredTemplates.map(template => {
              const Icon = template.icon;
              const isActive = activeTemplate === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => setActiveTemplate(template.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-[#e8f0fe] border-[#4285F4] shadow-xs'
                      : 'bg-white border-[#e0e3e7] hover:border-[#dadce0] hover:bg-[#f8fafd]'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isActive ? 'bg-[#1a73e8] text-white shadow-xs' : 'bg-[#f1f3f4] text-[#5f6368]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 truncate">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">
                        {template.category}
                      </span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] shrink-0" />}
                    </div>
                    <h3 className={`font-semibold text-xs truncate ${isActive ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
                      {template.name}
                    </h3>
                    <p className="text-[11px] text-[#5f6368] line-clamp-2 mt-0.5 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Gmail UI Live Mockup */}
        <div className="lg:col-span-8 bg-white border border-[#e0e3e7] rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[620px]">
          
          {/* Gmail Toolbar Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e0e3e7] bg-[#f8fafd]">
            <div className="flex items-center gap-2 sm:gap-3 text-[#5f6368]">
              <button className="p-1.5 hover:bg-[#e8eaed] rounded-full transition-colors cursor-pointer" title="Back">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[#e8eaed] rounded-full transition-colors cursor-pointer" title="Archive">
                <Archive className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[#e8eaed] rounded-full transition-colors cursor-pointer" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[#e8eaed] rounded-full transition-colors cursor-pointer" title="Mark Unread">
                <MailOpen className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[#e8eaed] rounded-full transition-colors cursor-pointer" title="Snooze">
                <Clock className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[#dadce0] mx-0.5 hidden sm:block" />
              <button className="p-1.5 hover:bg-[#e8eaed] rounded-full transition-colors cursor-pointer" title="Options">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#5f6368]">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
                <Sparkles className="w-3 h-3" /> Live HTML Preview
              </span>
            </div>
          </div>

          {/* Email Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-white">
            <motion.div
              key={currentTemplate.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Subject Title */}
              <div className="space-y-2 pb-4 border-b border-[#e0e3e7]">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-normal text-[#1f1f1f] tracking-tight">
                    {currentTemplate.subject}
                  </h2>
                  <span className="bg-[#f1f3f4] text-[#5f6368] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Inbox
                  </span>
                  <span className="bg-[#e8f0fe] text-[#1a73e8] text-[10px] px-2 py-0.5 rounded font-semibold">
                    {currentTemplate.category}
                  </span>
                </div>
              </div>

              {/* Sender Info Row */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                    A
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-xs text-[#1f1f1f]">Acme HRMS Automation</span>
                      <span className="text-[11px] text-[#5f6368]">&lt;no-reply@acme.com&gt;</span>
                    </div>
                    <div className="text-[11px] text-[#5f6368] mt-0.5 flex items-center gap-1">
                      <span>to</span>
                      <span className="font-semibold text-[#1f1f1f] bg-[#f1f3f4] px-1.5 py-0.2 rounded text-[10px]">me</span>
                      <ChevronDown className="w-3 h-3 text-[#5f6368]" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[#5f6368] text-xs">
                  <span className="text-[11px] hidden sm:inline">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Just now)</span>
                  <button className="hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer" title="Star message">
                    <Star className="w-3.5 h-3.5 text-[#5f6368]" />
                  </button>
                  <button className="hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer" title="Reply">
                    <CornerUpLeft className="w-3.5 h-3.5 text-[#5f6368]" />
                  </button>
                </div>
              </div>

              {/* Rendered Email Template HTML */}
              <div className="rounded-2xl border border-[#e0e3e7] p-2 bg-[#f8fafd] overflow-hidden">
                <div className="bg-white rounded-xl shadow-2xs overflow-hidden">
                  {currentTemplate.content}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer shadow-2xs">
                  <CornerUpLeft className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>Reply</span>
                </button>
                <button className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer shadow-2xs">
                  <CornerUpRight className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>Forward</span>
                </button>
              </div>
            </motion.div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminEmailTemplates;
