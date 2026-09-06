import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Power, ShieldAlert, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  if (loading) return <PageLoader message="Loading Security Settings..." />;

  const isExit = ['Exited', 'Terminated', 'Absconded'].includes(settings.employmentStatus);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Security & Governance Controls</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
            Security Settings: <span className="font-normal italic text-[#1a73e8]">{empName}</span> <span className="text-xs font-medium text-[#5f6368] bg-[#f1f3f4] border border-[#e0e3e7] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{employeeData?.employeeId}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Configure authentication protocols, attendance geofence gates, and account lifecycles.
          </p>
        </div>

        <button
          onClick={() => navigate(`/admin/employees/${id}`)}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft size={14} />
          <span>Back To Employee</span>
        </button>
      </div>

      <div className="space-y-5">
        {/* Attendance Settings Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
              <Clock size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Attendance & Punch Gateways</h3>
              <p className="text-[11px] text-[#5f6368]">Web punches and physical geofence validations</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#1f1f1f]">Web Check-In / Check-Out Gateway</p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">When disabled, this employee cannot punch from desktop web browsers. Mobile app is unaffected.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('webAttendanceEnabled')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.webAttendanceEnabled ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${settings.webAttendanceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-[#f1f3f4]"></div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#1f1f1f]">Geo-Fence Radius Validation</p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">Requires the employee to be physically within the assigned branch geofence radius to punch attendance.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('geoFenceEnabled')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.geoFenceEnabled ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${settings.geoFenceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Access Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#137333] flex items-center justify-center border border-[#ceead6]">
              <Shield size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Account Security & MFA Protocols</h3>
              <p className="text-[11px] text-[#5f6368]">Authentication gates and access permissions</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[#1f1f1f]">Workspace Account Access</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${settings.isActive ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' : 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]'}`}>
                    {settings.isActive ? 'Active' : 'Blocked'}
                  </span>
                </div>
                <p className="text-[11px] text-[#5f6368] mt-0.5">When disabled, this employee is blocked from logging into the portal or mobile app immediately.</p>
              </div>
              <button
                type="button"
                onClick={handleStatusToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.isActive ? 'bg-[#34A853]' : 'bg-[#dadce0]'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${settings.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-[#f1f3f4]"></div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#1f1f1f]">Multi-Factor Authentication (MFA)</p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">Authorizes the employee to configure TOTP / Authenticator app multi-factor verification on their account.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('mfaEnabled')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.mfaEnabled ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${settings.mfaEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Employment Status Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#fef7e0] text-[#b06000] flex items-center justify-center border border-[#feefc3]">
              <Power size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Employment Lifecycle Status</h3>
              <p className="text-[11px] text-[#5f6368]">Manage offboarding, separation, or termination</p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1f1f1f]">Current Employment State</p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">Marking status as Exited, Terminated, or Absconded will automatically deactivate credentials.</p>

                {isExit && (
                  <div className="mt-3 p-3.5 bg-[#f8fafd] rounded-xl border border-[#e0e3e7] space-y-1.5">
                    <p className="text-xs font-medium text-[#1f1f1f]">
                      <span className="text-[#5f6368]">Effective Date:</span> <span className="font-semibold">{settings.employmentStatusDate || 'N/A'}</span>
                    </p>
                    <p className="text-xs font-medium text-[#1f1f1f]">
                      <span className="text-[#5f6368]">Exit Reason:</span> <span className="font-semibold">{settings.employmentStatusReason || 'N/A'}</span>
                    </p>
                  </div>
                )}
              </div>

              <select
                value={settings.employmentStatus}
                onChange={handleEmploymentStatusChange}
                className="w-full sm:w-44 rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] font-semibold focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none bg-white cursor-pointer shadow-xs shrink-0"
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

      {/* Exit Slideover Sidebar Drawer */}
      {showExitModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowExitModal(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm font-editorial antialiased"
          style={{ fontFamily: "'Newsreader', Georgia, serif" }}
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Top Red Warning Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#EA4335] via-[#FBBC05] to-[#EA4335] absolute top-0 left-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-[#EA4335] mb-0.5">
                  <AlertTriangle size={15} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider">Offboarding Confirmation</span>
                </div>
                <h2 className="text-lg font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
                  Confirm <span className="font-medium italic text-[#EA4335]">Employment Status</span>
                </h2>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  Marking employee as <strong className="text-[#EA4335] font-semibold">{pendingStatus}</strong>.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowExitModal(false)}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="exit-form" onSubmit={handleExitConfirm} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Effective Departure Date *</label>
                  <input required type="date" name="date" className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#EA4335] focus:ring-2 focus:ring-[#EA4335]/20 outline-none transition-all bg-white cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Reason / Departure Notes *</label>
                  <textarea required name="reason" rows="4" className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#EA4335] focus:ring-2 focus:ring-[#EA4335]/20 outline-none transition-all resize-none" placeholder="Provide context, resignation notes, or separation documentation..."></textarea>
                </div>

                <div className="p-3.5 bg-[#fce8e6]/60 border border-[#fad2cf] rounded-xl text-xs text-[#c5221f] leading-relaxed">
                  <strong>Notice:</strong> Submitting this change will immediately revoke the employee's system login permissions and deactivate their workspace account across all devices.
                </div>
              </form>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowExitModal(false)} 
                className="px-5 py-2 text-xs font-semibold border border-[#dadce0] rounded-full text-[#444746] bg-white hover:bg-[#f1f3f4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="exit-form"
                className="px-6 py-2 text-xs font-semibold rounded-full text-white bg-[#EA4335] hover:bg-[#d93025] shadow-md shadow-[#EA4335]/25 transition-all cursor-pointer"
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
