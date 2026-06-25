import React from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const AdminHolidaysArchive = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: archivedHolidays = [], isLoading: loading } = useQuery({
    queryKey: ["admin", "holidays-archive"],
    queryFn: async () => {
      const response = await api.get("/admin/holidays/archived");
      return response.data;
    },
  });

  const restoreHolidayMutation = useMutation({
    mutationFn: async (dateStr) => {
      return api.put(`/admin/holidays/${dateStr}/restore`);
    },
    onSuccess: () => {
      toast.success("Holiday restored successfully");
      queryClient.invalidateQueries({
        queryKey: ["admin", "holidays-archive"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "holidays"],
      });
    },
    onError: () => {
      toast.error("Failed to restore holiday");
    },
  });

  const handleRestoreHoliday = async (dateStr) => {
    await restoreHolidayMutation.mutateAsync(dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Archived Holidays
          </h1>
          <p className="text-slate-500">
            View and restore soft-deleted holidays.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/holidays")}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Holidays
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">
            Previously Removed
          </h2>
          <p className="text-sm text-slate-500">
            Restoring these dates will make them active holidays again.
          </p>
        </div>

        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : archivedHolidays.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              No archived holidays found.
            </div>
          ) : (
            archivedHolidays.map((h, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow gap-4 opacity-75 hover:opacity-100"
              >
                <div className="flex items-center gap-4">
                  {h.holidayImage ? (
                    <img
                      src={h.holidayImage}
                      alt={h.holidayName}
                      className="h-14 w-14 rounded-lg border border-slate-200 object-cover shadow-sm grayscale"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center grayscale">
                      <CalendarIcon className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-slate-900 line-through decoration-slate-300">
                      {format(new Date(h.holidayDate), "dd MMM yyyy, EEEE")}
                    </p>
                    <p className="text-sm font-medium text-slate-600 mt-0.5">
                      {h.holidayName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {h.holidayDate}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRestoreHoliday(h.holidayDate)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 h-9 px-4 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHolidaysArchive;
