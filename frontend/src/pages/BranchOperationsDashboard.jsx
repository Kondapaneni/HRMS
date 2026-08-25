import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranchDashboardData } from '../services/loanServices';
import PageLoader from '../components/PageLoader';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Building2, 
  FileText, 
  Briefcase,
  ChevronDown,
  Layers,
  Award
} from 'lucide-react';
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
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import BranchOperationsMobileDashboard from './BranchOperationsMobileDashboard';
import { maskPhoneNumber } from '../utils/phoneUtils';

const BranchOperationsDashboard = () => {
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [activeTableTab, setActiveTableTab] = useState('leads'); // 'leads' | 'applications'

  const { data, isLoading } = useQuery({
    queryKey: ['branchOperationsDashboard', selectedEmployee],
    queryFn: getBranchDashboardData
  });

  const branch = data?.branch || { name: 'Assigned Branch' };
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

  const conversionRate = stats.total_leads_month > 0
    ? Math.min(100, Math.round((stats.converted_leads / stats.total_leads_month) * 100))
    : 0;

  const getLeadStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]"><Clock size={11} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]"><TrendingUp size={11} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]"><Clock size={11} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"><CheckCircle2 size={11} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status || '—'}</span>;
    }
  };

  const getAppStatusBadge = (status) => {
    switch (status) {
      case 'Created':
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"><CheckCircle2 size={11} /> {status}</span>;
      case 'Under Review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]"><Clock size={11} /> Under Review</span>;
      case 'Draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]"><Clock size={11} /> Draft</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status || '—'}</span>;
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Branch Dashboard..." />;
  }

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <BranchOperationsMobileDashboard />
      </div>

      {/* Desktop Screen View (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Branch Operations Overview
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Branch Operations Dashboard
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                {branch.name}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Overview of branch lead generation, loan applications pipeline, and team performance.
            </p>
          </div>

          {/* Dynamic Employee Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="h-9.5 px-4 pr-9 rounded-full border border-[#dadce0] bg-white text-xs font-semibold text-[#1f1f1f] shadow-2xs hover:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 appearance-none cursor-pointer transition-colors"
            >
              <option value="all">All Branch Employees ({creators.length})</option>
              {creators.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
          </div>
        </div>

        {/* 4 KPI Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Leads */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Total Leads (This Month)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                  {stats.total_leads_month}
                </p>
                <span className={`inline-flex items-center text-xs font-bold ${stats.percent_change_total >= 0 ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                  {stats.percent_change_total >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.percent_change_total)}%
                </span>
              </div>
              <p className="text-xs text-[#5f6368] font-normal pt-0.5">Vs previous month</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Active Opportunities */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Active Opportunities</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                  {stats.active_opportunities}
                </p>
                <span className={`inline-flex items-center text-xs font-bold ${stats.percent_change_active >= 0 ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                  {stats.percent_change_active >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.percent_change_active)}%
                </span>
              </div>
              <p className="text-xs text-[#5f6368] font-normal pt-0.5">Under pipeline review</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#fef7e0] text-[#b06000] shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Converted Leads */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Converted Leads</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                  {stats.converted_leads}
                </p>
                <span className={`inline-flex items-center text-xs font-bold ${stats.percent_change_converted >= 0 ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                  {stats.percent_change_converted >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.percent_change_converted)}%
                </span>
              </div>
              <p className="text-xs text-[#5f6368] font-normal pt-0.5">Successfully closed</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#e6f4ea] text-[#137333] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Applications Pipeline */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Recent Applications</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                  {recentApplications.length}
                </p>
                <span className="text-xs font-bold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full">
                  {conversionRate}% Conv.
                </span>
              </div>
              <p className="text-xs text-[#5f6368] font-normal pt-0.5">Recorded this cycle</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#f3e8fd] text-[#8430ce] shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trends Chart */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1f1f1f]">Daily Leads Trend</h3>
                <p className="text-xs text-[#5f6368]">Performance activity for the last 7 days</p>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #e0e3e7', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      backgroundColor: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="leads" name="Total Leads" stroke="#1a73e8" strokeWidth={2.5} dot={{ r: 3, fill: '#1a73e8' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#137333" strokeWidth={2.5} dot={{ r: 3, fill: '#137333' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1f1f1f]">Monthly Leads Trend</h3>
                <p className="text-xs text-[#5f6368]">Pipeline generation for the last 6 months</p>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #e0e3e7', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      backgroundColor: '#ffffff',
                      fontSize: '12px'
                    }}
                    cursor={{ fill: '#f8fafd' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="#1a73e8" radius={[6, 6, 0, 0]} barSize={28} />
                  <Bar dataKey="converted" name="Converted" fill="#137333" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Branch Activity Card & Table */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#f1f3f4] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1f1f1f]">Recent Branch Activity</h3>
                  <p className="text-xs text-[#5f6368]">Latest leads and loan applications recorded for {branch.name}</p>
                </div>
              </div>
            </div>

            {/* Google Rounded Pill Tabs */}
            <div className="flex items-center gap-1.5 bg-[#f8fafd] border border-[#e0e3e7] p-1 rounded-full">
              <button
                type="button"
                onClick={() => setActiveTableTab('leads')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTableTab === 'leads'
                    ? 'bg-white text-[#1a73e8] shadow-xs'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
              >
                Recent Leads ({recentLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTableTab('applications')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTableTab === 'applications'
                    ? 'bg-white text-[#1a73e8] shadow-xs'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
              >
                Recent Applications ({recentApplications.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTableTab === 'leads' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Applicant Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Loan Type</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-xs text-[#5f6368]">
                        No leads recorded for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#f8fafd] transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-[#1f1f1f]">
                          {lead.name}
                        </td>
                        <td className="px-4 py-3.5 text-[#5f6368]">
                          {maskPhoneNumber(lead.phone)}
                        </td>
                        <td className="px-4 py-3.5 text-[#5f6368] max-w-[180px] truncate" title={lead.address}>
                          {lead.address || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium bg-[#f1f3f4] text-[#444746] whitespace-nowrap text-center">
                            {lead.loan_type || 'Personal Loan'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[#444746]">
                          {lead.creator_name || 'Branch Officer'}
                        </td>
                        <td className="px-4 py-3.5">
                          {getLeadStatusBadge(lead.status)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-[#5f6368]">
                          {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy, h:mm a') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">App ID</th>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Loan Type</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {recentApplications.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-xs text-[#5f6368]">
                        No loan applications recorded for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    recentApplications.map((app) => {
                      const applicantName = app.form_data?.applicant_name || app.form_data?.name || 'Applicant';
                      return (
                        <tr key={app.id} className="hover:bg-[#f8fafd] transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full text-[11px] border border-[#d2e3fc]">
                              {app.application_id || 'LA-PENDING'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-[#1f1f1f]">
                            {applicantName}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium bg-[#f1f3f4] text-[#444746] whitespace-nowrap text-center">
                              {app.loan_type || app.form_data?.loan_type || 'Personal Loan'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-[#444746]">
                            {app.creator_name || 'Branch Officer'}
                          </td>
                          <td className="px-4 py-3.5">
                            {getAppStatusBadge(app.status)}
                          </td>
                          <td className="px-5 py-3.5 text-right text-[#5f6368]">
                            {app.created_at ? format(new Date(app.created_at), 'dd MMM yyyy, h:mm a') : '—'}
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
      </div>
    </>
  );
};

export default BranchOperationsDashboard;
