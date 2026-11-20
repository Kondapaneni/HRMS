import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Plus, 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronLeft, 
  ChevronDown,
  Receipt,
  X,
  Sparkles,
  AlertCircle, 
  ExternalLink, 
  Save,
  Send, 
  Loader2,
  Car,
  Utensils,
  Laptop,
  Package,
  Trash2
} from 'lucide-react';
import { useRemoteData, useRemoteTask, useRefreshControl } from '../state/remote.js';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CATEGORY_OPTIONS = ['Travel', 'Meals', 'Supplies', 'Software', 'Hardware', 'Other'];

const getCategoryIcon = (category) => {
  const c = (category || '').toLowerCase();
  if (c.includes('travel') || c.includes('transport') || c.includes('taxi')) return Car;
  if (c.includes('meal') || c.includes('food') || c.includes('dinner')) return Utensils;
  if (c.includes('soft') || c.includes('hard') || c.includes('tech') || c.includes('laptop')) return Laptop;
  if (c.includes('suppl') || c.includes('office') || c.includes('station')) return Package;
  return Receipt;
};

const EmployeeMobileExpenses = () => {
  const { profile } = useAuth();
  const refreshControl = useRefreshControl();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Travel');
  const [billFile, setBillFile] = useState(null);
  const [selectedBillUrl, setSelectedBillUrl] = useState(null);
  const controls = useDragControls();

  const fileInputRef = useRef(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('toggle-mobile-bottom-nav', { detail: isFormOpen || !!selectedBillUrl }));
    if (selectedBillUrl) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [isFormOpen, selectedBillUrl]);

  const { data: expensesData = [], isLoading } = useRemoteData({
    scope: ['employee', 'expenses'],
    load: async () => {
      const res = await api.get('/employee/expenses');
      return res.data.expenses || [];
    },
  });

  const submitExpenseMutation = useRemoteTask({
    run: async () => {
      let bill_url = null;
      if (billFile) {
        const fileExt = billFile.name.split('.').pop();
        if (!profile?.id) throw new Error('Login required');
        const fileName = `${profile.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('expenses')
          .upload(fileName, billFile);

        if (uploadError) throw new Error('Failed to upload bill receipt');
        bill_url = window.location.origin + "/Bills/" + uploadData.path;
      }

      const res = await api.post('/employee/expenses', {
        title,
        description,
        amount: parseFloat(amount),
        category,
        bill_url
      });
      return res.data;
    },
    onSuccess: () => {
      // Return to the mobile claim history as soon as the API saves the expense.
      handleCloseForm();
      setFilterStatus('all');
      refreshControl.refresh({ scope: ['employee', 'expenses'] });
      refreshControl.refresh({ scope: ['employee', 'dashboard'] });
      toast.success('Expense claim submitted successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to submit expense claim');
    }
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTitle('');
    setDescription('');
    setAmount('');
    setCategory('Travel');
    setBillFile(null);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || !amount || !category) {
      toast.error('Please fill in title, amount, and category');
      return;
    }
    submitExpenseMutation.mutate();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const approvedExpenses = expensesData.filter(e => (e.status || '').toLowerCase() === 'approved');
  const pendingExpenses = expensesData.filter(e => (e.status || '').toLowerCase() === 'pending');
  const rejectedExpenses = expensesData.filter(e => (e.status || '').toLowerCase() === 'rejected');

  const totalClaimed = expensesData.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalPending = pendingExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalRejected = rejectedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const filteredExpenses = expensesData.filter(e => {
    if (filterStatus === 'all') return true;
    return (e.status || '').toLowerCase() === filterStatus;
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') {
      return {
        bg: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success-text)]" />,
        label: 'Approved'
      };
    }
    if (s === 'rejected') {
      return {
        bg: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-text)]/20',
        icon: <XCircle className="w-3.5 h-3.5 text-[var(--status-danger-text)]" />,
        label: 'Rejected'
      };
    }
    return {
      bg: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20',
      icon: <Clock className="w-3.5 h-3.5 text-[var(--status-warning-text)]" />,
      label: 'Pending'
    };
  };

  if (isLoading) return <PageLoader message="Loading Expenses..." />;

  // ==========================================
  // VIEW 1: FULL-PAGE NEW EXPENSE CLAIM FORM
  // ==========================================
  if (isFormOpen) {
    const isSubmitting = submitExpenseMutation.isPending;

    return (
      <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

        {/* Header & Action */}
        <section className="relative z-30 pt-1 pb-1">
          <div className="pt-0.5">
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 pl-[48px]">
              My Expenses
            </p>

            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <button 
                  type="button"
                  onClick={handleCloseForm} 
                  className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-alt)] active:scale-95 text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer"
                  aria-label="Back to Claims"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
                  New <span className="text-[var(--brand-deep)]">Claim</span>
                </h2>
              </div>

              <button 
                type="button"
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Save className="w-3.5 h-3.5 text-white" />}
                <span>{isSubmitting ? 'Saving...' : 'Save Claim'}</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-1 pl-[48px]">
              Submit receipts and expense information for manager review
            </p>
          </div>
        </section>

        {/* Claim Form Cards */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-20 mx-0.5">
          
          {/* Expense Information Card */}
          <div className="bg-[var(--surface)] p-5 rounded-[24px] border border-[var(--line)] shadow-xs space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
              Expense Details
            </h3>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Expense Title *</label>
              <input 
                type="text" 
                required
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Travel Taxi to Client Office"
                className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Amount (₹) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00"
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Category *</label>
                <div className="relative">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 pr-9 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all appearance-none cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Description &amp; Purpose</label>
              <textarea 
                rows="3"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Provide additional details regarding this expenditure..."
                className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] p-3 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Receipt & Bill Document Card */}
          <div className="bg-[var(--surface)] p-5 rounded-[24px] border border-[var(--line)] shadow-xs space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
              Bill / Receipt Attachment
            </h3>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => setBillFile(e.target.files[0])} 
              className="hidden" 
              accept="image/*,.pdf" 
            />

            {billFile ? (
              <div className="p-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text)] truncate">{billFile.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">{(billFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBillFile(null)}
                  className="p-1.5 text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] rounded-full transition-colors cursor-pointer"
                  title="Remove File"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full p-6 border-2 border-dashed border-[var(--line)] hover:border-[var(--brand)] bg-[var(--surface-alt)] rounded-[16px] text-center cursor-pointer active:scale-98 transition-all"
              >
                <Upload className="w-6 h-6 text-[var(--brand-deep)] mx-auto mb-2" />
                <span className="text-xs font-semibold text-[var(--brand-deep)] block">
                  Tap to Upload Bill / Invoice (Image or PDF)
                </span>
                <span className="text-[10px] text-[var(--muted)] block mt-1">Supports PNG, JPG, JPEG, and PDF receipts</span>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
              <span>{isSubmitting ? 'Saving Claim...' : 'Save & Submit Claim'}</span>
            </button>
          </div>

        </form>

      </div>
    );
  }

  // ==========================================
  // VIEW 2: EXPENSES DASHBOARD & CLAIM HISTORY
  // ==========================================
  return (
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            My Expenses
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Expense <span className="text-[var(--brand-deep)]">Claims</span>
            </h2>

            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Claim Expense</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-1">
            Track your corporate expenses and claim payouts
          </p>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-2 gap-3 relative z-20 mx-0.5">
        {/* Approved */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'approved' ? 'all' : 'approved')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'approved' ? 'border-[var(--status-success-text)] ring-2 ring-[var(--status-success-bg)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Approved</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)] truncate">{formatCurrency(totalApproved)}</p>
          <p className="text-[10px] text-[var(--muted)]">{approvedExpenses.length} Approved claims</p>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'pending' ? 'border-[var(--status-warning-text)] ring-2 ring-[var(--status-warning-bg)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Pending</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-warning-text)] truncate">{formatCurrency(totalPending)}</p>
          <p className="text-[10px] text-[var(--muted)]">{pendingExpenses.length} Awaiting review</p>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'rejected' ? 'border-[var(--status-danger-text)] ring-2 ring-[var(--status-danger-bg)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Rejected</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-danger-text)] truncate">{formatCurrency(totalRejected)}</p>
          <p className="text-[10px] text-[var(--muted)]">{rejectedExpenses.length} Rejected claims</p>
        </div>

        {/* Total Claimed */}
        <div 
          onClick={() => setFilterStatus('all')}
          className={`bg-[var(--surface)] rounded-[20px] border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'all' ? 'border-[var(--brand)] ring-2 ring-[var(--brand-tint)]' : 'border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Total Claimed</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--brand-deep)] truncate">{formatCurrency(totalClaimed)}</p>
          <p className="text-[10px] text-[var(--muted)]">{expensesData.length} Total submissions</p>
        </div>
      </section>

      {/* Status Filter Chips */}
      <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mx-0.5">
        {[
          { key: 'all', label: 'All', count: expensesData.length },
          { key: 'pending', label: 'Pending', count: pendingExpenses.length },
          { key: 'approved', label: 'Approved', count: approvedExpenses.length },
          { key: 'rejected', label: 'Rejected', count: rejectedExpenses.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              filterStatus === tab.key
                ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20 shadow-2xs'
                : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--line)] hover:bg-[var(--surface-alt)]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
              filterStatus === tab.key
                ? 'bg-[var(--brand-deep)] text-white'
                : 'bg-[var(--surface-alt)] text-[var(--muted)]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Expense Records Feed */}
      <div className="space-y-3 mx-0.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text)]">Claim History</h3>
          <span className="text-[10px] text-[var(--muted)]">{filteredExpenses.length} Claims Displayed</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 rounded-[20px] text-center border border-[var(--line)] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[var(--muted)] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[var(--text)]">No expense claims found</p>
            <p className="text-[11px] text-[var(--muted)]">
              {filterStatus === 'all' 
                ? 'You have not submitted any reimbursement requests yet.' 
                : `No expense claims under ${filterStatus} status.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((exp) => {
              const badge = getStatusBadge(exp.status);
              const CategoryIcon = getCategoryIcon(exp.category);
              const formattedDate = new Date(exp.created_at || exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div key={exp.id} className="bg-[var(--surface)] p-4 rounded-[20px] border border-[var(--line)] shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-[10px] bg-[var(--brand-tint)] border border-[var(--brand)]/20 flex items-center justify-center text-[var(--brand-deep)] shrink-0 mt-0.5">
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)]">
                            {exp.category}
                          </span>
                          <span className="text-[10px] font-medium text-[var(--muted)]">{formattedDate}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-[var(--text)] mt-1 break-words">{exp.title}</h4>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold text-[var(--text)] block">{formatCurrency(exp.amount)}</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${badge.bg}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-xs text-[var(--text-2)] line-clamp-2 leading-relaxed bg-[var(--surface-alt)] p-2.5 rounded-[12px] border border-[var(--line)]">
                      {exp.description}
                    </p>
                  )}

                  {exp.remarks && (
                    <div className="p-2.5 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-text)]/20 text-[11px] text-[var(--status-danger-text)]">
                      <span className="font-semibold uppercase tracking-wider mr-1">Admin Remark:</span> {exp.remarks}
                    </div>
                  )}

                  {exp.bill_url && (
                    <div className="pt-2 border-t border-[var(--line)] flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedBillUrl(exp.bill_url)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] hover:opacity-90 transition-all cursor-pointer active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Bill Receipt</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-Up Bottom Sheet Drawer */}
      {createPortal(
        <AnimatePresence>
          {selectedBillUrl && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => setSelectedBillUrl(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
                drag="y"
                dragControls={controls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 400) {
                    setSelectedBillUrl(null);
                  }
                }}
                className="bg-[var(--surface)] rounded-t-[28px] shadow-2xl border-t border-[var(--line)] w-full max-w-md mx-auto max-h-[85vh] h-[80vh] flex flex-col overflow-hidden relative z-10 font-sans antialiased text-[var(--text)]"
              >
                {/* Top Drag Indicator Area */}
                <div 
                  className="w-full pt-3 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing select-none shrink-0"
                  onPointerDown={(e) => controls.start(e)}
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-12 h-1.5 bg-[var(--line)] rounded-full pointer-events-none" />
                </div>

                {/* Bottom Sheet Header */}
                <div className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)] shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)]">
                        Attached Receipt Document
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBillUrl(null)}
                    className="w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--muted)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-[var(--surface-alt)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center justify-center">
                  {selectedBillUrl.toLowerCase().endsWith('.pdf') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold text-[var(--text)]">PDF Document Receipt</p>
                        <p className="text-xs text-[var(--muted)]">Tap below to view or download full document</p>
                      </div>
                      <a 
                        href={selectedBillUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open PDF in New Window</span>
                      </a>
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-center">
                      <img 
                        src={selectedBillUrl} 
                        alt="Receipt Document" 
                        className="max-h-full max-w-full object-contain rounded-[14px] shadow-xs border border-[var(--line)]" 
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Close Button */}
                <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)] shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBillUrl(null)}
                    className="w-full py-2.5 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-semibold transition-all cursor-pointer text-center"
                  >
                    Close
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default EmployeeMobileExpenses;
