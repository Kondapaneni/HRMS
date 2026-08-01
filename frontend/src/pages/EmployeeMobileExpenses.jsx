import React, { useState, useEffect, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { Plus, Upload, FileText, CheckCircle, XCircle, Clock, ArrowLeft, Receipt } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
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
  const controls = useDragControls();

  const fileInputRef = useRef(null);

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
      toast.success('Expense submitted');
      queryClient.invalidateQueries({ queryKey: ['employee', 'expenses'] });
      handleCloseForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to submit expense');
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (isLoading) return <PageLoader message="Loading Expenses..." />;

  if (isFormOpen) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col h-[100dvh] overflow-hidden">
        <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <button onClick={handleCloseForm} className="p-2 -ml-2 text-slate-600 bg-slate-50 rounded-full active:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">New Expense</h1>
          <div className="w-10"></div>
        </div>

        <div className="p-5 bg-white flex-1 overflow-y-auto overscroll-contain">
          <form id="mobileExpenseForm" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" placeholder="E.g. Taxi to Airport" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹)</label>
              <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none">
                <option>Travel</option>
                <option>Meals</option>
                <option>Supplies</option>
                <option>Software</option>
                <option>Hardware</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" rows="3" placeholder="Optional details..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill / Receipt</label>
              <input type="file" ref={fileInputRef} onChange={(e) => setBillFile(e.target.files[0])} className="hidden" accept="image/*,.pdf" />
              <div onClick={() => fileInputRef.current?.click()} className="w-full p-5 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl text-center active:bg-blue-100 transition-colors">
                <Upload className="w-7 h-7 text-blue-500 mx-auto mb-3" />
                <span className="text-sm font-medium text-blue-700">{billFile ? billFile.name : 'Upload Document'}</span>
              </div>
            </div>
          </form>
        </div>

        <div className="p-5 bg-white border-t border-slate-100 shrink-0 pb-safe">
          <button type="submit" form="mobileExpenseForm" disabled={submitExpenseMutation.isPending} className="w-full py-4 bg-[#000] text-white rounded-xl font-bold active:bg-slate-800 disabled:opacity-70 transition-all flex justify-center items-center shadow-lg shadow-black/20 text-[15px]">
            {submitExpenseMutation.isPending ? 'Submitting...' : 'Submit Expense'}
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="relative pb-6">
      {/* Top Header Section with Animated Motion Graphics */}
      <div className="-mx-4 -mt-4 px-4 pt-8 pb-20 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button onClick={() => navigate('/employee')} className="text-white/80 active:text-white transition-colors p-1 -ml-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest drop-shadow-md">My Finances</p>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm mb-0.5">Expenses</h1>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors shadow-md active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Card overlapping header */}
      <div className="bg-white rounded-[24px] shadow-lg p-5 -mt-12 relative z-20 mx-1 border border-slate-100/50 min-h-[300px]">
        <div className="space-y-4">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl"></div>)}
            </div>
          ) : expensesData.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Receipt className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No expenses submitted yet</p>
            </div>
          ) : (
            expensesData.map((exp) => (
              <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      {getStatusIcon(exp.status)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{exp.title}</h3>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 text-lg">₹{parseFloat(exp.amount).toFixed(2)}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{exp.category}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-50">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md ${exp.status === 'Approved' ? 'bg-[#25d366]/10 text-[#25d366]' :
                      exp.status === 'Rejected' ? 'bg-[#ff2d55]/10 text-[#ff2d55]' :
                        'bg-[#ff9500]/10 text-[#ff9500]'
                    }`}>
                    {exp.status}
                  </span>
                  {exp.bill_url && (
                    <button onClick={() => setSelectedBillUrl(exp.bill_url)} className="text-xs font-bold text-blue-600 hover:text-blue-700 active:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                      <FileText className="w-3.5 h-3.5" />
                      View Bill
                    </button>
                  )}
                </div>
                {exp.remarks && (
                  <div className="mt-3 bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-[11px] text-rose-700 font-medium leading-relaxed">
                    <span className="font-bold uppercase tracking-wider mr-1">Note:</span> {exp.remarks}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bill View Slide-Over Modal */}
      <AnimatePresence>
        {selectedBillUrl && (
          <div className="fixed inset-x-0 top-0 bottom-[100px] z-[100] flex flex-col justify-end overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBillUrl(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl h-[65dvh] flex flex-col"
            >
              <div
                className="shrink-0 pt-3 pb-4 flex flex-col items-center cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => controls.start(e)}
                style={{ touchAction: 'none' }}
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4 pointer-events-none"></div>
                <div className="px-6 w-full flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Expense Bill</h3>
                  <button
                    onClick={() => setSelectedBillUrl(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden bg-slate-50 relative pb-safe">
                {selectedBillUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={selectedBillUrl} className="w-full h-full border-0" title="Bill PDF" />
                ) : (
                  <div className="w-full h-full overflow-y-auto flex flex-col items-center p-4">
                    <img src={selectedBillUrl} alt="Bill" className="w-full h-auto object-contain rounded-xl shadow-sm" />
                  </div>
                )}
                
                {selectedBillUrl.toLowerCase().endsWith('.pdf') && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center pb-safe">
                     <a href={selectedBillUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-bold shadow-lg shadow-slate-800/30">
                       Open PDF in new tab
                     </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeMobileExpenses;
