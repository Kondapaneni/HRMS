import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
    if (selectedStatusFilter === 'All') return rawLeads;
    return rawLeads.filter(lead => {
      if (selectedStatusFilter === 'Active/In Progress') {
        return lead.status === 'Active' || lead.status === 'In Progress';
      }
      return lead.status === selectedStatusFilter;
    });
  }, [rawLeads, selectedStatusFilter]);

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Clock size={10} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]">
            <RefreshCw size={10} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
      case 'Proposal Sent':
      case 'Negotiation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock size={10} /> {status}
          </span>
        );
      case 'Converted':
      case 'Won':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={10} /> Converted
          </span>
        );
      case 'Not Interested':
      case 'Lost':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <XCircle size={10} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
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
      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
                Origination Workspace
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              All Leads Pool
            </h1>
            <p className="text-xs text-[#5f6368]">
              {rawLeads.length} total prospect entries in pipeline
            </p>
          </div>

          <button
            onClick={() => navigate('/employee/sales/origination/leads/add')}
            className="inline-flex items-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Search Box */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] p-2.5 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-[#5f6368] ml-1.5 shrink-0" />
        <input
          type="search"
          placeholder="Search by name, phone, product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent border-none outline-none text-[#1f1f1f] placeholder:text-[#80868b] pr-2"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="p-1 text-[#80868b] hover:text-[#1f1f1f] rounded-full mr-1"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 3. Horizontal Scrollable Status Filter Chips */}
      <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatusFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              selectedStatusFilter === tab.key
                ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold'
                : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
              selectedStatusFilter === tab.key
                ? 'bg-[#1a73e8] text-white'
                : 'bg-[#f1f3f4] text-[#5f6368]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Leads Card List */}
      <div className="space-y-3">
        {error ? (
          <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-2xl text-center border border-[#fad2cf] text-xs">
            Failed to load leads. Please refresh or try again.
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin h-7 w-7 text-[#1a73e8]" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto text-[#80868b]">
              <Users size={20} />
            </div>
            <p className="text-sm font-bold text-[#1f1f1f]">No leads found</p>
            <p className="text-xs text-[#5f6368]">
              {searchTerm ? 'No results matched your search query.' : 'No prospect entries in this filter category.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 inline-flex items-center text-xs font-semibold text-[#1a73e8] hover:underline"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div 
              key={lead.id} 
              onClick={() => navigate('/employee/sales/origination/leads/details', { state: { lead } })}
              className="bg-white rounded-2xl border border-[#e0e3e7] hover:border-[#dadce0] p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[#f8fafd] cursor-pointer space-y-2.5"
            >
              {/* Top Row: Name and Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <h3 className="font-bold text-[#1f1f1f] text-sm truncate">
                    {lead.name || lead.full_name || 'Unnamed Prospect'}
                  </h3>
                  <div className="flex items-center gap-2 text-[10.5px] text-[#5f6368]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#5f6368]">
                      <Phone size={10} className="text-[#80868b]" />
                      {lead.phone ? maskPhoneNumber(lead.phone) : '—'}
                    </span>
                    <span>&bull;</span>
                    <span className="truncate text-[#1a73e8] font-medium">{lead.product_type || 'Savings Account'}</span>
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
          ))
        )}
      </div>
    </div>
  );
};

export default OriginationMobileSaleLeadsList;
