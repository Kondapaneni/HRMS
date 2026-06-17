import React from 'react';
import { Calendar as CalendarIcon, Plus, Clock, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const EmployeeMobileLeaves = ({ setIsModalOpen }) => {
  const { data: leavesData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['employee', 'leaves'],
    queryFn: async () => {
      const res = await api.get('/employee/leaves');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const balance = leavesData?.balance || { paidTotal: 12, paidUsed: 0, unpaidUsed: 0, totalApproved: 0 };
  const history = leavesData?.history || [];
  const paidRemaining = Math.max(0, balance.paidTotal - balance.paidUsed);
  const error = queryError ? 'Failed to load leaves data.' : null;

  const getStatusConfig = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> };
    if (s === 'rejected') return { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-4 h-4 text-red-500" /> };
    return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-4 h-4 text-amber-500" /> };
  };

  return (
    <div className="space-y-6 pb-2">
      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
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
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 mb-2">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Leaves</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Balance & History</h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Manage your time off</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md shadow-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full rounded-xl bg-white text-slate-900 font-bold text-sm py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            Apply for Leave
          </button>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-4 relative z-20 -mt-10 mx-1">
        <div className="bg-white rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-100 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
          <span className="text-3xl font-black text-slate-800 tracking-tight">{paidRemaining}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Paid Left</span>
        </div>
        <div className="bg-white rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-100 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-16 h-16 bg-rose-50 rounded-full -ml-8 -mt-8 opacity-50"></div>
          <span className="text-3xl font-black text-slate-800 tracking-tight">{balance?.unpaidUsed || 0}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unpaid Used</span>
        </div>
      </section>

      {/* Leave History */}
      <section className="space-y-4">
        <h3 className="text-lg font-black text-slate-900 tracking-tight px-2">Recent Applications</h3>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff686b] mx-auto"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-2xl text-red-600 text-sm font-medium text-center border border-red-100">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white p-8 rounded-[2rem] text-center border border-slate-200 shadow-sm">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No leave records found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 10).map((record, index) => {
              const start = new Date(record.startDate);
              const end = new Date(record.endDate);
              const conf = getStatusConfig(record.status);
              
              return (
                <div key={record.id || index} className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${conf.color.split(' ')[0]}`}>
                        {conf.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          {record.leaveType} LEAVE
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                          {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {record.startDate !== record.endDate && ` - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${conf.color}`}>
                      {record.status || 'Pending'}
                    </span>
                  </div>
                  
                  {record.reason && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-600 line-clamp-2">"{record.reason}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default EmployeeMobileLeaves;
