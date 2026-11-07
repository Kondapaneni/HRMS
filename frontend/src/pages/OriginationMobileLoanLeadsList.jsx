import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/ui/SearchBar';
import { 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Plus, 
  XCircle, 
  RefreshCw,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { getLeads } from '../services/loanServices';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileLoanLeadsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['origination', 'leads', 'list', debouncedSearch],
    queryFn: getLeads,
  });

  const rawLeads = useMemo(() => response?.leads || [], [response?.leads]);

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
          lead.loan_type?.toLowerCase().includes(term) ||
          lead.product_type?.toLowerCase().includes(term)
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={13} /> New
          </span>
        );
      case 'Follow Up':
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
    { key: 'All', label: 'All', count: statusCounts.All },
    { key: 'New', label: 'New', count: statusCounts.New },
    { key: 'Follow Up', label: 'Follow Up', count: statusCounts['Follow Up'] },
    { key: 'Converted', label: 'Converted', count: statusCounts.Converted },
    { key: 'Not Interested', label: 'Closed', count: statusCounts['Not Interested'] },
  ];

  return (
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Loan <span className="text-[var(--brand-deep)]">Leads</span>
            </h2>

            <button
              onClick={() => navigate('/employee/loans/origination/leads/add')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Add Lead</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            {rawLeads.length} Total Prospect Entries
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-3.5">

        {/* Search Box */}
        <SearchBar
          placeholder="Search by name, phone, address, loan type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
        />

        {/* Horizontal Scrollable Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
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
              Failed to load leads. Please refresh or try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[var(--brand-deep)]" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--icon-muted)]">
                <Users size={20} />
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">No leads found</p>
              <p className="text-xs text-[var(--muted)]">
                {searchTerm ? 'No results matched your search query.' : 'No prospect entries in this filter category.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer"
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
                  onClick={() => navigate('/employee/loans/origination/leads/details', { state: { lead } })}
                  className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] hover:border-[var(--brand)]/30 p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[var(--surface-alt)] cursor-pointer space-y-2.5 group"
                >
                  {/* Top Row: Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-semibold text-[var(--text)] text-sm truncate group-hover:text-[var(--brand-deep)] transition-colors">
                          {displayName}
                        </h3>
                        <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Phone size={10} className="text-[var(--icon-muted)]" />
                            {lead.phone ? maskPhoneNumber(lead.phone) : '—'}
                          </span>
                          {lead.loan_type && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate text-[var(--brand-deep)] font-medium">{lead.loan_type}</span>
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
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--muted)]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={11} className="text-[var(--icon-muted)] shrink-0" />
                      <span className="truncate">{lead.address || 'Location Not Specified'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                      <Calendar size={11} className="text-[var(--icon-muted)] shrink-0" />
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

export default OriginationMobileLoanLeadsList;