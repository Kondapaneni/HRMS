import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardData, getLeads } from '../services/loanServices';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock, 
  ChevronRight, 
  Phone, 
  MapPin, 
  Award,
  Layers
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
import { Link } from 'react-router-dom';
import OriginationMobileLoanDashboard from './OriginationMobileLoanDashboard';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationLoanDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['leadsDashboard'],
    queryFn: getDashboardData
  });

  const { data: leadsResponse, isLoading: leadsLoading } = useQuery({
    queryKey: ['origination', 'leads', 'list', ''],
    queryFn: getLeads
  });

  const recentLeads = (leadsResponse?.leads || []).slice(0, 5);

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

  const getStatusBadge = (status) => {
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
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status || 'Pending'}</span>;
    }
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <OriginationMobileLoanDashboard />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI matching Employee Dashboard) */}
      <div className="hidden md:block space-y-6 pb-12">
        {/* Header Bar - Exactly like Employee Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Loan Origination Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Origination Loans Dashboard <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">Active Hub</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Overview of lead generation, pipeline conversion, and monthly origination trends.
            </p>
          </div>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Leads */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Total Leads (This Month)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                  {isLoading ? '...' : stats.total_leads_month}
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

          {/* Active Opportunities */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Active Opportunities</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
                  {isLoading ? '...' : stats.active_opportunities}
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

          {/* Converted Leads */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Converted Leads</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#137333] tracking-tight">
                  {isLoading ? '...' : stats.converted_leads}
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

          {/* Conversion Rate */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0] flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Conversion Rate</p>
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trends Chart */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f]">
                  Daily Leads Trend
                </h3>
                <p className="text-xs text-[#5f6368]">Velocity over the last 7 days</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                Daily Activity
              </span>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e0e3e7', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', backgroundColor: '#fff', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="leads" name="Total Leads" stroke="#1a73e8" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#1a73e8' }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#137333" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#137333' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f]">
                  Monthly Performance
                </h3>
                <p className="text-xs text-[#5f6368]">Historical volumes across last 6 months</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                6-Month Growth
              </span>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5f6368', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e0e3e7', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', backgroundColor: '#fff', fontSize: '12px' }}
                    cursor={{ fill: '#f8fafd' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="#4285F4" radius={[6, 6, 0, 0]} barSize={26} />
                  <Bar dataKey="converted" name="Converted" fill="#34A853" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Pipeline Leads Table */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#1f1f1f]">
                Recent Pipeline Leads
              </h3>
              <p className="text-xs text-[#5f6368]">Latest prospects requiring review and action</p>
            </div>
            <Link
              to="/employee/loans/origination/leads"
              className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] flex items-center gap-1"
            >
              <span>View All Leads</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {leadsLoading ? (
            <div className="py-8 text-center text-xs text-[#5f6368]">Loading recent leads...</div>
          ) : recentLeads.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5f6368]">No recent leads found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e0e3e7] text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                    <th className="pb-3 px-2">Applicant</th>
                    <th className="pb-3 px-2">Phone</th>
                    <th className="pb-3 px-2">Address</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="py-3 px-2 font-semibold text-[#1f1f1f]">
                        {lead.name || 'Unnamed Prospect'}
                      </td>
                      <td className="py-3 px-2 text-[#5f6368]">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#80868b]" />
                          {maskPhoneNumber(lead.phone)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[#5f6368] max-w-xs truncate">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#80868b] shrink-0" />
                          <span className="truncate">{lead.address || '—'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          to="/employee/loans/origination/leads"
                          className="text-[#1a73e8] hover:underline font-semibold text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OriginationLoanDashboard;
