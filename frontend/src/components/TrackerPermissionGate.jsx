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

  // If not native or not an employee, don't show the gate
  if (!isNative || !isEmployee) return null;

  // If all permissions are granted, do not block the app
  if (status.allGranted) return null;

  // Handlers for the 3 actions
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
      // First try native permission request
      await NativeLocationTracker.requestLocationPermissions();
      // Also open settings directly so user can select "Allow all the time"
      setTimeout(async () => {
        await NativeLocationTracker.openAppSettings();
      }, 600);
    } catch (e) {
      // Fallback: open app settings directly
      await NativeLocationTracker.openAppSettings();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-y-auto text-white"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Top Header */}
      <div className="w-full max-w-lg mx-auto pt-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-600/20 text-blue-400 rounded-2xl ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/10 mb-1">
          <ShieldCheck className="w-9 h-9 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Permission Setup Required
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Acme HRMS requires background duty tracking permissions to ensure attendance punches work reliably even when your phone is in sleep mode.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>All 3 permissions must be granted to use the app</span>
        </div>
      </div>

      {/* Permission Cards Container */}
      <div className="w-full max-w-lg mx-auto space-y-3.5 my-6">
        {/* 1. Notifications */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
          status.notificationsGranted 
            ? 'bg-emerald-950/30 border-emerald-500/30' 
            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                status.notificationsGranted 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                  1. App Notifications
                  {status.notificationsGranted && (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Allows ongoing duty tracker status bar notifications.
                </p>
              </div>
            </div>

            {status.notificationsGranted ? (
              <div className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <button
                onClick={handleRequestNotifications}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95 transition-transform shrink-0"
              >
                Enable
              </button>
            )}
          </div>
        </div>

        {/* 2. Battery Optimization (Unrestricted) */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
          status.batteryUnrestricted 
            ? 'bg-emerald-950/30 border-emerald-500/30' 
            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                status.batteryUnrestricted 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                <BatteryCharging className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                  2. Battery: Unrestricted
                  {status.batteryUnrestricted && (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prevents Android from killing tracking when screen is off.
                </p>
              </div>
            </div>

            {status.batteryUnrestricted ? (
              <div className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <button
                onClick={handleRequestBattery}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95 transition-transform shrink-0"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* 3. Location ("Allow all the time") */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
          status.backgroundLocationGranted 
            ? 'bg-emerald-950/30 border-emerald-500/30' 
            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                status.backgroundLocationGranted 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                  3. Location: "Allow all the time"
                  {status.backgroundLocationGranted && (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enables GPS updates while your mobile is locked or in pocket.
                </p>
              </div>
            </div>

            {status.backgroundLocationGranted ? (
              <div className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <button
                onClick={handleRequestLocation}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition-transform flex items-center gap-1.5 shrink-0"
              >
                <span>Configure</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Helper hint for Location permission */}
          {!status.backgroundLocationGranted && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5 bg-slate-950/40 p-2.5 rounded-xl">
              <span className="font-bold text-indigo-400 shrink-0">Tip:</span>
              <span>Tap <b>Configure</b> → tap <b>Permissions</b> → tap <b>Location</b> → select <b>"Allow all the time"</b>.</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="w-full max-w-lg mx-auto pb-6 space-y-3">
        <button
          onClick={checkPermissions}
          disabled={checking}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 active:scale-[0.99] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-blue-400' : ''}`} />
          <span>{checking ? 'Checking permissions...' : 'Re-check Permissions'}</span>
        </button>

        <div className="text-center pt-2">
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account / Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
