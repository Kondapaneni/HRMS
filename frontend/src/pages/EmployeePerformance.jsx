import { useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, CalendarDays, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../api/axios';
import EmployeeMobilePerformance from './EmployeeMobilePerformance';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[var(--brand-tint)]',
      iconColor: 'text-[var(--brand-deep)]',
    },
    green: {
      iconBg: 'bg-[#E6F6EC]',
      iconColor: 'text-[#1F9D55]',
    },
    purple: {
      iconBg: 'bg-[var(--accent-pink-tint)]',
      iconColor: 'text-[var(--accent-pink-deep)]',
    },
    amber: {
      iconBg: 'bg-[#FDF3DC]',
      iconColor: 'text-[#B7791F]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 transition-all duration-200 hover:border-[var(--brand)]/40">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[var(--text)] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[var(--muted)] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-[14px] ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const EmployeeRow = ({ item, isSelf = false }) => {
  const { employee, summary } = item;
  const isHigh = summary.attendancePct >= 90;
  const isLow = summary.attendancePct < 75;

  return (
    <div className={`flex items-center justify-between p-4 transition-colors ${isSelf ? 'bg-[var(--brand-tint)]/30' : 'hover:bg-[var(--brand-tint)]/15'}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[14px] bg-[var(--brand-tint)] border border-[var(--line)] flex items-center justify-center overflow-hidden shrink-0">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[var(--brand-deep)]">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
            {employee.firstName} {employee.lastName}
            {isSelf && (
              <span className="text-[10px] font-semibold bg-[var(--ink)] text-white px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">{employee.position || 'Team Member'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-right">
          <p className="text-[9px] uppercase font-semibold text-[var(--muted)] tracking-wider">Attendance</p>
          <p className={`text-xs font-bold ${isLow ? 'text-[#D64550]' : isHigh ? 'text-[#1F9D55]' : 'text-[var(--text)]'}`}>
            {summary.attendancePct}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-semibold text-[var(--muted)] tracking-wider">Work Hours</p>
          <p className="text-xs font-bold text-[var(--brand-deep)]">{summary.totalHours || 0} hrs</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-semibold text-[var(--muted)] tracking-wider">Leaves</p>
          <p className="text-xs font-bold text-[var(--muted)]">{summary.totalLeave || 0}</p>
        </div>
      </div>
    </div>
  );
};

const EmployeePerformance = () => {
  const { data: perfData, isLoading } = useQuery({
    queryKey: ['employee', 'performance'],
    queryFn: async () => {
      const res = await api.get('/employee/performance');
      return res.data;
    }
  });

  const currentWeek = useMemo(() => {
    if (!perfData?.currentMetrics?.weekly) return null;
    return perfData.currentMetrics.weekly.find(w => w.isCurrentWeek) || perfData.currentMetrics.weekly[perfData.currentMetrics.weekly.length - 1];
  }, [perfData]);

  if (isLoading) return <PageLoader message="Loading Performance Analytics..." />;

  if (!perfData) {
    return (
      <div className="p-12 text-center text-[var(--muted)] bg-[var(--surface)] rounded-[24px] border border-[var(--line)]">
        No performance records available for this account.
      </div>
    );
  }

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobilePerformance />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-medium text-[var(--muted)]">Productivity &amp; analytics</span>
          </div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
            <span>Performance &amp; time analytics</span>
            <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
              Active tracking
            </span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Weekly velocity, 6-month attendance consistency trends, and department benchmark comparisons.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <StatCard 
          title="Work hours (this week)" 
          value={currentWeek ? `${currentWeek.totalHours} hrs` : '0 hrs'}
          subtitle={currentWeek ? `Avg ${currentWeek.avgHoursPerDay} hrs/day (${currentWeek.presentDays} days)` : 'Current week'}
          icon={Clock} 
        />
        <StatCard 
          title="Work hours (this month)" 
          value={`${perfData.currentMonthSummary?.totalHours || 0} hrs`}
          subtitle="Cumulative monthly hours logged"
          icon={Clock} 
        />
        <StatCard 
          title="Present days (this month)" 
          value={`${perfData.currentMonthSummary?.totalPresent || 0} Days`}
          subtitle={`Out of ${perfData.currentMonthSummary?.totalWorkdays || 0} working days`}
          icon={CalendarDays} 
        />
        <StatCard 
          title="Attendance score" 
          value={`${perfData.currentMonthSummary?.attendancePct || 0}%`}
          subtitle="Monthly compliance rating"
          icon={Activity} 
          colorTheme="amber"
        />
      </div>

      {/* Weekly Work Hours Chart & Breakdown */}
      {perfData.currentMetrics?.weekly && perfData.currentMetrics.weekly.length > 0 && (
        <div className="bg-[var(--surface)] p-6 rounded-[24px] border border-[var(--line)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--line)] gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--brand-deep)]" /> Weekly Work Hours Breakdown
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">Total hours worked per week for the last 6 weeks</p>
            </div>
            {currentWeek && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-tint)] text-[var(--brand-deep)] self-start sm:self-auto">
                This Week: {currentWeek.totalHours} hrs ({currentWeek.avgHoursPerDay} hrs/day)
              </span>
            )}
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart data={perfData.currentMetrics.weekly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} dx={-8} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--surface-alt)' }} 
                  contentStyle={{ borderRadius: '14px', border: '1px solid var(--line)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} 
                  formatter={(val) => [`${val} hrs`, 'Work Hours']} 
                />
                <Bar dataKey="totalHours" name="Work Hours" fill="#8AADDB" radius={[10, 10, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Grid Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {perfData.currentMetrics.weekly.map((w, idx) => (
              <div 
                key={idx} 
                className={`p-3.5 rounded-[18px] border transition-all ${
                  w.isCurrentWeek 
                    ? 'bg-[var(--brand-tint)]/60 border-[var(--brand)]/40 ring-1 ring-[var(--brand)]' 
                    : 'bg-[var(--surface-alt)] border-[var(--line)]'
                }`}
              >
                <p className="text-[11px] font-semibold text-[var(--muted)] truncate" title={w.label}>{w.label}</p>
                <p className="text-lg font-bold text-[var(--text)] mt-1">{w.totalHours} <span className="text-xs font-normal text-[var(--muted)]">hrs</span></p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">{w.presentDays} days &bull; {w.avgHoursPerDay}h/day</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] p-6 rounded-[24px] border border-[var(--line)]">
          <h3 className="text-base font-semibold text-[var(--text)] mb-1">6-Month Attendance Trend</h3>
          <p className="text-xs text-[var(--muted)] mb-6">Percentage consistency across recent calendar months</p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <LineChart data={perfData.currentMetrics?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} dx={-8} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ stroke: 'var(--line)', strokeWidth: 1, strokeDasharray: '4 4' }} 
                  contentStyle={{ borderRadius: '14px', border: '1px solid var(--line)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} 
                />
                <Line type="monotone" dataKey="attendancePct" name="Attendance %" stroke="#8AADDB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#8AADDB' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--surface)] p-6 rounded-[24px] border border-[var(--line)]">
          <h3 className="text-base font-semibold text-[var(--text)] mb-1">Leave Usage Trend</h3>
          <p className="text-xs text-[var(--muted)] mb-6">Monthly approved leave requests taken</p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart data={perfData.currentMetrics?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} dx={-8} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--surface-alt)' }} 
                  contentStyle={{ borderRadius: '14px', border: '1px solid var(--line)', backgroundColor: 'var(--surface)', color: 'var(--text)' }} 
                />
                <Bar dataKey="leave" name="Leave Days" fill="#E3B9DF" radius={[10, 10, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {perfData.peerMetrics && perfData.peerMetrics.length > 0 && (
          <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden">
            <div className="p-5 border-b border-[var(--line)] bg-[var(--surface-alt)] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--brand-deep)]" /> Peer Group Comparison
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">Department peer attendance &amp; hour benchmarks</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider">Peer Average</p>
                <p className="text-sm font-bold text-[var(--text)]">{perfData.peerAverageAttendance}%</p>
              </div>
            </div>
            <div className="divide-y divide-[var(--line)] max-h-[380px] overflow-y-auto">
              <EmployeeRow 
                item={{ employee: perfData.employee, summary: perfData.currentMonthSummary }} 
                isSelf={true} 
              />
              {perfData.peerMetrics.map(peer => (
                <EmployeeRow key={peer.employee.id} item={peer} />
              ))}
            </div>
          </div>
        )}

        {perfData.reportMetrics && perfData.reportMetrics.length > 0 && (
          <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden">
            <div className="p-5 border-b border-[var(--line)] bg-[var(--surface-alt)] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1F9D55]" /> Direct Reports Performance
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">Supervised team attendance metrics</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider">Team Average</p>
                <p className="text-sm font-bold text-[var(--text)]">{perfData.reportAverageAttendance}%</p>
              </div>
            </div>
            <div className="divide-y divide-[var(--line)] max-h-[380px] overflow-y-auto">
              {perfData.reportMetrics.map(report => (
                <EmployeeRow key={report.employee.id} item={report} />
              ))}
            </div>
          </div>
        )}
      </div>

      </div>
    </>
  );
};

export default EmployeePerformance;
