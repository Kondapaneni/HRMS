import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  Save, 
  Shield, 
  Info, 
  Trash2, 
  Megaphone,
  Lock,
  Activity,
  Clock,
  MapPin,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Radio,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

const AdminSettings = () => {
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    sessionTimeout: '30',
    trackingIntervalMinutes: 15,
    loginRateLimitAttempts: 5,
    loginRateLimitWindow: 15,
    forgotPasswordRateLimitAttempts: 3,
    forgotPasswordRateLimitWindow: 60,
    mapsRateLimitAttempts: 5,
    mapsRateLimitWindow: 10,
    newsHeadlines: [],
    maintenanceMode: false,
    maintenanceMessage: 'The application is currently undergoing maintenance. Please check back later.',
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
        trackingIntervalMinutes: fetchedSettings.tracking_interval_minutes ? Number(fetchedSettings.tracking_interval_minutes) : 15,
        loginRateLimitAttempts: fetchedSettings.login_rate_limit_attempts || 5,
        loginRateLimitWindow: fetchedSettings.login_rate_limit_window || 15,
        forgotPasswordRateLimitAttempts: fetchedSettings.forgot_password_rate_limit_attempts || 3,
        forgotPasswordRateLimitWindow: fetchedSettings.forgot_password_rate_limit_window || 60,
        mapsRateLimitAttempts: fetchedSettings.maps_rate_limit_attempts || 5,
        mapsRateLimitWindow: fetchedSettings.maps_rate_limit_window || 10,
        newsHeadlines: typeof fetchedSettings.news_headlines === 'string' ? JSON.parse(fetchedSettings.news_headlines) : (fetchedSettings.news_headlines || []),
        maintenanceMode: fetchedSettings.maintenance_mode === true || fetchedSettings.maintenance_mode === 'true',
        maintenanceMessage: fetchedSettings.maintenance_message || 'The application is currently undergoing maintenance. Please check back later.',
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

  const handleHeadlineChange = (index, value) => {
    const newHeadlines = [...settings.newsHeadlines];
    newHeadlines[index] = value;
    setSettings(prev => ({ ...prev, newsHeadlines: newHeadlines }));
  };

  const addHeadline = () => {
    setSettings(prev => ({ ...prev, newsHeadlines: [...prev.newsHeadlines, ''] }));
  };

  const removeHeadline = (index) => {
    const newHeadlines = [...settings.newsHeadlines];
    newHeadlines.splice(index, 1);
    setSettings(prev => ({ ...prev, newsHeadlines: newHeadlines }));
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings) => {
      const response = await api.post('/admin/settings', newSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      queryClient.invalidateQueries({ queryKey: ['newsHeadlines'] });
      toast.success('System settings saved successfully!');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      session_timeout: settings.sessionTimeout,
      tracking_interval_minutes: Number(settings.trackingIntervalMinutes) || 15,
      login_rate_limit_attempts: settings.loginRateLimitAttempts,
      login_rate_limit_window: settings.loginRateLimitWindow,
      forgot_password_rate_limit_attempts: settings.forgotPasswordRateLimitAttempts,
      forgot_password_rate_limit_window: settings.forgotPasswordRateLimitWindow,
      maps_rate_limit_attempts: settings.mapsRateLimitAttempts,
      maps_rate_limit_window: settings.mapsRateLimitWindow,
      news_headlines: settings.newsHeadlines.filter(h => h.trim() !== ''),
      maintenance_mode: settings.maintenanceMode,
      maintenance_message: settings.maintenanceMessage
    });
  };

  if (loading) return <PageLoader message="Loading system settings..." />;

  return (
    <div className="space-y-6 pb-12 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-medium text-[var(--muted)]">Workspace configuration</span>
          </div>
          <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex flex-wrap items-center gap-2">
            Global system settings
            <StatusBadge variant="success">Active security guard</StatusBadge>
            <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[var(--brand-deep)]" />
              {import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}
            </span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Configure authentication rules, rate limiting thresholds, app maintenance mode, and company broadcast tickers.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Session expiry" 
          value={settings.sessionTimeout === 'never' ? 'Indefinite' : `${settings.sessionTimeout}m`} 
          subtitle="Inactivity logout window" 
          icon={Clock} 
        />
        <StatCard 
          title="System state" 
          value={settings.maintenanceMode ? 'Maintenance' : 'Operational'} 
          subtitle={settings.maintenanceMode ? 'Employee access locked' : 'All services active'} 
          icon={Activity} 
        />
        <StatCard 
          title="Broadcast tickers" 
          value={settings.newsHeadlines.filter(h => h.trim()).length} 
          subtitle="Active dashboard notices" 
          icon={Megaphone} 
        />
        <StatCard 
          title="Tracking interval" 
          value={`${settings.trackingIntervalMinutes || 15}m`} 
          subtitle="Background GPS interval" 
          icon={MapPin} 
        />
      </div>

      {/* Main Grid: Settings Form (Left) + Best Practices Sidebar (Right) */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-[14px] items-start">
        
        {/* Left Column: Settings Cards */}
        <div className="lg:col-span-8 space-y-[14px]">
          
          {/* Card 1: Access & Session Authentication */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
              <div className="w-9 h-9 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-[var(--text)]">Access & session authentication</h3>
                <p className="text-[13px] text-[var(--muted)]">Configure inactivity timeout and session revocation policies</p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="max-w-md">
                <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">
                  Automatic session timeout
                </label>
                <select
                  name="sessionTimeout"
                  value={settings.sessionTimeout}
                  onChange={handleChange}
                  className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] font-medium text-[var(--text)] outline-none cursor-pointer"
                >
                  <option value="15">15 minutes (High security)</option>
                  <option value="30">30 minutes (Recommended)</option>
                  <option value="60">1 hour (Standard)</option>
                  <option value="240">4 hours (Extended)</option>
                  <option value="never">Never (Not recommended)</option>
                </select>
                <p className="text-[12px] text-[var(--muted)] mt-1.5">
                  Employees will be automatically logged out after this period of continuous inactivity.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Mobile Attendance & Background Location Tracking */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
              <div className="w-9 h-9 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-[var(--text)]">Mobile attendance & location tracking</h3>
                <p className="text-[13px] text-[var(--muted)]">Configure dynamic punch interval for the native Android background tracking service</p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="max-w-md">
                <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">
                  Background location tracking interval
                </label>
                <select
                  name="trackingIntervalMinutes"
                  value={settings.trackingIntervalMinutes}
                  onChange={handleChange}
                  className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] font-medium text-[var(--text)] outline-none cursor-pointer"
                >
                  <option value="2">2 minutes (Testing / high frequency)</option>
                  <option value="5">5 minutes (Frequent updates)</option>
                  <option value="10">10 minutes (Balanced)</option>
                  <option value="15">15 minutes (Recommended - battery friendly)</option>
                  <option value="30">30 minutes (Extended battery saver)</option>
                  <option value="60">60 minutes (Hourly interval)</option>
                </select>
                <div className="flex items-start gap-2.5 mt-3 p-3 rounded-[14px] bg-[var(--brand-tint)]">
                  <Sparkles className="w-4 h-4 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
                    <strong className="text-[var(--text)]">Over-the-air sync:</strong> Employee mobile apps automatically adjust their background tracking schedule without requiring any manual APK updates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Application Maintenance Window */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
              <div className="w-9 h-9 rounded-[14px] bg-[var(--warning-bg)] text-[var(--warning-text)] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-[var(--text)]">Application maintenance mode</h3>
                <p className="text-[13px] text-[var(--muted)]">Lock user portals during database migrations and platform upgrades</p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-4 rounded-[16px] bg-[var(--surface-alt)]">
                <div>
                  <div className="text-[13px] font-medium text-[var(--text)]">Enable maintenance mode</div>
                  <div className="text-[12px] text-[var(--muted)]">Restricts employee login and displays a custom announcement</div>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.maintenanceMode ? 'bg-[var(--brand-deep)]' : 'bg-[var(--line)]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settings.maintenanceMode && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="block text-[13px] font-medium text-[var(--muted)]">
                    Maintenance announcement notice
                  </label>
                  <textarea
                    name="maintenanceMessage"
                    value={settings.maintenanceMessage}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Enter the maintenance notice employees will see..."
                    className="w-full p-3 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] font-normal text-[var(--text)] outline-none resize-none"
                  />
                  <p className="text-[12px] text-[var(--muted)]">
                    This message will be rendered on the lock screen for any employee trying to access the portal.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Broadcast News Headlines */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
              <div className="w-9 h-9 rounded-[14px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-[var(--text)]">Broadcast news headlines</h3>
                <p className="text-[13px] text-[var(--muted)]">Manage scrolling news ticker announcements on employee dashboards</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {settings.newsHeadlines.length === 0 ? (
                <div className="p-4 rounded-[14px] bg-[var(--surface-alt)] text-center text-[13px] text-[var(--muted)]">
                  No news headlines added. Click below to add an announcement ticker.
                </div>
              ) : (
                settings.newsHeadlines.map((headline, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => handleHeadlineChange(index, e.target.value)}
                      placeholder="e.g. Q3 Townhall scheduled for this Friday at 4:00 PM IST"
                      className="flex-1 h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-[12px] text-[13px] font-normal text-[var(--text)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeadline(index)}
                      className="w-10 h-10 flex items-center justify-center text-[var(--danger-text)] bg-[var(--danger-bg)] hover:opacity-80 rounded-full transition-opacity cursor-pointer shrink-0"
                      title="Remove headline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addHeadline}
                className="mt-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add news ticker
              </Button>
            </div>
          </div>

          {/* Card 4: Rate Limiting & Abuse Prevention */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
              <div className="w-9 h-9 rounded-[14px] bg-[var(--success-bg)] text-[var(--success-text)] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-[var(--text)]">Endpoint rate limiting rules</h3>
                <p className="text-[13px] text-[var(--muted)]">Mitigate brute-force attacks and prevent excessive third-party API billing</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Login Rate Limiting */}
              <div className="p-4 rounded-[16px] bg-[var(--surface-alt)] space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[var(--brand-deep)]" />
                  <h4 className="text-[13px] font-medium text-[var(--text)]">Login attempt throttling</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <label className="block text-[12px] text-[var(--muted)] mb-1">Max failed attempts</label>
                    <input
                      type="number"
                      name="loginRateLimitAttempts"
                      value={settings.loginRateLimitAttempts}
                      onChange={handleChange}
                      className="w-full h-9 px-3 bg-[var(--surface)] border border-[var(--line)] rounded-[10px] text-[13px] font-medium text-[var(--text)] outline-none"
                      min="1"
                    />
                    <span className="text-[11px] text-[var(--muted)]">Attempts allowed before lockout</span>
                  </div>
                  <div>
                    <label className="block text-[12px] text-[var(--muted)] mb-1">Lockout window (Minutes)</label>
                    <input
                      type="number"
                      name="loginRateLimitWindow"
                      value={settings.loginRateLimitWindow}
                      onChange={handleChange}
                      className="w-full h-9 px-3 bg-[var(--surface)] border border-[var(--line)] rounded-[10px] text-[13px] font-medium text-[var(--text)] outline-none"
                      min="1"
                    />
                    <span className="text-[11px] text-[var(--muted)]">Duration user remains locked out</span>
                  </div>
                </div>
              </div>

              {/* Password Reset Rate Limiting */}
              <div className="p-4 rounded-[16px] bg-[var(--surface-alt)] space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--accent-pink-deep)]" />
                  <h4 className="text-[13px] font-medium text-[var(--text)]">Password reset throttling</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <label className="block text-[12px] text-[var(--muted)] mb-1">Max reset requests</label>
                    <input
                      type="number"
                      name="forgotPasswordRateLimitAttempts"
                      value={settings.forgotPasswordRateLimitAttempts}
                      onChange={handleChange}
                      className="w-full h-9 px-3 bg-[var(--surface)] border border-[var(--line)] rounded-[10px] text-[13px] font-medium text-[var(--text)] outline-none"
                      min="1"
                    />
                    <span className="text-[11px] text-[var(--muted)]">Maximum email requests allowed</span>
                  </div>
                  <div>
                    <label className="block text-[12px] text-[var(--muted)] mb-1">Lockout window (Minutes)</label>
                    <input
                      type="number"
                      name="forgotPasswordRateLimitWindow"
                      value={settings.forgotPasswordRateLimitWindow}
                      onChange={handleChange}
                      className="w-full h-9 px-3 bg-[var(--surface)] border border-[var(--line)] rounded-[10px] text-[13px] font-medium text-[var(--text)] outline-none"
                      min="1"
                    />
                    <span className="text-[11px] text-[var(--muted)]">Duration before next reset attempt</span>
                  </div>
                </div>
              </div>

              {/* Google Maps API Rate Limiting */}
              <div className="p-4 rounded-[16px] bg-[var(--surface-alt)] space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--warning-text)]" />
                  <h4 className="text-[13px] font-medium text-[var(--text)]">Google Maps geofence throttling</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <label className="block text-[12px] text-[var(--muted)] mb-1">Max map loads</label>
                    <input
                      type="number"
                      name="mapsRateLimitAttempts"
                      value={settings.mapsRateLimitAttempts}
                      onChange={handleChange}
                      className="w-full h-9 px-3 bg-[var(--surface)] border border-[var(--line)] rounded-[10px] text-[13px] font-medium text-[var(--text)] outline-none"
                      min="1"
                    />
                    <span className="text-[11px] text-[var(--muted)]">Max check-in map views per window</span>
                  </div>
                  <div>
                    <label className="block text-[12px] text-[var(--muted)] mb-1">Lockout window (Minutes)</label>
                    <input
                      type="number"
                      name="mapsRateLimitWindow"
                      value={settings.mapsRateLimitWindow}
                      onChange={handleChange}
                      className="w-full h-9 px-3 bg-[var(--surface)] border border-[var(--line)] rounded-[10px] text-[13px] font-medium text-[var(--text)] outline-none"
                      min="1"
                    />
                    <span className="text-[11px] text-[var(--muted)]">Throttling window to protect API quota</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="bg-[var(--surface)] rounded-[24px] p-4 flex justify-end items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={updateSettingsMutation.isPending}
              className="px-6"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2" />
                  <span>Saving configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>Save system settings</span>
                </>
              )}
            </Button>
          </div>

        </div>

        {/* Right Column: Explanations & Security Insights */}
        <div className="lg:col-span-4 space-y-[14px]">
          
          {/* Explanation Card */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-3.5">
            <h3 className="font-medium text-[13px] text-[var(--brand-deep)] uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Security rationale
            </h3>

            <div className="space-y-3 text-[13px] text-[var(--text)] leading-relaxed">
              <div className="bg-[var(--surface-alt)] p-3 rounded-[14px]">
                <p className="font-medium text-[var(--text)] mb-0.5">Session inactivity lock</p>
                <p className="text-[12px] text-[var(--muted)]">
                  Automatically terminates stale sessions if a workstation is left unattended in open office layouts.
                </p>
              </div>

              <div className="bg-[var(--surface-alt)] p-3 rounded-[14px]">
                <p className="font-medium text-[var(--text)] mb-0.5">Brute-force guard</p>
                <p className="text-[12px] text-[var(--muted)]">
                  Enforces exponential IP backoff after successive failed credentials attempts.
                </p>
              </div>

              <div className="bg-[var(--surface-alt)] p-3 rounded-[14px]">
                <p className="font-medium text-[var(--text)] mb-0.5">Email-bombing defense</p>
                <p className="text-[12px] text-[var(--muted)]">
                  Guards user inboxes against automated scripts requesting password resets repeatedly.
                </p>
              </div>

              <div className="bg-[var(--surface-alt)] p-3 rounded-[14px]">
                <p className="font-medium text-[var(--text)] mb-0.5">Cloud billing safety</p>
                <p className="text-[12px] text-[var(--muted)]">
                  Restricts excessive client-side Google Maps SDK reloads to safeguard cloud quota and billing.
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Card */}
          <div className="bg-[var(--warning-bg)] rounded-[24px] p-6 space-y-2">
            <h3 className="font-medium text-[13px] text-[var(--warning-text)] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Compliance recommendation
            </h3>
            <p className="text-[12px] text-[var(--warning-text)] leading-relaxed">
              ISO/IEC 27001 and SOC 2 guidelines mandate session timeouts not exceed <strong>30 minutes</strong> for administrative portals. Selecting "Never" disables inactivity protection.
            </p>
          </div>

          {/* Application & System Version Card */}
          <div className="bg-[var(--surface)] rounded-[24px] p-6 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-[var(--text)]">System version</h4>
                  <p className="text-[12px] text-[var(--muted)]">Acme HRMS core workspace</p>
                </div>
              </div>
              <StatusBadge variant="success">
                {import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}
              </StatusBadge>
            </div>
            <div className="space-y-2 pt-1 text-[13px] text-[var(--muted)]">
              <div className="flex items-center justify-between">
                <span>Release version:</span>
                <span className="font-medium text-[var(--text)]">{import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Build identifier:</span>
                <span className="font-mono text-[11px] font-medium text-[var(--text)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-[6px]">
                  {import.meta.env.VITE_APP_VERSION || '2026.08.28'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Environment:</span>
                <span className="font-medium text-[var(--success-text)]">Production stable</span>
              </div>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
};

export default AdminSettings;
