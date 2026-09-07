import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBranchDashboardData } from '../services/loanServices';
import PageLoader from '../components/PageLoader';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase, 
  Building2, 
  ChevronDown,
  Calendar,
  Layers,
  Award,
  Phone,
  ChevronRight,
  UserCheck,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { maskPhoneNumber } from '../utils/phoneUtils';

const BranchOperationsMobileDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedPipeline, setSelectedPipeline] = useState('all'); // 'all' | 'loans' | 'sales'
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [chartTab, setChartTab] = useState('daily'); // 'daily' | 'monthly'
  const [activityTab, setActivityTab] = useState('leads'); // 'leads' | 'applications'
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const { data, isLoading } = useQuery({
    queryKey: ['branchOperationsDashboard', selectedEmployee, selectedPipeline],
    queryFn: getBranchDashboardData
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

  // When pipeline changes, verify selectedEmployee exists in filtered list; if not, reset to 'all'
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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 shrink-0 shadow-2xs">
            <Clock size={12} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff] shrink-0 shadow-2xs">
            <TrendingUp size={12} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0 shadow-2xs">
            <Clock size={12} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0 shadow-2xs">
            <CheckCircle2 size={12} /> Converted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0 shadow-2xs">
            {status || '—'}
          </span>
        );
    }
  };

  const getAppStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'Created':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0 shadow-2xs">
            <CheckCircle2 size={12} /> {status}
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 shrink-0 shadow-2xs">
            <Clock size={12} /> Under Review
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0 shadow-2xs">
            <Clock size={12} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] shrink-0 shadow-2xs">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0 shadow-2xs">
            {status || '—'}
          </span>
        );
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Branch Operations Dashboard..." />;
  }

  return (
    <div className="space-y-4 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* 1. Clean White Header (Direct Page Layout) */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            {getGreeting()} &bull; Branch Operations
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              {profile?.firstName || 'Operations'} <span className="font-medium italic text-[#7C4DFF]">{profile?.lastName || 'Manager'}</span>
            </h2>

            <button
              onClick={() => navigate('/employee/branch-operations/activities')}
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 bg-[#7C4DFF] hover:bg-[#651fff] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Calendar size={14} />
              <span>Activities</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1 flex items-center gap-1.5">
            <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#7C4DFF]">
              <Building2 size={13} className="text-[#7C4DFF]" /> {branch.name}
            </span>
          </p>
        </div>
      </section>

      {/* 2. Elevated Content Layer */}
      <div className="relative z-20 mx-0.5 space-y-3.5">
        

        {/* Dual Filter Selectors (1. Pipeline Selector, 2. Officer Selector) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Dropdown 1: Pipeline Selector (All / Loans / Sales) */}
          <div className="bg-white rounded-full border border-[#e0e3e7] px-4 py-2.5 shadow-xs flex items-center gap-2.5">
            <div className="text-[#7C4DFF] shrink-0">
              <Layers size={16} />
            </div>
            <div className="relative flex-1">
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="w-full bg-transparent text-[13px] font-semibold text-[#1f1f1f] appearance-none cursor-pointer outline-none pr-6"
              >
                <option value="all">All Pipelines (Loans &amp; Sales)</option>
                <option value="loans">Loans Origination</option>
                <option value="sales">Sales Origination</option>
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
            </div>
          </div>

          {/* Dropdown 2: Employee Selector (Filtered dynamically) */}
          <div className="bg-white rounded-full border border-[#e0e3e7] px-4 py-2.5 shadow-xs flex items-center gap-2.5">
            <div className="text-[#7C4DFF] shrink-0">
              <UserCheck size={16} />
            </div>
            <div className="relative flex-1">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full bg-transparent text-[13px] font-semibold text-[#1f1f1f] appearance-none cursor-pointer outline-none pr-6"
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
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 3. 4 KPI Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: Total Leads */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                Total Leads (This Month)
              </p>
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
            <div className="p-3 rounded-2xl bg-[#7C4DFF]/10 text-[#7C4DFF] shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Active Opportunities */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                Active Opportunities
              </p>
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
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                Converted Leads
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#137333] tracking-tight">
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

          {/* Card 4: Branch Conversion Rate */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                Conversion Rate
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#7C4DFF] tracking-tight">
                  {conversionRate}%
                </p>
                <span className="text-xs font-bold text-[#7C4DFF] bg-[#7C4DFF]/10 px-2 py-0.5 rounded-full">
                  {recentApplications.length} Apps
                </span>
              </div>
              <p className="text-xs text-[#5f6368] font-normal pt-0.5">Branch conversion efficiency</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#7C4DFF]/10 text-[#7C4DFF] shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 4. Chart Card with Tab Switcher */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="min-w-0 pr-1">
              <h3 className="text-sm font-bold text-[#1f1f1f] truncate">
                {chartTab === 'daily' ? 'Daily Leads (7 Days)' : 'Monthly Performance'}
              </h3>
              <p className="text-[11px] text-[#5f6368] truncate">
                {chartTab === 'daily' ? 'Acquisition & Conversion' : '6-month branch trend'}
              </p>
            </div>

            <div className="flex items-center bg-[#f1f3f4] p-1 rounded-full shrink-0">
              <button
                type="button"
                onClick={() => setChartTab('daily')}
                className={`whitespace-nowrap px-3 py-[7px] rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                  chartTab === 'daily'
                    ? 'bg-white text-[#7C4DFF] shadow-2xs font-bold'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setChartTab('monthly')}
                className={`whitespace-nowrap px-3 py-[7px] rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                  chartTab === 'monthly'
                    ? 'bg-white text-[#7C4DFF] shadow-2xs font-bold'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
              >
                6 Months
              </button>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === 'daily' ? (
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="branchLeadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C4DFF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7C4DFF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="branchConvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34a853" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#34a853" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #dadce0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      backgroundColor: '#ffffff',
                      fontSize: '11px'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#7C4DFF" strokeWidth={2} fillOpacity={1} fill="url(#branchLeadsGradient)" />
                  <Area type="monotone" dataKey="converted" name="Converted" stroke="#34a853" strokeWidth={2} fillOpacity={1} fill="url(#branchConvGradient)" />
                </AreaChart>
              ) : (
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #dadce0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      backgroundColor: '#ffffff',
                      fontSize: '11px'
                    }}
                    cursor={{ fill: '#f8fafd' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                  <Bar dataKey="leads" name="Leads" fill="#7C4DFF" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="converted" name="Converted" fill="#34a853" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Recent Pipeline Leads Feed */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#7C4DFF]/10 text-[#7C4DFF] flex items-center justify-center">
                <TrendingUp size={14} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1f1f1f]">Recent Pipeline Leads</h3>
                <p className="text-[11px] text-[#5f6368]">Latest prospects registered</p>
              </div>
            </div>

            <div className="flex items-center bg-[#f1f3f4] p-1 rounded-full shrink-0">
              <button
                type="button"
                onClick={() => setActivityTab('leads')}
                className={`whitespace-nowrap px-3 py-[7px] rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                  activityTab === 'leads'
                    ? 'bg-white text-[#7C4DFF] shadow-2xs font-bold'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
              >
                Leads ({recentLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('applications')}
                className={`whitespace-nowrap px-3 py-[7px] rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                  activityTab === 'applications'
                    ? 'bg-white text-[#7C4DFF] shadow-2xs font-bold'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
              >
                Apps ({recentApplications.length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#f1f3f4]">
            {activityTab === 'leads' ? (
              recentLeads.length === 0 ? (
                <p className="text-center py-6 text-xs text-[#5f6368]">No recent leads recorded for this branch.</p>
              ) : (
                recentLeads.map((lead) => {
                  const displayName = lead.name || 'Unnamed Prospect';
                  const initials = displayName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'L';

                  return (
                    <div 
                      key={lead.id} 
                      onClick={() => {
                        if (lead.is_sale) {
                          navigate('/employee/sales/origination/leads/details', { state: { lead } });
                        } else {
                          navigate('/employee/loans/origination/leads/details', { state: { lead } });
                        }
                      }}
                      className="py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#f8fafd] transition-colors rounded-xl px-1.5 -mx-1.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#7C4DFF]/10 text-[#7C4DFF] font-bold text-xs flex items-center justify-center shrink-0 border border-[#7C4DFF]/20">
                          {initials}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="font-bold text-[#1f1f1f] text-sm truncate">
                            {displayName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10.5px] text-[#5f6368]">
                            <span className="inline-flex items-center gap-1 font-medium text-[#5f6368]">
                              <Phone size={10} className="text-[#80868b]" />
                              {lead.phone ? maskPhoneNumber(lead.phone) : '—'}
                            </span>
                            {lead.loan_type && lead.loan_type.trim().toLowerCase() !== 'opportunity' && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate text-[#7C4DFF] font-semibold">{lead.loan_type}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        {getLeadStatusBadge(lead.status)}
                        <span className="text-[10.5px] font-medium text-[#80868b]">
                          {lead.created_at ? format(new Date(lead.created_at), 'dd MMM') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              recentApplications.length === 0 ? (
                <p className="text-center py-6 text-xs text-[#5f6368]">No recent loan applications recorded for this branch.</p>
              ) : (
                recentApplications.map((app) => {
                  const applicantName = app.form_data?.applicant_name || app.form_data?.name || 'Applicant';
                  const initials = applicantName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'A';

                  return (
                    <div 
                      key={app.id} 
                      onClick={() => navigate('/employee/branch-operations/loans-view-applications', { state: { application: app } })}
                      className="py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#f8fafd] transition-colors rounded-xl px-1.5 -mx-1.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#7C4DFF]/10 text-[#7C4DFF] font-bold text-xs flex items-center justify-center shrink-0 border border-[#7C4DFF]/20">
                          {initials}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="font-bold text-[#1f1f1f] text-sm truncate">
                            {applicantName}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-[#5f6368]">
                            <span className="font-mono font-bold text-[#7C4DFF]">
                              {app.application_id || 'LA-PENDING'}
                            </span>
                            <span>&bull;</span>
                            <span className="truncate text-[#5f6368] font-medium">
                              {app.loan_type || app.form_data?.loan_type || 'Personal Loan'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        {getAppStatusBadge(app.status)}
                        <span className="text-[10.5px] font-medium text-[#80868b]">
                          {app.created_at ? format(new Date(app.created_at), 'dd MMM') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer View All Link */}
          <div className="pt-2.5 mt-1 border-t border-[#f1f3f4]">
            {activityTab === 'leads' ? (
              <button
                type="button"
                onClick={() => navigate('/employee/branch-operations/leads')}
                className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[#7C4DFF] hover:bg-[#f3e8fd]/50 active:bg-[#f3e8fd] rounded-xl transition-colors cursor-pointer"
              >
                <span>View All Branch Leads</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/employee/branch-operations/loans-applications')}
                className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[#7C4DFF] hover:bg-[#f3e8fd]/50 active:bg-[#f3e8fd] rounded-xl transition-colors cursor-pointer"
              >
                <span>View All Loan Applications</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchOperationsMobileDashboard;
