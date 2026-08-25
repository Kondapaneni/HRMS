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
  Check,
  User,
  ShoppingBag
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
            <Clock size={10} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff] shrink-0">
            <RefreshCw size={10} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
      case 'Proposal Sent':
      case 'Negotiation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0">
            <Clock size={10} /> {status}
          </span>
        );
      case 'Converted':
      case 'Won':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
            <CheckCircle2 size={10} /> Converted
          </span>
        );
      case 'Not Interested':
      case 'Lost':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] shrink-0">
            <XCircle size={10} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0">
            {status}
          </span>
        );
    }
  };

  const isConverted = currentStatus === 'Converted';

  return (
    <div className="space-y-4 pb-14">
      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30 space-y-2">
        {/* Workspace Tag */}
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
            Sales Origination Hub
          </span>
        </div>

        {/* Heading + Back Button Row */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
            Lead Details
          </h1>

          <button
            type="button"
            onClick={() => navigate('/employee/sales/origination/leads')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3.5 py-1.5 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Back</span>
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-[#5f6368] truncate">
          Prospect ID &bull; Sales Pipeline Profile
        </p>
      </div>

      {/* 2. Lead Profile Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
        {/* Avatar, Name & Status Pill */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#f1f3f4]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#e8f0fe] border-2 border-[#d2e3fc] flex items-center justify-center text-lg font-bold text-[#1a73e8] shrink-0 shadow-2xs">
              {lead.name ? lead.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#1f1f1f] truncate">
                {lead.name}
              </h2>
              {(currentProductType || lead.product_type) && (
                <p className="text-xs text-[#1a73e8] font-medium truncate mt-0.5">
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
          {/* Phone */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                <Phone size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider">Contact Phone</p>
                <p className="text-xs font-bold text-[#1f1f1f] truncate">{maskPhoneNumber(lead.phone)}</p>
              </div>
            </div>

            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#1a73e8] text-white text-[11px] font-semibold rounded-full shadow-xs active:scale-95 transition-all"
              >
                <Phone size={11} /> Call
              </a>
            )}
          </div>

          {/* Product Type */}
          <div className="p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#fef7e0] text-[#b06000] flex items-center justify-center shrink-0">
              <Briefcase size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider">Product Type</p>
              <p className="text-xs font-semibold text-[#1f1f1f] truncate">
                {currentProductType || lead.product_type || '—'}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider">Location / Address</p>
              <p className="text-xs text-[#1f1f1f] leading-relaxed pt-0.5">
                {lead.address || '—'}
              </p>
            </div>
          </div>

          {/* Created Date */}
          <div className="p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center shrink-0">
              <Calendar size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider">Created On</p>
              <p className="text-xs font-semibold text-[#1f1f1f]">
                {lead.created_at ? format(new Date(lead.created_at), 'MMMM d, yyyy - h:mm a') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Buttons Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">
          Update Pipeline Status
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={statusMutation.isPending || currentStatus === 'Follow Up'}
            onClick={() => handleUpdateStatus('Follow Up')}
            className={`py-3 px-3 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              currentStatus === 'Follow Up'
                ? 'bg-[#f3e8fd] text-[#8430ce] border-[#e9d5ff]'
                : 'bg-white text-[#444746] border-[#dadce0] hover:bg-[#f1f3f4]'
            }`}
          >
            <RefreshCw size={13} className={statusMutation.isPending ? 'animate-spin' : ''} />
            <span>Follow Up</span>
          </button>

          <button
            type="button"
            disabled={statusMutation.isPending || currentStatus === 'Not Interested'}
            onClick={() => handleUpdateStatus('Not Interested')}
            className={`py-3 px-3 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              currentStatus === 'Not Interested'
                ? 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]'
                : 'bg-white text-[#444746] border-[#dadce0] hover:bg-[#f1f3f4]'
            }`}
          >
            <XCircle size={13} />
            <span>Not Interested</span>
          </button>
        </div>

        {/* Primary Convert Button */}
        <button
          type="button"
          disabled={statusMutation.isPending || isConverted}
          onClick={() => handleUpdateStatus('Converted')}
          className={`w-full py-3 px-4 rounded-full text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isConverted
              ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] cursor-default'
              : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white active:scale-95'
          }`}
        >
          {isConverted ? (
            <>
              <CheckCircle2 size={15} />
              <span>Converted to Member</span>
            </>
          ) : (
            <>
              <UserPlus size={15} />
              <span>Convert to Member</span>
            </>
          )}
        </button>
      </div>

      {/* Convert to Member Modal */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConvertModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#e0e3e7] relative z-10 space-y-4"
            >
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
                <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                  Sales Origination
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#1f1f1f]">Convert to Member</h3>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  Select product type to finalize conversion for <span className="font-semibold text-[#1f1f1f]">{lead.name}</span>.
                </p>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {saleProductTypeOptions.map((opt) => (
                  <label
                    key={opt.value}
                    onClick={() => setSelectedProductType(opt.value)}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                      selectedProductType === opt.value
                        ? 'bg-[#e8f0fe] border-[#1a73e8] text-[#1a73e8]'
                        : 'bg-[#f8fafd] border-[#dadce0] text-[#1f1f1f] hover:bg-[#f1f3f4]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="product_type"
                      checked={selectedProductType === opt.value}
                      onChange={() => setSelectedProductType(opt.value)}
                      className="mt-0.5 text-[#1a73e8]"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold">{opt.label}</p>
                      <p className="text-[10px] text-[#5f6368] mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-[#444746] hover:bg-[#f1f3f4] rounded-full border border-[#dadce0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={handleConfirmConvert}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-full shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {statusMutation.isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <span>Confirm</span>
                  )}
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
