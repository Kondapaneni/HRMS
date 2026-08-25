import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  ShoppingBag,
  Award,
  Clock,
  Phone,
  ChevronRight,
  MapPin
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
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSalesDashboardData, getSalesLeads } from '../services/salesServices';
import PageLoader from '../components/PageLoader';
import { maskPhoneNumber } from '../utils/phoneUtils';
import { format } from 'date-fns';

const OriginationMobileSaleDashboard = () => {
  const { profile } = useAuth();
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
    queryKey: ['salesDashboard'],
    queryFn: getSalesDashboardData
  });

  const { data: leadsResponse, isLoading: leadsLoading } = useQuery({
    queryKey: ['sales', 'leads', 'recent'],
    queryFn: () => getSalesLeads()
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Clock size={10} /> New
          </span>
        );
      case 'Follow Up':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]">
            <TrendingUp size={10} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock size={10} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={10} /> Converted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
            {status || 'Pending'}
          </span>
        );
    }
  };

  if (isDashboardLoading) {
    return <PageLoader message="Loading Sales Dashboard..." />;
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
              {profile?.firstName || profile?.name?.split(' ')[0] || 'Sales'} {profile?.lastName || profile?.name?.split(' ')[1] || 'Officer'}
            </h1>
            <p className="text-xs text-[#5f6368] flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
                <ShoppingBag size={11} /> Sales Origination
              </span>
              <span>&bull;</span>
              <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </p>
          </div>

          <div className="h-13 w-13 rounded-full bg-[#e8f0fe] border-2 border-[#d2e3fc] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-bold text-[#1a73e8]">
                {profile?.firstName?.[0] || profile?.name?.split(' ')?.[0]?.[0] || 'S'}{profile?.lastName?.[0] || profile?.name?.split(' ')?.[1]?.[0] || 'O'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. 4 KPI Metric Cards */}
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
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">In active pipeline</p>
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
            <p className="text-xs text-[#5f6368] font-normal pt-0.5">Closed deals</p>
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#1f1f1f]">
              {chartTab === 'daily' ? 'Daily Leads (Last 7 Days)' : 'Monthly Performance'}
            </h3>
            <p className="text-[11px] text-[#5f6368]">
              {chartTab === 'daily' ? 'Daily acquisition & conversion' : '6-month performance trend'}
            </p>
          </div>

          <div className="flex items-center bg-[#f1f3f4] p-0.5 rounded-full">
            <button
              type="button"
              onClick={() => setChartTab('daily')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                chartTab === 'daily'
                  ? 'bg-white text-[#1a73e8] shadow-2xs'
                  : 'text-[#5f6368] hover:text-[#1f1f1f]'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setChartTab('monthly')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                chartTab === 'monthly'
                  ? 'bg-white text-[#1a73e8] shadow-2xs'
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
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="convertedGradient" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#1a73e8" strokeWidth={2} fillOpacity={1} fill="url(#leadsGradient)" />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#34a853" strokeWidth={2} fillOpacity={1} fill="url(#convertedGradient)" />
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

      {/* 4. Recent Sales Leads Feed */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1f1f1f]">Recent Sales Leads</h3>
              <p className="text-[11px] text-[#5f6368]">Latest prospects registered</p>
            </div>
          </div>

          <Link
            to="/employee/sales/origination/leads"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0]"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="divide-y divide-[#f1f3f4]">
          {leadsLoading ? (
            <p className="text-center py-6 text-xs text-[#5f6368]">Loading recent leads...</p>
          ) : recentLeads.length === 0 ? (
            <p className="text-center py-6 text-xs text-[#5f6368]">No sales leads recorded yet.</p>
          ) : (
            recentLeads.map((lead) => (
              <div key={lead.id} className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs flex items-center justify-center border border-[#d2e3fc] shrink-0">
                    {(lead.name || 'L').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1f1f1f] truncate">{lead.name}</p>
                    <p className="text-[11px] text-[#5f6368] flex items-center gap-1 mt-0.5">
                      <Phone size={10} className="text-[#80868b]" />
                      <span>{maskPhoneNumber(lead.phone)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  {getStatusBadge(lead.status)}
                  <span className="text-[10px] text-[#80868b]">
                    {lead.created_at ? format(new Date(lead.created_at), 'dd MMM') : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileSaleDashboard;
