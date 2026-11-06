import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Plus, 
  Loader2, 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Trash2,
  IndianRupee,
  Receipt,
  X,
  Sparkles
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import EmployeeMobileExpenses from './EmployeeMobileExpenses';
import Button from '../components/ui/Button';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[var(--brand-tint)]',
      iconColor: 'text-[var(--brand-deep)]',
    },
    green: {
      iconBg: 'bg-[#E6F6EC]',
      iconColor: 'text-[#1F9D55]',
    },
    purple: {
      iconBg: 'bg-[var(--accent-pink-tint)]',
      iconColor: 'text-[var(--accent-pink-deep)]',
    },
    amber: {
      iconBg: 'bg-[#FDF3DC]',
      iconColor: 'text-[#B7791F]',
    },
    red: {
      iconBg: 'bg-[#FDE8EA]',
      iconColor: 'text-[#D64550]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 transition-all duration-200 hover:border-[var(--brand)]/40">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[var(--text)] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[var(--muted)] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-[14px] ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const EmployeeExpenses = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Travel');
  const [billFile, setBillFile] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const { data: expensesData = [], isLoading } = useQuery({
    queryKey: ['employee', 'expenses'],
    queryFn: async () => {
      const res = await api.get('/employee/expenses');
      return res.data.expenses || [];
    },
    onError: () => toast.error('Failed to load expenses.'),
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
          
        if (uploadError) throw new Error('Failed to upload bill');
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
      toast.success('Expense claim submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', 'expenses'] });
      handleCloseModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to submit expense');
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/employee/expenses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Expense claim deleted');
      queryClient.invalidateQueries({ queryKey: ['employee', 'expenses'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete expense');
    }
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setAmount('');
    setCategory('Travel');
    setBillFile(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !amount || !category) {
      toast.error('Please fill all required fields');
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

  const totalClaimed = expensesData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const approvedTotal = expensesData
    .filter(e => (e.status || '').toLowerCase() === 'approved')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const pendingTotal = expensesData
    .filter(e => (e.status || '').toLowerCase() === 'pending')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const rejectedCount = expensesData.filter(e => (e.status || '').toLowerCase() === 'rejected').length;

  if (isLoading) return <PageLoader message="Loading Expense Claims..." />;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobileExpenses />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Reimbursements &amp; claims</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>Expense reimbursements</span>
              <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                {expensesData.length} Claims
              </span>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Submit corporate out-of-pocket receipts, upload vouchers, and track reimbursement status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Submit new expense</span>
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total claimed" 
            value={formatCurrency(totalClaimed)} 
            subtitle="All expense submissions" 
            icon={IndianRupee} 
          />
          <StatCard 
            title="Approved total" 
            value={formatCurrency(approvedTotal)} 
            subtitle="Reimbursements processed" 
            icon={CheckCircle2} 
          />
          <StatCard 
            title="Pending review" 
            value={formatCurrency(pendingTotal)} 
            subtitle="Awaiting management review" 
            icon={Clock} 
          />
          <StatCard 
            title="Declined claims" 
            value={`${rejectedCount} Claims`} 
            subtitle="Rejected expense vouchers" 
            icon={XCircle} 
          />
        </div>

        {/* Expense History Table Card */}
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden">
          <div className="p-6 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">Expense Claims Ledger</h3>
                <p className="text-xs text-[var(--muted)]">Review submitted expense receipts, categories, and payment approval statuses</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[var(--muted)] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Title &amp; Notes</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Amount (₹)</th>
                  <th className="p-4">Claim Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-[var(--muted)]">
                      Loading expense claims...
                    </td>
                  </tr>
                ) : expensesData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-[var(--muted)]">
                      No expense reimbursement claims submitted yet.
                    </td>
                  </tr>
                ) : (
                  expensesData.map((exp) => {
                    const isApproved = (exp.status || '').toLowerCase() === 'approved';
                    const isRejected = (exp.status || '').toLowerCase() === 'rejected';
                    const isPending = !isApproved && !isRejected;

                    return (
                      <tr key={exp.id} className="hover:bg-[var(--brand-tint)]/15 transition-colors">
                        <td className="p-4 font-semibold text-[var(--text)]">
                          {new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-[var(--text)]">{exp.title}</p>
                          {exp.description && <p className="text-[var(--muted)] text-[11px] mt-0.5 truncate max-w-xs">{exp.description}</p>}
                          {exp.remarks && <p className="text-[#D64550] text-[10px] mt-0.5">Admin Note: {exp.remarks}</p>}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex rounded-full bg-[var(--surface-alt)] border border-[var(--line)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-2)]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[var(--text)]">
                          {formatCurrency(parseFloat(exp.amount))}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            isApproved ? 'bg-[#E6F6EC] text-[#1F9D55]' :
                            isRejected ? 'bg-[#FDE8EA] text-[#D64550]' :
                            'bg-[#FDF3DC] text-[#B7791F]'
                          }`}>
                            {isApproved && <CheckCircle2 className="w-3 h-3" />}
                            {isRejected && <XCircle className="w-3 h-3" />}
                            {isPending && <Clock className="w-3 h-3" />}
                            {exp.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {exp.bill_url && (
                              <a 
                                href={exp.bill_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--brand-tint)] hover:bg-[var(--brand-tint)]/80 text-[var(--brand-deep)] transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </a>
                            )}
                            {isPending && (
                              <button 
                                type="button"
                                onClick={() => deleteExpenseMutation.mutate(exp.id)} 
                                disabled={deleteExpenseMutation.isPending}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] border border-[var(--line)] hover:bg-[#FDE8EA] text-[#D64550] transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Submit Expense Slideover Drawer (Using createPortal to body to blur full screen including sidebar) */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[var(--surface)] text-[var(--text)] shadow-2xl w-full max-w-lg h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 antialiased">
            
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-alt)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text)]">
                    Submit Expense Claim
                  </h2>
                  <p className="text-xs text-[var(--muted)]">Submit out-of-pocket receipts for reimbursement</p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="p-1.5 rounded-full hover:bg-[var(--line)] text-[var(--muted)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text)]">Expense Title <span className="text-[#D64550]">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] px-3.5 py-2.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] focus:outline-none transition-all" 
                    placeholder="e.g. Client Dinner / Flight to Mumbai" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text)]">Claim Amount (₹) <span className="text-[#D64550]">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)]">₹</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] pl-8 pr-3.5 py-2.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] focus:outline-none transition-all" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text)]">Expense Category <span className="text-[#D64550]">*</span></label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] px-3.5 py-2.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] focus:outline-none cursor-pointer"
                  >
                    <option>Travel</option>
                    <option>Meals &amp; Entertainment</option>
                    <option>Office Supplies</option>
                    <option>Software Subscription</option>
                    <option>Hardware &amp; Devices</option>
                    <option>Hotel &amp; Lodging</option>
                    <option>Fuel / Transport</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text)]">Description / Business Purpose</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] p-3 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] focus:outline-none resize-none transition-all" 
                    rows="3" 
                    placeholder="Provide details about the business context and justification..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text)]">Bill / Receipt Attachment</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setBillFile(e.target.files[0])}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-[var(--line)] hover:border-[var(--brand)] rounded-[18px] text-center cursor-pointer bg-[var(--surface-alt)] hover:bg-[var(--brand-tint)]/20 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[var(--brand-deep)] mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {billFile ? billFile.name : 'Click to attach bill or receipt'}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">PDF or Image documents up to 5MB</p>
                  </div>
                </div>

              </form>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleCloseModal} 
                className="px-5 py-2 rounded-full text-xs font-semibold text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--line)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="expenseForm" 
                disabled={submitExpenseMutation.isPending} 
                className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-full text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] transition-all disabled:opacity-50 cursor-pointer min-w-[130px]"
              >
                {submitExpenseMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitExpenseMutation.isPending ? 'Submitting...' : 'Submit Claim'}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </>
  );
};

export default EmployeeExpenses;
