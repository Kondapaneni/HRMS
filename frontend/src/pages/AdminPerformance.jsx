import React, { useState, useEffect, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import SearchBar from '../components/ui/SearchBar';
import { useRemoteData } from '../state/remote.js';
import {
  Search,
  Loader2,
  Activity,
  Users,
  CalendarDays,
  Building2,
  Clock,
  Check,
  Award,
  BarChart3,
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
  AreaChart,
  Area
} from 'recharts';
import api from '../api/axios';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Avatar from '../components/ui/Avatar';

const CustomChartTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--ink)] text-white px-3 py-2 rounded-[9px] shadow-[0_8px_24px_rgba(19,19,21,0.2)] text-xs">
        <p className="font-medium text-white mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-[#8B8B95]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span>{entry.name}:</span>
            <span className="font-medium text-white">
              {entry.value} {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const EmployeeRow = ({ item, onSelect, isSelected }) => {
  const { employee, summary } = item;
  const isHigh = summary.attendancePct >= 90;
  const isLow = summary.attendancePct < 75;

  return (
    <div
      onClick={() => onSelect && onSelect(employee.id)}
      className={`flex items-center justify-between p-3 rounded-[14px] transition-all cursor-pointer group ${
        isSelected
          ? 'bg-[var(--brand-tint)] border border-[var(--brand)]/30'
          : 'hover:bg-[var(--surface-alt)] border border-transparent'
      }`}
      title="Click to view performance details"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          name={`${employee.firstName || ''} ${employee.lastName || ''}`}
          src={employee.avatar}
          size={36}
          shape="square"
          radius={12}
        />
        <div className="truncate">
          <p className="text-xs font-medium text-[var(--text)] group-hover:text-[var(--brand-deep)] transition-colors truncate">
            {employee.firstName} {employee.lastName}
          </p>
          <p className="text-[11px] text-[var(--muted)] truncate">{employee.position || 'Employee'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="text-right">
          <p className="text-[10px] text-[var(--muted)]">Attendance</p>
          <StatusBadge status={isLow ? 'Danger' : isHigh ? 'Success' : 'Neutral'}>
            {summary.attendancePct}%
          </StatusBadge>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-[var(--muted)]">Hours</p>
          <p className="text-xs font-medium text-[var(--brand-deep)]">{summary.totalHours || 0} hrs</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-[var(--muted)]">Leaves</p>
          <p className="text-xs font-medium text-[var(--muted)]">{summary.totalLeave}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" />
      </div>
    </div>
  );
};

const AdminPerformance = () => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: employees = [], isLoading: isLoadingEmployees, isFetching: isFetchingEmployees } = useRemoteData({
    scope: ['admin', 'employees', debouncedSearch],
    load: async () => {
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedSearch)}&limit=100`);
      return res.data.employees || [];
    },
  });

  useEffect(() => {
    if ((!selectedEmpId || !employees.some((e) => e.id === selectedEmpId)) && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  const { data: perfData, isLoading: isLoadingPerf } = useRemoteData({
    scope: ['admin', 'performance', selectedEmpId],
    load: async () => {
      if (!selectedEmpId) return null;
      const res = await api.get(`/admin/performance?id=${selectedEmpId}`);
      return res.data;
    },
    enabled: !!selectedEmpId,
  });

  const currentWeek = useMemo(() => {
    if (!perfData?.currentMetrics?.weekly) return null;
    return (
      perfData.currentMetrics.weekly.find((w) => w.isCurrentWeek) ||
      perfData.currentMetrics.weekly[perfData.currentMetrics.weekly.length - 1]
    );
  }, [perfData]);

  if (isLoadingEmployees && !employees.length && !debouncedSearch) {
    return <PageLoader message="Loading performance analytics..." />;
  }

  return (
    <div className="space-y-5 pb-12 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Team performance analytics
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Real-time attendance, work hours, leave patterns, and peer benchmarks across your organization
          </p>
        </div>

        {/* Search Input */}
        <SearchBar
          placeholder="Search employee by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          isFetching={isFetchingEmployees}
          wrapperClassName="w-full sm:w-80"
        />
      </div>

      {/* Employee Quick Roster Chips */}
      <div className="bg-[var(--surface)] p-4 rounded-[24px] space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--muted)] flex items-center gap-1.5">
            <Users size={14} className="text-[var(--brand-deep)]" /> Select employee roster
          </p>
          <span className="text-[11px] font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-2.5 py-0.5 rounded-full">
            {employees.length} employees found
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 hide-scrollbar">
          {employees.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-2">No matching employees found.</p>
          ) : (
            employees.map((emp) => {
              const isSelected = emp.id === selectedEmpId;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelectedEmpId(emp.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--ink)] text-white dark:bg-white dark:text-[#131315] shadow-xs'
                      : 'bg-[var(--surface-alt)] text-[var(--text-2)] hover:bg-[var(--brand-tint)]'
                  }`}
                >
                  <Avatar
                    name={`${emp.firstName || ''} ${emp.lastName || ''}`}
                    src={emp.avatar}
                    size={20}
                    shape="square"
                    radius={6}
                  />
                  <span>
                    {emp.firstName} {emp.lastName}
                  </span>
                  {isSelected && <Check size={13} />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {isLoadingPerf && (
        <div className="flex flex-col items-center justify-center p-16 bg-[var(--surface)] rounded-[24px] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-deep)]" />
          <p className="text-xs font-medium text-[var(--muted)]">Loading performance analytics...</p>
        </div>
      )}

      {!isLoadingPerf && perfData && (
        <div className="space-y-4">
          {/* Active Employee Profile Card */}
          <div className="bg-[var(--surface)] rounded-[24px] p-[18px] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar
                name={`${perfData.employee.firstName || ''} ${perfData.employee.lastName || ''}`}
                src={perfData.employee.avatar}
                size={56}
                shape="square"
                radius={14}
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-medium text-[var(--text)]">
                    {perfData.employee.firstName} {perfData.employee.lastName}
                  </h2>
                  <span className="text-xs font-mono font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                    {perfData.employee.employeeId}
                  </span>
                  <StatusBadge status="Success">Active</StatusBadge>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} /> {perfData.employee.department || 'General'}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={13} /> {perfData.employee.position || 'Employee'}
                  </span>
                  {perfData.employee.email && (
                    <>
                      <span>&bull;</span>
                      <span>{perfData.employee.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-3 bg-[var(--surface-alt)] rounded-[14px] p-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-[var(--muted)]">Overall score</p>
                <p className="text-lg font-medium text-[var(--text)]">
                  {perfData.currentMonthSummary.attendancePct}%
                </p>
              </div>
              <div
                className={`p-2 rounded-[10px] ${
                  perfData.currentMonthSummary.attendancePct >= 90
                    ? 'bg-[#E6F6EC] text-[#1F9D55]'
                    : 'bg-[#FDF3DC] text-[#B7791F]'
                }`}
              >
                <Award size={18} />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="Work hours (This week)"
              value={currentWeek ? `${currentWeek.totalHours} hrs` : '0 hrs'}
              caption={
                currentWeek
                  ? `Avg ${currentWeek.avgHoursPerDay} hrs/day (${currentWeek.presentDays} days)`
                  : 'Current week'
              }
              icon={<Clock size={18} />}
            />
            <StatCard
              title="Work hours (This month)"
              value={`${perfData.currentMonthSummary.totalHours || 0} hrs`}
              caption="Total tracked hours worked"
              icon={<BarChart3 size={18} />}
            />
            <StatCard
              title="Present days"
              value={perfData.currentMonthSummary.totalPresent}
              caption={`Out of ${perfData.currentMonthSummary.totalWorkdays} working days`}
              icon={<CalendarDays size={18} />}
            />
            <StatCard
              title="Attendance score"
              value={`${perfData.currentMonthSummary.attendancePct}%`}
              caption="Monthly punctuality average"
              icon={<Activity size={18} />}
            />
          </div>

          {/* Weekly Work Hours Chart */}
          {perfData.currentMetrics?.weekly && perfData.currentMetrics.weekly.length > 0 && (
            <div className="bg-[var(--surface)] p-[18px] rounded-[24px]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                    <Clock size={15} className="text-[var(--brand-deep)]" /> Weekly work hours breakdown
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Total hours logged per week over the last 6 calendar cycles
                  </p>
                </div>
                {currentWeek && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-tint)] text-[var(--brand-deep)] self-start sm:self-auto">
                    <Sparkles size={12} /> Current: {currentWeek.totalHours} hrs ({currentWeek.avgHoursPerDay} hrs/day)
                  </span>
                )}
              </div>

              <div className="h-[240px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <BarChart data={perfData.currentMetrics.weekly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line, #EFEFF1)" />
                    <XAxis
                      dataKey="shortLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted, #6B6B75)' }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted, #6B6B75)' }}
                      dx={-8}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip unit="hrs" />} />
                    <Bar dataKey="totalHours" name="Work hours" fill="#8AADDB" radius={[8, 8, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {perfData.currentMetrics.weekly.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-[14px] transition-all ${
                      w.isCurrentWeek
                        ? 'bg-[var(--brand-tint)] border border-[var(--brand)]/30'
                        : 'bg-[var(--surface-alt)]'
                    }`}
                  >
                    <p className="text-[11px] font-medium text-[var(--muted)] truncate" title={w.label}>
                      {w.label}
                    </p>
                    <p className="text-base font-medium text-[var(--text)] mt-1">
                      {w.totalHours} <span className="text-xs text-[var(--muted)]">hrs</span>
                    </p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">
                      {w.presentDays} days &bull; {w.avgHoursPerDay}h/day
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Attendance Trend */}
            <div className="bg-[var(--surface)] p-[18px] rounded-[24px]">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                  <Activity size={15} className="text-[var(--brand-deep)]" /> 6-month attendance trend
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">Historical punctuality &amp; attendance percentage</p>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <AreaChart data={perfData.currentMetrics.monthly}>
                    <defs>
                      <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8AADDB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#8AADDB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line, #EFEFF1)" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted, #6B6B75)' }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted, #6B6B75)' }}
                      dx={-8}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomChartTooltip unit="%" />} />
                    <Area
                      type="monotone"
                      dataKey="attendancePct"
                      name="Attendance %"
                      stroke="#8AADDB"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#attendanceGrad)"
                      dot={{ r: 3, strokeWidth: 2, fill: '#fff', stroke: '#8AADDB' }}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#8AADDB' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leave Usage History */}
            <div className="bg-[var(--surface)] p-[18px] rounded-[24px]">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                  <CalendarDays size={15} className="text-[var(--accent-pink-deep)]" /> Leave usage history
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">Monthly total leave days taken</p>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <BarChart data={perfData.currentMetrics.monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line, #EFEFF1)" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted, #6B6B75)' }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted, #6B6B75)' }}
                      dx={-8}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip unit="days" />} />
                    <Bar dataKey="leave" name="Leave days" fill="#E3B9DF" radius={[8, 8, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comparisons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Peer Comparison */}
            {perfData.peerMetrics && perfData.peerMetrics.length > 0 && (
              <div className="bg-[var(--surface)] rounded-[24px] p-[18px] flex flex-col justify-between">
                <div className="pb-3 border-b border-[var(--line)] flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                      <Users size={14} className="text-[var(--brand-deep)]" /> Peer comparison
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Inspect peer benchmarks in the same team</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--muted)]">Dept average</p>
                    <p className="text-sm font-medium text-[var(--text)]">{perfData.peerAverageAttendance}%</p>
                  </div>
                </div>
                <div className="space-y-1 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {perfData.peerMetrics.map((peer) => (
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
              <div className="bg-[var(--surface)] rounded-[24px] p-[18px] flex flex-col justify-between">
                <div className="pb-3 border-b border-[var(--line)] flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                      <Building2 size={14} className="text-[#1F9D55]" /> Direct reports
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Inspect performance across supervised staff</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--muted)]">Team average</p>
                    <p className="text-sm font-medium text-[var(--text)]">{perfData.reportAverageAttendance}%</p>
                  </div>
                </div>
                <div className="space-y-1 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {perfData.reportMetrics.map((report) => (
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
