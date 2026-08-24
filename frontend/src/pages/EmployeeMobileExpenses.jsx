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
  ArrowLeft, 
  Receipt,
  X,
  Sparkles,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Send,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const EmployeeMobileExpenses = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Travel');
  const [billFile, setBillFile] = useState(null);
  const [selectedBillUrl, setSelectedBillUrl] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedBillUrl || isFormOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedBillUrl, isFormOpen]);

  const { data: expensesData = [], isLoading } = useQuery({
    queryKey: ['employee', 'expenses'],
    queryFn: async () => {
      const res = await api.get('/employee/expenses');
      return res.data.expenses || [];
    }
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
      toast.success('Expense claim submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', 'expenses'] });
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
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const approvedExpenses = expensesData.filter(e => (e.status || '').toLowerCase() === 'approved');
  const pendingExpenses = expensesData.filter(e => (e.status || '').toLowerCase() === 'pending');
  const rejectedExpenses = expensesData.filter(e => (e.status || '').toLowerCase() === 'rejected');

  const totalApproved = approvedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalPending = pendingExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalRejected = rejectedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

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

  return (
    <div className="space-y-4 pb-8">

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/employee')}
              className="p-2 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                  Reimbursements Hub
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight mt-0.5">
                My Expenses
              </h1>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Claim New Expense</span>
        </button>
      </div>

      {/* KPI Stats Grid (3 Cards) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Approved */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Approved</span>
            <div className="p-1 rounded-md bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm font-bold text-[#137333] truncate">{formatCurrency(totalApproved)}</p>
          <p className="text-[9px] text-[#5f6368]">{approvedExpenses.length} Claims</p>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Pending</span>
            <div className="p-1 rounded-md bg-[#fef7e0] text-[#b06000]">
              <Clock className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm font-bold text-[#b06000] truncate">{formatCurrency(totalPending)}</p>
          <p className="text-[9px] text-[#5f6368]">{pendingExpenses.length} Claims</p>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Rejected</span>
            <div className="p-1 rounded-md bg-[#fce8e6] text-[#c5221f]">
              <XCircle className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm font-bold text-[#c5221f] truncate">{formatCurrency(totalRejected)}</p>
          <p className="text-[9px] text-[#5f6368]">{rejectedExpenses.length} Claims</p>
        </div>
      </div>

      {/* Expense Records Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Claim History</h3>
          <span className="text-[10px] text-[#5f6368]">{expensesData.length} Total Submitted</span>
        </div>

        {expensesData.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No expense claims found</p>
            <p className="text-[11px] text-[#5f6368]">You have not submitted any reimbursement requests yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {expensesData.map((exp) => {
              const badge = getStatusBadge(exp.status);
              const formattedDate = new Date(exp.created_at || exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div key={exp.id} className="bg-white p-4 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
                          {exp.category}
                        </span>
                        <span className="text-[10px] font-semibold text-[#5f6368]">{formattedDate}</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#1f1f1f]">{exp.title}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-[#1f1f1f]">{formatCurrency(exp.amount)}</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-xs text-[#5f6368] line-clamp-2">
                      {exp.description}
                    </p>
                  )}

                  {exp.remarks && (
                    <div className="p-2.5 rounded-xl bg-[#fce8e6]/50 border border-[#fad2cf] text-[11px] text-[#c5221f]">
                      <span className="font-bold uppercase tracking-wider mr-1">Admin Note:</span> {exp.remarks}
                    </div>
                  )}

                  {exp.bill_url && (
                    <div className="pt-2 border-t border-[#f1f3f4] flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedBillUrl(exp.bill_url)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] transition-all cursor-pointer"
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

      {/* New Expense Modal (Mounted via createPortal) */}
      {isFormOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm(); }}
          className="fixed inset-0 z-[10000] flex flex-col justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-[#e0e3e7] w-full max-w-md mx-auto max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* Top 4-Color Gradient Line */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Modal Header */}
            <div className="p-4 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#1f1f1f]">
                  Submit New Expense Claim
                </h3>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-1.5 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <form id="mobileExpenseForm" onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#5f6368] uppercase">Expense Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none" 
                    placeholder="e.g. Travel Taxi to Client Office" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#5f6368] uppercase">Amount (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none" 
                      placeholder="0.00" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#5f6368] uppercase">Category *</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)} 
                      className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none cursor-pointer"
                    >
                      <option value="Travel">Travel</option>
                      <option value="Meals">Meals</option>
                      <option value="Supplies">Supplies</option>
                      <option value="Software">Software</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#5f6368] uppercase">Description &amp; Purpose</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={2} 
                    className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl p-3 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none resize-none" 
                    placeholder="Provide additional details regarding this expenditure..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#5f6368] uppercase">Bill / Receipt Document</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => setBillFile(e.target.files[0])} 
                    className="hidden" 
                    accept="image/*,.pdf" 
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full p-4 border-2 border-dashed border-[#dadce0] hover:border-[#1a73e8] bg-[#f8fafd] rounded-2xl text-center cursor-pointer active:scale-98 transition-all"
                  >
                    <Upload className="w-5 h-5 text-[#1a73e8] mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-[#1a73e8] block">
                      {billFile ? billFile.name : 'Tap to Upload Bill / Invoice (Image or PDF)'}
                    </span>
                    <span className="text-[10px] text-[#5f6368] block mt-0.5">Supports PNG, JPG, JPEG, and PDF documents</span>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 py-2.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="mobileExpenseForm"
                disabled={submitExpenseMutation.isPending}
                className="flex-1 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitExpenseMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Claim</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Bill Viewer Modal (Mounted via createPortal) */}
      {selectedBillUrl && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedBillUrl(null); }}
          className="fixed inset-0 z-[10000] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-[#e0e3e7] w-full max-w-md mx-auto h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* Top 4-Color Gradient Line */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Header */}
            <div className="p-4 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#1f1f1f]">Attached Receipt Document</h3>
              </div>
              <button
                onClick={() => setSelectedBillUrl(null)}
                className="p-1.5 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-hidden bg-[#f8fafd] p-4 flex flex-col items-center justify-center">
              {selectedBillUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                  <FileText className="w-16 h-16 text-[#1a73e8] opacity-80" />
                  <p className="text-xs text-[#5f6368] text-center font-medium">PDF Document Receipt</p>
                  <a 
                    href={selectedBillUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open PDF in New Window</span>
                  </a>
                </div>
              ) : (
                <div className="w-full h-full overflow-y-auto flex flex-col items-center">
                  <img src={selectedBillUrl} alt="Receipt Document" className="w-full h-auto object-contain rounded-2xl shadow-sm border border-[#e0e3e7]" />
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBillUrl(null)}
                className="w-full py-2.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
              >
                Close Viewer
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default EmployeeMobileExpenses;
