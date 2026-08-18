import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Users, FileText, TrendingUp, DollarSign, ArrowUpRight, BarChart3, Plus, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockSalesData = [
  { month: 'Jan', revenue: 45000, deals: 12 },
  { month: 'Feb', revenue: 52000, deals: 15 },
  { month: 'Mar', revenue: 61000, deals: 18 },
  { month: 'Apr', revenue: 58000, deals: 16 },
  { month: 'May', revenue: 75000, deals: 22 },
  { month: 'Jun', revenue: 89000, deals: 28 },
];

const OriginationSalesDashboard = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Sales Origination
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
            Sales Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor incoming sales leads, deals pipeline, and customer acquisition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> Add Sales Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Leads</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">48</div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> +18% vs last month
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Active Deals</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">24</div>
          <div className="text-xs text-slate-500">Pipeline in progress</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Customers</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">19</div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={14} /> Converted accounts
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Pipeline Value</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">$384,000</div>
          <div className="text-xs text-purple-600 font-medium">Estimated deal volume</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sales Performance</h2>
            <p className="text-xs text-slate-400">Monthly originated revenue</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockSalesData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OriginationSalesDashboard;
