import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import SearchBar from '../components/ui/SearchBar';
import {
  Shield,
  Search,
  X,
  Users,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  DollarSign,
  GraduationCap,
  Layers,
  UserCheck,
  Package,
  Clock,
  UserPlus,
  Loader2,
  Receipt
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatCard, Button, Avatar } from '../components/ui';

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
    title: 'Payroll Manager',
    category: 'Core HRMS',
    icon: DollarSign,
    description: 'Permissions to execute monthly bulk payroll cycles, generate payslips, and manage compensation.'
  },
  {
    key: 'canExpenses',
    title: 'Expenses Manager',
    category: 'Core HRMS',
    icon: Receipt,
    description: 'Permissions to review, audit, approve, and decline employee expense reimbursement claims.'
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
    isLoading: loading
  } = useQuery({
    queryKey: ['admin', 'feature-access'],
    queryFn: async () => {
      const response = await api.get('/admin/feature-access');
      return response.data?.users || response.data?.data || (Array.isArray(response.data) ? response.data : []);
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

      const matchRole =
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q);

      if (matchRole) return true;

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
    <div className="space-y-4 font-sans antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Feature Access &amp; Manager Roles
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Delegate granular module managerial permissions across employees without granting global superadmin status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {featuresList.length} Roles
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Feature Roles"
          value={stats.totalRoles}
          subtitle="Configured Permission Modules"
          icon={Shield}
        />
        <StatCard
          title="Delegated Staff"
          value={stats.delegatedManagers}
          subtitle="Distinct Managers Assigned"
          badgeText="Active"
          badgeType="success"
          icon={UserCheck}
        />
        <StatCard
          title="Core HRMS Roles"
          value={stats.coreCount}
          subtitle="Payroll, Leaves, Attendance"
          badgeText="HRMS"
          badgeType="info"
          icon={Layers}
        />
        <StatCard
          title="Business Apps"
          value={stats.businessAppsCount}
          subtitle="Loans, Sales, & Branch Ops"
          badgeText="Apps"
          badgeType="warning"
          icon={Building2}
        />
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col">
        <div className="pb-4 border-b border-[var(--line)] flex flex-col lg:flex-row gap-3 items-center justify-between mb-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
            {['All', 'Core HRMS', 'Assessments & LMS', 'Business Apps'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[var(--ink)] text-white shadow-xs'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <SearchBar
            placeholder="Search roles, scopes, or employee name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            wrapperClassName="w-full lg:w-80 shrink-0"
          />
        </div>

        {/* Roles Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="px-4 py-3 font-normal text-xs w-1/3 min-w-[260px] whitespace-nowrap">Feature Role &amp; Scope</th>
                <th className="px-4 py-3 font-normal text-xs min-w-[200px] whitespace-nowrap">Assigned Managers</th>
                <th className="px-4 py-3 font-normal text-xs text-center w-36 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-12 text-center text-[var(--muted)]">
                    <Shield className="w-12 h-12 text-[var(--icon-muted)] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[var(--text)]">No feature roles found</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Try adjusting your search query or category filter.</p>
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((feature) => {
                  const Icon = feature.icon;
                  const assignedUsers = users.filter(u => u[feature.key]);

                  return (
                    <tr key={feature.key} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h3 className="font-semibold text-xs text-[var(--text)] whitespace-nowrap">{feature.title}</h3>
                              <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-[6px] whitespace-nowrap shrink-0 inline-block">
                                {feature.category}
                              </span>
                            </div>
                            <p className="text-[var(--text-2)] text-[11px] leading-relaxed max-w-md">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-wrap gap-2 items-center">
                          {assignedUsers.length === 0 ? (
                            <span className="text-xs text-[var(--muted)] italic bg-[var(--surface-alt)] border border-dashed border-[var(--line)] px-3 py-1 rounded-full whitespace-nowrap">
                              No managers assigned
                            </span>
                          ) : (
                            assignedUsers.map(u => (
                              <div
                                key={u.id}
                                className="inline-flex items-center gap-1.5 bg-[var(--surface-alt)] rounded-full pl-1 pr-2.5 py-0.5 text-xs whitespace-nowrap shrink-0"
                              >
                                <Avatar name={`${u.firstName || ''} ${u.lastName || ''}`} size="xs" />
                                <span className="font-semibold text-[var(--text)] text-[11px] whitespace-nowrap">
                                  {u.firstName} {u.lastName}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openManageModal(feature)}
                          className="text-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          <span>Manage ({assignedUsers.length})</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slideover Right Drawer: Manage Users */}
      {selectedFeature && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden font-sans antialiased">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => !saving && setSelectedFeature(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] flex flex-col animate-in slide-in-from-right duration-200">
              {/* Header */}
              <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
                <div>
                  <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                    ROLE DELEGATION
                  </span>
                  <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                    Manage {selectedFeature.title.endsWith('Manager') ? `${selectedFeature.title}s` : selectedFeature.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setSelectedFeature(null)}
                  className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search and Toggles */}
              <div className="p-4 border-b border-[var(--line)] bg-[var(--surface)] space-y-2.5">
                <SearchBar
                  placeholder="Search staff by name or email..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[var(--muted)] font-medium">
                    {tempSelection.size} staff member(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTempSelection(new Set(users.map(u => u.id)))}
                      className="text-[var(--brand-deep)] font-semibold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--line)]">•</span>
                    <button
                      type="button"
                      onClick={() => setTempSelection(new Set())}
                      className="text-[var(--muted)] font-semibold hover:underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              </div>

              {/* User Checklist */}
              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-1.5">
                {filteredUsersForModal.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] p-4 text-center">No matching staff members found.</p>
                ) : (
                  filteredUsersForModal.map(u => {
                    const isSelected = tempSelection.has(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleUser(u.id)}
                        className={`p-3 rounded-[16px] border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--brand-tint)] border-[var(--brand)] text-[var(--brand-deep)]'
                            : 'bg-[var(--surface)] border-[var(--line)] hover:bg-[var(--surface-alt)] text-[var(--text)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={`${u.firstName || ''} ${u.lastName || ''}`} size="sm" />
                          <div>
                            <p className="font-semibold text-xs text-[var(--text)]">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-[11px] text-[var(--muted)]">
                              {u.employeeCode || u.employeeId || 'ID'} • {u.department || 'General'}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[var(--brand-deep)] border-[var(--brand-deep)] text-white'
                            : 'border-[var(--line)] bg-[var(--surface)]'
                        }`}>
                          {isSelected && <span className="text-xs font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => !saving && setSelectedFeature(null)}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={saving}
                  className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Permissions</span>
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