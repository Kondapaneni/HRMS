import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications } from '../services/loanServices';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Clock, Phone, Briefcase, Eye, Loader2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

const OriginationMobileApplicationsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
  });

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

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'N/A';
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

  return (
    <div className="w-full pb-5">
      {/* Animated Hero Header */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Origination Module</p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Applications</h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Created & draft loans</p>
          </div>
        </div>
      </section>

      {/* Main Content Area - Instant render without fadein */}
      <div className="relative z-20 -mt-16 px-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name, phone, App ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <select
              value={loanTypeFilter}
              onChange={(e) => setLoanTypeFilter(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-xs appearance-none cursor-pointer"
            >
              <option value="All">All Types ({applications.length})</option>
              <option value="Personal Loan">
                Personal ({applications.filter(a => (a.loan_type || a.form_data?.loan_type || 'Personal Loan') === 'Personal Loan').length})
              </option>
              <option value="Business Loan">
                Business ({applications.filter(a => (a.loan_type || a.form_data?.loan_type) === 'Business Loan').length})
              </option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-xs appearance-none cursor-pointer"
            >
              <option value="All">All Status ({applications.length})</option>
              <option value="Created">
                Created ({applications.filter(a => a.status === 'Created').length})
              </option>
              <option value="Under Review">
                Under Review ({applications.filter(a => a.status === 'Under Review').length})
              </option>
              <option value="Draft">
                Draft ({applications.filter(a => a.status === 'Draft').length})
              </option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* List Content */}
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center border border-red-100 shadow-sm mt-4">
            Failed to load loan applications.
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-20 mt-4">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-4">
            No applications found matching criteria.
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {filteredApps.map((app) => {
              const name = app.applicant_name || app.form_data?.applicant_name || 'N/A';
              const phone = app.phone_number || app.form_data?.phone_number || 'N/A';
              const isCreated = app.status === 'Created';
              const isUnderReview = app.status === 'Under Review';

              return (
                <div
                  key={app.id || app.application_id}
                  onClick={() => handleViewDetails(app)}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 space-y-3.5 hover:shadow-md transition-all active:scale-[0.98] active:bg-slate-50 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                        {app.application_id || 'LA-DRAFT'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-lg mt-1.5 leading-tight">{name}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isCreated
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : isUnderReview
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {isCreated ? <CheckCircle2 size={12} /> : <Clock size={12} />} {app.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />
                      <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase size={13} className="text-slate-400" />
                      <span className="font-medium text-slate-800">{app.loan_type}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-400">{formatDateSafe(app.created_at || app.updated_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OriginationMobileApplicationsList;
