import React from 'react';
import PageLoader from '../components/PageLoader';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Users, Activity, Calendar, Clock,
  BarChart2, ArrowUpRight, IndianRupee, UserCheck, CheckCircle2,
  Sparkles, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const {
    data: dashboardData = {
      totalEmployees: 0,
      presentToday: 0,
      onLeaveToday: 0,
      attendanceRate: '0%',
      attendanceData: [],
      salaryData: [],
      activities: []
    },
    isLoading: loading
  } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard/stats');
      return res.data;
    },
    staleTime: 60 * 1000
  });

  const GOOGLE_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8430CE'];

  if (loading) return <PageLoader message="Loading Dashboard..." />;

  const kpis = [
    {
      title: 'Total Employees',
      value: dashboardData.totalEmployees,
      desc: 'Active personnel on payroll',
      icon: <Users size={18} className="text-[#1a73e8]" />,
      badgeBg: 'bg-[#e8f0fe] border-[#d2e3fc]',
      accentColor: '#4285F4',
      pillText: 'Directory',
      pillBg: 'bg-[#e8f0fe] text-[#1967d2]',
      path: '/admin/employees'
    },
    {
      title: 'Present Today',
      value: dashboardData.presentToday,
      desc: 'Successfully checked in',
      icon: <UserCheck size={18} className="text-[#137333]" />,
      badgeBg: 'bg-[#e6f4ea] border-[#ceead6]',
      accentColor: '#34A853',
      pillText: 'Clocked In',
      pillBg: 'bg-[#e6f4ea] text-[#137333]',
      path: '/admin/attendance'
    },
    {
      title: 'On Leave',
      value: dashboardData.onLeaveToday,
      desc: 'Approved time-off today',
      icon: <Calendar size={18} className="text-[#b06000]" />,
      badgeBg: 'bg-[#fef7e0] border-[#feefc3]',
      accentColor: '#FBBC05',
      pillText: 'Leave Tracker',
      pillBg: 'bg-[#fef7e0] text-[#b06000]',
      path: '/admin/leaves'
    },
    {
      title: 'Attendance Rate',
      value: dashboardData.attendanceRate,
      desc: 'Daily workspace participation',
      icon: <Activity size={18} className="text-[#c5221f]" />,
      badgeBg: 'bg-[#fce8e6] border-[#fad2cf]',
      accentColor: '#EA4335',
      pillText: 'Realtime Rate',
      pillBg: 'bg-[#fce8e6] text-[#c5221f]',
      path: '/admin/attendance'
    }
  ];

  const quickActions = [
    {
      label: 'Mark Attendance',
      desc: 'Manage staff logs & rosters',
      path: '/admin/attendance',
      icon: <Clock size={16} className="text-[#137333]" />,
      bg: 'hover:border-[#ceead6] hover:bg-[#e6f4ea]/40'
    },
    {
      label: 'Payroll & Compensation',
      desc: 'Process pay runs & salaries',
      path: '/admin/payroll',
      icon: <IndianRupee size={16} className="text-[#1a73e8]" />,
      bg: 'hover:border-[#d2e3fc] hover:bg-[#e8f0fe]/40'
    },
    {
      label: 'Employee Directory',
      desc: 'View & edit staff profiles',
      path: '/admin/employees',
      icon: <Users size={16} className="text-[#b06000]" />,
      bg: 'hover:border-[#feefc3] hover:bg-[#fef7e0]/40'
    },
    {
      label: 'Leave Management',
      desc: 'Review leave approvals',
      path: '/admin/leaves',
      icon: <Calendar size={16} className="text-[#c5221f]" />,
      bg: 'hover:border-[#fad2cf] hover:bg-[#fce8e6]/40'
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Google Header Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Workspace Executive Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Welcome Back, <span className="font-medium italic text-[#1a73e8]">{profile?.email?.split('@')[0] || 'Admin'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Real-time analytics and workforce management overview.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-[#e0e3e7] text-xs font-medium text-[#5f6368] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#34A853] animate-pulse" />
          <span>System Healthy</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
            onClick={() => navigate(kpi.path)}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e0e3e7] shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          >
            {/* Subtle top indicator */}
            <div
              className="h-1 w-full absolute top-0 left-0 transition-opacity"
              style={{ backgroundColor: kpi.accentColor }}
            />

            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-medium text-[#5f6368]">{kpi.title}</span>
                <div className="text-2xl sm:text-3xl font-semibold text-[#1f1f1f] mt-1 tracking-tight">
                  {kpi.value}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl border ${kpi.badgeBg} shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                {kpi.icon}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#f1f3f4] text-xs">
              <span className="text-[11px] text-[#5f6368] truncate">{kpi.desc}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${kpi.pillBg} shrink-0`}>
                {kpi.pillText}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Monthly Attendance Trend</h3>
              <p className="text-[11px] text-[#5f6368]">Present vs. Approved Leaves</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f8fafd] border border-[#e0e3e7] text-[11px] font-medium text-[#5f6368]">
              <Calendar size={12} />
              <span>YTD</span>
            </div>
          </div>

          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11, fontFamily: "'Newsreader', Georgia, serif" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11, fontFamily: "'Newsreader', Georgia, serif" }} />
                <RechartsTooltip
                  cursor={{ fill: '#f8fafd' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e0e3e7',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    fontSize: '11px',
                    backgroundColor: '#ffffff',
                    fontFamily: "'Newsreader', Georgia, serif"
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: "'Newsreader', Georgia, serif" }} />
                <Bar dataKey="present" name="Present" fill="#34A853" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="leave" name="Leave" fill="#4285F4" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-[#e0e3e7] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Compensation Distribution</h3>
              <p className="text-[11px] text-[#5f6368]">Employee tiers by pay bracket</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f8fafd] border border-[#e0e3e7] text-[11px] font-medium text-[#5f6368]">
              <IndianRupee size={12} />
              <span>Active Staff</span>
            </div>
          </div>

          <div className="w-full h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.salaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="range"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold" fontFamily="'Newsreader', Georgia, serif">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {dashboardData.salaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GOOGLE_COLORS[index % GOOGLE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e0e3e7',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    fontSize: '11px',
                    backgroundColor: '#ffffff',
                    fontFamily: "'Newsreader', Georgia, serif"
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: "'Newsreader', Georgia, serif" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] flex justify-between items-center bg-[#f8fafd]/60">
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Recent Audit & Activity</h3>
              <p className="text-[11px] text-[#5f6368]">Live audit trail of workspace actions</p>
            </div>
            <button
              onClick={() => navigate('/admin/audit-logs')}
              className="text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Audit Logs</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            <div className="space-y-3.5">
              {dashboardData.activities.length === 0 ? (
                <div className="text-xs text-[#5f6368] italic text-center py-6">No recent workspace activities</div>
              ) : (
                dashboardData.activities.slice(0, 5).map((activity, idx) => {
                  const timeAgo = activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : 'just now';
                  return (
                    <div key={idx} className="flex gap-3 items-start pb-3 border-b border-[#f1f3f4] last:border-0 last:pb-0">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-[#4285F4] shrink-0"></div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-[#1f1f1f] truncate">
                          {activity.action ? activity.action.charAt(0).toUpperCase() + activity.action.slice(1) : 'Action performed'}
                        </p>
                        <p className="text-[11px] text-[#5f6368]">
                          <span className="font-medium text-[#444746]">{activity.user}</span> · {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60">
            <h3 className="text-sm font-semibold text-[#1f1f1f]">Quick Management Hub</h3>
            <p className="text-[11px] text-[#5f6368]">Fast shortcuts to frequent administrative modules</p>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.path)}
                  className={`p-3.5 text-left border border-[#e0e3e7] rounded-xl ${action.bg} transition-all flex items-start gap-3 group cursor-pointer`}
                >
                  <div className="p-2 rounded-lg bg-white border border-[#e0e3e7] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1f1f1f] group-hover:text-[#1a73e8] transition-colors">{action.label}</p>
                    <p className="text-[10.5px] text-[#5f6368] mt-0.5 truncate">{action.desc}</p>
                  </div>
                  <ArrowUpRight size={13} className="text-[#5f6368] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
