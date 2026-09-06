import React from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Calendar as CalendarIcon, Loader2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminHolidaysArchive = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: archivedHolidays = [],
    isLoading: loading
  } = useQuery({
    queryKey: ['admin', 'holidays-archive'],
    queryFn: async () => {
      const response = await api.get('/admin/holidays/archived');
      return response.data;
    }
  });

  const restoreHolidayMutation = useMutation({
    mutationFn: async (dateStr) => {
      return api.put(`/admin/holidays/${dateStr}/restore`);
    },
    onSuccess: () => {
      toast.success('Holiday restored successfully');
      queryClient.invalidateQueries({
        queryKey: ['admin', 'holidays-archive']
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'holidays']
      });
    },
    onError: () => {
      toast.error('Failed to restore holiday');
    }
  });

  const handleRestoreHoliday = async (dateStr) => {
    await restoreHolidayMutation.mutateAsync(dateStr);
  };

  if (loading) return <PageLoader message="Loading Archived Holidays..." />;

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Company Calendar &amp; Archive</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Archived <span className="font-medium italic text-[#1a73e8]">Holidays</span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{archivedHolidays.length} Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Audit and restore soft-deleted holiday observances back to active company schedules.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/holidays')}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" />
          <span>Back to Holidays</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#1f1f1f]">Previously Removed Holidays</h2>
            <p className="text-[11px] text-[#5f6368] mt-0.5">Restoring these dates will reactivate them across employee calendars.</p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1a73e8]" /></div>
          ) : archivedHolidays.length === 0 ? (
            <div className="text-center py-12 text-[#5f6368] bg-[#f8fafd] rounded-2xl border border-dashed border-[#dadce0]">
              <CalendarIcon className="w-8 h-8 text-[#5f6368]/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-[#1f1f1f]">No archived holidays</p>
              <p className="text-xs text-[#5f6368] mt-0.5">All created holidays are currently active in the calendar.</p>
            </div>
          ) : (
            archivedHolidays.map((h, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-[#e0e3e7] bg-white p-4 shadow-2xs hover:shadow-xs transition-all gap-4">
                <div className="flex items-center gap-3.5">
                  {h.holidayImage ? (
                    <img src={h.holidayImage} alt={h.holidayName} className="h-12 w-12 rounded-xl border border-[#e0e3e7] object-cover shadow-2xs grayscale" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl border border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-center text-[#5f6368]">
                      <CalendarIcon className="w-5 h-5 text-[#5f6368]" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[#1f1f1f] line-through decoration-[#dadce0]">
                      {format(new Date(h.holidayDate), 'dd MMM yyyy, EEEE')}
                    </p>
                    <p className="text-xs font-medium text-[#5f6368] mt-0.5">{h.holidayName}</p>
                    <p className="text-[11px] text-[#5f6368]/70 mt-0.5 font-mono">{h.holidayDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRestoreHoliday(h.holidayDate)}
                  disabled={restoreHolidayMutation.isPending}
                  className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#d2e3fc] bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-2xs self-start sm:self-auto disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Holiday</span>
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
