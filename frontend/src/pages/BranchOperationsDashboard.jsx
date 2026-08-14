import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle2,
  FileText,
  Send,
  ArrowUpRight,
  Filter,
  UserCheck,
  Briefcase,
  ChevronDown,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  X,
  Award,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { getBranchOperationsDashboardData } from '../services/branchOperationsServices';
import BranchOperationsMobileDashboard from './BranchOperationsMobileDashboard';

const BranchOperationsDashboard = () => {
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [selectedLoanType, setSelectedLoanType] = useState('All');
  const [timeframe, setTimeframe] = useState('this_month');
  const [isOfficerDropdownOpen, setIsOfficerDropdownOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['branchOperationsDashboard', selectedOfficer, selectedLoanType, timeframe],
    queryFn: () =>
      getBranchOperationsDashboardData({
        officerId: selectedOfficer,
        loanType: selectedLoanType,
        timeframe: timeframe
      }),
    staleTime: 30000
  });

  const branch = data?.branch || { name: 'Branch Operations' };
  const officers = data?.officers || [];
  const stats = data?.stats || {
    total_leads: 0,
    percent_change_leads: 0,
    active_opportunities: 0,
    converted_leads: 0,
    conversion_rate: 0,
    total_applications: 0,
    draft_applications: 0,
    created_applications: 0,
    transferred_applications: 0,
    approved_applications: 0,
    rejected_applications: 0
  };

  const dailyData = data?.dailyData || [];
  const monthlyData = data?.monthlyData || [];
  const officerBreakdown = data?.officerBreakdown || [];
  const recentApplications = data?.recentApplications || [];
  const loanTypeBreakdown = data?.loanTypeBreakdown || [];

  const activeOfficerObj = officers.find((o) => o.userId === selectedOfficer);

  const timeframes = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_6_months', label: 'Last 6 Months' },
    { id: 'all_time', label: 'All Time' }
  ];

  const loanTypes = ['All', 'Personal Loan', 'Business Loan'];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Branch Operations':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
      case 'Created':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <BranchOperationsMobileDashboard
          data={data}
          isLoading={isLoading}
          selectedOfficer={selectedOfficer}
          setSelectedOfficer={setSelectedOfficer}
          selectedLoanType={selectedLoanType}
          setSelectedLoanType={setSelectedLoanType}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          refetch={refetch}
        />
      </div>

      {/* Desktop & Tablet View */}
      <motion.div
        className="hidden md:block p-8 max-w-7xl mx-auto space-y-8 pb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 1. Header Toolbar & Filters */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <Building2 size={14} className="text-indigo-600" />
              <span>{branch.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Branch Operations Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Real-time loan origination performance, pipeline tracking & operational analytics.
            </p>
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Officer Dropdown Selector */}
            <div className="relative">
              <button
                onClick={() => setIsOfficerDropdownOpen(!isOfficerDropdownOpen)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all shadow-xs"
              >
                <Users size={16} className="text-indigo-600" />
                <span className="max-w-[140px] truncate">
                  {activeOfficerObj ? activeOfficerObj.name : `All Officers (${officers.length})`}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Officer Dropdown Menu */}
              <AnimatePresence>
                {isOfficerDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsOfficerDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 space-y-1"
                    >
                      <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Origination Officers
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOfficer('');
                          setIsOfficerDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          !selectedOfficer ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                            ALL
                          </div>
                          <span>All Officers in Branch</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">({officers.length})</span>
                      </button>

                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {officers.map((officer) => (
                          <button
                            key={officer.userId}
                            onClick={() => {
                              setSelectedOfficer(officer.userId);
                              setIsOfficerDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                              selectedOfficer === officer.userId
                                ? 'bg-indigo-50 text-indigo-700 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] overflow-hidden">
                                {officer.avatar ? (
                                  <img src={officer.avatar} alt={officer.name} className="w-full h-full object-cover" />
                                ) : (
                                  officer.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <div>{officer.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{officer.position}</div>
                              </div>
                            </div>
                            {selectedOfficer === officer.userId && (
                              <div className="w-2 h-2 rounded-full bg-indigo-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-xs">
              {timeframes.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    timeframe === tf.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Dashboard"
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-xs"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </motion.div>

        {/* Active Filter Banner (if officer or loan type is filtered) */}
        {(selectedOfficer || selectedLoanType !== 'All') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200/80 px-5 py-3 rounded-2xl text-xs text-indigo-900"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold flex items-center gap-1.5 text-indigo-700">
                <Filter size={14} /> Active Filters:
              </span>
              {selectedOfficer && (
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-indigo-200 font-semibold shadow-2xs">
                  <span>Officer: {activeOfficerObj?.name || 'Selected Officer'}</span>
                  <button onClick={() => setSelectedOfficer('')} className="hover:text-rose-600">
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedLoanType !== 'All' && (
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-indigo-200 font-semibold shadow-2xs">
                  <span>Type: {selectedLoanType}</span>
                  <button onClick={() => setSelectedLoanType('All')} className="hover:text-rose-600">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedOfficer('');
                setSelectedLoanType('All');
              }}
              className="text-indigo-700 font-bold hover:underline"
            >
              Reset All Filters
            </button>
          </motion.div>
        )}

        {/* 2. KPI Metrics Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Leads */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Leads</span>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : stats.total_leads}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={`text-xs font-bold flex items-center ${
                    stats.percent_change_leads >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  <ArrowUpRight size={14} className={stats.percent_change_leads < 0 ? 'rotate-90' : ''} />
                  {Math.abs(stats.percent_change_leads)}%
                </span>
                <span className="text-xs text-slate-400">vs previous period</span>
              </div>
            </div>
          </div>

          {/* Active Opportunities */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Opportunities</span>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : stats.active_opportunities}
              </div>
              <p className="text-xs text-slate-400 mt-2">In progress & follow up</p>
            </div>
          </div>

          {/* Converted Leads */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Converted Leads</span>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : stats.converted_leads}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {stats.conversion_rate}% Conversion
                </span>
              </div>
            </div>
          </div>

          {/* Transferred to Branch Operations */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-3xl shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Branch Review Queue</span>
              <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-2xs backdrop-blur-md">
                <Send size={20} />
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <div className="text-3xl font-black text-white tracking-tight">
                {isLoading ? '...' : stats.transferred_applications}
              </div>
              <p className="text-xs text-indigo-200/90 mt-2">
                Files transferred from Origination
              </p>
            </div>
          </div>
        </motion.div>

        {/* 3. Visual Charts Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Trends Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Activity & Production Trends</h3>
                <p className="text-xs text-slate-500">Leads generated vs converted vs files created</p>
              </div>

              {/* Loan Type Filter Buttons */}
              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-xs self-start sm:self-auto">
                {loanTypes.map((lt) => (
                  <button
                    key={lt}
                    onClick={() => setSelectedLoanType(lt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedLoanType === lt
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {lt}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      padding: '12px'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads Generated"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#leadsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="converted"
                    name="Converted"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#convGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    name="Applications Created"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Officers Production Comparison / Loan Types */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Officer Performance</h3>
              <p className="text-xs text-slate-500">Leads vs Converted by Officer</p>
            </div>

            <div className="h-[240px] w-full">
              {officerBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No officers in this branch yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={officerBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(val) => val.split(' ')[0]}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '14px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                    <Bar dataKey="total_leads" name="Leads" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="converted_leads" name="Converted" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick summary footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Active Officers: <strong className="text-slate-800">{officers.length}</strong></span>
              <span>Total Created: <strong className="text-indigo-600">{stats.total_applications}</strong></span>
            </div>
          </div>
        </motion.div>

        {/* 4. Branch Origination Officers Leaderboard & Analysis */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                Branch Origination Officers Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Performance metrics for all Origination team members assigned to {branch.name}
              </p>
            </div>
            {selectedOfficer && (
              <button
                onClick={() => setSelectedOfficer('')}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Clear Officer Filter (Show All)
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Officer</th>
                  <th className="pb-3 px-3 text-center">Total Leads</th>
                  <th className="pb-3 px-3 text-center">Active Opps</th>
                  <th className="pb-3 px-3 text-center">Converted</th>
                  <th className="pb-3 px-3 text-center">Conv. Rate</th>
                  <th className="pb-3 px-3 text-center">Created Apps</th>
                  <th className="pb-3 px-3 text-center">Transferred</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {officerBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No Origination Officers found in this branch.
                    </td>
                  </tr>
                ) : (
                  officerBreakdown.map((officer) => {
                    const isSelected = selectedOfficer === officer.userId;
                    return (
                      <tr
                        key={officer.userId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-indigo-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden">
                              {officer.avatar ? (
                                <img src={officer.avatar} alt={officer.name} className="w-full h-full object-cover" />
                              ) : (
                                officer.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{officer.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {officer.position} • {officer.employeeId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {officer.total_leads}
                        </td>
                        <td className="py-3 px-3 text-center text-amber-600 font-semibold">
                          {officer.active_leads}
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-600 font-bold">
                          {officer.converted_leads}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">
                            {officer.conversion_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-600">
                          {officer.total_applications}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                            {officer.transferred_applications}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedOfficer(isSelected ? '' : officer.userId)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                          >
                            {isSelected ? 'Filtering' : 'Analyze'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* 5. Recent Branch Applications Activity Feed */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                Recent Branch Loan Applications
              </h3>
              <p className="text-xs text-slate-500">
                Latest loan files generated by Origination team members in {branch.name}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Showing latest {recentApplications.length} files
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Application ID</th>
                  <th className="pb-3 px-3">Applicant Name</th>
                  <th className="pb-3 px-3">Loan Type</th>
                  <th className="pb-3 px-3">Handling Officer</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No loan applications created yet for this selection.
                    </td>
                  </tr>
                ) : (
                  recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                        {app.application_id || 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{app.applicant_name}</div>
                        {app.phone_number && (
                          <div className="text-[11px] text-slate-400 font-normal">{app.phone_number}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {app.loan_type}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] overflow-hidden">
                            {app.officer_avatar ? (
                              <img src={app.officer_avatar} alt={app.officer_name} className="w-full h-full object-cover" />
                            ) : (
                              app.officer_name.charAt(0)
                            )}
                          </div>
                          <span>{app.officer_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 font-normal">
                        {new Date(app.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default BranchOperationsDashboard;
