import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  Calendar as CalendarIcon, 
  Search, 
  X, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  MapPin,
  User,
  Building2,
  ChevronRight,
  Filter,
  Check,
  CalendarDays,
  Sparkles,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import ActivitySidebar from '../components/calendar/ActivitySidebar';
import EventDetailsSidebar from '../components/calendar/EventDetailsSidebar';
import PageLoader from '../components/PageLoader';

const OriginationMobileActivities = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  // Detect workspace context
  const isBranchOperations = location.pathname.startsWith('/employee/branch-operations');
  const workspaceScope = isBranchOperations ? 'branch' : 'personal';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL', 'TODAY', 'PENDING', 'COMPLETED', 'URGENT'
  const [isActivitySidebarOpen, setIsActivitySidebarOpen] = useState(false);
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch activities
  const { data = {}, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['origination', 'activities', workspaceScope],
    queryFn: async () => {
      const response = await api.get('/origination/activities', {
        params: { scope: workspaceScope }
      });
      return response.data || {};
    }
  });

  const events = data.activities || [];
  const branchInfo = data.branch || null;
  const assignableEmployees = data.assignableEmployees || [];

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
      setIsActivitySidebarOpen(false);
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
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to update activity status';
      toast.error(errMsg);
    }
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ id, assignedTo }) => {
      const response = await api.patch(`/origination/activities/${id}/reassign`, { assignedTo });
      return response.data?.activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['origination', 'activities'] });
      toast.success('Activity reassigned successfully');
      setIsDetailsSidebarOpen(false);
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to reassign activity';
      toast.error(errMsg);
    }
  });

  // Calculate Metrics
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    let todayCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let urgentCount = 0;

    events.forEach(e => {
      if (e.startDate === todayStr) todayCount++;
      if (e.status === 'Completed') {
        completedCount++;
      } else {
        pendingCount++;
      }
      if (e.priority === 'Urgent' || e.priority === 'High') {
        urgentCount++;
      }
    });

    return {
      total: events.length,
      today: todayCount,
      pending: pendingCount,
      completed: completedCount,
      urgent: urgentCount
    };
  }, [events]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let list = events;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        e.title?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.address?.toLowerCase().includes(q) ||
        e.assignedToName?.toLowerCase().includes(q)
      );
    }

    // Status / Category filter
    if (selectedFilter === 'TODAY') {
      list = list.filter(e => e.startDate === todayStr);
    } else if (selectedFilter === 'PENDING') {
      list = list.filter(e => e.status !== 'Completed');
    } else if (selectedFilter === 'COMPLETED') {
      list = list.filter(e => e.status === 'Completed');
    } else if (selectedFilter === 'URGENT') {
      list = list.filter(e => e.priority === 'Urgent' || e.priority === 'High');
    }

    // Sort by start date & time (most recent / upcoming first)
    return [...list].sort((a, b) => {
      const dateA = `${a.startDate}T${a.startTime || '00:00'}`;
      const dateB = `${b.startDate}T${b.startTime || '00:00'}`;
      return dateB.localeCompare(dateA);
    });
  }, [events, searchQuery, selectedFilter]);

  // Grouping by Date bucket for clean list
  const groupedEvents = useMemo(() => {
    const groups = {
      today: [],
      upcoming: [],
      pastOrDone: []
    };

    const todayStart = startOfDay(new Date());

    filteredEvents.forEach(e => {
      try {
        const itemDate = parseISO(e.startDate);
        if (isToday(itemDate)) {
          groups.today.push(e);
        } else if (itemDate > todayStart && e.status !== 'Completed') {
          groups.upcoming.push(e);
        } else {
          groups.pastOrDone.push(e);
        }
      } catch (err) {
        groups.pastOrDone.push(e);
      }
    });

    return groups;
  }, [filteredEvents]);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            High
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            Medium
          </span>
        );
    }
  };

  const handleCardClick = (event) => {
    setSelectedEvent(event);
    setIsDetailsSidebarOpen(true);
  };

  const handleToggleStatus = (e, act) => {
    e.stopPropagation();
    toggleMutation.mutate({ id: act.id, status: act.status });
  };

  if (isLoading) {
    return <PageLoader message="Loading Activities..." />;
  }

  return (
    <div className="space-y-4 pb-20">
      
      {/* 1. Header Bar (Google Material 3 Workspace UI) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                {isBranchOperations ? 'Branch Activities' : 'Activities & Schedule'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight flex items-center gap-2">
              <span>{isBranchOperations ? 'Branch Calendar' : 'My Activities'}</span>
              <span className="text-[11px] font-bold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
                {stats.total}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={isRefetching ? 'animate-spin text-[#1a73e8]' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setIsActivitySidebarOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={14} />
              <span>Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Grid (4 Mini Stat Cards matching Leads UI) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Today */}
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'TODAY'
              ? 'bg-[#e8f0fe] border-[#1a73e8] ring-1 ring-[#1a73e8]'
              : 'bg-white border-[#e0e3e7] hover:bg-[#f8fafd]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8]">Today</span>
            <div className="w-6 h-6 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Clock size={13} />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1f1f1f] mt-1.5">{stats.today}</p>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'PENDING'
              ? 'bg-[#fef7e0] border-[#b06000] ring-1 ring-[#b06000]'
              : 'bg-white border-[#e0e3e7] hover:bg-[#f8fafd]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#b06000]">Pending</span>
            <div className="w-6 h-6 rounded-lg bg-[#fef7e0] text-[#b06000] flex items-center justify-center">
              <Circle size={13} />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1f1f1f] mt-1.5">{stats.pending}</p>
        </div>

        {/* Completed */}
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'COMPLETED'
              ? 'bg-[#e6f4ea] border-[#137333] ring-1 ring-[#137333]'
              : 'bg-white border-[#e0e3e7] hover:bg-[#f8fafd]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#137333]">Completed</span>
            <div className="w-6 h-6 rounded-lg bg-[#e6f4ea] text-[#137333] flex items-center justify-center">
              <CheckCircle2 size={13} />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1f1f1f] mt-1.5">{stats.completed}</p>
        </div>

        {/* Urgent / High */}
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'URGENT' ? 'ALL' : 'URGENT')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'URGENT'
              ? 'bg-[#fce8e6] border-[#c5221f] ring-1 ring-[#c5221f]'
              : 'bg-white border-[#e0e3e7] hover:bg-[#f8fafd]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c5221f]">Urgent / High</span>
            <div className="w-6 h-6 rounded-lg bg-[#fce8e6] text-[#c5221f] flex items-center justify-center">
              <AlertCircle size={13} />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1f1f1f] mt-1.5">{stats.urgent}</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f6368] w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities, locations, notes..."
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#dadce0] rounded-full text-xs text-[#1f1f1f] placeholder:text-[#5f6368] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#1f1f1f]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills (Scrollable Row) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'ALL', label: 'All', count: stats.total },
            { id: 'TODAY', label: 'Today', count: stats.today },
            { id: 'PENDING', label: 'Pending', count: stats.pending },
            { id: 'COMPLETED', label: 'Done', count: stats.completed },
            { id: 'URGENT', label: 'Urgent', count: stats.urgent }
          ].map((f) => {
            const isSelected = selectedFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a73e8] text-white shadow-2xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Activities Feed */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mx-auto">
              <CalendarDays size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1f1f1f]">No Activities Found</h3>
              <p className="text-xs text-[#5f6368] mt-1 max-w-xs mx-auto">
                {searchQuery 
                  ? `No activities match "${searchQuery}". Try a different search term.` 
                  : 'No scheduled activities found for this filter.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActivitySidebarOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] text-white shadow-xs hover:bg-[#1557b0] transition-all cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>Schedule Activity</span>
            </button>
          </div>
        ) : (
          <>
            {/* Today Group */}
            {groupedEvents.today.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1a73e8] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1a73e8] animate-pulse" />
                    Today ({groupedEvents.today.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {groupedEvents.today.map((act) => (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      onClick={() => handleCardClick(act)}
                      onToggle={(e) => handleToggleStatus(e, act)}
                      getPriorityBadge={getPriorityBadge}
                      isBranchOperations={isBranchOperations}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Group */}
            {groupedEvents.upcoming.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5f6368]">
                    Upcoming ({groupedEvents.upcoming.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {groupedEvents.upcoming.map((act) => (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      onClick={() => handleCardClick(act)}
                      onToggle={(e) => handleToggleStatus(e, act)}
                      getPriorityBadge={getPriorityBadge}
                      isBranchOperations={isBranchOperations}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past / Completed Group */}
            {groupedEvents.pastOrDone.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5f6368]">
                    Completed &amp; Past ({groupedEvents.pastOrDone.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {groupedEvents.pastOrDone.map((act) => (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      onClick={() => handleCardClick(act)}
                      onToggle={(e) => handleToggleStatus(e, act)}
                      getPriorityBadge={getPriorityBadge}
                      isBranchOperations={isBranchOperations}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Activity Creation Slideover Drawer */}
      <ActivitySidebar
        isOpen={isActivitySidebarOpen}
        onClose={() => setIsActivitySidebarOpen(false)}
        onSave={(payload) => createMutation.mutate(payload)}
        assignableEmployees={assignableEmployees}
        showAssigneeSelector={isBranchOperations}
      />

      {/* Event Details Slideover Drawer */}
      <EventDetailsSidebar
        isOpen={isDetailsSidebarOpen}
        onClose={() => {
          setIsDetailsSidebarOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onToggleComplete={(id, status) => toggleMutation.mutate({ id, status })}
        onReassign={(id, assignedTo) => reassignMutation.mutate({ id, assignedTo })}
        assignableEmployees={assignableEmployees}
      />
    </div>
  );
};

// Activity Card Component
const ActivityCard = ({ activity, onClick, onToggle, getPriorityBadge, isBranchOperations }) => {
  const isCompleted = activity.status === 'Completed';

  const formattedDate = useMemo(() => {
    try {
      const parsed = parseISO(activity.startDate);
      if (isToday(parsed)) return 'Today';
      if (isTomorrow(parsed)) return 'Tomorrow';
      return format(parsed, 'MMM d, yyyy');
    } catch {
      return activity.startDate;
    }
  }, [activity.startDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative shadow-2xs ${
        isCompleted
          ? 'bg-slate-50 border-[#e0e3e7] opacity-80'
          : 'bg-white border-[#e0e3e7] hover:border-[#1a73e8] hover:shadow-xs'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox Status Button */}
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isCompleted
              ? 'bg-[#137333] text-white'
              : 'border-2 border-[#dadce0] hover:border-[#1a73e8] text-transparent hover:text-[#1a73e8]'
          }`}
          title={isCompleted ? 'Mark as Scheduled' : 'Mark as Completed'}
        >
          <Check size={13} strokeWidth={3} />
        </button>

        {/* Card Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-xs sm:text-sm font-bold truncate ${
              isCompleted ? 'line-through text-[#5f6368]' : 'text-[#1f1f1f]'
            }`}>
              {activity.title}
            </h4>
            <div className="shrink-0">
              {getPriorityBadge(activity.priority)}
            </div>
          </div>

          {/* Notes description */}
          {activity.notes && (
            <p className="text-[11px] text-[#5f6368] line-clamp-1 mt-0.5">
              {activity.notes}
            </p>
          )}

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10.5px] text-[#5f6368]">
            <span className="inline-flex items-center gap-1 font-medium text-[#1f1f1f]">
              <Clock size={12} className="text-[#1a73e8]" />
              <span>{formattedDate}</span>
              {activity.startTime && (
                <span>• {activity.startTime}</span>
              )}
            </span>

            {activity.address && (
              <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                <MapPin size={12} className="text-rose-500 shrink-0" />
                <span className="truncate">{activity.address}</span>
              </span>
            )}

            {isBranchOperations && activity.assignedToName && (
              <span className="inline-flex items-center gap-1 text-[#1a73e8] bg-[#e8f0fe] px-1.5 py-0.2 rounded-full font-medium text-[10px]">
                <User size={10} />
                <span>{activity.assignedToName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Arrow */}
        <div className="self-center text-slate-400 shrink-0">
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  );
};

export default OriginationMobileActivities;
