import React, { useState, useEffect } from 'react';
import { Loader2, FileText, CheckCircle, XCircle, Clock, Filter, X, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AdminExpenses = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('All');
  
  // Modal for Approve/Reject with remarks
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [actionType, setActionType] = useState('Approved'); // 'Approved' or 'Rejected'
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (isModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['admin', 'expenses'],
    queryFn: async () => {
      const res = await api.get('/admin/expenses');
      return res.data.expenses || [];
    },
    onError: () => toast.error('Failed to load expenses.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, remarks }) => {
      const res = await api.put(`/admin/expenses/${id}`, { status, remarks });
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Expense ${actionType} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update expense');
    }
  });

  const filteredExpenses = expensesData?.filter(exp => {
    if (filter === 'All') return true;
    return exp.status === filter;
  }) || [];

  const handleActionClick = (expense, type) => {
    setSelectedExpense(expense);
    setActionType(type);
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleConfirmAction = () => {
    updateStatusMutation.mutate({
      id: selectedExpense.id,
      status: actionType,
      remarks
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Approved</span>;
      case 'Rejected': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>;
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/> Pending</span>;
    }
  };

  return (
    <div className="flex-1 p-8 bg-transparent min-h-screen relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Expenses</h1>
            <p className="text-sm text-slate-500 mt-1">Review and approve employee expense claims.</p>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2"
            >
              <option value="All">All Expenses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p>No expenses found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{exp.firstName} {exp.lastName}</div>
                        <div className="text-xs text-slate-500">{exp.employee_ref}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{exp.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{new Date(exp.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {exp.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                        ${parseFloat(exp.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(exp.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {exp.bill_url && (
                          <a href={exp.bill_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-9 px-3 transition-colors cursor-pointer">
                            <Eye className="w-4 h-4 mr-2 text-slate-500" /> View Bill
                          </a>
                        )}
                        {exp.status === 'Pending' && (
                          <>
                            <button onClick={() => handleActionClick(exp, 'Approved')} className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors">Approve</button>
                            <button onClick={() => handleActionClick(exp, 'Rejected')} className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-colors">Reject</button>
                          </>
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

      {/* Approve/Reject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {actionType === 'Approved' ? 'Approve Expense' : 'Reject Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                You are about to {actionType.toLowerCase()} an expense of <strong>${parseFloat(selectedExpense?.amount).toFixed(2)}</strong> from <strong>{selectedExpense?.firstName} {selectedExpense?.lastName}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (Optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={`Reason for ${actionType.toLowerCase()}...`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleConfirmAction}
                disabled={updateStatusMutation.isPending}
                className={`flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg ${actionType === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
              >
                {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm {actionType}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminExpenses;
