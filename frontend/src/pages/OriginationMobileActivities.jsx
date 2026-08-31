import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw,
  Loader2,
  Calendar,
  ListTodo
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import ActivitySidebar from '../components/calendar/ActivitySidebar';
import EventDetailsSidebar from '../components/calendar/EventDetailsSidebar';
import PageLoader from '../components/PageLoader';

const OriginationMobileActivities = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Detect workspace context
  const isBranchOperations = location.pathname.startsWith('/employee/branch-operations');
  const workspaceScope = isBranchOperations ? 'branch' : 'personal';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [isActivitySidebarOpen, setIsActivitySidebarOpen] = useState(false);
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch activities
  const { data = {}, isLoading, error, refetch, isRefetching } = useQuery({
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

  // Calculate Status Counts
  const statusCounts = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const counts = {
      All: rawEvents.length,
      Today: 0,
      Pending: 0,
      Completed: 0,
      Urgent: 0
    };

    rawEvents.forEach(e => {
      if (e.startDate === todayStr) counts.Today++;
      if (e.status === 'Completed') {
        counts.Completed++;
      } else {
        counts.Pending++;
      }
      if (e.priority === 'Urgent' || e.priority === 'High') {
        counts.Urgent++;
      }
    });

    return counts;
  }, [rawEvents]);

  // Filter Tabs
  const filterTabs = [
    { key: 'All', label: 'All', count: statusCounts.All },
    { key: 'Today', label: 'Today', count: statusCounts.Today },
    { key: 'Pending', label: 'Pending', count: statusCounts.Pending },
    { key: 'Completed', label: 'Done', count: statusCounts.Completed },
    { key: 'Urgent', label: 'Urgent', count: statusCounts.Urgent },
  ];

  // Filtered Activities
  const filteredEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let result = rawEvents;

    // Status filter
    if (selectedStatusFilter !== 'All') {
      result = result.filter(e => {
        if (selectedStatusFilter === 'Today') return e.startDate === todayStr;
        if (selectedStatusFilter === 'Pending') return e.status !== 'Completed';
        if (selectedStatusFilter === 'Completed') return e.status === 'Completed';
        if (selectedStatusFilter === 'Urgent') return e.priority === 'Urgent' || e.priority === 'High';
        return true;
      });
    }

    // Search query filter
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(e => 
        e.title?.toLowerCase().includes(term) ||
        e.notes?.toLowerCase().includes(term) ||
        e.address?.toLowerCase().includes(term) ||
        e.assignedToName?.toLowerCase().includes(term)
      );
    }

    // Sort by start date & time
    return [...result].sort((a, b) => {
      const dateA = `${a.startDate}T${a.startTime || '00:00'}`;
      const dateB = `${b.startDate}T${b.startTime || '00:00'}`;
      return dateB.localeCompare(dateA);
    });
  }, [rawEvents, selectedStatusFilter, searchTerm]);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] shrink-0 shadow-2xs">
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0 shadow-2xs">
            High
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0 shadow-2xs">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0 shadow-2xs">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0 shadow-2xs">
          <CheckCircle2 size={13} /> Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0 shadow-2xs">
        <Clock size={13} /> Scheduled
      </span>
    );
  };

  const handleCardClick = (event) => {
    setSelectedEvent(event);
    setIsDetailsSidebarOpen(true);
  };

  const handleToggleStatus = (e, act) => {
    e.stopPropagation();
    toggleMutation.mutate({ id: act.id, status: act.status });
  };

  return (
    <div className="space-y-4 pb-14">

      {/* 1. Hero Section with Animated Motion Graphics (Exact Match to Dashboard & Leads) */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-sky-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              {isBranchOperations ? (branchInfo?.name ? `${branchInfo.name} Branch` : 'Branch Activities') : 'Origination • Activities & Follow-ups'}
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              All Activities
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              {rawEvents.length} Total Scheduled Tasks
            </p>
          </div>

          <button
            onClick={() => setIsActivitySidebarOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-full text-xs font-bold backdrop-blur-md border border-white/30 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Schedule</span>
          </button>
        </div>
      </section>

      {/* 2. Elevated Content Layer */}
      <div className="relative z-20 -mt-8 mx-0.5 space-y-3.5">

        {/* Search Box */}
        <div className="bg-white rounded-full border border-[#e0e3e7] px-4 py-2.5 shadow-xs flex items-center gap-2.5">
          <Search className="w-4.5 h-4.5 text-[#5f6368] shrink-0" />
          <input
            type="text"
            placeholder="Search activities by title, notes, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-[13.5px] font-medium bg-transparent border-none outline-none text-[#1f1f1f] placeholder:text-[#80868b] placeholder:text-[13px] pr-1"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] shrink-0 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedStatusFilter === tab.key
                  ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold'
                  : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
                selectedStatusFilter === tab.key ? 'bg-[#1a73e8] text-white' : 'bg-slate-100 text-[#5f6368]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Activity Card List */}
        <div className="space-y-3">
          {error ? (
            <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-2xl text-center border border-[#fad2cf] text-xs">
              Failed to load activities. Please refresh or try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[#1a73e8]" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto text-[#80868b]">
                <CalendarDays size={20} />
              </div>
              <p className="text-sm font-bold text-[#1f1f1f]">No activities found</p>
              <p className="text-xs text-[#5f6368]">
                {searchTerm ? 'No results matched your search query.' : 'No scheduled tasks in this category.'}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[#1a73e8] hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              ) : (
                <button
                  onClick={() => setIsActivitySidebarOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] text-white text-xs font-semibold hover:bg-[#1557b0] transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Schedule Activity</span>
                </button>
              )}
            </div>
          ) : (
            filteredEvents.map((act) => {
              const isCompleted = act.status === 'Completed';
              let formattedDate = act.startDate;
              try {
                const parsed = parseISO(act.startDate);
                if (isToday(parsed)) formattedDate = 'Today';
                else if (isTomorrow(parsed)) formattedDate = 'Tomorrow';
                else formattedDate = format(parsed, 'dd MMM yyyy');
              } catch {
                formattedDate = act.startDate;
              }

              return (
                <div 
                  key={act.id} 
                  onClick={() => handleCardClick(act)}
                  className="bg-white rounded-2xl border border-[#e0e3e7] hover:border-[#dadce0] p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[#f8fafd] cursor-pointer space-y-2.5 group"
                >
                  {/* Top Row: Checkbox/Icon, Title & Priority/Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox Status Action */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(e, act)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                            : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] hover:bg-[#d2e3fc]'
                        }`}
                        title={isCompleted ? 'Mark as Scheduled' : 'Mark as Completed'}
                      >
                        {isCompleted ? <Check size={18} strokeWidth={2.5} /> : <CalendarIcon size={18} />}
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <h3 className={`font-bold text-sm truncate group-hover:text-[#1a73e8] transition-colors ${
                          isCompleted ? 'line-through text-[#5f6368]' : 'text-[#1f1f1f]'
                        }`}>
                          {act.title}
                        </h3>
                        {act.notes && (
                          <p className="text-[11px] text-[#5f6368] line-clamp-1">
                            {act.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {getPriorityBadge(act.priority)}
                    </div>
                  </div>

                  {/* Middle/Bottom Row: Address & Date Details */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f1f3f4] text-[11px] text-[#5f6368]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {act.address ? (
                        <>
                          <MapPin size={11} className="text-rose-500 shrink-0" />
                          <span className="truncate">{act.address}</span>
                        </>
                      ) : (
                        <>
                          <Clock size={11} className="text-[#1a73e8] shrink-0" />
                          <span>{act.startTime || 'Time Not Set'}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                      <Calendar size={11} className="text-[#80868b] shrink-0" />
                      <span className="font-semibold text-[#1f1f1f]">{formattedDate}</span>
                      {act.startTime && <span className="text-[#5f6368]">&bull; {act.startTime}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

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

export default OriginationMobileActivities;
