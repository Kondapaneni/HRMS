import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Power } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminEmployeeSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  const {
    data: employeeData,
    isLoading: loading
  } = useQuery({
    queryKey: ['admin', 'employee-settings', id],
    queryFn: async () => {
      const res = await api.get(`/admin/employees/${id}`);
      return res.data.employee;
    },
    enabled: !!id
  });

  const empName = employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : '';

  const settings = employeeData ? {
    webAttendanceEnabled: employeeData.webAttendanceEnabled === 1 || employeeData.webAttendanceEnabled === true,
    geoFenceEnabled: employeeData.geoFenceEnabled === 1 || employeeData.geoFenceEnabled === true,
    mfaEnabled: employeeData.mfaEnabled === 1 || employeeData.mfaEnabled === true,
    status: employeeData.status || 'active',
    isActive: employeeData.isActive === true || employeeData.isActive === 1,
    employmentStatus: employeeData.employmentStatus || 'Active',
    employmentStatusDate: employeeData.employmentStatusDate || '',
    employmentStatusReason: employeeData.employmentStatusReason || ''
  } : {
    webAttendanceEnabled: false,
    geoFenceEnabled: false,
    mfaEnabled: false,
    status: 'active',
    employmentStatus: 'Active',
    employmentStatusDate: '',
    employmentStatusReason: ''
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, extraData }) =>
      api.put(`/admin/employees/${id}/settings`, {
        [key]: value,
        ...extraData
      }),
    onMutate: async ({ key, value, extraData }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'employee-settings', id] });
      const previousEmployee = queryClient.getQueryData(['admin', 'employee-settings', id]);

      queryClient.setQueryData(['admin', 'employee-settings', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          [key]: value,
          ...extraData
        };
      });

      return { previousEmployee };
    },
    onError: (err, variables, context) => {
      if (context?.previousEmployee) {
        queryClient.setQueryData(['admin', 'employee-settings', id], context.previousEmployee);
      }
      toast.error('Failed to update setting');
      console.error(err);
    },
    onSuccess: () => {
      toast.success('Setting updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['admin', 'employee-settings', id]
      });
    }
  });

  const updateSetting = (key, value, extraData = {}) => {
    updateSettingMutation.mutate({ key, value, extraData });
  };

  const handleToggle = (key) => {
    updateSetting(key, !settings[key]);
  };

  const handleStatusToggle = () => {
    updateSetting('isActive', !settings.isActive);
  };

  const handleEmploymentStatusChange = (e) => {
    const newStatus = e.target.value;
    if (['Exited', 'Terminated', 'Absconded'].includes(newStatus)) {
      setPendingStatus(newStatus);
      setShowExitModal(true);
    } else {
      updateSetting('employmentStatus', 'Active', {
        status: 'active',
        isActive: true,
        employmentStatusDate: null,
        employmentStatusReason: null
      });
    }
  };

  const handleExitConfirm = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const date = fd.get('date');
    const reason = fd.get('reason');

    updateSetting('employmentStatus', pendingStatus, {
      status: 'inactive',
      isActive: false,
      employmentStatusDate: date,
      employmentStatusReason: reason
    });

    setShowExitModal(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const isExit = ['Exited', 'Terminated', 'Absconded'].includes(settings.employmentStatus);

  if (loading) return <PageLoader message="Loading Settings..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employee Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure attendance and security settings for {empName}</p>
        </div>
        <button
          onClick={() => navigate(`/admin/employees/${id}`)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Employee
        </button>
      </div>

      <div className="space-y-6">
        {/* Attendance Settings */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">Attendance Settings</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Show check-in/check-out on web</p>
                <p className="text-sm text-slate-500 mt-1">When disabled, the web attendance page will hide the buttons. Mobile is unaffected.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('webAttendanceEnabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.webAttendanceEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.webAttendanceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Enable Geo-Fence Validation</p>
                <p className="text-sm text-slate-500 mt-1">When enabled, check-in/check-out will only be allowed from within configured geo-fence locations.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('geoFenceEnabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.geoFenceEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.geoFenceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Employment Status */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Power className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">Employment Status</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
              <div className="flex-1">
                <p className="font-medium text-slate-900">Current Employment Status</p>
                <p className="text-sm text-slate-500 mt-1">Setting status to Exited, Terminated, or Absconded will automatically disable account access.</p>

                {isExit && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <p className="text-sm"><span className="text-slate-500">Date:</span> <span className="font-medium text-slate-900">{settings.employmentStatusDate}</span></p>
                    <p className="text-sm"><span className="text-slate-500">Reason:</span> <span className="font-medium text-slate-900">{settings.employmentStatusReason}</span></p>
                  </div>
                )}
              </div>
              <select
                value={settings.employmentStatus}
                onChange={handleEmploymentStatusChange}
                className="w-full sm:w-48 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Exited">Exited</option>
                <option value="Terminated">Terminated</option>
                <option value="Absconded">Absconded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">Security Settings</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Employee account access</p>
                <p className="text-sm text-slate-500 mt-1 mb-2">When enabled, the employee can sign in. When disabled, sign-in is blocked.</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${settings.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Current status: {settings.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStatusToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.isActive ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Allow MFA for this employee</p>
                <p className="text-sm text-slate-500 mt-1">When enabled, the employee can set up MFA from their settings page.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('mfaEnabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.mfaEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.mfaEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Modal */}
      {showExitModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleExitConfirm}>
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Confirm Employment Status Change</h2>
                <p className="text-sm text-slate-500 mt-1">You are marking this employee as <strong className="text-slate-900">{pendingStatus}</strong>.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Date <span className="text-red-500">*</span></label>
                  <input required type="date" name="date" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Reason <span className="text-red-500">*</span></label>
                  <textarea required name="reason" rows="3" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" placeholder="Enter reason..."></textarea>
                </div>
              </div>
              <div className="p-6 pt-0 flex justify-end gap-3 bg-slate-50">
                <button type="button" onClick={() => setShowExitModal(false)} className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 mt-6 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 mt-6 cursor-pointer">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminEmployeeSettings;
