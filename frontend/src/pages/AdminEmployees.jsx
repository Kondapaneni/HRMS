import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Eye, Edit, Settings, Loader2 } from 'lucide-react';
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

  const { data: employees = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'employees', debouncedSearch],
    queryFn: async () => {
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedSearch)}`);
      return res.data.employees || [];
    },
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
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'on leave') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s === 'terminated' || s === 'resigned') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your workforce</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-900">Employee List</h3>
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="search" 
              placeholder="Search employees..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm pl-9 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </form>
        </div>

        <div className="flex-1 overflow-x-auto pb-32 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="h-12 px-4 font-medium">Employee</th>
                  <th className="h-12 px-4 font-medium">Employee ID</th>
                  <th className="h-12 px-4 font-medium">Department</th>
                  <th className="h-12 px-4 font-medium">Position</th>
                  <th className="h-12 px-4 font-medium">Join Date</th>
                  <th className="h-12 px-4 font-medium">Salary</th>
                  <th className="h-12 px-4 font-medium">Status</th>
                  <th className="h-12 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-500">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 align-middle">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm border border-blue-200 overflow-hidden">
                            {emp.avatar ? (
                              <img src={emp.avatar} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              getInitials(emp.firstName, emp.lastName)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-slate-500">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-slate-700">{emp.employeeId}</td>
                      <td className="p-4 align-middle text-slate-700">{emp.department || '-'}</td>
                      <td className="p-4 align-middle text-slate-700">{emp.position || '-'}</td>
                      <td className="p-4 align-middle text-slate-700">{formatDate(emp.joinDate)}</td>
                      <td className="p-4 align-middle text-slate-700">{formatCurrency(emp.salary)}</td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(emp.status)}`}>
                          {emp.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right relative group/dropdown">
                        <button 
                          className="inline-flex items-center justify-center rounded-md w-8 h-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        <div className="absolute right-8 top-8 pt-2 w-48 z-50 text-left hidden group-hover/dropdown:block">
                          <div className="rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                            <button onClick={() => navigate(`/admin/employees/${emp.id}`)} className="w-full flex items-center px-2 py-2 text-sm text-slate-700 rounded-sm hover:bg-slate-100 transition-colors cursor-pointer">
                              <Eye className="w-4 h-4 mr-2 text-slate-400" /> View Details
                            </button>
                            <button onClick={() => navigate(`/admin/employees/${emp.id}/edit`)} className="w-full flex items-center px-2 py-2 text-sm text-slate-700 rounded-sm hover:bg-slate-100 transition-colors cursor-pointer">
                              <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit
                            </button>
                            <button onClick={() => navigate(`/admin/employees/${emp.id}/settings`)} className="w-full flex items-center px-2 py-2 text-sm text-slate-700 rounded-sm hover:bg-slate-100 transition-colors cursor-pointer">
                              <Settings className="w-4 h-4 mr-2 text-slate-400" /> Settings
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
