import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import PageLoader from '../components/PageLoader';
import { 
  Loader2, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  X, 
  Eye, 
  Search, 
  IndianRupee, 
  ChevronLeft, 
  ChevronRight, 
  Receipt, 
  User, 
  Building2, 
  Calendar, 
  ExternalLink, 
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Tag,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  if (!num) return 'Zero Rupees Only';
  
  const parsed = Math.round(parseFloat(num));
  if (isNaN(parsed) || parsed <= 0) return 'Zero Rupees Only';
  
  const numStr = parsed.toString();
  if (numStr.length > 9) return `${parsed} Rupees Only`;
  
  let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return 'Zero Rupees Only';
  
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
}

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    red: {
      iconBg: 'bg-[#fce8e6]',
      iconColor: 'text-[#c5221f]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const AdminExpenses = () => {
  const queryClient = useQueryClient();
  
  // Filters & Search
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Drawer & Action state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [actionType, setActionType] = useState('Approved');
  const [remarks, setRemarks] = useState('');

  // 300ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query Server for expenses
  const { data: responseData, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'expenses', page, debouncedSearch, filter, categoryFilter],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const res = await api.get(`/admin/expenses?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${filter}&category=${categoryFilter}`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const expenses = responseData?.expenses || [];
  const stats = responseData?.stats || {
    totalAmount: 0,
    totalCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    approvedAmount: 0,
    approvedCount: 0,
    rejectedAmount: 0,
    rejectedCount: 0,
  };
  const totalCount = responseData?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, remarks }) => {
      const res = await api.put(`/admin/expenses/${id}`, { status, remarks });
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Expense ${actionType.toLowerCase()} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      setIsDrawerOpen(false);
      setSelectedExpense(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update expense');
    }
  });

  const openReviewDrawer = (expense, defaultAction = 'Approved') => {
    setSelectedExpense(expense);
    setActionType(defaultAction);
    setRemarks(expense.remarks || '');
    setIsDrawerOpen(true);
  };

  const closeReviewDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedExpense(null);
  };

  const handleConfirmAction = (status) => {
    if (!selectedExpense) return;
    updateStatusMutation.mutate({
      id: selectedExpense.id,
      status: status || actionType,
      remarks
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
    }
  };

  const getCategoryBadge = (category) => {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f1f3f4] text-[#3c4043]">
        <Tag className="w-3 h-3 text-[#5f6368]" />
        {category || 'General'}
      </span>
    );
  };

  if (isLoading && !responseData && !debouncedSearch) return <PageLoader message="Loading Expenses..." />;

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Finance & Claims</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Expense <span className="font-medium italic text-[#1a73e8]">Management</span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{totalCount} Claims</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Review and approve employee reimbursement requests, verify supporting bills, and audit disbursements.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Claims" 
          value={formatCurrency(stats.totalAmount)} 
          subtitle={`${stats.totalCount} total submissions`} 
          icon={IndianRupee} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Pending Approval" 
          value={formatCurrency(stats.pendingAmount)} 
          subtitle={`${stats.pendingCount} awaiting review`} 
          icon={Clock} 
          colorTheme="amber" 
        />
        <StatCard 
          title="Approved Claims" 
          value={formatCurrency(stats.approvedAmount)} 
          subtitle={`${stats.approvedCount} verified & settled`} 
          icon={CheckCircle2} 
          colorTheme="green" 
        />
        <StatCard 
          title="Declined Claims" 
          value={formatCurrency(stats.rejectedAmount)} 
          subtitle={`${stats.rejectedCount} claims rejected`} 
          icon={XCircle} 
          colorTheme="red" 
        />
      </div>

      {/* Main Expenses Table Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => { setFilter(st); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === st
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                }`}
              >
                {st} {st === 'All' ? `(${stats.totalCount})` : st === 'Pending' ? `(${stats.pendingCount})` : st === 'Approved' ? `(${stats.approvedCount})` : `(${stats.rejectedCount})`}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs text-[#1f1f1f] outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Travel">Travel & Fuel</option>
              <option value="Food">Meals & Food</option>
              <option value="Equipment">Office Equipment</option>
              <option value="Medical">Medical Reimbursement</option>
              <option value="Other">Other Expenses</option>
            </select>

            {/* Google Pill Search */}
            <div className="relative w-full sm:w-72">
              {isFetching ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin pointer-events-none" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
              )}
              <input
                type="search"
                placeholder="Search employee, title, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Claim Details</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e3e7]">
              {isLoading && expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[#5f6368]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs">Loading expense claims...</p>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[#5f6368]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Receipt className="w-10 h-10 text-[#dadce0] mb-2" />
                      <p className="text-sm font-medium text-[#1f1f1f]">No expense claims found</p>
                      <p className="text-xs text-[#5f6368]">Try changing your status filter or search keywords.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#f8fafd] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] font-bold text-xs shrink-0">
                          {((exp.firstName?.[0] || '') + (exp.lastName?.[0] || '')).toUpperCase() || 'EM'}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1f1f1f] text-xs">{exp.firstName} {exp.lastName}</p>
                          <span className="font-mono text-[11px] text-[#5f6368]">{exp.employee_ref || 'EMP'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-[#1f1f1f] text-xs">{exp.title}</p>
                        <p className="text-[11px] text-[#5f6368] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#5f6368]" />
                          {new Date(exp.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {getCategoryBadge(exp.category)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-bold text-[#1f1f1f]">
                        {formatCurrency(exp.amount)}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {getStatusBadge(exp.status)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openReviewDrawer(exp, exp.status === 'Pending' ? 'Approved' : exp.status)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-none hover:shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#5f6368]" />
                          {exp.status === 'Pending' ? 'Review Claim' : 'View Details'}
                        </button>

                        {exp.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedExpense(exp);
                                setActionType('Approved');
                                setRemarks('');
                                handleConfirmAction('Approved');
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] border border-[#ceead6] transition-all cursor-pointer"
                              title="Quick Approve"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => openReviewDrawer(exp, 'Rejected')}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] border border-[#fad2cf] transition-all cursor-pointer"
                              title="Reject Claim"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <p className="text-[#5f6368]">
              Showing <span className="font-semibold text-[#1f1f1f]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[#1f1f1f]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[#1f1f1f]">{totalCount}</span> claims
            </p>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-[#1f1f1f] bg-white border border-[#dadce0] rounded-full">
                Page {page} of {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slideover Review Drawer */}
      {isDrawerOpen && selectedExpense && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) closeReviewDrawer(); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
          >
            {/* Top 4-Color Google Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Expense Claim</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">Expense Claim Details</h2>
              </div>
              <button 
                onClick={closeReviewDrawer} 
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
              {/* Employee Overview Card */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7]">
                <div>
                  <p className="text-[#5f6368] font-medium">Employee Name</p>
                  <p className="font-semibold text-[#1f1f1f] mt-0.5">{selectedExpense.firstName} {selectedExpense.lastName}</p>
                </div>
                <div>
                  <p className="text-[#5f6368] font-medium">Employee Code</p>
                  <p className="font-semibold text-[#1f1f1f] mt-0.5">{selectedExpense.employee_ref || 'N/A'}</p>
                </div>
              </div>

              {/* Status & Amount Banner */}
              <div className="bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#1a73e8] uppercase tracking-wider block">Claimed Amount</span>
                    <span className="text-2xl font-extrabold text-[#1a73e8]">{formatCurrency(selectedExpense.amount)}</span>
                  </div>
                  <div>
                    {getStatusBadge(selectedExpense.status)}
                  </div>
                </div>
                <div className="pt-2 border-t border-[#d2e3fc]/60">
                  <p className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider">Amount in Words</p>
                  <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{numberToWords(selectedExpense.amount)}</p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7]">
                <div className="flex justify-between items-center py-1 border-b border-[#e0e3e7]/60">
                  <span className="text-[#5f6368]">Expense Category</span>
                  <span className="font-semibold text-[#1f1f1f]">{selectedExpense.category}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e0e3e7]/60">
                  <span className="text-[#5f6368]">Expense Date</span>
                  <span className="font-semibold text-[#1f1f1f]">{new Date(selectedExpense.expense_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e0e3e7]/60">
                  <span className="text-[#5f6368]">Submission Date</span>
                  <span className="font-semibold text-[#1f1f1f]">{new Date(selectedExpense.created_at).toLocaleDateString()}</span>
                </div>
                {selectedExpense.merchant && (
                  <div className="flex justify-between items-center py-1 border-b border-[#e0e3e7]/60">
                    <span className="text-[#5f6368]">Merchant / Vendor</span>
                    <span className="font-semibold text-[#1f1f1f]">{selectedExpense.merchant}</span>
                  </div>
                )}
                <div className="py-1">
                  <span className="text-[#5f6368] block mb-1">Expense Description</span>
                  <p className="text-[#1f1f1f] font-medium bg-white p-3 rounded-xl border border-[#dadce0] leading-relaxed">
                    {selectedExpense.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Attached Receipt */}
              {selectedExpense.receipt_url && (
                <div className="border border-[#e0e3e7] rounded-2xl p-4 bg-[#f8fafd] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1f1f1f]">Attached Receipt Document</span>
                    <a
                      href={selectedExpense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#1a73e8] hover:underline font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Receipt
                    </a>
                  </div>
                </div>
              )}

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#1f1f1f]">
                  Admin Review Remarks
                </label>
                <textarea
                  value={remarks || (selectedExpense.status !== 'Pending' ? selectedExpense.remarks || '' : '')}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={selectedExpense.status !== 'Pending' ? 'No remarks recorded.' : 'Enter approval note, audit comments, or reason for decline...'}
                  rows="3"
                  readOnly={selectedExpense.status !== 'Pending'}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none transition-all resize-none ${
                    selectedExpense.status !== 'Pending'
                      ? 'bg-[#f8fafd] text-[#3c4043] border border-[#dadce0] cursor-default focus:border-[#dadce0] focus:ring-0 select-text'
                      : 'bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 text-[#1f1f1f]'
                  }`}
                />
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center gap-3 shrink-0">
              {selectedExpense.status === 'Pending' ? (
                <>
                  <button
                    onClick={() => handleConfirmAction('Approved')}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#137333] hover:bg-[#0d652d] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve Claim
                  </button>
                  <button
                    onClick={() => handleConfirmAction('Rejected')}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#c5221f] hover:bg-[#a51d24] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Decline Claim
                  </button>
                </>
              ) : (
                <button
                  onClick={closeReviewDrawer}
                  className="w-full px-4 py-2.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                >
                  Close Statement
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminExpenses;
