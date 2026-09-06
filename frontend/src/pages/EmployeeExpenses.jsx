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

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
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

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Reimbursements &amp; Claims</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2" style={{ fontWeight: 500 }}>
              <span>Expense <span className="font-medium italic text-[#1a73e8]">Reimbursements</span></span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{expensesData.length} Claims</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Submit corporate out-of-pocket receipts, upload vouchers, and track reimbursement status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Expense</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Claimed" 
            value={formatCurrency(totalClaimed)} 
            subtitle="All expense submissions" 
            icon={IndianRupee} 
            colorTheme="blue" 
          />
          <StatCard 
            title="Approved Total" 
            value={formatCurrency(approvedTotal)} 
            subtitle="Reimbursements processed" 
            icon={CheckCircle2} 
            colorTheme="green" 
          />
          <StatCard 
            title="Pending Review" 
            value={formatCurrency(pendingTotal)} 
            subtitle="Awaiting management review" 
            icon={Clock} 
            colorTheme="amber" 
          />
          <StatCard 
            title="Declined Claims" 
            value={`${rejectedCount} Claims`} 
            subtitle="Rejected expense vouchers" 
            icon={XCircle} 
            colorTheme="red" 
          />
        </div>

        {/* Expense History Table Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#e0e3e7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f]">Expense Claims Ledger</h3>
                <p className="text-xs text-[#5f6368]">Review submitted expense receipts, categories, and payment approval statuses</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Title &amp; Notes</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Amount (₹)</th>
                  <th className="p-4">Claim Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4]">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-[#5f6368]">
                      Loading expense claims...
                    </td>
                  </tr>
                ) : expensesData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-[#5f6368]">
                      No expense reimbursement claims submitted yet.
                    </td>
                  </tr>
                ) : (
                  expensesData.map((exp) => {
                    const isApproved = (exp.status || '').toLowerCase() === 'approved';
                    const isRejected = (exp.status || '').toLowerCase() === 'rejected';
                    const isPending = !isApproved && !isRejected;

                    return (
                      <tr key={exp.id} className="hover:bg-[#f8fafd] transition-colors">
                        <td className="p-4 font-semibold text-[#1f1f1f]">
                          {new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-[#1f1f1f]">{exp.title}</p>
                          {exp.description && <p className="text-[#5f6368] text-[11px] mt-0.5 truncate max-w-xs">{exp.description}</p>}
                          {exp.remarks && <p className="text-[#c5221f] text-[10px] mt-0.5">Admin Note: {exp.remarks}</p>}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex rounded-full bg-[#f1f3f4] border border-[#dadce0] px-2.5 py-0.5 text-[11px] font-semibold text-[#5f6368]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[#1f1f1f]">
                          {formatCurrency(parseFloat(exp.amount))}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isApproved ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' :
                            isRejected ? 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]' :
                            'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e8f0fe] border border-[#d2e3fc] hover:bg-[#d2e3fc] text-[#1a73e8] transition-all cursor-pointer shadow-2xs"
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#dadce0] hover:border-[#fad2cf] hover:bg-[#fce8e6] text-[#d93025] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
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
          className="fixed inset-0 z-[10000] flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white shadow-2xl w-full max-w-lg h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
            
            {/* 4-Color Gradient Top Line */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-[#1f1f1f]" style={{ fontWeight: 500 }}>
                    Submit <span className="font-medium italic text-[#1a73e8]">Expense Claim</span>
                  </h2>
                  <p className="text-xs text-[#5f6368]">Submit out-of-pocket receipts for reimbursement</p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="p-1.5 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1f1f1f]">Expense Title <span className="text-[#d93025]">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all" 
                    placeholder="e.g. Client Dinner / Flight to Mumbai" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1f1f1f]">Claim Amount (₹) <span className="text-[#d93025]">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#5f6368]">₹</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className="w-full rounded-xl border border-[#dadce0] bg-white pl-8 pr-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1f1f1f]">Expense Category <span className="text-[#d93025]">*</span></label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none cursor-pointer"
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
                  <label className="text-xs font-semibold text-[#1f1f1f]">Description / Business Purpose</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full rounded-xl border border-[#dadce0] bg-white p-3 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none resize-none transition-all" 
                    rows="3" 
                    placeholder="Provide details about the business context and justification..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1f1f1f]">Bill / Receipt Attachment</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setBillFile(e.target.files[0])}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-[#dadce0] hover:border-[#1a73e8] rounded-2xl text-center cursor-pointer bg-[#f8fafd] hover:bg-[#e8f0fe]/30 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[#1a73e8] mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-[#1f1f1f]">
                      {billFile ? billFile.name : 'Click to attach bill or receipt'}
                    </p>
                    <p className="text-[10px] text-[#5f6368] mt-0.5">PDF or Image documents up to 5MB</p>
                  </div>
                </div>

              </form>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleCloseModal} 
                className="px-5 py-2 rounded-full text-xs font-semibold text-[#1f1f1f] bg-white border border-[#dadce0] hover:bg-[#f1f3f4] transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="expenseForm" 
                disabled={submitExpenseMutation.isPending} 
                className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-full text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] transition-all disabled:opacity-50 cursor-pointer shadow-xs min-w-[130px]"
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
