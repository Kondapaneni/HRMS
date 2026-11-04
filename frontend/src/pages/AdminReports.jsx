import React, { useState, useRef } from 'react';
import { Download, Users, Calendar, IndianRupee, Filter, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';

const CHART_PALETTE = ['#8AADDB', '#E3B9DF', '#131315', '#B9CDE8', '#C98BC2', '#5B86C2'];

const AdminReports = () => {
  const { token } = useAuth();

  // States for date filters
  const [attendanceMonth, setAttendanceMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [payrollMonth, setPayrollMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [downloadingSection, setDownloadingSection] = useState(null);

  const handleDownload = async (endpoint, filename, sectionKey) => {
    try {
      if (sectionKey) setDownloadingSection(sectionKey);
      const res = await api.get(endpoint, {
        responseType: 'blob',
        headers: {
          Accept: 'text/csv'
        }
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report. Please try again.');
    } finally {
      if (sectionKey) setDownloadingSection(null);
    }
  };

  const { data: employeesData = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['admin_report_employees'],
    queryFn: async () => {
      const res = await api.get('/admin/reports/employees?format=json');
      return res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    staleTime: 60 * 1000,
  });

  const { data: attendanceData = [], isLoading: loadingAttendance, isFetching: isFetchingAttendance } = useQuery({
    queryKey: ['admin_report_attendance', attendanceMonth],
    queryFn: async () => {
      const res = await api.get(`/admin/reports/attendance?month=${attendanceMonth}&format=json`);
      return res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
  });

  const { data: payrollData = [], isLoading: loadingPayroll, isFetching: isFetchingPayroll } = useQuery({
    queryKey: ['admin_report_payroll', payrollMonth],
    queryFn: async () => {
      const res = await api.get(`/admin/reports/payroll?month=${payrollMonth}&format=json`);
      return res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
  });

  const hasLoadedOnce = useRef(false);
  if (!loadingEmployees && !loadingAttendance && !loadingPayroll) {
    hasLoadedOnce.current = true;
  }

  const safeEmployees = Array.isArray(employeesData) ? employeesData : [];
  const safeAttendance = Array.isArray(attendanceData) ? attendanceData : [];
  const safePayroll = Array.isArray(payrollData) ? payrollData : [];

  const departmentCounts = safeEmployees.reduce((acc, emp) => {
    const dept = emp.Department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  const departmentPieData = Object.keys(departmentCounts).map((key) => ({
    name: key,
    value: departmentCounts[key]
  }));

  const roleCounts = safeEmployees.reduce((acc, emp) => {
    const pos = emp.Position || 'Staff';
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {});
  const roleBarData = Object.keys(roleCounts)
    .map((key) => ({ name: key, Headcount: roleCounts[key] }))
    .sort((a, b) => b.Headcount - a.Headcount);

  const dailyAttendance = safeAttendance.reduce((acc, log) => {
    const date = log.Date || 'Unknown';
    if (!acc[date]) acc[date] = { date, Present: 0, Absent: 0 };
    const status = (log.Status || '').toLowerCase();
    if (status.includes('present')) {
      acc[date].Present += 1;
    } else {
      acc[date].Absent += 1;
    }
    return acc;
  }, {});
  const attendanceChartData = Object.values(dailyAttendance).sort((a, b) => a.date.localeCompare(b.date));

  const departmentPayroll = safePayroll.reduce((acc, log) => {
    const dept = log.Department || 'Unassigned';
    if (!acc[dept]) acc[dept] = { dept, 'Basic Salary': 0, 'Net Salary': 0, Deductions: 0 };
    acc[dept]['Basic Salary'] += parseFloat(log['Basic Salary'] || 0);
    acc[dept]['Net Salary'] += parseFloat(log['Net Salary'] || 0);
    acc[dept].Deductions += parseFloat(log.Deductions || 0);
    return acc;
  }, {});
  const payrollChartData = Object.values(departmentPayroll);

  if (!hasLoadedOnce.current && (loadingEmployees || loadingAttendance || loadingPayroll)) {
    return <PageLoader message="Loading reports..." />;
  }

  const customTooltipStyle = {
    backgroundColor: 'var(--ink, #131315)',
    color: '#FFFFFF',
    borderRadius: '9px',
    padding: '8px 12px',
    fontSize: '12px',
    border: 'none',
    boxShadow: '0 8px 24px rgba(19,19,21,0.2)'
  };

  return (
    <div className="space-y-5 pb-12 antialiased w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
          Reports and analytics
        </h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Organizational reporting engine and exportable data records
        </p>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total workforce"
          value={safeEmployees.length}
          caption="Active and registered staff"
          icon={<Users size={18} />}
        />
        <StatCard
          title="Departments"
          value={Object.keys(departmentCounts).length}
          caption="Operational units"
          icon={<Building2 size={18} />}
        />
        <StatCard
          title="Attendance entries"
          value={safeAttendance.length}
          caption={isFetchingAttendance ? 'Updating...' : `Logged for ${attendanceMonth}`}
          icon={<Calendar size={18} />}
        />
        <StatCard
          title="Payroll records"
          value={safePayroll.length}
          caption={isFetchingPayroll ? 'Updating...' : `Disbursements for ${payrollMonth}`}
          icon={<IndianRupee size={18} />}
        />
      </div>

      {/* 1. Employee Directory Analytics */}
      <div className="bg-[var(--surface)] rounded-[24px] p-[18px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[var(--line)] mb-4">
          <div>
            <h3 className="text-base font-medium text-[var(--text)]">Employee directory analytics</h3>
            <p className="text-xs text-[var(--muted)]">Breakdown of registered staff by department and position</p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              handleDownload(
                '/admin/reports/employees',
                `employee_directory_${format(new Date(), 'yyyy-MM-dd')}.csv`,
                'employees'
              )
            }
            disabled={downloadingSection === 'employees'}
            loading={downloadingSection === 'employees'}
            className="mt-3 sm:mt-0 h-9 rounded-[12px] text-xs font-medium"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dept Pie */}
          <div className="rounded-[16px] p-4 bg-[var(--surface-alt)] min-w-0">
            <h4 className="text-xs font-medium text-[var(--muted)] mb-3 text-center">Employees by department</h4>
            <div className="w-full h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={departmentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {departmentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={customTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'var(--muted, #6B6B75)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Role Bar */}
          <div className="rounded-[16px] p-4 bg-[var(--surface-alt)] min-w-0">
            <h4 className="text-xs font-medium text-[var(--muted)] mb-3 text-center">Headcount by position</h4>
            <div className="w-full h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={roleBarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="var(--line, #EFEFF1)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }}
                  />
                  <RechartsTooltip cursor={{ fill: 'var(--brand-tint, #EAF0FA)' }} contentStyle={customTooltipStyle} />
                  <Bar dataKey="Headcount" fill="#8AADDB" radius={[0, 8, 8, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Attendance Analytics */}
      <div className="bg-[var(--surface)] rounded-[24px] p-[18px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-[var(--line)] mb-4">
          <div>
            <h3 className="text-base font-medium text-[var(--text)]">Monthly attendance trends</h3>
            <p className="text-xs text-[var(--muted)]">Daily presence and activity monitoring across the workspace</p>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--line)]">
              {isFetchingAttendance ? (
                <Loader2 size={13} className="text-[var(--brand-deep)] animate-spin shrink-0" />
              ) : (
                <Filter size={13} className="text-[var(--muted)] shrink-0" />
              )}
              <input
                type="month"
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(e.target.value)}
                className="text-xs focus:outline-none bg-transparent font-medium text-[var(--text)] cursor-pointer"
                title="Select month for attendance"
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                handleDownload(
                  `/admin/reports/attendance?month=${attendanceMonth}`,
                  `attendance_report_${attendanceMonth}.csv`,
                  'attendance'
                )
              }
              disabled={downloadingSection === 'attendance'}
              loading={downloadingSection === 'attendance'}
              className="h-9 rounded-[12px] text-xs font-medium"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        <div className="rounded-[16px] p-4 bg-[var(--surface-alt)] min-w-0">
          <div className="w-full h-[300px] min-w-0">
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={attendanceChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8AADDB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8AADDB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E3B9DF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#E3B9DF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line, #EFEFF1)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }} />
                  <RechartsTooltip contentStyle={customTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--muted, #6B6B75)' }} />
                  <Area type="monotone" dataKey="Present" stroke="#8AADDB" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Absent" stroke="#E3B9DF" fillOpacity={1} fill="url(#colorAbsent)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--muted)]">
                <Calendar size={36} className="mb-2 opacity-30 text-[var(--brand-deep)]" />
                <p className="text-xs font-medium">No attendance data found for {attendanceMonth}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Payroll Analytics */}
      <div className="bg-[var(--surface)] rounded-[24px] p-[18px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-[var(--line)] mb-4">
          <div>
            <h3 className="text-base font-medium text-[var(--text)]">Monthly payroll expenditure</h3>
            <p className="text-xs text-[var(--muted)]">Basic salary, deductions, and department payouts</p>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--line)]">
              {isFetchingPayroll ? (
                <Loader2 size={13} className="text-[var(--brand-deep)] animate-spin shrink-0" />
              ) : (
                <Filter size={13} className="text-[var(--muted)]" />
              )}
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="text-xs focus:outline-none bg-transparent font-medium text-[var(--text)] cursor-pointer"
                title="Select month for payroll"
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                handleDownload(
                  `/admin/reports/payroll?month=${payrollMonth}`,
                  `payroll_report_${payrollMonth}.csv`,
                  'payroll'
                )
              }
              disabled={downloadingSection === 'payroll'}
              loading={downloadingSection === 'payroll'}
              className="h-9 rounded-[12px] text-xs font-medium"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        <div className="rounded-[16px] p-4 bg-[var(--surface-alt)] min-w-0">
          <div className="w-full h-[300px] min-w-0">
            {payrollChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={payrollChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line, #EFEFF1)" />
                  <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }} />
                  <RechartsTooltip cursor={{ fill: 'var(--brand-tint, #EAF0FA)' }} contentStyle={customTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--muted, #6B6B75)' }} />
                  <Bar dataKey="Basic Salary" fill="#8AADDB" radius={[8, 8, 0, 0]} maxBarSize={36} stackId="a" />
                  <Bar dataKey="Deductions" fill="#E3B9DF" radius={[8, 8, 0, 0]} maxBarSize={36} stackId="a" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--muted)]">
                <IndianRupee size={36} className="mb-2 opacity-30 text-[var(--brand-deep)]" />
                <p className="text-xs font-medium">No payroll data found for {payrollMonth}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
