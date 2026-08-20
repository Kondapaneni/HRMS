import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';
import { motion } from 'framer-motion';
import { Search, Users, Loader2, MoreVertical, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import MemberDetailsSidebar from '../components/MemberDetailsSidebar';
import OriginationMobileSaleMemberList from './OriginationMobileSaleMemberList';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationSaleMembersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['sales', 'leads', 'list', debouncedSearch],
    queryFn: () => getSalesLeads({ search: debouncedSearch }),
  });

  // Filter only converted sales leads and group by phone
  const convertedLeads = (response?.leads || response?.data || []).filter(lead => lead.status === 'Converted');
  const members = Object.values(convertedLeads.reduce((acc, lead) => {
    if (!acc[lead.phone]) {
      acc[lead.phone] = {
        id: lead.phone,
        lead_id: lead.id,
        name: lead.name,
        phone: lead.phone,
        address: lead.address,
        product_type: lead.product_type,
        updated_at: lead.updated_at,
        created_at: lead.created_at,
        status: 'Converted',
        products: []
      };
    }
    acc[lead.phone].products.push(lead);
    return acc;
  }, {}));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const formatProductTypes = (products) => {
    if (!products || products.length === 0) return '—';
    const uniqueTypes = [...new Set(products.map(p => p.product_type).filter(Boolean))];
    if (uniqueTypes.length === 0) return '—';
    if (uniqueTypes.length <= 2) {
      return uniqueTypes.join(', ');
    } else {
      return `${uniqueTypes.slice(0, 2).join(', ')} +${uniqueTypes.length - 2}`;
    }
  };

  return (
    <>
      <div className="md:hidden">
        <OriginationMobileSaleMemberList />
      </div>
      <motion.div 
        className="hidden md:block p-4 md:p-6 space-y-6 md:pb-6"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Members</h1>
            <p className="text-sm text-slate-500 mt-1">View sales leads that have been successfully converted into members.</p>
          </div>
        </motion.div>

        {/* Data State */}
        {error ? (
          <motion.div variants={itemVariants} className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">
            Failed to load members. Please try again.
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            {/* Table View */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm mb-6">
              <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                    <Users className="h-5 w-5 text-slate-500" />
                    Members Directory
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">A comprehensive list of all your converted sales members.</p>
                </div>
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="search"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                    placeholder="Search members..."
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
                        <th className="p-3">Product Types</th>
                        <th className="p-3">Converted Date</th>
                        <th className="p-3 w-20 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center">
                            <Loader2 className="animate-spin h-8 w-8 text-emerald-600 mx-auto" />
                            <p className="text-slate-500 mt-4">Searching members...</p>
                          </td>
                        </tr>
                      ) : members.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-12 text-slate-500">
                            No members found.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <motion.tr variants={itemVariants} key={member.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-700">
                              <div className="font-medium text-slate-900">{member.name}</div>
                            </td>
                            <td className="p-3 text-slate-700">
                              {maskPhoneNumber(member.phone)}
                            </td>
                            <td className="p-3 text-slate-700 max-w-[200px] truncate" title={member.address}>
                              {member.address || '—'}
                            </td>
                            <td className="p-3 text-slate-700">
                              <span className="inline-flex px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-100">
                                {formatProductTypes(member.products)}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700">
                              {member.created_at ? format(new Date(member.created_at), 'MMM d, yyyy h:mm a') : '—'}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setSelectedMember(member)}
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

      <MemberDetailsSidebar 
        isOpen={!!selectedMember} 
        onClose={() => setSelectedMember(null)} 
        member={selectedMember} 
        type="sale"
      />
    </>
  );
};

export default OriginationSaleMembersList;
