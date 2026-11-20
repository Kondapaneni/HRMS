import { useMobileViewport } from '../performance/useMobileViewport.js';
import React, { useState, useEffect, useMemo } from 'react';
import { useRemoteData } from '../state/remote.js';
import { getBranchDashboardData } from '../services/loanServices';
import PageLoader from '../components/PageLoader';
import { 
  Users,
  Calendar, 
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
  Award,
  UserCheck
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
import { useNavigate, Link } from 'react-router-dom';
import BranchOperationsMobileDashboard from './BranchOperationsMobileDashboard';
import { maskPhoneNumber, maskAddress } from '../utils/phoneUtils';

const BranchOperationsDashboardDesktop = () => {
  const navigate = useNavigate();
  const [selectedPipeline, setSelectedPipeline] = useState('all'); // 'all' | 'loans' | 'sales'
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [activeTableTab, setActiveTableTab] = useState('leads'); // 'leads' | 'applications'

  const { data, isLoading } = useRemoteData({
    scope: ['branchOperationsDashboard', selectedEmployee, selectedPipeline],
    load: getBranchDashboardData
  });

  const branch = data?.branch || { name: 'Assigned Branch' };
  const allCreators = data?.creators || [];
  const recentLeads = data?.recentLeads || [];
  const recentApplications = data?.recentApplications || [];

  const filteredCreators = useMemo(() => {
    if (selectedPipeline === 'loans') {
      return allCreators.filter(c => c.has_loans !== false);
    }
    if (selectedPipeline === 'sales') {
      return allCreators.filter(c => c.has_sales !== false);
    }
    return allCreators;
  }, [allCreators, selectedPipeline]);

  useEffect(() => {
    if (selectedEmployee !== 'all' && filteredCreators.length > 0) {
      const exists = filteredCreators.some(c => c.userId === selectedEmployee);
      if (!exists) {
        setSelectedEmployee('all');
      }
    }
  }, [selectedPipeline, filteredCreators, selectedEmployee]);

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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--badge-info-text)]/15"><Clock size={11} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15"><TrendingUp size={11} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15"><Clock size={11} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-text)]/15"><CheckCircle2 size={11} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--badge-danger-text)]/15">Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] border border-[var(--line)]">{status || '—'}</span>;
    }
  };

  const getAppStatusBadge = (status) => {
    switch (status) {
      case 'Created':
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-text)]/15"><CheckCircle2 size={11} /> {status}</span>;
      case 'Under Review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--badge-info-text)]/15"><Clock size={11} /> Under Review</span>;
      case 'Draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15"><Clock size={11} /> Draft</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--badge-danger-text)]/15">Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] border border-[var(--line)]">{status || '—'}</span>;
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Branch Dashboard..." />;
  }

  return (
    <>
      {/* Mobile Screen View */}
      

      {/* Desktop Screen View */}
      <div className="space-y-6 pb-12 font-sans text-[var(--text)]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Branch Operations Overview
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <span>Branch Operations Dashboard</span>
              <span className="text-xs font-semibold text-[var(--branch-deep)] bg-[var(--branch-tint)] px-2.5 py-0.5 rounded-full">
                {branch.name || 'Active Hub'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Overview of branch lead generation, loan applications pipeline, and team performance.
            </p>
          </div>

          {/* Dual Dynamic Filter Dropdowns & Activities Button */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              to="/employee/branch-operations/activities"
              className="px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] shadow-xs flex items-center gap-2 transition-all cursor-pointer h-9"
            >
              <Calendar className="w-4 h-4 text-[var(--branch-deep)]" />
              <span>Activities &amp; Tasks</span>
            </Link>

            {/* 1. Pipeline Selector */}
            <div className="relative">
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="h-9 px-3.5 pr-8 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-xs font-medium text-[var(--text)] hover:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] appearance-none cursor-pointer transition-colors shadow-xs"
              >
                <option value="all">All Pipelines (Loans &amp; Sales)</option>
                <option value="loans">Loans Origination</option>
                <option value="sales">Sales Origination</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            </div>

            {/* 2. Employee Selector */}
            <div className="relative">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="h-9 px-3.5 pr-8 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-xs font-medium text-[var(--text)] hover:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] appearance-none cursor-pointer transition-colors shadow-xs"
              >
                <option value="all">
                  {selectedPipeline === 'loans'
                    ? `All Loan Officers (${filteredCreators.length})`
                    : selectedPipeline === 'sales'
                    ? `All Sales Officers (${filteredCreators.length})`
                    : `All Branch Officers (${filteredCreators.length})`}
                </option>
                {filteredCreators.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Leads */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs transition-all duration-200 hover:shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Total Leads (This Month)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                  {isLoading ? '...' : stats.total_leads_month}
                </p>
                <span className={`inline-flex items-center text-xs font-semibold ${stats.percent_change_total >= 0 ? 'text-[var(--badge-success-text)]' : 'text-[var(--badge-danger-text)]'}`}>
                  {stats.percent_change_total >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.percent_change_total)}%
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Vs previous month</p>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--branch-tint)] text-[var(--branch-deep)] shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Active Opportunities */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs transition-all duration-200 hover:shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Active Opportunities</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                  {isLoading ? '...' : stats.active_opportunities}
                </p>
                <span className={`inline-flex items-center text-xs font-semibold ${stats.percent_change_active >= 0 ? 'text-[var(--badge-success-text)]' : 'text-[var(--badge-danger-text)]'}`}>
                  {stats.percent_change_active >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.percent_change_active)}%
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] font-normal pt-0.5">In active pipeline</p>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Converted Leads */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs transition-all duration-200 hover:shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Converted Leads</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                  {isLoading ? '...' : stats.converted_leads}
                </p>
                <span className={`inline-flex items-center text-xs font-semibold ${stats.percent_change_converted >= 0 ? 'text-[var(--badge-success-text)]' : 'text-[var(--badge-danger-text)]'}`}>
                  {stats.percent_change_converted >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.percent_change_converted)}%
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Closed deals</p>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Conversion Rate */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs transition-all duration-200 hover:shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Conversion Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-[var(--branch-deep)] tracking-tight">
                  {conversionRate}%
                </p>
                <span className="text-xs font-semibold text-[var(--badge-success-text)]">Active</span>
              </div>
              <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Total funnel conversion</p>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--branch-tint)] text-[var(--branch-deep)] shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trends Chart */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">
                  Daily Leads Trend
                </h3>
                <p className="text-xs text-[var(--muted)]">Velocity over the last 7 days</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--branch-tint)] text-[var(--branch-deep)]">
                Daily Activity
              </span>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '10px', border: 'none', backgroundColor: '#131315', color: '#ffffff', fontSize: '12px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="leads" name="Total Leads" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#14B8A6' }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#0D9488' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">
                  Monthly Performance
                </h3>
                <p className="text-xs text-[var(--muted)]">Historical volumes across last 6 months</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--branch-tint)] text-[var(--branch-deep)]">
                6-Month Growth
              </span>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '10px', border: 'none', backgroundColor: '#131315', color: '#ffffff', fontSize: '12px' }}
                    itemStyle={{ color: '#ffffff' }}
                    cursor={{ fill: 'var(--branch-tint)', opacity: 0.4 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="#14B8A6" radius={[6, 6, 0, 0]} barSize={26} />
                  <Bar dataKey="converted" name="Converted" fill="#0D9488" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Branch Activity Card & Table */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[var(--line)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--branch-tint)] text-[var(--branch-deep)] flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Recent Branch Activity</h3>
                  <p className="text-xs text-[var(--muted)]">Latest leads and loan applications recorded for {branch.name}</p>
                </div>
              </div>
            </div>

            {/* Pill Tabs and View All Link */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1 bg-[var(--surface-alt)] border border-[var(--line)] p-1 rounded-[12px]">
                <button
                  type="button"
                  onClick={() => setActiveTableTab('leads')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    activeTableTab === 'leads'
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Recent Leads ({recentLeads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTableTab('applications')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    activeTableTab === 'applications'
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Recent Applications ({recentApplications.length})
                </button>
              </div>

              {activeTableTab === 'leads' ? (
                <button
                  type="button"
                  onClick={() => navigate('/employee/branch-operations/leads')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--branch-deep)] bg-[var(--branch-tint)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span>View All Leads</span>
                  <ArrowUpRight size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/employee/branch-operations/loans-applications')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--branch-deep)] bg-[var(--branch-tint)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span>View All Applications</span>
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTableTab === 'leads' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[var(--muted)] font-medium text-[11px] uppercase tracking-wider">
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
                <tbody className="divide-y divide-[var(--line)]">
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-xs text-[var(--muted)]">
                        No leads recorded for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[var(--text)]">
                          {lead.name}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--muted)]">
                          {maskPhoneNumber(lead.phone)}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--muted)] max-w-[180px] truncate" title={lead.address}>
                          {maskAddress(lead.address)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {lead.loan_type && lead.loan_type.trim().toLowerCase() !== 'opportunity' ? (
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)] whitespace-nowrap">
                              {lead.loan_type}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)] font-medium">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[var(--text-2)]">
                          {lead.creator_name || 'Branch Officer'}
                        </td>
                        <td className="px-4 py-3.5">
                          {getLeadStatusBadge(lead.status)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-[var(--muted)]">
                          {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy, h:mm a') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[var(--muted)] font-medium text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">App ID</th>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Loan Type</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {recentApplications.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-xs text-[var(--muted)]">
                        No loan applications recorded for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    recentApplications.map((app) => {
                      const applicantName = app.form_data?.applicant_name || app.form_data?.name || 'Applicant';
                      return (
                        <tr key={app.id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-medium text-[var(--branch-deep)] bg-[var(--branch-tint)] px-2.5 py-0.5 rounded-full text-[11px]">
                              {app.application_id || 'LA-PENDING'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-[var(--text)]">
                            {applicantName}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)] whitespace-nowrap">
                              {app.loan_type || app.form_data?.loan_type || 'Personal Loan'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-[var(--text-2)]">
                            {app.creator_name || 'Branch Officer'}
                          </td>
                          <td className="px-4 py-3.5">
                            {getAppStatusBadge(app.status)}
                          </td>
                          <td className="px-5 py-3.5 text-right text-[var(--muted)]">
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

const BranchOperationsDashboard = () => {
  const mobile = useMobileViewport();
  return mobile ? <BranchOperationsMobileDashboard /> : <BranchOperationsDashboardDesktop />;
};

export default BranchOperationsDashboard;
