import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '../services/loanServices';
import { Users, TrendingUp, CheckCircle, ArrowUpRight } from 'lucide-react';
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

const OriginationMobileDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leadsDashboard'],
    queryFn: getDashboardData
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
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <div className="pb-20 min-h-screen">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl px-4 py-4 border-b border-white/80 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads</h1>
          <p className="text-xs text-slate-500 mt-0.5">Performance overview</p>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Summary Carousel */}
        <motion.div variants={itemVariants} className="flex overflow-x-auto gap-4 px-4 py-5 hide-scrollbar snap-x">
          <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm min-w-[200px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Total Leads (Month)</p>
              <Users size={16} className="text-blue-500" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.total_leads_month}
              </h3>
              <span className={`flex items-center text-[10px] font-bold mb-1 ${stats.percent_change_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_total < 0 ? 'rotate-90' : ''}`} /> 
                {Math.abs(stats.percent_change_total)}%
              </span>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm min-w-[180px] snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Active</p>
              <TrendingUp size={16} className="text-indigo-500" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.active_opportunities}
              </h3>
              <span className={`flex items-center text-[10px] font-bold mb-1 ${stats.percent_change_active >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_active < 0 ? 'rotate-90' : ''}`} /> 
                {Math.abs(stats.percent_change_active)}%
              </span>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm min-w-[180px] snap-center shrink-0 pr-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Converted</p>
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? '...' : stats.converted_leads}
              </h3>
              <span className={`flex items-center text-[10px] font-bold mb-1 ${stats.percent_change_converted >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <ArrowUpRight size={12} className={`mr-0.5 ${stats.percent_change_converted < 0 ? 'rotate-90' : ''}`} /> 
                {Math.abs(stats.percent_change_converted)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Charts Content */}
        <div className="px-4 space-y-4">
          
          {/* Daily Trends Chart */}
          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <h3 className="text-base font-bold text-slate-800 mb-4">Daily Leads (Last 7 Days)</h3>
            <div className="h-[250px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Monthly Trends Chart */}
          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm p-4">
            <h3 className="text-base font-bold text-slate-800 mb-4">Monthly Trends</h3>
            <div className="h-[250px] w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};

export default OriginationMobileDashboard;
