import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';
import { motion } from 'framer-motion';
import { Search, MapPin, Phone, Calendar, CheckCircle2, Clock, FileText, Loader2, Plus, MoreVertical, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import OriginationMobileSaleLeadsList from './OriginationMobileSaleLeadsList';
import AddLeadSidebar from '../components/AddLeadSidebar';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';

const OriginationSaleLeadsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['sales', 'leads', 'list', debouncedSearch],
    queryFn: () => getSalesLeads({ search: debouncedSearch }),
  });

  const leads = response?.leads || response?.data || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Clock size={12} /> New</span>;
      case 'Follow Up':
      case 'Contacted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"><RefreshCw size={12} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
      case 'Proposal Sent':
      case 'Negotiation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock size={12} /> {status}</span>;
      case 'Converted':
      case 'Won':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Converted</span>;
      case 'Not Interested':
      case 'Lost':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700"><XCircle size={12} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <>
      <div className="md:hidden">
        <OriginationMobileSaleLeadsList />
      </div>

      <motion.div 
        className="hidden md:block p-4 md:p-6 space-y-6 md:pb-6"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">All Leads</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and track your sales origination leads.</p>
          </div>
          <button 
            onClick={() => setIsAddLeadOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 transition-colors gap-2 shadow-sm shadow-emerald-600/20 cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            Add Leads
          </button>
        </motion.div>

        {/* Data State */}
        {error ? (
          <motion.div variants={itemVariants} className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">
            Failed to load leads. Please try again.
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            {/* Desktop View: Table */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm mb-6">
              <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                    <FileText className="h-5 w-5 text-slate-500" />
                    Leads Directory
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">A comprehensive list of all your sales origination leads and their current status.</p>
                </div>
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="search"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-6 pt-0">
                <div className="rounded-md border border-slate-200 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created Date</th>
                        <th className="p-3 w-20 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center">
                            <Loader2 className="animate-spin h-8 w-8 text-emerald-600 mx-auto" />
                            <p className="text-slate-500 mt-4">Searching leads...</p>
                          </td>
                        </tr>
                      ) : leads.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-12 text-slate-500">
                            No leads found.
                          </td>
                        </tr>
                      ) : (
                        leads.map((lead) => (
                          <motion.tr variants={itemVariants} key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-700">
                              <div className="font-medium text-slate-900">{lead.name}</div>
                            </td>
                            <td className="p-3 text-slate-700">
                              {lead.phone}
                            </td>
                            <td className="p-3 text-slate-700 max-w-[200px] truncate" title={lead.address}>
                              {lead.address || '—'}
                            </td>
                            <td className="p-3">
                              {getStatusBadge(lead.status)}
                            </td>
                            <td className="p-3 text-slate-700">
                              {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy h:mm a') : '—'}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setSelectedLead(lead)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <MoreVertical size={16} />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <AddLeadSidebar isOpen={isAddLeadOpen} onClose={() => setIsAddLeadOpen(false)} type="sale" />
      <LeadDetailsSidebar 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
        type="sale"
      />
    </>
  );
};

export default OriginationSaleLeadsList;
