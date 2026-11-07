import PageLoader from '../components/PageLoader';

import { formatDistanceToNow } from 'date-fns';
import { Users, Activity, Calendar, Clock, ArrowUpRight, IndianRupee, UserCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../components/ui/StatCard';
import ChartCard from '../components/ui/ChartCard';

const CHART_PALETTE = ['#8AADDB', '#E3B9DF', '#131315', '#B9CDE8', '#C98BC2', '#5B86C2'];

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

  if (loading) return <PageLoader message="Loading dashboard..." />;

  const customTooltipStyle = {
    backgroundColor: 'var(--ink, #131315)',
    color: '#FFFFFF',
    borderRadius: '9px',
    padding: '8px 12px',
    fontSize: '12px',
    border: 'none',
    boxShadow: '0 8px 24px rgba(19,19,21,0.2)'
  };

  const quickActions = [
    {
      label: 'Mark attendance',
      desc: 'Staff logs & regularisation',
      path: '/admin/attendance',
      icon: <Clock size={16} className="text-[var(--brand-deep)]" />
    },
    {
      label: 'Payroll & compensation',
      desc: 'Pay runs & bulk salaries',
      path: '/admin/payroll',
      icon: <IndianRupee size={16} className="text-[var(--brand-deep)]" />
    },
    {
      label: 'Employee directory',
      desc: 'Staff profiles & org chart',
      path: '/admin/employees',
      icon: <Users size={16} className="text-[var(--brand-deep)]" />
    },
    {
      label: 'Leave management',
      desc: 'Review leave approvals',
      path: '/admin/leaves',
      icon: <Calendar size={16} className="text-[var(--brand-deep)]" />
    }
  ];

  return (
    <div className="space-y-5 pb-8 antialiased">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Welcome back, {profile?.email?.split('@')[0] || 'Admin'}
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Real-time analytics and workforce management overview
          </p>
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total employees"
          value={dashboardData.totalEmployees}
          caption="Active on payroll"
          icon={<Users size={18} />}
          onClick={() => navigate('/admin/employees')}
        />
        <StatCard
          title="Present today"
          value={dashboardData.presentToday}
          caption="Clocked into workspace"
          icon={<UserCheck size={18} />}
          onClick={() => navigate('/admin/attendance')}
        />
        <StatCard
          title="On leave"
          value={dashboardData.onLeaveToday}
          caption="Approved time-off today"
          icon={<Calendar size={18} />}
          onClick={() => navigate('/admin/leaves')}
        />
        <StatCard
          title="Attendance rate"
          value={dashboardData.attendanceRate}
          caption="Daily workplace participation"
          icon={<Activity size={18} />}
          onClick={() => navigate('/admin/attendance')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Attendance Trend Bar Chart */}
        <ChartCard
          title="Monthly attendance trend"
          subtitle="Present vs. approved leaves"
          badge="YTD"
        >
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboardData.attendanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line, #EFEFF1)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }}
                />
                <RechartsTooltip contentStyle={customTooltipStyle} cursor={{ fill: 'var(--brand-tint, #EAF0FA)' }} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--muted, #6B6B75)' }}
                />
                <Bar dataKey="present" name="Present" fill="#8AADDB" radius={[10, 10, 0, 0]} maxBarSize={28} />
                <Bar dataKey="leave" name="Leave" fill="#E3B9DF" radius={[10, 10, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Compensation Distribution Chart */}
        <ChartCard
          title="Compensation distribution"
          subtitle="Staff tiers by pay bracket"
          badge="Active staff"
        >
          <div className="w-full h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.salaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="range"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#FFFFFF"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="11"
                        fontWeight="500"
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {dashboardData.salaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={customTooltipStyle} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--muted, #6B6B75)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Recent Activity Card */}
        <div className="bg-[var(--surface)] rounded-[24px] p-[18px] flex flex-col justify-between">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--line)]">
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Recent activity</h3>
              <p className="text-[11px] text-[var(--muted)]">Live workspace audit trail</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/audit-logs')}
              className="text-xs font-medium text-[var(--brand-deep)] hover:underline flex items-center gap-1"
            >
              <span>View audit log</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="pt-3.5 flex-1">
            <div className="space-y-3">
              {dashboardData.activities.length === 0 ? (
                <div className="text-xs text-[var(--muted)] italic text-center py-6">
                  No recent workspace activities
                </div>
              ) : (
                dashboardData.activities.slice(0, 5).map((activity, idx) => {
                  const timeAgo = activity.time
                    ? formatDistanceToNow(new Date(activity.time), { addSuffix: true })
                    : 'just now';
                  return (
                    <div
                      key={idx}
                      className="flex gap-3 items-start pb-3 border-b border-[var(--line)] last:border-0 last:pb-0"
                    >
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-[var(--brand)] shrink-0" />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-[var(--text)] truncate">
                          {activity.action
                            ? activity.action.charAt(0).toUpperCase() + activity.action.slice(1)
                            : 'Action performed'}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          <span className="font-medium text-[var(--text-2)]">{activity.user}</span> &bull; {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Management Hub */}
        <div className="bg-[var(--surface)] rounded-[24px] p-[18px] flex flex-col justify-between">
          <div className="pb-3 border-b border-[var(--line)]">
            <h3 className="text-sm font-medium text-[var(--text)]">Quick management</h3>
            <p className="text-[11px] text-[var(--muted)]">Direct access to frequent administrative actions</p>
          </div>

          <div className="pt-3.5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="p-3 text-left rounded-[16px] bg-[var(--surface-alt)] hover:bg-[var(--brand-tint)] transition-all flex items-start gap-3 group cursor-pointer"
                >
                  <div className="p-2 rounded-[12px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text)] group-hover:text-[var(--brand-deep)] transition-colors">
                      {action.label}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">{action.desc}</p>
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                  />
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
