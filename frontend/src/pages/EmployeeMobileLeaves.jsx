import PageLoader from '../components/PageLoader';
import { Plus, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays } from 'lucide-react';
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
        bg: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20',
        icon: <CheckCircle2 className="w-4 h-4 text-[var(--status-success-text)]" />,
        label: 'Approved'
      };
    }
    if (s === 'rejected') {
      return {
        bg: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-text)]/20',
        icon: <XCircle className="w-4 h-4 text-[var(--status-danger-text)]" />,
        label: 'Rejected'
      };
    }
    if (s === 'cancelled') {
      return {
        bg: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--line)]',
        icon: <XCircle className="w-4 h-4 text-[var(--status-neutral-text)]" />,
        label: 'Cancelled'
      };
    }
    return {
      bg: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20',
      icon: <Clock className="w-4 h-4 text-[var(--status-warning-text)]" />,
      label: 'Pending'
    };
  };

  if (loading) return <PageLoader message="Loading Leaves Data..." />;

  return (
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            My Leaves
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Leave <span className="text-[var(--brand-deep)]">Applications</span>
            </h2>

            <Link
              to="/employee/leaves/apply"
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Apply Leave</span>
            </Link>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-1">
            Manage your annual time off & leave records
          </p>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-2 gap-3 relative z-20 mx-0.5">
        {/* Paid Left */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Paid Left</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)]">{paidRemaining} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Available to book</p>
        </div>

        {/* Paid Used */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Paid Used</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--brand-deep)]">{balance.paidUsed || 0} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Quota deducted</p>
        </div>

        {/* Unpaid (LOP) */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Unpaid (LOP)</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-danger-text)]">{balance.unpaidUsed || 0} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Loss of pay</p>
        </div>

        {/* Total Approved */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Approved</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--accent-pink-deep)]">{balance.totalApproved || 0} Days</p>
          <p className="text-[10px] text-[var(--muted)]">Lifetime approved</p>
        </div>
      </section>

      {/* Paid Leave Quota Progress Card */}
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs p-4 mx-0.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text)]">Annual Paid Leave Quota</span>
            <span className="text-[11px] text-[var(--muted)]">({balance.paidTotal || 12} Days Total)</span>
          </div>
          <span className="font-semibold text-[var(--brand-deep)]">{percentUsed}% Used</span>
        </div>

        <div className="w-full bg-[var(--brand-tint)] h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-[var(--brand)] h-full rounded-full transition-all duration-500"
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-0.5">
          <span>{balance.paidUsed || 0} Days Consumed</span>
          <span className="font-semibold text-[var(--status-success-text)]">{paidRemaining} Days Remaining</span>
        </div>
      </section>

      {/* Leave Application History Feed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">Recent Applications</h3>
          <span className="text-xs font-medium text-[var(--muted)]">{history.length} Total Requests</span>
        </div>

        {error ? (
          <div className="bg-[var(--status-danger-bg)] p-4 rounded-[16px] text-[var(--status-danger-text)] text-xs font-semibold text-center border border-[var(--status-danger-text)]/20">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 rounded-[20px] text-center border border-[var(--line)] shadow-xs space-y-3">
            <AlertCircle className="w-8 h-8 text-[var(--muted)] mx-auto opacity-60" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">No leave history found</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">You have not submitted any leave requests yet.</p>
            </div>
            <Link
              to="/employee/leaves/apply"
              className="inline-flex items-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Apply for Leave</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 15).map((record, index) => {
              const start = new Date(record.startDate);
              const end = new Date(record.endDate);
              const badge = getStatusBadge(record.status);
              const isPending = (record.status || '').toLowerCase() === 'pending';

              return (
                <div key={record.id || index} className="bg-[var(--surface)] p-4 rounded-[20px] border border-[var(--line)] shadow-xs flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center shrink-0">
                        {badge.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                          {record.leaveType} Leave
                        </h4>
                        <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5">
                          {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {record.startDate !== record.endDate && ` - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shrink-0 shadow-2xs ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {record.reason && (
                    <div className="bg-[var(--surface-alt)] rounded-[14px] px-3.5 py-2.5 border border-[var(--line)]">
                      <p className="text-xs text-[var(--text-2)] italic line-clamp-2">
                        &ldquo;{record.reason}&rdquo;
                      </p>
                    </div>
                  )}

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => cancelLeaveMutation.mutate(record.id)}
                      disabled={cancelLeaveMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-text)]/20 hover:bg-[var(--status-danger-text)] hover:text-white rounded-full py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
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
