import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase,
  Award,
  Clock,
  ChevronRight,
  Phone,
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
import { motion } from 'framer-motion';
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

  // Fetch recent leads
  const { data: leadsResponse, isLoading: leadsLoading } = useQuery({
    queryKey: ['origination', 'leads', 'recent', ''],
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--badge-info-text)]/15 shrink-0">
            <Clock size={11} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15 shrink-0">
            <TrendingUp size={11} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15 shrink-0">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-text)]/15 shrink-0">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] border border-[var(--line)] shrink-0">
            {status || 'Pending'}
          </span>
        );
    }
  };

  if (isDashboardLoading) {
    return <PageLoader message="Loading Origination Dashboard..." />;
  }

  return (
    <div className="space-y-4 pb-12 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            {getGreeting()} &bull; Loan Origination
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              {profile?.firstName || 'Origination'} <span className="font-semibold text-[var(--brand-deep)]">{profile?.lastName || 'Officer'}</span>
            </h2>

            <button
              onClick={() => navigate('/employee/loans/origination/leads/add')}
              className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink)]/90 active:scale-95 text-white rounded-[12px] text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Add Lead</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} &bull; Performance &amp; Leads
          </p>
        </div>
      </section>

      {/* 2. 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 relative z-20">
        
        {/* Card 1: Total Leads */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider truncate">
              Total Leads
            </p>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--text)] tracking-tight">
              {stats.total_leads_month}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`inline-flex items-center text-[10px] font-semibold ${stats.percent_change_total >= 0 ? 'text-[var(--badge-success-text)]' : 'text-[var(--badge-danger-text)]'}`}>
                {stats.percent_change_total >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(stats.percent_change_total)}%
              </span>
              <span className="text-[9.5px] text-[var(--muted)]">vs last mo</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Opportunities */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider truncate">
              Active Opps
            </p>
            <div className="p-1.5 rounded-[8px] bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--text)] tracking-tight">
              {stats.active_opportunities}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`inline-flex items-center text-[10px] font-semibold ${stats.percent_change_active >= 0 ? 'text-[var(--badge-success-text)]' : 'text-[var(--badge-danger-text)]'}`}>
                {stats.percent_change_active >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(stats.percent_change_active)}%
              </span>
              <span className="text-[9.5px] text-[var(--muted)]">pipeline</span>
            </div>
          </div>
        </div>

        {/* Card 3: Converted Leads */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider truncate">
              Converted
            </p>
            <div className="p-1.5 rounded-[8px] bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--text)] tracking-tight">
              {stats.converted_leads}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`inline-flex items-center text-[10px] font-semibold ${stats.percent_change_converted >= 0 ? 'text-[var(--badge-success-text)]' : 'text-[var(--badge-danger-text)]'}`}>
                {stats.percent_change_converted >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(stats.percent_change_converted)}%
              </span>
              <span className="text-[9.5px] text-[var(--muted)]">disbursed</span>
            </div>
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-[var(--surface)] rounded-[18px] border border-[var(--line)] p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider truncate">
              Conv Rate
            </p>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] shrink-0">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--accent-pink-deep)] tracking-tight">
              {conversionRate}%
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-medium text-[var(--badge-success-text)]">Active Funnel</span>
            </div>
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

          <div className="flex items-center bg-[var(--surface-alt)] p-1 rounded-full border border-[var(--line)] shrink-0">
            <button
              type="button"
              onClick={() => setChartTab('daily')}
              className={`whitespace-nowrap px-3 py-[6px] rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                chartTab === 'daily'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setChartTab('monthly')}
              className={`whitespace-nowrap px-3 py-[6px] rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                chartTab === 'monthly'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
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
                  <linearGradient id="loanLeadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8AADDB" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#8AADDB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="loanConvertedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F9D55" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#1F9D55" stopOpacity={0}/>
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
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#1F9D55" strokeWidth={2} fillOpacity={1} fill="url(#loanConvertedGradient)" />
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
                <Bar dataKey="converted" name="Converted" fill="#1F9D55" radius={[6, 6, 0, 0]} barSize={12} />
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
              <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">
                Recent Pipeline Leads
              </h3>
              <p className="text-[11px] text-[var(--muted)]">Latest prospects registered</p>
            </div>
          </div>

          <Link
            to="/employee/loans/origination/leads"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--brand-deep)] hover:underline transition-colors"
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
