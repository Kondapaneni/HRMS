import React, { useState, useEffect } from 'react';
import { Save, Shield, Info, BookOpen, ExternalLink, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminSettings = () => {
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    sessionTimeout: '30',
    loginRateLimitAttempts: 5,
    loginRateLimitWindow: 15,
    forgotPasswordRateLimitAttempts: 3,
    forgotPasswordRateLimitWindow: 60,
    mapsRateLimitAttempts: 5,
    mapsRateLimitWindow: 10,
  });

  const { isLoading: loading, data: fetchedSettings } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      const response = await api.get('/admin/settings');
      return response.data;
    }
  });

  useEffect(() => {
    if (fetchedSettings && fetchedSettings.session_timeout) {
      setSettings({
        sessionTimeout: fetchedSettings.session_timeout || '30',
        loginRateLimitAttempts: fetchedSettings.login_rate_limit_attempts || 5,
        loginRateLimitWindow: fetchedSettings.login_rate_limit_window || 15,
        forgotPasswordRateLimitAttempts: fetchedSettings.forgot_password_rate_limit_attempts || 3,
        forgotPasswordRateLimitWindow: fetchedSettings.forgot_password_rate_limit_window || 60,
        mapsRateLimitAttempts: fetchedSettings.maps_rate_limit_attempts || 5,
        mapsRateLimitWindow: fetchedSettings.maps_rate_limit_window || 10,
      });
    }
  }, [fetchedSettings]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings) => {
      const response = await api.post('/admin/settings', newSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      session_timeout: settings.sessionTimeout,
      login_rate_limit_attempts: settings.loginRateLimitAttempts,
      login_rate_limit_window: settings.loginRateLimitWindow,
      forgot_password_rate_limit_attempts: settings.forgotPasswordRateLimitAttempts,
      forgot_password_rate_limit_window: settings.forgotPasswordRateLimitWindow,
      maps_rate_limit_attempts: settings.mapsRateLimitAttempts,
      maps_rate_limit_window: settings.mapsRateLimitWindow
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl">
      {/* Main Settings Column */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage global configuration and security settings for Acme HRMS</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSave}>
            <div className="p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Access & Authentication</h2>
                  <p className="text-sm text-slate-500">Configure global security and session policies</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2 md:w-1/2">
                  <label className="text-sm font-medium text-slate-700">Session Timeout</label>
                  <select
                    name="sessionTimeout"
                    value={settings.sessionTimeout}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="240">4 Hours</option>
                    <option value="never">Never (Not Recommended)</option>
                  </select>
                  <p className="text-xs text-slate-500">Users will be automatically logged out after this period of inactivity.</p>
                </div>
              </div>

              <div className="mt-10 border-t border-slate-100 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">Rate Limiting Rules</h2>
                <p className="text-sm text-slate-500 mb-6">Prevent brute-force attacks and abuse by limiting the number of requests users can make to sensitive endpoints.</p>

                <div className="space-y-8">
                  {/* Login Rate Limiting */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-md font-semibold text-slate-800 mb-4">Login Attempts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Max Failed Attempts</label>
                        <input
                          type="number"
                          name="loginRateLimitAttempts"
                          value={settings.loginRateLimitAttempts}
                          onChange={handleChange}
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
                          min="1"
                        />
                        <p className="text-xs text-slate-500">Maximum failed login attempts allowed before lockout.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Lockout Window (Minutes)</label>
                        <input
                          type="number"
                          name="loginRateLimitWindow"
                          value={settings.loginRateLimitWindow}
                          onChange={handleChange}
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
                          min="1"
                        />
                        <p className="text-xs text-slate-500">How long the user is locked out after exceeding max attempts.</p>
                      </div>
                    </div>
                  </div>

                  {/* Password Reset Rate Limiting */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-md font-semibold text-slate-800 mb-4">Password Reset Requests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Max Reset Requests</label>
                        <input
                          type="number"
                          name="forgotPasswordRateLimitAttempts"
                          value={settings.forgotPasswordRateLimitAttempts}
                          onChange={handleChange}
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
                          min="1"
                        />
                        <p className="text-xs text-slate-500">Maximum password reset emails allowed before lockout.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Lockout Window (Minutes)</label>
                        <input
                          type="number"
                          name="forgotPasswordRateLimitWindow"
                          value={settings.forgotPasswordRateLimitWindow}
                          onChange={handleChange}
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
                          min="1"
                        />
                        <p className="text-xs text-slate-500">How long the user is locked out after exceeding max requests.</p>
                      </div>
                    </div>
                  </div>

                  {/* Google Maps API Rate Limiting */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-md font-semibold text-slate-800 mb-4">Google Maps API Calls</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Max Map Loads</label>
                        <input
                          type="number"
                          name="mapsRateLimitAttempts"
                          value={settings.mapsRateLimitAttempts}
                          onChange={handleChange}
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
                          min="1"
                        />
                        <p className="text-xs text-slate-500">Maximum times an employee can open the check-in map page.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Lockout Window (Minutes)</label>
                        <input
                          type="number"
                          name="mapsRateLimitWindow"
                          value={settings.mapsRateLimitWindow}
                          onChange={handleChange}
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
                          min="1"
                        />
                        <p className="text-xs text-slate-500">How long the user is blocked from viewing the map after exceeding max loads.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 h-10 px-6 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {updateSettingsMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Changes
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Explanations & Useful Links */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-6 pt-14">
        {/* Explanation Card */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
            <Info size={16} className="text-blue-600" />
            Why are these important?
          </h3>

          <div className="space-y-4 text-sm text-blue-800/80">
            <div>
              <p className="font-medium text-blue-900 mb-1">Session Timeout</p>
              <p>Automatically logs out inactive users. This prevents unauthorized access if an employee steps away from their computer in a shared workspace.</p>
            </div>

            <div>
              <p className="font-medium text-blue-900 mb-1">Login Rate Limiting</p>
              <p>Stops hackers from using automated scripts to guess employee passwords (known as <span className="font-semibold">Brute Force Attacks</span>) by locking out the IP address after too many failures.</p>
            </div>

            <div>
              <p className="font-medium text-blue-900 mb-1">Password Reset Limits</p>
              <p>Prevents malicious users from spamming an employee's inbox with thousands of password reset emails (known as <span className="font-semibold">Email Bombing</span>).</p>
            </div>

            <div>
              <p className="font-medium text-blue-900 mb-1">Google Maps API Limits</p>
              <p>Every time an employee opens the check-in page, the Google Maps API is called. Limiting this prevents an employee (or a bug) from spamming the map and driving up your monthly Google Cloud billing.</p>
            </div>
          </div>
        </div>

        {/* Warning Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            Best Practices
          </h3>
          <p className="text-sm text-amber-800/80">
            It is highly recommended to keep the Session Timeout at <strong>30 minutes</strong> or less to comply with standard security policies. Selecting "Never" poses a severe security risk.
          </p>
        </div>

      </div>
    </div>
  );
};

export default AdminSettings;
