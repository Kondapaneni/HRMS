import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Plus, 
  X, 
  Loader2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import EmployeeMobileLeaves from './EmployeeMobileLeaves';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

const EmployeeLeaves = () => {
  const queryClient = useQueryClient();
  const [, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Form State
  const [leaveType, setLeaveType] = useState('unpaid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Calendar logic inside modal
  const [calendarDate, setCalendarDate] = useState(new Date());

  const { data: leavesData, isLoading: loading } = useQuery({
    queryKey: ['employee', 'leaves'],
    queryFn: async () => {
      const res = await api.get('/employee/leaves');
      return res.data;
    },
    onError: () => toast.error('Failed to load leaves data.'),
  });

  const cancelLeaveMutation = useMutation({
    mutationFn: async (leaveId) => {
      const res = await api.put(`/employee/leaves/${leaveId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Leave cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', 'leaves'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to cancel leave');
    },
  });

  const balance = leavesData?.balance || { paidTotal: 12, paidUsed: 0, unpaidUsed: 0, totalApproved: 0 };
  const history = leavesData?.history || [];

  useEffect(() => {
    if (leavesData) {
      const paidRemaining = leavesData.balance.paidTotal - leavesData.balance.paidUsed;
      if (paidRemaining > 0) {
        setLeaveType('paid');
      } else {
        setLeaveType('unpaid');
      }
    }
  }, [leavesData]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    if (reason.length < 10) {
      toast.error('Reason must be at least 10 characters long.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      await api.post('/employee/leaves/apply', {
        leaveType,
        startDate,
        endDate: endDate || startDate,
        reason
      });
      toast.success('Leave request submitted successfully.');
      setIsModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['employee', 'leaves'] });
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to submit leave request.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const paidRemaining = Math.max(balance.paidTotal - balance.paidUsed, 0);

  const hasPaidLeaveThisMonth = () => {
    const dateToCheck = startDate ? new Date(startDate) : calendarDate;
    const checkM = dateToCheck.getMonth();
    const checkY = dateToCheck.getFullYear();

    return history.some(h => {
      const isPaid = h.leaveType?.toLowerCase() === 'paid';
      const status = h.status?.toLowerCase();
      const isActive = status === 'approved' || status === 'pending';

      if (!isPaid || !isActive) return false;

      const hM = new Date(h.startDate).getMonth();
      const hY = new Date(h.startDate).getFullYear();
      return hM === checkM && hY === checkY;
    });
  };

  useEffect(() => {
    if (hasPaidLeaveThisMonth() && leaveType === 'paid') {
      setLeaveType('unpaid');
    }
  }, [startDate, calendarDate, history, leaveType]);

  const renderCalendar = () => {
    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date.getTime() < today.getTime();
      const isSunday = date.getDay() === 0;

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const isApproved = history.some(h => {
        if (h.status === 'rejected') return false;
        return dateStr >= h.startDate && dateStr <= h.endDate;
      });

      const isDisabled = isPast || isSunday || isApproved;
      const isSelectedStart = startDate === dateStr;
      const isSelectedEnd = endDate === dateStr;
      const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate;

      let btnClass = "h-8 w-8 mx-auto flex items-center justify-center rounded-full text-[12px] font-medium transition-all ";

      if (isSelectedStart || isSelectedEnd) {
        btnClass += "bg-[var(--brand)] text-[var(--ink)] font-bold ";
      } else if (isInRange) {
        btnClass += "bg-[var(--brand-tint)] text-[var(--brand-deep)] ";
      } else if (isDisabled) {
        btnClass += "text-[var(--line)] cursor-not-allowed ";
      } else {
        btnClass += "text-[var(--text)] hover:bg-[var(--surface-alt)] cursor-pointer ";
      }

      if (isApproved) {
        btnClass += "line-through bg-[var(--success-bg)] text-[var(--success-text)]";
      }

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => {
            if (!startDate || (startDate && endDate)) {
              setStartDate(dateStr);
              setEndDate('');
            } else if (dateStr >= startDate) {
              setEndDate(dateStr);
            } else {
              setStartDate(dateStr);
              setEndDate('');
            }
          }}
          className={btnClass}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  if (loading) return <PageLoader message="Loading leave balances..." />;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileLeaves setIsModalOpen={setIsModalOpen} />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Leave management & balances</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>Leave applications</span>
              <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                {history.length} Requests
              </span>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Submit time-off requests, track approved leave ledgers, and manage annual quotas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => { setError(''); setIsModalOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Apply for leave</span>
            </Button>
          </div>
        </div>

        {/* Balance KPI Stats Cards */}
        <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Paid leave available" 
            value={`${paidRemaining}d`} 
            subtitle={`Quota: ${balance.paidTotal} annual days`} 
            icon={CalendarDays} 
          />
          <StatCard 
            title="Paid leave used" 
            value={`${balance.paidUsed}d`} 
            subtitle="Consumed this calendar year" 
            icon={CalendarIcon} 
          />
          <StatCard 
            title="Unpaid leaves taken" 
            value={`${balance.unpaidUsed}d`} 
            subtitle="Loss of pay days" 
            icon={FileText} 
          />
          <StatCard 
            title="Approved time off" 
            value={`${balance.totalApproved}d`} 
            subtitle="Cumulative approved" 
            icon={CheckCircle2} 
          />
        </div>

        {/* Leave History Table Card */}
        <div className="bg-[var(--surface)] rounded-[24px] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-[var(--text)]">Leave application history</h3>
                <p className="text-[12px] text-[var(--muted)]">Historical leave requests, dates, reasons, and approval statuses</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead className="bg-[var(--surface-alt)] text-[var(--muted)] font-medium text-[12px]">
                <tr>
                  <th className="p-3.5">Leave type</th>
                  <th className="p-3.5">Start date</th>
                  <th className="p-3.5">End date</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Reason / Notes</th>
                  <th className="p-3.5">Approval status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[var(--muted)]">
                      Loading leave records...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[var(--muted)]">
                      No leave applications found in your history.
                    </td>
                  </tr>
                ) : (
                  history.map((leave, idx) => {
                    const isApproved = leave.status?.toLowerCase() === 'approved';
                    const isRejected = leave.status?.toLowerCase() === 'rejected';
                    const isCancelled = leave.status?.toLowerCase() === 'cancelled';
                    const isPending = !isApproved && !isRejected && !isCancelled;

                    return (
                      <tr key={idx} className="hover:bg-[var(--surface-alt)] transition-colors">
                        <td className="p-3.5">
                          <span className={`inline-flex rounded-[8px] px-2.5 py-0.5 text-[11px] font-medium ${
                            leave.leaveType?.toLowerCase() === 'paid' 
                              ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]' 
                              : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                          }`}>
                            {leave.leaveType?.toLowerCase() === 'paid' ? 'Paid leave' : 'Unpaid leave'}
                          </span>
                        </td>
                        <td className="p-3.5 text-[var(--text)] font-medium">
                          {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-3.5 text-[var(--text)] font-medium">
                          {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-3.5 text-[var(--text)] font-medium">
                          {leave.days} {leave.days === 1 ? 'Day' : 'Days'}
                        </td>
                        <td className="p-3.5 text-[var(--muted)] max-w-[220px] truncate" title={leave.reason}>
                          {leave.reason}
                        </td>
                        <td className="p-3.5">
                          <StatusBadge variant={
                            isApproved ? 'success' :
                            isRejected ? 'danger' :
                            isCancelled ? 'neutral' : 'warning'
                          }>
                            {isApproved && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                            {leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1).toLowerCase() : 'Pending'}
                          </StatusBadge>
                        </td>
                        <td className="p-3.5 text-right">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => cancelLeaveMutation.mutate(leave.id)}
                              disabled={cancelLeaveMutation.isPending}
                              className="text-[var(--danger-text)] text-[12px] font-medium cursor-pointer disabled:opacity-50 hover:underline"
                            >
                              {cancelLeaveMutation.isPending ? 'Cancelling...' : 'Cancel request'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Apply Leave Slideover Drawer */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 antialiased"
        >
          <div className="bg-[var(--surface)] shadow-2xl w-full max-w-lg h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  LEAVE APPLICATION
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Apply for Leave
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content Form */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-[13px]">
              <form id="apply-leave-form" onSubmit={handleApplyLeave} className="space-y-4">
                
                {/* Leave Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--muted)]">Leave type selection</label>
                  {paidRemaining === 0 ? (
                    <div className="space-y-2">
                      <div className="rounded-[12px] bg-[var(--danger-bg)] p-3 text-[12px] text-[var(--danger-text)] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Annual paid leave balance is exhausted. You may apply for unpaid leave.</span>
                      </div>
                      <select 
                        name="leaveType" 
                        value={leaveType} 
                        onChange={e => setLeaveType(e.target.value)} 
                        required 
                        className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--brand)] focus:outline-none"
                      >
                        <option value="unpaid">Unpaid leave</option>
                      </select>
                    </div>
                  ) : hasPaidLeaveThisMonth() ? (
                    <div className="space-y-2">
                      <div className="rounded-[12px] bg-[var(--warning-bg)] p-3 text-[12px] text-[var(--warning-text)] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>A paid leave is already logged for this calendar month. Additional days must be unpaid.</span>
                      </div>
                      <select 
                        name="leaveType" 
                        value={leaveType} 
                        onChange={e => setLeaveType(e.target.value)} 
                        required 
                        className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--brand)] focus:outline-none"
                      >
                        <option value="unpaid">Unpaid leave</option>
                      </select>
                    </div>
                  ) : (
                    <select 
                      name="leaveType" 
                      value={leaveType} 
                      onChange={e => setLeaveType(e.target.value)} 
                      required 
                      className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--brand)] focus:outline-none cursor-pointer"
                    >
                      <option value="paid">Paid leave ({paidRemaining} days remaining)</option>
                      <option value="unpaid">Unpaid leave</option>
                    </select>
                  )}
                </div>

                {/* Calendar Date Picker */}
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-[var(--muted)]">Select leave schedule dates</label>
                  <div className="rounded-[20px] bg-[var(--surface-alt)] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarDate(newDate);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--line)] text-[var(--muted)] transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-[13px] font-medium text-[var(--text)]">
                        {calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCalendarDate(newDate);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--line)] text-[var(--muted)] transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
                      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendar()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div className="rounded-[12px] bg-[var(--surface-alt)] p-3">
                      <p className="text-[11px] text-[var(--muted)] uppercase font-medium">Start date</p>
                      <p className="font-medium text-[var(--text)] mt-0.5">{startDate || 'Not selected'}</p>
                    </div>
                    <div className="rounded-[12px] bg-[var(--surface-alt)] p-3">
                      <p className="text-[11px] text-[var(--muted)] uppercase font-medium">End date</p>
                      <p className="font-medium text-[var(--text)] mt-0.5">{endDate || startDate || 'Not selected'}</p>
                    </div>
                  </div>
                </div>

                {/* Reason Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--muted)]">Reason for leave <span className="text-[var(--danger-text)]">*</span></label>
                  <textarea
                    name="reason"
                    rows="3"
                    required
                    minLength="10"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Provide an explanation for your time-off request (minimum 10 characters)..."
                    className="w-full rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] p-3 text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none resize-none transition-all"
                  />
                </div>

              </form>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="apply-leave-form"
                disabled={submitting}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EmployeeLeaves;
