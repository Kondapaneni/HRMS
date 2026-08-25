import React, { useState, useEffect } from 'react';
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
  Briefcase, 
  Building2, 
  ChevronDown,
  Calendar,
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
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { maskPhoneNumber } from '../utils/phoneUtils';

const BranchOperationsMobileDashboard = () => {
  const { profile } = useAuth();
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
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]"><Clock size={10} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]"><TrendingUp size={10} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]"><Clock size={10} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"><CheckCircle2 size={10} /> Converted</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status || '—'}</span>;
    }
  };

  const getAppStatusBadge = (status) => {
    switch (status) {
      case 'Created':
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"><CheckCircle2 size={10} /> {status}</span>;
      case 'Under Review':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]"><Clock size={10} /> Under Review</span>;
      case 'Draft':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]"><Clock size={10} /> Draft</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status || '—'}</span>;
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Branch Dashboard..." />;
  }

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Hero Welcome Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5">
                {getGreeting()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              {profile?.firstName || 'Operations'} {profile?.lastName || 'Officer'}
            </h1>
            <p className="text-xs text-[#5f6368] flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
                <Building2 size={11} /> {branch.name}
              </span>
              <span>&bull;</span>
              <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </p>
          </div>

          <div className="h-12 w-12 rounded-full bg-[#e8f0fe] border-2 border-[#d2e3fc] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-bold text-[#1a73e8]">
                {profile?.firstName?.[0] || 'B'}{profile?.lastName?.[0] || 'O'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Employee Filter Selector */}
      <div className="relative">
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="w-full h-11 pl-4 pr-10 rounded-2xl bg-white border border-[#e0e3e7] text-xs font-semibold text-[#1f1f1f] shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8]"
        >
          <option value="all">All Branch Employees ({creators.length})</option>
          {creators.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
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
          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] shrink-0">
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

        {/* Card 4: Recent Applications */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
              Recent Applications
            </p>
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

      {/* 4. Chart Card with Tab Switcher */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#1f1f1f]">Performance Trends</h3>
            <p className="text-[11px] text-[#5f6368]">Pipeline generation analysis</p>
          </div>

          <div className="flex items-center gap-1 bg-[#f8fafd] border border-[#e0e3e7] p-1 rounded-full">
            <button
              type="button"
              onClick={() => setChartTab('daily')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                chartTab === 'daily'
                  ? 'bg-white text-[#1a73e8] shadow-xs'
                  : 'text-[#5f6368]'
              }`}
            >
              Daily (7d)
            </button>
            <button
              type="button"
              onClick={() => setChartTab('monthly')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                chartTab === 'monthly'
                  ? 'bg-white text-[#1a73e8] shadow-xs'
                  : 'text-[#5f6368]'
              }`}
            >
              Monthly (6m)
            </button>
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartTab === 'daily' ? (
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#137333" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#137333" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e0e3e7',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '11px'
                  }}
                />
                <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#1a73e8" strokeWidth={2} fillOpacity={1} fill="url(#leadsGradient)" />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#137333" strokeWidth={2} fillOpacity={1} fill="url(#convGradient)" />
              </AreaChart>
            ) : (
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e0e3e7',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '11px'
                  }}
                  cursor={{ fill: '#f8fafd' }}
                />
                <Bar dataKey="leads" name="Total Leads" fill="#1a73e8" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="converted" name="Converted" fill="#137333" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Recent Activity List Card */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#f1f3f4] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1f1f1f]">Recent Activity</h3>
          
          <div className="flex items-center gap-1 bg-[#f8fafd] border border-[#e0e3e7] p-1 rounded-full">
            <button
              type="button"
              onClick={() => setActivityTab('leads')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                activityTab === 'leads'
                  ? 'bg-white text-[#1a73e8] shadow-xs'
                  : 'text-[#5f6368]'
              }`}
            >
              Leads ({recentLeads.length})
            </button>
            <button
              type="button"
              onClick={() => setActivityTab('applications')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                activityTab === 'applications'
                  ? 'bg-white text-[#1a73e8] shadow-xs'
                  : 'text-[#5f6368]'
              }`}
            >
              Apps ({recentApplications.length})
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#f1f3f4]">
          {activityTab === 'leads' ? (
            recentLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5f6368]">
                No recent leads recorded for this branch.
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#f8fafd] transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#1f1f1f] truncate">{lead.name}</p>
                      {getLeadStatusBadge(lead.status)}
                    </div>
                    <p className="text-[11px] text-[#5f6368] truncate">
                      {maskPhoneNumber(lead.phone)} &bull; {lead.loan_type || 'Personal Loan'}
                    </p>
                    <p className="text-[10px] text-[#5f6368]">
                      By {lead.creator_name || 'Branch Officer'} &bull; {lead.created_at ? format(new Date(lead.created_at), 'dd MMM, h:mm a') : '—'}
                    </p>
                  </div>
                </div>
              ))
            )
          ) : (
            recentApplications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5f6368]">
                No recent loan applications recorded for this branch.
              </div>
            ) : (
              recentApplications.map((app) => {
                const applicantName = app.form_data?.applicant_name || app.form_data?.name || 'Applicant';
                return (
                  <div key={app.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#f8fafd] transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full border border-[#d2e3fc]">
                          {app.application_id || 'LA-PENDING'}
                        </span>
                        {getAppStatusBadge(app.status)}
                      </div>
                      <p className="text-xs font-bold text-[#1f1f1f] truncate">{applicantName}</p>
                      <p className="text-[10px] text-[#5f6368]">
                        {app.loan_type || app.form_data?.loan_type || 'Personal Loan'} &bull; By {app.creator_name || 'Branch Officer'} &bull; {app.created_at ? format(new Date(app.created_at), 'dd MMM, h:mm a') : '—'}
                      </p>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchOperationsMobileDashboard;
