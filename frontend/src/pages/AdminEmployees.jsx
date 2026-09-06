import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { Search, Plus, MoreVertical, Eye, Edit, Settings, Loader2, Users, ArrowUpRight, ShieldCheck, Mail, Calendar } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AddEmployeeModal from '../components/AddEmployeeModal';

const AdminEmployees = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: employees = [], isLoading: initialLoading, isFetching } = useQuery({
    queryKey: ['admin', 'employees', debouncedSearch],
    queryFn: async () => {
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedSearch)}`);
      return res.data.employees || [];
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
    onError: () => toast.error('Failed to load employees'),
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]';
    if (s === 'on leave') return 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]';
    if (s === 'terminated' || s === 'resigned') return 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]';
    return 'bg-[#f1f3f4] text-[#444746] border-[#dadce0]';
  };

  if (initialLoading && !employees.length && !debouncedSearch) {
    return <PageLoader message="Loading Employees..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Google Header Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Staff Directory & Records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Employees <span className="font-medium italic text-[#1a73e8]">Directory</span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{employees.length} Total</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Manage organization members, departments, compensation, and access credentials.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 py-2.5 shadow-md shadow-[#4285F4]/25 hover:shadow-lg hover:shadow-[#4285F4]/30 transition-all cursor-pointer gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Main Table Card Container */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc] shadow-xs">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Employee Directory</h3>
              <p className="text-[11px] text-[#5f6368]">Full staff registry and active status</p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            {isFetching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            )}
            <input
              type="search"
              placeholder="Search by name, role, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </form>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-x-auto pb-32 min-h-[300px] relative">
          {initialLoading && employees.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-7 w-7 animate-spin text-[#4285F4]" />
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Employee ID</th>
                  <th className="px-5 py-3.5 text-center">Department</th>
                  <th className="px-5 py-3.5">Position</th>
                  <th className="px-5 py-3.5">Join Date</th>
                  <th className="px-5 py-3.5">Salary</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4]">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-[#5f6368]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-[#dadce0]" />
                        <p className="text-xs font-medium text-[#1f1f1f]">No employees found</p>
                        <p className="text-[11px] text-[#5f6368]">Try searching with a different keyword or add a new team member.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#f8fafd] transition-colors group">
                      {/* Name & Avatar */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs border border-[#d2e3fc] overflow-hidden shadow-xs">
                            {emp.avatar ? (
                              <img src={emp.avatar} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              getInitials(emp.firstName, emp.lastName)
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1f1f1f] text-xs">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[11px] text-[#5f6368]">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="px-5 py-3.5 align-middle font-medium text-[#444746] text-xs">
                        {emp.employeeId}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5 align-middle text-center">
                        <span className="inline-block text-center px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-[#f1f3f4] text-[#444746] leading-tight max-w-[160px]">
                          {emp.department || 'General'}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="px-5 py-3.5 align-middle text-[#444746] font-medium">
                        {emp.position || 'Staff'}
                      </td>

                      {/* Join Date */}
                      <td className="px-5 py-3.5 align-middle text-[#5f6368]">
                        {formatDate(emp.joinDate)}
                      </td>

                      {/* Salary */}
                      <td className="px-5 py-3.5 align-middle font-semibold text-[#1f1f1f]">
                        {formatCurrency(emp.salary)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5 align-middle text-center">
                        <span className={`inline-block text-center rounded-full border px-2.5 py-1 text-[10.5px] font-semibold leading-tight ${getStatusBadge(emp.status)}`}>
                          {emp.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions Dropdown */}
                      <td className="px-5 py-3.5 align-middle text-right relative group/dropdown">
                        <button
                          className="inline-flex items-center justify-center rounded-full w-7 h-7 text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                          aria-label="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <div className="absolute right-6 top-8 pt-1.5 w-44 z-50 text-left hidden group-hover/dropdown:block">
                          <div className="rounded-2xl border border-[#e0e3e7] bg-white p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
                            <button 
                              onClick={() => navigate(`/admin/employees/${emp.id}`)} 
                              className="w-full flex items-center px-3 py-2 text-xs font-medium text-[#1f1f1f] rounded-xl hover:bg-[#f8fafd] hover:text-[#1a73e8] transition-colors cursor-pointer gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#5f6368]" /> 
                              <span>View Profile</span>
                            </button>
                            <button 
                              onClick={() => navigate(`/admin/employees/${emp.id}/edit`)} 
                              className="w-full flex items-center px-3 py-2 text-xs font-medium text-[#1f1f1f] rounded-xl hover:bg-[#f8fafd] hover:text-[#1a73e8] transition-colors cursor-pointer gap-2"
                            >
                              <Edit className="w-3.5 h-3.5 text-[#5f6368]" /> 
                              <span>Edit Details</span>
                            </button>
                            <button 
                              onClick={() => navigate(`/admin/employees/${emp.id}/settings`)} 
                              className="w-full flex items-center px-3 py-2 text-xs font-medium text-[#1f1f1f] rounded-xl hover:bg-[#f8fafd] hover:text-[#1a73e8] transition-colors cursor-pointer gap-2"
                            >
                              <Settings className="w-3.5 h-3.5 text-[#5f6368]" /> 
                              <span>Security & Access</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
        }}
      />
    </div>
  );
};

export default AdminEmployees;
