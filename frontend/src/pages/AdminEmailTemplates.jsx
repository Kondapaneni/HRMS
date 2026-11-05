import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  ArrowLeft, 
  Archive, 
  Trash2, 
  MailOpen, 
  Clock, 
  MoreVertical, 
  CornerUpLeft, 
  CornerUpRight, 
  Star, 
  ShieldCheck, 
  UserCheck, 
  CalendarDays, 
  Briefcase, 
  CheckCircle2, 
  XCircle,
  Search,
  Users,
  Sparkles,
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
import PromotionEmailTemplate from '../components/emailTemplates/PromotionEmailTemplate';
import { StatCard, Button } from '../components/ui';

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
      id: 'promotion',
      name: 'Promotion Letter (Employees)',
      category: 'Employee HR',
      description: 'Dispatched to employees upon promotion with revised designation, salary increment breakdown, and official congratulations.',
      icon: Award,
      subject: 'Congratulations on Your Promotion - Acme Corp',
      content: <PromotionEmailTemplate />
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
    <div className="space-y-4 font-sans antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Automated Email Templates
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Audit and preview automated transactional messages dispatched across employee HR, assessments, and candidate recruiting workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {templates.length} Templates
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="System Templates" 
          value={templates.length} 
          subtitle="Transactional email blueprints" 
          icon={Mail} 
        />
        <StatCard 
          title="Employee Lifecycle" 
          value={categoryCounts.hrCount} 
          subtitle="Welcome, leaves, onboarding" 
          badgeText="HR"
          badgeType="success"
          icon={Users} 
        />
        <StatCard 
          title="Recruiting & ATS" 
          value={categoryCounts.atsCount} 
          subtitle="Interviews, offers, verification" 
          badgeText="ATS"
          badgeType="info"
          icon={Briefcase} 
        />
        <StatCard 
          title="Assessments & LMS" 
          value={categoryCounts.lmsCount} 
          subtitle="Test invites & scorecards" 
          badgeText="LMS"
          badgeType="warning"
          icon={GraduationCap} 
        />
      </div>

      {/* Main Grid: Template List (Left) + Gmail-Style Mockup (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Template List */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {['All', 'Employee HR', 'Candidate ATS', 'Assessments & LMS', 'Security & Access'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[var(--ink)] text-white shadow-xs'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--icon-muted)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs bg-[var(--surface-alt)] border border-[var(--line)] rounded-full text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
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
                  className={`w-full text-left p-3.5 rounded-[16px] border transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--brand-tint)] border-[var(--brand)] shadow-xs'
                      : 'bg-[var(--surface)] border-[var(--line)] hover:bg-[var(--surface-alt)]'
                  }`}
                >
                  <div className={`p-2 rounded-[10px] shrink-0 ${
                    isActive ? 'bg-[var(--brand-deep)] text-white shadow-xs' : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 truncate">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                        {template.category}
                      </span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)] shrink-0" />}
                    </div>
                    <h3 className={`font-semibold text-xs truncate ${isActive ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                      {template.name}
                    </h3>
                    <p className="text-[11px] text-[var(--muted)] line-clamp-2 mt-0.5 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Gmail UI Live Mockup */}
        <div className="lg:col-span-8 bg-[var(--surface)] border border-[var(--line)] rounded-[24px] overflow-hidden flex flex-col min-h-[620px]">
          
          {/* Gmail Toolbar Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--surface-alt)]/60">
            <div className="flex items-center gap-2 sm:gap-3 text-[var(--muted)]">
              <button className="p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors cursor-pointer" title="Back">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors cursor-pointer" title="Archive">
                <Archive className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors cursor-pointer" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors cursor-pointer" title="Mark Unread">
                <MailOpen className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors cursor-pointer" title="Snooze">
                <Clock className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[var(--line)] mx-0.5 hidden sm:block" />
              <button className="p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors cursor-pointer" title="Options">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[var(--brand-tint)] text-[var(--brand-deep)] px-2.5 py-0.5 rounded-[8px]">
                <Sparkles className="w-3 h-3" /> Live HTML Preview
              </span>
            </div>
          </div>

          {/* Email Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-[var(--surface)]">
            <motion.div
              key={currentTemplate.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Subject Title */}
              <div className="space-y-2 pb-4 border-b border-[var(--line)]">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-medium text-[var(--text)] tracking-tight">
                    {currentTemplate.subject}
                  </h2>
                  <span className="bg-[var(--surface-alt)] text-[var(--muted)] text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    Inbox
                  </span>
                  <span className="bg-[var(--brand-tint)] text-[var(--brand-deep)] text-[10px] px-2 py-0.5 rounded font-semibold">
                    {currentTemplate.category}
                  </span>
                </div>
              </div>

              {/* Sender Info Row */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--line)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-[var(--brand-deep)] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                    A
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-xs text-[var(--text)]">Acme HRMS Automation</span>
                      <span className="text-[11px] text-[var(--muted)]">&lt;no-reply@acme.com&gt;</span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5 flex items-center gap-1">
                      <span>to</span>
                      <span className="font-semibold text-[var(--text)] bg-[var(--surface-alt)] px-1.5 py-0.2 rounded text-[10px]">me</span>
                      <ChevronDown className="w-3 h-3 text-[var(--icon-muted)]" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs">
                  <span className="text-[11px] hidden sm:inline">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Just now)</span>
                  <button className="hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer" title="Star message">
                    <Star className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
                  </button>
                  <button className="hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer" title="Reply">
                    <CornerUpLeft className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
                  </button>
                </div>
              </div>

              {/* Rendered Email Template HTML */}
              <div className="rounded-[16px] border border-[var(--line)] p-2 bg-[var(--surface-alt)] overflow-hidden">
                <div className="bg-[var(--surface)] rounded-[12px] overflow-hidden">
                  {currentTemplate.content}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="secondary" size="sm">
                  <CornerUpLeft className="w-3.5 h-3.5 mr-1 text-[var(--icon-muted)]" />
                  <span>Reply</span>
                </Button>
                <Button variant="secondary" size="sm">
                  <CornerUpRight className="w-3.5 h-3.5 mr-1 text-[var(--icon-muted)]" />
                  <span>Forward</span>
                </Button>
              </div>
            </motion.div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminEmailTemplates;