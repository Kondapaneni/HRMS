import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, MapPin, Calendar, Clock, CheckCircle2, Phone, Mail, UserPlus, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeadStatus } from '../services/loanServices';
import toast from 'react-hot-toast';

const OriginationMobileLeadDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const lead = location.state?.lead;

  // If no lead in state, bounce back
  if (!lead) {
    navigate('/employee/loans/origination/leads', { replace: true });
    return null;
  }

  const [currentStatus, setCurrentStatus] = useState(lead.status);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateLeadStatus(id, status),
    onSuccess: (data, variables) => {
      toast.success('Lead status updated!');
      setCurrentStatus(variables.status);
      queryClient.invalidateQueries(['origination', 'leads', 'list']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  });

  const handleUpdateStatus = (status) => {
    if (!lead) return;
    statusMutation.mutate({ id: lead.id, status });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Clock size={14} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"><RefreshCw size={14} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock size={14} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 size={14} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700"><XCircle size={14} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const isConverted = currentStatus === 'Converted';

  return (
    <div className="w-full pb-28">
      {/* Header */}
      <div className="relative pt-12 pb-24 px-4 overflow-hidden rounded-b-[40px] shadow-sm bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
        <button
          onClick={() => navigate('/employee/loans/origination/leads')}
          type="button"
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="relative z-10 flex flex-col items-center mt-6">
          <div className="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-slate-700/50 mb-3">
            {lead.name?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-white text-center">{lead.name}</h1>
          <div className="mt-4">
            {getStatusBadge(currentStatus)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
          
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

      {/* Sticky Bottom Bar for Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="flex gap-2">
          <button 
            onClick={() => handleUpdateStatus('Follow Up')}
            disabled={statusMutation.isPending || isConverted}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl text-xs font-semibold transition-colors border border-blue-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {statusMutation.isPending && statusMutation.variables?.status === 'Follow Up' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Follow Up
          </button>
          
          <button 
            onClick={() => handleUpdateStatus('Converted')}
            disabled={statusMutation.isPending || isConverted}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {statusMutation.isPending && statusMutation.variables?.status === 'Converted' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Convert
          </button>

          <button 
            onClick={() => handleUpdateStatus('Not Interested')}
            disabled={statusMutation.isPending || isConverted}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {statusMutation.isPending && statusMutation.variables?.status === 'Not Interested' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Reject
          </button>
        </div>
      </div>

    </div>
  );
};

export default OriginationMobileLeadDetails;
