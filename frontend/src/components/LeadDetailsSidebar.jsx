import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Phone, MapPin, Calendar, Clock, CheckCircle2, UserPlus, XCircle, Loader2, Briefcase, Check, TrendingUp } from 'lucide-react';
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- switch to details view when the selected lead changes.
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F0FB] text-[#3B6FB6] border border-[#3B6FB6]/20"><Clock size={11} /> New</span>;
      case 'Contacted':
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF3DC] text-[#B7791F] border border-[#B7791F]/20"><TrendingUp size={11} /> Follow Up</span>;
      case 'Proposal Sent':
      case 'Negotiation':
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF3DC] text-[#B7791F] border border-[#B7791F]/20"><Clock size={11} /> {status}</span>;
      case 'Won':
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20"><CheckCircle2 size={11} /> Converted</span>;
      case 'Lost':
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDE8EA] text-[#D64550] border border-[#D64550]/20"><XCircle size={11} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFEFF1] text-[#4A4A52] border border-[var(--line)]">{status || '—'}</span>;
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
        className="bg-[var(--surface)] text-[var(--text)] shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
      >
        {viewMode === 'convert' ? (
          /* Convert View */
          <>
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">Member Conversion</span>
                </div>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">Convert to Member</h2>
              </div>
              <button 
                type="button"
                onClick={() => setViewMode('details')} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Select the {isSale ? 'product type' : 'loan product'} for <span className="font-semibold text-[var(--text)]">{lead.name}</span> to finalize membership:
              </p>

              <div className="space-y-2.5">
                {currentOptions.map((opt) => {
                  const isSelected = selectedType === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedType(opt.value)}
                      className={`p-3.5 rounded-[16px] border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--brand-deep)] bg-[var(--brand-tint)] shadow-xs'
                          : 'border-[var(--line)] hover:border-[var(--brand)] hover:bg-[var(--surface-alt)] bg-[var(--surface)]'
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-semibold ${isSelected ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">{opt.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[var(--brand-deep)] border-[var(--brand-deep)] text-white'
                            : 'border-[var(--line)] bg-[var(--surface)]'
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
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('details')}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={isPending}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
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
            <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">Prospect Profile</span>
                </div>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">Lead Details</h2>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Profile Info */}
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-[14px] bg-[var(--brand-tint)] border border-[var(--line)] text-[var(--brand-deep)] font-bold text-lg flex items-center justify-center uppercase shrink-0 shadow-2xs">
                  {lead.name ? lead.name.charAt(0) : 'L'}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--text)] leading-snug">{lead.name}</h3>
                  <div>{getStatusBadge(lead.status)}</div>
                </div>
              </div>

              {/* Details List Card */}
              <div className="space-y-3 bg-[var(--surface-alt)] p-4.5 rounded-[20px] border border-[var(--line)] text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Contact</span>
                  <div className="flex items-center gap-2 text-[var(--text)] font-medium pt-0.5">
                    <Phone size={14} className="text-[var(--brand-deep)]" />
                    <span>{maskPhoneNumber(lead.phone)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-2.5 border-t border-[var(--line)]">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {isSale ? 'Product Type' : 'Loan Type'}
                  </span>
                  <div className="flex items-center gap-2 text-[var(--text)] font-medium pt-0.5">
                    <Briefcase size={14} className="text-[var(--brand-deep)]" />
                    <span>{isSale ? (lead.product_type || '—') : (lead.loan_type || '—')}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-2.5 border-t border-[var(--line)]">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Location</span>
                  <div className="flex items-start gap-2 text-[var(--text)] font-medium pt-0.5">
                    <MapPin size={14} className="text-[var(--brand-deep)] mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{lead.address || '—'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-2.5 border-t border-[var(--line)]">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Created Date</span>
                  <div className="flex items-center gap-2 text-[var(--text)] font-medium pt-0.5">
                    <Calendar size={14} className="text-[var(--brand-deep)]" />
                    <span>{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy h:mm a') : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleUpdateStatus('Not Interested')}
                disabled={isPending || isConverted}
                className="px-4 py-2 text-xs font-semibold text-[#D64550] bg-[#FDE8EA] hover:bg-[#fbd5d8] border border-[#D64550]/20 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                <span>Not Interested</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('Follow Up')}
                disabled={isPending || isConverted}
                className="px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                <span>Follow Up</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('Converted')}
                disabled={isPending || isConverted}
                className="px-5 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                <span>Convert to Member</span>
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
