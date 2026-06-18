import React, { useState, useEffect } from 'react';
import { Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminSettings = () => {
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
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
    if (fetchedSettings && fetchedSettings.session_timeout) {
      setSettings({
        sessionTimeout: fetchedSettings.session_timeout || '30',
      });
    }
  }, [fetchedSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      [name]: value
    });
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
      session_timeout: settings.sessionTimeout
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
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
  );
};

export default AdminSettings;
