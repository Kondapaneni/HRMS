import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MapPin, Calendar, Clock, CheckCircle2, UserPlus, XCircle, Loader2, RefreshCw, Briefcase, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeadStatus } from '../services/loanServices';
import { updateSalesLeadStatus } from '../services/salesServices';
import { maskPhoneNumber } from '../utils/phoneUtils';
import toast from 'react-hot-toast';

const loanTypeOptions = [
  { label: 'Personal Loan', value: 'Personal Loan', desc: 'Unsecured individual loan' },
  { label: 'Business Loan', value: 'Business Loan', desc: 'Commercial & enterprise loan' },
  { label: 'Home Loan', value: 'Home Loan', desc: 'Residential property mortgage' },
  { label: 'Vehicle Loan', value: 'Vehicle Loan', desc: 'Automobile & transport loan' },
  { label: 'Education Loan', value: 'Education Loan', desc: 'Higher education financing' }
];

const saleProductTypeOptions = [
  { label: 'Current Account / Corporate Banking', value: 'Current Account / Corporate Banking', desc: 'Commercial operational accounts & business liquidity' },
  { label: 'Merchant POS & Payment Solutions', value: 'Merchant POS & Payment Solutions', desc: 'Point of sale terminals, QR, & digital collections' },
  { label: 'Fixed Deposit & Term Investment', value: 'Fixed Deposit & Term Investment', desc: 'High-yield corporate deposits & term investments' },
  { label: 'Insurance & Group Coverage Plans', value: 'Insurance & Group Coverage Plans', desc: 'Group health, life, asset & liability protection' },
  { label: 'Trade Finance & Working Capital', value: 'Trade Finance & Working Capital', desc: 'Working capital limits, letter of credit & trade credit' }
];

const LeadDetailsSidebar = ({ isOpen, onClose, lead, type = 'loan' }) => {
  const isSale = type === 'sale';
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState('details'); // 'details' | 'convert'
  const [selectedType, setSelectedType] = useState(
    isSale ? 'Current Account / Corporate Banking' : 'Personal Loan'
  );

  useEffect(() => {
    if (isOpen) {
      setViewMode('details');
      if (isSale) {
        setSelectedType(lead?.product_type || 'Current Account / Corporate Banking');
      } else {
        setSelectedType(lead?.loan_type || 'Personal Loan');
      }
    }
  }, [isOpen, lead, isSale]);

  const loanStatusMutation = useMutation({
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

  const saleStatusMutation = useMutation({
    mutationFn: ({ id, status, product_type }) => updateSalesLeadStatus(id, status, product_type),
    onSuccess: (data, variables) => {
      toast.success(variables.status === 'Converted' ? 'Lead converted successfully!' : 'Sales lead status updated!');
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
      setViewMode('details');
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update sales lead status');
    }
  });

  const handleUpdateStatus = (status) => {
    if (!lead) return;
    if (status === 'Converted') {
      setViewMode('convert');
      return;
    }
    if (isSale) {
      saleStatusMutation.mutate({ id: lead.id, status });
    } else {
      loanStatusMutation.mutate({ id: lead.id, status });
    }
  };

  const handleConfirmConvert = () => {
    if (!lead) return;
    if (isSale) {
      saleStatusMutation.mutate({ id: lead.id, status: 'Converted', product_type: selectedType });
    } else {
      loanStatusMutation.mutate({ id: lead.id, status: 'Converted', loan_type: selectedType });
    }
  };

  if (!lead) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Clock size={12} /> New</span>;
      case 'Contacted':
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"><RefreshCw size={12} /> Follow Up</span>;
      case 'Proposal Sent':
      case 'Negotiation':
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock size={12} /> {status}</span>;
      case 'Won':
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Converted</span>;
      case 'Lost':
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700"><XCircle size={12} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const isPending = isSale ? saleStatusMutation.isPending : loanStatusMutation.isPending;
  const isConverted = lead.status === 'Converted';
  const currentOptions = isSale ? saleProductTypeOptions : loanTypeOptions;

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

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            {viewMode === 'convert' ? (
              /* Convert View (Select Loan Type or Product Type) */
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
                    Select the {isSale ? 'product type' : 'loan product'} for <span className="font-semibold text-slate-900">{lead.name}</span> to convert them into an active member.
                  </p>

                  <div className="space-y-3">
                    {currentOptions.map((opt) => {
                      const isSelected = selectedType === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setSelectedType(opt.value)}
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
                    disabled={isPending}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {isPending ? (
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
                    <p className="text-xs text-slate-500 mt-0.5">Manage lead status and actions</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Profile Info */}
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold uppercase shrink-0 shadow-inner ${
                      isSale ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {lead.name ? lead.name.charAt(0) : 'L'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{lead.name}</h3>
                      <div className="mt-2">{getStatusBadge(lead.status)}</div>
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</span>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone size={16} className="text-slate-400" />
                        <span className="font-medium">{maskPhoneNumber(lead.phone)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {isSale ? 'Product Type' : 'Loan Type'}
                      </span>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Briefcase size={16} className="text-slate-400" />
                        <span className="font-medium">{isSale ? (lead.product_type || '—') : (lead.loan_type || '—')}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</span>
                      <div className="flex items-start gap-2 text-slate-700">
                        <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="font-medium">{lead.address || '—'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Created On</span>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="font-medium">{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy h:mm a') : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleUpdateStatus('Follow Up')}
                    disabled={isPending || isConverted}
                    className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-blue-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Clock size={18} />
                    )}
                    Followup
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Converted')}
                    disabled={isPending || isConverted}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <UserPlus size={18} />
                    )}
                    Convert to Member
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Not Interested')}
                    disabled={isPending || isConverted}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? (
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
