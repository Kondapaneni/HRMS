import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalesDashboardData, createSalesLead, updateSalesLeadStatus } from '../services/salesServices';
import { 
  Users, TrendingUp, CheckCircle, ArrowUpRight, ShoppingBag, 
  DollarSign, Plus, Filter, ChevronRight, Phone, Mail, Sparkles,
  Building, RefreshCw, X, Loader2, Award, Briefcase, FileText, ArrowRight, Clock
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  Bar,
  BarChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import OriginationMobileSalesDashboard from './OriginationMobileSalesDashboard';

const stageColors = {
  'New': 'bg-blue-50 text-blue-700 border-blue-200/60',
  'Contacted': 'bg-purple-50 text-purple-700 border-purple-200/60',
  'Proposal Sent': 'bg-amber-50 text-amber-700 border-amber-200/60',
  'Negotiation': 'bg-teal-50 text-teal-700 border-teal-200/60',
  'Won': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Lost': 'bg-rose-50 text-rose-700 border-rose-200/60',
};

const OriginationSalesDashboard = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    product_interest: 'Enterprise Suite',
    deal_value: '',
    status: 'New',
    notes: ''
  });

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['salesDashboard'],
    queryFn: getSalesDashboardData
  });

  const addLeadMutation = useMutation({
    mutationFn: createSalesLead,
    onSuccess: () => {
      toast.success('Sales lead originated successfully!');
      setShowAddModal(false);
      setFormData({
        name: '',
        company_name: '',
        phone: '',
        email: '',
        product_interest: 'Enterprise Suite',
        deal_value: '',
        status: 'New',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to create sales lead');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateSalesLeadStatus(id, status),
    onSuccess: () => {
      toast.success('Lead status updated!');
      queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    addLeadMutation.mutate({
      ...formData,
      deal_value: parseFloat(formData.deal_value) || 0
    });
  };

  const stats = data?.stats || {
    total_leads_month: 0,
    percent_change_total: 0,
    active_deals: 0,
    won_deals: 0,
    pipeline_value: 0,
    won_revenue: 0,
  };

  const dailyData = data?.dailyData || [];
  const monthlyData = data?.monthlyData || [];
  const recentLeads = data?.recentLeads || [];
  const stageBreakdown = data?.stageBreakdown || {};

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <OriginationMobileSalesDashboard />
      </div>

      {/* Desktop Screen View */}
      <div className="hidden md:block p-6 space-y-6 pb-12 max-w-7xl mx-auto">
        {/* Desktop Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs mb-2">
              <ShoppingBag size={14} className="text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Origination Sales Module</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Origination Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Real-time sales lead origination, deal pipelines, and revenue performance.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
            >
              <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              Originate Lead
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Leads */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads (Month)</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-extrabold text-slate-900">
                {isLoading ? '...' : stats.total_leads_month}
              </h3>
              <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${stats.percent_change_total >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_total < 0 ? 'rotate-90' : ''}`} />
                {stats.percent_change_total >= 0 ? `+${stats.percent_change_total}%` : `${stats.percent_change_total}%`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">vs previous month</p>
          </div>

          {/* Active Deals */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deals</p>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-extrabold text-slate-900">
                {isLoading ? '...' : stats.active_deals}
              </h3>
              <span className="text-xs font-semibold text-slate-400">In qualification</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">New, Contacted, In Review</p>
          </div>

          {/* Pipeline Value */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline Value</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-extrabold text-slate-900">
                {isLoading ? '...' : `$${Number(stats.pipeline_value).toLocaleString()}`}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">Total active opportunities</p>
          </div>

          {/* Won Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Won Revenue</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle size={18} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-extrabold text-slate-900">
                {isLoading ? '...' : `$${Number(stats.won_revenue).toLocaleString()}`}
              </h3>
              <span className="text-xs font-bold text-emerald-600">
                {stats.won_deals} closed won
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Successfully converted</p>
          </div>
        </div>

        {/* Charts Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Activity Area Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daily Sales Pipeline (Last 7 Days)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Leads originated vs deals converted</p>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorDeskLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDeskDeals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="leads" name="Active Leads" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDeskLeads)" />
                  <Area type="monotone" dataKey="deals" name="Won Deals" stroke="#06B6D4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDeskDeals)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Revenue Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Volume (Last 6 Months)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total originated deal revenue ($)</p>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Deal Volume']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="revenue" name="Deal Volume ($)" fill="#10B981" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Distribution & Recent Leads Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage Breakdown Column */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Pipeline Stage Distribution</h3>
            <div className="space-y-3">
              {Object.entries(stageBreakdown).map(([stage, item]) => (
                <div key={stage} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stageColors[stage] || 'bg-slate-100 text-slate-700'}`}>
                      {stage}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{item.count} lead{item.count === 1 ? '' : 's'}</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">
                    ${Number(item.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads Table (Spans 2 columns) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Sales Opportunities</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest originated leads and customer accounts</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{recentLeads.length} record{recentLeads.length === 1 ? '' : 's'}</span>
            </div>

            {recentLeads.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No Sales Leads Originated Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Start originating sales deals and prospects to populate live revenue analytics.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  <Plus size={14} /> Originate First Lead
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="pb-3 px-2">Contact / Company</th>
                      <th className="pb-3 px-2">Product / Deal</th>
                      <th className="pb-3 px-2">Stage</th>
                      <th className="pb-3 px-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-bold text-slate-900 text-sm leading-tight">{lead.name}</div>
                          <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-2">
                            {lead.company_name && <span className="font-medium text-slate-600">{lead.company_name}</span>}
                            <span>{lead.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-700 font-medium">
                          {lead.product_interest || 'Enterprise Suite'}
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={lead.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: lead.id, status: e.target.value })}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer ${stageColors[lead.status] || 'bg-slate-100 text-slate-700'}`}
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Won">Won</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </td>
                        <td className="py-3 px-2 text-right font-extrabold text-slate-900 text-sm">
                          ${Number(lead.deal_value || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Modal for Lead Origination */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Plus size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Originate New Sales Lead</h3>
                    <p className="text-xs text-slate-400">Capture client details and initiate sales qualification</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Contact Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Inc."
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Product / Solution</label>
                    <select
                      value={formData.product_interest}
                      onChange={(e) => setFormData({ ...formData, product_interest: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="Enterprise Suite">Enterprise Suite</option>
                      <option value="Commercial Plan">Commercial Plan</option>
                      <option value="SaaS Subscription">SaaS Subscription</option>
                      <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                      <option value="Custom Implementation">Custom Implementation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Value ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="10000"
                      value={formData.deal_value}
                      onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stage</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Client Scope</label>
                  <textarea
                    rows={2}
                    placeholder="Key project scope, deal terms, or requirements..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLeadMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/20"
                  >
                    {addLeadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Originate Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OriginationSalesDashboard;
