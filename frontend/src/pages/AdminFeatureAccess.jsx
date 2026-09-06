import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import {
  Shield,
  Edit2,
  Search,
  X,
  Users,
  Check,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  DollarSign,
  GraduationCap,
  Layers,
  UserCheck,
  Sparkles,
  RefreshCw,
  Award,
  Package,
  Clock,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const featuresList = [
  {
    key: 'canEmployees',
    title: 'Employee Manager',
    category: 'Core HRMS',
    icon: Users,
    description: 'Permissions to onboard staff, edit employment profiles, view identity documents, and manage directory records.'
  },
  {
    key: 'canAttendance',
    title: 'Attendance Manager',
    category: 'Core HRMS',
    icon: Clock,
    description: 'Permissions to manage daily biometric punch logs, configure office geofencing, and approve attendance regularizations.'
  },
  {
    key: 'canLeave',
    title: 'Leave Manager',
    category: 'Core HRMS',
    icon: Calendar,
    description: 'Permissions to oversee organizational leave policies, annual quotas, and approve/reject employee time-off requests.'
  },
  {
    key: 'canPayroll',
    title: 'Payroll & Compensation Manager',
    category: 'Core HRMS',
    icon: DollarSign,
    description: 'Permissions to execute monthly bulk payroll cycles, generate payslips, and review employee expense claims.'
  },
  {
    key: 'canAssets',
    title: 'Asset & Hardware Manager',
    category: 'Core HRMS',
    icon: Package,
    description: 'Permissions to register corporate inventory, manage device allocations, and track physical assets assigned to employees.'
  },
  {
    key: 'canRecruitment',
    title: 'Recruitment & ATS Manager',
    category: 'Core HRMS',
    icon: Briefcase,
    description: 'Permissions to publish job openings, review candidate resumes, schedule interviews, and verify pre-boarding documents.'
  },
  {
    key: 'canAdminAssessments',
    title: 'Assessment & LMS Manager',
    category: 'Assessments & LMS',
    icon: GraduationCap,
    description: 'Administrative access to curate MCQ question banks, build timed assessments, assign courses, and publish scorecards.'
  },
  {
    key: 'canLoanOrigination',
    title: 'Loan Origination',
    category: 'Business Apps',
    icon: CreditCard,
    description: 'Grants access to underwriting, credit appraisal, and applicant lead management in the Acme Loans Origination portal.'
  },
  {
    key: 'canSalesOrigination',
    title: 'Sales Origination',
    category: 'Business Apps',
    icon: Building2,
    description: 'Grants access to merchant pipelines, field distribution metrics, and lead onboarding in the Acme Sales module.'
  },
  {
    key: 'canBranchOperations',
    title: 'Branch Operations Manager',
    category: 'Business Apps',
    icon: Layers,
    description: 'Grants access to regional branch management, cashier counters, and localized transaction approvals.'
  }
];

const AdminFeatureAccess = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Modal / Drawer State
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [modalSearch, setModalSearch] = useState('');
  const [tempSelection, setTempSelection] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const {
    data: users = [],
    isLoading: loading,
    refetch
  } = useQuery({
    queryKey: ['admin', 'feature-access'],
    queryFn: async () => {
      const response = await api.get('/admin/feature-access');
      return response.data;
    }
  });

  const saveRolesMutation = useMutation({
    mutationFn: async (changes) => {
      await Promise.all(
        changes.map(change =>
          api.post('/admin/feature-access', {
            userId: change.userId,
            feature: change.feature,
            value: change.value
          })
        )
      );
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'feature-access'] });
      const previousUsers = queryClient.getQueryData(['admin', 'feature-access']);

      queryClient.setQueryData(['admin', 'feature-access'], (old) => {
        if (!old) return old;
        return old.map(u => {
          const change = changes.find(c => c.userId === u.id);
          if (change) {
            return { ...u, [change.feature]: change.value };
          }
          return u;
        });
      });

      return { previousUsers };
    },
    onError: (err, changes, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['admin', 'feature-access'], context.previousUsers);
      }
      toast.error('Failed to update some user roles.');
    },
    onSuccess: () => {
      toast.success('Feature manager roles updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-access'] });
    }
  });

  const openManageModal = (feature) => {
    const currentlyAssigned = users.filter(u => u[feature.key]).map(u => u.id);
    setTempSelection(new Set(currentlyAssigned));
    setSelectedFeature(feature);
    setModalSearch('');
  };

  const handleToggleUser = (userId) => {
    const newSelection = new Set(tempSelection);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setTempSelection(newSelection);
  };

  const handleSaveModal = async () => {
    setSaving(true);
    const featureKey = selectedFeature.key;

    const currentlyAssigned = new Set(users.filter(u => u[featureKey]).map(u => u.id));
    const changes = [];

    users.forEach(u => {
      const isCurrentlyAssigned = currentlyAssigned.has(u.id);
      const isNowAssigned = tempSelection.has(u.id);

      if (isCurrentlyAssigned !== isNowAssigned) {
        changes.push({ userId: u.id, feature: featureKey, value: isNowAssigned });
      }
    });

    if (changes.length === 0) {
      setSelectedFeature(null);
      setSaving(false);
      return;
    }

    try {
      await saveRolesMutation.mutateAsync(changes);
      setSelectedFeature(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'U';
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalRoles = featuresList.length;
    const managersSet = new Set();
    featuresList.forEach(f => {
      users.forEach(u => {
        if (u[f.key]) managersSet.add(u.id);
      });
    });
    const delegatedManagers = managersSet.size;
    const coreCount = featuresList.filter(f => f.category === 'Core HRMS').length;
    const businessAppsCount = featuresList.filter(f => f.category === 'Business Apps').length;

    return { totalRoles, delegatedManagers, coreCount, businessAppsCount };
  }, [users]);

  // Filtered features list
  const filteredFeatures = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return featuresList.filter(f => {
      const matchCategory = categoryFilter === 'All' || f.category === categoryFilter;
      if (!matchCategory) return false;

      if (!q) return true;

      // Check role title, description, or category
      const matchRole =
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q);

      if (matchRole) return true;

      // Check if any manager assigned to this feature matches the search (name, email, code, department)
      const matchEmployee = users.some(u => {
        if (!u[f.key]) return false;
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const code = (u.employeeCode || u.employeeId || '').toString().toLowerCase();
        const dept = (u.department || '').toLowerCase();
        return fullName.includes(q) || email.includes(q) || code.includes(q) || dept.includes(q);
      });

      return matchEmployee;
    });
  }, [searchFilter, categoryFilter, users]);

  const filteredUsersForModal = useMemo(() => {
    const q = modalSearch.toLowerCase().trim();
    return users.filter(u => {
      if (!q) return true;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const code = (u.employeeCode || u.employeeId || '').toString().toLowerCase();
      const dept = (u.department || '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [users, modalSearch]);

  if (loading) return <PageLoader message="Loading Feature Roles..." />;

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Access Control &amp; RBAC</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Feature Access &amp; <span className="font-medium italic text-[#1a73e8]">Manager Roles</span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{featuresList.length} Roles</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Delegate granular module managerial permissions across employees without granting global superadmin status.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#5f6368]" />
          <span>Refresh Roles</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Feature Roles"
          value={stats.totalRoles}
          subtitle="Configured Permission Modules"
          icon={Shield}
          colorTheme="blue"
        />
        <StatCard
          title="Delegated Staff"
          value={stats.delegatedManagers}
          subtitle="Distinct Managers Assigned"
          icon={UserCheck}
          colorTheme="green"
        />
        <StatCard
          title="Core HRMS Roles"
          value={stats.coreCount}
          subtitle="Payroll, Leaves, Attendance"
          icon={Layers}
          colorTheme="purple"
        />
        <StatCard
          title="Business Apps"
          value={stats.businessAppsCount}
          subtitle="Loans, Sales, & Branch Ops"
          icon={Building2}
          colorTheme="amber"
        />
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col lg:flex-row gap-3 items-center justify-between">

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
            {['All', 'Core HRMS', 'Assessments & LMS', 'Business Apps'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${categoryFilter === cat
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            <input
              type="search"
              placeholder="Search roles, scopes, or employee name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>
        </div>

        {/* Roles Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 w-1/3 min-w-[260px] whitespace-nowrap">Feature Role &amp; Scope</th>
                <th className="px-5 py-3.5 min-w-[200px] whitespace-nowrap">Assigned Managers</th>
                <th className="px-5 py-3.5 text-center w-36 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e3e7]">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-12 text-center text-[#5f6368]">
                    <Shield className="w-12 h-12 text-[#dadce0] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#1f1f1f]">No feature roles found</p>
                    <p className="text-xs text-[#5f6368] mt-0.5">Try adjusting your search query or category filter.</p>
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((feature) => {
                  const Icon = feature.icon;
                  const assignedUsers = users.filter(u => u[feature.key]);

                  return (
                    <tr key={feature.key} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8] shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h3 className="font-semibold text-xs text-[#1f1f1f] whitespace-nowrap">{feature.title}</h3>
                              <span className="text-[10px] font-semibold text-[#5f6368] bg-[#f1f3f4] border border-[#dadce0] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 inline-block">
                                {feature.category}
                              </span>
                            </div>
                            <p className="text-[#5f6368] text-[11px] leading-relaxed max-w-md">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="flex flex-wrap gap-2 items-center">
                          {assignedUsers.length === 0 ? (
                            <span className="text-xs text-[#5f6368] italic bg-[#f8fafd] border border-dashed border-[#dadce0] px-3 py-1 rounded-full whitespace-nowrap">
                              No managers assigned
                            </span>
                          ) : (
                            assignedUsers.map(u => (
                              <div
                                key={u.id}
                                className="inline-flex items-center gap-1.5 bg-white border border-[#dadce0] rounded-full pl-1 pr-2.5 py-0.5 shadow-2xs text-xs whitespace-nowrap shrink-0"
                              >
                                <div className="w-5 h-5 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {getInitials(u.firstName, u.lastName)}
                                </div>
                                <span className="font-semibold text-[#1f1f1f] text-[11px] whitespace-nowrap">
                                  {u.firstName} {u.lastName}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center align-middle whitespace-nowrap">
                        <button
                          onClick={() => openManageModal(feature)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] transition-all cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Manage ({assignedUsers.length})</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slideover Right Drawer: Manage Users (createPortal) */}
      {selectedFeature && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => !saving && setSelectedFeature(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

              {/* Header */}
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
                      Manage <span className="font-medium italic text-[#1a73e8]">{selectedFeature.title.endsWith('Manager') ? `${selectedFeature.title}s` : selectedFeature.title}</span>
                    </h3>
                    <p className="text-xs text-[#5f6368] line-clamp-1">Select staff who should have this permission</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setSelectedFeature(null)}
                  className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search and Toggles */}
              <div className="p-4 border-b border-[#e0e3e7] bg-white space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368]" />
                  <input
                    type="search"
                    placeholder="Search staff by name or email..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#f1f3f4] focus:bg-white border border-[#dadce0] rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#5f6368] font-medium">
                    {tempSelection.size} staff member(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTempSelection(new Set(users.map(u => u.id)))}
                      className="text-[#1a73e8] font-semibold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[#dadce0]">•</span>
                    <button
                      type="button"
                      onClick={() => setTempSelection(new Set())}
                      className="text-[#5f6368] font-semibold hover:underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              </div>

              {/* Staff List Body */}
              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-1.5">
                {filteredUsersForModal.length === 0 ? (
                  <p className="text-xs text-[#5f6368] p-4 text-center">No staff found matching search.</p>
                ) : (
                  filteredUsersForModal.map(u => {
                    const isSelected = tempSelection.has(u.id);

                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${isSelected
                            ? 'bg-[#e8f0fe] border-[#4285F4] shadow-2xs'
                            : 'bg-white border-[#e0e3e7] hover:border-[#dadce0]'
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleToggleUser(u.id)}
                        />
                        <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(u.firstName, u.lastName)}
                        </div>
                        <div className="flex-1 truncate text-xs">
                          <p className="font-semibold text-[#1f1f1f] truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-[#5f6368] truncate">{u.email} • <span className="capitalize">{u.role || 'Staff'}</span></p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFeature(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Saving Roles...</span>
                    </>
                  ) : (
                    <span>Save Roles</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminFeatureAccess;
