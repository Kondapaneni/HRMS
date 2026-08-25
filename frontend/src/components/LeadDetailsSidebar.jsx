import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  UserPlus, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Briefcase, 
  Check,
  TrendingUp
} from 'lucide-react';
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

  if (!isOpen || !lead) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]"><Clock size={11} /> New</span>;
      case 'Contacted':
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]"><TrendingUp size={11} /> Follow Up</span>;
      case 'Proposal Sent':
      case 'Negotiation':
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]"><Clock size={11} /> {status}</span>;
      case 'Won':
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"><CheckCircle2 size={11} /> Converted</span>;
      case 'Lost':
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]"><XCircle size={11} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status || '—'}</span>;
    }
  };

  const isPending = isSale ? saleStatusMutation.isPending : loanStatusMutation.isPending;
  const isConverted = lead.status === 'Converted';
  const currentOptions = isSale ? saleProductTypeOptions : loanTypeOptions;

  return createPortal(
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
      >
        {/* Top 4-Color Google Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

        {viewMode === 'convert' ? (
          /* Convert View */
          <>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#137333] uppercase tracking-wider ml-1">Member Conversion</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">Convert to Member</h2>
              </div>
              <button 
                onClick={() => setViewMode('details')} 
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-[#5f6368] leading-relaxed">
                Select the {isSale ? 'product type' : 'loan product'} for <span className="font-semibold text-[#1f1f1f]">{lead.name}</span> to finalize membership:
              </p>

              <div className="space-y-2.5">
                {currentOptions.map((opt) => {
                  const isSelected = selectedType === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedType(opt.value)}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#1a73e8] bg-[#e8f0fe]/60 shadow-2xs'
                          : 'border-[#e0e3e7] hover:border-[#dadce0] hover:bg-[#f8fafd] bg-white'
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-semibold ${isSelected ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-[#5f6368] mt-0.5">{opt.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#1a73e8] border-[#1a73e8] text-white'
                            : 'border-[#dadce0] bg-white'
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
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('details')}
                className="px-4 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={isPending}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                <span>Confirm &amp; Convert</span>
              </button>
            </div>
          </>
        ) : (
          /* Lead Details View */
          <>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Prospect Profile</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">Lead Details</h2>
              </div>
              <button 
                onClick={onClose} 
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Profile Info */}
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] text-[#1a73e8] font-bold text-lg flex items-center justify-center uppercase shrink-0 shadow-2xs">
                  {lead.name ? lead.name.charAt(0) : 'L'}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#1f1f1f] leading-snug">{lead.name}</h3>
                  <div>{getStatusBadge(lead.status)}</div>
                </div>
              </div>

              {/* Details List Card */}
              <div className="space-y-3 bg-[#f8fafd] p-4.5 rounded-2xl border border-[#e0e3e7] text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Contact</span>
                  <div className="flex items-center gap-2 text-[#1f1f1f] font-medium pt-0.5">
                    <Phone size={14} className="text-[#1a73e8]" />
                    <span>{maskPhoneNumber(lead.phone)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-2.5 border-t border-[#e0e3e7]/70">
                  <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">
                    {isSale ? 'Product Type' : 'Loan Type'}
                  </span>
                  <div className="flex items-center gap-2 text-[#1f1f1f] font-medium pt-0.5">
                    <Briefcase size={14} className="text-[#1a73e8]" />
                    <span>{isSale ? (lead.product_type || '—') : (lead.loan_type || '—')}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-2.5 border-t border-[#e0e3e7]/70">
                  <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Location</span>
                  <div className="flex items-start gap-2 text-[#1f1f1f] font-medium pt-0.5">
                    <MapPin size={14} className="text-[#1a73e8] mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{lead.address || '—'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-2.5 border-t border-[#e0e3e7]/70">
                  <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Created Date</span>
                  <div className="flex items-center gap-2 text-[#1f1f1f] font-medium pt-0.5">
                    <Calendar size={14} className="text-[#1a73e8]" />
                    <span>{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy h:mm a') : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] grid grid-cols-1 gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleUpdateStatus('Follow Up')}
                disabled={isPending || isConverted}
                className="w-full flex items-center justify-center gap-1.5 bg-[#f3e8fd] hover:bg-[#ebd4fc] text-[#8430ce] border border-[#e9d5ff] px-4 py-2.5 rounded-full text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
              >
                {isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Clock size={15} />
                )}
                <span>Follow Up</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('Converted')}
                disabled={isPending || isConverted}
                className="w-full flex items-center justify-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2.5 rounded-full text-xs font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
              >
                {isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <UserPlus size={15} />
                )}
                <span>Convert to Member</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('Not Interested')}
                disabled={isPending || isConverted}
                className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] px-4 py-2.5 rounded-full text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
              >
                {isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <XCircle size={15} />
                )}
                <span>Not Interested</span>
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default LeadDetailsSidebar;
