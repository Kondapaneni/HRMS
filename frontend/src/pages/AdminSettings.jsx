import React, { useState, useEffect } from 'react';
import { Save, Building2, Bell, Shield, Globe, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    companyName: 'Acme HRMS',
    companyEmail: 'contact@acme-hrms.com',
    companyPhone: '+1 (555) 123-4567',
    address: '123 Business Avenue, Tech District, San Francisco, CA 94107',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    emailNotifications: true,
    slackNotifications: false,
    requireMfaAll: false,
    sessionTimeout: '30'
  });

  const { isLoading: loading, data: fetchedSettings } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      const response = await api.get('/admin/settings');
      return response.data;
    }
  });

  useEffect(() => {
    if (fetchedSettings && fetchedSettings.company_name) {
      setSettings(prev => ({
        ...prev,
        companyName: fetchedSettings.company_name || '',
        companyEmail: fetchedSettings.company_email || '',
        companyPhone: fetchedSettings.company_phone || '',
        address: fetchedSettings.address || '',
        emailNotifications: fetchedSettings.email_notifications === true,
        slackNotifications: fetchedSettings.slack_notifications === true,
        sessionTimeout: fetchedSettings.session_timeout || '30',
      }));
    }
  }, [fetchedSettings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      company_name: settings.companyName,
      company_email: settings.companyEmail,
      company_phone: settings.companyPhone,
      address: settings.address,
      email_notifications: settings.emailNotifications,
      slack_notifications: settings.slackNotifications,
      session_timeout: settings.sessionTimeout
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage global configuration for the Acme HRMS platform</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <aside className="w-full md:w-64 shrink-0 space-y-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <span className={activeTab === 'general' ? 'text-blue-600' : 'text-slate-400'}><Building2 size={18} /></span> General
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <span className={activeTab === 'notifications' ? 'text-blue-600' : 'text-slate-400'}><Bell size={18} /></span> Notifications
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <span className={activeTab === 'security' ? 'text-blue-600' : 'text-slate-400'}><Shield size={18} /></span> Security
          </button>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSave}>
            <div className="p-6">
              
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Company Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Company Name</label>
                      <input 
                        type="text" 
                        name="companyName" 
                        value={settings.companyName} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Support Email</label>
                      <input 
                        type="email" 
                        name="companyEmail" 
                        value={settings.companyEmail} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Contact Phone</label>
                      <input 
                        type="text" 
                        name="companyPhone" 
                        value={settings.companyPhone} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Headquarters Address</label>
                    <textarea 
                      name="address" 
                      value={settings.address} 
                      onChange={handleChange}
                      rows="3"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow resize-none" 
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Automated Alerts</h2>
                  
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="mt-0.5">
                        <input 
                          type="checkbox" 
                          name="emailNotifications"
                          checked={settings.emailNotifications}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                        />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Email Notifications</p>
                        <p className="text-sm text-slate-500">Send automated emails for leave requests, approvals, and payroll generation.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="mt-0.5">
                        <input 
                          type="checkbox" 
                          name="slackNotifications"
                          checked={settings.slackNotifications}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                        />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Slack Integrations</p>
                        <p className="text-sm text-slate-500">Push notifications to the company Slack workspace for attendance anomalies.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Access & Authentication</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-1 md:w-1/2">
                      <label className="text-sm font-medium text-slate-700">Session Timeout (minutes)</label>
                      <select 
                        name="sessionTimeout" 
                        value={settings.sessionTimeout} 
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" 
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="240">4 Hours</option>
                        <option value="never">Never (Not Recommended)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Users will be automatically logged out after this period of inactivity.</p>
                    </div>
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default AdminSettings;
