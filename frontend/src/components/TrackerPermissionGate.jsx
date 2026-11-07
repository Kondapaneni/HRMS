import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from '../contexts/AuthContext';
import { NativeLocationTracker } from '../plugins/NativeLocationTracker';
import { Bell, BatteryCharging, MapPin, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, LogOut } from 'lucide-react';

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
    } catch {
      console.error(e);
    }
  };

  const handleRequestLocation = async () => {
    try {
      await NativeLocationTracker.requestLocationPermissions();
      setTimeout(async () => {
        await NativeLocationTracker.openAppSettings();
      }, 600);
    } catch {
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
      className="fixed inset-0 z-[999999] bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between overflow-y-auto select-none antialiased font-sans"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Top Header Bar */}
      <header className="h-14 bg-[var(--surface)] border-b border-[var(--line)] px-4 flex items-center justify-between z-10 shrink-0 relative shadow-2xs">
        {/* Left: App Logo */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            <img src="/pwa-192x192.png" alt="Acme HRMS" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Center: Acme HRMS */}
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight text-[var(--text)]">Acme</span>
          <span className="text-base font-semibold tracking-tight text-[var(--brand-deep)]">HRMS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)] ml-1" />
        </div>

        {/* Right: Sign Out Icon */}
        <button
          onClick={() => (signOut ? signOut() : null)}
          title="Sign Out"
          className="p-1.5 text-[var(--muted)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] rounded-full transition-colors active:scale-95 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-5 max-w-lg w-full mx-auto relative z-10 space-y-4">
        
        {/* Top Info Banner Card */}
        <div className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] p-5 relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[14px] overflow-hidden shrink-0 border border-[var(--line)] shadow-2xs bg-[var(--surface)] flex items-center justify-center">
              <img 
                src="/pwa-192x192.png" 
                alt="Acme HRMS" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[var(--text)] tracking-tight leading-tight">
                  Attendance Tracker
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF3DC] text-[#B7791F] border border-[#B7791F]/20 shrink-0">
                  {pendingCount} Pending
                </span>
              </div>
              <p className="text-[11px] font-medium text-[var(--muted)] mt-1 uppercase tracking-wider">
                Setup Required for Duty
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[var(--line)] flex items-start gap-2 text-xs text-[var(--text-2)] leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
            <span>
              All 3 permissions below are mandatory to ensure attendance punches work continuously even while your mobile is locked or in sleep mode.
            </span>
          </div>
        </div>

        {/* Permissions List Card */}
        <div className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
              Required Configurations
            </span>
            <span className="text-[11px] font-semibold text-[var(--muted)]">
              3 of 3 Required
            </span>
          </div>

          {/* 1. Notifications Card */}
          <div className={`p-3.5 rounded-[18px] border transition-all ${
            status.notificationsGranted
              ? 'bg-[#E6F6EC]/60 border-[#1F9D55]/20'
              : 'bg-[var(--surface-alt)] border-[var(--line)]'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                  status.notificationsGranted
                    ? 'bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20'
                    : 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--line)]'
                }`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
                    1. App Notifications
                  </h2>
                  <p className="text-[11.5px] text-[var(--muted)] leading-snug mt-0.5 truncate">
                    Allows duty tracker status bar updates
                  </p>
                </div>
              </div>

              {status.notificationsGranted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleRequestNotifications}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          {/* 2. Battery Optimization (Unrestricted) */}
          <div className={`p-3.5 rounded-[18px] border transition-all ${
            status.batteryUnrestricted
              ? 'bg-[#E6F6EC]/60 border-[#1F9D55]/20'
              : 'bg-[var(--surface-alt)] border-[var(--line)]'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                  status.batteryUnrestricted
                    ? 'bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20'
                    : 'bg-[#FDF3DC] text-[#B7791F] border border-[#B7791F]/20'
                }`}>
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
                    2. Battery: Unrestricted
                  </h2>
                  <p className="text-[11.5px] text-[var(--muted)] leading-snug mt-0.5 truncate">
                    Prevents OS sleep cuts during shift hours
                  </p>
                </div>
              </div>

              {status.batteryUnrestricted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleRequestBattery}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  Allow
                </button>
              )}
            </div>
          </div>

          {/* 3. Location: "Allow all the time" */}
          <div className={`p-3.5 rounded-[18px] border transition-all ${
            status.backgroundLocationGranted
              ? 'bg-[#E6F6EC]/60 border-[#1F9D55]/20'
              : 'bg-[var(--surface-alt)] border-[var(--line)]'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                  status.backgroundLocationGranted
                    ? 'bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20'
                    : 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--line)]'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
                    3. Location: Always Allow
                  </h2>
                  <p className="text-[11.5px] text-[var(--muted)] leading-snug mt-0.5 truncate">
                    GPS punches while screen is locked
                  </p>
                </div>
              </div>

              {status.backgroundLocationGranted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#1F9D55]/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleRequestLocation}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Configure</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Visual Guide Box for Location */}
            {!status.backgroundLocationGranted && (
              <div className="mt-3 pt-2.5 border-t border-[var(--line)] flex items-start gap-1.5 text-[11px] text-[var(--text-2)] bg-[var(--surface)] p-2.5 rounded-[12px]">
                <span className="font-bold text-[var(--brand-deep)] shrink-0">Tip:</span>
                <span>Tap <b>Configure</b> → tap <b>Permissions</b> → <b>Location</b> → select <b>"Allow all the time"</b>.</span>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="p-4 bg-[var(--surface)] border-t border-[var(--line)] relative z-10 max-w-lg w-full mx-auto shadow-sm">
        <button
          onClick={checkPermissions}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2 bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white rounded-full py-3.5 text-sm font-semibold tracking-wide shadow-xs transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Checking Status...' : 'Re-check Permissions'}</span>
        </button>
      </footer>
    </div>
  );
}
