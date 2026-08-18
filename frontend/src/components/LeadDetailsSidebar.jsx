import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Calendar, Clock, CheckCircle2, UserPlus, XCircle, Loader2, RefreshCw, Briefcase, Check, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeadStatus } from '../services/loanServices';
import toast from 'react-hot-toast';

const LeadDetailsSidebar = ({ isOpen, onClose, lead }) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('details'); // 'details' | 'convert'
  const [selectedLoanType, setSelectedLoanType] = useState('Personal Loan');

  useEffect(() => {
    if (isOpen) {
      setViewMode('details');
      setSelectedLoanType(lead?.loan_type || 'Personal Loan');
    }
  }, [isOpen, lead]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status, loan_type }) => updateLeadStatus(id, status, loan_type),
    onSuccess: (data, variables) => {
      toast.success(variables.status === 'Converted' ? 'Lead converted to Member successfully!' : 'Lead status updated!');
      queryClient.invalidateQueries({ queryKey: ['origination', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['origination', 'leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['leadsDashboard'] });
      setViewMode('details');
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  });

  const handleUpdateStatus = (status) => {
    if (!lead) return;
    if (status === 'Converted') {
      setSelectedLoanType(lead.loan_type || 'Personal Loan');
      setViewMode('convert');
      return;
    }
    statusMutation.mutate({ id: lead.id, status });
  };

  const handleConfirmConvert = () => {
    if (!lead) return;
    statusMutation.mutate({ id: lead.id, status: 'Converted', loan_type: selectedLoanType });
  };

  if (!lead) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Clock size={12} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"><RefreshCw size={12} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock size={12} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700"><XCircle size={12} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const loanTypeOptions = [
    { label: 'Personal Loan', value: 'Personal Loan', desc: 'Unsecured individual loan' },
    { label: 'Business Loan', value: 'Business Loan', desc: 'Commercial & enterprise loan' },
    { label: 'Home Loan', value: 'Home Loan', desc: 'Residential property mortgage' },
    { label: 'Vehicle Loan', value: 'Vehicle Loan', desc: 'Automobile & transport loan' },
    { label: 'Education Loan', value: 'Education Loan', desc: 'Higher education financing' }
  ];

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
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            {viewMode === 'convert' ? (
              /* Convert to Member Sidebar View */
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-lg">
                    <UserPlus size={22} className="shrink-0" />
                    <span>Convert to Member</span>
                  </div>
                  <button
                    onClick={() => setViewMode('details')}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer"
                    title="Back to details"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Select the loan product for <span className="font-semibold text-slate-900">{lead.name}</span> to convert them into an active member.
                  </p>

                  <div className="space-y-3">
                    {loanTypeOptions.map((opt) => {
                      const isSelected = selectedLoanType === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setSelectedLoanType(opt.value)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-semibold ${isSelected ? 'text-emerald-900 font-bold' : 'text-slate-800'}`}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('details')}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmConvert}
                    disabled={statusMutation.isPending}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {statusMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    Confirm &amp; Convert
                  </button>
                </div>
              </>
            ) : (
              /* Lead Details View */
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Lead Details</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage lead status and actions</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Profile Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold uppercase shrink-0">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{lead.name}</h3>
                      <div className="mt-2">{getStatusBadge(lead.status)}</div>
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</span>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone size={16} className="text-slate-400" />
                        <span className="font-medium">{lead.phone}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loan Type</span>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Briefcase size={16} className="text-slate-400" />
                        <span className="font-medium">{lead.loan_type || '—'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</span>
                      <div className="flex items-start gap-2 text-slate-700">
                        <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="font-medium">{lead.address}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Created On</span>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="font-medium">{format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleUpdateStatus('Follow Up')}
                    disabled={statusMutation.isPending || lead.status === 'Converted'}
                    className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-blue-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {statusMutation.isPending && statusMutation.variables?.status === 'Follow Up' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Clock size={18} />
                    )}
                    Followup
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Converted')}
                    disabled={statusMutation.isPending || lead.status === 'Converted'}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {statusMutation.isPending && statusMutation.variables?.status === 'Converted' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <UserPlus size={18} />
                    )}
                    Convert to Member
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Not Interested')}
                    disabled={statusMutation.isPending || lead.status === 'Converted'}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {statusMutation.isPending && statusMutation.variables?.status === 'Not Interested' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <XCircle size={18} />
                    )}
                    Not Interested
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LeadDetailsSidebar;
