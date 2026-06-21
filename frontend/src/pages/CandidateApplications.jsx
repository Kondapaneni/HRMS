import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Calendar, FileText, ChevronRight, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const CandidateApplications = () => {
  // Mock data for applications
  const applications = [
    {
      id: 1,
      jobTitle: 'Senior Frontend Engineer',
      department: 'Engineering',
      appliedDate: '2023-10-15',
      status: 'interview', // 'applied', 'review', 'interview', 'offer', 'rejected'
      nextStep: 'Technical Interview on Oct 25th',
    },
    {
      id: 2,
      jobTitle: 'Product Manager',
      department: 'Product',
      appliedDate: '2023-10-10',
      status: 'review',
      nextStep: 'Awaiting recruiter review',
    },
    {
      id: 3,
      jobTitle: 'UX Designer',
      department: 'Design',
      appliedDate: '2023-09-01',
      status: 'rejected',
      nextStep: 'Application closed',
    }
  ];

  const statusConfig = {
    applied: { label: 'Applied', icon: <FileText size={16} />, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', step: 1 },
    review: { label: 'Under Review', icon: <Clock size={16} />, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200', step: 2 },
    interview: { label: 'Interviewing', icon: <Calendar size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200', step: 3 },
    offer: { label: 'Offer Extended', icon: <CheckCircle2 size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', step: 4 },
    rejected: { label: 'Not Selected', icon: <XCircle size={16} />, color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200', step: -1 },
  };

  const timelineSteps = [
    { key: 'applied', label: 'Applied' },
    { key: 'review', label: 'Review' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Applications</h1>
          <p className="text-sm text-slate-500 mt-1">Track the status of your recent job applications.</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Link to="/candidate/jobs" className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
            Browse More Jobs <ChevronRight size={16} />
          </Link>
        </motion.div>
      </div>

      <div className="space-y-6">
        {applications.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No applications yet</h3>
            <p className="text-slate-500 mb-6">You haven't applied to any open positions at Acme.</p>
            <Link to="/candidate/jobs" className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-blue-600/20">
              View Open Jobs
            </Link>
          </motion.div>
        ) : (
          applications.map((app, index) => {
            const config = statusConfig[app.status];
            const currentStep = config.step;

            return (
              <motion.div 
                key={app.id}
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 + (index * 0.1) }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group"
              >
                {/* Header Section */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-1">{app.jobTitle}</h2>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span>{app.department}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>Applied on {new Date(app.appliedDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    <div className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.color} ${config.border} font-semibold text-sm`}>
                      {config.icon}
                      {config.label}
                    </div>
                  </div>
                </div>

                {/* Status Timeline Section */}
                <div className="p-6 bg-slate-50/50">
                  {app.status === 'rejected' ? (
                    <div className="flex items-center gap-3 text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100">
                      <XCircle className="shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Application Closed</p>
                        <p className="text-sm text-rose-700/80 mt-0.5">Unfortunately, we will not be moving forward with your application at this time. Thank you for your interest in Acme.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Timeline UI */}
                      <div className="relative flex justify-between items-start mb-8 w-full">
                        {/* Connecting Line background */}
                        <div className="absolute top-4 left-[12.5%] right-[12.5%] h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                        
                        {/* Active Line foreground */}
                        <div 
                          className="absolute top-4 left-[12.5%] h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-1000 ease-out"
                          style={{ width: `calc(${(currentStep - 1) / (timelineSteps.length - 1) * 75}%)` }}
                        ></div>

                        {timelineSteps.map((step, idx) => {
                          const stepNum = idx + 1;
                          const isCompleted = stepNum <= currentStep;
                          const isCurrent = stepNum === currentStep;

                          return (
                            <div key={step.key} className="relative z-10 flex flex-col items-center flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                                isCompleted 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' 
                                  : 'bg-white border-slate-300 text-slate-300'
                              } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                                {isCompleted ? <CheckCircle2 size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{stepNum}</span>}
                              </div>
                              <span className={`mt-2 text-xs font-bold uppercase tracking-wider text-center ${isCurrent ? 'text-blue-600' : (isCompleted ? 'text-slate-700' : 'text-slate-400')}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Next Step Info */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3 shadow-sm">
                        <div className="mt-0.5 text-indigo-500"><AlertCircle size={18} /></div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Next Steps</p>
                          <p className="text-sm font-medium text-slate-800">{app.nextStep}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CandidateApplications;
