import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications } from '../services/loanServices';
import { Search, CheckCircle2, FileText, Loader2, Clock, User, Phone, Briefcase, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import OriginationMobileApplicationsList from './OriginationMobileApplicationsList';

const OriginationApplicationsList = () => {
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

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <OriginationMobileApplicationsList />
      </div>

      {/* Desktop Screen View */}
      <div className="hidden md:block p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Loan Applications</h1>
            <p className="text-sm text-slate-500">View and manage all submitted and draft loan applications</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Total Applications: {applications.length}
            </span>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Applicant Name, Phone, App ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-2">
            {['All', 'Submitted', 'Draft'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st} {st === 'All' ? `(${applications.length})` : `(${applications.filter(a => a.status === st).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Applications Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-red-600">Failed to load loan applications.</div>
          ) : isLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No applications found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">App ID</th>
                  <th className="px-6 py-4">Applicant Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Loan Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((app) => {
                  const name = app.applicant_name || app.form_data?.applicant_name || 'N/A';
                  const phone = app.phone_number || app.form_data?.phone_number || 'N/A';
                  const isSubmitted = app.status === 'Submitted';

                  return (
                    <tr key={app.id || app.application_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-xs border border-blue-100">
                          {app.application_id || 'LA-DRAFT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{name}</td>
                      <td className="px-6 py-4 text-slate-600">{phone}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{app.loan_type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isSubmitted ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {isSubmitted ? <CheckCircle2 size={13} /> : <Clock size={13} />} {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{formatDateSafe(app.created_at || app.updated_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Eye size={14} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Desktop Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
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
                className="p-2 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm">
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

              {/* Applicant Personal Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={16} className="text-blue-600" /> Primary Applicant Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Applicant Name</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.applicant_name || selectedApp.applicant_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Phone Number</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.phone_number || selectedApp.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Aadhaar Number</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.aadhaar_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Age / Gender</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.age || 'N/A'} / {selectedApp.form_data?.gender || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Co-Applicant Details */}
              {selectedApp.form_data?.has_co_applicant === 'Yes' && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={16} className="text-indigo-600" /> Co-Applicant Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Co-Applicant Name</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data.co_applicant_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Relation with Applicant</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data.co_relation_with_applicant || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Phone Number</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data.co_phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Aadhaar Number</p>
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
          </div>
        </div>
      )}
    </>
  );
};

export default OriginationApplicationsList;
