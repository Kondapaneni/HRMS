import React, { useState, useRef } from 'react';
import { Download, Users, Calendar, IndianRupee, Filter, Building2, CheckCircle2, Clock, Activity, BarChart2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';

const GOOGLE_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8430CE', '#fbbc04', '#34a853', '#4285f4', '#ea4335'];

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
    yellow: {
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

const AdminReports = () => {
  const { token } = useAuth();
  
  // States for date filters
  const [attendanceMonth, setAttendanceMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [payrollMonth, setPayrollMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [downloadingSection, setDownloadingSection] = useState(null);

  // Utility to handle downloading the CSV using configured axios api instance (handles baseUrl & auth token automatically)
  const handleDownload = async (endpoint, filename, sectionKey) => {
    try {
      if (sectionKey) setDownloadingSection(sectionKey);
      const res = await api.get(endpoint, {
        responseType: 'blob',
        headers: {
          'Accept': 'text/csv'
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

  // --- Fetch Data ---
  const { data: employeesData = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['admin_report_employees'],
    queryFn: async () => {
      const res = await api.get('/admin/reports/employees?format=json');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const { data: attendanceData = [], isLoading: loadingAttendance, isFetching: isFetchingAttendance } = useQuery({
    queryKey: ['admin_report_attendance', attendanceMonth],
    queryFn: async () => {
      const res = await api.get(`/admin/reports/attendance?month=${attendanceMonth}&format=json`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
  });

  const { data: payrollData = [], isLoading: loadingPayroll, isFetching: isFetchingPayroll } = useQuery({
    queryKey: ['admin_report_payroll', payrollMonth],
    queryFn: async () => {
      const res = await api.get(`/admin/reports/payroll?month=${payrollMonth}&format=json`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
  });

  // Track if initial load has finished to prevent full page loaders on date/filter changes
  const hasLoadedOnce = useRef(false);
  if (!loadingEmployees && !loadingAttendance && !loadingPayroll) {
    hasLoadedOnce.current = true;
  }

  // --- Process Employee Data ---
  const safeEmployees = Array.isArray(employeesData) ? employeesData : [];
  const safeAttendance = Array.isArray(attendanceData) ? attendanceData : [];
  const safePayroll = Array.isArray(payrollData) ? payrollData : [];

  const departmentCounts = safeEmployees.reduce((acc, emp) => {
    const dept = emp.Department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  const departmentPieData = Object.keys(departmentCounts).map(key => ({ name: key, value: departmentCounts[key] }));

  const roleCounts = safeEmployees.reduce((acc, emp) => {
    const pos = emp.Position || 'Staff';
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {});
  const roleBarData = Object.keys(roleCounts).map(key => ({ name: key, Headcount: roleCounts[key] })).sort((a,b) => b.Headcount - a.Headcount);

  // --- Process Attendance Data ---
  // Group by Date, then count Present vs Absent (including Leave)
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
  const attendanceChartData = Object.values(dailyAttendance).sort((a,b) => a.date.localeCompare(b.date));

  // --- Process Payroll Data ---
  const departmentPayroll = safePayroll.reduce((acc, log) => {
    const dept = log.Department || 'Unassigned';
    if (!acc[dept]) acc[dept] = { dept, 'Basic Salary': 0, 'Net Salary': 0, 'Deductions': 0 };
    acc[dept]['Basic Salary'] += parseFloat(log['Basic Salary'] || 0);
    acc[dept]['Net Salary'] += parseFloat(log['Net Salary'] || 0);
    acc[dept]['Deductions'] += parseFloat(log['Deductions'] || 0);
    return acc;
  }, {});
  const payrollChartData = Object.values(departmentPayroll);

  // Only show full PageLoader on the true initial mount before data arrives
  if (!hasLoadedOnce.current && (loadingEmployees || loadingAttendance || loadingPayroll)) {
    return <PageLoader message="Loading Graphical Reports..." />;
  }

  const customTooltipStyle = {
    borderRadius: '12px',
    border: '1px solid #e0e3e7',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    fontSize: '11px',
    backgroundColor: '#ffffff'
  };

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased w-full" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Reporting Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Visual <span className="font-medium italic text-[#1a73e8]">Analytics &amp; Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Interactive organizational insights and exportable datasets.
          </p>
        </div>
      </div>

      {/* KPI Stats Overview Cards (Full width matching layout) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Workforce" 
          value={safeEmployees.length} 
          subtitle="Active & registered employees" 
          icon={Users} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Departments" 
          value={Object.keys(departmentCounts).length} 
          subtitle="Operational functional units" 
          icon={Building2} 
          colorTheme="green" 
        />
        <StatCard 
          title="Attendance Entries" 
          value={safeAttendance.length} 
          subtitle={isFetchingAttendance ? 'Updating records...' : `Logged for ${attendanceMonth}`} 
          icon={Calendar} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Payroll Records" 
          value={safePayroll.length} 
          subtitle={isFetchingPayroll ? 'Updating records...' : `Disbursements for ${payrollMonth}`} 
          icon={IndianRupee} 
          colorTheme="yellow" 
        />
      </div>

      {/* 1. Employee Analytics */}
      <div className="bg-white rounded-2xl p-5 border border-[#e0e3e7] shadow-xs relative overflow-hidden">
        <div className="h-1 w-full absolute top-0 left-0 bg-[#4285F4]" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-[#e8f0fe] border-[#d2e3fc] shadow-xs">
              <Users size={20} className="text-[#1a73e8]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1f1f1f]">Employee Directory Analytics</h3>
              <p className="text-xs text-[#5f6368]">Total active &amp; registered personnel breakdown</p>
            </div>
          </div>
          <button
            onClick={() => handleDownload('/admin/reports/employees', `employee_directory_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'employees')}
            disabled={downloadingSection === 'employees'}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#f8fafd] border border-[#e0e3e7] hover:bg-[#f1f3f4] text-[#1f1f1f] px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
          >
            {downloadingSection === 'employees' ? (
              <Loader2 size={14} className="text-[#1a73e8] animate-spin" />
            ) : (
              <Download size={14} className="text-[#5f6368]" />
            )}
            <span>Export CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dept Pie */}
          <div className="border border-[#e0e3e7] rounded-xl p-4 bg-[#ffffff] min-w-0">
            <h4 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-4 text-center">Employees by Department</h4>
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
                      <Cell key={`cell-${index}`} fill={GOOGLE_COLORS[index % GOOGLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={customTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Role Bar */}
          <div className="border border-[#e0e3e7] rounded-xl p-4 bg-[#ffffff] min-w-0">
            <h4 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-4 text-center">Headcount by Position</h4>
            <div className="w-full h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={roleBarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f3f4" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafd' }} contentStyle={customTooltipStyle} />
                  <Bar dataKey="Headcount" fill="#4285F4" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Attendance Analytics */}
      <div className="bg-white rounded-2xl p-5 border border-[#e0e3e7] shadow-xs relative overflow-hidden">
        <div className="h-1 w-full absolute top-0 left-0 bg-[#34A853]" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-[#e6f4ea] border-[#ceead6] shadow-xs">
              <Calendar size={20} className="text-[#137333]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1f1f1f]">Monthly Attendance Trends</h3>
              <p className="text-xs text-[#5f6368]">Daily presence and activity monitoring</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <div className={`flex items-center gap-2 border rounded-full px-3 py-1.5 bg-white shadow-2xs transition-all ${isFetchingAttendance ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20' : 'border-[#dadce0]'}`}>
              {isFetchingAttendance ? (
                <Loader2 size={13} className="text-[#1a73e8] animate-spin shrink-0" />
              ) : (
                <Filter size={13} className="text-[#5f6368] shrink-0" />
              )}
              <input
                type="month"
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(e.target.value)}
                className="text-xs focus:outline-none bg-transparent font-medium text-[#1f1f1f] cursor-pointer"
                title="Select month for attendance"
              />
            </div>
            <button
              onClick={() => handleDownload(`/admin/reports/attendance?month=${attendanceMonth}`, `attendance_report_${attendanceMonth}.csv`, 'attendance')}
              disabled={downloadingSection === 'attendance'}
              className="flex items-center gap-2 bg-[#f8fafd] border border-[#e0e3e7] hover:bg-[#f1f3f4] text-[#1f1f1f] px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            >
              {downloadingSection === 'attendance' ? (
                <Loader2 size={14} className="text-[#1a73e8] animate-spin" />
              ) : (
                <Download size={14} className="text-[#5f6368]" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className={`border border-[#e0e3e7] rounded-xl p-4 bg-[#ffffff] min-w-0 relative transition-opacity duration-200 ${isFetchingAttendance ? 'opacity-70' : 'opacity-100'}`}>
          {isFetchingAttendance && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 border border-[#d2e3fc] px-2.5 py-1 rounded-full text-[11px] font-medium text-[#1a73e8] shadow-xs z-10">
              <Loader2 size={12} className="animate-spin text-[#1a73e8]" />
              <span>Updating attendance...</span>
            </div>
          )}
          <div className="w-full h-[300px] min-w-0">
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={attendanceChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34A853" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#34A853" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA4335" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#EA4335" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <RechartsTooltip contentStyle={customTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Present" stroke="#34A853" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Absent" stroke="#EA4335" fillOpacity={1} fill="url(#colorAbsent)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#5f6368]">
                <Calendar size={36} className="mb-2 opacity-30 text-[#34A853]" />
                <p className="text-xs font-medium">No attendance data found for {attendanceMonth}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Payroll Analytics */}
      <div className="bg-white rounded-2xl p-5 border border-[#e0e3e7] shadow-xs relative overflow-hidden">
        <div className="h-1 w-full absolute top-0 left-0 bg-[#FBBC05]" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-[#fef7e0] border-[#feefc3] shadow-xs">
              <IndianRupee size={20} className="text-[#b06000]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1f1f1f]">Monthly Payroll Expenditure</h3>
              <p className="text-xs text-[#5f6368]">Basic salary, deductions, and department payouts</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <div className={`flex items-center gap-2 border rounded-full px-3 py-1.5 bg-white shadow-2xs transition-all ${isFetchingPayroll ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20' : 'border-[#dadce0]'}`}>
              {isFetchingPayroll ? (
                <Loader2 size={13} className="text-[#1a73e8] animate-spin shrink-0" />
              ) : (
                <Filter size={13} className="text-[#5f6368]" />
              )}
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="text-xs focus:outline-none bg-transparent font-medium text-[#1f1f1f] cursor-pointer"
                title="Select month for payroll"
              />
            </div>
            <button
              onClick={() => handleDownload(`/admin/reports/payroll?month=${payrollMonth}`, `payroll_report_${payrollMonth}.csv`, 'payroll')}
              disabled={downloadingSection === 'payroll'}
              className="flex items-center gap-2 bg-[#f8fafd] border border-[#e0e3e7] hover:bg-[#f1f3f4] text-[#1f1f1f] px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            >
              {downloadingSection === 'payroll' ? (
                <Loader2 size={14} className="text-[#1a73e8] animate-spin" />
              ) : (
                <Download size={14} className="text-[#5f6368]" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className={`border border-[#e0e3e7] rounded-xl p-4 bg-[#ffffff] min-w-0 relative transition-opacity duration-200 ${isFetchingPayroll ? 'opacity-70' : 'opacity-100'}`}>
          {isFetchingPayroll && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 border border-[#d2e3fc] px-2.5 py-1 rounded-full text-[11px] font-medium text-[#1a73e8] shadow-xs z-10">
              <Loader2 size={12} className="animate-spin text-[#1a73e8]" />
              <span>Updating payroll...</span>
            </div>
          )}
          <div className="w-full h-[300px] min-w-0">
            {payrollChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={payrollChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafd' }} contentStyle={customTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Basic Salary" fill="#4285F4" radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                  <Bar dataKey="Deductions" fill="#EA4335" radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#5f6368]">
                <IndianRupee size={36} className="mb-2 opacity-30 text-[#FBBC05]" />
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
