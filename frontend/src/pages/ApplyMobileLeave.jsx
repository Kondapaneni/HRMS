import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  ArrowLeft, 
  Loader2, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Send
} from 'lucide-react';
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
      days.push(<div key={`empty-${i}`} />);
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

      let btnClass = "rounded-xl py-2 text-xs font-semibold transition-all ";

      if (isSelectedStart || isSelectedEnd) {
        btnClass += "bg-[#1a73e8] text-white shadow-xs ";
      } else if (isInRange) {
        btnClass += "bg-[#e8f0fe] text-[#1a73e8] font-bold ";
      } else if (isDisabled) {
        btnClass += "bg-[#f8fafd] text-[#bdc1c6] cursor-not-allowed opacity-50 ";
      } else {
        btnClass += "bg-white border border-[#e0e3e7] text-[#1f1f1f] hover:bg-[#f1f3f4] active:scale-95 ";
      }

      if (isApproved) {
        btnClass += "line-through opacity-70 bg-[#e6f4ea] text-[#137333] border-[#ceead6]";
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
    <div className="space-y-4 pb-8">

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/employee/leaves')}
              className="p-2 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                  New Application
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight mt-0.5">
                Apply for Leave
              </h1>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Leave Application Form Card */}
      <form onSubmit={handleApplyLeave} className="bg-white p-5 rounded-3xl border border-[#e0e3e7] shadow-xs space-y-5">
        
        {/* Leave Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Leave Type *</label>
          
          {paidRemaining === 0 ? (
            <div className="space-y-2">
              <div className="rounded-2xl border border-[#fad2cf] bg-[#fce8e6] p-3 text-xs text-[#c5221f] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Paid leave quota is fully exhausted. This request will be submitted as Unpaid (LOP).</span>
              </div>
              <select 
                name="leaveType" 
                value={leaveType} 
                onChange={e => setLeaveType(e.target.value)} 
                required 
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] focus:ring-1 focus:ring-[#1a73e8] outline-none appearance-none"
              >
                <option value="unpaid">Unpaid Leave (Loss of Pay)</option>
              </select>
            </div>
          ) : hasPaidLeaveThisMonth() ? (
            <div className="space-y-2">
              <div className="rounded-2xl border border-[#feefc3] bg-[#fef7e0] p-3 text-xs text-[#b06000] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You already have a Paid Leave in this calendar month. Additional days are Unpaid.</span>
              </div>
              <select 
                name="leaveType" 
                value={leaveType} 
                onChange={e => setLeaveType(e.target.value)} 
                required 
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] focus:ring-1 focus:ring-[#1a73e8] outline-none appearance-none"
              >
                <option value="unpaid">Unpaid Leave (Loss of Pay)</option>
              </select>
            </div>
          ) : (
            <select 
              name="leaveType" 
              value={leaveType} 
              onChange={e => setLeaveType(e.target.value)} 
              required 
              className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] focus:ring-1 focus:ring-[#1a73e8] outline-none appearance-none cursor-pointer"
            >
              <option value="paid">Paid Leave ({paidRemaining} Days Remaining)</option>
              <option value="unpaid">Unpaid Leave (Loss of Pay)</option>
            </select>
          )}
        </div>

        {/* Interactive Calendar Date Picker */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Select Dates on Calendar *</label>
          
          <div className="rounded-2xl border border-[#e0e3e7] bg-[#f8fafd] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCalendarDate(newDate);
                }}
                className="w-8 h-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-[#1f1f1f]">
                {calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </span>

              <button
                type="button"
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCalendarDate(newDate);
                }}
                className="w-8 h-8 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#5f6368] uppercase pb-1 border-b border-[#e0e3e7]">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Date Summary Chips */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-[#e0e3e7] bg-white p-3 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-[#5f6368]">Start Date</p>
              <p className="font-bold text-[#1f1f1f] text-xs mt-0.5">{startDate || 'Tap calendar date'}</p>
            </div>
            <div className="rounded-2xl border border-[#e0e3e7] bg-white p-3 shadow-2xs">
              <p className="text-[10px] uppercase font-bold text-[#5f6368]">End Date</p>
              <p className="font-bold text-[#1f1f1f] text-xs mt-0.5">{endDate || startDate || 'Tap calendar date'}</p>
            </div>
          </div>
        </div>

        {/* Reason Textarea */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Reason for Leave *</label>
          <textarea
            name="reason"
            rows="3"
            required
            minLength={10}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Please provide details for the leave application (minimum 10 characters)..."
            className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl p-3.5 text-xs text-[#1f1f1f] focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all resize-none min-h-[90px]"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Leave Request</span>
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  );
};

export default ApplyMobileLeave;
