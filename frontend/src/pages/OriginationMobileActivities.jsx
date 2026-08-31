import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
  Filter,
  Check,
  CalendarDays,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
  Calendar,
  Save,
  FileText,
  Tag,
  RotateCcw,
  Users,
  UserCheck,
  CheckSquare
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';

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

  // Form State for Mobile Activity Creation
  const [formData, setFormData] = useState({
    title: '',
    priority: 'Medium',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '11:00',
    allDay: false,
    address: '',
    notes: '',
    status: 'Scheduled'
  });
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  // Reset / init form on opening create mode
  const handleOpenCreateMode = () => {
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const nowHour = now.getHours();
    const startHourStr = String(nowHour).padStart(2, '0') + ':00';
    const endHourStr = String(Math.min(23, nowHour + 1)).padStart(2, '0') + ':00';

    setFormData({
      title: '',
      priority: 'Medium',
      startDate: dateStr,
      startTime: startHourStr,
      endDate: dateStr,
      endTime: endHourStr,
      allDay: false,
      address: '',
      notes: '',
      status: 'Scheduled'
    });
    setSelectedAssignees([]);
    setFormErrors({});
    setViewMode('create');
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedEvent]);

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
        orbs: ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-400'],
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

  // Handle Form Submission
  const handleSaveActivity = (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Activity title is required';
    }
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    const payload = {
      title: formData.title.trim(),
      priority: formData.priority,
      startDate: formData.startDate,
      startTime: formData.allDay ? '00:00' : formData.startTime,
      endDate: formData.endDate || formData.startDate,
      endTime: formData.allDay ? '23:59' : formData.endTime,
      allDay: formData.allDay,
      address: formData.address.trim(),
      notes: formData.notes.trim(),
      status: formData.status,
      assignedTo: isBranchOperations && selectedAssignees.length > 0 ? selectedAssignees : undefined
    };

    createMutation.mutate(payload);
  };

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
              ? 'bg-[#e6fffa] text-[#0d9488] border-[#b2f5ea]' 
              : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
          }`}>
            Medium
          </span>
        );
    }
  };

  const handleToggleStatus = (e, act) => {
    e.stopPropagation();
    toggleMutation.mutate({ id: act.id, status: act.status });
  };

  // ==========================================
  // VIEW 1: FULL PAGE CREATION FORM (Matches EditMobileProfile.jsx)
  // ==========================================
  if (viewMode === 'create') {
    const isSubmitting = createMutation.isPending;

    return (
      <div className="space-y-4 pb-14 select-none">
        {/* 1. Hero Section with Animated Motion Graphics */}
        <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
          {/* Animated Liquid Orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute -top-20 -left-10 w-72 h-72 ${theme.orbs[0]} rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none`}
          />
          <motion.div
            animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className={`absolute -top-10 -right-10 w-64 h-64 ${theme.orbs[1]} rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none`}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className={`absolute bottom-0 left-20 w-80 h-80 ${theme.orbs[2]} rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none`}
          />

          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

          {/* Top Bar with Back Chevron & Save Button */}
          <div className="relative z-10 px-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              title="Back to Activities"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest drop-shadow-md">
                {theme.tagText}
              </p>
              <h2 className="text-xl font-black text-white tracking-tight drop-shadow-sm">
                Schedule Activity
              </h2>
            </div>

            <button
              type="button"
              onClick={handleSaveActivity}
              disabled={isSubmitting}
              className={`px-4 py-2.5 rounded-full ${theme.primaryBtn} text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer shrink-0`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save</span>
            </button>
          </div>
        </section>

        {/* 2. Elevated Form Container */}
        <form onSubmit={handleSaveActivity} className="relative z-20 -mt-8 mx-0.5 space-y-3.5">
          
          {/* Card 1: Basic Information */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#f1f3f4]">
              <FileText className="w-4 h-4 text-[#1a73e8]" />
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                Activity Details
              </h3>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                Activity Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formErrors.title) setFormErrors({ ...formErrors, title: null });
                }}
                placeholder="e.g., Client KYC Verification, Follow-up Call..."
                className={`w-full bg-[#f8fafd] border ${
                  formErrors.title ? 'border-rose-400' : 'border-[#dadce0]'
                } rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] outline-none transition-all ${theme.ringHighlight}`}
              />
              {formErrors.title && (
                <p className="text-[10px] text-rose-500 font-semibold px-2">{formErrors.title}</p>
              )}
            </div>

            {/* Priority Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Urgent', label: 'Urgent', color: 'bg-rose-50 border-rose-200 text-rose-700 font-bold' },
                  { id: 'High', label: 'High', color: 'bg-amber-50 border-amber-200 text-amber-800 font-bold' },
                  { id: 'Medium', label: 'Medium', color: 'bg-blue-50 border-blue-200 text-blue-700 font-bold' },
                  { id: 'Low', label: 'Low', color: 'bg-slate-100 border-slate-200 text-slate-700 font-medium' }
                ].map((p) => {
                  const isSelected = formData.priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`py-2 px-1 rounded-full text-xs font-semibold text-center border transition-all cursor-pointer ${
                        isSelected
                          ? `${p.color} ring-2 ring-offset-1 ring-slate-400 shadow-2xs`
                          : 'bg-white border-[#e0e3e7] text-[#5f6368] hover:bg-[#f8fafd]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Date & Time Schedule */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1a73e8]" />
                <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                  Date &amp; Time
                </h3>
              </div>

              {/* All-Day Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-[#5f6368]">All Day</span>
                <input
                  type="checkbox"
                  checked={formData.allDay}
                  onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                />
              </label>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-3.5 py-2 text-xs font-semibold text-[#1f1f1f] outline-none ${theme.ringHighlight}`}
                />
              </div>

              {!formData.allDay && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-3.5 py-2 text-xs font-semibold text-[#1f1f1f] outline-none ${theme.ringHighlight}`}
                  />
                </div>
              )}
            </div>

            {!formData.allDay && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-3.5 py-2 text-xs font-semibold text-[#1f1f1f] outline-none ${theme.ringHighlight}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-3.5 py-2 text-xs font-semibold text-[#1f1f1f] outline-none ${theme.ringHighlight}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Location & Remarks */}
          <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#f1f3f4]">
              <MapPin className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                Location &amp; Notes
              </h3>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                Location / Client Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., Gurunak Colony, Vijayawada..."
                className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] outline-none ${theme.ringHighlight}`}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#5f6368] uppercase">
                Remarks / Instructions
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add special instructions, document checklist, or notes..."
                className={`w-full bg-[#f8fafd] border border-[#dadce0] rounded-2xl p-3 text-xs font-medium text-[#1f1f1f] placeholder:text-[#80868b] outline-none ${theme.ringHighlight}`}
              />
            </div>
          </div>

          {/* Card 4: Branch Staff Assignment (Only in Branch Operations) */}
          {isBranchOperations && assignableEmployees.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1a73e8]" />
                  <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                    Assign Team Member
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#5f6368]">
                  {selectedAssignees.length} selected
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {assignableEmployees.map((emp) => {
                  const isChecked = selectedAssignees.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        setSelectedAssignees(prev => 
                          prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                        );
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-[#e8f0fe] border-[#d2e3fc] text-[#1a73e8]' 
                          : 'bg-[#f8fafd] border-[#e0e3e7] text-[#1f1f1f] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-white text-[#1a73e8] border border-[#d2e3fc] flex items-center justify-center font-bold text-xs shrink-0">
                          {(emp.name || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate">{emp.name} {emp.isCurrentUser ? '(You)' : ''}</p>
                          <p className="text-[10px] text-[#5f6368] truncate">{emp.role || 'Staff'}</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                        isChecked ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'border-[#dadce0] bg-white'
                      }`}>
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-4 rounded-full ${theme.primaryBtn} text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Activity...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Schedule Activity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVITIES LIST WITH HERO HEADER & SEPARATORS
  // ==========================================
  return (
    <div className="space-y-4 pb-14 select-none">

      {/* 1. Hero Section with Animated Motion Graphics (Themed for Loans vs Sales) */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs with Dynamic Module Colors */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute -top-20 -left-10 w-72 h-72 ${theme.orbs[0]} rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none`}
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className={`absolute -top-10 -right-10 w-64 h-64 ${theme.orbs[1]} rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none`}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className={`absolute bottom-0 left-20 w-80 h-80 ${theme.orbs[2]} rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none`}
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              {theme.tagText}
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              All Activities
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              {rawEvents.length} Total Scheduled Tasks
            </p>
          </div>

          <button
            onClick={handleOpenCreateMode}
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
                  onClick={handleOpenCreateMode}
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
                        className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 cursor-pointer shadow-xs active:bg-[#f8fafd] space-y-2.5 group ${
                          isCompleted
                            ? 'border-[#e0e3e7] opacity-80'
                            : isSales
                              ? 'border-emerald-100 hover:border-emerald-400'
                              : 'border-[#d2e3fc]/80 hover:border-[#1a73e8]'
                        }`}
                      >
                        {/* Top Row: Checkbox + Title & Priority */}
                        <div className="flex items-start gap-3">
                          {/* 1-Click Complete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(e, act)}
                            className="mt-0.5 text-[#5f6368] hover:text-[#1a73e8] transition-colors shrink-0 cursor-pointer"
                            title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={20} className="text-[#137333] fill-[#e6f4ea]" />
                            ) : (
                              <Circle size={20} className={`text-[#5f6368] ${isSales ? 'hover:text-emerald-600' : 'hover:text-[#1a73e8]'} hover:scale-110 transition-transform`} />
                            )}
                          </button>

                          {/* Content Details */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className={`text-sm font-bold truncate ${theme.titleHover} transition-colors ${
                                isCompleted 
                                  ? 'line-through text-[#80868b]' 
                                  : isSales 
                                    ? 'text-emerald-800' 
                                    : 'text-[#1a73e8]'
                              }`}>
                                {act.title}
                              </h4>
                              {act.priority && getPriorityBadge(act.priority)}

                              {isBranchOperations && act.assignedToName && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full border bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]">
                                  <User size={11} className="text-[#1a73e8]" />
                                  <span>{act.assignedToName}</span>
                                </span>
                              )}
                            </div>

                            {/* Meta: Time, Date, Location */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5f6368]">
                              <span className="flex items-center gap-1 font-medium text-[#1f1f1f]">
                                <Clock size={13} className={theme.clockColor} />
                                {formatEventTime(act)} &bull; {formatEventDate(act)}
                              </span>

                              {act.address && (
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <MapPin size={13} className="text-[#ea4335] shrink-0" />
                                  <span className="truncate">{act.address}</span>
                                </span>
                              )}
                            </div>

                            {/* Optional Notes snippet inside light bubble */}
                            {act.notes && (
                              <p className="text-xs text-[#5f6368] line-clamp-2 italic bg-[#f8fafd] px-3 py-1.5 rounded-xl border border-[#e0e3e7]/60">
                                "{act.notes}"
                              </p>
                            )}
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

      {/* ==========================================
          MOBILE ACTIVITY DETAILS POPUP MODAL (Matching EmployeeMobileProfile.jsx)
          ========================================== */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedEvent && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedEvent(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              />

              {/* Popup Dialog Box */}
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-[#e0e3e7] overflow-hidden z-10 p-5 space-y-4"
              >
                {/* Header: Priority & Close Button */}
                <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(selectedEvent.priority)}
                    {selectedEvent.status === 'Completed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                        <CheckCircle2 size={12} /> Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                        <Clock size={12} /> Scheduled
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Title */}
                <div>
                  <h3 className={`text-base sm:text-lg font-black text-[#1f1f1f] leading-snug ${
                    selectedEvent.status === 'Completed' ? 'line-through text-[#80868b]' : ''
                  }`}>
                    {selectedEvent.title}
                  </h3>
                </div>

                {/* Details List */}
                <div className="space-y-2.5 bg-[#f8fafd] rounded-2xl p-4 border border-[#e0e3e7]/80 text-xs">
                  {/* Date & Time */}
                  <div className="flex items-start gap-2.5 text-[#1f1f1f]">
                    <Clock className="w-4 h-4 text-[#1a73e8] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">{formatEventDate(selectedEvent)}</p>
                      <p className="text-[11px] text-[#5f6368]">{formatEventTime(selectedEvent)}</p>
                    </div>
                  </div>

                  {/* Location */}
                  {selectedEvent.address && (
                    <div className="flex items-start gap-2.5 text-[#1f1f1f] pt-2 border-t border-[#e0e3e7]/60">
                      <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">Location</p>
                        <p className="text-[11px] text-[#5f6368]">{selectedEvent.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Assignee */}
                  {selectedEvent.assignedToName && (
                    <div className="flex items-start gap-2.5 text-[#1f1f1f] pt-2 border-t border-[#e0e3e7]/60">
                      <User className="w-4 h-4 text-[#1a73e8] mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">Assigned To</p>
                        <p className="text-[11px] text-[#5f6368]">{selectedEvent.assignedToName}</p>
                      </div>
                    </div>
                  )}

                  {/* Remarks / Notes */}
                  {selectedEvent.notes && (
                    <div className="pt-2 border-t border-[#e0e3e7]/60">
                      <p className="font-bold text-[#5f6368] mb-1">Remarks &amp; Notes</p>
                      <p className="text-xs text-[#1f1f1f] italic bg-white p-2.5 rounded-xl border border-[#dadce0]">
                        "{selectedEvent.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions: Toggle Status & Close */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate({ id: selectedEvent.id, status: selectedEvent.status })}
                    className={`w-full py-3 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-[0.98] ${
                      selectedEvent.status === 'Completed'
                        ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                        : 'bg-[#137333] text-white hover:bg-[#0d5926]'
                    }`}
                  >
                    {selectedEvent.status === 'Completed' ? (
                      <>
                        <RotateCcw size={14} />
                        <span>Mark as Pending</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Mark as Completed</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="w-full py-2.5 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer text-center active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default OriginationMobileActivities;
