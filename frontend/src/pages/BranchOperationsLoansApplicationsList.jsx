import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getBranchLoanApplications } from '../services/loanServices';
import PageLoader from '../components/PageLoader';
import { 
  Search, 
  CheckCircle2, 
  Briefcase, 
  Clock, 
  Building2, 
  XCircle, 
  ChevronDown,
  Eye,
  ArrowUpRight,
  FileEdit,
  X,
  Copy,
  Phone,
  Calendar,
  User,
  Lock,
  ChevronRight,
  ShieldCheck,
  Check,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import BranchOperationsMobileLoansApplicationsList from './BranchOperationsMobileLoansApplicationsList';
import { maskPhoneNumber } from '../utils/phoneUtils';

const BranchOperationsLoansApplicationsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');
  const [selectedApp, setSelectedApp] = useState(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['branchOperations', 'applications', 'list'],
    queryFn: getBranchLoanApplications,
  });

  const branch = response?.branch || { name: 'Assigned Branch' };
  const applications = response?.applications || [];

  const filteredApps = applications.filter((app) => {
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

  const formatDateSafe = (dateStr, formatTemplate = 'MMM d, yyyy') => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : format(d, formatTemplate);
    } catch (e) {
      return '—';
    }
  };

  const handleOpenStudio = (app) => {
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

  const handleEditApplication = (app) => {
    navigate('/employee/branch-operations/loans-edit-application', {
      state: {
        application: app,
        form_data: app.form_data,
        loan_type: app.loan_type || app.form_data?.loan_type || 'Personal Loan',
        from: '/employee/branch-operations/loans-applications',
      },
    });
  };

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    if (!id) return;
    navigator.clipboard.writeText(id);
    toast.success(`Copied Application ID: ${id}`);
  };

  const getStatusBadge = (status) => {
    const isCreated = status === 'Created' || status === 'Approved';
    const isUnderReview = status === 'Under Review';
    const isRejected = status === 'Rejected';

    if (isCreated) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] whitespace-nowrap">
          <CheckCircle2 size={11} /> {status}
        </span>
      );
    }
    if (isUnderReview) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] whitespace-nowrap">
          <Clock size={11} /> Under Review
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] whitespace-nowrap">
          <XCircle size={11} /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] whitespace-nowrap">
        <Clock size={11} /> {status}
      </span>
    );
  };

  if (isLoading) {
    return <PageLoader message="Loading Loan Applications..." />;
  }

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <BranchOperationsMobileLoansApplicationsList />
      </div>

      {/* Desktop Screen View */}
      <div className="hidden md:block space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Branch Loan Applications
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Loan Applications
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                {branch.name}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              View and manage all loan applications processed through {branch.name}.
            </p>
          </div>
        </div>

        {/* Directory Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#f1f3f4] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
                <Briefcase size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1f1f1f]">Applications Directory</h3>
                <p className="text-xs text-[#5f6368]">Total {filteredApps.length} records found</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#f8fafd] border border-[#dadce0] rounded-full text-xs font-medium text-[#1f1f1f] placeholder:text-[#5f6368] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all"
                />
              </div>

              {/* Loan Type Filter Dropdown */}
              <div className="relative">
                <select
                  value={loanTypeFilter}
                  onChange={(e) => setLoanTypeFilter(e.target.value)}
                  className="h-9 px-3.5 pr-8 rounded-full border border-[#dadce0] bg-white text-xs font-semibold text-[#1f1f1f] shadow-2xs hover:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 appearance-none cursor-pointer"
                >
                  <option value="All">All Types ({applications.length})</option>
                  <option value="Personal Loan">
                    Personal Loan ({applications.filter(a => (a.loan_type || a.form_data?.loan_type) === 'Personal Loan').length})
                  </option>
                  <option value="Business Loan">
                    Business Loan ({applications.filter(a => (a.loan_type || a.form_data?.loan_type) === 'Business Loan').length})
                  </option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
              </div>

              {/* Status Filter Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3.5 pr-8 rounded-full border border-[#dadce0] bg-white text-xs font-semibold text-[#1f1f1f] shadow-2xs hover:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 appearance-none cursor-pointer"
                >
                  <option value="All">All Status ({applications.length})</option>
                  <option value="Under Review">
                    Under Review ({applications.filter(a => a.status === 'Under Review').length})
                  </option>
                  <option value="Approved">
                    Approved ({applications.filter(a => a.status === 'Approved').length})
                  </option>
                  <option value="Draft">
                    Draft ({applications.filter(a => a.status === 'Draft').length})
                  </option>
                  <option value="Rejected">
                    Rejected ({applications.filter(a => a.status === 'Rejected').length})
                  </option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">App ID</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Loan Type</th>
                  <th className="px-4 py-3">Created By</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4]">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-xs text-[#5f6368]">
                      No applications found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const name = app.applicant_name || app.form_data?.applicant_name || 'Applicant';
                    const phone = app.phone_number || app.form_data?.phone_number || '—';

                    return (
                      <tr 
                        key={app.id || app.application_id} 
                        onClick={() => setSelectedApp(app)}
                        className="hover:bg-[#f8fafd] transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full text-[11px] border border-[#d2e3fc]">
                            {app.application_id || 'LA-PENDING'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#1f1f1f] whitespace-nowrap">
                          {name}
                        </td>
                        <td className="px-4 py-3.5 text-[#5f6368] whitespace-nowrap">
                          {maskPhoneNumber(phone)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium bg-[#f1f3f4] text-[#444746] whitespace-nowrap text-center">
                            {app.loan_type || app.form_data?.loan_type || 'Personal Loan'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[#444746] whitespace-nowrap">
                          {app.creator_name || 'Branch Officer'}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="px-4 py-3.5 text-[#5f6368] whitespace-nowrap">
                          {formatDateSafe(app.created_at || app.updated_at)}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {app.status === 'Draft' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditApplication(app)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#d2e3fc] rounded-full transition-colors cursor-pointer"
                                  title="Edit Application"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedApp(app)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1f1f1f] bg-white hover:bg-[#f1f3f4] border border-[#dadce0] rounded-full transition-colors cursor-pointer shadow-none hover:shadow-xs"
                                  title="Quick Overview"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#5f6368]" />
                                  <span>Preview</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedApp(app)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1f1f1f] bg-white hover:bg-[#f1f3f4] border border-[#dadce0] rounded-full transition-colors cursor-pointer shadow-none hover:shadow-xs"
                                  title="Quick Overview"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#5f6368]" />
                                  <span>Preview</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenStudio(app)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#d2e3fc] rounded-full transition-colors cursor-pointer"
                                  title="Open Full Application Studio"
                                >
                                  <span>Studio</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slideover Application Quick Details Drawer (Desktop) - 100% Parity with Origination */}
      {selectedApp && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedApp(null); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
          >
            {/* Top 4-Color Google Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Branch Operations</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f] flex items-center gap-2">
                  Application Details
                  <span className="text-xs font-mono font-normal text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded">
                    {selectedApp.application_id || 'LA-PENDING'}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
              {/* Applicant Overview Card */}
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold flex items-center justify-center text-sm border border-[#d2e3fc] shrink-0">
                    {(selectedApp.applicant_name || selectedApp.form_data?.applicant_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1f1f1f] truncate">
                      {selectedApp.applicant_name || selectedApp.form_data?.applicant_name || 'Unnamed Applicant'}
                    </p>
                    <p className="text-xs text-[#5f6368] mt-0.5">
                      {maskPhoneNumber(selectedApp.phone_number || selectedApp.form_data?.phone_number)}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                </div>

                {/* Extended Contact / Identity Details */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e0e3e7]/80 text-xs">
                  <div>
                    <span className="text-[#5f6368] block">Gender & Age</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.gender || '—'} {selectedApp.form_data?.age ? `(${selectedApp.form_data.age} yrs)` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5f6368] block">Marital Status</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.marital_status ? (selectedApp.form_data.marital_status === 'Yes' ? 'Married' : 'Single') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5f6368] block">Own House</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.own_house || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5f6368] block">Co-Applicant</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.has_co_applicant === 'Yes' ? 'Yes (Added)' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Category & Submission Highlights */}
              <div className="bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider block">Product Category</span>
                    <span className="text-base font-bold text-[#1f1f1f] mt-0.5 block">
                      {selectedApp.loan_type || selectedApp.form_data?.loan_type || 'Personal Loan'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider block">Application Status</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedApp.status)}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#d2e3fc]/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-[#1a73e8] uppercase tracking-wider block">Application ID</span>
                    <p className="font-mono font-semibold text-[#1f1f1f] mt-0.5">
                      {selectedApp.application_id || 'LA-PENDING'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#1a73e8] uppercase tracking-wider block">Employment Mode</span>
                    <p className="font-semibold text-[#1f1f1f] mt-0.5">
                      {selectedApp.form_data?.employment || (selectedApp.loan_type === 'Business Loan' ? 'Business' : 'Salaried / Job')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Details (If Business Loan) */}
              {(selectedApp.form_data?.business_name || selectedApp.loan_type === 'Business Loan') && (
                <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2.5">
                  <span className="font-semibold text-[#1f1f1f] text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#1a73e8]" /> Business Information
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[#5f6368] block">Enterprise Name</span>
                      <span className="font-semibold text-[#1f1f1f] block">
                        {selectedApp.form_data?.business_name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5f6368] block">Monthly Income</span>
                      <span className="font-semibold text-[#1f1f1f] block">
                        {selectedApp.form_data?.business_income_per_month ? `₹${selectedApp.form_data?.business_income_per_month}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Supporting Documents Checklist */}
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1f1f1f] text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" /> KYC & Document Checklist
                  </span>
                  <span className="text-[10px] font-semibold text-[#5f6368]">
                    {Object.keys(selectedApp.form_data?.documents || selectedApp.documents || {}).length} Attached
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {Object.entries(selectedApp.form_data?.documents || selectedApp.documents || {}).length === 0 ? (
                    <p className="text-[#80868b] italic text-xs py-1">No digital documents attached to this application.</p>
                  ) : (
                    Object.entries(selectedApp.form_data?.documents || selectedApp.documents || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white border border-[#dadce0]">
                        <span className="font-medium text-[#1f1f1f] capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {typeof val === 'string' && val.startsWith('http') ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#1a73e8] hover:underline font-semibold text-[11px]"
                          >
                            <ExternalLink size={12} /> View File
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#137333] font-semibold text-[11px]">
                            <Check size={12} /> Uploaded
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Timestamp & Metadata */}
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#5f6368]">Created At</span>
                  <span className="font-semibold text-[#1f1f1f]">{formatDateSafe(selectedApp.created_at, 'MMM d, yyyy h:mm a')}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#5f6368]">Last Modified</span>
                  <span className="font-semibold text-[#1f1f1f]">{formatDateSafe(selectedApp.updated_at, 'MMM d, yyyy h:mm a')}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center gap-2.5 shrink-0 flex-wrap">
              {selectedApp.status === 'Draft' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedApp;
                      setSelectedApp(null);
                      handleEditApplication(target);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer"
                  >
                    <FileEdit className="w-4 h-4" />
                    <span>Continue / Edit Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedApp;
                      setSelectedApp(null);
                      handleOpenStudio(target);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                  >
                    <span>Studio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedApp;
                    setSelectedApp(null);
                    handleOpenStudio(target);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer"
                >
                  <span>Open in Loan Application Studio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BranchOperationsLoansApplicationsList;
