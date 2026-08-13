import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Briefcase, CheckCircle2, ArrowRight, Lock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications } from '../services/loanServices';

const MemberDetailsSidebar = ({ isOpen, onClose, member }) => {
  const { data: appsResponse, isLoading: isLoadingApps } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
  });

  const submittedLeadIds = React.useMemo(() => {
    if (!appsResponse?.applications) return new Set();
    return new Set(
      appsResponse.applications
        .filter(app => app.status !== 'Draft' && app.lead_id)
        .map(app => String(app.lead_id))
    );
  }, [appsResponse]);

  if (!member) return null;

  const defaultLeadId = String(member.lead_id || member.id || '');
  const isMemberDefaultSubmitted = submittedLeadIds.has(defaultLeadId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 cursor-pointer"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden border-l border-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Member Details</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Member Profile Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold shrink-0">
                  {member.name ? member.name.charAt(0) : 'M'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{member.name}</h3>
                  <div className="flex items-center gap-2 text-slate-500 mt-1">
                    <Phone size={14} />
                    <span className="text-sm font-medium">{member.phone}</span>
                  </div>
                </div>
              </div>

              {/* Loan History */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={16} className="text-slate-500" />
                  Loan History
                </h4>
                
                <div className="grid gap-3">
                  {member.loans && member.loans.map((loan) => {
                    const currentLeadId = String(loan.id || loan.lead_id || member.lead_id || '');
                    const isSubmitted = submittedLeadIds.has(currentLeadId);

                    return (
                      <div key={loan.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4 transition-all hover:shadow-md hover:border-slate-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-semibold text-slate-800">
                            {loan.loan_type}
                          </div>
                          {isLoadingApps && !appsResponse ? (
                            <div className="h-5 w-16 bg-slate-200 animate-pulse rounded-full" />
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              <CheckCircle2 size={12} /> {isSubmitted ? 'Submitted' : (loan.status || 'Draft')}
                            </span>
                          )}
                        </div>
                        
                        {isLoadingApps && !appsResponse ? (
                          <div className="h-8 w-36 bg-slate-200 animate-pulse rounded-md" />
                        ) : isSubmitted ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none">
                            <Lock size={12} className="text-slate-400" /> Application Submitted
                          </div>
                        ) : (
                          <Link 
                            to="/employee/loans/form"
                            state={{ name: member.name, phone: member.phone, lead_id: currentLeadId, loan_type: loan.loan_type }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all"
                          >
                            Fill Loan Form <ArrowRight size={14} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                  
                  {(!member.loans || member.loans.length === 0) && (
                    <div className="text-center p-4 text-slate-500 text-sm bg-slate-50 rounded-lg space-y-3">
                      <p>No loan history available.</p>
                      {isLoadingApps && !appsResponse ? (
                        <div className="h-8 w-36 bg-slate-200 animate-pulse rounded-md mx-auto" />
                      ) : isMemberDefaultSubmitted ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none">
                          <Lock size={12} className="text-slate-400" /> Application Submitted
                        </div>
                      ) : (
                        <Link 
                          to="/employee/loans/form"
                          state={{ name: member.name, phone: member.phone, lead_id: member.lead_id }}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Fill Loan Form <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MemberDetailsSidebar;
