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
  Calendar
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, startOfDay } from 'date-fns';
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

  // Module Dynamic Theme
  const theme = useMemo(() => {
    if (isSales) {
      return {
        moduleName: 'Sales',
        tagText: 'ORIGINATION • SALES ACTIVITIES',
        titleAccent: 'text-[var(--accent-pink-deep)]',
        activeChip: 'bg-[var(--ink)] text-white border-[var(--ink)] shadow-2xs font-semibold',
        activeBadgeText: 'bg-[var(--surface)] text-[var(--ink)]',
        todayDotColor: '#A25C9B',
        todayBadgeStyle: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border-[var(--accent-pink)]/20',
        titleHover: 'group-hover:text-[var(--accent-pink-deep)]',
        clockColor: 'text-[var(--accent-pink-deep)]',
        scheduleBtnHover: 'hover:bg-[var(--ink-2)]',
        scheduleBtnBg: 'bg-[var(--ink)]',
        primaryBtn: 'bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white',
        borderHighlight: 'hover:border-[var(--accent-pink)]',
        ringHighlight: 'focus:ring-[var(--accent-pink)] focus:border-[var(--accent-pink)]'
      };
    }

    if (isBranchOperations) {
      return {
        moduleName: 'Branch',
        tagText: branchInfo?.name ? `${branchInfo.name.toUpperCase()} BRANCH` : 'BRANCH ACTIVITIES',
        titleAccent: 'text-[var(--branch-deep)]',
        activeChip: 'bg-[var(--ink)] text-white border-[var(--ink)] shadow-2xs font-semibold',
        activeBadgeText: 'bg-[var(--surface)] text-[var(--ink)]',
        todayDotColor: '#14B8A6',
        todayBadgeStyle: 'bg-[var(--branch-tint)] text-[var(--branch-deep)] border-[var(--branch)]/20',
        titleHover: 'group-hover:text-[var(--branch-deep)]',
        clockColor: 'text-[var(--branch-deep)]',
        scheduleBtnHover: 'hover:bg-[var(--ink-2)]',
        scheduleBtnBg: 'bg-[var(--ink)]',
        primaryBtn: 'bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white',
        borderHighlight: 'hover:border-[var(--branch)]',
        ringHighlight: 'focus:ring-[var(--branch)] focus:border-[var(--branch)]'
      };
    }

    // Default Loans Theme
    return {
      moduleName: 'Loans',
      tagText: 'ORIGINATION • LOAN ACTIVITIES',
      titleAccent: 'text-[var(--brand-deep)]',
      activeChip: 'bg-[var(--ink)] text-white border-[var(--ink)] shadow-2xs font-semibold',
      activeBadgeText: 'bg-[var(--surface)] text-[var(--ink)]',
      todayDotColor: '#5B86C2',
      todayBadgeStyle: 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20',
      titleHover: 'group-hover:text-[var(--brand-deep)]',
      clockColor: 'text-[var(--brand-deep)]',
      scheduleBtnHover: 'hover:bg-[var(--ink-2)]',
      scheduleBtnBg: 'bg-[var(--ink)]',
      primaryBtn: 'bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white',
      borderHighlight: 'hover:border-[var(--brand)]',
      ringHighlight: 'focus:ring-[var(--brand)] focus:border-[var(--brand)]'
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
        dotColor: '#B7791F',
        badge: `${upcomingItems.length} Upcoming`,
        badgeStyle: 'bg-[#FDF3DC] text-[#B7791F] border-[#FCE6B8]',
        items: upcomingItems,
      });
    }

    if (completedItems.length > 0) {
      result.push({
        id: 'completed',
        title: 'Completed Activities',
        dotColor: '#1F9D55',
        badge: `${completedItems.length} Done`,
        badgeStyle: 'bg-[#E6F6EC] text-[#1F9D55] border-[#CEEAD6]',
        items: completedItems,
      });
    }

    return result;
  }, [filteredEvents, theme]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6] shrink-0">
            <CheckCircle2 size={13} /> Completed
          </span>
        );
      case 'Scheduled':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold shrink-0 bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--brand)]/20">
            <Clock size={13} /> Scheduled
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4] shrink-0">
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF3DC] text-[#B7791F] border border-[#FCE6B8] shrink-0">
            High
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EFEFF1] text-[#4A4A52] border border-[#E3E3E7] shrink-0">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--brand)]/20">
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

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            {theme.tagText}
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Activities &amp; <span className={theme.titleAccent}>Follow-Ups</span>
            </h2>

            <button
              onClick={() => setViewMode('create')}
              className="shrink-0 h-9.5 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Schedule</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--muted)] mt-1">
            {rawEvents.length} Total Scheduled Tasks
          </p>
        </div>
      </section>

      {/* Content Layer */}
      <div className="relative z-20 mx-0.5 space-y-3.5">

        {/* Search Box */}
        <SearchBar
          placeholder="Search activities by title, notes, location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
        />

        {/* Horizontal Scrollable Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedStatusFilter === tab.key
                  ? theme.activeChip
                  : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--surface-alt)]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
                selectedStatusFilter === tab.key ? theme.activeBadgeText : 'bg-[var(--surface-alt)] text-[var(--muted)]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sectional Groups with Line Separators & Cards */}
        <div className="space-y-6 pt-1">
          {error ? (
            <div className="bg-[#FDE8EA] text-[#D64550] p-4 rounded-[16px] text-center border border-[#FCD0D4] text-xs">
              Failed to load activities. Please refresh or try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[var(--brand-deep)]" />
            </div>
          ) : sections.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center mx-auto">
                <CalendarDays size={20} />
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">No activities found</p>
              <p className="text-xs text-[var(--muted)]">
                {searchTerm ? 'No results matched your search query.' : 'No scheduled tasks in this category.'}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              ) : (
                <button
                  onClick={() => setViewMode('create')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] transition-colors cursor-pointer"
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
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.dotColor }} />
                    <h3 className="text-sm font-semibold text-[var(--text)]">
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
                        className="bg-[var(--surface)] rounded-[16px] border border-[var(--line)] hover:border-[var(--brand)]/40 p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[var(--surface-alt)] cursor-pointer space-y-2.5 group"
                      >
                        {/* Top Row: Left Round Tickmark Box + Title & Subtitle, Right: Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Action / Tickmark Box */}
                            <button
                              type="button"
                              disabled={isCompleted}
                              onClick={(e) => handleToggleStatus(e, act)}
                              className={`w-9 h-9 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border transition-all ${
                                isCompleted
                                  ? 'bg-[#E6F6EC] text-[#1F9D55] border-[#CEEAD6] cursor-default'
                                  : 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--brand)] hover:text-[var(--brand-deep)] cursor-pointer active:scale-95'
                              }`}
                              title={isCompleted ? 'Completed' : 'Click to complete'}
                            >
                              {isCompleted ? (
                                <Check size={16} strokeWidth={2.5} />
                              ) : (
                                <Clock size={15} />
                              )}
                            </button>

                            {/* Title & Time Subtitle */}
                            <div className="min-w-0 space-y-0.5 flex-1">
                              <h3 className={`font-semibold text-[var(--text)] text-sm truncate transition-colors ${
                                isCompleted 
                                  ? 'line-through text-[var(--muted)]' 
                                  : 'group-hover:text-[var(--brand-deep)]'
                              }`}>
                                {act.title}
                              </h3>
                              <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)]">
                                <span className="inline-flex items-center gap-1 font-medium text-[var(--muted)]">
                                  <Clock size={10} className="text-[var(--muted)]" />
                                  {formatEventTime(act)}
                                </span>
                                {isBranchOperations && act.assignedToName && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate text-[var(--brand-deep)] font-semibold">{act.assignedToName}</span>
                                  </>
                                )}
                              </div>

                              {/* Notes */}
                              {act.notes && (
                                <p className="text-[11px] text-[var(--muted)] line-clamp-1 italic pt-0.5">
                                  "{act.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Top Right Status Badge */}
                          <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                            {getStatusBadge(act.status)}
                          </div>
                        </div>

                        {/* Bottom Row: Location & Date Details */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--muted)]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin size={11} className="text-[var(--muted)] shrink-0" />
                            <span className="truncate">{act.address || 'Location Not Specified'}</span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                            <Calendar size={11} className="text-[var(--muted)] shrink-0" />
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
        isSales={isSales}
        isBranchOperations={isBranchOperations}
        onToggleStatus={(act) => toggleMutation.mutate({ id: act.id, status: act.status })}
        getPriorityBadge={getPriorityBadge}
      />

    </div>
  );
};

export default OriginationMobileActivities;
