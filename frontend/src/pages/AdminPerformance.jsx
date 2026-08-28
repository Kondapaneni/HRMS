import React, { useState, useEffect, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Loader2, 
  Activity, 
  Users, 
  CalendarDays, 
  Building2, 
  User, 
  Clock, 
  Check, 
  TrendingUp, 
  Award, 
  ArrowUpRight, 
  BarChart3, 
  ShieldCheck, 
  ChevronRight,
  Briefcase,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import api from '../api/axios';

const CustomChartTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-[#dadce0] shadow-lg shadow-black/8 text-xs">
        <p className="font-semibold text-[#1f1f1f] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-[#5f6368]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span>{entry.name}:</span>
            <span className="font-bold text-[#1f1f1f]">{entry.value} {unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme, highlight }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
      cardBg: highlight ? 'bg-[#f8fafd] border-[#4285F4] ring-1 ring-[#4285F4]/20' : 'bg-white border-[#e0e3e7]',
      badgeBg: 'bg-[#e8f0fe] text-[#1a73e8]'
    },
    indigo: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
      cardBg: highlight ? 'bg-[#faf7fd] border-[#8430ce] ring-1 ring-[#8430ce]/20' : 'bg-white border-[#e0e3e7]',
      badgeBg: 'bg-[#f3e8fd] text-[#8430ce]'
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
      cardBg: highlight ? 'bg-[#f6fcf8] border-[#34A853] ring-1 ring-[#34A853]/20' : 'bg-white border-[#e0e3e7]',
      badgeBg: 'bg-[#e6f4ea] text-[#137333]'
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
      cardBg: highlight ? 'bg-[#fefdf8] border-[#FBBC05] ring-1 ring-[#FBBC05]/20' : 'bg-white border-[#e0e3e7]',
      badgeBg: 'bg-[#fef7e0] text-[#b06000]'
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-md hover:border-[#dadce0] ${theme.cardBg}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const EmployeeRow = ({ item, onSelect, isSelected }) => {
  const { employee, summary } = item;
  const isHigh = summary.attendancePct >= 90;
  const isLow = summary.attendancePct < 75;

  return (
    <div 
      onClick={() => onSelect && onSelect(employee.id)}
      className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl transition-all cursor-pointer group ${
        isSelected 
          ? 'bg-[#e8f0fe] border border-[#d2e3fc]' 
          : 'hover:bg-[#f8fafd] border border-transparent'
      }`}
      title="Click to view performance details"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-[#f1f3f4] border border-[#dadce0] flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#4285F4] transition-colors">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[#3c4043]">
              {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
            </span>
          )}
        </div>
        <div className="truncate">
          <p className="text-xs sm:text-sm font-semibold text-[#1f1f1f] group-hover:text-[#1a73e8] transition-colors truncate">
            {employee.firstName} {employee.lastName}
          </p>
          <p className="text-[11px] text-[#5f6368] truncate">{employee.position || 'Employee'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-[#5f6368]">Attendance</p>
          <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
            isLow ? 'bg-[#fce8e6] text-[#c5221f]' : isHigh ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#f1f3f4] text-[#3c4043]'
          }`}>
            {summary.attendancePct}%
          </span>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] uppercase font-bold text-[#5f6368]">Work Hours</p>
          <p className="text-xs font-bold text-[#1a73e8]">{summary.totalHours || 0} hrs</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] uppercase font-bold text-[#5f6368]">Leaves</p>
          <p className="text-xs font-bold text-[#5f6368]">{summary.totalLeave}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#dadce0] group-hover:text-[#1a73e8] transition-colors" />
      </div>
    </div>
  );
};

const AdminPerformance = () => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Server-side employee search
  const { data: employees = [], isLoading: isLoadingEmployees, isFetching: isFetchingEmployees } = useQuery({
    queryKey: ['admin', 'employees', debouncedSearch],
    queryFn: async () => {
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedSearch)}&limit=100`);
      return res.data.employees || [];
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });

  // Auto-select first employee when data loads if none selected
  useEffect(() => {
    if ((!selectedEmpId || !employees.some(e => e.id === selectedEmpId)) && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  // Always fetch fresh performance analytics
  const { data: perfData, isLoading: isLoadingPerf, isFetching: isFetchingPerf } = useQuery({
    queryKey: ['admin', 'performance', selectedEmpId],
    queryFn: async () => {
      if (!selectedEmpId) return null;
      const res = await api.get(`/admin/performance?id=${selectedEmpId}`);
      return res.data;
    },
    enabled: !!selectedEmpId,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const currentWeek = useMemo(() => {
    if (!perfData?.currentMetrics?.weekly) return null;
    return perfData.currentMetrics.weekly.find(w => w.isCurrentWeek) || perfData.currentMetrics.weekly[perfData.currentMetrics.weekly.length - 1];
  }, [perfData]);

  if (isLoadingEmployees && !employees.length && !debouncedSearch) return <PageLoader message="Loading Performance Analytics..." />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Team Analytics & Metrics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight">
            Team Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Real-time attendance, work hours, leave patterns, and peer benchmarks across your organization.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          {isFetchingEmployees ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
          )}
          <input 
            type="search" 
            placeholder="Search employee by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
          />
        </div>
      </div>

      {/* Employee Quick Roster Chips */}
      <div className="bg-white p-4 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#1a73e8]" /> Select Employee Roster
          </p>
          <span className="text-[11px] font-medium text-[#5f6368] bg-[#f1f3f4] px-2.5 py-0.5 rounded-full">
            {employees.length} Employees Found
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
          {employees.length === 0 ? (
            <p className="text-xs text-[#5f6368] py-2">No matching employees found.</p>
          ) : (
            employees.map(emp => {
              const isSelected = emp.id === selectedEmpId;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmpId(emp.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#4285F4] shadow-xs ring-1 ring-[#4285F4]/30 font-semibold' 
                      : 'bg-[#f8fafd] text-[#3c4043] border-[#dadce0] hover:bg-[#e8eaed] hover:border-[#bdc1c6]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden ${
                    isSelected ? 'bg-[#1a73e8] text-white' : 'bg-[#dadce0] text-[#3c4043]'
                  }`}>
                    {emp.avatar ? <img src={emp.avatar} alt="Avatar" className="w-full h-full object-cover" /> : emp.firstName?.[0]}
                  </div>
                  <span>{emp.firstName} {emp.lastName}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1a73e8]" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {isLoadingPerf && (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#4285F4]" />
          <p className="text-xs font-medium text-[#5f6368]">Loading Performance Analytics...</p>
        </div>
      )}

      {!isLoadingPerf && perfData && (
        <div className="space-y-6">
          
          {/* Active Employee Profile Card */}
          <div className="bg-white border border-[#e0e3e7] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#f1f3f4] flex items-center justify-center border border-[#dadce0] shrink-0 overflow-hidden shadow-xs">
                {perfData.employee.avatar ? (
                  <img src={perfData.employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base sm:text-lg font-bold text-[#1a73e8]">
                    {(perfData.employee.firstName?.[0] || '') + (perfData.employee.lastName?.[0] || '')}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1f1f1f]">
                    {perfData.employee.firstName} {perfData.employee.lastName}
                  </h2>
                  <span className="text-xs font-mono font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                    {perfData.employee.employeeId}
                  </span>
                  <span className="text-xs font-medium text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#5f6368]">
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-[#5f6368]" /> {perfData.employee.department || 'General'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-[#5f6368]" /> {perfData.employee.position || 'Employee'}</span>
                  {perfData.employee.email && (
                    <>
                      <span>•</span>
                      <span>{perfData.employee.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-3 bg-[#f8fafd] border border-[#e0e3e7] rounded-xl p-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-bold text-[#5f6368] uppercase">Overall Score</p>
                <p className="text-lg font-bold text-[#1f1f1f]">{perfData.currentMonthSummary.attendancePct}%</p>
              </div>
              <div className={`p-2 rounded-xl ${perfData.currentMonthSummary.attendancePct >= 90 ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'}`}>
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard 
              title="Work Hours (This Week)" 
              value={currentWeek ? `${currentWeek.totalHours} hrs` : '0 hrs'}
              subtitle={currentWeek ? `Avg ${currentWeek.avgHoursPerDay} hrs/day (${currentWeek.presentDays} days)` : 'Current week'}
              icon={Clock} 
              colorTheme="indigo"
              highlight={true}
            />
            <StatCard 
              title="Work Hours (This Month)" 
              value={`${perfData.currentMonthSummary.totalHours || 0} hrs`}
              subtitle="Total tracked hours worked"
              icon={BarChart3} 
              colorTheme="blue" 
            />
            <StatCard 
              title="Present Days (This Month)" 
              value={perfData.currentMonthSummary.totalPresent}
              subtitle={`Out of ${perfData.currentMonthSummary.totalWorkdays} working days`}
              icon={CalendarDays} 
              colorTheme="green" 
            />
            <StatCard 
              title="Attendance Score" 
              value={`${perfData.currentMonthSummary.attendancePct}%`}
              subtitle="Monthly punctuality average"
              icon={Activity} 
              colorTheme="amber"
            />
          </div>

          {/* Weekly Work Hours Chart & Breakdown */}
          {perfData.currentMetrics?.weekly && perfData.currentMetrics.weekly.length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e0e3e7]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1f1f1f] flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#8430ce]" /> Weekly Work Hours Breakdown
                  </h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">Total hours logged per week over the last 6 calendar cycles</p>
                </div>
                {currentWeek && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff] self-start sm:self-auto">
                    <Sparkles className="w-3.5 h-3.5" /> Current: {currentWeek.totalHours} hrs ({currentWeek.avgHoursPerDay} hrs/day)
                  </span>
                )}
              </div>

              <div className="h-[260px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <BarChart data={perfData.currentMetrics.weekly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                    <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dx={-8} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip unit="hrs" />} />
                    <Bar dataKey="totalHours" name="Work Hours" fill="#8430ce" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Grid Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {perfData.currentMetrics.weekly.map((w, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border transition-all ${
                    w.isCurrentWeek 
                      ? 'bg-[#f3e8fd]/50 border-[#8430ce] ring-1 ring-[#8430ce]/30' 
                      : 'bg-[#f8fafd] border-[#e0e3e7] hover:border-[#dadce0]'
                  }`}>
                    <p className="text-[11px] font-semibold text-[#5f6368] truncate" title={w.label}>{w.label}</p>
                    <p className="text-lg font-bold text-[#1f1f1f] mt-1">{w.totalHours} <span className="text-xs font-normal text-[#5f6368]">hrs</span></p>
                    <p className="text-[10px] text-[#5f6368] mt-0.5">{w.presentDays} days • {w.avgHoursPerDay}h/day</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Trend */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e0e3e7]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1f1f1f] flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#1a73e8]" /> 6-Month Attendance Trend
                  </h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">Historical punctuality & attendance percentage</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <AreaChart data={perfData.currentMetrics.monthly}>
                    <defs>
                      <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4285F4" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dx={-8} domain={[0, 100]} />
                    <Tooltip content={<CustomChartTooltip unit="%" />} />
                    <Area type="monotone" dataKey="attendancePct" name="Attendance %" stroke="#4285F4" strokeWidth={2.5} fillOpacity={1} fill="url(#attendanceGrad)" dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#4285F4' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#4285F4' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leave Usage Trend */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e0e3e7]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1f1f1f] flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#b06000]" /> Leave Usage History
                  </h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">Monthly total leave days taken</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <BarChart data={perfData.currentMetrics.monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dx={-8} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip unit="days" />} />
                    <Bar dataKey="leave" name="Leave Days" fill="#FBBC05" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comparisons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peer Comparison */}
            {perfData.peerMetrics && perfData.peerMetrics.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xs border border-[#e0e3e7] overflow-hidden">
                <div className="p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex justify-between items-center">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[#1f1f1f] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1a73e8]" /> Peer Comparison
                    </h3>
                    <p className="text-xs text-[#5f6368] mt-0.5">Click any peer below to inspect their full analytics</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#5f6368] uppercase">Department Avg</p>
                    <p className="text-base font-bold text-[#1f1f1f]">{perfData.peerAverageAttendance}%</p>
                  </div>
                </div>
                <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {perfData.peerMetrics.map(peer => (
                    <EmployeeRow 
                      key={peer.employee.id} 
                      item={peer} 
                      onSelect={(id) => setSelectedEmpId(id)}
                      isSelected={peer.employee.id === selectedEmpId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Direct Reports Comparison */}
            {perfData.reportMetrics && perfData.reportMetrics.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xs border border-[#e0e3e7] overflow-hidden">
                <div className="p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex justify-between items-center">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[#1f1f1f] flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#137333]" /> Direct Reports
                    </h3>
                    <p className="text-xs text-[#5f6368] mt-0.5">Click any direct report below to inspect their full analytics</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#5f6368] uppercase">Team Avg</p>
                    <p className="text-base font-bold text-[#1f1f1f]">{perfData.reportAverageAttendance}%</p>
                  </div>
                </div>
                <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {perfData.reportMetrics.map(report => (
                    <EmployeeRow 
                      key={report.employee.id} 
                      item={report} 
                      onSelect={(id) => setSelectedEmpId(id)}
                      isSelected={report.employee.id === selectedEmpId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default AdminPerformance;
