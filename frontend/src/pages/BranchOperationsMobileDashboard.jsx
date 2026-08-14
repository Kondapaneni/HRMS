import React, { useState } from 'react';
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
  ChevronRight,
  Clock,
  Sparkles,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Link } from 'react-router-dom';

const BranchOperationsMobileDashboard = ({
  data,
  isLoading,
  selectedOfficer,
  setSelectedOfficer,
  selectedLoanType,
  setSelectedLoanType,
  timeframe,
  setTimeframe,
  refetch
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'officers' | 'applications'

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
  const officerBreakdown = data?.officerBreakdown || [];
  const recentApplications = data?.recentApplications || [];
  const loanTypeBreakdown = data?.loanTypeBreakdown || [];

  const timeframes = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_6_months', label: '6 Months' }
  ];

  const loanTypes = ['All', 'Personal Loan', 'Business Loan'];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Branch Operations':
        return 'bg-indigo-500/15 text-indigo-700 border-indigo-200/60 font-semibold';
      case 'Created':
        return 'bg-blue-500/15 text-blue-700 border-blue-200/60';
      case 'Approved':
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-200/60';
      case 'Rejected':
        return 'bg-rose-500/15 text-rose-700 border-rose-200/60';
      default:
        return 'bg-slate-500/15 text-slate-700 border-slate-200/60';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 pb-28 pt-3 px-4 text-slate-800 space-y-4">
      {/* 1. Liquid Glass Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-5 text-white shadow-xl shadow-indigo-950/20 border border-white/10"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-indigo-100 border border-white/20">
              <Building2 size={12} className="text-indigo-300" />
              <span>{branch.name}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Branch Operations
            </h1>
            <p className="text-xs text-indigo-200/90 font-medium">
              Loan processing, officer performance & pipelines
            </p>
          </div>
        </div>

        {/* Quick Officer Selector Filter Strip */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Filter Origination Officer:</span>
            {selectedOfficer && (
              <button
                onClick={() => setSelectedOfficer('')}
                className="text-[10px] text-indigo-300 underline font-normal"
              >
                Reset to All
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedOfficer('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                !selectedOfficer
                  ? 'bg-white text-indigo-900 shadow-md font-bold'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Users size={12} />
              All Officers ({officers.length})
            </button>
            {officers.map((officer) => {
              const isSelected = selectedOfficer === officer.userId;
              return (
                <button
                  key={officer.userId}
                  onClick={() => setSelectedOfficer(officer.userId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-white text-indigo-900 shadow-md font-bold'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-900 flex items-center justify-center text-[9px] font-bold overflow-hidden">
                    {officer.avatar ? (
                      <img src={officer.avatar} alt={officer.name} className="w-full h-full object-cover" />
                    ) : (
                      officer.name.charAt(0)
                    )}
                  </div>
                  <span>{officer.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 2. Controls & Filter Pills */}
      <div className="space-y-2">
        {/* Timeframe selector */}
        <div className="flex items-center gap-1.5 bg-white/70 backdrop-blur-md p-1 rounded-2xl border border-slate-200/80 shadow-xs">
          {timeframes.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeframe === tf.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Loan Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {loanTypes.map((lt) => (
            <button
              key={lt}
              onClick={() => setSelectedLoanType(lt)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                selectedLoanType === lt
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white/80 text-slate-600 border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              {lt}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Segmented Navigation Tabs */}
      <div className="flex border-b border-slate-200/80">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 pb-2.5 text-xs font-bold text-center relative transition-colors ${
            activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          Branch KPIs & Trends
          {activeTab === 'overview' && (
            <motion.div
              layoutId="mobileBranchTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('officers')}
          className={`flex-1 pb-2.5 text-xs font-bold text-center relative transition-colors ${
            activeTab === 'officers' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          Officers ({officerBreakdown.length})
          {activeTab === 'officers' && (
            <motion.div
              layoutId="mobileBranchTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex-1 pb-2.5 text-xs font-bold text-center relative transition-colors ${
            activeTab === 'applications' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          Applications ({recentApplications.length})
          {activeTab === 'applications' && (
            <motion.div
              layoutId="mobileBranchTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
            />
          )}
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Leads */}
            <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Leads</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : stats.total_leads}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-[10px] font-bold flex items-center ${
                    stats.percent_change_leads >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  <ArrowUpRight size={12} className={stats.percent_change_leads < 0 ? 'rotate-90' : ''} />
                  {Math.abs(stats.percent_change_leads)}%
                </span>
                <span className="text-[10px] text-slate-400">vs prev</span>
              </div>
            </div>

            {/* Converted Leads */}
            <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Converted</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : stats.converted_leads}
              </div>
              <div className="text-[10px] font-semibold text-emerald-600 mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block">
                {stats.conversion_rate}% Conv. Rate
              </div>
            </div>

            {/* Total Applications Created */}
            <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Created</span>
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : stats.total_applications}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Loan files generated</p>
            </div>

            {/* Ready for Branch Review / Transferred */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">Branch Review</span>
                <div className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <Send size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-white">
                {isLoading ? '...' : stats.transferred_applications}
              </div>
              <p className="text-[10px] text-indigo-200 mt-1">Awaiting operations review</p>
            </div>
          </div>

          {/* Daily Trends Chart */}
          <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daily Leads & File Trend</h3>
                <p className="text-[11px] text-slate-500">Last 7 days branch activity</p>
              </div>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mobileLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mobileConvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#mobileLeadsGrad)" />
                  <Area type="monotone" dataKey="converted" name="Converted" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#mobileConvGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Officer Leaderboard Widget */}
          <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Origination Officers</h3>
                <p className="text-[11px] text-slate-500">Performance in {branch.name}</p>
              </div>
              <button
                onClick={() => setActiveTab('officers')}
                className="text-xs font-bold text-indigo-600 flex items-center gap-0.5"
              >
                View all <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {officerBreakdown.slice(0, 3).map((officer) => (
                <div
                  key={officer.userId}
                  onClick={() => {
                    setSelectedOfficer(officer.userId);
                    setActiveTab('overview');
                  }}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    selectedOfficer === officer.userId
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                      {officer.avatar ? (
                        <img src={officer.avatar} alt={officer.name} className="w-full h-full object-cover" />
                      ) : (
                        officer.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{officer.name}</h4>
                      <p className="text-[10px] text-slate-500">{officer.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {officer.total_leads} <span className="text-[10px] text-slate-400 font-normal">leads</span>
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600">
                      {officer.conversion_rate}% conv.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Officers Tab */}
      {activeTab === 'officers' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="text-xs text-slate-500 font-medium px-1">
            Tap an officer to filter the dashboard:
          </div>

          {officerBreakdown.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-8 text-center text-slate-400 text-xs">
              No Origination Officers registered in this branch.
            </div>
          ) : (
            officerBreakdown.map((officer) => {
              const isSelected = selectedOfficer === officer.userId;
              return (
                <div
                  key={officer.userId}
                  className={`bg-white/90 backdrop-blur-xl p-4 rounded-2xl border transition-all space-y-3 ${
                    isSelected ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden">
                        {officer.avatar ? (
                          <img src={officer.avatar} alt={officer.name} className="w-full h-full object-cover" />
                        ) : (
                          officer.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{officer.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500">{officer.position}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                            {officer.employeeId}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOfficer(isSelected ? '' : officer.userId);
                        setActiveTab('overview');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Analyze'}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50/80 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-medium">Leads</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{officer.total_leads}</div>
                    </div>
                    <div className="bg-slate-50/80 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-medium">Converted</div>
                      <div className="text-sm font-bold text-emerald-600 mt-0.5">{officer.converted_leads}</div>
                    </div>
                    <div className="bg-slate-50/80 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-medium">Conv %</div>
                      <div className="text-sm font-bold text-blue-600 mt-0.5">{officer.conversion_rate}%</div>
                    </div>
                    <div className="bg-slate-50/80 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-medium">Created</div>
                      <div className="text-sm font-bold text-indigo-600 mt-0.5">{officer.total_applications}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {recentApplications.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-8 text-center text-slate-400 text-xs">
              No loan applications found for the selected filters.
            </div>
          ) : (
            recentApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] font-mono font-bold text-indigo-600">
                      {app.application_id || 'Application'}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{app.applicant_name}</h4>
                    {app.phone_number && (
                      <p className="text-[11px] text-slate-500">{app.phone_number}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                      app.status
                    )}`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">{app.loan_type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold overflow-hidden">
                      {app.officer_avatar ? (
                        <img src={app.officer_avatar} alt={app.officer_name} className="w-full h-full object-cover" />
                      ) : (
                        app.officer_name.charAt(0)
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium">{app.officer_name}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BranchOperationsMobileDashboard;
