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
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
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
    const s = (status || '').toLowerCase();
    if (s === 'approved') {
      return {
        bg: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
        label: 'Approved'
      };
    }
    if (s === 'rejected') {
      return {
        bg: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]',
        label: 'Rejected'
      };
    }
    if (s === 'cancelled') {
      return {
        bg: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]',
        label: 'Cancelled'
      };
    }
    return {
      bg: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',
      label: 'Pending'
    };
  };

  if (loading) return <PageLoader message="Loading Leaves Data..." />;

  return (
    <div className="space-y-4 pb-8">

      {/* Header Card with Apply Button */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                Time Off Hub
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              My Leaves
            </h1>
            <p className="text-xs text-[#5f6368]">
              Annual leave balance and request records
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <Link
          to="/employee/leaves/apply"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for New Leave</span>
        </Link>
      </div>

      {/* Paid Leave Quota Progress Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1f1f1f]">Annual Paid Leave Quota</span>
            <span className="text-[10px] text-[#5f6368]">({balance.paidTotal || 12} Days Total)</span>
          </div>
          <span className="font-bold text-[#1a73e8]">{percentUsed}% Used</span>
        </div>

        <div className="w-full bg-[#f1f3f4] h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#1a73e8] h-full rounded-full transition-all duration-500"
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#5f6368] pt-0.5">
          <span>{balance.paidUsed || 0} Days Consumed</span>
          <span className="font-semibold text-[#137333]">{paidRemaining} Days Remaining</span>
        </div>
      </div>

      {/* KPI Stats Grid (4 Cards) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Paid Left */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Paid Left</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#137333]">{paidRemaining} Days</p>
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
          <p className="text-xl font-bold text-[#1a73e8]">{balance.paidUsed || 0} Days</p>
          <p className="text-[10px] text-[#5f6368]">Quota deducted</p>
        </div>

        {/* Unpaid / LOP */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Unpaid (LOP)</span>
            <div className="p-1.5 rounded-lg bg-[#fef7e0] text-[#b06000]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#b06000]">{balance.unpaidUsed || 0} Days</p>
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
          <p className="text-xl font-bold text-[#8430ce]">{balance.totalApproved || 0} Days</p>
          <p className="text-[10px] text-[#5f6368]">Lifetime approved</p>
        </div>
      </div>

      {/* Leave Application History Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Recent Applications</h3>
          <span className="text-[10px] text-[#5f6368]">{history.length} Total Requests</span>
        </div>

        {error ? (
          <div className="bg-[#fce8e6] p-4 rounded-2xl text-[#c5221f] text-xs font-medium text-center border border-[#fad2cf]">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No leave history found</p>
            <p className="text-[11px] text-[#5f6368]">You have not submitted any leave requests yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.slice(0, 15).map((record, index) => {
              const start = new Date(record.startDate);
              const end = new Date(record.endDate);
              const badge = getStatusBadge(record.status);
              const isPending = (record.status || '').toLowerCase() === 'pending';

              return (
                <div key={record.id || index} className="bg-white p-4 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#1f1f1f] capitalize">
                        {record.leaveType} Leave
                      </h4>
                      <p className="text-[10px] font-semibold text-[#5f6368] mt-0.5">
                        {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {record.startDate !== record.endDate && ` – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {record.reason && (
                    <div className="bg-[#f8fafd] rounded-xl p-2.5 border border-[#e0e3e7]">
                      <p className="text-xs text-[#5f6368] italic line-clamp-2">
                        &ldquo;{record.reason}&rdquo;
                      </p>
                    </div>
                  )}

                  {isPending && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => cancelLeaveMutation.mutate(record.id)}
                        disabled={cancelLeaveMutation.isPending}
                        className="w-full py-2 rounded-full border border-[#fad2cf] bg-[#fce8e6]/50 hover:bg-[#fce8e6] text-[#c5221f] font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {cancelLeaveMutation.isPending ? 'Cancelling Request...' : 'Cancel Leave Request'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default EmployeeMobileLeaves;
