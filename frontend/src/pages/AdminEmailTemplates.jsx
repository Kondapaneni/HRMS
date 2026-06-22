import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Settings, Send, UserPlus, Info, ArrowLeft, Archive, Trash2, MailOpen, Clock, MoreVertical, CornerUpLeft, CornerUpRight, Star, Lock, ShieldCheck, UserCheck, CalendarDays, Briefcase, CheckCircle2, XCircle } from 'lucide-react';
import WelcomeEmailTemplate from '../components/emailTemplates/WelcomeEmailTemplate';
import LeaveEmailTemplate from '../components/emailTemplates/LeaveEmailTemplate';
import ResetPasswordEmailTemplate from '../components/emailTemplates/ResetPasswordEmailTemplate';
import CandidateActivateEmailTemplate from '../components/emailTemplates/CandidateActivateEmailTemplate';
import CandidateApplicationSuccessEmailTemplate from '../components/emailTemplates/CandidateApplicationSuccessEmailTemplate';
import CandidateShortlistedEmailTemplate from '../components/emailTemplates/CandidateShortlistedEmailTemplate';
import CandidateInterviewEmailTemplate from '../components/emailTemplates/CandidateInterviewEmailTemplate';
import CandidateRejectedEmailTemplate from '../components/emailTemplates/CandidateRejectedEmailTemplate';

const AdminEmailTemplates = () => {
  const [activeTemplate, setActiveTemplate] = useState('welcome');

  const templates = [
    {
      id: 'welcome',
      name: 'Welcome Email (Employees)',
      description: 'Sent to new employees when their account is created.',
      icon: <Mail size={16} />,
      subject: 'Welcome to Acme HRMS - Account Details',
      content: <WelcomeEmailTemplate />
    },
    {
      id: 'leave',
      name: 'Leave Request Status',
      description: 'Sent to employees when their leave request is approved or rejected.',
      icon: <CalendarDays size={16} />,
      subject: 'Update on your Leave Request',
      content: <LeaveEmailTemplate />
    },
    {
      id: 'reset',
      name: 'Password Reset',
      description: 'Sent when an employee requests a password reset.',
      icon: <ShieldCheck size={16} />,
      subject: 'Password Reset Request',
      content: <ResetPasswordEmailTemplate />
    },
    {
      id: 'candidate_activate',
      name: 'Candidate Account Activation',
      description: 'Sent to candidates after registration to activate their account.',
      icon: <UserCheck size={16} />,
      subject: 'Activate your Acme HRMS Candidate Account',
      content: <CandidateActivateEmailTemplate />
    },
    {
      id: 'candidate_application_success',
      name: 'Application Success',
      description: 'Sent to candidates after they successfully apply for a job.',
      icon: <Briefcase size={16} />,
      subject: 'Application Received Successfully',
      content: <CandidateApplicationSuccessEmailTemplate />
    },
    {
      id: 'candidate_shortlisted',
      name: 'Application Shortlisted',
      description: 'Sent to candidates when they are shortlisted for an interview.',
      icon: <CheckCircle2 size={16} />,
      subject: "Good News! You've been shortlisted",
      content: <CandidateShortlistedEmailTemplate />
    },
    {
      id: 'candidate_interview',
      name: 'Interview Scheduled',
      description: 'Sent to candidates when an interview round is scheduled.',
      icon: <CalendarDays size={16} />,
      subject: 'Interview Invitation for Software Engineer',
      content: <CandidateInterviewEmailTemplate />
    },
    {
      id: 'candidate_rejected',
      name: 'Application Rejected',
      description: 'Sent to candidates when their application is not moving forward.',
      icon: <XCircle size={16} />,
      subject: 'Update regarding your application',
      content: <CandidateRejectedEmailTemplate />
    }
  ];

  const currentTemplate = templates.find(t => t.id === activeTemplate);

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10">

      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-sm">
              <Mail size={20} />
            </div>
            Email Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Preview the automated emails sent by the Acme HRMS system to employees.
          </p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Sidebar List */}
        <div className="md:col-span-4 lg:col-span-3 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Available Templates</h2>

          {templates.map((template) => (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              key={template.id}
              onClick={() => setActiveTemplate(template.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 ${activeTemplate === template.id
                ? 'bg-white border-indigo-200 shadow-md shadow-indigo-100 ring-1 ring-indigo-100'
                : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
            >
              <div className={`p-2 rounded-lg mt-0.5 ${activeTemplate === template.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {template.icon}
              </div>
              <div>
                <h3 className={`font-semibold text-sm ${activeTemplate === template.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                  {template.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Preview Pane - Gmail UI Mockup */}
        <div className="md:col-span-8 lg:col-span-9 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px] font-sans">

          {/* Gmail Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-4 text-slate-500">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft size={18} /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Archive size={18} /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Trash2 size={18} /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><MailOpen size={18} /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Clock size={18} /></button>
              <div className="w-px h-5 bg-slate-200 mx-1"></div>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><MoreVertical size={18} /></button>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              1 of 42
            </div>
          </div>

          {/* Email Content Area */}
          <div className="flex-1 overflow-y-auto bg-white">
            <motion.div
              key={currentTemplate?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="p-6 md:p-8"
            >
              {/* Subject Line */}
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-normal text-slate-800 flex items-center gap-3">
                  {currentTemplate?.subject}
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-sm uppercase tracking-wider font-medium">Inbox</span>
                </h2>
              </div>

              {/* Sender Info Row */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-lg shrink-0">
                    A
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-sm text-slate-800">Acme HRMS</span>
                      <span className="text-xs text-slate-500">&lt;no-reply@acme.com&gt;</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      to <span className="font-medium text-slate-600">me</span> <ChevronDownIcon className="inline w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <span className="text-xs">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (0 minutes ago)</span>
                  <button className="hover:bg-slate-100 p-1.5 rounded-full"><Star size={16} /></button>
                  <button className="hover:bg-slate-100 p-1.5 rounded-full"><CornerUpLeft size={16} /></button>
                  <button className="hover:bg-slate-100 p-1.5 rounded-full"><MoreVertical size={16} /></button>
                </div>
              </div>

              {/* Actual Email Body */}
              <div className="text-sm text-slate-800">
                {currentTemplate?.content}
              </div>

              {/* Action Buttons (Reply/Forward) */}
              <div className="ml-0 md:ml-12 mt-12 flex gap-3">
                <button className="flex items-center gap-2 px-6 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <CornerUpLeft size={16} /> Reply
                </button>
                <button className="flex items-center gap-2 px-6 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <CornerUpRight size={16} /> Forward
                </button>
              </div>

            </motion.div>
          </div>

        </div>

      </div>
    </div>
  );
};

// Helper for the small down arrow in "to me"
const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default AdminEmailTemplates;
