import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { Shield, Edit2, Search, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const featuresList = [
  {
    key: 'canAssets',
    title: 'Asset Manager',
    description: 'An asset manager has all the permissions to manage the assets in the organization.'
  },
  {
    key: 'canAttendance',
    title: 'Attendance Manager',
    description: 'An attendance manager has all permissions to manage attendance records and regularization.'
  },
  {
    key: 'canEmployees',
    title: 'Employee Manager',
    description: 'An employee manager has all permissions to manage employee profiles and documents.'
  },
  {
    key: 'canLeave',
    title: 'Leave Manager',
    description: 'A leave manager has all permissions to manage leave policies and requests.'
  },
  {
    key: 'canPayroll',
    title: 'Payroll Manager',
    description: 'A payroll manager has all permissions to manage payroll and expenses of all employees.'
  },
  {
    key: 'canRecruitment',
    title: 'Recruitment Manager',
    description: 'A recruitment manager has all permissions to manage job postings and candidates.'
  },
  {
    key: 'canChat',
    title: 'Secure Chat Access',
    description: 'Grant access to the Secure Chat module.'
  },
  {
    key: 'canLoanOrigination',
    title: 'Loan Origination Access',
    description: 'Grant access to the Loan Origination module in Acme Loans.'
  },
  {
    key: 'canAdminAssessments',
    title: 'Admin Exam & Assessment Manager',
    description: 'Grants administrative access to build MCQ question banks, configure exams, and assign them.'
  },
  {
    key: 'canEmployeeAssessments',
    title: 'Employee Assessment Access',
    description: 'Grants access to the Employee Assessment portal to view and attempt assigned exams.'
  }
];

const AdminFeatureAccess = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Modal State
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [modalSearch, setModalSearch] = useState('');
  const [tempSelection, setTempSelection] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const {
    data: users = [],
    isLoading: loading
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
      toast.error('Failed to update some users. Refreshing data.');
    },
    onSuccess: () => {
      toast.success('User roles updated successfully.');
      queryClient.invalidateQueries({
        queryKey: ['admin', 'feature-access']
      });
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

    // Determine which users changed
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
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  };

  const filteredUsersForModal = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(modalSearch.toLowerCase()) || (u.email && u.email.toLowerCase().includes(modalSearch.toLowerCase()));
  });

  if (loading) return <PageLoader message="Loading Feature Access..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Feature Access Roles
        </h1>
        <p className="text-slate-500 mt-1">Assign and manage roles across your organization.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading roles...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-6 w-1/3">User Roles</th>
                <th className="py-4 px-6">Scope and Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {featuresList.map(feature => {
                const assignedUsers = users.filter(u => u[feature.key]);

                return (
                  <tr key={feature.key} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-6 align-top">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-base">{feature.title}</h3>
                        <button
                          onClick={() => openManageModal(feature)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <p className="text-slate-500 leading-relaxed text-sm pr-4">
                        {feature.description}
                      </p>
                    </td>
                    <td className="py-6 px-6 align-top">
                      <div className="text-sm font-medium text-slate-700 mb-4">Across all employees</div>

                      <div className="flex flex-wrap gap-3 mb-4">
                        {assignedUsers.length === 0 ? (
                          <span className="text-slate-400 italic text-sm">No users assigned</span>
                        ) : (
                          assignedUsers.map(u => (
                            <div key={u.id} className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full pr-3 pl-1 py-1">
                              <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center">
                                {getInitials(u.firstName, u.lastName)}
                              </div>
                              <span className="text-sm font-medium text-slate-700">
                                {u.firstName} {u.lastName}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        onClick={() => openManageModal(feature)}
                        className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors text-sm"
                      >
                        Manage Users
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Manage Users Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Manage {selectedFeature.title}s</h2>
                <p className="text-sm text-slate-500">Select users who should have this role.</p>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredUsersForModal.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No users found.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredUsersForModal.map(u => (
                      <label key={u.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={tempSelection.has(u.id)}
                          onChange={() => handleToggleUser(u.id)}
                          className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                            {getInitials(u.firstName, u.lastName)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{u.firstName} {u.lastName}</div>
                            <div className="text-sm text-slate-500">{u.email} • {u.role}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedFeature(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save Roles'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeatureAccess;
