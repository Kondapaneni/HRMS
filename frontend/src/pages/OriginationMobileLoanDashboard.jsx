import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase,
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
import { getDashboardData } from '../services/loanServices';
import PageLoader from '../components/PageLoader';

const OriginationMobileLoanDashboard = () => {
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
    queryKey: ['leadsDashboard'],
    queryFn: getDashboardData
  });

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

  if (isDashboardLoading) {
    return <PageLoader message="Loading Origination Dashboard..." />;
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
              {profile?.firstName || 'Origination'} {profile?.lastName || 'Officer'}
            </h1>
            <p className="text-xs text-[#5f6368] flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
                <Briefcase size={11} /> Loan Origination
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
                {profile?.firstName?.[0] || 'L'}{profile?.lastName?.[0] || 'O'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Exactly the 4 KPI Metric Cards */}
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

      {/* 3. Charts Section */}
      <div className="space-y-4">
        
        {/* Daily Leads Line Chart */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
            <div>
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Daily Leads</h3>
              <p className="text-[10px] text-[#5f6368]">Last 7 Days Trend</p>
            </div>
            <span className="text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
              7 Days
            </span>
          </div>

          <div className="h-[210px] w-full -ml-3 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="convertedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#137333" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#137333" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e0e3e7', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)', 
                    fontSize: '11px',
                    backgroundColor: '#ffffff'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads" 
                  stroke="#1a73e8" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#leadsGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="converted" 
                  name="Converted" 
                  stroke="#137333" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#convertedGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trends Bar Chart */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
            <div>
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Monthly Trends</h3>
              <p className="text-[10px] text-[#5f6368]">Historical Monthly Conversions</p>
            </div>
            <span className="text-[10px] font-semibold text-[#137333] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#ceead6]">
              Monthly
            </span>
          </div>

          <div className="h-[210px] w-full -ml-3 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e0e3e7', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)', 
                    fontSize: '11px',
                    backgroundColor: '#ffffff'
                  }}
                  cursor={{ fill: '#f8fafd' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                <Bar dataKey="leads" name="Leads" fill="#1a73e8" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="converted" name="Converted" fill="#137333" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default OriginationMobileLoanDashboard;
