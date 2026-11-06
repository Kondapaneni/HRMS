import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Award,
  Clock, 
  Phone, 
  ChevronRight, 
  Plus
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
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardData, getLeads } from '../services/loanServices';
import PageLoader from '../components/PageLoader';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileLoanDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chartTab, setChartTab] = useState('daily'); // 'daily' | 'monthly'

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

  // Fetch dashboard metrics
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['leadsDashboard'],
    queryFn: getDashboardData
  });

  const { data: leadsResponse, isLoading: leadsLoading } = useQuery({
    queryKey: ['origination', 'leads', 'recent'],
    queryFn: getLeads
  });

  const recentLeads = (leadsResponse?.leads || []).slice(0, 5);

  const stats = dashboardData?.stats || {
    total_leads_month: 0,
    percent_change_total: 0,
    active_opportunities: 0,
    percent_change_active: 0,
    converted_leads: 0,
    percent_change_converted: 0
  };

  const dailyData = dashboardData?.dailyData || [];
  const monthlyData = dashboardData?.monthlyData || [];

  const conversionRate = stats.total_leads_month > 0
    ? Math.min(100, Math.round((stats.converted_leads / stats.total_leads_month) * 100))
    : 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={12} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
            <TrendingUp size={12} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={12} /> {status}
          </span>
        );
      case 'Converted':
      case 'Sanctioned':
      case 'Disbursed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
            <CheckCircle2 size={12} /> Converted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] shrink-0">
            {status || 'Pending'}
          </span>
        );
    }
  };

  if (isDashboardLoading) {
    return <PageLoader message="Loading Origination Dashboard..." />;
  }

  return (
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">
      {/* 1. Header greeting & Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            {getGreeting()} &bull; Loan Origination
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Hello, <span className="font-semibold text-[var(--brand-deep)]">{profile?.firstName || 'Loan Officer'}</span>
            </h2>

            <button
              onClick={() => navigate('/employee/loans/origination/leads/add')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full-[12px] text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Add Lead</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} &bull; Performance &amp; Pipeline
          </p>
        </div>
      </section>

      {/* 2. Exactly the 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-20">
        {/* Card 1: Total Leads */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Total Leads (This Month)
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                {stats.total_leads_month}
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
          <div className="p-3 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Opportunities */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Active Opportunities
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                {stats.active_opportunities}
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
            <p className="text-xs text-[var(--muted)] font-normal pt-0.5">In pipeline follow-up</p>
          </div>
          <div className="p-3 rounded-[12px] bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Converted Leads */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Converted Leads
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[var(--text)] tracking-tight">
                {stats.converted_leads}
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
            <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Successfully disbursed</p>
          </div>
          <div className="p-3 rounded-[12px] bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Conversion Rate - oceanic blue */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Conversion Rate
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[var(--brand-deep)] tracking-tight">
                {conversionRate}%
              </p>
              <span className="text-xs font-semibold text-[var(--badge-success-text)]">Active</span>
            </div>
            <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Total funnel conversion</p>
          </div>
          <div className="p-3 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Switchable Chart Card */}
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0 pr-1">
            <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight truncate">
              {chartTab === 'daily' ? 'Daily Leads (7 Days)' : 'Monthly Performance'}
            </h3>
            <p className="text-[11px] text-[var(--muted)] truncate">
              {chartTab === 'daily' ? 'Acquisition & Conversion' : '6-Month Performance Trend'}
            </p>
          </div>

          {/* Pill Toggle Tab */}
          <div className="inline-flex p-1 bg-[var(--surface-alt)] rounded-[12px] border border-[var(--line)] shrink-0">
            <button
              type="button"
              onClick={() => setChartTab('daily')}
              className={`px-3 py-1 rounded-full-[8px] text-xs font-semibold transition-all cursor-pointer ${
                chartTab === 'daily'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setChartTab('monthly')}
              className={`px-3 py-1 rounded-full-[8px] text-xs font-semibold transition-all cursor-pointer ${
                chartTab === 'monthly'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[240px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartTab === 'daily' ? (
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="loanLeadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8AADDB" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#8AADDB" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="loanConvertedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 10 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '10px', 
                    border: 'none', 
                    backgroundColor: '#131315',
                    color: '#ffffff',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#8AADDB" strokeWidth={2} fillOpacity={1} fill="url(#loanLeadsGradient)" />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#loanConvertedGradient)" />
              </AreaChart>
            ) : (
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 10 }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B75', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '10px', 
                    border: 'none', 
                    backgroundColor: '#131315',
                    color: '#ffffff',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  cursor={{ fill: 'var(--brand-tint)', opacity: 0.4 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                <Bar dataKey="leads" name="Leads" fill="#8AADDB" radius={[6, 6, 0, 0]} barSize={12} />
                <Bar dataKey="converted" name="Converted" fill="#22C55E" radius={[6, 6, 0, 0]} barSize={12} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Recent Pipeline Leads Feed */}
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">Recent Pipeline <span className="text-[var(--brand-deep)]">Leads</span></h3>
              <p className="text-[11px] text-[var(--muted)]">Latest loan applicants registered</p>
            </div>
          </div>

          <Link
            to="/employee/loans/origination/leads"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--brand-deep)] hover:underline transition-colors shrink-0"
          >
            <span>View All</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {leadsLoading ? (
            <p className="text-center py-6 text-xs text-[var(--muted)]">Loading recent leads...</p>
          ) : recentLeads.length === 0 ? (
            <p className="text-center py-6 text-xs text-[var(--muted)]">No pipeline leads recorded yet.</p>
          ) : (
            recentLeads.map((lead) => {
              const displayName = lead.name || lead.full_name || 'Unnamed Prospect';
              const initials = displayName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'L';

              return (
                <div 
                  key={lead.id} 
                  onClick={() => navigate('/employee/loans/origination/leads/details', { state: { lead } })}
                  className="py-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-[var(--surface-alt)] transition-colors rounded-[12px] px-2 -mx-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold text-xs flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-semibold text-[var(--text)] text-sm truncate">
                        {displayName}
                      </h4>
                      <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Phone size={10} className="text-[var(--icon-muted)]" />
                          {lead.phone ? maskPhoneNumber(lead.phone) : '—'}
                        </span>
                        {lead.loan_type && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate text-[var(--brand-deep)] font-medium">{lead.loan_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    {getStatusBadge(lead.status)}
                    <span className="text-[10.5px] font-medium text-[var(--muted)]">
                      {lead.created_at ? format(new Date(lead.created_at), 'dd MMM') : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileLoanDashboard;
