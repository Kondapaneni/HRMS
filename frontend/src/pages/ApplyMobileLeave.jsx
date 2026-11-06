import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ApplyMobileLeave = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  
  const [leaveType, setLeaveType] = useState('unpaid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const { data: leavesData, isLoading: loading } = useQuery({
    queryKey: ['employee', 'leaves'],
    queryFn: async () => {
      const res = await api.get('/employee/leaves');
      return res.data;
    }
  });

  const balance = leavesData?.balance || { paidTotal: 12, paidUsed: 0, unpaidUsed: 0, totalApproved: 0 };
  const history = leavesData?.history || [];
  const paidRemaining = Math.max(balance.paidTotal - balance.paidUsed, 0);

  useEffect(() => {
    if (leavesData) {
      if (paidRemaining > 0) setLeaveType('paid');
      else setLeaveType('unpaid');
    }
  }, [leavesData, paidRemaining]);

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

  const applyMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/employee/leaves/apply', data);
    },
    onSuccess: () => {
      toast.success('Leave request submitted successfully.');
      queryClient.invalidateQueries({ queryKey: ['employee', 'leaves'] });
      navigate('/employee/leaves');
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error || 'Failed to submit leave request.';
      setError(errMsg);
      toast.error(errMsg);
    }
  });

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!startDate) return toast.error('Please select a start date on the calendar');
    if (reason.length < 10) return toast.error('Reason must be at least 10 characters long.');
    
    setError('');
    applyMutation.mutate({
      leaveType,
      startDate,
      endDate: endDate || startDate,
      reason
    });
  };

  const renderCalendar = () => {
    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-full max-w-[38px] aspect-square mx-auto" />);
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

      let btnClass = "w-full max-w-[38px] aspect-square mx-auto flex items-center justify-center rounded-full text-xs font-semibold transition-all ";

      if (isSelectedStart || isSelectedEnd) {
        btnClass += "bg-[var(--ink)] text-white font-bold shadow-xs ";
      } else if (isInRange) {
        btnClass += "bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold ";
      } else if (isDisabled) {
        btnClass += "bg-[var(--surface-alt)] text-[var(--muted)] cursor-not-allowed opacity-40 ";
      } else {
        btnClass += "bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] hover:bg-[var(--surface-alt)] active:scale-95 ";
      }

      if (isApproved) {
        btnClass += "line-through opacity-70 bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20 ";
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

  const submitting = applyMutation.isPending;

  if (loading) return <PageLoader message="Loading Leave Form..." />;

  return (
    <div className="relative pb-6 font-sans antialiased text-[var(--text)] space-y-6">
      
      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 pl-[48px]">
            My Leaves
          </p>

          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <button 
                type="button"
                onClick={() => navigate('/employee/leaves')} 
                className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-alt)] active:scale-95 text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer"
                aria-label="Back to Leaves"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
                Apply <span className="text-[var(--brand-deep)]">Leave</span>
              </h2>
            </div>

            <button 
              type="button"
              onClick={handleApplyLeave} 
              disabled={submitting || loading} 
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Send className="w-3.5 h-3.5 text-white" />}
              <span>{submitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-1 pl-[48px]">
            Submit a new leave request for manager approval
          </p>
        </div>
      </section>

      <div className="relative z-20 mx-0.5 space-y-6">
        <form onSubmit={handleApplyLeave} className="bg-[var(--surface)] p-5 rounded-[24px] shadow-xs border border-[var(--line)] space-y-5">
          
          {/* Leave Type */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Leave Type *</label>
            {paidRemaining === 0 ? (
              <div className="space-y-2">
                <div className="rounded-[14px] border border-[var(--status-danger-text)]/20 bg-[var(--status-danger-bg)] p-3 text-xs text-[var(--status-danger-text)] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Paid leave quota is fully exhausted. This request will be submitted as Unpaid (LOP).</span>
                </div>
                <div className="relative">
                  <select 
                    name="leaveType" 
                    value={leaveType} 
                    onChange={e => setLeaveType(e.target.value)} 
                    required 
                    className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none appearance-none cursor-pointer shadow-2xs pr-10"
                  >
                    <option value="unpaid">Unpaid Leave (Loss of Pay)</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>
            ) : hasPaidLeaveThisMonth() ? (
              <div className="space-y-2">
                <div className="rounded-[14px] border border-[var(--status-warning-text)]/20 bg-[var(--status-warning-bg)] p-3 text-xs text-[var(--status-warning-text)] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>You already have a Paid Leave in this calendar month. Additional days are Unpaid.</span>
                </div>
                <div className="relative">
                  <select 
                    name="leaveType" 
                    value={leaveType} 
                    onChange={e => setLeaveType(e.target.value)} 
                    required 
                    className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none appearance-none cursor-pointer shadow-2xs pr-10"
                  >
                    <option value="unpaid">Unpaid Leave (Loss of Pay)</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <select 
                  name="leaveType" 
                  value={leaveType} 
                  onChange={e => setLeaveType(e.target.value)} 
                  required 
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none appearance-none cursor-pointer shadow-2xs pr-10"
                >
                  <option value="paid">Paid Leave ({paidRemaining} Days Remaining)</option>
                  <option value="unpaid">Unpaid Leave (Loss of Pay)</option>
                </select>
                <ChevronRight className="w-4 h-4 text-[var(--muted)] absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Interactive Calendar Date Picker */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Select Dates on Calendar *</label>
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCalendarDate(newDate);
                  }}
                  className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--muted)] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-[var(--text)] select-none">
                  {calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCalendarDate(newDate);
                  }}
                  className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--muted)] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--muted)] uppercase pb-1 border-b border-[var(--line)]">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
              </div>
              <div className="grid grid-cols-7 gap-1 items-center justify-items-center">
                {renderCalendar()}
              </div>
            </div>

            {/* Start / End Date summary chips */}
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] p-3 shadow-2xs">
                <p className="text-[10px] uppercase font-semibold text-[var(--muted)] tracking-wider">Start Date</p>
                <p className="font-semibold text-[var(--text)] text-xs mt-0.5">{startDate || 'Tap calendar date'}</p>
              </div>
              <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] p-3 shadow-2xs">
                <p className="text-[10px] uppercase font-semibold text-[var(--muted)] tracking-wider">End Date</p>
                <p className="font-semibold text-[var(--text)] text-xs mt-0.5">{endDate || startDate || 'Tap calendar date'}</p>
              </div>
            </div>
          </div>

          {/* Reason Textarea */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Reason for Leave *</label>
            <textarea
              name="reason"
              rows="3"
              required
              minLength={10}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the reason for your leave... (minimum 10 characters)"
              className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] p-3.5 text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all resize-none min-h-[90px] shadow-2xs"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full h-11 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <span>Submit Leave Request</span>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default ApplyMobileLeave;
