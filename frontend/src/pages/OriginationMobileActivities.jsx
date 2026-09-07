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
  Calendar
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';
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
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

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

  // Module Dynamic Theme
  const theme = useMemo(() => {
    if (isSales) {
      return {
        moduleName: 'Sales',
        tagText: 'ORIGINATION • SALES ACTIVITIES',
        titleAccent: 'text-[#34d399]',
        orbs: ['bg-emerald-600', 'bg-green-600', 'bg-emerald-700'],
        activeChip: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6] shadow-2xs font-bold',
        activeBadgeText: 'bg-[#137333] text-white',
        todayDotColor: '#059669',
        todayBadgeStyle: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
        titleHover: 'group-hover:text-emerald-700',
        clockColor: 'text-[#137333]',
        scheduleBtnHover: 'hover:bg-emerald-700',
        scheduleBtnBg: 'bg-emerald-600',
        primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
        borderHighlight: 'hover:border-emerald-500',
        ringHighlight: 'focus:ring-emerald-500 focus:border-emerald-500'
      };
    }

    if (isBranchOperations) {
      return {
        moduleName: 'Branch',
        tagText: branchInfo?.name ? `${branchInfo.name.toUpperCase()} BRANCH` : 'BRANCH ACTIVITIES',
        titleAccent: 'text-[#38bdf8]',
        orbs: ['bg-blue-500', 'bg-indigo-500', 'bg-sky-400'],
        activeChip: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold',
        activeBadgeText: 'bg-[#1a73e8] text-white',
        todayDotColor: '#1a73e8',
        todayBadgeStyle: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]',
        titleHover: 'group-hover:text-[#1557b0]',
        clockColor: 'text-[#1a73e8]',
        scheduleBtnHover: 'hover:bg-[#1557b0]',
        scheduleBtnBg: 'bg-[#1a73e8]',
        primaryBtn: 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white',
        borderHighlight: 'hover:border-[#1a73e8]',
        ringHighlight: 'focus:ring-[#1a73e8] focus:border-[#1a73e8]'
      };
    }

    // Default Loans Theme
    return {
      moduleName: 'Loans',
      tagText: 'ORIGINATION • LOAN ACTIVITIES',
      titleAccent: 'text-[#38bdf8]',
      orbs: ['bg-blue-500', 'bg-indigo-500', 'bg-sky-400'],
      activeChip: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold',
      activeBadgeText: 'bg-[#1a73e8] text-white',
      todayDotColor: '#1a73e8',
      todayBadgeStyle: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]',
      titleHover: 'group-hover:text-[#1557b0]',
      clockColor: 'text-[#1a73e8]',
      scheduleBtnHover: 'hover:bg-[#1557b0]',
      scheduleBtnBg: 'bg-[#1a73e8]',
      primaryBtn: 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white',
      borderHighlight: 'hover:border-[#1a73e8]',
      ringHighlight: 'focus:ring-[#1a73e8] focus:border-[#1a73e8]'
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

  // Status Counts for Chips
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

    return result;
  }, [rawEvents, selectedStatusFilter, searchTerm]);

  // Format Helpers
  const formatEventTime = (evt) => {
    if (evt.startTime && evt.endTime) {
      return `${evt.startTime} – ${evt.endTime}`;
    }
    return evt.startTime || 'All Day';
  };

  const formatEventDate = (evt) => {
    try {
      const parsed = parseISO(evt.startDate);
      if (isToday(parsed)) return 'Today';
      if (isTomorrow(parsed)) return 'Tomorrow';
      return format(parsed, 'MMM d, yyyy');
    } catch {
      return evt.startDate;
    }
  };

  // Section Grouping with Line Separators
  const sections = useMemo(() => {
    const todayStart = startOfDay(new Date());

    const todayItems = [];
    const upcomingItems = [];
    const completedItems = [];

    filteredEvents.forEach((evt) => {
      if (evt.status === 'Completed') {
        completedItems.push(evt);
        return;
      }

      try {
        const itemDate = parseISO(evt.startDate);
        if (isToday(itemDate)) {
          todayItems.push(evt);
        } else if (itemDate > todayStart) {
          upcomingItems.push(evt);
        } else {
          todayItems.push(evt);
        }
      } catch {
        todayItems.push(evt);
      }
    });

    const result = [];

    if (todayItems.length > 0) {
      result.push({
        id: 'today',
        title: "Today's Schedule",
        dotColor: theme.todayDotColor,
        badge: `${todayItems.length} Today`,
        badgeStyle: theme.todayBadgeStyle,
        items: todayItems,
      });
    }

    if (upcomingItems.length > 0) {
      result.push({
        id: 'upcoming',
        title: 'Upcoming Activities',
        dotColor: '#f29900',
        badge: `${upcomingItems.length} Upcoming`,
        badgeStyle: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',
        items: upcomingItems,
      });
    }

    if (completedItems.length > 0) {
      result.push({
        id: 'completed',
        title: 'Completed Activities',
        dotColor: '#1e8e3e',
        badge: `${completedItems.length} Done`,
        badgeStyle: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
        items: completedItems,
      });
    }

    return result;
  }, [filteredEvents, theme]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0 shadow-2xs">
            <CheckCircle2 size={14} /> Completed
          </span>
        );
      case 'Scheduled':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs ${
            isSales 
              ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' 
              : 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]'
          }`}>
            <Clock size={14} /> Scheduled
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] shrink-0">
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0">
            High
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0">
            Low
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
            isSales 
              ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' 
              : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
          }`}>
            Medium
          </span>
        );
    }
  };

  const handleToggleStatus = (e, act) => {
    e.stopPropagation();
    if (act.status === 'Completed') return;
    toggleMutation.mutate({ id: act.id, status: act.status });
  };

  // Render Full-Page Mobile Creation Form when in create mode
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

  // Render Activities Feed
  return (
    <div className="space-y-4 pb-14 select-none font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Clean White Header (Direct Page Layout) */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            {theme.tagText}
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              All <span className={`font-medium italic ${isSales ? 'text-[#137333]' : isBranchOperations ? 'text-[#7C4DFF]' : 'text-[#1a73e8]'}`}>Activities</span>
            </h2>

            <button
              onClick={() => setViewMode('create')}
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Schedule</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1">
            {rawEvents.length} Total Scheduled Tasks
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 mx-0.5 space-y-3.5">

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
                  ? theme.activeChip
                  : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
                selectedStatusFilter === tab.key ? theme.activeBadgeText : 'bg-slate-100 text-[#5f6368]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sectional Groups with Line Separators & Cards */}
        <div className="space-y-6 pt-1">
          {error ? (
            <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-2xl text-center border border-[#fad2cf] text-xs">
              Failed to load activities. Please refresh or try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className={`animate-spin h-7 w-7 ${isSales ? 'text-emerald-600' : 'text-[#1a73e8]'}`} />
            </div>
          ) : sections.length === 0 ? (
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
                  className={`mt-2 inline-flex items-center text-xs font-semibold ${isSales ? 'text-emerald-600' : 'text-[#1a73e8]'} hover:underline cursor-pointer`}
                >
                  Clear search query
                </button>
              ) : (
                <button
                  onClick={() => setViewMode('create')}
                  className={`mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-semibold ${theme.scheduleBtnBg} ${theme.scheduleBtnHover} transition-colors cursor-pointer`}
                >
                  <Plus size={14} />
                  <span>Schedule Activity</span>
                </button>
              )}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="space-y-3">
                
                {/* Line Separator Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#dadce0]/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.dotColor }} />
                    <h3 className="text-sm font-bold text-[#1f1f1f]">
                      {section.title}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${section.badgeStyle}`}>
                    {section.badge}
                  </span>
                </div>

                {/* Cards List in this Section */}
                <div className="space-y-3">
                  {section.items.map((act) => {
                    const isCompleted = act.status === 'Completed';

                    return (
                      <div 
                        key={act.id} 
                        onClick={() => setSelectedEvent(act)}
                        className="bg-white rounded-2xl border border-[#e0e3e7] hover:border-[#dadce0] p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[#f8fafd] cursor-pointer space-y-2.5 group"
                      >
                        {/* Top Row: Left Round Tickmark Box + Title & Subtitle, Right: Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Round Action / Tickmark Box */}
                            <button
                              type="button"
                              disabled={isCompleted}
                              onClick={(e) => handleToggleStatus(e, act)}
                              className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border transition-all ${
                                isCompleted
                                  ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6] cursor-default'
                                  : isSales
                                    ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6] hover:bg-emerald-100 cursor-pointer active:scale-95'
                                    : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] hover:bg-blue-100 cursor-pointer active:scale-95'
                              }`}
                              title={isCompleted ? 'Completed' : 'Click to complete'}
                            >
                              {isCompleted ? (
                                <Check size={18} strokeWidth={2.5} />
                              ) : (
                                <Clock size={17} />
                              )}
                            </button>

                            {/* Title & Time Subtitle */}
                            <div className="min-w-0 space-y-0.5 flex-1">
                              <h3 className={`font-bold text-[#1f1f1f] text-sm truncate transition-colors ${
                                isCompleted 
                                  ? 'line-through text-[#80868b]' 
                                  : isSales
                                    ? 'group-hover:text-emerald-700'
                                    : 'group-hover:text-[#1a73e8]'
                              }`}>
                                {act.title}
                              </h3>
                              <div className="flex items-center gap-2 text-[10.5px] text-[#5f6368]">
                                <span className="inline-flex items-center gap-1 font-medium text-[#5f6368]">
                                  <Clock size={10} className="text-[#80868b]" />
                                  {formatEventTime(act)}
                                </span>
                                {isBranchOperations && act.assignedToName && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate text-[#1a73e8] font-semibold">{act.assignedToName}</span>
                                  </>
                                )}
                              </div>

                              {/* Notes directly below the time without card format */}
                              {act.notes && (
                                <p className="text-[11px] text-[#5f6368] line-clamp-1 italic pt-0.5">
                                  "{act.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Top Right Status Badge (Matching Leads page badges) */}
                          <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                            {getStatusBadge(act.status)}
                          </div>
                        </div>

                        {/* Bottom Row: Location & Date Details (Matching Leads page layout) */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f1f3f4] text-[11px] text-[#5f6368]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin size={11} className="text-[#80868b] shrink-0" />
                            <span className="truncate">{act.address || 'Location Not Specified'}</span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                            <Calendar size={11} className="text-[#80868b] shrink-0" />
                            <span>{formatEventDate(act)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Mobile Activity Details Popup Modal */}
      <MobileActivityDetailsModal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onToggleStatus={(act) => toggleMutation.mutate({ id: act.id, status: act.status })}
        getPriorityBadge={getPriorityBadge}
      />

    </div>
  );
};

export default OriginationMobileActivities;
