import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Phone, 
  UserPlus, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Briefcase, 
  X, 
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSalesLeadStatus } from '../services/salesServices';
import { maskPhoneNumber } from '../utils/phoneUtils';
import toast from 'react-hot-toast';

const saleProductTypeOptions = [
  { label: 'Current Account / Corporate Banking', value: 'Current Account / Corporate Banking', desc: 'Commercial operational accounts & business liquidity' },
  { label: 'Merchant POS & Payment Solutions', value: 'Merchant POS & Payment Solutions', desc: 'Point of sale terminals, QR, & digital collections' },
  { label: 'Fixed Deposit & Term Investment', value: 'Fixed Deposit & Term Investment', desc: 'High-yield corporate deposits & term investments' },
  { label: 'Insurance & Group Coverage Plans', value: 'Insurance & Group Coverage Plans', desc: 'Group health, life, asset & liability protection' },
  { label: 'Trade Finance & Working Capital', value: 'Trade Finance & Working Capital', desc: 'Working capital limits, letter of credit & trade credit' }
];

const OriginationMobileSaleLeadDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [lead] = useState(() => {
    if (location.state?.lead) {
      try {
        sessionStorage.setItem('current_sale_lead', JSON.stringify(location.state.lead));
      } catch (e) {}
      return location.state.lead;
    }
    try {
      const saved = sessionStorage.getItem('current_sale_lead');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState(lead?.product_type || 'Current Account / Corporate Banking');
  const [currentStatus, setCurrentStatus] = useState(lead?.status || 'New');
  const [currentProductType, setCurrentProductType] = useState(lead?.product_type || '');

  const statusMutation = useMutation({
    mutationFn: ({ id, status, product_type }) => updateSalesLeadStatus(id, status, product_type),
    onSuccess: (data, variables) => {
      toast.success(variables.status === 'Converted' ? 'Lead converted to Member successfully!' : 'Lead status updated successfully!');
      setCurrentStatus(variables.status);
      if (variables.product_type) {
        setCurrentProductType(variables.product_type);
        if (lead) lead.product_type = variables.product_type;
      }
      if (lead) lead.status = variables.status;
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
      setShowConvertModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  });

  // If no lead in state, bounce back
  if (!lead) {
    navigate('/employee/sales/origination/leads', { replace: true });
    return null;
  }

  const handleUpdateStatus = (status) => {
    if (!lead) return;
    if (status === 'Converted') {
      setSelectedProductType(currentProductType || lead.product_type || 'Current Account / Corporate Banking');
      setShowConvertModal(true);
      return;
    }
    statusMutation.mutate({ id: lead.id, status });
  };

  const handleConfirmConvert = () => {
    if (!lead) return;
    statusMutation.mutate({ id: lead.id, status: 'Converted', product_type: selectedProductType });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={13} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
            <RefreshCw size={13} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
      case 'Proposal Sent':
      case 'Negotiation':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={13} /> {status}
          </span>
        );
      case 'Converted':
      case 'Won':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
            <CheckCircle2 size={13} /> Converted
          </span>
        );
      case 'Not Interested':
      case 'Lost':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] shrink-0">
            <XCircle size={13} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] shrink-0">
            {status}
          </span>
        );
    }
  };

  const isConverted = currentStatus === 'Converted';

  return (
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">
      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Sales Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Lead <span className="text-[var(--accent-pink-deep)]">Details</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate('/employee/sales/origination/leads')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-full-[12px] text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            Prospect Verification Profile
          </p>
        </div>
      </section>

      {/* 2. Lead Profile Card */}
      <div className="relative z-20 space-y-4">
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs space-y-4">
          {/* Avatar, Name & Status Pill */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--accent-pink-tint)] flex items-center justify-center text-base font-semibold text-[var(--accent-pink-deep)] shrink-0">
                {lead.name ? lead.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text)] truncate">
                  {lead.name}
                </h2>
                {(currentProductType || lead.product_type) && (
                  <p className="text-xs text-[var(--accent-pink-deep)] font-medium truncate mt-0.5">
                    {currentProductType || lead.product_type}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {getStatusBadge(currentStatus)}
            </div>
          </div>

          {/* Contact Info Rows */}
          <div className="space-y-3 pt-1">
            {/* Phone with Call Action */}
            <div>
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 pl-1">
                Contact Number
              </span>
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center justify-between pl-3.5 pr-1.5 py-1.5 rounded-[12px] bg-[var(--surface-alt)] hover:bg-[var(--line)] border border-[var(--line)] transition-all cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                      <Phone size={14} />
                    </div>
                    <span className="font-semibold text-sm text-[var(--text)]">
                      {maskPhoneNumber(lead.phone)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--surface)] px-3.5 py-1.5 rounded-[8px] border border-[var(--line)] shadow-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </span>
                </a>
              ) : (
                <p className="text-xs text-[var(--muted)] pl-1">—</p>
              )}
            </div>

            {/* Product Requested */}
            <div className="pt-2 border-t border-[var(--line)]">
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 pl-1">
                Target Sales Product
              </span>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)] text-xs text-[var(--text)]">
                <Briefcase size={15} className="text-[var(--brand-deep)] shrink-0" />
                <span className="font-medium">{currentProductType || lead.product_type || '—'}</span>
              </div>
            </div>

            {/* Address */}
            {lead.address && (
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 pl-1">
                  Residential / Business Address
                </span>
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)] text-xs text-[var(--text)]">
                  <MapPin size={15} className="text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <span className="leading-relaxed truncate">{lead.address}</span>
                </div>
              </div>
            )}

            {/* Created Date */}
            {lead.created_at && (
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 pl-1">
                  Lead Registered On
                </span>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)] text-xs text-[var(--text)]">
                  <Calendar size={15} className="text-[var(--brand-deep)] shrink-0" />
                  <span>{format(new Date(lead.created_at), 'MMMM d, yyyy - h:mm a')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Action Controls Card */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">Pipeline Actions</h3>
              <p className="text-[10px] text-[var(--muted)]">Update lead status or convert to member</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button 
              type="button"
              onClick={() => handleUpdateStatus('Follow Up')}
              disabled={statusMutation.isPending || isConverted}
              className="w-full flex items-center justify-center gap-2 bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--badge-warning-text)] border border-[var(--line)] px-4 py-2.5 rounded-full-[12px] text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {statusMutation.isPending && statusMutation.variables?.status === 'Follow Up' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              <span>Mark for Follow Up</span>
            </button>
            
            <button 
              type="button"
              onClick={() => handleUpdateStatus('Converted')}
              disabled={statusMutation.isPending || isConverted}
              className="w-full flex items-center justify-center gap-2 bg-[var(--badge-success-text)] hover:opacity-90 text-white px-4 py-2.5 rounded-full-[12px] text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {statusMutation.isPending && statusMutation.variables?.status === 'Converted' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              <span>{isConverted ? 'Converted to Member' : 'Convert to Member'}</span>
            </button>

            <button 
              type="button"
              onClick={() => handleUpdateStatus('Not Interested')}
              disabled={statusMutation.isPending || isConverted}
              className="w-full flex items-center justify-center gap-2 bg-[var(--surface)] hover:bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--line)] px-4 py-2.5 rounded-full-[12px] text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {statusMutation.isPending && statusMutation.variables?.status === 'Not Interested' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
              <span>Mark as Not Interested</span>
            </button>
          </div>
        </div>
      </div>

      {/* Convert to Member Bottom Sheet Modal */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setShowConvertModal(false)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-[var(--surface)] rounded-t-[24px] max-w-md w-full p-5 shadow-2xl z-10 border border-[var(--line)] space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div className="flex items-center gap-2 text-[var(--badge-success-text)] font-semibold text-sm">
                  <UserPlus size={18} />
                  <span>Convert Lead to Member</span>
                </div>
                <button 
                  onClick={() => setShowConvertModal(false)}
                  className="p-1 rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Select the product for <span className="font-semibold text-[var(--text)]">{lead.name}</span> to register them into active origination.
              </p>

              <div className="space-y-2">
                {saleProductTypeOptions.map((opt) => {
                  const isSelected = selectedProductType === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedProductType(opt.value)}
                      className={`p-3 rounded-[14px] border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-[var(--brand)] bg-[var(--brand-tint)] shadow-xs' 
                          : 'border-[var(--line)] hover:border-[var(--line)] bg-[var(--surface)]'
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-semibold ${isSelected ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">{opt.desc}</p>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-[var(--brand-deep)] border-[var(--brand-deep)] text-white' : 'border-[var(--line)] bg-[var(--surface)]'
                      }`}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 rounded-full-[12px] text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  disabled={statusMutation.isPending}
                  className="px-5 py-2 rounded-full-[12px] text-xs font-semibold bg-[var(--badge-success-text)] text-white hover:opacity-90 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {statusMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  <span>Confirm &amp; Convert</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OriginationMobileSaleLeadDetails;