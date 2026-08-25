import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Briefcase, 
  Eye, 
  Loader2, 
  ChevronRight, 
  XCircle,
  FileText,
  Plus,
  X,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={10} /> Created
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Clock size={10} /> Under Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={10} /> Approved
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock size={10} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <XCircle size={10} /> Rejected
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
    <div className="space-y-4 pb-14">

      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5">
                Origination Workspace
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Loan Applications
            </h1>
            <p className="text-xs text-[#5f6368]">
              {applications.length} submitted & draft applications
            </p>
          </div>

          <button
            onClick={() => navigate('/employee/loans/origination/members')}
            className="inline-flex items-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>New Loan</span>
          </button>
        </div>
      </div>

      {/* 2. Search Box */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] p-2.5 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-[#5f6368] ml-1.5 shrink-0" />
        <input
          type="search"
          placeholder="Search by name, phone, App ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent border-none outline-none text-[#1f1f1f] placeholder:text-[#80868b] pr-2"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="p-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 3. Horizontal Status Filter Chips */}
      <div className="flex overflow-x-auto gap-2 py-0.5 hide-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              statusFilter === tab.key
                ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc] shadow-2xs font-bold'
                : 'bg-white text-[#5f6368] border-[#e0e3e7] hover:bg-[#f8fafd]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
              statusFilter === tab.key
                ? 'bg-[#1a73e8] text-white'
                : 'bg-[#f1f3f4] text-[#5f6368]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Applications Card List */}
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
                className="mt-2 inline-flex items-center text-xs font-semibold text-[#1a73e8] hover:underline"
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

            return (
              <div 
                key={app.id || app.application_id} 
                onClick={() => handleViewDetails(app)}
                className="bg-white rounded-2xl border border-[#e0e3e7] hover:border-[#dadce0] p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[#f8fafd] cursor-pointer space-y-2.5"
              >
                {/* Top Row: App ID Pill + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                      {appId}
                    </span>
                    <h3 className="font-bold text-[#1f1f1f] text-sm truncate">
                      {name}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Middle Row: Phone & Loan Type */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5f6368] pt-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone size={11} className="text-[#80868b] shrink-0" />
                    <span className="font-mono font-medium truncate text-[#1f1f1f]">
                      {phone ? maskPhoneNumber(phone) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Briefcase size={11} className="text-[#80868b] shrink-0" />
                    <span className="font-medium text-[#1a73e8] truncate">{loanType}</span>
                  </div>
                </div>

                {/* Bottom Row: Date & Arrow */}
                <div className="pt-2 border-t border-[#f1f3f4] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-[#5f6368]">
                    <Calendar size={11} className="text-[#80868b]" />
                    <span>{formatDateSafe(app.created_at || app.updated_at)}</span>
                    {loanAmount ? (
                      <>
                        <span>&bull;</span>
                        <span className="font-semibold text-[#137333]">₹{Number(loanAmount).toLocaleString('en-IN')}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="w-6 h-6 rounded-full bg-[#f8fafd] border border-[#dadce0] flex items-center justify-center text-[#5f6368]">
                    <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default OriginationMobileLoanApplicationsList;
