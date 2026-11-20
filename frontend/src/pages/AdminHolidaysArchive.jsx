import React from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Calendar as CalendarIcon, Loader2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useRemoteData, useRemoteTask, useRefreshControl } from '../state/remote.js';
import { Button } from '../components/ui';

const AdminHolidaysArchive = () => {
  const navigate = useNavigate();
  const refreshControl = useRefreshControl();

  const {
    data: archivedHolidays = [],
    isLoading: loading
  } = useRemoteData({
    scope: ['admin', 'holidays-archive'],
    load: async () => {
      const response = await api.get('/admin/holidays/archived');
      return response.data;
    }
  });

  const restoreHolidayMutation = useRemoteTask({
    run: async (dateStr) => {
      return api.put(`/admin/holidays/${dateStr}/restore`);
    },
    onSuccess: () => {
      toast.success('Holiday restored successfully');
      refreshControl.refresh({
        scope: ['admin', 'holidays-archive']
      });
      refreshControl.refresh({
        scope: ['admin', 'holidays']
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
    <div className="space-y-4 pb-12 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)] flex items-center gap-2">
            Archived Holidays
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Audit and restore soft-deleted holiday observances back to active company schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {archivedHolidays.length} Records
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/holidays')}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Back to Holidays</span>
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
        <div className="pb-4 border-b border-[var(--line)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">Previously Removed Holidays</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">Restoring these dates will reactivate them across employee calendars.</p>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-deep)]" /></div>
          ) : archivedHolidays.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)] bg-[var(--surface-alt)] rounded-[16px] border border-dashed border-[var(--line)]">
              <CalendarIcon className="w-8 h-8 text-[var(--icon-muted)] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[var(--text)]">No archived holidays</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">All created holidays are currently active in the calendar.</p>
            </div>
          ) : (
            archivedHolidays.map((h, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[16px] border border-[var(--line)] bg-[var(--surface-alt)] p-4 transition-all gap-4">
                <div className="flex items-center gap-3.5">
                  {h.holidayImage ? (
                    <img src={h.holidayImage} alt={h.holidayName} className="h-12 w-12 rounded-[12px] border border-[var(--line)] object-cover shadow-2xs grayscale" />
                  ) : (
                    <div className="h-12 w-12 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--muted)]">
                      <CalendarIcon className="w-5 h-5 text-[var(--icon-muted)]" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)] line-through decoration-[var(--line)]">
                      {format(new Date(h.holidayDate), 'dd MMM yyyy, EEEE')}
                    </p>
                    <p className="text-xs font-medium text-[var(--muted)] mt-0.5">{h.holidayName}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5 font-mono">{h.holidayDate}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRestoreHoliday(h.holidayDate)}
                  disabled={restoreHolidayMutation.isPending}
                  className="self-start sm:self-auto text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Restore Holiday</span>
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHolidaysArchive;