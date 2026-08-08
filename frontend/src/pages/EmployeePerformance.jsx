import React, { useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, CalendarDays, Coffee, Building2, Clock } from 'lucide-react';
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

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, highlight }) => (
  <div className={`rounded-2xl border ${highlight ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'} p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
        {subtitle && <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const EmployeeRow = ({ item, type = 'peer' }) => {
  const { employee, summary } = item;
  const isHigh = summary.attendancePct >= 90;
  const isLow = summary.attendancePct < 75;

  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-slate-600">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{employee.firstName} {employee.lastName}</p>
          <p className="text-[11px] text-slate-500">{employee.position || 'Employee'}</p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Attendance</p>
          <p className={`text-sm font-bold ${isLow ? 'text-red-600' : isHigh ? 'text-green-600' : 'text-slate-700'}`}>
            {summary.attendancePct}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Work Hours</p>
          <p className="text-sm font-bold text-indigo-600">{summary.totalHours || 0} hrs</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Leaves</p>
          <p className="text-sm font-bold text-slate-700">{summary.totalLeave}</p>
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

  if (isLoading) {
    return <PageLoader message="Loading Performance..." />;
  }

  if (!perfData) {
    return (
      <div className="p-8 text-center text-slate-500">
        No performance data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Performance Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Review your attendance, work hours, leave usage, and see how you compare to your team.</p>
        </div>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Work Hours (This Week)" 
            value={currentWeek ? `${currentWeek.totalHours} hrs` : '0 hrs'}
            subtitle={currentWeek ? `Avg ${currentWeek.avgHoursPerDay} hrs/day (${currentWeek.presentDays} days)` : 'Current week'}
            icon={Clock} 
            colorClass="bg-indigo-100 text-indigo-600"
            highlight={true}
          />
          <StatCard 
            title="Work Hours (This Month)" 
            value={`${perfData.currentMonthSummary.totalHours || 0} hrs`}
            subtitle="Total hours worked"
            icon={Clock} 
            colorClass="bg-blue-100 text-blue-600" 
          />
          <StatCard 
            title="Present Days (This Month)" 
            value={perfData.currentMonthSummary.totalPresent}
            subtitle={`Out of ${perfData.currentMonthSummary.totalWorkdays} working days`}
            icon={CalendarDays} 
            colorClass="bg-green-100 text-green-600" 
          />
          <StatCard 
            title="Attendance Score" 
            value={`${perfData.currentMonthSummary.attendancePct}%`}
            subtitle="Monthly average"
            icon={Activity} 
            colorClass="bg-teal-100 text-teal-600"
          />
        </div>

        {/* Weekly Work Hours Chart & Breakdown */}
        {perfData.currentMetrics?.weekly && perfData.currentMetrics.weekly.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" /> Weekly Work Hours Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Total hours worked per week for the last 6 weeks</p>
              </div>
              {currentWeek && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
                  This Week: {currentWeek.totalHours} hrs ({currentWeek.avgHoursPerDay} hrs/day)
                </span>
              )}
            </div>

            <div className="h-[250px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                <BarChart data={perfData.currentMetrics.weekly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dx={-10} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => [`${val} hrs`, 'Work Hours']} />
                  <Bar dataKey="totalHours" name="Work Hours" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Weekly Grid Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {perfData.currentMetrics.weekly.map((w, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${w.isCurrentWeek ? 'bg-indigo-50/60 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[11px] font-bold text-slate-500 truncate" title={w.label}>{w.label}</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-1">{w.totalHours} <span className="text-xs font-normal text-slate-500">hrs</span></p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">{w.presentDays} days • {w.avgHoursPerDay}h/day</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Your 6-Month Attendance Trend</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                <LineChart data={perfData.currentMetrics.monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dx={-10} domain={[0, 100]} />
                  <Tooltip cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="attendancePct" name="Attendance %" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#3B82F6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Your Leave Usage Trend</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                <BarChart data={perfData.currentMetrics.monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dx={-10} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="leave" name="Leave Days" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Comparisons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {perfData.peerMetrics && perfData.peerMetrics.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Peer Comparison
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">How you compare to your peers</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Peer Avg Attendance</p>
                  <p className="text-lg font-bold text-slate-700">{perfData.peerAverageAttendance}%</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Direct Reports
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your team's performance</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Team Avg Attendance</p>
                  <p className="text-lg font-bold text-slate-700">{perfData.reportAverageAttendance}%</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {perfData.reportMetrics.map(report => (
                  <EmployeeRow key={report.employee.id} item={report} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EmployeePerformance;
