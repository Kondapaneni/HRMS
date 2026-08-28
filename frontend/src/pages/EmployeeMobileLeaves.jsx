import React from 'react';
import PageLoader from '../components/PageLoader';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  CalendarDays,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EmployeeMobileLeaves = () => {
  const { data: leavesData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['employee', 'leaves'],
    queryFn: async () => {
      const res = await api.get('/employee/leaves');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();

  const cancelLeaveMutation = useMutation({
    mutationFn: async (leaveId) => {
      const res = await api.put(`/employee/leaves/${leaveId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Leave request cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', 'leaves'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to cancel leave request');
    },
  });

  const balance = leavesData?.balance || { paidTotal: 12, paidUsed: 0, unpaidUsed: 0, totalApproved: 0 };
  const history = leavesData?.history || [];
  const paidRemaining = Math.max(0, balance.paidTotal - balance.paidUsed);
  const percentUsed = Math.min(100, Math.round((balance.paidUsed / (balance.paidTotal || 12)) * 100));
  const error = queryError ? 'Failed to load leaves data.' : null;

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved') {
      return {
        bg: 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]',
        icon: <CheckCircle2 className="w-4 h-4 text-[#137333]" />,
        label: 'Approved'
      };
    }
    if (s === 'rejected') {
      return {
        bg: 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]',
        icon: <XCircle className="w-4 h-4 text-[#c5221f]" />,
        label: 'Rejected'
      };
    }
    if (s === 'cancelled') {
      return {
        bg: 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]',
        icon: <XCircle className="w-4 h-4 text-[#5f6368]" />,
        label: 'Cancelled'
      };
    }
    return {
      bg: 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]',
      icon: <Clock className="w-4 h-4 text-[#b06000]" />,
      label: 'Pending'
    };
  };

  if (loading) return <PageLoader message="Loading Leaves Data..." />;

  return (
    <div className="space-y-6 pb-4">

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Leaves</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Balance & History</h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Manage your annual time off & leave records</p>
            </div>
          </div>

          {/* Premium White Apply for Leave Button */}
          <Link
            to="/employee/leaves/apply"
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-900 rounded-full py-3.5 text-sm font-bold tracking-wide shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Apply for Leave</span>
          </Link>
        </div>
      </section>

      {/* KPI Stats Grid (4 Cards in Compact Google aesthetic) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 -mt-12 mx-0.5">
        {/* Paid Left */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Paid Left</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#137333]">{paidRemaining} Days</p>
          <p className="text-[10px] text-[#5f6368]">Available to book</p>
        </div>

        {/* Paid Used */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Paid Used</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1a73e8]">{balance.paidUsed || 0} Days</p>
          <p className="text-[10px] text-[#5f6368]">Quota deducted</p>
        </div>

        {/* Unpaid (LOP) */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Unpaid (LOP)</span>
            <div className="p-1.5 rounded-lg bg-[#fce8e6] text-[#c5221f]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#c5221f]">{balance.unpaidUsed || 0} Days</p>
          <p className="text-[10px] text-[#5f6368]">Loss of pay</p>
        </div>

        {/* Total Approved */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Approved</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#8430ce]">{balance.totalApproved || 0} Days</p>
          <p className="text-[10px] text-[#5f6368]">Lifetime approved</p>
        </div>
      </section>

      {/* Paid Leave Quota Progress Card */}
      <section className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-4 mx-0.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Annual Paid Leave Quota</span>
            <span className="text-[11px] text-slate-400">({balance.paidTotal || 12} Days Total)</span>
          </div>
          <span className="font-bold text-[#1a73e8]">{percentUsed}% Used</span>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#1a73e8] h-full rounded-full transition-all duration-500"
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>{balance.paidUsed || 0} Days Consumed</span>
          <span className="font-bold text-emerald-600">{paidRemaining} Days Remaining</span>
        </div>
      </section>

      {/* Leave Application History Feed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Applications</h3>
          <span className="text-xs font-semibold text-slate-400">{history.length} Total Requests</span>
        </div>

        {error ? (
          <div className="bg-red-50 p-4 rounded-2xl text-red-600 text-xs font-medium text-center border border-red-100">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white p-8 rounded-[1.5rem] text-center border border-slate-200 shadow-sm space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
            <p className="text-sm font-bold text-slate-800">No leave history found</p>
            <p className="text-xs text-slate-500">You have not submitted any leave requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 15).map((record, index) => {
              const start = new Date(record.startDate);
              const end = new Date(record.endDate);
              const badge = getStatusBadge(record.status);
              const isPending = (record.status || '').toLowerCase() === 'pending';

              return (
                <div key={record.id || index} className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {badge.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          {record.leaveType} Leave
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                          {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {record.startDate !== record.endDate && ` - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {record.reason && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-600 italic line-clamp-2">
                        &ldquo;{record.reason}&rdquo;
                      </p>
                    </div>
                  )}

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => cancelLeaveMutation.mutate(record.id)}
                      disabled={cancelLeaveMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 bg-[#d93025] hover:bg-[#b3261e] active:bg-[#a51d14] text-white rounded-full py-3.5 text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <span>{cancelLeaveMutation.isPending ? 'Cancelling...' : 'Cancel Leave'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};

export default EmployeeMobileLeaves;
