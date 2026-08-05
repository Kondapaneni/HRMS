import React, { useState } from 'react';
import { CreditCard, History, DollarSign, Clock, FileText, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const OriginationMobileDashboard = () => {
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'history'
  
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
    setTimeout(() => {
      toast.success('Loan application submitted!');
      setIsSubmitting(false);
      setFormData({ amount: '', type: 'Personal', term: '12', purpose: '' });
      setActiveTab('history');
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
    <div className="pb-20 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Loan Origination</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage and apply for employee loans</p>
      </div>

      {/* Summary Carousel */}
      <div className="flex overflow-x-auto gap-4 px-4 py-5 hide-scrollbar snap-x">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[200px] snap-center shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">Available Limit</p>
            <DollarSign size={16} className="text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">$50,000</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[160px] snap-center shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">Active Loans</p>
            <CreditCard size={16} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">1</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-[160px] snap-center shrink-0 pr-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">Pending</p>
            <Clock size={16} className="text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">1</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('apply')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'apply' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <FileText size={16} />
            Apply
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'history' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <History size={16} />
            History
          </button>
        </div>
      </div>

      {/* Form Content */}
      {activeTab === 'apply' && (
        <div className="px-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Loan Amount ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="100"
                    step="100"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="block w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50/50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Loan Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50/50"
                >
                  <option value="Personal">Personal Loan</option>
                  <option value="Medical">Medical Emergency</option>
                  <option value="Education">Education</option>
                  <option value="Home">Home Renovation</option>
                  <option value="Advance">Salary Advance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Term (Months)</label>
                <div className="grid grid-cols-5 gap-2">
                  {['6', '12', '24', '36', '48'].map((term) => (
                    <div
                      key={term}
                      onClick={() => setFormData({...formData, term})}
                      className={`cursor-pointer text-center py-2 rounded-xl border text-xs font-medium transition-all ${
                        formData.term === term 
                          ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {term}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Purpose / Reason</label>
                <textarea
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  rows={3}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50/50 resize-none"
                  placeholder="Describe your request..."
                />
              </div>

              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex gap-2">
                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-blue-800 leading-tight">
                  <span className="font-semibold block mb-0.5">ServiceNow Integration</span>
                  Submitting will automatically create a ServiceNow request ticket for HR to process.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? 'Processing...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Content */}
      {activeTab === 'history' && (
        <div className="px-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {recentApplications.map((app) => (
            <div key={app.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between active:bg-slate-50">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-slate-400">{app.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 truncate">{app.type}</h4>
                <div className="text-xs text-slate-500 mt-1">{app.date}</div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-base font-bold text-slate-800">${app.amount.toLocaleString()}</span>
                <ChevronRight size={16} className="text-slate-400 mt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default OriginationMobileDashboard;
