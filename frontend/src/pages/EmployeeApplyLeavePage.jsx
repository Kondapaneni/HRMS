import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const EmployeeApplyLeavePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const [leaveType, setLeaveType] = useState("unpaid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const { data: leavesData, isLoading: loading } = useQuery({
    queryKey: ["employee", "leaves"],
    queryFn: async () => {
      const res = await api.get("/employee/leaves");
      return res.data;
    },
  });

  const balance = leavesData?.balance || {
    paidTotal: 12,
    paidUsed: 0,
    unpaidUsed: 0,
    totalApproved: 0,
  };
  const history = leavesData?.history || [];
  const paidRemaining = Math.max(balance.paidTotal - balance.paidUsed, 0);

  useEffect(() => {
    if (leavesData) {
      if (paidRemaining > 0) setLeaveType("paid");
      else setLeaveType("unpaid");
    }
  }, [leavesData, paidRemaining]);

  const hasPaidLeaveThisMonth = () => {
    const dateToCheck = startDate ? new Date(startDate) : calendarDate;
    const checkM = dateToCheck.getMonth();
    const checkY = dateToCheck.getFullYear();

    return history.some((h) => {
      const isPaid = h.leaveType?.toLowerCase() === "paid";
      const status = h.status?.toLowerCase();
      const isActive = status === "approved" || status === "pending";

      if (!isPaid || !isActive) return false;

      const hM = new Date(h.startDate).getMonth();
      const hY = new Date(h.startDate).getFullYear();
      return hM === checkM && hY === checkY;
    });
  };

  useEffect(() => {
    if (hasPaidLeaveThisMonth() && leaveType === "paid") {
      setLeaveType("unpaid");
    }
  }, [startDate, calendarDate, history, leaveType]);

  const applyMutation = useMutation({
    mutationFn: async (data) => {
      await api.post("/employee/leaves/apply", data);
    },
    onSuccess: () => {
      toast.success("Leave request submitted successfully.");
      queryClient.invalidateQueries(["employee", "leaves"]);
      navigate("/employee/leaves");
    },
    onError: (err) => {
      const errMsg =
        err.response?.data?.error || "Failed to submit leave request.";
      setError(errMsg);
      toast.error(errMsg);
    },
  });

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!startDate) return toast.error("Please select a start date");
    if (reason.length < 10)
      return toast.error("Reason must be at least 10 characters long.");

    setError("");
    applyMutation.mutate({
      leaveType,
      startDate,
      endDate: endDate || startDate,
      reason,
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
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      const isApproved = history.some((h) => {
        if (h.status === "rejected") return false;
        return dateStr >= h.startDate && dateStr <= h.endDate;
      });

      const isDisabled = isPast || isSunday || isApproved;
      const isSelectedStart = startDate === dateStr;
      const isSelectedEnd = endDate === dateStr;
      const isInRange =
        startDate && endDate && dateStr > startDate && dateStr < endDate;

      let btnClass = "rounded-xl border py-2.5 text-sm transition-all ";

      if (isSelectedStart || isSelectedEnd) {
        btnClass +=
          "bg-blue-600 text-white font-bold border-blue-600 shadow-md ";
      } else if (isInRange) {
        btnClass += "bg-blue-50 text-blue-800 border-blue-200 ";
      } else if (isDisabled) {
        btnClass +=
          "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60 ";
      } else {
        btnClass +=
          "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 ";
      }

      if (isApproved) {
        btnClass +=
          "line-through opacity-70 bg-emerald-50 text-emerald-700 border-emerald-200";
      }

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => {
            if (!startDate || (startDate && endDate)) {
              setStartDate(dateStr);
              setEndDate("");
            } else if (dateStr >= startDate) {
              setEndDate(dateStr);
            } else {
              setStartDate(dateStr);
              setEndDate("");
            }
          }}
          className={btnClass}
        >
          {day}
        </button>,
      );
    }
    return days;
  };

  const submitting = applyMutation.isPending;

  return (
    <div className="relative pb-6">
      {/* Mobile Header Hero */}
      <div className="md:hidden -mx-4 -mt-4 px-4 pt-8 pb-20 relative overflow-hidden bg-slate-900">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between mb-2">
          <button
            onClick={() => navigate("/employee/leaves")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all border border-white/20 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Apply Leave
          </h2>
          <div className="w-10 h-10"></div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Apply Leave
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit a new leave request
          </p>
        </div>
        <button
          onClick={() => navigate("/employee/leaves")}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaves
        </button>
      </div>

      <div className="relative z-20 md:-mt-0 -mt-12 mx-1 md:mx-auto max-w-2xl space-y-6">
        <form
          onSubmit={handleApplyLeave}
          className="bg-white p-5 md:p-8 rounded-[24px] shadow-lg border border-slate-100/50 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-[11px] md:text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Leave Type *
            </label>
            {paidRemaining === 0 ? (
              <>
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                  Paid leave exhausted. You cannot apply for another paid leave.
                </div>
                <select
                  name="leaveType"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                >
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </>
            ) : hasPaidLeaveThisMonth() ? (
              <>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 font-medium">
                  You already have an approved or pending Paid Leave for this
                  month. Additional leaves must be Unpaid.
                </div>
                <select
                  name="leaveType"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                >
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </>
            ) : (
              <select
                name="leaveType"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
              >
                <option value="paid">
                  Paid Leave ({paidRemaining} remaining)
                </option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[11px] md:text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Select Dates *
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCalendarDate(newDate);
                  }}
                  className="rounded-xl bg-white border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                  Prev
                </button>
                <div className="text-base font-bold text-slate-800">
                  {calendarDate.toLocaleString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCalendarDate(newDate);
                  }}
                  className="rounded-xl bg-white border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                  Next
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                {renderCalendar()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">
                  Start Date
                </p>
                <p className="font-black text-slate-800 text-sm">
                  {startDate || "Not selected"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">
                  End Date
                </p>
                <p className="font-black text-slate-800 text-sm">
                  {endDate || startDate || "Not selected"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] md:text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Reason *
            </label>
            <textarea
              name="reason"
              rows="3"
              required
              minLength="10"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for your leave... (min 10 chars)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none min-h-[100px]"
            ></textarea>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full rounded-xl bg-blue-600 text-white font-bold text-sm py-4 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-60 disabled:active:scale-100"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Submit Leave Request"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeApplyLeavePage;
