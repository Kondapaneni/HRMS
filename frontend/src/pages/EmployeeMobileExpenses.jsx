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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { supabase } from '../lib/supabase';

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
  const queryClient = useQueryClient();
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

  const { data: expensesData = [], isLoading } = useQuery({
    queryKey: ['employee', 'expenses'],
    queryFn: async () => {
      const res = await api.get('/employee/expenses');
      return res.data.expenses || [];
    },
    staleTime: 30000
  });

  const submitExpenseMutation = useMutation({
    mutationFn: async () => {
      let bill_url = null;
      if (billFile) {
        const fileExt = billFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('expenses')
          .upload(fileName, billFile);

        if (uploadError) throw new Error('Failed to upload bill receipt');
        bill_url = window.location.origin + "/Bills/" + fileName;
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
      toast.success('Expense claim submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['employee', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
      handleCloseForm();
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
        bg: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />,
        label: 'Approved'
      };
    }
    if (s === 'rejected') {
      return {
        bg: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]',
        icon: <XCircle className="w-3.5 h-3.5 text-[#c5221f]" />,
        label: 'Rejected'
      };
    }
    return {
      bg: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]',
      icon: <Clock className="w-3.5 h-3.5 text-[#b06000]" />,
      label: 'Pending'
    };
  };

  if (isLoading) return <PageLoader message="Loading Expenses..." />;

  // ==========================================
  // VIEW 1: FULL-PAGE NEW EXPENSE CLAIM FORM
  // (Styled exactly like EditMobileProfile.jsx)
  // ==========================================
  if (isFormOpen) {
    const isSubmitting = submitExpenseMutation.isPending;

    return (
      <div className="space-y-6 pb-6 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

        {/* Hero Section with Animated Motion Graphics */}
        <section className="-mx-4 -mt-4 px-4 pt-8 pb-14 relative overflow-hidden bg-slate-900">
          {/* Animated Liquid Orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
          />
          
          {/* Subtle Glass Overlay */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between px-2">
            <button 
              type="button"
              onClick={handleCloseForm} 
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              title="Back to Claims"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest drop-shadow-md">Expense Reimbursements</p>
              <h2 className="text-xl font-medium text-white tracking-tight drop-shadow-sm" style={{ fontWeight: 500 }}>
                New <span className="font-medium italic text-[#1a73e8]">Expense Claim</span>
              </h2>
            </div>

            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              className="px-4 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </button>
          </div>
        </section>

        {/* Claim Form Cards */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-20 -mt-10 mx-0.5">
          
          {/* Expense Information Card */}
          <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-md space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Expense Details
            </h3>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Expense Title *</label>
              <input 
                type="text" 
                required
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Travel Taxi to Client Office"
                className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Amount (₹) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Category *</label>
                <div className="relative">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Description &amp; Purpose</label>
              <textarea 
                rows="3"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Provide additional details regarding this expenditure..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Receipt & Bill Document Card */}
          <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-md space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
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
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{billFile.name}</p>
                    <p className="text-[10px] text-slate-500">{(billFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBillFile(null)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove File"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full p-6 border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 rounded-2xl text-center cursor-pointer active:scale-98 transition-all"
              >
                <Upload className="w-6 h-6 text-[#1a73e8] mx-auto mb-2" />
                <span className="text-xs font-bold text-[#1a73e8] block">
                  Tap to Upload Bill / Invoice (Image or PDF)
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Supports PNG, JPG, JPEG, and PDF receipts</span>
              </div>
            )}
          </div>


        </form>

      </div>
    );
  }

  // ==========================================
  // VIEW 2: EXPENSES DASHBOARD & CLAIM HISTORY
  // ==========================================
  return (
    <div className="space-y-6 pb-4 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-14 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2">
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Expenses</p>
              <h2 className="text-3xl font-medium text-white tracking-tight mb-0.5 drop-shadow-sm" style={{ fontWeight: 500 }}>
                Expense <span className="font-medium italic text-[#1a73e8]">Reimbursements</span>
              </h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Track your corporate expenses and claim payouts</p>
            </div>
          </div>

          {/* Premium White Claim New Expense Button */}
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-900 rounded-full py-3.5 text-sm font-bold tracking-wide shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Claim New Expense</span>
          </button>
        </div>
      </section>

      {/* KPI Stats Grid (2x2 Grid) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 -mt-12 mx-0.5">
        {/* Approved */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'approved' ? 'all' : 'approved')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'approved' ? 'border-[#137333] ring-2 ring-[#ceead6]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Approved</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#137333] truncate">{formatCurrency(totalApproved)}</p>
          <p className="text-[10px] text-[#5f6368]">{approvedExpenses.length} Approved claims</p>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'pending' ? 'border-[#b06000] ring-2 ring-[#feefc3]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Pending</span>
            <div className="p-1.5 rounded-lg bg-[#fef7e0] text-[#b06000]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#b06000] truncate">{formatCurrency(totalPending)}</p>
          <p className="text-[10px] text-[#5f6368]">{pendingExpenses.length} Awaiting review</p>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'rejected' ? 'border-[#c5221f] ring-2 ring-[#fad2cf]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Rejected</span>
            <div className="p-1.5 rounded-lg bg-[#fce8e6] text-[#c5221f]">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#c5221f] truncate">{formatCurrency(totalRejected)}</p>
          <p className="text-[10px] text-[#5f6368]">{rejectedExpenses.length} Rejected claims</p>
        </div>

        {/* Total Claimed */}
        <div 
          onClick={() => setFilterStatus('all')}
          className={`bg-white rounded-2xl border p-3.5 shadow-xs space-y-1 cursor-pointer transition-all ${
            filterStatus === 'all' ? 'border-[#1a73e8] ring-2 ring-[#d2e3fc]' : 'border-[#e0e3e7]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Total Claimed</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1a73e8] truncate">{formatCurrency(totalClaimed)}</p>
          <p className="text-[10px] text-[#5f6368]">{expensesData.length} Total submissions</p>
        </div>
      </section>

      {/* Horizontal Scrollable Status Filter Chips */}
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
                ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold'
                : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
              filterStatus === tab.key
                ? 'bg-[#1a73e8] text-white'
                : 'bg-[#f1f3f4] text-[#5f6368]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Expense Records Feed */}
      <div className="space-y-3 mx-0.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Claim History</h3>
          <span className="text-[10px] text-[#5f6368]">{filteredExpenses.length} Claims Displayed</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No expense claims found</p>
            <p className="text-[11px] text-[#5f6368]">
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
                <div key={exp.id} className="bg-white p-4 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#f8fafd] border border-[#dadce0] flex items-center justify-center text-[#1a73e8] shrink-0 mt-0.5">
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
                            {exp.category}
                          </span>
                          <span className="text-[10px] font-semibold text-[#5f6368]">{formattedDate}</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#1f1f1f] mt-1 break-words">{exp.title}</h4>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-[#1f1f1f] block">{formatCurrency(exp.amount)}</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-xs text-[#5f6368] line-clamp-2 leading-relaxed bg-[#f8fafd] p-2.5 rounded-xl border border-[#e0e3e7]">
                      {exp.description}
                    </p>
                  )}

                  {exp.remarks && (
                    <div className="p-2.5 rounded-xl bg-[#fce8e6]/60 border border-[#fad2cf] text-[11px] text-[#c5221f]">
                      <span className="font-bold uppercase tracking-wider mr-1">Admin Remark:</span> {exp.remarks}
                    </div>
                  )}

                  {exp.bill_url && (
                    <div className="pt-2 border-t border-[#f1f3f4] flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedBillUrl(exp.bill_url)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] transition-all cursor-pointer active:scale-95"
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

      {/* Slide-Up Bottom Sheet Drawer (Mounted via createPortal with Framer Motion) */}
      {createPortal(
        <AnimatePresence>
          {selectedBillUrl && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
              {/* Smooth Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => setSelectedBillUrl(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
              />

              {/* Smooth Slide-Up Sheet with Drag Down To Close */}
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
                className="bg-white rounded-t-[2rem] shadow-2xl border-t border-slate-200 w-full max-w-md mx-auto max-h-[85vh] h-[80vh] flex flex-col overflow-hidden relative z-10 font-editorial antialiased"
                style={{ fontFamily: "'Newsreader', Georgia, serif" }}
              >
                {/* Top Drag Indicator Area */}
                <div 
                  className="w-full pt-3 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing select-none shrink-0"
                  onPointerDown={(e) => controls.start(e)}
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full pointer-events-none" />
                </div>

                {/* Bottom Sheet Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Attached Receipt Document
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBillUrl(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center justify-center">
                  {selectedBillUrl.toLowerCase().endsWith('.pdf') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-100/60 text-blue-600 flex items-center justify-center">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-bold text-slate-900">PDF Document Receipt</p>
                        <p className="text-xs text-slate-500">Tap below to view or download full document</p>
                      </div>
                      <a 
                        href={selectedBillUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 px-6 py-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-bold shadow-md active:scale-95 transition-all"
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
                        className="max-h-full max-w-full object-contain rounded-2xl shadow-sm border border-slate-200" 
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Close Button */}
                <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBillUrl(null)}
                    className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all cursor-pointer text-center"
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
