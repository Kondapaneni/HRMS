import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalesDashboardData, createSalesLead, updateSalesLeadStatus } from '../services/salesServices';
import { 
  Users, TrendingUp, CheckCircle, ArrowUpRight, ShoppingBag, 
  DollarSign, Plus, ArrowRight, Filter, ChevronRight, Phone, Mail, Sparkles,
  Building, RefreshCw, X, Loader2, Award, Briefcase, FileText
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

const stageColors = {
  'New': 'bg-blue-50 text-blue-700 border-blue-200/60',
  'Contacted': 'bg-purple-50 text-purple-700 border-purple-200/60',
  'Proposal Sent': 'bg-amber-50 text-amber-700 border-amber-200/60',
  'Negotiation': 'bg-teal-50 text-teal-700 border-teal-200/60',
  'Won': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Lost': 'bg-rose-50 text-rose-700 border-rose-200/60',
};

const OriginationMobileSalesDashboard = () => {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Animated Hero Header */}
      <section className="relative px-6 pt-12 pb-20 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-[50px] opacity-40 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1.5 drop-shadow-md flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-300" />
              Origination Sales Module
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              Sales Dashboard
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              Live pipeline, deal volumes & conversions
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-20 -mt-20 space-y-5"
      >
        {/* KPI Carousel */}
        <motion.div variants={itemVariants} className="flex overflow-x-auto gap-4 px-4 py-5 hide-scrollbar snap-x">
          {/* Total Leads */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[200px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Total Leads (Month)</p>
              <Users size={16} className="text-emerald-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.total_leads_month}
              </h3>
              <span className={`flex items-center text-[10px] font-bold mb-1 ${stats.percent_change_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_total < 0 ? 'rotate-90' : ''}`} />
                {stats.percent_change_total >= 0 ? `+${stats.percent_change_total}%` : `${stats.percent_change_total}%`}
              </span>
            </div>
          </div>

          {/* Active Deals */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[180px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Active Deals</p>
              <ShoppingBag size={16} className="text-teal-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.active_deals}
              </h3>
              <span className="text-[10px] font-medium text-slate-400 mb-1">In progress</span>
            </div>
          </div>

          {/* Pipeline Value */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[200px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Pipeline Value</p>
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : `$${Number(stats.pipeline_value).toLocaleString()}`}
              </h3>
            </div>
          </div>

          {/* Won Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[190px] snap-center shrink-0 pr-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Won Revenue</p>
              <CheckCircle size={16} className="text-emerald-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : `$${Number(stats.won_revenue).toLocaleString()}`}
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 mb-1">
                {stats.won_deals} won
              </span>
            </div>
          </div>
        </motion.div>

        {/* Quick Action Button */}
        <motion.div variants={itemVariants} className="px-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={2.5} /> Originate New Sales Lead
          </button>
        </motion.div>

        {/* Charts Section */}
        <div className="px-4 space-y-4">
          {/* Daily Trends Chart */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Daily Activity (Last 7 Days)</h3>
                <p className="text-xs text-slate-400">Leads generated vs closed deals</p>
              </div>
            </div>
            <div className="h-[220px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="colorMobileLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMobileDeals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                  <Area type="monotone" dataKey="leads" name="Active Leads" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMobileLeads)" />
                  <Area type="monotone" dataKey="deals" name="Won Deals" stroke="#06B6D4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMobileDeals)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Monthly Revenue Trends */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Monthly Volume (Last 6 Months)</h3>
                <p className="text-xs text-slate-400">Originated sales deal value ($)</p>
              </div>
            </div>
            <div className="h-[220px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Deal Volume']}
                  />
                  <Bar dataKey="revenue" name="Deal Volume ($)" fill="#10B981" radius={[6, 6, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Pipeline Stage Distribution */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-800">Pipeline Stage Breakdown</h3>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {Object.entries(stageBreakdown).map(([stage, item]) => (
                <div key={stage} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageColors[stage] || 'bg-slate-100 text-slate-700'}`}>
                      {stage}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">{item.count}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-2">
                    ${Number(item.value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Sales Leads Feed */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Recent Sales Leads</h3>
              <span className="text-xs font-medium text-slate-400">
                {recentLeads.length} record{recentLeads.length === 1 ? '' : 's'}
              </span>
            </div>

            {recentLeads.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Sales Leads Originated Yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Originate your first sales prospect using the button above to populate real-time analytics.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 leading-tight">{lead.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          {lead.company_name && <span>{lead.company_name} • </span>}
                          <span>{lead.phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        ${Number(lead.deal_value || 0).toLocaleString()}
                      </div>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: lead.id, status: e.target.value })}
                        className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${stageColors[lead.status] || 'bg-slate-100 text-slate-700'}`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Originate Sales Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full rounded-t-[32px] p-6 max-h-[90vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Plus size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Originate Sales Lead</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3.5">
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
                    placeholder="e.g. Acme Enterprises"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="client@acme.com"
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
                      placeholder="5000"
                      value={formData.deal_value}
                      onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Deal Stage</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Requirement Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Key client needs, timeline, or meeting notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLeadMutation.isPending}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
                  >
                    {addLeadMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Originate Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OriginationMobileSalesDashboard;
