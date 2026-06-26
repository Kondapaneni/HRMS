import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, TrendingDown, Activity, Users, CalendarDays, Coffee, AlertCircle, Building2, User } from 'lucide-react';
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
import EmployeeSelect from '../components/EmployeeSelect';

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
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Attendance</p>
          <p className={`text-sm font-bold ${isLow ? 'text-red-600' : isHigh ? 'text-green-600' : 'text-slate-700'}`}>
            {summary.attendancePct}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Leaves</p>
          <p className="text-sm font-bold text-slate-700">{summary.totalLeave}</p>
        </div>
      </div>
    </div>
  );
};

const AdminPerformance = () => {
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async () => {
      const res = await api.get('/admin/employees?limit=1000');
      return res.data.employees || [];
    }
  });

  const { data: perfData, isLoading, isError } = useQuery({
    queryKey: ['admin', 'performance', selectedEmpId],
    queryFn: async () => {
      if (!selectedEmpId) return null;
      const res = await api.get(`/admin/performance?id=${selectedEmpId}`);
      return res.data;
    },
    enabled: !!selectedEmpId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Team Performance Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Select an employee to view their attendance, leaves, and compare with peers.</p>
        </div>
        <div className="w-full md:w-80">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Employee</label>
          <EmployeeSelect 
            employees={employees} 
            selectedId={selectedEmpId} 
            onChange={(id) => setSelectedEmpId(id)} 
          />
        </div>
      </div>

      {!selectedEmpId && (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 border-dashed">
          <Activity className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600">No Employee Selected</h3>
          <p className="text-slate-400 text-sm mt-1">Please select an employee from the dropdown above.</p>
        </div>
      )}

      {selectedEmpId && isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {selectedEmpId && !isLoading && perfData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Employee Header Info */}
          <div className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {perfData.employee.avatar ? (
                <img src={perfData.employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{perfData.employee.firstName} {perfData.employee.lastName}</h2>
              <div className="flex items-center gap-3 mt-1 text-slate-500 text-sm font-medium">
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4 text-slate-400" /> {perfData.employee.department || 'N/A'}</span>
                <span className="text-slate-300">•</span>
                <span>{perfData.employee.position || 'Employee'}</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Present Days (This Month)" 
              value={perfData.currentMonthSummary.totalPresent}
              subtitle={`Out of ${perfData.currentMonthSummary.totalWorkdays} working days`}
              icon={CalendarDays} 
              colorClass="bg-green-100 text-green-600" 
            />
            <StatCard 
              title="Leave Days (This Month)" 
              value={perfData.currentMonthSummary.totalLeave}
              subtitle="Approved absences"
              icon={Coffee} 
              colorClass="bg-amber-100 text-amber-600" 
            />
            <StatCard 
              title="Attendance Score" 
              value={`${perfData.currentMonthSummary.attendancePct}%`}
              subtitle="Monthly average"
              icon={Activity} 
              colorClass="bg-blue-100 text-blue-600"
              highlight={true}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">6-Month Attendance Trend</h3>
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
              <h3 className="text-lg font-bold text-slate-800 mb-6">Leave Usage Trend</h3>
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" /> Peer Comparison
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Employees under the same manager</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Attendance</p>
                    <p className="text-lg font-bold text-slate-700">{perfData.peerAverageAttendance}%</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {perfData.peerMetrics.map(peer => (
                    <EmployeeRow key={peer.employee.id} item={peer} />
                  ))}
                </div>
              </div>
            )}

            {perfData.reportMetrics && perfData.reportMetrics.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" /> Direct Reports
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Reporting team analytics</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Attendance</p>
                    <p className="text-lg font-bold text-slate-700">{perfData.reportAverageAttendance}%</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {perfData.reportMetrics.map(report => (
                    <EmployeeRow key={report.employee.id} item={report} type="report" />
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
