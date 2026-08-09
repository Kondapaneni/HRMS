import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications } from '../services/loanServices';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle2, FileText, Loader2, ArrowRight, Clock, User, Phone, MapPin, Briefcase, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const OriginationMobileApplicationsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedApp, setSelectedApp] = useState(null);

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
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(leadId).includes(searchTerm);

    const matchesStatus = statusFilter === 'All' ? true : app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM d, yyyy - h:mm a');
    } catch (e) {
      return 'N/A';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="w-full pb-8">
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
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Submitted & draft loans</p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-20 -mt-16 px-4 space-y-4">
        {/* Search Bar */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex items-center">
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
        </motion.div>

        {/* Status Tabs */}
        <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'Submitted', 'Draft'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st} {st === 'All' ? `(${applications.length})` : `(${applications.filter(a => a.status === st).length})`}
            </button>
          ))}
        </motion.div>

        {/* List Content */}
        {error ? (
          <motion.div variants={itemVariants} className="bg-red-50 text-red-600 p-4 rounded-2xl text-center border border-red-100 shadow-sm mt-4">
            Failed to load loan applications.
          </motion.div>
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
              const isSubmitted = app.status === 'Submitted';

              return (
                <motion.div
                  key={app.id || app.application_id}
                  variants={itemVariants}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 space-y-3.5 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                        {app.application_id || 'LA-DRAFT'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-lg mt-1.5 leading-tight">{name}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isSubmitted ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {isSubmitted ? <CheckCircle2 size={12} /> : <Clock size={12} />} {app.status}
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
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Eye size={14} /> View Details
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Application Details Modal */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 cursor-pointer"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-[32px] shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    {selectedApp.application_id || 'LA-DRAFT'}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedApp.applicant_name || selectedApp.form_data?.applicant_name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-sm">
                {/* Status & Loan Type */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Loan Type</p>
                    <p className="font-bold text-slate-900 text-base">{selectedApp.loan_type}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedApp.status === 'Submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedApp.status}
                  </span>
                </div>

                {/* Primary Applicant Details */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={16} className="text-blue-600" /> Applicant Personal Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Name</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data?.applicant_name || selectedApp.applicant_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Phone</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data?.phone_number || selectedApp.phone_number}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Aadhaar</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data?.aadhaar_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Age / Gender</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data?.age || 'N/A'} / {selectedApp.form_data?.gender || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Co-Applicant (If present) */}
                {selectedApp.form_data?.has_co_applicant === 'Yes' && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
                      <User size={16} className="text-indigo-600" /> Co-Applicant Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 font-medium">Co-Applicant Name</p>
                        <p className="font-semibold text-slate-800">{selectedApp.form_data.co_applicant_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Relation</p>
                        <p className="font-semibold text-slate-800">{selectedApp.form_data.co_relation_with_applicant || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Phone</p>
                        <p className="font-semibold text-slate-800">{selectedApp.form_data.co_phone_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Aadhaar</p>
                        <p className="font-semibold text-slate-800">{selectedApp.form_data.co_aadhaar_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guarantors */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={16} className="text-emerald-600" /> Guarantors (3 Required)
                  </h4>
                  {[1, 2, 3].map((gIdx) => {
                    const pfx = `guarantor_${gIdx}_`;
                    const gName = selectedApp.form_data?.[`${pfx}name`];
                    const gPhone = selectedApp.form_data?.[`${pfx}phone_number`];
                    const gAadhaar = selectedApp.form_data?.[`${pfx}aadhaar_number`];

                    if (!gName) return null;

                    return (
                      <div key={gIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                        <p className="font-bold text-slate-900">Guarantor {gIdx}: {gName}</p>
                        <p className="text-slate-600">Phone: {gPhone || 'N/A'} | Aadhaar: {gAadhaar || 'N/A'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OriginationMobileApplicationsList;
