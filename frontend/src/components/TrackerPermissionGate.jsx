import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from '../contexts/AuthContext';
import { NativeLocationTracker } from '../plugins/NativeLocationTracker';
import { 
  Bell, 
  BatteryCharging, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  LogOut 
} from 'lucide-react';

export default function TrackerPermissionGate() {
  const { user, profile, signOut } = useAuth();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState({
    notificationsGranted: true,
    batteryUnrestricted: true,
    backgroundLocationGranted: true,
    locationGranted: true,
    allGranted: true,
  });

  const isEmployee = user && profile?.role === 'employee';
  const isNative = Capacitor.isNativePlatform();

  const checkPermissions = useCallback(async () => {
    if (!isNative || !isEmployee) {
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      const res = await NativeLocationTracker.checkPermissionsStatus();
      setStatus({
        notificationsGranted: !!res.notificationsGranted,
        batteryUnrestricted: !!res.batteryUnrestricted,
        backgroundLocationGranted: !!res.backgroundLocationGranted,
        locationGranted: !!res.locationGranted,
        allGranted: !!res.allGranted,
      });
    } catch (err) {
      console.warn('[TrackerGate] Permission check error:', err);
    } finally {
      setChecking(false);
    }
  }, [isNative, isEmployee]);

  useEffect(() => {
    if (!isNative || !isEmployee) return;

    checkPermissions();

    // Re-check automatically when user returns from settings or dialog
    let appStateListener = null;
    CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        checkPermissions();
      }
    }).then(l => { appStateListener = l; });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkPermissions();
      }
    };
    window.addEventListener('focus', checkPermissions);
    document.addEventListener('visibilitychange', handleVisibility);

    // Periodic check every 2.5s while gate is active
    const pollInterval = setInterval(() => {
      checkPermissions();
    }, 2500);

    return () => {
      if (appStateListener) appStateListener.remove();
      window.removeEventListener('focus', checkPermissions);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollInterval);
    };
  }, [isNative, isEmployee, checkPermissions]);

  // Only show on native Android devices for employees
  if (!isNative || !isEmployee) return null;

  // If all permissions are granted, do not block the app
  if (status.allGranted) return null;

  // Native permission request handlers
  const handleRequestNotifications = async () => {
    try {
      await NativeLocationTracker.requestNotificationPermission();
      setTimeout(checkPermissions, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestBattery = async () => {
    try {
      await NativeLocationTracker.requestBatteryOptimization();
      setTimeout(checkPermissions, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestLocation = async () => {
    try {
      await NativeLocationTracker.requestLocationPermissions();
      setTimeout(async () => {
        await NativeLocationTracker.openAppSettings();
      }, 600);
    } catch (e) {
      await NativeLocationTracker.openAppSettings();
    }
  };

  const pendingCount = [
    status.notificationsGranted, 
    status.batteryUnrestricted, 
    status.backgroundLocationGranted
  ].filter(v => !v).length;

  return (
    <div 
      className="fixed inset-0 z-[999999] bg-[#f8fafd] text-[#1f1f1f] flex flex-col justify-between overflow-y-auto antialiased font-sans select-none"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Top 4-Color Google Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] fixed top-0 left-0 right-0 z-50 pointer-events-none" />

      {/* Ambient Multi-Color Glows (Matches Employee Mobile Dashboard) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#4285F4]/10 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#EA4335]/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-[#FBBC05]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#34A853]/8 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar (Identical to Mobile Dashboard Header) */}
      <header className="h-14 bg-white border-b border-[#e0e3e7] px-4 flex items-center justify-between z-10 shrink-0 relative shadow-2xs mt-1">
        {/* Left: Avatar */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-[#1a73e8]">
                {(profile?.firstName || profile?.email || 'E').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Center: Acme HRMS •••• */}
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight text-[#1f1f1f]">Acme</span>
          <span className="text-base font-semibold tracking-tight text-[#4285F4]">HRMS</span>
          <div className="flex items-center gap-0.5 ml-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          </div>
        </div>

        {/* Right: Sign Out Icon */}
        <button
          onClick={() => (signOut ? signOut() : null)}
          title="Sign Out"
          className="p-1.5 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-full transition-colors active:scale-95 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-5 max-w-lg w-full mx-auto relative z-10 space-y-4">
        
        {/* Top Info Banner Card */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/80 p-5 relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 border border-[#d2e3fc]/60 shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Attendance Tracker
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0">
                  {pendingCount} Pending
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                Setup Required for Duty
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-[#b06000] shrink-0 mt-0.5" />
            <span>
              All 3 permissions below are mandatory to ensure attendance punches work continuously even while your mobile is locked or in sleep mode.
            </span>
          </div>
        </div>

        {/* Permissions List Card (Matches Business Apps & Attendance Section) */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/80 p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Required Configurations
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              3 of 3 Required
            </span>
          </div>

          {/* 1. Notifications Card */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            status.notificationsGranted
              ? 'bg-[#e6f4ea]/40 border-[#ceead6]'
              : 'bg-[#f8fafd] border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  status.notificationsGranted
                    ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                    : 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]'
                }`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                    1. App Notifications
                  </h2>
                  <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5 truncate">
                    Allows duty tracker status bar updates
                  </p>
                </div>
              </div>

              {status.notificationsGranted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleRequestNotifications}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          {/* 2. Battery Optimization (Unrestricted) */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            status.batteryUnrestricted
              ? 'bg-[#e6f4ea]/40 border-[#ceead6]'
              : 'bg-[#f8fafd] border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  status.batteryUnrestricted
                    ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                    : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
                }`}>
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                    2. Battery: Unrestricted
                  </h2>
                  <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5 truncate">
                    Prevents OS sleep cuts during shift hours
                  </p>
                </div>
              </div>

              {status.batteryUnrestricted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleRequestBattery}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  Allow
                </button>
              )}
            </div>
          </div>

          {/* 3. Location: "Allow all the time" */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            status.backgroundLocationGranted
              ? 'bg-[#e6f4ea]/40 border-[#ceead6]'
              : 'bg-[#f8fafd] border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  status.backgroundLocationGranted
                    ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                    : 'bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                    3. Location: Always Allow
                  </h2>
                  <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5 truncate">
                    GPS punches while screen is locked
                  </p>
                </div>
              </div>

              {status.backgroundLocationGranted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleRequestLocation}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Configure</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Visual Guide Box for Location */}
            {!status.backgroundLocationGranted && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-start gap-1.5 text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl">
                <span className="font-bold text-[#1a73e8] shrink-0">Tip:</span>
                <span>Tap <b>Configure</b> → tap <b>Permissions</b> → <b>Location</b> → select <b>"Allow all the time"</b>.</span>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="p-4 bg-white border-t border-[#e0e3e7] relative z-10 max-w-lg w-full mx-auto shadow-sm">
        <button
          onClick={checkPermissions}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white rounded-full py-3.5 text-sm font-semibold tracking-wide shadow-xs transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Checking Status...' : 'Re-check Permissions'}</span>
        </button>
      </footer>
    </div>
  );
}
