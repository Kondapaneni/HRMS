import React, { useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, CalendarDays, Clock, Sparkles, TrendingUp, BarChart2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import api from '../api/axios';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
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
    <div className={`flex items-center justify-between p-4 transition-colors ${isSelf ? 'bg-[#e8f0fe]/40' : 'hover:bg-[#f8fafd]'}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#f8fafd] border border-[#dadce0] flex items-center justify-center overflow-hidden shrink-0">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[#1a73e8]">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-[#1f1f1f] flex items-center gap-1.5">
            {employee.firstName} {employee.lastName}
            {isSelf && (
              <span className="text-[10px] font-semibold bg-[#1a73e8] text-white px-2 py-0.2 rounded-full">
                You
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#5f6368] mt-0.5">{employee.position || 'Team Member'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-right">
          <p className="text-[9px] uppercase font-semibold text-[#5f6368] tracking-wider">Attendance</p>
          <p className={`text-xs font-bold ${isLow ? 'text-[#c5221f]' : isHigh ? 'text-[#137333]' : 'text-[#1f1f1f]'}`}>
            {summary.attendancePct}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-semibold text-[#5f6368] tracking-wider">Work Hours</p>
          <p className="text-xs font-bold text-[#1a73e8]">{summary.totalHours || 0} hrs</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-semibold text-[#5f6368] tracking-wider">Leaves</p>
          <p className="text-xs font-bold text-[#5f6368]">{summary.totalLeave || 0}</p>
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
      <div className="p-12 text-center text-[#5f6368] bg-white rounded-2xl border border-[#e0e3e7]">
        No performance records available for this account.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Productivity &amp; Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Performance &amp; Time Analytics <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">Active Tracking</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Weekly velocity, 6-month attendance consistency trends, and department benchmark comparisons.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Work Hours (This Week)" 
          value={currentWeek ? `${currentWeek.totalHours} hrs` : '0 hrs'}
          subtitle={currentWeek ? `Avg ${currentWeek.avgHoursPerDay} hrs/day (${currentWeek.presentDays} days)` : 'Current week'}
          icon={Clock} 
          colorTheme="purple"
        />
        <StatCard 
          title="Work Hours (This Month)" 
          value={`${perfData.currentMonthSummary?.totalHours || 0} hrs`}
          subtitle="Cumulative monthly hours logged"
          icon={Clock} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Present Days (This Month)" 
          value={`${perfData.currentMonthSummary?.totalPresent || 0} Days`}
          subtitle={`Out of ${perfData.currentMonthSummary?.totalWorkdays || 0} working days`}
          icon={CalendarDays} 
          colorTheme="green" 
        />
        <StatCard 
          title="Attendance Score" 
          value={`${perfData.currentMonthSummary?.attendancePct || 0}%`}
          subtitle="Monthly compliance rating"
          icon={Activity} 
          colorTheme="amber"
        />
      </div>

      {/* Weekly Work Hours Chart & Breakdown */}
      {perfData.currentMetrics?.weekly && perfData.currentMetrics.weekly.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e0e3e7] gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#1f1f1f] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#1a73e8]" /> Weekly Work Hours Breakdown
              </h3>
              <p className="text-xs text-[#5f6368] mt-0.5">Total hours worked per week for the last 6 weeks</p>
            </div>
            {currentWeek && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] self-start sm:self-auto">
                This Week: {currentWeek.totalHours} hrs ({currentWeek.avgHoursPerDay} hrs/day)
              </span>
            )}
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart data={perfData.currentMetrics.weekly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dx={-8} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafd' }} 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e0e3e7', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} 
                  formatter={(val) => [`${val} hrs`, 'Work Hours']} 
                />
                <Bar dataKey="totalHours" name="Work Hours" fill="#1a73e8" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Grid Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {perfData.currentMetrics.weekly.map((w, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-2xl border transition-all ${
                  w.isCurrentWeek 
                    ? 'bg-[#e8f0fe]/60 border-[#d2e3fc] ring-1 ring-[#1a73e8]' 
                    : 'bg-[#f8fafd] border-[#e0e3e7]'
                }`}
              >
                <p className="text-[11px] font-semibold text-[#5f6368] truncate" title={w.label}>{w.label}</p>
                <p className="text-lg font-bold text-[#1f1f1f] mt-1">{w.totalHours} <span className="text-xs font-normal text-[#5f6368]">hrs</span></p>
                <p className="text-[10px] text-[#5f6368] mt-0.5">{w.presentDays} days &bull; {w.avgHoursPerDay}h/day</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e0e3e7] shadow-xs">
          <h3 className="text-base font-semibold text-[#1f1f1f] mb-1">6-Month Attendance Trend</h3>
          <p className="text-xs text-[#5f6368] mb-6">Percentage consistency across recent calendar months</p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <LineChart data={perfData.currentMetrics?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dx={-8} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ stroke: '#dadce0', strokeWidth: 1, strokeDasharray: '4 4' }} 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e0e3e7', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} 
                />
                <Line type="monotone" dataKey="attendancePct" name="Attendance %" stroke="#1a73e8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#1a73e8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e0e3e7] shadow-xs">
          <h3 className="text-base font-semibold text-[#1f1f1f] mb-1">Leave Usage Trend</h3>
          <p className="text-xs text-[#5f6368] mb-6">Monthly approved leave requests taken</p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart data={perfData.currentMetrics?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368' }} dx={-8} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafd' }} 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e0e3e7', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} 
                />
                <Bar dataKey="leave" name="Leave Days" fill="#FBBC05" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {perfData.peerMetrics && perfData.peerMetrics.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1a73e8]" /> Peer Group Comparison
                </h3>
                <p className="text-xs text-[#5f6368] mt-0.5">Department peer attendance &amp; hour benchmarks</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-[#5f6368] uppercase tracking-wider">Peer Average</p>
                <p className="text-sm font-bold text-[#1f1f1f]">{perfData.peerAverageAttendance}%</p>
              </div>
            </div>
            <div className="divide-y divide-[#f1f3f4] max-h-[380px] overflow-y-auto">
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
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#137333]" /> Direct Reports Performance
                </h3>
                <p className="text-xs text-[#5f6368] mt-0.5">Supervised team attendance metrics</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-[#5f6368] uppercase tracking-wider">Team Average</p>
                <p className="text-sm font-bold text-[#1f1f1f]">{perfData.reportAverageAttendance}%</p>
              </div>
            </div>
            <div className="divide-y divide-[#f1f3f4] max-h-[380px] overflow-y-auto">
              {perfData.reportMetrics.map(report => (
                <EmployeeRow key={report.employee.id} item={report} />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default EmployeePerformance;
