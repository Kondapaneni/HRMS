import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  Plus,
  X,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { getLoanApplications } from '../services/loanServices';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileLoanApplicationsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
  });

  const applications = response?.applications || [];

  const statusCounts = useMemo(() => {
    const counts = { All: applications.length, Created: 0, 'Under Review': 0, Approved: 0, Draft: 0, Rejected: 0 };
    applications.forEach((app) => {
      if (counts[app.status] !== undefined) {
        counts[app.status] += 1;
      }
    });
    return counts;
  }, [applications]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
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

      const matchesStatus = statusFilter === 'All' ? true : app.status === statusFilter;
      const matchesLoanType = loanTypeFilter === 'All' ? true : appLoanType === loanTypeFilter;

      return matchesSearch && matchesStatus && matchesLoanType;
    });
  }, [applications, searchTerm, statusFilter, loanTypeFilter]);

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy');
    } catch (e) {
      return '—';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Created':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={13} /> Created
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Clock size={13} /> Under Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock size={13} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <XCircle size={13} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 shadow-2xs bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
            {status || '—'}
          </span>
        );
    }
  };

  const handleViewDetails = (app) => {
    navigate('/employee/loans/view-application', {
      state: {
        application: app,
        form_data: app.form_data,
        lead_id: app.lead_id,
        name: app.applicant_name || app.form_data?.applicant_name,
        phone: app.phone_number || app.form_data?.phone_number,
        from: '/employee/loans/origination/applications',
      },
    });
  };

  const filterTabs = [
    { key: 'All', label: 'All', count: statusCounts.All },
    { key: 'Created', label: 'Created', count: statusCounts.Created },
    { key: 'Under Review', label: 'Under Review', count: statusCounts['Under Review'] },
    { key: 'Approved', label: 'Approved', count: statusCounts.Approved },
    { key: 'Draft', label: 'Draft', count: statusCounts.Draft },
  ];

  return (
    <div className="space-y-4 pb-14 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Clean White Header (Direct Page Layout) */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              Loan <span className="font-medium italic text-[#1a73e8]">Applications</span>
            </h2>

            <button
              onClick={() => navigate('/employee/loans/origination/members')}
              className="shrink-0 inline-flex items-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>New Loan</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1">
            {applications.length} Total Applications
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 mx-0.5 space-y-3.5">

        {/* Search & Loan Type Filter Controls */}
        <div className="space-y-2.5">
          {/* Search Box */}
          <div className="bg-white rounded-full border border-[#e0e3e7] px-4 py-2.5 shadow-xs flex items-center gap-2.5">
            <Search className="w-4.5 h-4.5 text-[#5f6368] shrink-0" />
            <input
              type="text"
              placeholder="Search by name, phone, App ID..."
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

          {/* Loan Type Pill Select */}
          <div className="bg-white rounded-full border border-[#e0e3e7] px-4 py-2.5 shadow-xs flex items-center gap-2.5 relative">
            <div className="text-[#1a73e8] shrink-0">
              <Briefcase size={16} />
            </div>
            <div className="relative flex-1">
              <select
                value={loanTypeFilter}
                onChange={(e) => setLoanTypeFilter(e.target.value)}
                className="w-full bg-transparent text-[13px] font-semibold text-[#1f1f1f] appearance-none cursor-pointer outline-none pr-6"
              >
                <option value="All">All Loan Types ({applications.length})</option>
                <option value="Personal Loan">Personal Loans</option>
                <option value="Business Loan">Business Loans</option>
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Status Filter Chips */}
        <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                statusFilter === tab.key
                  ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold'
                  : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
                statusFilter === tab.key
                  ? 'bg-[#1a73e8] text-white'
                  : 'bg-[#f1f3f4] text-[#5f6368]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Applications Card List */}
        <div className="space-y-3">
          {error ? (
            <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-2xl text-center border border-[#fad2cf] text-xs">
              Failed to load loan applications. Please try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[#1a73e8]" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto text-[#80868b]">
                <FileText size={20} />
              </div>
              <p className="text-sm font-bold text-[#1f1f1f]">No applications found</p>
              <p className="text-xs text-[#5f6368]">
                {searchTerm ? 'No results matched your search query.' : 'No loan applications in this filter status.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[#1a73e8] hover:underline cursor-pointer"
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

              return (
                <div 
                  key={app.id || app.application_id} 
                  onClick={() => handleViewDetails(app)}
                  className="bg-white rounded-2xl border border-[#e0e3e7] hover:border-[#dadce0] p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[#f8fafd] cursor-pointer space-y-2.5 group"
                >
                  {/* Top Row: Avatar, Name, Phone & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs flex items-center justify-center shrink-0 border border-[#d2e3fc] shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="font-bold text-[#1f1f1f] text-sm truncate group-hover:text-[#1a73e8] transition-colors">
                          {name}
                        </h3>
                        <div className="flex items-center gap-1 font-medium text-[11px] text-[#5f6368]">
                          <Phone size={10} className="text-[#80868b] shrink-0" />
                          <span className="truncate">{phone ? maskPhoneNumber(phone) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>

                  {/* Middle Row: Prominent Loan Type & Creation Date */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f1f3f4] text-[11px] text-[#5f6368]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Briefcase size={12} className="text-[#1a73e8] shrink-0" />
                      <span className="font-bold text-[#1a73e8] text-xs truncate">{loanType}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-right min-w-0 text-[#80868b]">
                      <Calendar size={11} className="text-[#80868b] shrink-0" />
                      <span>{formatDateSafe(app.created_at || app.updated_at)}</span>
                    </div>
                  </div>

                  {/* Bottom Row: App ID, Requested Amount & Arrow */}
                  <div className="pt-2 border-t border-[#f1f3f4] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc] text-[10.5px] shrink-0">
                        {appId}
                      </span>
                      {loanAmount && (
                        <span className="font-bold text-[#137333] text-[11px] truncate">
                          ₹{Number(loanAmount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="w-6 h-6 rounded-full bg-[#f8fafd] border border-[#dadce0] flex items-center justify-center text-[#5f6368] group-hover:bg-[#e8f0fe] group-hover:text-[#1a73e8] group-hover:border-[#d2e3fc] transition-colors shrink-0">
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

export default OriginationMobileLoanApplicationsList;
