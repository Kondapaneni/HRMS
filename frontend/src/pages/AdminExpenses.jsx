import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import PageLoader from '../components/PageLoader';
import SearchBar from '../components/ui/SearchBar';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  X, 
  Eye, 
  Search, 
  IndianRupee, 
  ChevronLeft, 
  ChevronRight, 
  Receipt, 
  Calendar, 
  ExternalLink, 
  Tag
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { StatCard, StatusBadge, Button, Avatar } from '../components/ui';

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

// Employee expense receipts use the application's /Bills/ proxy path.
// Resolve it on this origin instead of trusting arbitrary URLs stored in a claim.
const getBillReceiptUrl = (billUrl) => {
  if (!billUrl || typeof billUrl !== 'string') return null;
  try {
    const { pathname } = new URL(billUrl, window.location.origin);
    if (!pathname.startsWith('/Bills/') || pathname.length <= '/Bills/'.length) return null;
    return `${window.location.origin}${pathname}`;
  } catch {
    return null;
  }
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
        return <StatusBadge status="Approved" variant="success" />;
      case 'Rejected':
        return <StatusBadge status="Rejected" variant="danger" />;
      default:
        return <StatusBadge status="Pending" variant="warning" />;
    }
  };

  const getCategoryBadge = (category) => {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-xs font-medium bg-[var(--surface-alt)] text-[var(--text-2)]">
        <Tag className="w-3 h-3 text-[var(--icon-muted)]" />
        {category || 'General'}
      </span>
    );
  };

  if (isLoading && !responseData && !debouncedSearch) return <PageLoader message="Loading Expenses..." />;

  return (
    <div className="space-y-4 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Expense Management
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Review and approve employee reimbursement requests, verify supporting bills, and audit disbursements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {totalCount} Claims
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Claims" 
          value={formatCurrency(stats.totalAmount)} 
          subtitle={`${stats.totalCount} total submissions`} 
          icon={IndianRupee} 
        />
        <StatCard 
          title="Pending Approval" 
          value={formatCurrency(stats.pendingAmount)} 
          subtitle={`${stats.pendingCount} awaiting review`} 
          badgeText="Pending"
          badgeType="warning"
          icon={Clock} 
        />
        <StatCard 
          title="Approved Claims" 
          value={formatCurrency(stats.approvedAmount)} 
          subtitle={`${stats.approvedCount} verified & settled`} 
          badgeText="Approved"
          badgeType="success"
          icon={CheckCircle2} 
        />
        <StatCard 
          title="Declined Claims" 
          value={formatCurrency(stats.rejectedAmount)} 
          subtitle={`${stats.rejectedCount} claims rejected`} 
          badgeText="Declined"
          badgeType="danger"
          icon={XCircle} 
        />
      </div>

      {/* Main Expenses Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col">
        {/* Table Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[var(--line)] mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => { setFilter(st); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === st
                    ? 'bg-[var(--ink)] text-white shadow-xs'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
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
              className="w-full sm:w-auto h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Travel">Travel & Fuel</option>
              <option value="Food">Meals & Food</option>
              <option value="Equipment">Office Equipment</option>
              <option value="Medical">Medical Reimbursement</option>
              <option value="Other">Other Expenses</option>
            </select>

            {/* Search */}
            <SearchBar
              placeholder="Search employee, title, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              isFetching={isFetching}
              wrapperClassName="w-full sm:w-72"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Employee</th>
                <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Claim Details</th>
                <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Category</th>
                <th className="px-4 py-3 font-normal text-xs text-right whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 font-normal text-xs text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-normal text-xs text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {isLoading && expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[var(--muted)]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs">Loading expense claims...</p>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[var(--muted)]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Receipt className="w-10 h-10 text-[var(--icon-muted)] mb-2" />
                      <p className="text-sm font-semibold text-[var(--text)]">No expense claims found</p>
                      <p className="text-xs text-[var(--muted)]">Try changing your status filter or search keywords.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${exp.firstName} ${exp.lastName}`} size="sm" />
                        <div>
                          <p className="font-semibold text-[var(--text)] text-xs">{exp.firstName} {exp.lastName}</p>
                          <span className="font-mono text-[11px] text-[var(--muted)]">{exp.employee_ref || 'EMP'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-[var(--text)] text-xs">{exp.title}</p>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[var(--icon-muted)]" />
                          {new Date(exp.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {getCategoryBadge(exp.category)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {formatCurrency(exp.amount)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(exp.status)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {getBillReceiptUrl(exp.bill_url) && (
                          <a
                            href={getBillReceiptUrl(exp.bill_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View uploaded bill"
                            className="inline-flex h-[36px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--brand-deep)] hover:bg-[var(--surface-alt)]"
                          >
                            <Receipt className="h-3.5 w-3.5 shrink-0" />
                            <span>View Bill</span>
                          </a>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openReviewDrawer(exp, exp.status === 'Pending' ? 'Approved' : exp.status)}
                          className="shrink-0 whitespace-nowrap text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 shrink-0" />
                          <span className="whitespace-nowrap">{exp.status === 'Pending' ? 'Review Claim' : 'Details'}</span>
                        </Button>

                        {exp.status === 'Pending' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedExpense(exp);
                                setActionType('Approved');
                                setRemarks('');
                                handleConfirmAction('Approved');
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="text-xs text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)] border-[var(--status-success-text)]/20"
                              title="Quick Approve"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openReviewDrawer(exp, 'Rejected')}
                              disabled={updateStatusMutation.isPending}
                              className="text-xs text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] border-[var(--status-danger-text)]/20"
                              title="Reject Claim"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
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
          <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--muted)]">
            <p>
              Showing <span className="font-semibold text-[var(--text)]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[var(--text)]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[var(--text)]">{totalCount}</span> claims
            </p>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 text-xs font-medium text-[var(--text)] bg-[var(--surface-alt)] rounded-[8px]">
                {page} / {totalPages}
              </span>
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Slideover Review Drawer */}
      {isDrawerOpen && selectedExpense && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) closeReviewDrawer(); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs font-sans antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  EXPENSE REIMBURSEMENT
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Claim Details
                </h2>
              </div>
              <button 
                onClick={closeReviewDrawer} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
              {/* Employee Overview Card */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--surface-alt)] p-4 rounded-[16px] border border-[var(--line)]">
                <div>
                  <p className="text-[var(--muted)] font-medium">Employee Name</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">{selectedExpense.firstName} {selectedExpense.lastName}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)] font-medium">Employee Code</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">{selectedExpense.employee_ref || 'N/A'}</p>
                </div>
              </div>

              {/* Status & Amount Banner */}
              <div className="bg-[var(--brand-tint)] border border-[var(--brand)]/20 rounded-[16px] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider block">Claimed Amount</span>
                    <span className="text-2xl font-bold text-[var(--text)]">{formatCurrency(selectedExpense.amount)}</span>
                  </div>
                  <div>
                    {getStatusBadge(selectedExpense.status)}
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--brand)]/15">
                  <p className="text-[10px] font-semibold text-[var(--brand-deep)] uppercase tracking-wider">Amount in Words</p>
                  <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{numberToWords(selectedExpense.amount)}</p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 bg-[var(--surface-alt)] p-4 rounded-[16px] border border-[var(--line)]">
                <div className="flex justify-between items-center py-1 border-b border-[var(--line)]">
                  <span className="text-[var(--muted)]">Expense Category</span>
                  <span className="font-semibold text-[var(--text)]">{selectedExpense.category}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--line)]">
                  <span className="text-[var(--muted)]">Submission Date</span>
                  <span className="font-semibold text-[var(--text)]">{new Date(selectedExpense.created_at).toLocaleDateString()}</span>
                </div>
                {selectedExpense.merchant && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--line)]">
                    <span className="text-[var(--muted)]">Merchant / Vendor</span>
                    <span className="font-semibold text-[var(--text)]">{selectedExpense.merchant}</span>
                  </div>
                )}
                <div className="py-1">
                  <span className="text-[var(--muted)] block mb-1">Expense Description</span>
                  <p className="text-[var(--text)] font-medium bg-[var(--surface)] p-3 rounded-[12px] border border-[var(--line)] leading-relaxed">
                    {selectedExpense.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Attached bill saved by the employee as bill_url */}
              {getBillReceiptUrl(selectedExpense.bill_url) && (
                <div className="border border-[var(--line)] rounded-[16px] p-4 bg-[var(--surface-alt)] space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[var(--text)]">Attached Bill / Receipt</span>
                    <a
                      href={getBillReceiptUrl(selectedExpense.bill_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[var(--brand-deep)] hover:underline font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" /> View Bill
                    </a>
                  </div>
                </div>
              )}

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--text)]">
                  Admin Review Remarks
                </label>
                <textarea
                  value={remarks || (selectedExpense.status !== 'Pending' ? selectedExpense.remarks || '' : '')}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={selectedExpense.status !== 'Pending' ? 'No remarks recorded.' : 'Enter approval note, audit comments, or reason for decline...'}
                  rows="3"
                  readOnly={selectedExpense.status !== 'Pending'}
                  className={`w-full px-3.5 py-2.5 rounded-[12px] text-xs outline-none transition-all resize-none ${
                    selectedExpense.status !== 'Pending'
                      ? 'bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)] cursor-default'
                      : 'bg-[var(--surface-alt)] border border-[var(--line)] focus:ring-2 focus:ring-[var(--brand)] text-[var(--text)]'
                  }`}
                />
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              {selectedExpense.status === 'Pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConfirmAction('Rejected')}
                    disabled={updateStatusMutation.isPending}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#D64550] hover:bg-[#b83540] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Decline Claim</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmAction('Approved')}
                    disabled={updateStatusMutation.isPending}
                    className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Claim</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeReviewDrawer}
                  className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
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