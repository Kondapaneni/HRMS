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
  Calendar,
  XCircle
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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]">
            <Clock size={11} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]">
            <TrendingUp size={11} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
      case 'Sanctioned':
      case 'Disbursed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      case 'Not Interested':
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)]">
            <XCircle size={11} /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]">
            {status || 'Pending'}
          </span>
        );
    }
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <OriginationMobileLoanDashboard />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 font-sans text-[var(--text)]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Loan Origination Overview
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <span>Origination Loans Dashboard</span>
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                Active Hub
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Overview of lead generation, pipeline conversion, and monthly origination trends.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/employee/loans/origination/activities"
              className="px-4 py-2 rounded-[12px] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[var(--brand-deep)]" />
              <span>Activities &amp; Tasks</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Leads */}
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
            <div className="p-3 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Active Opportunities */}
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
              <p className="text-xs text-[var(--muted)] font-normal pt-0.5">In pipeline follow-up</p>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Converted Leads */}
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
              <p className="text-xs text-[var(--muted)] font-normal pt-0.5">Successfully disbursed</p>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Conversion Rate - oceanic blue branding */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs transition-all duration-200 hover:shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Conversion Rate</p>
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
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
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
                  <Line type="monotone" dataKey="leads" name="Total Leads" stroke="#8AADDB" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#8AADDB' }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#22C55E' }} />
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
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
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
                    cursor={{ fill: 'var(--brand-tint)', opacity: 0.4 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="#8AADDB" radius={[6, 6, 0, 0]} barSize={26} />
                  <Bar dataKey="converted" name="Converted" fill="#22C55E" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Pipeline Leads Table */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">
                Recent Pipeline Leads
              </h3>
              <p className="text-xs text-[var(--muted)]">Latest prospects requiring review and action</p>
            </div>
            <Link
              to="/employee/loans/origination/leads"
              className="text-xs font-semibold text-[var(--brand-deep)] hover:underline flex items-center gap-1"
            >
              <span>View All Leads</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {leadsLoading ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">Loading recent leads...</div>
          ) : recentLeads.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">No recent leads found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    <th className="pb-3 px-2">Applicant</th>
                    <th className="pb-3 px-2">Phone</th>
                    <th className="pb-3 px-2">Address</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                      <td className="py-3 px-2 font-semibold text-[var(--text)]">
                        {lead.name || 'Unnamed Prospect'}
                      </td>
                      <td className="py-3 px-2 text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[var(--icon-muted)]" />
                          {maskPhoneNumber(lead.phone)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[var(--muted)] max-w-xs truncate">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[var(--icon-muted)] shrink-0" />
                          <span className="truncate">{lead.address || '—'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          to="/employee/loans/origination/leads"
                          className="text-[var(--brand-deep)] hover:underline font-semibold text-xs"
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
