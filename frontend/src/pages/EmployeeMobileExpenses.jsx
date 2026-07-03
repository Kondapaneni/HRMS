import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, FileText, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const EmployeeMobileExpenses = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Travel');
  const [billFile, setBillFile] = useState(null);
  
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

  if (isFormOpen) {
    return (
      <div className="pb-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-white px-4 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
            <button onClick={handleCloseForm} className="p-2 -ml-2 text-slate-600 bg-slate-50 rounded-full active:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800">New Expense</h1>
            <div className="w-10"></div>
          </div>
          
          <div className="p-4 bg-slate-50">
            <form id="mobileExpenseForm" onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="E.g. Taxi to Airport" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
                <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                  <option>Travel</option>
                  <option>Meals</option>
                  <option>Supplies</option>
                  <option>Software</option>
                  <option>Hardware</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Optional details..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bill / Receipt</label>
                <input type="file" ref={fileInputRef} onChange={(e) => setBillFile(e.target.files[0])} className="hidden" accept="image/*,.pdf" />
                <div onClick={() => fileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl text-center active:bg-blue-100 transition-colors">
                  <Upload className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-blue-700">{billFile ? billFile.name : 'Upload Document'}</span>
                </div>
              </div>
            </form>
          </div>
          
          <div className="p-4 bg-white border-t border-slate-200">
            <button type="submit" form="mobileExpenseForm" disabled={submitExpenseMutation.isPending} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold shadow-sm shadow-blue-200 active:bg-blue-700 disabled:opacity-70 transition-all flex justify-center items-center">
              {submitExpenseMutation.isPending ? 'Submitting...' : 'Submit Expense'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="bg-white px-4 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/employee')} className="p-2 -ml-2 text-slate-600 bg-slate-50 rounded-full active:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Expenses</h1>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="p-2 bg-blue-50 text-blue-600 rounded-full active:bg-blue-100 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>)}
          </div>
        ) : expensesData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No expenses yet</p>
          </div>
        ) : (
          expensesData.map((exp) => (
            <div key={exp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    {getStatusIcon(exp.status)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{exp.title}</h3>
                    <p className="text-xs text-slate-500">{new Date(exp.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">${parseFloat(exp.amount).toFixed(2)}</span>
                  <p className="text-xs text-slate-500">{exp.category}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  exp.status === 'Approved' ? 'bg-green-100 text-green-700' :
                  exp.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {exp.status}
                </span>
                {exp.bill_url && (
                  <a href={exp.bill_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 font-medium active:text-blue-800">
                    View Bill
                  </a>
                )}
              </div>
              {exp.remarks && (
                <div className="mt-2 bg-slate-50 p-2 rounded text-xs text-slate-600">
                  <span className="font-semibold">Note:</span> {exp.remarks}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmployeeMobileExpenses;
