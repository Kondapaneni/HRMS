import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchDashboardData } from '../services/branchOperationsServices';
import PageLoader from '../components/PageLoader';
import { Users, TrendingUp, CheckCircle, CheckCircle2, RefreshCw, XCircle, Clock, ArrowUpRight, Building2, ChevronDown, User, FileText, Calendar } from 'lucide-react';
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

  const getLeadStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 whitespace-nowrap"><Clock size={10} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 whitespace-nowrap"><RefreshCw size={10} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 whitespace-nowrap"><Clock size={10} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap"><CheckCircle2 size={10} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 whitespace-nowrap"><XCircle size={10} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  const getAppStatusBadge = (status) => {
    switch (status) {
      case 'Created':
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap"><CheckCircle2 size={10} /> {status}</span>;
      case 'Under Review':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 whitespace-nowrap"><Clock size={10} /> Under Review</span>;
      case 'Draft':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 whitespace-nowrap"><Clock size={10} /> Draft</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Dashboard..." />;
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Animated Hero Header — matching Origination Module Mobile Design */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
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
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Operations Module</p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Branch Operations</h2>
          <p className="text-sm font-medium text-white drop-shadow-sm opacity-90">{branch.name}</p>
        </div>
      </section>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-20 -mt-16"
      >
        {/* Dynamic Employee Filter Control (Mobile) */}
        <div className="px-4 mb-3">
          <div className="relative">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-sm appearance-none cursor-pointer"
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
                {stats.total_leads_month}
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
                {stats.active_opportunities}
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
                {stats.converted_leads}
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
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
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
                  <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>

        {/* Mobile Recent Records (Last 10 Leads & Applications) */}
        <motion.div variants={itemVariants} className="px-4 space-y-3 pt-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">Recent Activity</h3>
            <div className="flex overflow-x-auto hide-scrollbar space-x-2 border-b border-slate-200 pb-px">
              <button
                onClick={() => setActiveTab('leads')}
                className={`whitespace-nowrap px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'leads'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Recent Leads ({recentLeads.length})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`whitespace-nowrap px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'applications'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Applications ({recentApplications.length})
              </button>
            </div>
          </div>

          {activeTab === 'leads' ? (
            <div className="space-y-3">
              {recentLeads.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-100">
                  No recent leads for this branch.
                </div>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>
                        <p className="text-xs text-slate-500 font-mono">{lead.phone}</p>
                      </div>
                      {getLeadStatusBadge(lead.status)}
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                      <span className="font-medium text-slate-600">{lead.loan_type}</span>
                      <span>{lead.created_at ? format(new Date(lead.created_at), 'dd MMM, hh:mm a') : 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentApplications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-100">
                  No recent loan applications for this branch.
                </div>
              ) : (
                recentApplications.map((app) => (
                  <div key={app.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] border border-blue-100 font-mono">
                          {app.application_id || 'LA-PENDING'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">
                          {app.form_data?.applicant_name || 'Loan Applicant'}
                        </h4>
                      </div>
                      {getAppStatusBadge(app.status)}
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                      <span className="font-medium text-slate-600">{app.loan_type}</span>
                      <span>{app.created_at ? format(new Date(app.created_at), 'dd MMM, hh:mm a') : 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default BranchOperationsMobileDashboard;
