import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, TrendingUp, CheckCircle, ArrowUpRight, ShoppingBag, 
  DollarSign, Plus, ArrowRight, Filter, ChevronRight, Phone, Mail, Sparkles 
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
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const mockDailySalesData = [
  { name: 'Mon', leads: 6, deals: 2 },
  { name: 'Tue', leads: 9, deals: 4 },
  { name: 'Wed', leads: 7, deals: 3 },
  { name: 'Thu', leads: 12, deals: 6 },
  { name: 'Fri', leads: 15, deals: 8 },
  { name: 'Sat', leads: 8, deals: 5 },
  { name: 'Sun', leads: 4, deals: 2 }
];

const mockMonthlySalesData = [
  { name: 'Jan', revenue: 45000, leads: 32 },
  { name: 'Feb', revenue: 58000, leads: 42 },
  { name: 'Mar', revenue: 72000, leads: 56 },
  { name: 'Apr', revenue: 68000, leads: 48 },
  { name: 'May', revenue: 89000, leads: 64 },
  { name: 'Jun', revenue: 104000, leads: 78 }
];

const mockRecentLeads = [
  { id: 1, name: 'Apex Logistics Inc.', contact: '+1 (555) 234-5678', dealValue: '$24,500', stage: 'Negotiation', color: 'emerald' },
  { id: 2, name: 'Nova Healthtech', contact: '+1 (555) 876-5432', dealValue: '$18,000', stage: 'Proposal Sent', color: 'teal' },
  { id: 3, name: 'Sterling Retailers', contact: '+1 (555) 345-6789', dealValue: '$32,000', stage: 'Qualified', color: 'blue' },
  { id: 4, name: 'Vertex Manufacturing', contact: '+1 (555) 987-6543', dealValue: '$45,000', stage: 'Won', color: 'emerald' },
];

const OriginationMobileSalesDashboard = () => {
  const [activePeriod, setActivePeriod] = useState('7d');

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
    <div className="min-h-screen pb-6">
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

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1.5 drop-shadow-md flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-300" />
            Origination Sales Module
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
            Origination Sales Dashboard
          </h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
            Sales leads, deal pipeline & conversions
          </p>
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[200px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Total Leads (Month)</p>
              <Users size={16} className="text-emerald-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">48</h3>
              <span className="flex items-center text-[10px] font-bold mb-1 text-emerald-600">
                <ArrowUpRight size={12} className="mr-0.5" /> +24%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[180px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Active Deals</p>
              <ShoppingBag size={16} className="text-teal-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">24</h3>
              <span className="flex items-center text-[10px] font-bold mb-1 text-emerald-600">
                <ArrowUpRight size={12} className="mr-0.5" /> +16%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[180px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Pipeline Value</p>
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">$384k</h3>
              <span className="flex items-center text-[10px] font-bold mb-1 text-emerald-600">
                <ArrowUpRight size={12} className="mr-0.5" /> +32%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[180px] snap-center shrink-0 pr-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Won Accounts</p>
              <CheckCircle size={16} className="text-teal-600" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">19</h3>
              <span className="flex items-center text-[10px] font-bold mb-1 text-emerald-600">
                <ArrowUpRight size={12} className="mr-0.5" /> +12%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Bar */}
        <motion.div variants={itemVariants} className="px-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-2">
            <Link
              to="/employee/sales/origination/leads"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm shadow-emerald-600/20"
            >
              <Plus size={14} /> Add Lead
            </Link>
            <Link
              to="/employee/sales/origination/deals"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              <ShoppingBag size={14} /> Deals
            </Link>
            <Link
              to="/employee/sales/origination/customers"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Users size={14} /> Customers
            </Link>
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="px-4 space-y-4">
          {/* Daily Trends Chart */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Daily Sales Pipeline</h3>
                <p className="text-xs text-slate-400">Leads and deals generated (Last 7 Days)</p>
              </div>
            </div>
            <div className="h-[220px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockDailySalesData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="colorSalesLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSalesDeals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesLeads)" />
                  <Area type="monotone" dataKey="deals" name="Deals" stroke="#06B6D4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesDeals)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Monthly Revenue Trends */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Monthly Revenue</h3>
                <p className="text-xs text-slate-400">Originated sales deal volume</p>
              </div>
            </div>
            <div className="h-[220px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockMonthlySalesData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" name="Revenue ($)" fill="#10B981" radius={[6, 6, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Sales Leads Feed */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Recent Sales Leads</h3>
              <Link to="/employee/sales/origination/leads" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {mockRecentLeads.map((lead) => (
                <div key={lead.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 leading-tight">{lead.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.contact}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-slate-900">{lead.dealValue}</div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {lead.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default OriginationMobileSalesDashboard;
