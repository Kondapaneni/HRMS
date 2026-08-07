import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  LogOut, Users, Settings, Activity, Briefcase,
  Search, Bell, Menu, Home, Calendar, Clock,
  BarChart2, ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
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
    // Dashboard stats change more frequently than payroll,
    // but less frequently than attendance.
    staleTime: 60 * 1000
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navItems = [
    { icon: <Home size={18} />, label: 'Home', active: true },
    { icon: <Users size={18} />, label: 'Employees', active: false },
    { icon: <Calendar size={18} />, label: 'Leave Tracker', active: false },
    { icon: <Clock size={18} />, label: 'Attendance', active: false },
    { icon: <BarChart2 size={18} />, label: 'Performance', active: false },
    { icon: <Settings size={18} />, label: 'Settings', active: false },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) return <PageLoader message="Loading Dashboard..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your organization's key metrics.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Employees', value: dashboardData.totalEmployees, change: 'Active Employees', icon: <Users size={20} className="text-blue-600" />, bg: 'bg-blue-50' },
          { title: 'Present Today', value: dashboardData.presentToday, change: 'Clocked in today', icon: <Clock size={20} className="text-emerald-600" />, bg: 'bg-emerald-50' },
          { title: 'On Leave', value: dashboardData.onLeaveToday, change: 'Approved leaves today', icon: <Calendar size={20} className="text-amber-600" />, bg: 'bg-amber-50' },
          { title: 'Attendance Rate', value: dashboardData.attendanceRate, change: 'Today\'s rate', icon: <Activity size={20} className="text-purple-600" />, bg: 'bg-purple-50' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-medium text-slate-600">{stat.title}</h3>
              <div className={`p-2 rounded-md ${stat.bg}`}>
                {stat.icon}
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Bar Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Monthly Attendance Trend</h3>
          <div className="w-full h-[300px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="present" name="Present Days" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leave" name="Leave Days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary Pie Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Salary Distribution</h3>
          <div className="w-full h-[300px] flex items-center justify-center mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.salaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="range"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {dashboardData.salaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-base font-semibold text-slate-900">Recent Activities</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              View All
            </button>
          </div>
          <div className="p-5 flex-1">
            <div className="space-y-4">
              {dashboardData.activities.length === 0 ? (
                <div className="text-sm text-slate-500 italic text-center py-4">No recent activities</div>
              ) : (
                dashboardData.activities.map((activity, idx) => {
                  const timeAgo = activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : 'just now';
                  return (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          {activity.action ? activity.action.charAt(0).toUpperCase() + activity.action.slice(1) : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {activity.user} · {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-semibold text-slate-900">Quick Actions</h3>
          </div>
          <div className="p-5 flex-1">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Mark Attendance', path: '/admin/attendance' },
                { label: 'View Payslip', path: '/admin/payroll' },
              ].map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => action.action ? action.action() : navigate(action.path)}
                  className="p-4 text-center border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center min-h-[80px]"
                >
                  <p className="text-sm font-medium text-slate-700">{action.label}</p>
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
