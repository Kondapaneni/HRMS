import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SearchBar from '../components/ui/SearchBar';
import { 
  Calendar as CalendarIcon, 
  Search, 
  X, 
  Plus, 
  Clock, 
  CheckCircle2, 
  MapPin,
  Check,
  CalendarDays,
  Loader2,
  Calendar,
  AlertCircle,
  User,
  ChevronLeft,
  ChevronRight,
  Circle,
  List,
  Grid
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  isToday, 
  isTomorrow, 
  startOfDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { MobileActivityCreatePage, MobileActivityDetailsModal } from '../components/calendar/MobileActivityModals';

const OriginationMobileActivities = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Detect module context
  const isSales = location.pathname.startsWith('/employee/sales');
  const isBranchOperations = location.pathname.startsWith('/employee/branch-operations');
  const workspaceScope = isBranchOperations ? 'branch' : 'personal';

  // View state: 'list' | 'create'
  const [viewMode, setViewMode] = useState('list');
  const [mobileTab, setMobileTab] = useState('calendar'); // 'calendar' | 'all'
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Calendar dates
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Lock body scroll and hide bottom navigation dock when modal or create page is active
  useEffect(() => {
    if (selectedEvent || viewMode === 'create') {
      document.body.classList.add('hide-mobile-nav');
      if (selectedEvent) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [selectedEvent, viewMode]);

  // Fetch activities
  const { data = {}, isLoading, error } = useQuery({
    queryKey: ['origination', 'activities', workspaceScope],
    queryFn: async () => {
      const response = await api.get('/origination/activities', {
        params: { scope: workspaceScope }
      });
      return response.data || {};
    }
  });

  const rawEvents = data.activities || [];
  const branchInfo = data.branch || null;
  const assignableEmployees = data.assignableEmployees || [];

  // Theme styling (preserving existing color palette)
  const theme = useMemo(() => {
    if (isSales) {
      return {
        moduleName: 'Sales',
        tagText: 'SALES ORIGINATION',
        titleAccent: 'text-[var(--accent-pink-deep)]',
        accentColor: '#E3B9DF',
        brandDeep: 'var(--accent-pink-deep)',
        brandTint: 'var(--accent-pink-tint)',
        activeChip: 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B]',
      };
    }
    if (isBranchOperations) {
      return {
        moduleName: 'Branch',
        tagText: branchInfo?.name ? `${branchInfo.name.toUpperCase()} BRANCH` : 'BRANCH ACTIVITIES',
        titleAccent: 'text-[var(--branch-deep)]',
        accentColor: '#2DD4BF',
        brandDeep: 'var(--branch-deep)',
        brandTint: 'var(--branch-tint)',
        activeChip: 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B]',
      };
    }
    return {
      moduleName: 'Loans',
      tagText: 'LOAN ORIGINATION',
      titleAccent: 'text-[var(--brand-deep)]',
      accentColor: '#8AADDB',
      brandDeep: 'var(--brand-deep)',
      brandTint: 'var(--brand-tint)',
      activeChip: 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B]',
    };
  }, [isSales, isBranchOperations, branchInfo]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/origination/activities', payload);
      return response.data?.activity;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['origination', 'activities'] });
      const assignedCount = Array.isArray(variables?.assignedTo) ? variables.assignedTo.length : 1;
      toast.success(assignedCount > 1 
        ? `Activities scheduled for ${assignedCount} team members`
        : 'Activity scheduled successfully'
      );
      setViewMode('list');
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to schedule activity';
      toast.error(errMsg, { duration: 4000 });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.patch(`/origination/activities/${id}/toggle-status`, { currentStatus: status });
      return response.data?.activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['origination', 'activities'] });
      toast.success('Activity status updated');
      if (selectedEvent) {
        setSelectedEvent(prev => prev ? ({ ...prev, status: prev.status === 'Completed' ? 'Scheduled' : 'Completed' }) : null);
      }
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to update activity status';
      toast.error(errMsg);
    }
  });

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map = new Map();
    rawEvents.forEach(e => {
      if (!e.startDate) return;
      const key = typeof e.startDate === 'string' ? e.startDate.split('T')[0] : '';
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return map;
  }, [rawEvents]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

  // Filtered all events
  const filteredAllEvents = useMemo(() => {
    let result = rawEvents;
    if (statusFilter === 'Today') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      result = result.filter(e => e.startDate === todayStr);
    } else if (statusFilter === 'Pending') {
      result = result.filter(e => e.status !== 'Completed');
    } else if (statusFilter === 'Completed') {
      result = result.filter(e => e.status === 'Completed');
    } else if (statusFilter === 'Urgent') {
      result = result.filter(e => e.priority === 'Urgent' || e.priority === 'High');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(e => 
        e.title?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.address?.toLowerCase().includes(q)
      );
    }

    // Sort by Date ascending, then Time ascending
    return [...result].sort((a, b) => {
      const dateA = typeof a.startDate === 'string' ? a.startDate.split('T')[0] : '';
      const dateB = typeof b.startDate === 'string' ? b.startDate.split('T')[0] : '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [rawEvents, statusFilter, searchTerm]);

  const formatEventTime = (evt) => {
    if (evt.allDay) return 'All Day';
    if (!evt.startTime) return 'All Day';
    if (evt.endTime && evt.endTime !== evt.startTime) {
      return `${evt.startTime} – ${evt.endTime}`;
    }
    return evt.startTime;
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4]">Urgent</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#FDF3DC] text-[#B7791F] border border-[#FCE6B8]">High</span>;
      case 'Low':
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#EFEFF1] text-[#4A4A52] border border-[#E3E3E7]">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC]">Medium</span>;
    }
  };

  const getEventPillStyle = (evt) => {
    if (evt.status === 'Completed') {
      return 'border-l-4 border-l-[#1F9D55] bg-[#E6F6EC]/30';
    }
    switch (evt.priority) {
      case 'Urgent':
        return 'border-l-4 border-l-[#D64550] bg-[#FDE8EA]/30';
      case 'High':
        return 'border-l-4 border-l-[#B7791F] bg-[#FDF3DC]/30';
      case 'Low':
        return 'border-l-4 border-l-[#9CA3AF] bg-[var(--surface)]';
      default:
        return 'border-l-4 border-l-[#3B6FB6] bg-[#E8F0FB]/30';
    }
  };

  if (viewMode === 'create') {
    return (
      <MobileActivityCreatePage
        isOpen={true}
        onClose={() => setViewMode('list')}
        onSave={(payload) => createMutation.mutate(payload)}
        isSales={isSales}
        isBranchOperations={isBranchOperations}
        assignableEmployees={assignableEmployees}
        theme={theme}
        isSubmitting={createMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4 pb-14 select-none font-sans antialiased">
      
      {/* Header Bar */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            {theme.tagText}
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Activities &amp; <span className={theme.titleAccent}>Calendar</span>
            </h2>

            <button
              type="button"
              onClick={() => setViewMode('create')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} strokeWidth={2.2} />
              <span>Schedule</span>
            </button>
          </div>
        </div>
      </section>

      {/* Segmented View Switcher: Calendar vs All Tasks */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center p-1 rounded-full bg-[var(--surface-alt)] border border-[var(--line)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('calendar')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              mobileTab === 'calendar'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-bold'
                : 'text-[var(--muted)]'
            }`}
          >
            Calendar View
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('all')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              mobileTab === 'all'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-bold'
                : 'text-[var(--muted)]'
            }`}
          >
            All Tasks ({rawEvents.length})
          </button>
        </div>

        {mobileTab === 'calendar' && (
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCurrentDate(now);
              setSelectedDate(now);
            }}
            className="px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--text)] shadow-2xs"
          >
            Today
          </button>
        )}
      </div>

      {/* TAB 1: Calendar Experience (Matching User Design) */}
      {mobileTab === 'calendar' && (
        <div className="space-y-4">
          
          {/* Calendar Month Navigation Box */}
          <div className="bg-[var(--surface)] rounded-[22px] border border-[var(--line)] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)] tracking-tight">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
                  className="w-8 h-8 rounded-full border border-[var(--line)] hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
                  className="w-8 h-8 rounded-full border border-[var(--line)] hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Weekday headers S M T W T F S */}
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[var(--muted)] py-1">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>

            {/* Month Day Grid */}
            <div className="grid grid-cols-7 text-center gap-y-1">
              {calendarDays.map((day, idx) => {
                const isCurrMonth = isSameMonth(day, currentDate);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const dayKey = format(day, 'yyyy-MM-dd');
                const hasEvents = (eventsByDate.get(dayKey) || []).length > 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={`relative w-8.5 h-8.5 mx-auto rounded-full flex flex-col items-center justify-center text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--brand)] text-white font-bold shadow-2xs'
                        : isTodayDate
                        ? 'border border-[var(--brand)] text-[var(--brand-deep)] font-semibold'
                        : isCurrMonth
                        ? 'text-[var(--text)] hover:bg-[var(--surface-alt)] font-medium'
                        : 'text-[var(--muted)]/40 hover:bg-[var(--surface-alt)]/30'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {hasEvents && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[var(--brand)] mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agenda of Selected Day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h4 className="text-sm font-bold text-[var(--text)]">
                  {format(selectedDate, 'EEEE, MMM d')}
                </h4>
                <p className="text-[11px] text-[var(--muted)]">
                  {selectedDateEvents.length} Tasks Scheduled
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('create')}
                className="text-xs font-semibold text-[var(--brand-deep)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> Add task
              </button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-6 text-center space-y-2">
                <p className="text-xs font-semibold text-[var(--muted)]">No tasks scheduled for this day</p>
                <button
                  type="button"
                  onClick={() => setViewMode('create')}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-[var(--ink)] text-white shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus size={13} /> Schedule for this day
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDateEvents.map(evt => {
                  const isCompleted = evt.status === 'Completed';

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-4 shadow-xs transition-all active:scale-[0.99] cursor-pointer space-y-2.5 ${getEventPillStyle(evt)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Complete tick button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMutation.mutate({ id: evt.id, status: evt.status });
                            }}
                            className={`w-8 h-8 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                              isCompleted
                                ? 'bg-[#E6F6EC] text-[#1F9D55] border-[#CEEAD6]'
                                : 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--brand)]'
                            }`}
                          >
                            {isCompleted ? <Check size={14} strokeWidth={2.5} /> : <Circle size={14} />}
                          </button>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>
                              {evt.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                              <span className="flex items-center gap-1 font-medium text-[var(--text)]">
                                <Clock size={11} className="text-[var(--brand-deep)]" />
                                {formatEventTime(evt)}
                              </span>
                              {evt.address && (
                                <>
                                  <span>&bull;</span>
                                  <span className="truncate">{evt.address}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {getPriorityBadge(evt.priority)}
                        </div>
                      </div>

                      {evt.notes && (
                        <div className="text-[11px] text-[var(--muted)] line-clamp-1 italic bg-[var(--surface-alt)] px-2.5 py-1 rounded-[8px]">
                          "{evt.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: All Tasks List with Search & Filters */}
      {mobileTab === 'all' && (
        <div className="space-y-3.5">
          <SearchBar
            placeholder="Search activities by title, notes, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
          />

          {/* Filter Pills */}
          <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
            {['All', 'Today', 'Pending', 'Completed', 'Urgent'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  statusFilter === f
                    ? theme.activeChip
                    : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredAllEvents.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[var(--text)]">No activities found</p>
              <p className="text-xs text-[var(--muted)]">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAllEvents.map(evt => {
                const isCompleted = evt.status === 'Completed';

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-4 shadow-xs transition-all active:scale-[0.99] cursor-pointer space-y-2.5 ${getEventPillStyle(evt)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMutation.mutate({ id: evt.id, status: evt.status });
                          }}
                          className={`w-8 h-8 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                            isCompleted
                              ? 'bg-[#E6F6EC] text-[#1F9D55] border-[#CEEAD6]'
                              : 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)]'
                          }`}
                        >
                          {isCompleted ? <Check size={14} strokeWidth={2.5} /> : <Circle size={14} />}
                        </button>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>
                            {evt.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                            <span>{evt.startDate}</span>
                            <span>&bull;</span>
                            <span>{formatEventTime(evt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {getPriorityBadge(evt.priority)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mobile Activity Details Popup Modal */}
      <MobileActivityDetailsModal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        isSales={isSales}
        isBranchOperations={isBranchOperations}
        onToggleStatus={(act) => toggleMutation.mutate({ id: act.id, status: act.status })}
        getPriorityBadge={getPriorityBadge}
      />

    </div>
  );
};

export default OriginationMobileActivities;
