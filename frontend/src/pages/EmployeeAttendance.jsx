import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  LogIn,
  LogOut,
  Search,
  AlertCircle,
} from "lucide-react";
import api from "../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

import EmployeeMobileAttendance from "./EmployeeMobileAttendance";

const EmployeeAttendance = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [punchingAction, setPunchingAction] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const isWebAttendanceEnabled =
    profile?.webAttendanceEnabled == 1 ||
    profile?.webAttendanceEnabled === true ||
    profile?.webAttendanceEnabled === "1" ||
    profile?.webAttendanceEnabled === "true";

  // Filters
  const [searchDate, setSearchDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: history = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["employee", "attendance"],
    queryFn: async () => {
      const res = await api.get("/employee/attendance");
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const { data: leavesData } = useQuery({
    queryKey: ["employee", "leaves"],
    queryFn: async () => {
      const res = await api.get("/employee/leaves");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const leavesHistory = leavesData?.history || [];
  const todayDateStr = new Date().toLocaleDateString("en-CA");
  const isOnLeaveToday = leavesHistory.some((leave) => {
    if (leave.status?.toLowerCase() !== "approved") return false;
    return todayDateStr >= leave.startDate && todayDateStr <= leave.endDate;
  });

  const punchMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post("/employee/attendance/punch", payload);
    },
    onSuccess: (data, variables) => {
      toast.success(`Successfully ${variables.action.replace("-", " ")}ed!`);
      queryClient.invalidateQueries({
        queryKey: ["employee", "attendance"],
      });
    },
  });

  const reverseGeocode = async (lat, lng) => {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const handlePunch = async (action) => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by your browser.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setPunchingAction(action);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const addr = await reverseGeocode(lat, lng);

        try {
          await punchMutation.mutateAsync({
            action,
            latitude: lat,
            longitude: lng,
            address: addr,
          });
        } catch (err) {
          console.error(err);
          const errorMsg = err.response?.data?.error || `Failed to ${action}.`;
          setError(errorMsg);
          toast.error(errorMsg);
        } finally {
          setPunchingAction(null);
        }
      },
      (error) => {
        const errorMsg =
          "Unable to read your location. Please allow location access to check in/out.";
        setError(errorMsg);
        toast.error(errorMsg);
        setPunchingAction(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
    );
  };

  // Status computation matching PHP logic
  const resolveStatusKey = (record) => {
    if (!record || !record.status) return "missing";
    const l = record.status.toLowerCase();

    const isToday =
      new Date(record.date).toDateString() === new Date().toDateString();
    if (
      !isToday &&
      record.checkIn &&
      !record.checkOut &&
      l.includes("present")
    ) {
      return l.includes("late") ? "late-missing-checkout" : "missing-checkout";
    }

    if (l.includes("present")) return l;
    if (l === "weekend") return "week-off";
    if (l === "holiday") return "holiday";
    return l;
  };

  const formatDateStr = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredHistory = history.filter((record) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rDateZero = new Date(record.date);
    rDateZero.setHours(0, 0, 0, 0);

    if (rDateZero > today) {
      return false;
    }

    if (searchDate && !formatDateStr(record.date).includes(searchDate))
      return false;
    if (statusFilter !== "all") {
      const recordStatus = resolveStatusKey(record);
      if (statusFilter === "present") {
        if (!recordStatus.startsWith("present")) return false;
      } else if (statusFilter === "missed") {
        if (!recordStatus.includes("missing")) return false;
      } else if (recordStatus !== statusFilter) {
        return false;
      }
    }
    return true;
  });

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const todayRecord =
    history.find((r) => r.date?.split("T")[0] === todayStr) ||
    history.find(
      (r) =>
        r.date && new Date(r.date).toDateString() === new Date().toDateString(),
    );

  const checkedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
  const checkOutTime = todayRecord && todayRecord.checkOut;

  const presentCount = history.filter((r) =>
    resolveStatusKey(r).startsWith("present"),
  ).length;
  const leaveCount = history.filter((r) =>
    resolveStatusKey(r).endsWith("leave"),
  ).length;

  const statusPalette = {
    present: {
      label: "Present",
      classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    "present (late)": {
      label: "Present (Late)",
      classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    "present (early)": {
      label: "Present (Early)",
      classes: "bg-orange-100 text-orange-800 border-orange-200",
    },
    "present (late+early)": {
      label: "Present (Late+Early)",
      classes: "bg-orange-100 text-orange-800 border-orange-200",
    },
    "missing-checkout": {
      label: "Checkout Missing",
      classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    "late-missing-checkout": {
      label: "Late + Checkout Missing",
      classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    "paid leave": {
      label: "Paid Leave",
      classes: "bg-blue-100 text-blue-800 border-blue-200",
    },
    "unpaid leave": {
      label: "Unpaid Leave",
      classes: "bg-blue-100 text-blue-800 border-blue-200",
    },
    "sandwich leave": {
      label: "Sandwich Leave",
      classes: "bg-blue-100 text-blue-800 border-blue-200",
    },
    holiday: {
      label: "Company Holiday",
      classes: "bg-purple-100 text-purple-800 border-purple-200",
    },
    "week-off": {
      label: "Week Off",
      classes: "bg-purple-100 text-purple-800 border-purple-200",
    },
    missing: {
      label: "Missing",
      classes: "bg-red-100 text-red-800 border-red-200",
    },
    regularized: {
      label: "Regularized",
      classes: "bg-teal-100 text-teal-800 border-teal-200",
    },
    "not-marked": {
      label: "Not Marked",
      classes: "bg-slate-100 text-slate-800 border-slate-200",
    },
  };

  const displayError =
    error || (queryError ? "Failed to load attendance history." : null);

  return (
    <>
      <div className="md:hidden">
        <EmployeeMobileAttendance />
      </div>

      <div className="hidden md:block space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Attendance
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your daily attendance
            </p>
          </div>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 h-10 px-4 py-2 transition-colors">
            Holidays
          </button>
        </div>

        {displayError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {displayError}
          </div>
        )}

        {isOnLeaveToday && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 font-medium flex items-center gap-2 shadow-sm">
            <Calendar className="w-5 h-5" />
            You are currently on an approved leave. Check-in is disabled.
          </div>
        )}

        {/* Check-in / Check-out Card */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-lg font-semibold text-slate-800">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  <span>
                    {currentTime.toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <Clock className="h-4 w-4" />
                  Current time: <span>{currentTime.toLocaleTimeString()}</span>
                </p>
                {todayRecord?.checkIn && (
                  <p className="text-sm text-slate-500 mt-2">
                    Check-in:{" "}
                    <span className="font-medium text-slate-900">
                      {new Date(todayRecord.checkIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {todayRecord?.checkOut && (
                      <>
                        {" "}
                        &bull; Check-out:{" "}
                        <span className="font-medium text-slate-900">
                          {new Date(todayRecord.checkOut).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-3 w-full sm:w-auto">
                {!isWebAttendanceEnabled ? (
                  <div className="w-full flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm font-medium shadow-sm">
                    <AlertCircle size={16} className="mr-2 shrink-0" />
                    Web Attendance is Disabled for You. Please use the Mobile
                    App.
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handlePunch("check-in")}
                      disabled={
                        punchingAction ||
                        checkedIn ||
                        checkOutTime ||
                        isOnLeaveToday
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-11 px-6 min-w-[140px] disabled:opacity-50 transition-colors"
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {punchingAction === "check-in"
                        ? "Checking In..."
                        : "Check In"}
                    </button>

                    <button
                      onClick={() => handlePunch("punch")}
                      disabled={
                        punchingAction ||
                        !checkedIn ||
                        checkOutTime ||
                        isOnLeaveToday
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-11 px-6 min-w-[140px] disabled:opacity-50 transition-colors"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {punchingAction === "punch" ? "Punching..." : "Punch"}
                    </button>

                    <button
                      onClick={() => handlePunch("check-out")}
                      disabled={
                        punchingAction ||
                        !checkedIn ||
                        checkOutTime ||
                        isOnLeaveToday
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-11 px-6 min-w-[140px] disabled:opacity-50 transition-colors"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {punchingAction === "check-out"
                        ? "Checking Out..."
                        : "Check Out"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {presentCount}
            </div>
            <p className="text-sm text-slate-500">Present</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{leaveCount}</div>
            <p className="text-sm text-slate-500">On Leave</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <p className="text-sm text-slate-500">Paid Leave</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <p className="text-sm text-slate-500">Unpaid Leaves</p>
          </div>
        </div>

        {/* Attendance History */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6 pb-0">
            <h3 className="text-lg font-semibold text-slate-900">
              Attendance History
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  placeholder="Search by date (DD/MM/YYYY)..."
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full sm:w-[180px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="paid leave">Paid Leave</option>
                <option value="unpaid leave">Unpaid Leave</option>
                <option value="sandwich leave">Sandwich Leave</option>
                <option value="not-marked">Not Marked</option>
                <option value="missed">Missing</option>
              </select>
            </div>

            <div className="rounded-md border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Check In</th>
                    <th className="p-3">Check Out</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-8 text-slate-500"
                      >
                        Loading attendance...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-8 text-slate-500"
                      >
                        No attendance records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((record, i) => {
                      const statusKey = resolveStatusKey(record);
                      const config =
                        statusPalette[statusKey] || statusPalette["missing"];
                      return (
                        <tr
                          key={i}
                          className="border-b border-slate-100 hover:bg-slate-50 last:border-0"
                        >
                          <td className="p-3 font-medium text-slate-800">
                            {formatDateStr(record.date)}
                          </td>
                          <td className="p-3 text-slate-600">
                            {record.checkIn
                              ? new Date(record.checkIn).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )
                              : "—"}
                          </td>
                          <td className="p-3 text-slate-600">
                            {record.checkOut
                              ? new Date(record.checkOut).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )
                              : "—"}
                          </td>
                          <td className="p-3 text-slate-600">
                            {record.hours ? `${record.hours}h` : "—"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.classes}`}
                            >
                              {config.label}
                            </span>
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
      </div>
    </>
  );
};

export default EmployeeAttendance;
