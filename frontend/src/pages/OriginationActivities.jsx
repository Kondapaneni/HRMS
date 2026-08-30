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

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme = 'blue' }) => {
  const themeClasses = {
    blue: {
      bg: 'bg-[#e8f0fe]',
      text: 'text-[#1a73e8]',
      border: 'border-[#d2e3fc]',
    },
    green: {
      bg: 'bg-[#e6f4ea]',
      text: 'text-[#137333]',
      border: 'border-[#ceead6]',
    },
    amber: {
      bg: 'bg-[#fef7e0]',
      text: 'text-[#b06000]',
      border: 'border-[#feefc3]',
    },
    purple: {
      bg: 'bg-[#f3e8fd]',
      text: 'text-[#8430ce]',
      border: 'border-[#e9d5ff]',
    },
    red: {
      bg: 'bg-[#fce8e6]',
      text: 'text-[#c5221f]',
      border: 'border-[#fad2cf]',
    }
  }[colorTheme] || {
    bg: 'bg-[#e8f0fe]',
    text: 'text-[#1a73e8]',
    border: 'border-[#d2e3fc]',
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1">
            {title}
          </span>
          <h3 className="text-2xl font-normal text-[#1f1f1f] tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-2xl ${themeClasses.bg} ${themeClasses.text} border ${themeClasses.border} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && (
        <div className="mt-3 pt-2.5 border-t border-[#f1f3f4] flex items-center justify-between text-xs text-[#5f6368]">
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
    onSuccess: (resp) => {
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
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL' | 'Urgent' | 'High' | 'Medium' | 'Low'
  const [employeeFilter, setEmployeeFilter] = useState('ALL'); // 'ALL' | 'MINE' | specific userId

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

  // KPI Calculations
  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    let todayCount = 0;
    let upcomingCount = 0;
    let urgentCount = 0;
    let completedCount = 0;

    events.forEach((evt) => {
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

    const total = events.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      todayCount,
      upcomingCount,
      urgentCount,
      completedCount,
      completionRate
    };
  }, [events]);

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

      // Employee Filter (Branch Operations)
      if (isBranchOperations && employeeFilter !== 'ALL') {
        if (employeeFilter === 'MINE' && !evt.isAssignedToMe && !evt.isOwnActivity) return false;
        if (employeeFilter !== 'MINE' && evt.assignedTo !== employeeFilter && evt.createdBy !== employeeFilter) return false;
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
        badgeStyle: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]',
        items: grouped.overdue,
        dotColor: '#ea4335'
      },
      {
        id: 'today',
        title: "Today's Schedule",
        badge: `${grouped.today.length} Today`,
        badgeStyle: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]',
        items: grouped.today,
        dotColor: '#1a73e8'
      },
      {
        id: 'tomorrow',
        title: 'Tomorrow',
        badge: `${grouped.tomorrow.length} Scheduled`,
        badgeStyle: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',
        items: grouped.tomorrow,
        dotColor: '#fbbc05'
      },
      {
        id: 'upcoming',
        title: 'Upcoming Activities',
        badge: `${grouped.upcoming.length} Later`,
        badgeStyle: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]',
        items: grouped.upcoming,
        dotColor: '#5f6368'
      },
      {
        id: 'completed',
        title: 'Completed Activities',
        badge: `${grouped.completed.length} Done`,
        badgeStyle: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
        items: grouped.completed,
        dotColor: '#34a853'
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
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">Urgent</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">High</span>;
      case 'Low':
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">Medium</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
              {isBranchOperations ? (branchInfo?.name ? `${branchInfo.name} Branch` : 'Branch Operations') : 'Origination Pipeline'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2.5">
            Activities & Follow-Ups
            <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
              {stats.total} Total Tasks
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
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
            className="px-4.5 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
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
          colorTheme="blue"
        />
        <StatCard
          title="Upcoming Schedule"
          value={stats.upcomingCount}
          subtitle="Scheduled visits & calls"
          icon={CalendarIcon}
          colorTheme="amber"
        />
        <StatCard
          title="High Priority"
          value={stats.urgentCount}
          subtitle="Urgent & critical tasks"
          icon={AlertCircle}
          colorTheme="red"
        />
        <StatCard
          title="Completed Activities"
          value={stats.completedCount}
          subtitle={`${stats.completionRate}% completion rate`}
          icon={CheckCircle2}
          colorTheme="green"
        />
      </div>

      {/* Main Activities Unified Container Card (No Gap) */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
        
        {/* Search & Priority Filter Toolbar as Header of Card */}
        <div className="p-4 border-b border-[#e0e3e7] flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80868b] pointer-events-none" />
            <input
              type="search"
              placeholder={isBranchOperations ? "Search task, assignee, remarks..." : "Search tasks, address, remarks..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs bg-[#f8fafd] border border-[#dadce0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-all text-[#1f1f1f] placeholder:text-[#80868b]"
            />
          </div>

          {/* Filters Area */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Branch Staff Filter (Only shown in Branch Operations if colleagues exist) */}
            {isBranchOperations && branchEmployees.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#5f6368]">Assigned:</span>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="h-8 px-3 rounded-full border border-[#dadce0] bg-[#f8fafd] text-xs font-semibold text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 cursor-pointer"
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
              <span className="text-xs font-semibold text-[#5f6368]">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-8 px-3 rounded-full border border-[#dadce0] bg-[#f8fafd] text-xs font-semibold text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 cursor-pointer"
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

        {/* Activities List Area (Flows Directly Inside Same Box) */}
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-[#fcfdfe]">
            <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mb-4">
              <CalendarIcon size={32} />
            </div>
            <h3 className="text-lg font-bold text-[#1f1f1f]">No Activities Scheduled</h3>
            <p className="text-xs text-[#5f6368] max-w-sm mt-1 mb-6">
              {isBranchOperations
                ? 'No activities found for the selected filter. Create or assign tasks to your team.'
                : 'Schedule follow-up calls, client visits, or document collections for your leads.'}
            </p>
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-5 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={16} />
              <span>Schedule Activity</span>
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-8 bg-[#fcfdfe]">
            {sections.map((section) => (
              <div key={section.id} className="space-y-3.5">
                
                {/* Section Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#dadce0]/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.dotColor }} />
                    <h2 className="text-sm sm:text-base font-bold text-[#1f1f1f]">
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
                        className={`bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md hover:border-[#1a73e8]/40 group ${
                          isCompleted 
                            ? 'bg-[#fcfdfe] border-[#e0e3e7] opacity-75' 
                            : 'border-[#dadce0] shadow-2xs'
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
                            className="mt-0.5 text-[#5f6368] hover:text-[#1a73e8] transition-colors shrink-0 cursor-pointer"
                            title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={20} className="text-[#137333] fill-[#e6f4ea]" />
                            ) : (
                              <Circle size={20} className="hover:scale-110 transition-transform" />
                            )}
                          </button>

                          {/* Content Details */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`text-sm sm:text-base font-bold text-[#1f1f1f] group-hover:text-[#1a73e8] transition-colors truncate ${
                                isCompleted ? 'line-through text-[#80868b]' : ''
                              }`}>
                                {evt.title}
                              </h3>
                              {evt.priority && getPriorityBadge(evt.priority)}

                              {/* Assignee Badge */}
                              {isBranchOperations && displayName && (
                                <span className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${
                                  evt.isAssignedToMe 
                                    ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]' 
                                    : 'bg-[#f1f3f4] text-[#3c4043] border-[#dadce0]'
                                }`}>
                                  <User size={11} className={evt.isAssignedToMe ? 'text-[#1a73e8]' : 'text-[#5f6368]'} />
                                  <span>{displayName} {evt.isAssignedToMe ? '(You)' : (evt.assigneeEmployeeId ? `• ${evt.assigneeEmployeeId}` : '')}</span>
                                </span>
                              )}
                            </div>

                            {/* Meta: Time, Date, Location */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#5f6368]">
                              <span className="flex items-center gap-1 font-medium text-[#1f1f1f]">
                                <Clock size={13} className="text-[#1a73e8]" />
                                {formatEventTime(evt)} • {formatEventDate(evt)}
                              </span>

                              {evt.address && (
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <MapPin size={13} className="text-[#ea4335] shrink-0" />
                                  <span className="truncate">{evt.address}</span>
                                </span>
                              )}
                            </div>

                            {/* Optional Notes snippet */}
                            {evt.notes && (
                              <p className="text-xs text-[#5f6368] line-clamp-1 italic bg-[#f8fafd] px-2.5 py-1 rounded-lg border border-[#e0e3e7]/60 max-w-xl">
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
        assignableEmployees={assignableEmployees}
      />

      {/* Slide-over Details Drawer */}
      <EventDetailsSidebar
        isOpen={isDetailsSidebarOpen}
        onClose={() => setIsDetailsSidebarOpen(false)}
        event={selectedEvent}
        onToggleComplete={handleToggleComplete}
        onReassign={handleReassignActivity}
        assignableEmployees={assignableEmployees}
      />

    </div>
  );
};

export default OriginationActivities;

