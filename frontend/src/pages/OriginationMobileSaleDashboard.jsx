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
import { getSalesDashboardData, getSalesLeads } from '../services/salesServices';
import PageLoader from '../components/PageLoader';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileSaleDashboard = () => {
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
    return <PageLoader message="Loading Sales Dashboard..." />;
  }

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Hero Section with Animated Emerald/Teal Motion Graphics for Sales */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs with Sales Origination Emerald, Teal & Cyan Theme */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
            {getGreeting()} &bull; Sales Origination
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
            {profile?.firstName || profile?.name?.split(' ')[0] || 'Sales'} {profile?.lastName || profile?.name?.split(' ')[1] || 'Officer'}
          </h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} &bull; Performance &amp; Leads
          </p>
        </div>
      </section>

      {/* 2. Exactly the 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-20 -mt-8 mx-0.5">
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
          <div className="p-3 rounded-2xl bg-[#e6f4ea] text-[#137333] shrink-0">
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
              <p className="text-2xl font-bold text-[#137333] tracking-tight">
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
            <h3 className="text-sm font-bold text-[#1f1f1f] truncate">
              {chartTab === 'daily' ? 'Daily Leads (7 Days)' : 'Monthly Performance'}
            </h3>
            <p className="text-[11px] text-[#5f6368] truncate">
              {chartTab === 'daily' ? 'Acquisition & Conversion' : '6-Month Performance Trend'}
            </p>
          </div>

          <div className="flex items-center bg-[#f1f3f4] p-1 rounded-full shrink-0">
            <button
              type="button"
              onClick={() => setChartTab('daily')}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                chartTab === 'daily'
                  ? 'bg-white text-[#137333] shadow-2xs font-bold'
                  : 'text-[#5f6368] hover:text-[#1f1f1f]'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setChartTab('monthly')}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                chartTab === 'monthly'
                  ? 'bg-white text-[#137333] shadow-2xs font-bold'
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
                  <linearGradient id="salesLeadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="salesConvertedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
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
                <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#salesLeadsGradient)" />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#salesConvertedGradient)" />
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
                <Bar dataKey="leads" name="Leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="converted" name="Converted" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Recent Pipeline Leads Feed */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1f1f1f]">Recent Pipeline Leads</h3>
              <p className="text-[11px] text-[#5f6368]">Latest prospects registered</p>
            </div>
          </div>

          <Link
            to="/employee/sales/origination/leads"
            className="inline-flex items-center gap-1 text-[13px] font-bold text-[#137333] hover:text-[#0b5324] transition-colors shrink-0"
          >
            <span>View All</span>
            <ChevronRight size={15} />
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
                  onClick={() => navigate('/employee/sales/origination/leads/details', { state: { lead } })}
                  className="py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#f8fafd] transition-colors rounded-xl px-1.5 -mx-1.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-xs flex items-center justify-center shrink-0 border border-[#ceead6]">
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
                        {lead.product_type && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate text-[#137333] font-semibold">{lead.product_type}</span>
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

export default OriginationMobileSaleDashboard;
