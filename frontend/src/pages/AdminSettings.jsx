import React, { useState, useEffect, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  Save, 
  Shield, 
  Info, 
  BookOpen, 
  ExternalLink, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Megaphone,
  Lock,
  Activity,
  Clock,
  MapPin,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  ShieldCheck,
  Radio,
  Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
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

  const { isLoading: loading, data: fetchedSettings, refetch } = useQuery({
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

  if (loading) return <PageLoader message="Loading System Settings..." />;

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
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Workspace Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex flex-wrap items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Global System <span className="font-medium italic text-[#1a73e8]">Settings</span> 
            <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">Active Security Guard</span>
            <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#1a73e8]" />
              {import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Configure authentication rules, rate limiting thresholds, app maintenance mode, and company broadcast tickers.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Session Expiry" 
          value={settings.sessionTimeout === 'never' ? 'Indefinite' : `${settings.sessionTimeout} Mins`} 
          subtitle="Inactivity logout window" 
          icon={Clock} 
          colorTheme="blue" 
        />
        <StatCard 
          title="System State" 
          value={settings.maintenanceMode ? 'Maintenance' : 'Operational'} 
          subtitle={settings.maintenanceMode ? 'Employee access locked' : 'All services active'} 
          icon={Activity} 
          colorTheme={settings.maintenanceMode ? 'amber' : 'green'} 
        />
        <StatCard 
          title="Broadcast Tickers" 
          value={settings.newsHeadlines.filter(h => h.trim()).length} 
          subtitle="Active dashboard notices" 
          icon={Megaphone} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Tracking Interval" 
          value={`${settings.trackingIntervalMinutes || 15} Mins`} 
          subtitle="Dynamic background GPS interval" 
          icon={MapPin} 
          colorTheme="green" 
        />
      </div>

      {/* Main Grid: Settings Form (Left) + Best Practices Sidebar (Right) */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Settings Cards */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Access & Session Authentication */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e0e3e7]">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f]">Access &amp; Session Authentication</h3>
                <p className="text-xs text-[#5f6368]">Configure inactivity timeout and session revocation policies</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="max-w-md">
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                  Automatic Session Timeout *
                </label>
                <select
                  name="sessionTimeout"
                  value={settings.sessionTimeout}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-semibold text-[#1f1f1f] outline-none cursor-pointer"
                >
                  <option value="15">15 Minutes (High Security)</option>
                  <option value="30">30 Minutes (Recommended)</option>
                  <option value="60">1 Hour (Standard)</option>
                  <option value="240">4 Hours (Extended)</option>
                  <option value="never">Never (Not Recommended - Security Risk)</option>
                </select>
                <p className="text-[11px] text-[#5f6368] mt-1.5">
                  Employees will be automatically logged out after this period of continuous inactivity.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Mobile Attendance & Background Location Tracking */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e0e3e7]">
              <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f]">Mobile Attendance &amp; Location Tracking</h3>
                <p className="text-xs text-[#5f6368]">Configure dynamic punch interval for the native Android background tracking service</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="max-w-md">
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                  Background Location Tracking Interval *
                </label>
                <select
                  name="trackingIntervalMinutes"
                  value={settings.trackingIntervalMinutes}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-semibold text-[#1f1f1f] outline-none cursor-pointer"
                >
                  <option value="2">2 Minutes (Real-Time Testing / High Frequency)</option>
                  <option value="5">5 Minutes (Frequent Updates)</option>
                  <option value="10">10 Minutes (Balanced Frequency)</option>
                  <option value="15">15 Minutes (Recommended - Production Standard &amp; Battery Friendly)</option>
                  <option value="30">30 Minutes (Extended Battery Saver)</option>
                  <option value="60">60 Minutes (Hourly Interval)</option>
                </select>
                <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-[#f8fafd] border border-[#dadce0]/60">
                  <Sparkles className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#5f6368] leading-relaxed">
                    <strong>Over-The-Air Sync:</strong> When updated here, employee mobile apps automatically adjust their background tracking schedule without requiring any manual APK downloads or reinstalls.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Application Maintenance Window */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e0e3e7]">
              <div className="p-2 rounded-xl bg-[#fef7e0] text-[#b06000]">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f]">Application Maintenance Mode</h3>
                <p className="text-xs text-[#5f6368]">Lock user portals during database migrations and platform upgrades</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#dadce0] bg-[#f8fafd]">
                <div>
                  <div className="text-xs font-semibold text-[#1f1f1f]">Enable Maintenance Mode</div>
                  <div className="text-[11px] text-[#5f6368]">Restricts employee login and displays a custom announcement</div>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.maintenanceMode ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'
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
                  <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider">
                    Maintenance Announcement Notice *
                  </label>
                  <textarea
                    name="maintenanceMessage"
                    value={settings.maintenanceMessage}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Enter the maintenance notice employees will see..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-medium text-[#1f1f1f] outline-none resize-none"
                  />
                  <p className="text-[11px] text-[#5f6368]">
                    This message will be rendered on the lock screen for any employee trying to access the portal.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Broadcast News Headlines */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e0e3e7]">
              <div className="p-2 rounded-xl bg-[#f3e8fd] text-[#8430ce]">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f]">Broadcast News Headlines</h3>
                <p className="text-xs text-[#5f6368]">Manage scrolling news ticker announcements on employee dashboards</p>
              </div>
            </div>

            <div className="space-y-3">
              {settings.newsHeadlines.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[#dadce0] bg-[#f8fafd] text-center text-xs text-[#5f6368]">
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
                      className="flex-1 px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-medium text-[#1f1f1f] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeadline(index)}
                      className="p-2 text-[#c5221f] bg-[#fce8e6] hover:bg-[#fad2cf] rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Remove Headline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={addHeadline}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] rounded-full transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add News Ticker
              </button>
            </div>
          </div>

          {/* Card 4: Rate Limiting & Abuse Prevention */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e0e3e7]">
              <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f]">Endpoint Rate Limiting Rules</h3>
                <p className="text-xs text-[#5f6368]">Mitigate brute-force attacks and prevent excessive third-party API billing</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Login Rate Limiting */}
              <div className="p-4 rounded-xl border border-[#e0e3e7] bg-[#f8fafd] space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#1a73e8]" />
                  <h4 className="text-xs font-semibold text-[#1f1f1f]">Login Attempt Throttling</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Max Failed Attempts</label>
                    <input
                      type="number"
                      name="loginRateLimitAttempts"
                      value={settings.loginRateLimitAttempts}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-bold text-[#1f1f1f] outline-none"
                      min="1"
                    />
                    <span className="text-[10px] text-[#5f6368]">Attempts allowed before temporary IP block</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Lockout Window (Minutes)</label>
                    <input
                      type="number"
                      name="loginRateLimitWindow"
                      value={settings.loginRateLimitWindow}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-bold text-[#1f1f1f] outline-none"
                      min="1"
                    />
                    <span className="text-[10px] text-[#5f6368]">Duration user remains locked out</span>
                  </div>
                </div>
              </div>

              {/* Password Reset Rate Limiting */}
              <div className="p-4 rounded-xl border border-[#e0e3e7] bg-[#f8fafd] space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#8430ce]" />
                  <h4 className="text-xs font-semibold text-[#1f1f1f]">Password Reset Throttling</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Max Reset Requests</label>
                    <input
                      type="number"
                      name="forgotPasswordRateLimitAttempts"
                      value={settings.forgotPasswordRateLimitAttempts}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-bold text-[#1f1f1f] outline-none"
                      min="1"
                    />
                    <span className="text-[10px] text-[#5f6368]">Maximum email requests allowed</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Lockout Window (Minutes)</label>
                    <input
                      type="number"
                      name="forgotPasswordRateLimitWindow"
                      value={settings.forgotPasswordRateLimitWindow}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-bold text-[#1f1f1f] outline-none"
                      min="1"
                    />
                    <span className="text-[10px] text-[#5f6368]">Duration before next reset attempt is allowed</span>
                  </div>
                </div>
              </div>

              {/* Google Maps API Rate Limiting */}
              <div className="p-4 rounded-xl border border-[#e0e3e7] bg-[#f8fafd] space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#b06000]" />
                  <h4 className="text-xs font-semibold text-[#1f1f1f]">Google Maps Geofence Throttling</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Max Map Loads</label>
                    <input
                      type="number"
                      name="mapsRateLimitAttempts"
                      value={settings.mapsRateLimitAttempts}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-bold text-[#1f1f1f] outline-none"
                      min="1"
                    />
                    <span className="text-[10px] text-[#5f6368]">Max check-in map views per window</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Lockout Window (Minutes)</label>
                    <input
                      type="number"
                      name="mapsRateLimitWindow"
                      value={settings.mapsRateLimitWindow}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-bold text-[#1f1f1f] outline-none"
                      min="1"
                    />
                    <span className="text-[10px] text-[#5f6368]">Throttling window to prevent API bill spike</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="p-4 rounded-2xl border border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center gap-2.5">
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save System Settings</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Explanations & Security Insights */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Explanation Card */}
          <div className="bg-[#e8f0fe]/60 border border-[#d2e3fc] rounded-2xl p-5 space-y-3.5">
            <h3 className="font-semibold text-xs text-[#1a73e8] uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Security Rationale
            </h3>

            <div className="space-y-3 text-xs text-[#1f1f1f] leading-relaxed">
              <div className="bg-white/80 p-3 rounded-xl border border-[#d2e3fc]">
                <p className="font-semibold text-[#1a73e8] mb-0.5">Session Inactivity Lock</p>
                <p className="text-[11px] text-[#5f6368]">
                  Automatically terminates stale sessions if a workstation is left unattended in open office layouts.
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-[#d2e3fc]">
                <p className="font-semibold text-[#1a73e8] mb-0.5">Brute-Force Guard</p>
                <p className="text-[11px] text-[#5f6368]">
                  Enforces exponential IP backoff after successive failed credentials attempts.
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-[#d2e3fc]">
                <p className="font-semibold text-[#1a73e8] mb-0.5">Email-Bombing Defense</p>
                <p className="text-[11px] text-[#5f6368]">
                  Guards user inboxes against automated scripts requesting password resets repeatedly.
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-[#d2e3fc]">
                <p className="font-semibold text-[#1a73e8] mb-0.5">Google Cloud Billing Safety</p>
                <p className="text-[11px] text-[#5f6368]">
                  Restricts excessive client-side Google Maps SDK reloads to safeguard cloud quota and billing.
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Card */}
          <div className="bg-[#fef7e0]/60 border border-[#fce293] rounded-2xl p-5 space-y-2">
            <h3 className="font-semibold text-xs text-[#b06000] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Compliance Recommendation
            </h3>
            <p className="text-xs text-[#5f6368] leading-relaxed">
              ISO/IEC 27001 and SOC 2 guidelines mandate session timeouts not exceed <strong>30 minutes</strong> for administrative portals. Selecting "Never" disables inactivity protection.
            </p>
          </div>

          {/* Application & System Version Card */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e7]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">System Version</h4>
                  <p className="text-[11px] text-[#5f6368]">Acme HRMS Core Workspace</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] animate-pulse" />
                {import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}
              </span>
            </div>
            <div className="space-y-2 pt-1 text-xs text-[#5f6368]">
              <div className="flex items-center justify-between">
                <span>Release Version:</span>
                <span className="font-semibold text-[#1f1f1f]">{import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Build Identifier:</span>
                <span className="font-mono text-[11px] font-medium text-[#1f1f1f] bg-[#f1f3f4] px-2 py-0.5 rounded-md">
                  {import.meta.env.VITE_APP_VERSION || '2026.08.28'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Environment:</span>
                <span className="font-medium text-[#137333]">Production Stable</span>
              </div>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
};

export default AdminSettings;
