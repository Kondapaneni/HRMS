import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';
import { motion } from 'framer-motion';
import { Search, Phone, MapPin, Calendar, CheckCircle2, Clock, Loader2, Plus, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { maskPhoneNumber } from '../utils/phoneUtils';
import { useNavigate } from 'react-router-dom';

const OriginationMobileSaleLeadsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['sales', 'leads', 'list', debouncedSearch],
    queryFn: () => getSalesLeads({ search: debouncedSearch }),
  });

  const leads = response?.leads || response?.data || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 whitespace-nowrap"><Clock size={10} /> New</span>;
      case 'Follow Up':
      case 'Contacted':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 whitespace-nowrap"><RefreshCw size={10} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
      case 'Proposal Sent':
      case 'Negotiation':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 whitespace-nowrap"><Clock size={10} /> {status}</span>;
      case 'Converted':
      case 'Won':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap"><CheckCircle2 size={10} /> Converted</span>;
      case 'Not Interested':
      case 'Lost':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 whitespace-nowrap"><XCircle size={10} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <div className="w-full pb-8">
      {/* Animated Hero Header */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs (Emerald / Teal) */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">
              Origination Sales Module
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm font-sans">
              All Leads
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              Manage &amp; track opportunities
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl backdrop-blur-md border border-white/30 text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
            onClick={() => navigate('/employee/sales/origination/leads/add')}
          >
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </section>

      <motion.div
        variants={containerVariants}
        className="relative z-20 -mt-16 px-4 space-y-4"
      >
        {/* Search Bar - Floating */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </motion.div>

        {/* State Handling */}
        {error ? (
          <motion.div variants={itemVariants} className="bg-red-50 text-red-600 p-4 rounded-2xl text-center border border-red-100 shadow-sm mt-4">
            Failed to load leads. Please try again.
          </motion.div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-20 mt-4">
            <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="py-20 text-center text-slate-500 mt-4">
            No leads found.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {leads.map((lead) => (
              <motion.div 
                key={lead.id} 
                variants={itemVariants} 
                onClick={() => navigate('/employee/sales/origination/leads/details', { state: { lead } })}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md transition-shadow active:scale-[0.98] active:bg-slate-50 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{lead.name}</h3>
                    {lead.product_type && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{lead.product_type}</p>
                    )}
                  </div>
                  <div className="shrink-0 ml-3">
                    {getStatusBadge(lead.status)}
                  </div>
                </div>

                <div className="space-y-2.5 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Phone size={12} className="text-emerald-500" />
                    </div>
                    <span>{maskPhoneNumber(lead.phone)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                      <MapPin size={12} className="text-teal-500" />
                    </div>
                    <span className="truncate">{lead.address || '—'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
                      <Calendar size={12} className="text-cyan-500" />
                    </div>
                    <span>{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '—'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OriginationMobileSaleLeadsList;
