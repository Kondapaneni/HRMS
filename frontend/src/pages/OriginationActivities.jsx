import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useRemoteData, useRemoteTask, useRefreshControl } from '../state/remote.js';
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Calendar,
  Layers,
  ArrowUpRight,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
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
  isBefore,
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays 
} from 'date-fns';
import api from '../api/axios';
import ActivitySidebar from '../components/calendar/ActivitySidebar';
import EventDetailsSidebar from '../components/calendar/EventDetailsSidebar';
import OriginationMobileActivities from './OriginationMobileActivities';

// =========================================================================
// Quick Create Event Popover Modal (Strict Past Date & Past Time Prevention)
// =========================================================================
const QuickCreateModal = ({
  isOpen,
  onClose,
  initialDate,
  onSave,
  assignableEmployees = [],
  isBranchOperations = false,
  isSales = false,
  theme
}) => {
  const getSmartInitialTimes = (dateStr) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    if (!dateStr || dateStr <= todayStr) {
      const minutes = now.getMinutes();
      const remainder = minutes % 15;
      const addMins = remainder === 0 ? 15 : (15 - remainder);
      const startObj = new Date(now.getTime() + addMins * 60 * 1000);
      const endObj = new Date(startObj.getTime() + 60 * 60 * 1000);
      return {
        startDate: todayStr,
        startTime: format(startObj, 'HH:mm'),
        endTime: format(endObj, 'HH:mm'),
      };
    }
    return {
      startDate: dateStr,
      startTime: '10:00',
      endTime: '11:00',
    };
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [allDay, setAllDay] = useState(false);
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentTodayStr = format(now, 'yyyy-MM-dd');
      let effectiveDate = initialDate || currentTodayStr;
      if (effectiveDate < currentTodayStr) {
        effectiveDate = currentTodayStr;
      }
      const times = getSmartInitialTimes(effectiveDate);

      setTitle('');
      setStartDate(effectiveDate);
      setStartTime(times.startTime);
      setEndTime(times.endTime);
      setAllDay(false);
      setPriority('Medium');
      setAssignedTo('');
      setNotes('');
      setAddress('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter an event name');
      return;
    }

    const now = new Date();
    const currentTodayStr = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');

    // Strict validation: No past dates or today's past times
    if (startDate < currentTodayStr) {
      toast.error('Cannot schedule activities for past dates');
      return;
    }

    if (startDate === currentTodayStr && !allDay) {
      if (!startTime) {
        toast.error('Please select a start time');
        return;
      }
      if (startTime < currentTimeStr) {
        toast.error('Cannot schedule activities for past time today');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        startDate,
        endDate: startDate,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        allDay,
        priority,
        address: address.trim() || null,
        notes: notes.trim() || null,
        assignedTo: isBranchOperations && assignedTo ? assignedTo : undefined,
        status: 'Scheduled'
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-[420px] bg-[var(--surface)] text-[var(--text)] rounded-[24px] border border-[var(--line)] shadow-xl overflow-hidden p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text)]">New Event</h3>
          <button 
            type="button" 
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Event Title Input */}
          <div>
            <input
              type="text"
              autoFocus
              placeholder="Event name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#131315] dark:focus:border-white transition-colors"
            />
          </div>

          {/* Date Picker Row (Restricted to present and future dates) */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--surface-alt)]/60 border border-[var(--line)] text-xs font-medium text-[var(--text)]">
            <CalendarIcon size={15} className="text-[var(--muted)] shrink-0" />
            <input
              type="date"
              min={todayStr}
              value={startDate}
              onChange={(e) => {
                const val = e.target.value;
                if (val < todayStr) {
                  toast.error('Cannot select past dates');
                  setStartDate(todayStr);
                  return;
                }
                setStartDate(val);
              }}
              className="bg-transparent text-xs font-medium text-[var(--text)] focus:outline-none cursor-pointer flex-1"
            />
          </div>

          {/* Time Row (Restricted to present and future times on today) */}
          {!allDay && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-alt)]/60 border border-[var(--line)] text-xs font-medium text-[var(--text)]">
              <Clock size={15} className="text-[var(--muted)] shrink-0" />
              <input
                type="time"
                min={startDate === todayStr ? format(new Date(), 'HH:mm') : undefined}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-transparent text-xs font-medium text-[var(--text)] focus:outline-none cursor-pointer"
              />
              <span className="text-[var(--muted)] font-normal px-1">&rarr;</span>
              <Clock size={15} className="text-[var(--muted)] shrink-0" />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-transparent text-xs font-medium text-[var(--text)] focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* All Day Checkbox & Priority Select */}
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text)]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-4 h-4 rounded text-[#131315] dark:text-white focus:ring-[#131315] cursor-pointer"
              />
              <span>All day</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-[var(--muted)] text-[11px]">Priority:</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-7 px-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--line)] text-xs font-semibold text-[var(--text)] focus:outline-none cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignee / Guests Row (Branch Operations) */}
          {isBranchOperations && assignableEmployees.length > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--surface-alt)]/60 border border-[var(--line)] text-xs font-medium text-[var(--text)]">
              <User size={15} className="text-[var(--muted)] shrink-0" />
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="bg-transparent text-xs font-medium text-[var(--text)] focus:outline-none cursor-pointer flex-1"
              >
                <option value="">Assign team member (Optional)</option>
                {assignableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location / Address Row */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--surface-alt)]/60 border border-[var(--line)] text-xs font-medium text-[var(--text)]">
            <MapPin size={15} className="text-[var(--muted)] shrink-0" />
            <input
              type="text"
              placeholder="Add location or address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-transparent text-xs font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none flex-1"
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-1">
            <textarea
              rows={2}
              placeholder="Add description..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-alt)]/60 text-xs font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#131315] dark:focus:border-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-[#131315] hover:bg-[#27272A] text-white dark:bg-[#F4F4F6] dark:hover:bg-white dark:text-[#18181B] shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// Main Desktop Component
// =========================================================================
const OriginationActivities = () => {
  const location = useLocation();
  const refreshControl = useRefreshControl();

  // Detect workspace context
  const isBranchOperations = location.pathname.startsWith('/employee/branch-operations');
  const isSales = location.pathname.startsWith('/employee/sales');
  const workspaceScope = isBranchOperations ? 'branch' : 'personal';

  // Fetch activities
  const { data = {}, isLoading } = useRemoteData({
    scope: ['origination', 'activities', workspaceScope],
    load: async () => {
      const response = await api.get('/origination/activities', {
        params: { scope: workspaceScope }
      });
      return response.data || {};
    }
  });

  const events = data.activities || [];
  const branchInfo = data.branch || null;
  const assignableEmployees = data.assignableEmployees || [];

  // Theme definition (Clean Black & White / Monochromatic Editorial)
  const theme = useMemo(() => {
    return {
      moduleName: isSales ? 'Sales' : isBranchOperations ? 'Branch' : 'Loans',
      tagText: isSales
        ? 'Sales Origination • Activities'
        : isBranchOperations
        ? (branchInfo?.name ? `${branchInfo.name} Branch • Activities` : 'Branch Activities')
        : 'Loan Origination • Activities',
      activeTabClass: 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B] font-semibold shadow-2xs',
      inactiveTabClass: 'text-[var(--muted)] hover:text-[var(--text)]',
      primaryBtnClass: 'bg-[#131315] hover:bg-[#27272A] text-white dark:bg-[#F4F4F6] dark:hover:bg-white dark:text-[#18181B]',
    };
  }, [isSales, isBranchOperations, branchInfo]);

  // Mutations
  const createMutation = useRemoteTask({
    run: async (payload) => {
      const response = await api.post('/origination/activities', payload);
      return response.data?.activity;
    },
    onSuccess: (data, variables) => {
      refreshControl.refresh({ scope: ['origination', 'activities'] });
      const assignedCount = Array.isArray(variables?.assignedTo) ? variables.assignedTo.length : 1;
      toast.success(assignedCount > 1 
        ? `Activities scheduled for ${assignedCount} team members`
        : 'Activity scheduled successfully'
      );
      setIsActivitySidebarOpen(false);
      setIsQuickCreateOpen(false);
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to schedule activity';
      toast.error(errMsg, { duration: 5000 });
    }
  });

  const toggleMutation = useRemoteTask({
    run: async ({ id, status }) => {
      const response = await api.patch(`/origination/activities/${id}/toggle-status`, { currentStatus: status });
      return response.data?.activity;
    },
    onSuccess: () => {
      refreshControl.refresh({ scope: ['origination', 'activities'] });
      toast.success('Activity status updated');
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to update activity status';
      toast.error(errMsg);
    }
  });

  const reassignMutation = useRemoteTask({
    run: async ({ id, assignedTo }) => {
      const response = await api.patch(`/origination/activities/${id}/reassign`, { assignedTo });
      return response.data?.activity;
    },
    onSuccess: () => {
      refreshControl.refresh({ scope: ['origination', 'activities'] });
      toast.success('Activity reassigned successfully');
      setIsDetailsSidebarOpen(false);
    },
    onError: (err) => {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to reassign activity';
      toast.error(errMsg, { duration: 5000 });
    }
  });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'list'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduled, setShowScheduled] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  // Modals & Drawer State
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isActivitySidebarOpen, setIsActivitySidebarOpen] = useState(false);
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month' || viewMode === 'list') {
      setCurrentDate(prev => subMonths(prev, 1));
      setMiniCalendarDate(prev => subMonths(prev, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(prev => subDays(prev, 1));
      setSelectedDate(prev => subDays(prev, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month' || viewMode === 'list') {
      setCurrentDate(prev => addMonths(prev, 1));
      setMiniCalendarDate(prev => addMonths(prev, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    setMiniCalendarDate(now);
  };

  // Calendar Days Calculation (Month Grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Mini Calendar Days Calculation
  const miniCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(miniCalendarDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [miniCalendarDate]);

  // Week View Days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));
  }, [currentDate]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Status filter
      if (!showScheduled && evt.status !== 'Completed') return false;
      if (!showCompleted && evt.status === 'Completed') return false;
      if (showUrgentOnly && evt.priority !== 'Urgent' && evt.priority !== 'High') return false;

      // Staff filter
      if (isBranchOperations && employeeFilter !== 'ALL') {
        const effectiveAssigneeId = evt.assignedTo || evt.createdBy;
        if (employeeFilter === 'MINE') {
          if (!evt.isAssignedToMe) return false;
        } else {
          if (effectiveAssigneeId !== employeeFilter) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = evt.title?.toLowerCase().includes(q);
        const notesMatch = evt.notes?.toLowerCase().includes(q);
        const addressMatch = evt.address?.toLowerCase().includes(q);
        const assigneeMatch = evt.assigneeName?.toLowerCase().includes(q);
        const creatorMatch = evt.creatorName?.toLowerCase().includes(q);
        if (!titleMatch && !notesMatch && !addressMatch && !assigneeMatch && !creatorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [events, showScheduled, showCompleted, showUrgentOnly, employeeFilter, searchQuery, isBranchOperations]);

  // Map events by date string 'YYYY-MM-DD'
  const eventsByDate = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach(evt => {
      if (!evt.startDate) return;
      const dateKey = typeof evt.startDate === 'string' ? evt.startDate.split('T')[0] : '';
      if (!dateKey) return;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(evt);
    });
    return map;
  }, [filteredEvents]);

  // List View: Filtered to selected month only and grouped/ordered by date & time
  const monthListSections = useMemo(() => {
    const monthKey = format(currentDate, 'yyyy-MM');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 1. Filter events to the selected month only
    const monthEvents = filteredEvents.filter(evt => {
      if (!evt.startDate) return false;
      const dKey = typeof evt.startDate === 'string' ? evt.startDate.split('T')[0] : '';
      return dKey.startsWith(monthKey);
    });

    // 2. Sort function: Date ascending, then Time ascending
    const sortByDateTime = (a, b) => {
      const dateA = typeof a.startDate === 'string' ? a.startDate.split('T')[0] : '';
      const dateB = typeof b.startDate === 'string' ? b.startDate.split('T')[0] : '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    };

    const pending = [];
    const upcoming = [];
    const completed = [];

    monthEvents.forEach(evt => {
      if (evt.status === 'Completed') {
        completed.push(evt);
        return;
      }

      const dKey = typeof evt.startDate === 'string' ? evt.startDate.split('T')[0] : '';
      if (dKey <= todayStr) {
        pending.push(evt);
      } else {
        upcoming.push(evt);
      }
    });

    pending.sort(sortByDateTime);
    upcoming.sort(sortByDateTime);
    completed.sort(sortByDateTime);

    const sections = [];

    if (pending.length > 0) {
      sections.push({
        id: 'pending',
        title: 'Pending & Due Tasks',
        badge: `${pending.length} Pending`,
        badgeStyle: 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B]',
        dotColor: '#131315',
        items: pending,
      });
    }

    if (upcoming.length > 0) {
      sections.push({
        id: 'upcoming',
        title: 'Upcoming Schedule',
        badge: `${upcoming.length} Upcoming`,
        badgeStyle: 'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)]',
        dotColor: '#71717A',
        items: upcoming,
      });
    }

    if (completed.length > 0) {
      sections.push({
        id: 'completed',
        title: 'Completed Activities',
        badge: `${completed.length} Completed`,
        badgeStyle: 'bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)]',
        dotColor: '#A1A1AA',
        items: completed,
      });
    }

    return {
      totalInMonth: monthEvents.length,
      sections,
    };
  }, [filteredEvents, currentDate]);

  // Format Helpers
  const formatEventTime = (evt) => {
    if (evt.allDay) return 'All Day';
    if (!evt.startTime) return 'All Day';
    return evt.startTime;
  };

  // Monochromatic pill styles (Editorial Black & White)
  const getEventPillStyle = (evt) => {
    if (evt.status === 'Completed') {
      return 'bg-[var(--surface-alt)]/60 text-[var(--muted)] border border-[var(--line)] line-through';
    }
    if (evt.priority === 'Urgent') {
      return 'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)] border-l-2 border-l-[#131315] dark:border-l-white';
    }
    if (evt.priority === 'High') {
      return 'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)] border-l-2 border-l-[var(--text-2)]';
    }
    return 'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)] border-l-2 border-l-[#131315] dark:border-l-white';
  };

  // Priority Badge (Monochromatic / Editorial)
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            High
          </span>
        );
      case 'Low':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)]">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)]">
            Medium
          </span>
        );
    }
  };

  // KPI Stats Calculation
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
    return {
      total,
      todayCount,
      upcomingCount,
      urgentCount,
      completedCount,
    };
  }, [events]);

  return (
    <>
      {/* Mobile Activities Render */}
      <div className="md:hidden">
        <OriginationMobileActivities />
      </div>

      {/* Web Desktop Calendar View (Black & White Monochromatic Theme) */}
      <div className="hidden md:flex flex-col min-h-[860px] select-none antialiased space-y-4 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 px-0.5">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              {isSales
                ? 'Sales Origination Pipeline'
                : isBranchOperations
                ? (branchInfo?.name ? `${branchInfo.name} Branch Pipeline` : 'Branch Operations Pipeline')
                : 'Origination Loan Pipeline'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>
                {isSales
                  ? 'Sales Activities Directory'
                  : isBranchOperations
                  ? 'Branch Activities Directory'
                  : 'Loan Activities Directory'}
              </span>
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                {events.length} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              {isBranchOperations
                ? 'Coordinate customer visits, KYC verifications, loan processing follow-ups, and team activities.'
                : 'Manage scheduled client calls, verification visits, document collections, and pipeline follow-ups.'}
            </p>
          </div>
        </div>

        {/* Outer White Card Container with rounded corners */}
        <div className="flex-1 flex rounded-[24px] border border-[var(--line)] bg-[var(--surface)] shadow-sm overflow-hidden min-h-[760px]">
          
          {/* =========================================================
              LEFT SIDEBAR: Mini Month Calendar + Filters + Search
             ========================================================= */}
          <aside className={`w-[270px] border-r border-[var(--line)] p-4 flex flex-col justify-between shrink-0 bg-[var(--surface)] transition-all ${
            isSidebarCollapsed ? 'hidden' : 'flex'
          }`}>
            <div className="space-y-4 overflow-y-auto pr-1 hide-scrollbar">
              
              {/* Sidebar Header: Title + Collapse Button */}
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-[17px] font-bold text-[var(--text)]">Calendar</h2>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="w-7 h-7 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] flex items-center justify-center transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-7 rounded-xl bg-[var(--surface-alt)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#131315] dark:focus:border-white transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Mini Month Calendar */}
              <div className="space-y-2 select-none pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[var(--text)]">
                    {format(miniCalendarDate, 'MMMM yyyy')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMiniCalendarDate(prev => subMonths(prev, 1))}
                      className="w-6 h-6 rounded-full hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMiniCalendarDate(prev => addMonths(prev, 1))}
                      className="w-6 h-6 rounded-full hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Weekday letters: S M T W T F S */}
                <div className="grid grid-cols-7 text-center text-[10.5px] font-semibold text-[var(--muted)] py-0.5">
                  <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>

                {/* Mini day numbers grid */}
                <div className="grid grid-cols-7 text-center text-[11px] gap-y-1">
                  {miniCalendarDays.map((day, idx) => {
                    const isCurrMonth = isSameMonth(day, miniCalendarDate);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDate(day);
                          setCurrentDate(day);
                        }}
                        className={`w-6.5 h-6.5 mx-auto rounded-full flex items-center justify-center text-[11px] transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#131315] text-white font-bold dark:bg-[#F4F4F6] dark:text-[#18181B]'
                            : isTodayDate
                            ? 'border border-[#131315] text-[#131315] dark:border-white dark:text-white font-bold'
                            : isCurrMonth
                            ? 'text-[var(--text)] hover:bg-[var(--surface-alt)] font-medium'
                            : 'text-[var(--muted)]/40 hover:bg-[var(--surface-alt)]/40'
                        }`}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filters / My calendars */}
              <div className="space-y-2.5 pt-3 border-t border-[var(--line)]">
                <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                  My Calendars
                </span>
                
                <div className="space-y-1.5 text-xs text-[var(--text)]">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-[var(--surface-alt)] transition-colors">
                    <input
                      type="checkbox"
                      checked={showScheduled}
                      onChange={(e) => setShowScheduled(e.target.checked)}
                      className="w-4 h-4 rounded text-[#131315] dark:text-white focus:ring-[#131315] cursor-pointer"
                    />
                    <span className="flex-1 font-medium">Scheduled Activities</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#131315] dark:bg-white" />
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-[var(--surface-alt)] transition-colors">
                    <input
                      type="checkbox"
                      checked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                      className="w-4 h-4 rounded text-[#131315] dark:text-white focus:ring-[#131315] cursor-pointer"
                    />
                    <span className="flex-1 font-medium">Completed</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--muted)]" />
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-[var(--surface-alt)] transition-colors">
                    <input
                      type="checkbox"
                      checked={showUrgentOnly}
                      onChange={(e) => setShowUrgentOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-[#131315] dark:text-white focus:ring-[#131315] cursor-pointer"
                    />
                    <span className="flex-1 font-medium">Urgent / High Priority</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#131315] dark:bg-white" />
                  </label>

                  {/* Branch Operations Staff Filter */}
                  {isBranchOperations && assignableEmployees.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wider block mb-1">
                        Team Member
                      </span>
                      <select
                        value={employeeFilter}
                        onChange={(e) => setEmployeeFilter(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-medium text-[var(--text)] focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Branch Staff</option>
                        <option value="MINE">Assigned to Me</option>
                        {assignableEmployees.filter(e => !e.isCurrentUser).map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Add Action Button (Always opens with present/future date) */}
            <div className="pt-3 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const targetDate = isBefore(selectedDate, startOfDay(now)) ? now : selectedDate;
                  setQuickCreateDate(format(targetDate, 'yyyy-MM-dd'));
                  setIsQuickCreateOpen(true);
                }}
                className={`w-full py-2.5 px-4 rounded-full ${theme.primaryBtnClass} text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]`}
              >
                <Plus size={15} strokeWidth={2.2} />
                <span>Schedule Activity</span>
              </button>
            </div>
          </aside>

          {/* =========================================================
              MAIN CALENDAR WORKSPACE (Month / Week / Day / List)
             ========================================================= */}
          <main className="flex-1 flex flex-col min-w-0 bg-[var(--surface)] overflow-hidden">
            
            {/* Calendar Top Header Bar: View mode on Left, Month at Right Edge */}
            <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-4 bg-[var(--surface)] shrink-0">
              
              {/* Left Side: Sidebar toggle button + View Mode Toggle Pill (Day | Week | Month | List) */}
              <div className="flex items-center gap-2.5">
                {isSidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="w-8 h-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] flex items-center justify-center transition-colors cursor-pointer mr-1"
                    title="Open sidebar"
                  >
                    <PanelLeftOpen size={17} />
                  </button>
                )}

                <div className="flex items-center p-1 rounded-full bg-[var(--surface-alt)] border border-[var(--line)] text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setViewMode('day')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      viewMode === 'day' ? theme.activeTabClass : theme.inactiveTabClass
                    }`}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      viewMode === 'week' ? theme.activeTabClass : theme.inactiveTabClass
                    }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      viewMode === 'month' ? theme.activeTabClass : theme.inactiveTabClass
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      viewMode === 'list' ? theme.activeTabClass : theme.inactiveTabClass
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>

              {/* Right Side (Right Edge): Prev/Next buttons + Month Title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="w-7 h-7 rounded-full border border-[var(--line)] hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-7 h-7 rounded-full border border-[var(--line)] hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                    title="Next"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
                  {format(currentDate, 'MMMM yyyy')}
                </h1>
              </div>

            </div>

            {/* View Mode 1: Month View Grid */}
            {viewMode === 'month' && (
              <div className="flex-1 flex flex-col min-h-0 select-none overflow-y-auto">
                {/* Weekday Column Headers: Sun, Mon, Tue, Wed, Thu, Fri, Sat */}
                <div className="grid grid-cols-7 border-b border-[var(--line)] text-center text-xs font-bold text-[var(--muted)] py-2 bg-[var(--surface)] shrink-0">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Month Day Cells */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr h-full">
                  {calendarDays.map((day, idx) => {
                    const isCurrMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isPastDate = isBefore(day, startOfDay(new Date()));
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate.get(dayStr) || [];

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedDate(day);
                          if (!isPastDate) {
                            setQuickCreateDate(dayStr);
                          }
                        }}
                        onDoubleClick={() => {
                          if (isPastDate) {
                            toast.error('Cannot schedule activities for past dates');
                            return;
                          }
                          setQuickCreateDate(dayStr);
                          setIsQuickCreateOpen(true);
                        }}
                        className={`border-b border-r border-[var(--line)] p-1.5 sm:p-2 flex flex-col justify-start min-h-[120px] transition-colors cursor-pointer group hover:bg-[var(--surface-alt)]/35 ${
                          isCurrMonth ? 'bg-[var(--surface)]' : 'bg-[var(--surface-alt)]/25'
                        } ${isPastDate ? 'opacity-70' : ''}`}
                      >
                        {/* Day Cell Top: Date Number & Hover + Button (Only for present & future) */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isTodayDate
                              ? 'bg-[#131315] text-white font-bold dark:bg-[#F4F4F6] dark:text-[#18181B]'
                              : isCurrMonth
                              ? 'text-[var(--text)] font-semibold'
                              : 'text-[var(--muted)]/40'
                          }`}>
                            {format(day, 'd')}
                          </span>

                          {!isPastDate && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickCreateDate(dayStr);
                                setIsQuickCreateOpen(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-all cursor-pointer"
                              title="Add event"
                            >
                              <Plus size={12} />
                            </button>
                          )}
                        </div>

                        {/* Event Chips List */}
                        <div className="space-y-1 overflow-y-auto max-h-[105px] hide-scrollbar flex-1">
                          {dayEvents.slice(0, 3).map((evt) => {
                            const isCompleted = evt.status === 'Completed';
                            const pillStyle = getEventPillStyle(evt);

                            return (
                              <div
                                key={evt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(evt);
                                  setIsDetailsSidebarOpen(true);
                                }}
                                className={`px-2 py-0.5 rounded-[5px] text-[10.5px] font-medium truncate flex items-center gap-1 cursor-pointer transition-transform hover:scale-[1.02] shadow-2xs ${pillStyle}`}
                                title={`${evt.title} (${formatEventTime(evt)})`}
                              >
                                <span className="truncate">{evt.title}</span>
                              </div>
                            );
                          })}

                          {dayEvents.length > 3 && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(day);
                                setViewMode('day');
                              }}
                              className="text-[10px] font-bold text-[var(--text)] hover:underline pl-1 cursor-pointer"
                            >
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View Mode 2: Week View */}
            {viewMode === 'week' && (
              <div className="flex-1 flex flex-col min-h-0 select-none overflow-y-auto">
                <div className="grid grid-cols-7 border-b border-[var(--line)] text-center text-xs font-semibold py-2.5 bg-[var(--surface)] shrink-0">
                  {weekDays.map((d, i) => {
                    const isTodayDate = isToday(d);
                    return (
                      <div key={i} className="space-y-0.5">
                        <span className="text-[11px] font-medium text-[var(--muted)] uppercase">{format(d, 'EEE')}</span>
                        <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                          isTodayDate ? 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B]' : 'text-[var(--text)]'
                        }`}>
                          {format(d, 'd')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1 grid grid-cols-7 divide-x divide-[var(--line)] p-2">
                  {weekDays.map((d, i) => {
                    const dayStr = format(d, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate.get(dayStr) || [];

                    return (
                      <div key={i} className="px-1.5 space-y-1.5 min-h-[500px]">
                        {dayEvents.map(evt => (
                          <div
                            key={evt.id}
                            onClick={() => {
                              setSelectedEvent(evt);
                              setIsDetailsSidebarOpen(true);
                            }}
                            className={`p-2 rounded-xl text-xs cursor-pointer shadow-2xs hover:shadow-xs transition-all ${getEventPillStyle(evt)}`}
                          >
                            <p className="font-semibold truncate">{evt.title}</p>
                            <span className="text-[10.5px] opacity-80 flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> {formatEventTime(evt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View Mode 3: Day View */}
            {viewMode === 'day' && (
              <div className="flex-1 flex flex-col min-h-0 p-5 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text)]">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <p className="text-xs text-[var(--muted)]">
                      {(eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []).length} Scheduled activities
                    </p>
                  </div>
                  {!isBefore(selectedDate, startOfDay(new Date())) && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCreateDate(format(selectedDate, 'yyyy-MM-dd'));
                        setIsQuickCreateOpen(true);
                      }}
                      className={`px-4 py-2 rounded-full ${theme.primaryBtnClass} text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer`}
                    >
                      <Plus size={14} /> Schedule Activity
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {(eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []).length === 0 ? (
                    <div className="text-center py-12 text-[var(--muted)] text-xs">
                      {isBefore(selectedDate, startOfDay(new Date()))
                        ? 'No activities for this past day.'
                        : 'No activities scheduled for this day. Click "+ Schedule Activity" to add one.'}
                    </div>
                  ) : (
                    (eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []).map(evt => (
                      <div
                        key={evt.id}
                        onClick={() => {
                          setSelectedEvent(evt);
                          setIsDetailsSidebarOpen(true);
                        }}
                        className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] flex items-center justify-between gap-4 cursor-pointer hover:shadow-xs transition-all"
                      >
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm">{evt.title}</h4>
                          <div className="flex items-center gap-3 text-xs opacity-80 text-[var(--muted)]">
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatEventTime(evt)}</span>
                            {evt.address && <span className="flex items-center gap-1"><MapPin size={12} /> {evt.address}</span>}
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--text)]">
                          {evt.status || 'Scheduled'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* View Mode 4: List View (Month-based, Black & White Editorial Theme) */}
            {viewMode === 'list' && (
              <div className="flex-1 flex flex-col min-h-0 p-5 sm:p-6 overflow-y-auto space-y-6">
                
                {/* Month Summary Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[var(--text)]" />
                    <h2 className="text-sm font-bold text-[var(--text)]">
                      {format(currentDate, 'MMMM yyyy')} Schedule
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {monthListSections.totalInMonth} {monthListSections.totalInMonth === 1 ? 'Activity' : 'Activities'} in {format(currentDate, 'MMM yyyy')}
                  </span>
                </div>

                {monthListSections.totalInMonth === 0 ? (
                  <div className="flex flex-col items-center justify-center p-14 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--surface-alt)] text-[var(--muted)] flex items-center justify-center">
                      <CalendarDays size={22} />
                    </div>
                    <p className="text-sm font-bold text-[var(--text)]">
                      No activities scheduled for {format(currentDate, 'MMMM yyyy')}
                    </p>
                    <p className="text-xs text-[var(--muted)] max-w-sm">
                      Use the navigation arrows to check other months, or schedule a new task.
                    </p>
                    {!isBefore(endOfMonth(currentDate), startOfDay(new Date())) && (
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const targetDate = isBefore(currentDate, now) ? now : startOfMonth(currentDate);
                          setQuickCreateDate(format(targetDate, 'yyyy-MM-dd'));
                          setIsQuickCreateOpen(true);
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold ${theme.primaryBtnClass} shadow-xs cursor-pointer transition-all`}
                      >
                        + Schedule in {format(currentDate, 'MMMM')}
                      </button>
                    )}
                  </div>
                ) : (
                  monthListSections.sections.map((section) => (
                    <div key={section.id} className="space-y-3">
                      
                      {/* Section Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: section.dotColor }} />
                          <h3 className="text-sm font-bold text-[var(--text)]">
                            {section.title}
                          </h3>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${section.badgeStyle}`}>
                          {section.badge}
                        </span>
                      </div>

                      {/* Cards List in this Section (Sorted date & time wise - Monochromatic B&W Cards) */}
                      <div className="space-y-2.5">
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
                              className={`p-4 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer hover:bg-[var(--surface-alt)]/40 hover:shadow-xs group ${
                                isCompleted ? 'opacity-85' : ''
                              }`}
                            >
                              {/* Left: Checkmark + Title + Details */}
                              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const target = events.find((item) => item.id === evt.id);
                                    if (target) toggleMutation.mutate({ id: evt.id, status: target.status });
                                  }}
                                  className="mt-0.5 text-[var(--muted)] hover:text-[var(--text)] transition-transform active:scale-90 shrink-0 cursor-pointer"
                                  title={isCompleted ? 'Mark as Scheduled' : 'Mark as Completed'}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 size={20} className="text-[#131315] dark:text-white" />
                                  ) : (
                                    <Circle size={20} className="hover:text-[var(--text)] transition-colors" />
                                  )}
                                </button>

                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className={`text-sm font-semibold text-[var(--text)] group-hover:underline transition-colors truncate ${
                                      isCompleted ? 'line-through text-[var(--muted)]' : ''
                                    }`}>
                                      {evt.title}
                                    </h4>
                                    {evt.priority && getPriorityBadge(evt.priority)}

                                    {isBranchOperations && displayName && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--text)]">
                                        <User size={10} className="text-[var(--muted)]" />
                                        <span>{displayName}</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Date & Time & Location Meta */}
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                                    <span className="inline-flex items-center gap-1 font-medium text-[var(--text)]">
                                      <Calendar size={12} className="text-[var(--muted)]" />
                                      <span>{evt.startDate}</span>
                                    </span>
                                    <span>&bull;</span>
                                    <span className="inline-flex items-center gap-1 font-medium text-[var(--text)]">
                                      <Clock size={12} className="text-[var(--muted)]" />
                                      <span>{formatEventTime(evt)}</span>
                                    </span>
                                    {evt.address && (
                                      <>
                                        <span>&bull;</span>
                                        <span className="inline-flex items-center gap-1 truncate max-w-sm text-[var(--muted)]">
                                          <MapPin size={12} className="shrink-0" />
                                          <span className="truncate">{evt.address}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {evt.notes && (
                                    <p className="text-xs text-[var(--muted)] line-clamp-1 italic bg-[var(--surface-alt)] px-2.5 py-1 rounded-lg border border-[var(--line)] max-w-xl">
                                      "{evt.notes}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right: Status Pill & Chevron */}
                              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  isCompleted
                                    ? 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)]'
                                    : 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B] border-transparent'
                                }`}>
                                  {isCompleted ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                  <span>{evt.status || 'Scheduled'}</span>
                                </span>
                                <ChevronRight size={14} className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </main>

        </div>

        {/* Quick Event Popover Modal */}
        <QuickCreateModal
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          initialDate={quickCreateDate}
          onSave={(payload) => createMutation.mutateAsync(payload)}
          assignableEmployees={assignableEmployees}
          isBranchOperations={isBranchOperations}
          isSales={isSales}
          theme={theme}
        />

        {/* Slide-over Form Drawer (Full Form) */}
        <ActivitySidebar
          isOpen={isActivitySidebarOpen}
          onClose={() => setIsActivitySidebarOpen(false)}
          onSave={(payload) => createMutation.mutateAsync(payload)}
          isSales={isSales}
          assignableEmployees={isBranchOperations ? assignableEmployees : []}
          showAssigneeSelector={isBranchOperations}
        />

        {/* Slide-over Details Drawer */}
        <EventDetailsSidebar
          isOpen={isDetailsSidebarOpen}
          onClose={() => setIsDetailsSidebarOpen(false)}
          event={selectedEvent}
          onToggleComplete={(id) => {
            const target = events.find(e => e.id === id);
            if (target) toggleMutation.mutate({ id, status: target.status });
          }}
          onReassign={isBranchOperations ? (id, targetUser) => reassignMutation.mutateAsync({ id, assignedTo: targetUser }) : null}
          assignableEmployees={isBranchOperations ? assignableEmployees : []}
        />

      </div>
    </>
  );
};

export default OriginationActivities;
