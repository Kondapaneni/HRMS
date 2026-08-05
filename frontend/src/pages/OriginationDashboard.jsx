import React, { useState } from 'react';
import { CreditCard, History, DollarSign, Clock, FileText, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import OriginationMobileDashboard from './OriginationMobileDashboard';

const OriginationDashboard = () => {
  const [formData, setFormData] = useState({
    amount: '',
    type: 'Personal',
    term: '12',
    purpose: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for UI demonstration
  const recentApplications = [
    { id: 'LN-2026-001', type: 'Personal Loan', amount: 5000, date: 'Aug 01, 2026', status: 'Approved' },
    { id: 'LN-2026-002', type: 'Medical Emergency', amount: 12500, date: 'Jul 15, 2026', status: 'Pending' },
    { id: 'LN-2026-003', type: 'Home Renovation', amount: 30000, date: 'Jun 22, 2026', status: 'Rejected' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.purpose) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      toast.success('Loan application submitted successfully!');
      setIsSubmitting(false);
      setFormData({ amount: '', type: 'Personal', term: '12', purpose: '' });
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Rejected': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <>
      <div className="md:hidden">
        <OriginationMobileDashboard />
      </div>

      <div className="hidden md:block p-6 max-w-7xl mx-auto space-y-6 pb-24">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Loan Origination</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and apply for employee loans or salary advances.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Available Limit</p>
              <h3 className="text-2xl font-bold text-slate-800">$50,000</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Loans</p>
              <h3 className="text-2xl font-bold text-slate-800">1</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CreditCard size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending Requests</p>
              <h3 className="text-2xl font-bold text-slate-800">1</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          
          {/* Application Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">New Loan Application</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Loan Amount ($)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        min="100"
                        step="100"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="block w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Loan Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow bg-white"
                    >
                      <option value="Personal">Personal Loan</option>
                      <option value="Medical">Medical Emergency</option>
                      <option value="Education">Education</option>
                      <option value="Home">Home Renovation</option>
                      <option value="Advance">Salary Advance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Repayment Term (Months)</label>
                  <div className="grid grid-cols-5 gap-3">
                    {['6', '12', '24', '36', '48'].map((term) => (
                      <div
                        key={term}
                        onClick={() => setFormData({...formData, term})}
                        className={`cursor-pointer text-center py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          formData.term === term 
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {term}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Purpose / Reason</label>
                  <textarea
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    rows={4}
                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow resize-none"
                    placeholder="Briefly describe the reason for this loan request..."
                  />
                </div>
                
                {/* ServiceNow Mock Info Alert */}
                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">
                  <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">ServiceNow Integration</p>
                    <p className="text-blue-700/80">Submitting this form will automatically generate a ServiceNow request ticket for the HR & Finance teams to process.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Recent Applications Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <History size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">Recent Applications</h2>
                </div>
              </div>
              
              <div className="divide-y divide-slate-100">
                {recentApplications.map((app) => (
                  <div key={app.id} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 block mb-1">{app.id}</span>
                        <h4 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{app.type}</h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-lg font-bold text-slate-800">${app.amount.toLocaleString()}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{app.date}</span>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  View All History
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default OriginationDashboard;
