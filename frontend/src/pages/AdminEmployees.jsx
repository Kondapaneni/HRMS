import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { formatEmployeeId } from '../utils/employeeIdDisplay';
import { Search, Plus, MoreVertical, Eye, Edit, Settings, Loader2, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AddEmployeeModal from '../components/AddEmployeeModal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Avatar from '../components/ui/Avatar';
import SearchBar from '../components/ui/SearchBar';

const AdminEmployees = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: employees = [], isLoading: initialLoading, isFetching } = useQuery({
    queryKey: ['admin', 'employees', debouncedSearch],
    queryFn: async ({ signal }) => {
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedSearch)}`, { signal });
      return res.data.employees || [];
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000, // Reuse cached roster between quick tab switches
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderStatus = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return <StatusBadge status="Success">Active</StatusBadge>;
    if (s === 'on leave') return <StatusBadge status="Warning">On leave</StatusBadge>;
    if (s === 'terminated' || s === 'resigned') return <StatusBadge status="Danger">{status}</StatusBadge>;
    return <StatusBadge status="Neutral">{status || 'Inactive'}</StatusBadge>;
  };

  if (initialLoading && !employees.length && !debouncedSearch) {
    return <PageLoader message="Loading employees..." />;
  }

  return (
    <div className="space-y-5 w-full pb-8 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
              Employees directory
            </h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              {employees.length} total
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Manage organization members, departments, compensation, and access credentials
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-5 rounded-full font-medium text-xs justify-center shrink-0"
        >
          <Plus size={15} />
          <span>Add employee</span>
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[var(--line)] bg-[var(--surface-alt)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Staff roster</h3>
              <p className="text-[11px] text-[var(--muted)]">Active accounts and payroll registration</p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
            <SearchBar
              placeholder="Search by name, role, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              isFetching={isFetching}
            />
          </form>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-x-auto min-h-[300px] relative pb-28">
          {initialLoading && employees.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--brand-deep)]" />
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[13px] font-normal text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Employee ID</th>
                  <th className="px-5 py-3.5 text-center">Department</th>
                  <th className="px-5 py-3.5">Position</th>
                  <th className="px-5 py-3.5">Join date</th>
                  <th className="px-5 py-3.5">Salary</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] text-[13px]">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-[var(--muted)]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-[var(--muted)] opacity-30" />
                        <p className="text-xs font-medium text-[var(--text)]">No employees found</p>
                        <p className="text-[11px] text-[var(--muted)]">
                          Try searching with a different keyword or add a new team member
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-[var(--brand-tint)]/40 transition-colors group"
                    >
                      {/* Name & Avatar (14px rounded square avatar) */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${emp.firstName || ''} ${emp.lastName || ''}`}
                            src={emp.avatar}
                            size={38}
                            shape="square"
                            radius={14}
                          />
                          <div>
                            <p className="font-medium text-[var(--text)] text-xs">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[11px] text-[var(--muted)]">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="px-5 py-3.5 align-middle font-medium text-[var(--text-2)] text-xs">
                        {formatEmployeeId(emp.employeeId)}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5 align-middle text-center">
                        <span className="inline-block text-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-alt)] text-[var(--text-2)] leading-tight max-w-[160px]">
                          {emp.department || 'General'}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="px-5 py-3.5 align-middle text-[var(--text-2)] font-medium">
                        {emp.position || 'Staff'}
                      </td>

                      {/* Join Date */}
                      <td className="px-5 py-3.5 align-middle text-[var(--muted)]">
                        {formatDate(emp.joinDate)}
                      </td>

                      {/* Salary */}
                      <td className="px-5 py-3.5 align-middle font-medium text-[var(--text)]">
                        {emp.salary == null ? 'Restricted' : formatCurrency(emp.salary)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5 align-middle text-center">
                        {renderStatus(emp.status)}
                      </td>

                      {/* Actions Dropdown */}
                      <td className="px-5 py-3.5 align-middle text-right relative group/dropdown">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full w-8 h-8 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                          aria-label="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <div className="absolute right-6 top-8 pt-1.5 w-44 z-50 text-left hidden group-hover/dropdown:block">
                          <div className="rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[0_24px_60px_rgba(19,19,21,0.18)]">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/employees/${emp.id}`)}
                              className="w-full flex items-center px-3 py-2 text-xs font-medium text-[var(--text)] rounded-full hover:bg-[var(--brand-tint)] hover:text-[var(--brand-deep)] transition-colors cursor-pointer gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
                              <span>View profile</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/employees/${emp.id}/edit`)}
                              className="w-full flex items-center px-3 py-2 text-xs font-medium text-[var(--text)] rounded-full hover:bg-[var(--brand-tint)] hover:text-[var(--brand-deep)] transition-colors cursor-pointer gap-2"
                            >
                              <Edit className="w-3.5 h-3.5 text-[var(--muted)]" />
                              <span>Edit details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/employees/${emp.id}/settings`)}
                              className="w-full flex items-center px-3 py-2 text-xs font-medium text-[var(--text)] rounded-full hover:bg-[var(--brand-tint)] hover:text-[var(--brand-deep)] transition-colors cursor-pointer gap-2"
                            >
                              <Settings className="w-3.5 h-3.5 text-[var(--muted)]" />
                              <span>Security &amp; access</span>
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
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        }}
      />
    </div>
  );
};

export default AdminEmployees;
