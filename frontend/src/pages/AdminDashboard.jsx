import React, { lazy, Suspense } from 'react';
import PageLoader from '../components/PageLoader';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Users, Activity, Calendar, Clock,
  ArrowUpRight, IndianRupee, UserCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../components/ui/StatCard';
const AdminDashboardCharts = lazy(() => import('../components/AdminDashboardCharts'));




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
    queryFn: async ({ signal }) => {
      const res = await api.get('/admin/dashboard/stats', { signal });
      return res.data;
    },
    staleTime: 30 * 1000 // Dashboard summaries update more frequently than static settings
  });

  if (loading) return <PageLoader message="Loading dashboard..." />;

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

      {/* KPI cards and navigation render before the deferred charting engine. */}
      <Suspense fallback={<div role="status" className="grid grid-cols-1 lg:grid-cols-2 gap-3.5"><div className="h-[350px] rounded-[24px] bg-[var(--surface)] animate-pulse" /><div className="h-[350px] rounded-[24px] bg-[var(--surface)] animate-pulse" /></div>}>
        <AdminDashboardCharts data={dashboardData} />
      </Suspense>

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
