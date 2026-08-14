import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchDashboardData } from '../services/branchOperationsServices';
import { Users, TrendingUp, CheckCircle, ArrowUpRight, Building2, ChevronDown, User, FileText, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const BranchOperationsMobileDashboard = () => {
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'applications'

  const { data, isLoading, error } = useQuery({
    queryKey: ['branchOperationsDashboard', selectedEmployee],
    queryFn: getBranchDashboardData
  });

  const branch = data?.branch || { name: 'Branch Operations' };
  const creators = data?.creators || [];
  const recentLeads = data?.recentLeads || [];
  const recentApplications = data?.recentApplications || [];

  const stats = data?.stats || {
    total_leads_month: 0,
    percent_change_total: 0,
    active_opportunities: 0,
    percent_change_active: 0,
    converted_leads: 0,
    percent_change_converted: 0
  };

  const dailyData = data?.dailyData || [];
  const monthlyData = data?.monthlyData || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Created':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Under Review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Draft':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Converted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Follow Up':
      case 'In Progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Not Interested':
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Animated Hero Header */}
      <section className="relative px-6 pt-12 pb-20 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-md">
            <Building2 size={12} className="text-indigo-300" />
            <span>{branch.name}</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Branch Operations</h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Branch performance overview & operations</p>
        </div>
      </section>

      <motion.div
        variants={containerVariants}
        className="relative z-20 -mt-20"
      >
        {/* Dynamic Employee Filter Control (Mobile) */}
        <div className="px-4 mb-3">
          <div className="relative">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-xs appearance-none cursor-pointer"
            >
              <option value="all">All Employees ({creators.length})</option>
              {creators.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Summary Carousel */}
        <motion.div variants={itemVariants} className="flex overflow-x-auto gap-4 px-4 py-2 hide-scrollbar snap-x">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[200px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Total Leads (Month)</p>
              <Users size={16} className="text-blue-500" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.total_leads_month}
              </h3>
              <span className={`flex items-center text-[10px] font-bold mb-1 ${stats.percent_change_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_total < 0 ? 'rotate-90' : ''}`} />
                {Math.abs(stats.percent_change_total)}%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[180px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Active</p>
              <TrendingUp size={16} className="text-indigo-500" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.active_opportunities}
              </h3>
              <span className={`flex items-center text-[10px] font-bold mb-1 ${stats.percent_change_active >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_active < 0 ? 'rotate-90' : ''}`} />
                {Math.abs(stats.percent_change_active)}%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[180px] snap-center shrink-0 pr-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Converted</p>
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.converted_leads}
              </h3>
              <span className={`flex items-center text-[10px] font-bold mb-1 ${stats.percent_change_converted >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_converted < 0 ? 'rotate-90' : ''}`} />
                {Math.abs(stats.percent_change_converted)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Charts Content */}
        <div className="px-4 space-y-4 pb-4 mt-4">

          {/* Daily Trends Chart */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Daily Leads (Last 7 Days)</h3>
            <div className="h-[250px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Monthly Trends Chart */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden p-6 mt-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Monthly Trends</h3>
            <div className="h-[250px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="leads" name="Leads" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>

        {/* Mobile Recent Records (Last 10 Leads & Applications) */}
        <motion.div variants={itemVariants} className="px-4 space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Activity</h3>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setActiveTab('leads')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeTab === 'leads' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Leads ({recentLeads.length})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeTab === 'applications' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Apps ({recentApplications.length})
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {activeTab === 'leads' ? (
              isLoading ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading leads...</div>
              ) : recentLeads.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-white rounded-2xl border border-slate-100">
                  No recent leads in this branch.
                </div>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${getStatusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>{lead.loan_type} • {lead.phone}</span>
                      <span className="text-[11px] text-slate-400">
                        {lead.created_at ? format(new Date(lead.created_at), 'MMM d') : '-'}
                      </span>
                    </div>
                    {lead.creator_name && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        By {lead.creator_name}
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              isLoading ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading applications...</div>
              ) : recentApplications.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-white rounded-2xl border border-slate-100">
                  No recent applications in this branch.
                </div>
              ) : (
                recentApplications.map((app) => {
                  const applicantName = app.form_data?.applicant_name || app.form_data?.name || 'Applicant';
                  return (
                    <div key={app.id} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{applicantName}</h4>
                          <span className="text-[10px] font-mono text-indigo-600 font-bold">{app.application_id}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium mt-1">
                        <span>{app.loan_type || app.form_data?.loan_type || 'Personal Loan'}</span>
                        <span className="text-[11px] text-slate-400">
                          {app.created_at ? format(new Date(app.created_at), 'MMM d') : '-'}
                        </span>
                      </div>
                      {app.creator_name && (
                        <div className="mt-1 text-[11px] text-slate-400">
                          By {app.creator_name}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default BranchOperationsMobileDashboard;
