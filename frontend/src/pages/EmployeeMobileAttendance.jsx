import React, { useState } from 'react';
import { Search, Calendar as CalendarIcon, Clock, Shield, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const EmployeeMobileAttendance = () => {
  const { data: history = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['employee', 'attendance'],
    queryFn: async () => {
      const res = await api.get('/employee/attendance');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError ? 'Failed to load attendance history.' : null;
  const presentCount = history.filter(r => r.status?.toLowerCase().startsWith('present')).length;
  const leaveCount = history.filter(r => r.status?.toLowerCase().includes('leave')).length;

  const [searchDate, setSearchDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredHistory = history.filter(record => {
    const rDate = new Date(record.date).toLocaleDateString('en-GB');
    const matchesSearch = rDate.includes(searchDate) || record.date.includes(searchDate);
    
    if (statusFilter === 'all') return matchesSearch;
    const rStatus = record.status?.toLowerCase() || '';
    if (statusFilter === 'present' && rStatus.startsWith('present')) return matchesSearch;
    if (statusFilter === 'leave' && rStatus.includes('leave')) return matchesSearch;
    if (statusFilter === 'missing' && rStatus === 'missing') return matchesSearch;
    if (statusFilter === 'holiday' && (rStatus === 'holiday' || rStatus === 'week-off')) return matchesSearch;
    
    return false;
  });

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.startsWith('present')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('leave')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s === 'missing') return 'bg-red-100 text-red-700 border-red-200';
    if (s === 'holiday' || s === 'week-off') return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
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

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Attendance</p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">History & Stats</h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Track your daily punches and leaves</p>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-4 relative z-20 -mt-12 mx-1">
        <div className="bg-white rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-100 shadow-lg">
          <span className="text-3xl font-black text-emerald-500 tracking-tight">{presentCount}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Present</span>
        </div>
        <div className="bg-white rounded-[1.5rem] p-5 flex flex-col items-center justify-center border border-slate-100 shadow-lg">
          <span className="text-3xl font-black text-blue-500 tracking-tight">{leaveCount}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Leaves</span>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            placeholder="Search date..."
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#84dcc6] font-medium"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#84dcc6] font-medium appearance-none"
        >
          <option value="all">All Statuses</option>
          <option value="present">Present</option>
          <option value="leave">On Leave</option>
          <option value="missing">Missing Punch</option>
          <option value="holiday">Holiday / Week Off</option>
        </select>
      </section>

      {/* History List */}
      <section className="space-y-4">
        <h3 className="text-lg font-black text-slate-900 tracking-tight px-2">Recent Records</h3>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff686b] mx-auto"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-2xl text-red-600 text-sm font-medium text-center border border-red-100">
            {error}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white p-8 rounded-[2rem] text-center border border-slate-200 shadow-sm">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No attendance records found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((record, index) => {
              const recordDate = new Date(record.date);
              const inTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
              const outTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
              
              return (
                <div key={record.id || index} className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {recordDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {recordDate.toLocaleDateString('en-GB', { weekday: 'long' })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(record.status)}`}>
                      {record.status || 'Not Marked'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In</p>
                        <p className="text-sm font-black text-slate-800">{inTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Out</p>
                        <p className="text-sm font-black text-slate-800">{outTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default EmployeeMobileAttendance;
