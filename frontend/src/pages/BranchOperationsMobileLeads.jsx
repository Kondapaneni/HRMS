import React, { useState, useMemo, useEffect } from 'react';
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
  XCircle, 
  RefreshCw,
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
  const navigate = useNavigate();
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={13} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
            <RefreshCw size={13} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={13} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
            <CheckCircle2 size={13} /> Converted
          </span>
        );
      case 'Not Interested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] shrink-0">
            <XCircle size={13} /> Not Interested
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] shrink-0">
            {status || '—'}
          </span>
        );
    }
  };

  const filterTabs = [
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
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">
      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Branch Operations &bull; Directory
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Branch Leads
            </h2>
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--branch-tint)] text-[var(--branch-deep)] shrink-0">
              {counts.All} Leads
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1 flex items-center gap-1 truncate">
            <Building2 size={12} className="text-[var(--branch-deep)] shrink-0" />
            <span className="truncate">{branch.name}</span>
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-3.5">
        {/* Dropdown Filters Row: Pipeline & Officer */}
        <div className="grid grid-cols-2 gap-2">
          {/* Pipeline Dropdown */}
          <div className="relative">
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--branch)] transition-all font-medium appearance-none shadow-xs cursor-pointer"
            >
              <option value="all">All Pipelines ({counts.All})</option>
              <option value="loans">Loans ({counts.loans})</option>
              <option value="sales">Sales ({counts.sales})</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[var(--muted)]">
              <ChevronDown size={13} />
            </div>
          </div>

          {/* Officer Dropdown */}
          <div className="relative">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--branch)] transition-all font-medium appearance-none shadow-xs cursor-pointer"
            >
              <option value="all">All Officers ({filteredCreators.length})</option>
              {filteredCreators.map((creator) => (
                <option key={creator.userId} value={creator.userId}>
                  {creator.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[var(--muted)]">
              <ChevronDown size={13} />
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="bg-[var(--surface)] rounded-full border border-[var(--line)] px-3.5 py-2.5 shadow-xs flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[var(--icon-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search by name, phone, address, loan/product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-normal bg-transparent border-none outline-none text-[var(--text)] placeholder:text-[var(--muted)] pr-1"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] shrink-0 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedStatusFilter === tab.key
                  ? 'bg-[var(--ink)] text-white border-transparent shadow-xs'
                  : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--surface-alt)]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none tabular-nums ${
                selectedStatusFilter === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--surface-alt)] text-[var(--muted)]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Leads Card List */}
        <div className="space-y-3">
          {error ? (
            <div className="bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] p-4 rounded-[16px] text-center text-xs">
              Failed to load branch leads. Please refresh or try again.
            </div>
          ) : isInitialLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[var(--branch-deep)]" />
            </div>
          ) : rawLeads.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--icon-muted)]">
                <Users size={20} />
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">No leads found</p>
              <p className="text-xs text-[var(--muted)]">
                {searchTerm ? 'No results matched your search query.' : 'No prospect entries in this category.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[var(--branch-deep)] hover:underline cursor-pointer"
                >
                  Clear search query
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
              const typeText = !isOpportunity ? lead.loan_type.trim() : 'General';

              return (
                <div 
                  key={lead.id} 
                  onClick={() => navigate(isSale ? '/employee/sales/origination/leads/details' : '/employee/loans/origination/leads/details', { state: { lead } })}
                  className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] hover:border-[var(--branch)]/30 p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[var(--surface-alt)] cursor-pointer space-y-2.5 group"
                >
                  {/* Top Row: Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-[12px] font-semibold text-xs flex items-center justify-center shrink-0 ${
                        isSale
                          ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]'
                          : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-[var(--text)] text-sm truncate group-hover:text-[var(--branch-deep)] transition-colors">
                            {displayName}
                          </h3>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-[6px] ${
                              isSale
                                ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]'
                                : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                            }`}
                          >
                            {isSale ? 'Sales' : 'Loans'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Phone size={10} className="text-[var(--icon-muted)]" />
                            {lead.phone ? maskPhoneNumber(lead.phone) : '—'}
                          </span>
                          <span>&bull;</span>
                          <span className="truncate text-[var(--branch-deep)] font-medium">{typeText}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {getStatusBadge(lead.status)}
                    </div>
                  </div>

                  {/* Middle Row: Location & Officer Details */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--muted)]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={11} className="text-[var(--icon-muted)] shrink-0" />
                      <span className="truncate">{maskAddress(lead.address) || 'Location Not Specified'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                      <UserCheck size={11} className="text-[var(--branch-deep)] shrink-0" />
                      <span className="truncate font-medium text-[var(--text)]">{lead.creator_name || 'Officer'}</span>
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

export default BranchOperationsMobileLeads;
