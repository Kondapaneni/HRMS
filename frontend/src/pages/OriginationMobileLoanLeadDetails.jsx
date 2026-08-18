import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle2, Phone, UserPlus, XCircle, Loader2, RefreshCw, Briefcase, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeadStatus } from '../services/loanServices';
import toast from 'react-hot-toast';

const OriginationMobileLoanLeadDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const lead = location.state?.lead;

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLoanType, setSelectedLoanType] = useState(lead?.loan_type || 'Personal Loan');
  const [currentStatus, setCurrentStatus] = useState(lead?.status || 'New');

  const statusMutation = useMutation({
    mutationFn: ({ id, status, loan_type }) => updateLeadStatus(id, status, loan_type),
    onSuccess: (data, variables) => {
      toast.success('Lead status updated successfully!');
      setCurrentStatus(variables.status);
      queryClient.invalidateQueries(['origination', 'leads', 'list']);
      setShowConvertModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  });

  // If no lead in state, bounce back
  if (!lead) {
    navigate('/employee/loans/origination/leads', { replace: true });
    return null;
  }

  const handleUpdateStatus = (status) => {
    if (!lead) return;
    if (status === 'Converted') {
      setSelectedLoanType(lead.loan_type || 'Personal Loan');
      setShowConvertModal(true);
      return;
    }
    statusMutation.mutate({ id: lead.id, status });
  };

  const handleConfirmConvert = () => {
    if (!lead) return;
    statusMutation.mutate({ id: lead.id, status: 'Converted', loan_type: selectedLoanType });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap shrink-0"><Clock size={14} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 whitespace-nowrap shrink-0"><RefreshCw size={14} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 whitespace-nowrap shrink-0"><Clock size={14} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap shrink-0"><CheckCircle2 size={14} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 whitespace-nowrap shrink-0"><XCircle size={14} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 whitespace-nowrap shrink-0">{status}</span>;
    }
  };

  const isConverted = currentStatus === 'Converted';

  const loanTypeOptions = [
    { label: 'Personal Loan', value: 'Personal Loan', desc: 'Unsecured individual personal loan' },
    { label: 'Business Loan', value: 'Business Loan', desc: 'Commercial enterprise loan' },
    { label: 'Home Loan', value: 'Home Loan', desc: 'Residential property mortgage' },
    { label: 'Vehicle Loan', value: 'Vehicle Loan', desc: 'Automobile & vehicle loan' },
    { label: 'Education Loan', value: 'Education Loan', desc: 'Education funding' }
  ];

  return (
    <div className="w-full pb-8">
      {/* Animated Hero Header - Matched from Member Details */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between px-2">
          <button 
            type="button" 
            onClick={() => navigate('/employee/loans/origination/leads')} 
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">Origination Loan Module</p>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">Lead Details</h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </section>

      {/* Content */}
      <div className="space-y-6 relative z-20 -mt-12 mx-4">
        <div className="bg-white p-6 rounded-[28px] shadow-xl border border-slate-100 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner">
                {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{lead.name}</h3>
                {lead.loan_type && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{lead.loan_type}</p>
                )}
              </div>
            </div>
            <div>
              {getStatusBadge(currentStatus)}
            </div>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Phone</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-blue-600" />
              </div>
              <span className="font-medium text-lg">{lead.phone}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loan Type</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Briefcase size={18} className="text-amber-600" />
              </div>
              <span className="font-medium text-lg">{lead.loan_type || '—'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location / Address</h3>
            <div className="flex items-start gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-1">
                <MapPin size={18} className="text-indigo-600" />
              </div>
              <span className="font-medium leading-relaxed pt-2">{lead.address}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Created On</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <span className="font-medium">{format(new Date(lead.created_at), 'MMMM d, yyyy - h:mm a')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Action Buttons in normal document flow */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col gap-3">
          <button 
            onClick={() => handleUpdateStatus('Follow Up')}
            disabled={statusMutation.isPending || isConverted}
            className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-blue-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {statusMutation.isPending && statusMutation.variables?.status === 'Follow Up' ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Followup
          </button>
          
          <button 
            onClick={() => handleUpdateStatus('Converted')}
            disabled={statusMutation.isPending || isConverted}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {statusMutation.isPending && statusMutation.variables?.status === 'Converted' ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            Convert to Member
          </button>

          <button 
            onClick={() => handleUpdateStatus('Not Interested')}
            disabled={statusMutation.isPending || isConverted}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {statusMutation.isPending && statusMutation.variables?.status === 'Not Interested' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
            Not Interested
          </button>
        </div>
      </div>

      {/* Convert to Member Mobile Bottom Sheet / Modal */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowConvertModal(false)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white rounded-t-[32px] sm:rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                  <UserPlus size={22} />
                  <span>Convert to Member</span>
                </div>
                <button 
                  onClick={() => setShowConvertModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Select the loan product for <span className="font-semibold text-slate-900">{lead.name}</span> to convert them into an active member.
              </p>

              <div className="space-y-2">
                {loanTypeOptions.map((opt) => {
                  const isSelected = selectedLoanType === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedLoanType(opt.value)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50/60 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-slate-500">{opt.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  disabled={statusMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {statusMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Confirm &amp; Convert
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OriginationMobileLoanLeadDetails;
