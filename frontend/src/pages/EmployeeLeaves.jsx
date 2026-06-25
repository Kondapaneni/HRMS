import React, { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  FileText,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import toast from "react-hot-toast";

import EmployeeMobileLeaves from "./EmployeeMobileLeaves";

const EmployeeLeaves = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Form State
  const [leaveType, setLeaveType] = useState("unpaid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Calendar logic inside modal
  const [calendarDate, setCalendarDate] = useState(new Date());

  const { data: leavesData, isLoading: loading } = useQuery({
    queryKey: ["employee", "leaves"],
    queryFn: async () => {
      const res = await api.get("/employee/leaves");
      return res.data;
    },
    onError: () => toast.error("Failed to load leaves data."),
  });

  const balance = leavesData?.balance || {
    paidTotal: 12,
    paidUsed: 0,
    unpaidUsed: 0,
    totalApproved: 0,
  };
  const history = leavesData?.history || [];

  // Set default leave type when data loads
  useEffect(() => {
    if (leavesData) {
      const paidRemaining =
        leavesData.balance.paidTotal - leavesData.balance.paidUsed;
      if (paidRemaining > 0) {
        setLeaveType("paid");
      } else {
        setLeaveType("unpaid");
      }
    }
  }, [leavesData]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }
    if (reason.length < 10) {
      toast.error("Reason must be at least 10 characters long.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMsg("");

    try {
      await api.post("/employee/leaves/apply", {
        leaveType,
        startDate,
        endDate: endDate || startDate,
        reason,
      });
      toast.success("Leave request submitted successfully.");
      setIsModalOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["employee", "leaves"] });
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "Failed to submit leave request.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const paidRemaining = Math.max(balance.paidTotal - balance.paidUsed, 0);
  const paidPercent =
    balance.paidTotal > 0
      ? Math.round((balance.paidUsed / balance.paidTotal) * 100)
      : 0;

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

  // Force leaveType to unpaid if a paid leave already exists this month
  useEffect(() => {
    if (hasPaidLeaveThisMonth() && leaveType === "paid") {
      setLeaveType("unpaid");
    }
  }, [startDate, calendarDate, history, leaveType]);

  // Calendar rendering logic
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

      // Formatting YYYY-MM-DD local
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      // Check if approved in history
      const isApproved = history.some((h) => {
        if (h.status === "rejected") return false;
        return dateStr >= h.startDate && dateStr <= h.endDate;
      });

      const isDisabled = isPast || isSunday || isApproved;

      const isSelectedStart = startDate === dateStr;
      const isSelectedEnd = endDate === dateStr;
      const isInRange =
        startDate && endDate && dateStr > startDate && dateStr < endDate;

      let btnClass =
        "rounded-md border border-slate-200 bg-white py-2 text-sm ";

      if (isSelectedStart || isSelectedEnd) {
        btnClass += "bg-blue-600 text-white font-bold border-blue-600 ";
      } else if (isInRange) {
        btnClass += "bg-blue-50 text-blue-800 border-blue-200 ";
      } else if (isDisabled) {
        btnClass += "bg-slate-50 text-slate-400 cursor-not-allowed ";
      } else {
        btnClass += "text-slate-700 hover:bg-slate-50 hover:border-slate-300 ";
      }

      if (isApproved) {
        btnClass +=
          "line-through opacity-70 bg-green-50 text-green-700 border-green-200";
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

  const displayError = error || (error ? "Failed to load leaves." : null);

  return (
    <>
      <div className="md:hidden">
        <EmployeeMobileLeaves setIsModalOpen={setIsModalOpen} />
      </div>
      <div className="hidden md:block space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Leave Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Apply for leave and track your requests
            </p>
          </div>
          <button
            onClick={() => {
              setError("");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Apply Leave
          </button>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
            <div className="p-6 text-center">
              <p className="text-sm text-slate-500">Paid Leave</p>
              <div className="text-2xl font-bold mt-1 text-slate-900">
                {paidRemaining}/{balance.paidTotal}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${paidPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {balance.paidUsed} used
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
            <div className="p-6 text-center">
              <p className="text-sm text-slate-500">Unpaid Leave</p>
              <div className="text-2xl font-bold mt-1 text-slate-900">
                Unlimited
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {balance.unpaidUsed} used
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
            <div className="p-6 text-center">
              <p className="text-sm text-slate-500">Total Leaves Approved</p>
              <div className="text-2xl font-bold mt-1 text-blue-600">
                {balance.totalApproved}
              </div>
              <p className="text-xs text-slate-500 mt-2">approved leave days</p>
            </div>
          </div>
          <div className="hidden md:block"></div>
        </div>

        {/* Leave History Table */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
              <FileText className="h-5 w-5 text-slate-500" />
              Leave History
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Your leave requests and their status
            </p>
          </div>
          <div className="p-6 pt-0">
            <div className="rounded-md border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Days</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-8 text-slate-500"
                      >
                        Loading history...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-8 text-slate-500"
                      >
                        No leave records found.
                      </td>
                    </tr>
                  ) : (
                    history.map((leave, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${leave.leaveType?.toLowerCase() === "paid" ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-800"}`}
                          >
                            {leave.leaveType?.toLowerCase() === "paid"
                              ? "Paid"
                              : "Unpaid"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">
                          {new Date(leave.startDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-700">
                          {new Date(leave.endDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-700">{leave.days}</td>
                        <td
                          className="p-3 text-slate-700 max-w-[200px] truncate"
                          title={leave.reason}
                        >
                          {leave.reason}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              leave.status?.toLowerCase() === "approved"
                                ? "bg-green-100 text-green-800"
                                : leave.status?.toLowerCase() === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {leave.status
                              ? leave.status.charAt(0).toUpperCase() +
                                leave.status.slice(1).toLowerCase()
                              : ""}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 transition-all overflow-hidden">
          <div className="bg-white rounded-[24px] sm:rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90dvh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Apply for Leave
                </h2>
                <p className="text-sm text-slate-500">
                  Submit a new leave request
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto overscroll-contain flex-1">
              <form onSubmit={handleApplyLeave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Leave Type
                  </label>
                  {paidRemaining === 0 ? (
                    <>
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        Paid leave exhausted. You cannot apply for another paid
                        leave.
                      </div>
                      <select
                        name="leaveType"
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        required
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="unpaid">Unpaid Leave</option>
                      </select>
                    </>
                  ) : hasPaidLeaveThisMonth() ? (
                    <>
                      <div className="rounded-md border border-slate-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                        You already have an approved or pending Paid Leave for
                        this month. Additional leaves must be Unpaid.
                      </div>
                      <select
                        name="leaveType"
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        required
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="paid">
                        Paid Leave ({paidRemaining} remaining)
                      </option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    Select dates
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const newDate = new Date(calendarDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarDate(newDate);
                        }}
                        className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50 transition-colors"
                      >
                        Prev
                      </button>
                      <div className="text-sm font-semibold text-slate-800">
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
                        className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 mb-2">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {renderCalendar()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500 text-xs uppercase font-medium tracking-wider mb-1">
                        Start
                      </p>
                      <p className="font-semibold text-slate-800">
                        {startDate || "Not selected"}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500 text-xs uppercase font-medium tracking-wider mb-1">
                        End
                      </p>
                      <p className="font-semibold text-slate-800">
                        {endDate || startDate || "Not selected"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium text-slate-700">
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    rows="3"
                    required
                    minLength="10"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe the reason for your leave..."
                    className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 h-10 px-4 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-70 transition-colors"
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeLeaves;
