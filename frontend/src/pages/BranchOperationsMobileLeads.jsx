import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  XCircle, 
  X, 
  Users, 
  Building2, 
  UserCheck, 
  Layers, 
  ChevronDown 
} from 'lucide-react';
import { format } from 'date-fns';
import { getBranchLeads } from '../services/loanServices';
import { maskPhoneNumber, maskAddress } from '../utils/phoneUtils';
import PageLoader from '../components/PageLoader';

const BranchOperationsMobileLeads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState('all'); // 'all' | 'loans' | 'sales'
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['branchOperationsLeads', selectedEmployee, selectedPipeline, selectedStatusFilter, debouncedSearch],
    queryFn: getBranchLeads,
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });

  const branch = data?.branch || { name: 'Assigned Branch' };
  const allCreators = data?.creators || [];
  const rawLeads = data?.leads || [];
  const counts = data?.counts || {
    All: rawLeads.length,
    New: 0,
    'Follow Up': 0,
    Converted: 0,
    'Not Interested': 0,
    loans: 0,
    sales: 0
  };

  // Filter creators by pipeline (if officer only created loan leads vs sale leads)
  const filteredCreators = useMemo(() => {
    if (selectedPipeline === 'loans') {
      return allCreators.filter(c => c.has_loans !== false);
    }
    if (selectedPipeline === 'sales') {
      return allCreators.filter(c => c.has_sales !== false);
    }
    return allCreators;
  }, [allCreators, selectedPipeline]);

  // Reset employee filter if not in filtered list
  useEffect(() => {
    if (selectedEmployee !== 'all' && filteredCreators.length > 0) {
      const exists = filteredCreators.some(c => c.userId === selectedEmployee);
      if (!exists) {
        setSelectedEmployee('all');
      }
    }
  }, [selectedPipeline, filteredCreators, selectedEmployee]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
            <Clock size={11} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff] shrink-0">
            Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      case 'Not Interested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] shrink-0">
            <XCircle size={11} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0">
            {status || '-'}
          </span>
        );
    }
  };

  const statusFilterTabs = [
    { key: 'All', label: 'All', count: counts.All },
    { key: 'New', label: 'New', count: counts.New },
    { key: 'Follow Up', label: 'Follow Up', count: counts['Follow Up'] },
    { key: 'Converted', label: 'Converted', count: counts.Converted },
    { key: 'Not Interested', label: 'Closed', count: counts['Not Interested'] },
  ];

  const isInitialLoading = isLoading && !data;

  if (isInitialLoading) {
    return <PageLoader message="Loading Branch Leads..." />;
  }

  return (
    <div className="space-y-4 pb-20 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Mobile Top Header */}
      <section className="relative z-20 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider ml-0.5">
                Branch Operations &bull; Directory
              </span>
            </div>
            <h2 className="text-2xl font-medium text-[#1f1f1f] tracking-tight leading-tight" style={{ fontWeight: 500 }}>
              Branch <span className="font-medium italic text-[#7C4DFF]">Leads</span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span 
              style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
              className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-[#f3e8fd] text-[#7C4DFF] border border-[#e9d5ff]"
            >
              {counts.All} Leads
            </span>
          </div>
        </div>
        <p className="text-xs text-[#5f6368] mt-1 flex items-center gap-1 truncate">
          <Building2 size={12} className="text-[#7C4DFF] shrink-0" />
          <span className="truncate">{branch.name}</span>
          <span>&bull;</span>
          <span>Read-only overview</span>
        </p>
      </section>

      {/* Filter Layer */}
      <div className="space-y-2.5">
        {/* Dropdown Filters Row: Pipeline & Officer (Both matching dropdown styling) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Pipeline Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5f6368]">
              <Layers size={14} className="text-[#7C4DFF]" />
            </div>
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#e0e3e7] rounded-xl text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF] transition-all font-medium appearance-none shadow-2xs cursor-pointer"
            >
              <option value="all">All Pipelines ({counts.All})</option>
              <option value="loans">Loans Pipeline ({counts.loans})</option>
              <option value="sales">Sales Pipeline ({counts.sales})</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#80868b]">
              <ChevronDown size={12} />
            </div>
          </div>

          {/* Officer Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5f6368]">
              <UserCheck size={14} className="text-[#7C4DFF]" />
            </div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#e0e3e7] rounded-xl text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF] transition-all font-medium appearance-none shadow-2xs cursor-pointer"
            >
              <option value="all">All Branch Officers ({filteredCreators.length})</option>
              {filteredCreators.map((creator) => (
                <option key={creator.userId} value={creator.userId}>
                  {creator.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#80868b]">
              <ChevronDown size={12} />
            </div>
          </div>
        </div>

        {/* Search Box - Matches Admin Pages Google Pill Search */}
        <div className="relative">
          {isFetching ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C4DFF] animate-spin pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368] pointer-events-none" />
          )}
          <input
            type="search"
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#7C4DFF] focus:ring-2 focus:ring-[#7C4DFF]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm font-medium"
            placeholder="Search name, phone, loan/product, officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
          {statusFilterTabs.map((tab) => {
            const isSelected = selectedStatusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatusFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#f3e8fd] text-[#7C4DFF] border-[#e9d5ff] shadow-2xs font-bold'
                    : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
                  className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10.5px] font-bold leading-none tabular-nums text-center ${
                    isSelected ? 'bg-[#7C4DFF] text-white' : 'bg-[#f1f3f4] text-[#5f6368]'
                  }`}
                >
                  {tab.count ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leads Cards List (Read-Only) */}
      <div className="space-y-3">
        {error ? (
          <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-2xl text-center border border-[#fad2cf] text-xs space-y-1">
            <p className="font-semibold">Failed to load branch leads.</p>
            <p className="text-[11px] text-[#5f6368]">Please check your network or try refreshing.</p>
          </div>
        ) : rawLeads.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto text-[#80868b]">
              <Users size={20} />
            </div>
            <p className="text-sm font-bold text-[#1f1f1f]">No leads found</p>
            <p className="text-xs text-[#5f6368] max-w-xs mx-auto">
              {searchTerm
                ? 'No prospects matched your search query.'
                : 'No leads registered in this category for the branch.'}
            </p>
            {(searchTerm || selectedStatusFilter !== 'All' || selectedPipeline !== 'all' || selectedEmployee !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatusFilter('All');
                  setSelectedPipeline('all');
                  setSelectedEmployee('all');
                }}
                className="mt-2 inline-flex items-center text-xs font-semibold text-[#7C4DFF] hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          rawLeads.map((lead) => {
            const isSale = Boolean(lead.is_sale);
            const displayName = lead.name || 'Unnamed Prospect';
            const initials = displayName
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'L';
            const isOpportunity = !lead.loan_type || lead.loan_type.trim().toLowerCase() === 'opportunity';
            const typeText = !isOpportunity ? lead.loan_type.trim() : '-';

            return (
              <div
                key={lead.id}
                className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-2xs space-y-3"
              >
                {/* Top Row: Name, Pipeline Badge, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                        isSale
                          ? 'bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/20'
                          : 'bg-[#1a73e8]/10 text-[#1a73e8] border-[#1a73e8]/20'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-[#1f1f1f] text-sm truncate">
                          {displayName}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSale
                              ? 'bg-[#e6fffa] text-[#0d9488] border border-[#b2f5ea]'
                              : 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]'
                          }`}
                        >
                          {isSale ? 'Sales' : 'Loans'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10.5px] text-[#5f6368]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Phone size={10} className="text-[#80868b]" />
                          {lead.phone ? maskPhoneNumber(lead.phone) : '-'}
                        </span>
                        <span>&bull;</span>
                        <span className="truncate font-semibold text-[#444746]">{typeText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {getStatusBadge(lead.status)}
                  </div>
                </div>

                {/* Middle Row: Officer & Date */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f1f3f4] text-[11px] text-[#5f6368]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserCheck size={11} className="text-[#7C4DFF] shrink-0" />
                    <span className="truncate font-medium text-[#1f1f1f]">
                      {lead.creator_name || 'Branch Officer'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                    <Calendar size={11} className="text-[#80868b] shrink-0" />
                    <span className="truncate">
                      {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy') : '-'}
                    </span>
                  </div>
                </div>

                {/* Location Line if exists (Masked) */}
                {lead.address && (
                  <div className="flex items-center gap-1.5 text-[10.5px] text-[#5f6368] truncate pt-0.5">
                    <MapPin size={10} className="text-[#80868b] shrink-0" />
                    <span className="truncate">{maskAddress(lead.address)}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BranchOperationsMobileLeads;
