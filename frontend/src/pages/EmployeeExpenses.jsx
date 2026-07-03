import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, Upload, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

import EmployeeMobileExpenses from './EmployeeMobileExpenses';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  const { data: expensesData, isLoading } = useQuery({
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
      toast.success('Expense submitted successfully');
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
      toast.success('Expense deleted');
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Approved</span>;
      case 'Rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/> Pending</span>;
    }
  };

  return (
    <>
      <div className="md:hidden">
        <EmployeeMobileExpenses />
      </div>

      <div className="hidden md:flex min-h-screen bg-slate-50">
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Expenses</h1>
                <p className="text-sm text-slate-500 mt-1">Submit and track your expense claims.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Submit Expense</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {expensesData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                          <p>No expenses found.</p>
                        </td>
                      </tr>
                    ) : (
                      expensesData.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {new Date(exp.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{exp.title}</div>
                            {exp.remarks && <div className="text-xs text-slate-500 mt-1">Admin: {exp.remarks}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {exp.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            ${parseFloat(exp.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(exp.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                            {exp.bill_url && (
                              <a href={exp.bill_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">View Bill</a>
                            )}
                            {exp.status === 'Pending' && (
                              <button onClick={() => deleteExpenseMutation.mutate(exp.id)} className="text-red-600 hover:text-red-900">Delete</button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseModal}></div>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">Submit New Expense</h3>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-500">
                  <span className="sr-only">Close</span>
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="E.g. Client Lunch" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($) *</label>
                    <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="3" placeholder="Additional details..."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bill / Receipt</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => setBillFile(e.target.files[0])}
                      className="hidden"
                      accept="image/*,.pdf"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-4 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 font-medium">
                        {billFile ? billFile.name : 'Click to upload bill'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PDF or Images up to 5MB</p>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end space-x-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" form="expenseForm" disabled={submitExpenseMutation.isPending} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EmployeeExpenses;
