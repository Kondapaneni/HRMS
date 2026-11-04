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
  Building2
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, startOfDay } from 'date-fns';
import api from '../api/axios';
import ActivitySidebar from '../components/calendar/ActivitySidebar';
import EventDetailsSidebar from '../components/calendar/EventDetailsSidebar';
import OriginationMobileActivities from './OriginationMobileActivities';

const StatCard = ({ title, value, subtitle, icon: Icon, theme = 'blue' }) => {
  const themeClasses = {
    blue: {
      bg: 'bg-[var(--brand-tint)]',
      text: 'text-[var(--brand-deep)]',
      border: 'border-[var(--brand)]/20',
    },
    pink: {
      bg: 'bg-[var(--accent-pink-tint)]',
      text: 'text-[var(--accent-pink-deep)]',
      border: 'border-[var(--accent-pink)]/20',
    },
    green: {
      bg: 'bg-[#E6F6EC]',
      text: 'text-[#1F9D55]',
      border: 'border-[#CEEAD6]',
    },
    amber: {
      bg: 'bg-[#FDF3DC]',
      text: 'text-[#B7791F]',
      border: 'border-[#FCE6B8]',
    },
    red: {
      bg: 'bg-[#FDE8EA]',
      text: 'text-[#D64550]',
      border: 'border-[#FCD0D4]',
    }
  }[theme] || {
    bg: 'bg-[var(--brand-tint)]',
    text: 'text-[var(--brand-deep)]',
    border: 'border-[var(--brand)]/20',
  };

  return (
    <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
            {title}
          </span>
          <h3 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-[12px] ${themeClasses.bg} ${themeClasses.text} border ${themeClasses.border} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && (
        <div className="mt-3 pt-2.5 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};

const OriginationActivities = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  // Detect workspace context
  const isBranchOperations = location.pathname.startsWith('/employee/branch-operations');
  const isSales = location.pathname.startsWith('/employee/sales');
  const workspaceScope = isBranchOperations ? 'branch' : 'personal';

  // Fetch activities (personal or branch-wide depending on route)
  const { data = {}, isLoading } = useQuery({
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
        ? `Activities scheduled for ${assignedCount} team members successfully`
        : 'Activity scheduled successfully'
      );
      setIsActivitySidebarOpen(false);
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to schedule activity';
      toast.error(errMsg, { duration: 5000 });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.patch(`/origination/activities/${id}/toggle-status`, { currentStatus: status });
      return response.data?.activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['origination', 'activities'] });
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
      toast.error(errMsg, { duration: 5000 });
    }
  });

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  // Extract unique branch employees present in the activities list or assignable list
  const branchEmployees = useMemo(() => {
    if (!isBranchOperations) return [];
    if (assignableEmployees.length > 0) {
      return assignableEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        empId: emp.employeeCode,
        isOwn: emp.isCurrentUser
      }));
    }
    const map = new Map();
    events.forEach((evt) => {
      const uid = evt.assignedTo || evt.createdBy;
      const name = evt.assigneeName || evt.creatorName;
      if (uid && name && !map.has(uid)) {
        map.set(uid, {
          id: uid,
          name: name,
          empId: evt.assigneeEmployeeId || evt.creatorEmployeeId,
          isOwn: evt.isAssignedToMe || evt.isOwnActivity
        });
      }
    });
    return Array.from(map.values());
  }, [events, assignableEmployees, isBranchOperations]);

  // Modals / Drawer State
  const [isActivitySidebarOpen, setIsActivitySidebarOpen] = useState(false);
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Action Handlers
  const handleCreateActivity = (payload) => {
    return createMutation.mutateAsync(payload);
  };

  const handleReassignActivity = (id, targetUserId) => {
    return reassignMutation.mutateAsync({ id, assignedTo: targetUserId });
  };

  const handleToggleComplete = (eventId) => {
    const target = events.find((e) => e.id === eventId);
    if (target) {
      toggleMutation.mutate({ id: eventId, status: target.status });
    }
  };

  const handleOpenNew = () => {
    setIsActivitySidebarOpen(true);
  };

  // KPI Calculations (scoped to selected assignee filter)
  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    let todayCount = 0;
    let upcomingCount = 0;
    let urgentCount = 0;
    let completedCount = 0;

    const targetEvents = events.filter((evt) => {
      if (isBranchOperations && employeeFilter !== 'ALL') {
        const effectiveAssigneeId = evt.assignedTo || evt.createdBy;
        if (employeeFilter === 'MINE') {
          if (!evt.isAssignedToMe) return false;
        } else {
          if (effectiveAssigneeId !== employeeFilter) return false;
        }
      }
      return true;
    });

    targetEvents.forEach((evt) => {
      if (evt.status === 'Completed') {
        completedCount++;
        return;
      }

      if (evt.priority === 'Urgent' || evt.priority === 'High') {
        urgentCount++;
      }

      try {
        const d = typeof evt.startDate === 'string' ? parseISO(evt.startDate) : evt.startDate;
        if (isToday(d)) {
          todayCount++;
        } else if (d > todayStart) {
          upcomingCount++;
        }
      } catch {
        upcomingCount++;
      }
    });

    const total = targetEvents.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      todayCount,
      upcomingCount,
      urgentCount,
      completedCount,
      completionRate
    };
  }, [events, employeeFilter, isBranchOperations]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = evt.title?.toLowerCase().includes(q);
        const addressMatch = evt.address?.toLowerCase().includes(q);
        const notesMatch = evt.notes?.toLowerCase().includes(q);
        const creatorMatch = evt.creatorName?.toLowerCase().includes(q);
        const assigneeMatch = evt.assigneeName?.toLowerCase().includes(q);
        const empIdMatch = (evt.assigneeEmployeeId || evt.creatorEmployeeId)?.toLowerCase().includes(q);
        if (!titleMatch && !addressMatch && !notesMatch && !creatorMatch && !assigneeMatch && !empIdMatch) {
          return false;
        }
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && evt.priority !== priorityFilter) {
        return false;
      }

      // Employee Filter (Branch Operations) - strictly based on assignedTo
      if (isBranchOperations && employeeFilter !== 'ALL') {
        const effectiveAssigneeId = evt.assignedTo || evt.createdBy;
        if (employeeFilter === 'MINE') {
          if (!evt.isAssignedToMe) return false;
        } else {
          if (effectiveAssigneeId !== employeeFilter) return false;
        }
      }

      return true;
    });
  }, [events, searchQuery, priorityFilter, employeeFilter, isBranchOperations]);

  // Group filtered events into sections
  const sections = useMemo(() => {
    const now = startOfDay(new Date());
    const grouped = {
      overdue: [],
      today: [],
      tomorrow: [],
      upcoming: [],
      completed: []
    };

    filteredEvents.forEach((evt) => {
      if (evt.status === 'Completed') {
        grouped.completed.push(evt);
        return;
      }

      try {
        const d = typeof evt.startDate === 'string' ? parseISO(evt.startDate) : evt.startDate;
        const dayStart = startOfDay(d);

        if (isToday(d)) {
          grouped.today.push(evt);
        } else if (isTomorrow(d)) {
          grouped.tomorrow.push(evt);
        } else if (dayStart < now) {
          grouped.overdue.push(evt);
        } else {
          grouped.upcoming.push(evt);
        }
      } catch {
        grouped.upcoming.push(evt);
      }
    });

    return [
      {
        id: 'overdue',
        title: 'Past Due / Action Required',
        badge: `${grouped.overdue.length} Overdue`,
        badgeStyle: 'bg-[#FDE8EA] text-[#D64550] border-[#FCD0D4]',
        items: grouped.overdue,
        dotColor: '#D64550'
      },
      {
        id: 'today',
        title: "Today's Schedule",
        badge: `${grouped.today.length} Today`,
        badgeStyle: 'bg-[#E8F0FB] text-[#3B6FB6] border-[#D2E3FC]',
        items: grouped.today,
        dotColor: '#3B6FB6'
      },
      {
        id: 'tomorrow',
        title: 'Tomorrow',
        badge: `${grouped.tomorrow.length} Scheduled`,
        badgeStyle: 'bg-[#FDF3DC] text-[#B7791F] border-[#FCE6B8]',
        items: grouped.tomorrow,
        dotColor: '#B7791F'
      },
      {
        id: 'upcoming',
        title: 'Upcoming Activities',
        badge: `${grouped.upcoming.length} Later`,
        badgeStyle: 'bg-[#EFEFF1] text-[#4A4A52] border-[#E3E3E7]',
        items: grouped.upcoming,
        dotColor: '#6B6B75'
      },
      {
        id: 'completed',
        title: 'Completed Activities',
        badge: `${grouped.completed.length} Done`,
        badgeStyle: 'bg-[#E6F6EC] text-[#1F9D55] border-[#CEEAD6]',
        items: grouped.completed,
        dotColor: '#1F9D55'
      }
    ].filter((s) => s.items.length > 0);
  }, [filteredEvents]);

  const formatTimeString = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let hours = parseInt(hStr, 10);
    const minutes = mStr ? mStr.slice(0, 2) : '00';
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatEventTime = (evt) => {
    if (evt.allDay) return 'All Day';
    if (!evt.startTime) return 'All Day';
    const startStr = formatTimeString(evt.startTime);
    if (evt.endTime && evt.endTime !== evt.startTime) {
      const endStr = formatTimeString(evt.endTime);
      return `${startStr} – ${endStr}`;
    }
    return startStr;
  };

  const formatEventDate = (evt) => {
    try {
      if (!evt.startDate) return '';
      const dateOnly = typeof evt.startDate === 'string' ? evt.startDate.split('T')[0] : evt.startDate;
      const s = typeof dateOnly === 'string' ? parseISO(dateOnly) : dateOnly;
      return format(s, 'MMM d, yyyy');
    } catch {
      return evt.startDate || '';
    }
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

  return (
    <>
      {/* Mobile Activities Render */}
      <div className="md:hidden">
        <OriginationMobileActivities />
      </div>

      {/* Web Desktop View */}
      <div className="hidden md:block space-y-6 pb-12 select-none">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                isSales 
                  ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border-[var(--accent-pink)]/20' 
                  : 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20'
              }`}>
                {isBranchOperations ? (branchInfo?.name ? `${branchInfo.name} Branch` : 'Branch Operations') : 'Origination Pipeline'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>Activities &amp; <span className={isSales ? 'text-[var(--accent-pink-deep)]' : 'text-[var(--brand-deep)]'}>Follow-Ups</span></span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isSales 
                  ? 'text-[var(--accent-pink-deep)] bg-[var(--accent-pink-tint)] border-[var(--accent-pink)]/20' 
                  : 'text-[var(--brand-deep)] bg-[var(--brand-tint)] border-[var(--brand)]/20'
              }`}>
                {stats.total} Total Tasks
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              {isBranchOperations
                ? 'View, assign and coordinate scheduled activities, visits, and follow-ups across your branch team.'
                : 'Manage scheduled customer calls, KYC verification visits, document collections, and follow-ups.'}
            </p>
          </div>

          {/* Top Right Action Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-4.5 py-2.5 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={16} />
              <span>Schedule Activity</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Due"
            value={stats.todayCount}
            subtitle="Scheduled for today"
            icon={Clock}
            theme={isSales ? 'pink' : 'blue'}
          />
          <StatCard
            title="Upcoming Schedule"
            value={stats.upcomingCount}
            subtitle="Scheduled visits & calls"
            icon={CalendarIcon}
            theme="amber"
          />
          <StatCard
            title="High Priority"
            value={stats.urgentCount}
            subtitle="Urgent & critical tasks"
            icon={AlertCircle}
            theme="red"
          />
          <StatCard
            title="Completed Activities"
            value={stats.completedCount}
            subtitle={`${stats.completionRate}% completion rate`}
            icon={CheckCircle2}
            theme="green"
          />
        </div>

        {/* Main Activities Unified Container Card */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          
          {/* Search & Priority Filter Toolbar */}
          <div className="p-4 border-b border-[var(--line)] flex flex-col md:flex-row items-center justify-between gap-3 bg-[var(--surface)]">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
              <input
                type="search"
                placeholder={isBranchOperations ? "Search task, assignee, remarks..." : "Search tasks, address, remarks..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 focus:bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all shadow-none"
              />
            </div>

            {/* Filters Area */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {/* Branch Staff Filter (Only shown in Branch Operations if colleagues exist) */}
              {isBranchOperations && branchEmployees.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--muted)]">Assigned:</span>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="h-8.5 px-3 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--brand)] cursor-pointer"
                  >
                    <option value="ALL">All Branch Staff ({events.length})</option>
                    <option value="MINE">Assigned to Me</option>
                    {branchEmployees.filter((emp) => !emp.isOwn).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.empId ? `(${emp.empId})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--muted)]">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="h-8.5 px-3 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--brand)] cursor-pointer"
                >
                  <option value="ALL">All Priorities ({events.length})</option>
                  <option value="Urgent">Urgent Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Activities List Area */}
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-[var(--surface)]">
              <div className="w-16 h-16 rounded-[16px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center mb-4">
                <CalendarIcon size={32} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text)]">No Activities Scheduled</h3>
              <p className="text-xs text-[var(--muted)] max-w-sm mt-1 mb-6">
                {isBranchOperations
                  ? 'No activities found for the selected filter. Create or assign tasks to your team.'
                  : 'Schedule follow-up calls, client visits, or document collections for your leads.'}
              </p>
              <button
                type="button"
                onClick={handleOpenNew}
                className="px-5 py-2.5 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <Plus size={16} />
                <span>Schedule Activity</span>
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-8 bg-[var(--surface)]">
              {sections.map((section) => (
                <div key={section.id} className="space-y-3.5">
                  
                  {/* Section Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.dotColor }} />
                      <h2 className="text-sm sm:text-base font-semibold text-[var(--text)]">
                        {section.title}
                      </h2>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${section.badgeStyle}`}>
                      {section.badge}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="grid grid-cols-1 gap-3">
                    {section.items.map((evt) => {
                      const isCompleted = evt.status === 'Completed';
                      const displayName = evt.assigneeName || evt.creatorName;

                      return (
                        <div
                          key={evt.id}
                          onClick={() => {
                            setSelectedEvent(evt);
                            setIsDetailsSidebarOpen(true);
                          }}
                          className={`bg-[var(--surface)] rounded-[16px] border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-xs hover:border-[var(--brand)]/40 group ${
                            isCompleted 
                              ? 'bg-[var(--surface-alt)]/50 border-[var(--line)] opacity-75' 
                              : 'border-[var(--line)]'
                          }`}
                        >
                          {/* Left: Checkbox + Title & Details */}
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            {/* 1-Click Complete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(evt.id);
                              }}
                              className="mt-0.5 text-[var(--muted)] hover:text-[var(--brand-deep)] transition-colors shrink-0 cursor-pointer"
                              title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={20} className="text-[#1F9D55] fill-[#E6F6EC]" />
                              ) : (
                                <Circle size={20} className="hover:scale-110 transition-transform" />
                              )}
                            </button>

                            {/* Content Details */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className={`text-sm sm:text-base font-semibold text-[var(--text)] group-hover:text-[var(--brand-deep)] transition-colors truncate ${
                                  isCompleted ? 'line-through text-[var(--muted)]' : ''
                                }`}>
                                  {evt.title}
                                </h3>
                                {evt.priority && getPriorityBadge(evt.priority)}

                                {/* Assignee Badge */}
                                {isBranchOperations && displayName && (
                                  <span className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${
                                    evt.isAssignedToMe 
                                      ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20' 
                                      : 'bg-[var(--surface-alt)] text-[var(--text-2)] border-[var(--line)]'
                                  }`}>
                                    <User size={11} className={evt.isAssignedToMe ? 'text-[var(--brand-deep)]' : 'text-[var(--muted)]'} />
                                    <span>{displayName} {evt.isAssignedToMe ? '(You)' : (evt.assigneeEmployeeId ? `• ${evt.assigneeEmployeeId}` : '')}</span>
                                  </span>
                                )}
                              </div>

                              {/* Meta: Time, Date, Location */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)]">
                                <span className="flex items-center gap-1 font-medium text-[var(--text)]">
                                  <Clock size={13} className="text-[var(--brand-deep)]" />
                                  {formatEventTime(evt)} • {formatEventDate(evt)}
                                </span>

                                {evt.address && (
                                  <span className="flex items-center gap-1 truncate max-w-xs">
                                    <MapPin size={13} className="text-[#D64550] shrink-0" />
                                    <span className="truncate">{evt.address}</span>
                                  </span>
                                )}
                              </div>

                              {/* Optional Notes snippet */}
                              {evt.notes && (
                                <p className="text-xs text-[var(--muted)] line-clamp-1 italic bg-[var(--surface-alt)] px-2.5 py-1 rounded-[8px] border border-[var(--line)] max-w-xl">
                                  "{evt.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slide-over Form Drawer */}
        <ActivitySidebar
          isOpen={isActivitySidebarOpen}
          onClose={() => setIsActivitySidebarOpen(false)}
          onSave={handleCreateActivity}
          isSales={isSales}
          assignableEmployees={isBranchOperations ? assignableEmployees : []}
          showAssigneeSelector={isBranchOperations}
        />

        {/* Slide-over Details Drawer */}
        <EventDetailsSidebar
          isOpen={isDetailsSidebarOpen}
          onClose={() => setIsDetailsSidebarOpen(false)}
          event={selectedEvent}
          onToggleComplete={handleToggleComplete}
          onReassign={isBranchOperations ? handleReassignActivity : null}
          assignableEmployees={isBranchOperations ? assignableEmployees : []}
        />

      </div>
    </>
  );
};

export default OriginationActivities;
