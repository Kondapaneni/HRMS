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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--badge-info-text)]/15 shrink-0">
            <Clock size={11} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15 shrink-0">
            Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15 shrink-0">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-text)]/15 shrink-0">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      case 'Not Interested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--badge-danger-text)]/15 shrink-0">
            <XCircle size={11} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] border border-[var(--line)] shrink-0">
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
    <div className="space-y-4 pb-20 font-sans antialiased text-[var(--text)]">
      {/* Mobile Top Header */}
      <section className="relative z-20 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-0.5">
              Branch Operations &bull; Directory
            </p>
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight">
              Branch Leads
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--branch-tint)] text-[var(--branch-deep)]">
              {counts.All} Leads
            </span>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1 truncate">
          <Building2 size={12} className="text-[var(--branch-deep)] shrink-0" />
          <span className="truncate">{branch.name}</span>
          <span>&bull;</span>
          <span>Read-only overview</span>
        </p>
      </section>

      {/* Filter Layer */}
      <div className="space-y-2.5">
        {/* Dropdown Filters Row: Pipeline & Officer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Pipeline Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--branch-deep)]">
              <Layers size={14} />
            </div>
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--branch)] transition-all font-medium appearance-none shadow-xs cursor-pointer"
            >
              <option value="all">All Pipelines ({counts.All})</option>
              <option value="loans">Loans Pipeline ({counts.loans})</option>
              <option value="sales">Sales Pipeline ({counts.sales})</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--muted)]">
              <ChevronDown size={12} />
            </div>
          </div>

          {/* Officer Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--branch-deep)]">
              <UserCheck size={14} />
            </div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--brand)] transition-all font-medium appearance-none shadow-xs cursor-pointer"
            >
              <option value="all">All Branch Officers ({filteredCreators.length})</option>
              {filteredCreators.map((creator) => (
                <option key={creator.userId} value={creator.userId}>
                  {creator.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--muted)]">
              <ChevronDown size={12} />
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          {isFetching ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--branch-deep)] animate-spin pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
          )}
          <input
            type="search"
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand)] transition-all font-medium"
            placeholder="Search name, phone, loan/product, officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex overflow-x-auto gap-1.5 py-0.5 hide-scrollbar">
          {statusFilterTabs.map((tab) => {
            const isSelected = selectedStatusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatusFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[var(--ink)] text-white border-transparent shadow-xs font-semibold'
                    : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--text)]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10.5px] font-bold leading-none tabular-nums text-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[var(--surface-alt)] text-[var(--text-2)]'
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
          <div className="bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] p-4 rounded-[16px] text-center border border-[var(--badge-danger-text)]/20 text-xs space-y-1">
            <p className="font-semibold">Failed to load branch leads.</p>
            <p className="text-[11px] opacity-80">Please check your network or try refreshing.</p>
          </div>
        ) : rawLeads.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center space-y-2.5 shadow-xs">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--muted)]">
              <Users size={20} />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">No leads found</p>
            <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
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
                className="mt-2 inline-flex items-center text-xs font-medium text-[var(--branch-deep)] hover:underline cursor-pointer"
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
                className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-3"
              >
                {/* Top Row: Name, Pipeline Badge, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-[12px] font-semibold text-xs flex items-center justify-center shrink-0 border ${
                        isSale
                          ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border-[var(--accent-pink)]/20'
                          : 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-[var(--text)] text-sm truncate">
                          {displayName}
                        </h4>
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
                        <span className="inline-flex items-center gap-1">
                          <Phone size={10} className="text-[var(--muted)]" />
                          {lead.phone ? maskPhoneNumber(lead.phone) : '-'}
                        </span>
                        <span>&bull;</span>
                        <span className="truncate font-medium text-[var(--text-2)]">{typeText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {getStatusBadge(lead.status)}
                  </div>
                </div>

                {/* Middle Row: Officer & Date */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--muted)]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserCheck size={11} className="text-[var(--branch-deep)] shrink-0" />
                    <span className="truncate font-medium text-[var(--text)]">
                      {lead.creator_name || 'Branch Officer'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                    <Calendar size={11} className="text-[var(--muted)] shrink-0" />
                    <span className="truncate">
                      {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy') : '-'}
                    </span>
                  </div>
                </div>

                {/* Location Line if exists (Masked) */}
                {lead.address && (
                  <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--muted)] truncate pt-0.5">
                    <MapPin size={10} className="text-[var(--muted)] shrink-0" />
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
