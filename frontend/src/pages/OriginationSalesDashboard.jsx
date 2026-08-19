import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesDashboardData } from '../services/salesServices';
import { Users, TrendingUp, CheckCircle, ArrowUpRight, Plus } from 'lucide-react';
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
import { motion } from 'framer-motion';
import OriginationMobileSalesDashboard from './OriginationMobileSalesDashboard';

const OriginationSalesDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['salesDashboard'],
    queryFn: getSalesDashboardData
  });

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <>
      <div className="md:hidden">
        <OriginationMobileSalesDashboard />
      </div>

      <motion.div 
        className="hidden md:block p-6 space-y-6 pb-6"
        variants={containerVariants}
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Origination Sales Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Overview of lead generation and conversion trends.</p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/80 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Leads (This Month)</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-slate-800">
                  {isLoading ? '...' : stats.total_leads_month}
                </h3>
                <span className={`flex items-center text-sm font-medium mb-1 ${stats.percent_change_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <ArrowUpRight size={16} className={`mr-0.5 ${stats.percent_change_total < 0 ? 'rotate-90' : ''}`} /> 
                  {Math.abs(stats.percent_change_total)}%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/80 shadow-sm flex items-center justify-between group hover:border-teal-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Opportunities</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-slate-800">
                  {isLoading ? '...' : stats.active_opportunities}
                </h3>
                <span className={`flex items-center text-sm font-medium mb-1 ${stats.percent_change_active >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <ArrowUpRight size={16} className={`mr-0.5 ${stats.percent_change_active < 0 ? 'rotate-90' : ''}`} /> 
                  {Math.abs(stats.percent_change_active)}%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
              <TrendingUp size={28} />
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/80 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Converted Leads</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-slate-800">
                  {isLoading ? '...' : stats.converted_leads}
                </h3>
                <span className={`flex items-center text-sm font-medium mb-1 ${stats.percent_change_converted >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <ArrowUpRight size={16} className={`mr-0.5 ${stats.percent_change_converted < 0 ? 'rotate-90' : ''}`} /> 
                  {Math.abs(stats.percent_change_converted)}%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle size={28} />
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Daily Trends Chart */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Daily Leads Trend (Last 7 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="leads" name="Total Leads" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Monthly Leads Trend (Last 6 Months)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="converted" name="Converted" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </motion.div>
      </motion.div>
    </>
  );
};

export default OriginationSalesDashboard;
