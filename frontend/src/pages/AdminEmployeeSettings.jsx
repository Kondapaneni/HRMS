import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Power, X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useRemoteData, useRemoteTask, useRefreshControl } from '../state/remote.js';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';

const AdminEmployeeSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const refreshControl = useRefreshControl();

  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  const { data: employeeData, isLoading: loading } = useRemoteData({
    scope: ['admin', 'employee-settings', id],
    load: async () => {
      const res = await api.get(`/admin/employees/${id}`);
      return res.data.employee;
    },
    enabled: !!id
  });

  const empName = employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : '';

  const settings = employeeData
    ? {
        webAttendanceEnabled:
          employeeData.webAttendanceEnabled === 1 || employeeData.webAttendanceEnabled === true,
        geoFenceEnabled:
          employeeData.geoFenceEnabled === 1 || employeeData.geoFenceEnabled === true,
        mfaEnabled: employeeData.mfaEnabled === 1 || employeeData.mfaEnabled === true,
        status: employeeData.status || 'active',
        isActive: employeeData.isActive === true || employeeData.isActive === 1,
        employmentStatus: employeeData.employmentStatus || 'Active',
        employmentStatusDate: employeeData.employmentStatusDate || '',
        employmentStatusReason: employeeData.employmentStatusReason || ''
      }
    : {
        webAttendanceEnabled: false,
        geoFenceEnabled: false,
        mfaEnabled: false,
        status: 'active',
        employmentStatus: 'Active',
        employmentStatusDate: '',
        employmentStatusReason: ''
      };

  const updateSettingMutation = useRemoteTask({
    run: async ({ key, value, extraData }) =>
      api.put(`/admin/employees/${id}/settings`, {
        [key]: value,
        ...extraData
      }),
    onMutate: async ({ key, value, extraData }) => {
      await refreshControl.cancel({ scope: ['admin', 'employee-settings', id] });
      const previousEmployee = refreshControl.peek(['admin', 'employee-settings', id]);

      refreshControl.update(['admin', 'employee-settings', id], (old) => {
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
        refreshControl.update(['admin', 'employee-settings', id], context.previousEmployee);
      }
      toast.error('Failed to update setting');
      console.error(err);
    },
    onSuccess: () => {
      toast.success('Setting updated successfully');
      refreshControl.refresh({
        scope: ['admin', 'employee-settings', id]
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

  if (loading) return <PageLoader message="Loading security settings..." />;

  const isExit = ['Exited', 'Terminated', 'Absconded'].includes(settings.employmentStatus);

  return (
    <div className="space-y-5 w-full pb-12 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
              Security settings: {empName}
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)]">
              {employeeData?.employeeId}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Configure authentication protocols, attendance geofence gates, and account lifecycles
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate(`/admin/employees/${id}`)}
          className="h-9 px-4 rounded-full font-medium text-xs justify-center shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft size={14} />
          <span>Back to profile</span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Attendance Settings Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
          <div className="pb-3 border-b border-[var(--line)] flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Clock size={15} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Attendance &amp; punch gateways</h3>
              <p className="text-[11px] text-[var(--muted)]">Web punches and physical geofence validations</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[var(--text)]">Web check-in / check-out gateway</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  When disabled, this employee cannot punch from desktop web browsers. Mobile app is unaffected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('webAttendanceEnabled')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.webAttendanceEnabled ? 'bg-[var(--brand)]' : 'bg-[var(--line)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.webAttendanceEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="h-px bg-[var(--line)]" />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[var(--text)]">Geo-fence radius validation</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Requires the employee to be physically within the assigned branch geofence radius to punch attendance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('geoFenceEnabled')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.geoFenceEnabled ? 'bg-[var(--brand)]' : 'bg-[var(--line)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.geoFenceEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Access Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
          <div className="pb-3 border-b border-[var(--line)] flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Shield size={15} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Account security &amp; MFA protocols</h3>
              <p className="text-[11px] text-[var(--muted)]">Authentication gates and access permissions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-[var(--text)]">Workspace account access</p>
                  {settings.isActive ? (
                    <StatusBadge status="Success">Active</StatusBadge>
                  ) : (
                    <StatusBadge status="Danger">Blocked</StatusBadge>
                  )}
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  When disabled, this employee is blocked from logging into the portal or mobile app immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStatusToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.isActive ? 'bg-[#1F9D55]' : 'bg-[var(--line)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="h-px bg-[var(--line)]" />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[var(--text)]">Multi-factor authentication (MFA)</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Authorizes the employee to configure TOTP / Authenticator app multi-factor verification on their account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('mfaEnabled')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.mfaEnabled ? 'bg-[var(--brand)]' : 'bg-[var(--line)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.mfaEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Employment Status Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
          <div className="pb-3 border-b border-[var(--line)] flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center">
              <Power size={15} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Employment lifecycle status</h3>
              <p className="text-[11px] text-[var(--muted)]">Manage offboarding, separation, or termination</p>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)]">Current employment state</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Marking status as Exited, Terminated, or Absconded will automatically deactivate credentials.
                </p>

                {isExit && (
                  <div className="mt-3 p-3 bg-[var(--surface-alt)] rounded-[12px] space-y-1">
                    <p className="text-xs text-[var(--text)]">
                      <span className="text-[var(--muted)]">Effective date:</span>{' '}
                      <span className="font-medium">{settings.employmentStatusDate || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-[var(--text)]">
                      <span className="text-[var(--muted)]">Exit reason:</span>{' '}
                      <span className="font-medium">{settings.employmentStatusReason || 'N/A'}</span>
                    </p>
                  </div>
                )}
              </div>

              <select
                value={settings.employmentStatus}
                onChange={handleEmploymentStatusChange}
                className="w-full sm:w-44 h-10 rounded-[12px] border border-[var(--line)] px-3 text-xs text-[var(--text)] font-medium focus:border-[var(--brand)] outline-none bg-[var(--surface)] cursor-pointer shrink-0"
              >
                <option value="Active">Active</option>
                <option value="Exited">Exited</option>
                <option value="Terminated">Terminated</option>
                <option value="Absconded">Absconded</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Slideover Drawer */}
      {showExitModal &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowExitModal(false);
            }}
            className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs antialiased"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">Offboarding Confirmation</span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                    Confirm Employment Status
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <form id="exit-form" onSubmit={handleExitConfirm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                      Effective departure date *
                    </label>
                    <input
                      required
                      type="date"
                      name="date"
                      className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] outline-none bg-[var(--surface)] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                      Reason / departure notes *
                    </label>
                    <textarea
                      required
                      name="reason"
                      rows={4}
                      className="w-full p-3 rounded-[12px] border border-[var(--line)] text-xs text-[var(--text)] focus:border-[var(--brand)] outline-none resize-none bg-[var(--surface)]"
                      placeholder="Provide context, resignation notes, or separation documentation..."
                    />
                  </div>

                  <div className="p-3.5 bg-[#FDE8EA] rounded-[12px] text-xs text-[#D64550] leading-relaxed">
                    <strong>Notice:</strong> Submitting this change will immediately revoke the employee's system login
                    permissions and deactivate their workspace account across all devices.
                  </div>
                </form>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="exit-form"
                  className="px-6 py-2 text-xs font-semibold text-white bg-[#D64550] hover:bg-[#b83540] rounded-full shadow-xs transition-all cursor-pointer"
                >
                  Confirm Offboarding
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminEmployeeSettings;
