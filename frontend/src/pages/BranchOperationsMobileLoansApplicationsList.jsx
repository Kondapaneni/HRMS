import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRemoteData } from '../state/remote.js';
import SearchBar from '../components/ui/SearchBar';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Briefcase, 
  Loader2, 
  ChevronRight, 
  XCircle,
  FileText,
  X,
  Calendar,
  Building2,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { getBranchLoanApplications } from '../services/loanServices';
import { maskPhoneNumber } from '../utils/phoneUtils';
import {
  getBranchOperationsReceivedAt,
  isNewBranchOperationsApplication
} from '../utils/branchOperationsApplicationReadState';
import { useBranchOperationsApplicationReadState } from '../hooks/useBranchOperationsApplicationReadState';

const BranchOperationsMobileLoansApplicationsList = () => {
  const navigate = useNavigate();
  const markAsSeen = useBranchOperationsApplicationReadState();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');

  const { data: response, isLoading, error } = useRemoteData({
    scope: ['branchOperations', 'applications', 'list'],
    load: getBranchLoanApplications,
  });

  const branch = response?.branch || { name: 'Assigned Branch' };
  const applications = response?.applications || [];

  const statusCounts = useMemo(() => {
    const counts = { All: applications.length, New: 0, Created: 0, 'Under Review': 0, Approved: 0, Draft: 0, Rejected: 0 };
    applications.forEach((app) => {
      if (counts[app.status] !== undefined) {
        counts[app.status] += 1;
      }
      if (isNewBranchOperationsApplication(app)) {
        counts.New += 1;
      }
    });
    return counts;
  }, [applications]);

  const filteredApps = useMemo(() => {
    const filtered = applications.filter((app) => {
      const name = app.applicant_name || app.form_data?.applicant_name || '';
      const phone = app.phone_number || app.form_data?.phone_number || '';
      const appId = app.application_id || '';
      const leadId = app.lead_id || '';
      const appLoanType = app.loan_type || app.form_data?.loan_type || 'Personal Loan';

      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm) ||
        appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(leadId).includes(searchTerm);

      const matchesStatus = statusFilter === 'All'
        ? true
        : statusFilter === 'New'
          ? isNewBranchOperationsApplication(app)
          : app.status === statusFilter;
      const matchesLoanType = loanTypeFilter === 'All' ? true : appLoanType === loanTypeFilter;

      return matchesSearch && matchesStatus && matchesLoanType;
    });
    if (statusFilter === 'New') {
      filtered.sort((a, b) => new Date(getBranchOperationsReceivedAt(b) || 0) - new Date(getBranchOperationsReceivedAt(a) || 0));
    }
    return filtered;
  }, [applications, searchTerm, statusFilter, loanTypeFilter]);

  const formatDateSafe = (dateStr, pattern = 'dd MMM yyyy') => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : format(d, pattern);
    } catch (e) {
      return '—';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Created':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <CheckCircle2 size={13} /> Created
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] shrink-0">
            <Clock size={13} /> Under Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] shrink-0">
            <Clock size={13} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] shrink-0">
            <XCircle size={13} /> Rejected
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

  const handleViewDetails = (app) => {
    markAsSeen(app);
    navigate('/employee/branch-operations/loans-view-applications', {
      state: {
        application: app,
        form_data: app.form_data,
        lead_id: app.lead_id,
        name: app.applicant_name || app.form_data?.applicant_name,
        phone: app.phone_number || app.form_data?.phone_number,
        from: '/employee/branch-operations/loans-applications',
      },
    });
  };

  const filterTabs = [
    { key: 'All', label: 'All', count: statusCounts.All },
    { key: 'New', label: 'New', count: statusCounts.New },
    { key: 'Created', label: 'Created', count: statusCounts.Created },
    { key: 'Under Review', label: 'Under Review', count: statusCounts['Under Review'] },
    { key: 'Approved', label: 'Approved', count: statusCounts.Approved },
    { key: 'Draft', label: 'Draft', count: statusCounts.Draft },
  ];

  return (
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Branch Operations &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Loan <span className="text-[var(--branch-deep)]">Applications</span>
            </h2>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1 flex items-center gap-1.5 flex-wrap">
            <span>{applications.length} Total Applications</span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--branch-deep)]">
              <Building2 size={13} className="text-[var(--branch-deep)]" /> {branch.name}
            </span>
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-3.5">

        {/* Search & Loan Type Filter Controls */}
        <div className="space-y-2.5">
          {/* Search Box */}
          <SearchBar
            placeholder="Search by name, phone, App ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
          />

          {/* Loan Type Select */}
          <div className="bg-[var(--surface)] rounded-[12px] border border-[var(--line)] px-3.5 py-2 shadow-xs flex items-center gap-2.5 relative">
            <div className="text-[var(--branch-deep)] shrink-0">
              <Briefcase size={15} />
            </div>
            <div className="relative flex-1">
              <select
                value={loanTypeFilter}
                onChange={(e) => setLoanTypeFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-[var(--text)] appearance-none cursor-pointer outline-none pr-6"
              >
                <option value="All">All Loan Types ({applications.length})</option>
                <option value="Personal Loan">Personal Loans</option>
                <option value="Business Loan">Business Loans</option>
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                statusFilter === tab.key
                  ? 'bg-[var(--ink)] text-white border-transparent shadow-xs'
                  : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--surface-alt)]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none tabular-nums ${
                statusFilter === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--surface-alt)] text-[var(--muted)]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Applications Card List */}
        <div className="space-y-3">
          {error ? (
            <div className="bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] p-4 rounded-[16px] text-center text-xs">
              Failed to load loan applications. Please try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[var(--branch-deep)]" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--icon-muted)]">
                <FileText size={20} />
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">No applications found</p>
              <p className="text-xs text-[var(--muted)]">
                {searchTerm ? 'No results matched your search query.' : 'No loan applications in this filter status.'}
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
            filteredApps.map((app) => {
              const name = app.applicant_name || app.form_data?.applicant_name || 'Unnamed Applicant';
              const phone = app.phone_number || app.form_data?.phone_number || '';
              const appId = app.application_id || 'LA-DRAFT';
              const loanType = app.loan_type || app.form_data?.loan_type || 'Personal Loan';
              const loanAmount = app.form_data?.loan_amount || app.form_data?.required_loan_amount || app.loan_amount;
              const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'A';
              const receivedAt = getBranchOperationsReceivedAt(app);
              const isNew = isNewBranchOperationsApplication(app);

              return (
                <div 
                  key={app.id || app.application_id} 
                  onClick={() => handleViewDetails(app)}
                  className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] hover:border-[var(--branch)]/30 p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[var(--surface-alt)] cursor-pointer space-y-2.5 group"
                >
                  {/* Top Row: Avatar, Name, Phone & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-[12px] bg-[var(--branch-tint)] text-[var(--branch-deep)] font-semibold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="flex items-center gap-1.5 font-semibold text-[var(--text)] text-sm min-w-0 group-hover:text-[var(--branch-deep)] transition-colors">
                          <span className="truncate">{name}</span>
                          {isNew && (
                            <span className="shrink-0 rounded-full bg-[var(--badge-success-bg)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--badge-success-text)]">
                              New
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-1 font-medium text-[11px] text-[var(--muted)]">
                          <Phone size={10} className="text-[var(--icon-muted)] shrink-0" />
                          <span className="truncate">{phone ? maskPhoneNumber(phone) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>

                  {/* Middle Row: Prominent Loan Type & Creation Date */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--muted)]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Briefcase size={12} className="text-[var(--branch-deep)] shrink-0" />
                      <span className="font-semibold text-[var(--branch-deep)] text-xs truncate">{loanType}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-right min-w-0 text-[var(--muted)]">
                      <Calendar size={11} className="text-[var(--icon-muted)] shrink-0" />
                      <span className="truncate">
                        {receivedAt
                          ? `Received ${formatDateSafe(receivedAt, 'dd MMM, hh:mm a')}`
                          : formatDateSafe(app.created_at || app.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: App ID, Requested Amount & Arrow */}
                  <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-[var(--branch-deep)] bg-[var(--branch-tint)] px-2.5 py-0.5 rounded-[6px] text-[10.5px] shrink-0">
                        {appId}
                      </span>
                      {loanAmount && (
                        <span className="font-semibold text-[var(--badge-success-text)] text-[11px] truncate">
                          ₹{Number(loanAmount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="w-6 h-6 rounded-[8px] bg-[var(--surface-alt)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--branch-tint)] group-hover:text-[var(--branch-deep)] transition-colors shrink-0">
                      <ChevronRight size={13} />
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

export default BranchOperationsMobileLoansApplicationsList;
