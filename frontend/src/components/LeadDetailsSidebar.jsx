import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MapPin, Calendar, Clock, CheckCircle2, UserPlus, XCircle, Loader2, RefreshCw, Briefcase, Award, Building, Mail, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeadStatus } from '../services/loanServices';
import { updateSalesLeadStatus } from '../services/salesServices';
import toast from 'react-hot-toast';

const LeadDetailsSidebar = ({ isOpen, onClose, lead, type = 'loan' }) => {
  const isSale = type === 'sale';
  const queryClient = useQueryClient();

  const loanStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateLeadStatus(id, status),
    onSuccess: (data, variables) => {
      toast.success('Lead status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['origination', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['origination', 'leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['leadsDashboard'] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  });

  const saleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateSalesLeadStatus(id, status),
    onSuccess: (data, variables) => {
      toast.success('Sales lead status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update sales lead status');
    }
  });

  const handleUpdateStatus = (status) => {
    if (!lead) return;
    if (isSale) {
      saleStatusMutation.mutate({ id: lead.id, status });
    } else {
      loanStatusMutation.mutate({ id: lead.id, status });
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
  const isConverted = lead.status === 'Converted' || lead.status === 'Won';

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
                    <span className="font-medium">{lead.phone}</span>
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
                onClick={() => handleUpdateStatus(isSale ? 'Contacted' : 'Follow Up')}
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
                onClick={() => handleUpdateStatus(isSale ? 'Won' : 'Converted')}
                disabled={isPending || isConverted}
                className={`w-full flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  isSale
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Convert Lead
              </button>

              <button
                onClick={() => handleUpdateStatus(isSale ? 'Lost' : 'Not Interested')}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LeadDetailsSidebar;
