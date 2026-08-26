import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Plus, 
  XCircle, 
  RefreshCw,
  ChevronRight,
  SlidersHorizontal,
  X,
  UserPlus,
  Users,
  ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { getSalesLeads } from '../services/salesServices';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileSaleLeadsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['sales', 'leads', 'list', debouncedSearch],
    queryFn: () => getSalesLeads({ search: debouncedSearch }),
  });

  const rawLeads = response?.leads || response?.data || [];

  const filteredLeads = useMemo(() => {
    let result = rawLeads;

    if (selectedStatusFilter !== 'All') {
      result = result.filter(lead => {
        if (selectedStatusFilter === 'Active/In Progress') {
          return lead.status === 'Active' || lead.status === 'In Progress';
        }
        return lead.status === selectedStatusFilter;
      });
    }

    if (debouncedSearch && debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase();
      result = result.filter(lead => {
        return (
          lead.name?.toLowerCase().includes(term) ||
          lead.phone?.toLowerCase().includes(term) ||
          lead.address?.toLowerCase().includes(term) ||
          lead.product_type?.toLowerCase().includes(term) ||
          lead.loan_type?.toLowerCase().includes(term)
        );
      });
    }

    return result;
  }, [rawLeads, selectedStatusFilter, debouncedSearch]);

  const statusCounts = useMemo(() => {
    const counts = { All: rawLeads.length, New: 0, 'Follow Up': 0, Converted: 0, 'Not Interested': 0 };
    rawLeads.forEach(l => {
      if (counts[l.status] !== undefined) {
        counts[l.status] += 1;
      }
    });
    return counts;
  }, [rawLeads]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0 shadow-2xs">
            <Clock size={14} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff] shrink-0 shadow-2xs">
            <RefreshCw size={14} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0 shadow-2xs">
            <Clock size={14} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0 shadow-2xs">
            <CheckCircle2 size={14} /> Converted
          </span>
        );
      case 'Not Interested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] shrink-0 shadow-2xs">
            <XCircle size={14} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0 shadow-2xs">
            {status || '—'}
          </span>
        );
    }
  };

  const filterTabs = [
    { key: 'All', label: 'All', count: statusCounts.All },
    { key: 'New', label: 'New', count: statusCounts.New },
    { key: 'Follow Up', label: 'Follow Up', count: statusCounts['Follow Up'] },
    { key: 'Converted', label: 'Converted', count: statusCounts.Converted },
    { key: 'Not Interested', label: 'Closed', count: statusCounts['Not Interested'] },
  ];

  return (
    <div className="space-y-4 pb-14">
      {/* 1. Hero Section with Animated Motion Graphics (Sales Emerald/Teal Theme) */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs with Sales Origination Emerald, Teal & Cyan Theme */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              Origination &bull; Sales Pipeline
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              All Leads
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              {rawLeads.length} Total Prospect Entries
            </p>
          </div>

          <button
            onClick={() => navigate('/employee/sales/origination/leads/add')}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-full text-xs font-bold backdrop-blur-md border border-white/30 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Add Lead</span>
          </button>
        </div>
      </section>

      {/* 2. Elevated Content Layer */}
      <div className="relative z-20 -mt-8 mx-0.5 space-y-3.5">
        {/* Search Box */}
        <div className="bg-white rounded-full border border-[#e0e3e7] px-4 py-2.5 shadow-xs flex items-center gap-2.5">
          <Search className="w-4.5 h-4.5 text-[#5f6368] shrink-0" />
          <input
            type="text"
            placeholder="Search by name, phone, address, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-[13.5px] font-medium bg-transparent border-none outline-none text-[#1f1f1f] placeholder:text-[#80868b] placeholder:text-[13px] pr-1"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] shrink-0 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedStatusFilter === tab.key
                  ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6] shadow-2xs font-bold'
                  : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
                selectedStatusFilter === tab.key
                  ? 'bg-[#137333] text-white'
                  : 'bg-[#f1f3f4] text-[#5f6368]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Leads Card List */}
        <div className="space-y-3">
          {error ? (
            <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-2xl text-center border border-[#fad2cf] text-xs">
              Failed to load sales leads. Please refresh or try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[#137333]" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto text-[#80868b]">
                <Users size={20} />
              </div>
              <p className="text-sm font-bold text-[#1f1f1f]">No sales leads found</p>
              <p className="text-xs text-[#5f6368]">
                {searchTerm ? 'No results matched your search query.' : 'No prospect entries in this filter category.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[#137333] hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const displayName = lead.name || lead.full_name || 'Unnamed Prospect';
              const initials = displayName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'L';

              return (
                <div 
                  key={lead.id} 
                  onClick={() => navigate('/employee/sales/origination/leads/details', { state: { lead } })}
                  className="bg-white rounded-2xl border border-[#e0e3e7] hover:border-[#dadce0] p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[#f8fafd] cursor-pointer space-y-2.5 group"
                >
                  {/* Top Row: Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-xs flex items-center justify-center shrink-0 border border-[#ceead6]">
                        {initials}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-bold text-[#1f1f1f] text-sm truncate group-hover:text-[#137333] transition-colors">
                          {displayName}
                        </h3>
                        <div className="flex items-center gap-2 text-[10.5px] text-[#5f6368]">
                          <span className="inline-flex items-center gap-1 font-medium text-[#5f6368]">
                            <Phone size={10} className="text-[#80868b]" />
                            {lead.phone ? maskPhoneNumber(lead.phone) : '—'}
                          </span>
                          {lead.product_type && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate text-[#137333] font-semibold">{lead.product_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {getStatusBadge(lead.status)}
                    </div>
                  </div>

                  {/* Middle Row: Address & Date Details */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f1f3f4] text-[11px] text-[#5f6368]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={11} className="text-[#80868b] shrink-0" />
                      <span className="truncate">{lead.address || 'Location Not Specified'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                      <Calendar size={11} className="text-[#80868b] shrink-0" />
                      <span>{lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy') : 'Recent'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileSaleLeadsList;
