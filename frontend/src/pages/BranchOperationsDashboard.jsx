import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchDashboardData } from '../services/branchOperationsServices';
import { Users, TrendingUp, CheckCircle, CheckCircle2, RefreshCw, XCircle, ArrowUpRight, Building2, User, FileText, Calendar, Clock, Layers } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';
import BranchOperationsMobileDashboard from './BranchOperationsMobileDashboard';

const BranchOperationsDashboard = () => {
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [activeTableTab, setActiveTableTab] = useState('leads'); // 'leads' | 'applications'

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const getLeadStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap"><Clock size={12} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 whitespace-nowrap"><RefreshCw size={12} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 whitespace-nowrap"><Clock size={12} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap"><CheckCircle2 size={12} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 whitespace-nowrap"><XCircle size={12} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  const getAppStatusBadge = (status) => {
    switch (status) {
      case 'Created':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap"><CheckCircle2 size={12} /> Created</span>;
      case 'Under Review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap"><Clock size={12} /> Under Review</span>;
      case 'Draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 whitespace-nowrap"><Clock size={12} /> Draft</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <>
      <div className="md:hidden">
        <BranchOperationsMobileDashboard />
      </div>

      <motion.div 
        className="hidden md:block p-6 space-y-6 pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Branch Operations</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Building2 size={13} className="text-indigo-600" />
                {branch.name}
              </span>
            </div>
            <p className="text-sm text-slate-500">Overview of branch lead generation, loan applications, and operations.</p>
          </div>

          {/* Dynamic Employee Filter Dropdown */}
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="h-10 w-full sm:w-auto rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 font-medium cursor-pointer shadow-xs"
          >
            <option value="all">All Employees ({creators.length})</option>
            {creators.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.name}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/80 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Leads (This Month)</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-slate-800">
                  {isLoading ? '...' : stats.total_leads_month}
                </h3>
                <span className={`flex items-center text-sm font-medium mb-1 ${stats.percent_change_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <ArrowUpRight size={16} className={`mr-0.5 ${stats.percent_change_total < 0 ? 'rotate-90' : ''}`} /> 
                  {Math.abs(stats.percent_change_total)}%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/80 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Opportunities</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-slate-800">
                  {isLoading ? '...' : stats.active_opportunities}
                </h3>
                <span className={`flex items-center text-sm font-medium mb-1 ${stats.percent_change_active >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <ArrowUpRight size={16} className={`mr-0.5 ${stats.percent_change_active < 0 ? 'rotate-90' : ''}`} /> 
                  {Math.abs(stats.percent_change_active)}%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <TrendingUp size={28} />
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/80 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Converted Leads</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-slate-800">
                  {isLoading ? '...' : stats.converted_leads}
                </h3>
                <span className={`flex items-center text-sm font-medium mb-1 ${stats.percent_change_converted >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <ArrowUpRight size={16} className={`mr-0.5 ${stats.percent_change_converted < 0 ? 'rotate-90' : ''}`} /> 
                  {Math.abs(stats.percent_change_converted)}%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle size={28} />
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Daily Trends Chart */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Daily Leads Trend (Last 7 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="leads" name="Total Leads" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Monthly Leads Trend (Last 6 Months)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </motion.div>

        {/* Directory-styled Activity Card & Table (Matching Origination Leads) */}
        <motion.div variants={itemVariants} className="rounded-lg border border-slate-200 bg-white shadow-sm mb-6">
          <div className="p-6 pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <Users className="h-5 w-5 text-slate-500" />
                Recent Branch Activity
              </h3>
              <p className="text-sm text-slate-500 mt-1">A comprehensive list of latest 10 leads and loan applications recorded for this branch.</p>
            </div>
          </div>

          {/* Underline Tabs Header */}
          <div className="px-6">
            <div className="flex overflow-x-auto hide-scrollbar space-x-2 border-b border-slate-200 pb-px">
              <button
                onClick={() => setActiveTableTab('leads')}
                className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTableTab === 'leads'
                    ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                Recent Leads ({recentLeads.length})
              </button>
              <button
                onClick={() => setActiveTableTab('applications')}
                className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTableTab === 'applications'
                    ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                Recent Applications ({recentApplications.length})
              </button>
            </div>
          </div>

          <div className="p-6 pt-4">
            <div className="rounded-md border border-slate-200 overflow-x-auto">
              {activeTableTab === 'leads' ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Loan Type</th>
                      <th className="p-3">Created By</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-slate-500">Loading recent records...</td>
                      </tr>
                    ) : recentLeads.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-slate-500">No leads found for this branch.</td>
                      </tr>
                    ) : (
                      recentLeads.map((lead) => (
                        <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-700">
                            <div className="font-medium text-slate-900">{lead.name}</div>
                          </td>
                          <td className="p-3 text-slate-700">
                            {lead.phone}
                          </td>
                          <td className="p-3 text-slate-700 max-w-[200px] truncate" title={lead.address}>
                            {lead.address || '—'}
                          </td>
                          <td className="p-3 text-slate-700">
                            <span className="font-medium text-slate-800">{lead.loan_type || 'Personal Loan'}</span>
                          </td>
                          <td className="p-3 text-slate-700">
                            {lead.creator_name || 'Branch Officer'}
                          </td>
                          <td className="p-3">
                            {getLeadStatusBadge(lead.status)}
                          </td>
                          <td className="p-3 text-slate-700">
                            {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy h:mm a') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="p-3">Application ID</th>
                      <th className="p-3">Applicant Name</th>
                      <th className="p-3">Loan Type</th>
                      <th className="p-3">Created By</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-slate-500">Loading recent records...</td>
                      </tr>
                    ) : recentApplications.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-slate-500">No loan applications found for this branch.</td>
                      </tr>
                    ) : (
                      recentApplications.map((app) => {
                        const applicantName = app.form_data?.applicant_name || app.form_data?.name || 'Applicant';
                        return (
                          <tr key={app.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-700">
                              <span className="font-mono font-medium text-blue-600">{app.application_id || 'LA-PENDING'}</span>
                            </td>
                            <td className="p-3 text-slate-700">
                              <div className="font-medium text-slate-900">{applicantName}</div>
                            </td>
                            <td className="p-3 text-slate-700">
                              <span className="font-medium text-slate-800">{app.loan_type || app.form_data?.loan_type || 'Personal Loan'}</span>
                            </td>
                            <td className="p-3 text-slate-700">
                              {app.creator_name || 'Branch Officer'}
                            </td>
                            <td className="p-3">
                              {getAppStatusBadge(app.status)}
                            </td>
                            <td className="p-3 text-slate-700">
                              {app.created_at ? format(new Date(app.created_at), 'MMM d, yyyy h:mm a') : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default BranchOperationsDashboard;
