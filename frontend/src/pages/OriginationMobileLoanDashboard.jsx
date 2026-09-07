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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0 shadow-2xs">
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
            {status || 'Pending'}
          </span>
        );
    }
  };

  if (isDashboardLoading) {
    return <PageLoader message="Loading Origination Dashboard..." />;
  }

  return (
    <div className="space-y-4 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Clean White Header (Direct Page Layout) */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            {getGreeting()} &bull; Loan Origination
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              {profile?.firstName || 'Origination'} <span className="font-medium italic text-[#1a73e8]">{profile?.lastName || 'Officer'}</span>
            </h2>

            <button
              onClick={() => navigate('/employee/loans/origination/leads/add')}
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Add Lead</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1">
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} &bull; Performance &amp; Leads
          </p>
        </div>
      </section>

      {/* 2. Exactly the 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-20 mx-0.5">
        
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
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">In pipeline follow-up</p>
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
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">Successfully disbursed</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#e6f4ea] text-[#137333] shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
              Conversion Rate
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#1a73e8] tracking-tight">
                {conversionRate}%
              </p>
              <span className="text-xs font-semibold text-[#137333]">Active</span>
            </div>
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">Total funnel conversion</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#f3e8fd] text-[#8430ce] shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. Switchable Chart Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0 pr-1">
            <h3 className="text-sm font-medium text-[#1f1f1f] tracking-tight truncate" style={{ fontWeight: 500 }}>
              {chartTab === 'daily' ? <span>Daily <span className="font-medium italic text-[#1a73e8]">Leads</span> (7 Days)</span> : <span>Monthly <span className="font-medium italic text-[#1a73e8]">Performance</span></span>}
            </h3>
            <p className="text-[11px] text-[#5f6368] truncate">
              {chartTab === 'daily' ? 'Acquisition & Conversion' : '6-Month Performance Trend'}
            </p>
          </div>

          <div className="flex items-center bg-[#f1f3f4] p-1 rounded-full shrink-0">
            <button
              type="button"
              onClick={() => setChartTab('daily')}
              className={`whitespace-nowrap px-3 py-[7px] rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                chartTab === 'daily'
                  ? 'bg-white text-[#1a73e8] shadow-2xs font-bold'
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
                  ? 'bg-white text-[#1a73e8] shadow-2xs font-bold'
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
                  <linearGradient id="loanLeadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="loanConvertedGradient" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#1a73e8" strokeWidth={2} fillOpacity={1} fill="url(#loanLeadsGradient)" />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#34a853" strokeWidth={2} fillOpacity={1} fill="url(#loanConvertedGradient)" />
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
                <Bar dataKey="leads" name="Leads" fill="#1a73e8" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="converted" name="Converted" fill="#34a853" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Recent Pipeline Leads Feed */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#1f1f1f] tracking-tight" style={{ fontWeight: 500 }}>
                Recent Pipeline <span className="font-medium italic text-[#1a73e8]">Leads</span>
              </h3>
              <p className="text-[11px] text-[#5f6368]">Latest prospects registered</p>
            </div>
          </div>

          <Link
            to="/employee/loans/origination/leads"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#1a73e8] hover:text-[#1557b0] transition-colors"
          >
            <span>View All</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="divide-y divide-[#f1f3f4]">
          {leadsLoading ? (
            <p className="text-center py-6 text-xs text-[#5f6368]">Loading recent leads...</p>
          ) : recentLeads.length === 0 ? (
            <p className="text-center py-6 text-xs text-[#5f6368]">No pipeline leads recorded yet.</p>
          ) : (
            recentLeads.map((lead) => {
              const displayName = lead.name || lead.full_name || 'Unnamed Prospect';
              const initials = displayName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'L';

              return (
                <div 
                  key={lead.id} 
                  onClick={() => navigate('/employee/loans/origination/leads/details', { state: { lead } })}
                  className="py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#f8fafd] transition-colors rounded-xl px-1.5 -mx-1.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs flex items-center justify-center shrink-0 border border-[#d2e3fc]">
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
                        {lead.loan_type && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate text-[#1a73e8] font-semibold">{lead.loan_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    {getStatusBadge(lead.status)}
                    <span className="text-[10.5px] font-medium text-[#80868b]">
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
