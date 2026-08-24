import React, { useEffect, useState } from 'react';
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
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import EmployeeMobileLeaves from './EmployeeMobileLeaves';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme, progress }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="w-full bg-[#f1f3f4] rounded-full h-1.5 mt-3 overflow-hidden">
          <div 
            className="bg-[#8430ce] h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};

const EmployeeLeaves = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

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
    setMsg('');

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
  const paidPercent = balance.paidTotal > 0 ? Math.round(((balance.paidTotal - paidRemaining) / balance.paidTotal) * 100) : 0;

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

      let btnClass = "h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-semibold transition-all ";

      if (isSelectedStart || isSelectedEnd) {
        btnClass += "bg-[#1a73e8] text-white shadow-xs ";
      } else if (isInRange) {
        btnClass += "bg-[#e8f0fe] text-[#1a73e8] ";
      } else if (isDisabled) {
        btnClass += "text-[#dadce0] cursor-not-allowed ";
      } else {
        btnClass += "text-[#1f1f1f] hover:bg-[#f1f3f4] cursor-pointer ";
      }

      if (isApproved) {
        btnClass += "line-through bg-[#e6f4ea] text-[#137333]";
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

  if (loading) return <PageLoader message="Loading Leave Balances..." />;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileLeaves setIsModalOpen={setIsModalOpen} />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Leave Management &amp; Balances</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Leave Applications <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{history.length} Requests</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Submit time-off requests, track approved leave ledgers, and manage annual quotas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setError(''); setIsModalOpen(true); }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {/* Balance KPI Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Paid Leave Available" 
            value={`${paidRemaining} Days`} 
            subtitle={`Quota: ${balance.paidTotal} annual days`} 
            icon={CalendarDays} 
            colorTheme="purple"
            progress={paidPercent}
          />
          <StatCard 
            title="Paid Leave Used" 
            value={`${balance.paidUsed} Days`} 
            subtitle="Consumed this calendar year" 
            icon={CalendarIcon} 
            colorTheme="blue" 
          />
          <StatCard 
            title="Unpaid Leaves Taken" 
            value={`${balance.unpaidUsed} Days`} 
            subtitle="Logged loss of pay days" 
            icon={FileText} 
            colorTheme="amber" 
          />
          <StatCard 
            title="Approved Time Off" 
            value={`${balance.totalApproved} Days`} 
            subtitle="Total cumulative approved" 
            icon={CheckCircle2} 
            colorTheme="green" 
          />
        </div>

        {/* Leave History Table Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#e0e3e7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f]">Leave Application History</h3>
                <p className="text-xs text-[#5f6368]">Historical leave requests, dates, reasons, and approval statuses</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Leave Type</th>
                  <th className="p-4">Start Date</th>
                  <th className="p-4">End Date</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Reason / Notes</th>
                  <th className="p-4">Approval Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#5f6368]">
                      Loading leave records...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#5f6368]">
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
                      <tr key={idx} className="hover:bg-[#f8fafd] transition-colors">
                        <td className="p-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            leave.leaveType?.toLowerCase() === 'paid' 
                              ? 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d2fd]' 
                              : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                          }`}>
                            {leave.leaveType?.toLowerCase() === 'paid' ? 'Paid Leave' : 'Unpaid Leave'}
                          </span>
                        </td>
                        <td className="p-4 text-[#1f1f1f] font-semibold">
                          {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-[#1f1f1f] font-semibold">
                          {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-[#1f1f1f] font-semibold">
                          {leave.days} {leave.days === 1 ? 'Day' : 'Days'}
                        </td>
                        <td className="p-4 text-[#5f6368] max-w-[220px] truncate" title={leave.reason}>
                          {leave.reason}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isApproved ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' :
                            isRejected ? 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]' :
                            isCancelled ? 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]' :
                            'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
                          }`}>
                            {isApproved && <CheckCircle2 className="w-3 h-3" />}
                            {leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1).toLowerCase() : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => cancelLeaveMutation.mutate(leave.id)}
                              disabled={cancelLeaveMutation.isPending}
                              className="text-[#d93025] hover:text-[#b31412] text-xs font-semibold cursor-pointer disabled:opacity-50 hover:underline"
                            >
                              {cancelLeaveMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
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

      {/* Apply Leave Slideover Drawer (Using createPortal to body to blur entire screen including sidebar) */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white shadow-2xl w-full max-w-lg h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* 4-Color Gradient Top Accent */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#1f1f1f]">Apply for Leave</h2>
                  <p className="text-xs text-[#5f6368]">Submit time-off dates for manager approval</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content Form */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <form id="apply-leave-form" onSubmit={handleApplyLeave} className="space-y-5">
                
                {/* Leave Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#1f1f1f]">Leave Type Selection</label>
                  {paidRemaining === 0 ? (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-[#fad2cf] bg-[#fce8e6] p-3 text-xs text-[#c5221f] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Annual paid leave balance is exhausted. You may apply for Unpaid Leave.</span>
                      </div>
                      <select 
                        name="leaveType" 
                        value={leaveType} 
                        onChange={e => setLeaveType(e.target.value)} 
                        required 
                        className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none"
                      >
                        <option value="unpaid">Unpaid Leave</option>
                      </select>
                    </div>
                  ) : hasPaidLeaveThisMonth() ? (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-[#feefc3] bg-[#fef7e0] p-3 text-xs text-[#b06000] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>A Paid Leave is already logged for this calendar month. Additional days must be Unpaid.</span>
                      </div>
                      <select 
                        name="leaveType" 
                        value={leaveType} 
                        onChange={e => setLeaveType(e.target.value)} 
                        required 
                        className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none"
                      >
                        <option value="unpaid">Unpaid Leave</option>
                      </select>
                    </div>
                  ) : (
                    <select 
                      name="leaveType" 
                      value={leaveType} 
                      onChange={e => setLeaveType(e.target.value)} 
                      required 
                      className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none cursor-pointer"
                    >
                      <option value="paid">Paid Leave ({paidRemaining} Days Remaining)</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  )}
                </div>

                {/* Calendar Date Picker */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-[#1f1f1f]">Select Leave Schedule Dates</label>
                  <div className="rounded-2xl border border-[#e0e3e7] bg-[#f8fafd] p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarDate(newDate);
                        }}
                        className="p-1 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-xs font-bold text-[#1f1f1f]">
                        {calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCalendarDate(newDate);
                        }}
                        className="p-1 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider mb-2">
                      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendar()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                    <div className="rounded-xl border border-[#e0e3e7] bg-[#f8fafd] p-3">
                      <p className="text-[10px] text-[#5f6368] uppercase font-semibold tracking-wider">Start Date</p>
                      <p className="font-bold text-[#1f1f1f] mt-0.5">{startDate || 'Not selected'}</p>
                    </div>
                    <div className="rounded-xl border border-[#e0e3e7] bg-[#f8fafd] p-3">
                      <p className="text-[10px] text-[#5f6368] uppercase font-semibold tracking-wider">End Date</p>
                      <p className="font-bold text-[#1f1f1f] mt-0.5">{endDate || startDate || 'Not selected'}</p>
                    </div>
                  </div>
                </div>

                {/* Reason Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#1f1f1f]">Reason for Leave <span className="text-[#d93025]">*</span></label>
                  <textarea
                    name="reason"
                    rows="3"
                    required
                    minLength="10"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Provide a detailed explanation for your time-off request (minimum 10 characters)..."
                    className="w-full rounded-xl border border-[#dadce0] bg-white p-3 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none resize-none transition-all"
                  />
                </div>

              </form>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-full text-xs font-semibold text-[#1f1f1f] bg-white border border-[#dadce0] hover:bg-[#f1f3f4] transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="apply-leave-form"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-full text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] transition-all disabled:opacity-50 cursor-pointer shadow-xs min-w-[130px]"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
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
