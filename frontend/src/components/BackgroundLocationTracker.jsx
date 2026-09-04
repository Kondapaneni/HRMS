import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import api from '../api/axios';
import { NativeLocationTracker } from '../plugins/NativeLocationTracker';

/**
 * Continuous Background Location Tracker
 * 
 * STRICTLY NATIVE ANDROID:
 * Location tracking is completely disabled on web platforms.
 * On native Android, the Foreground Service (LocationTrackerService.java)
 * handles all background tracking via AlarmManager (Doze-resistant).
 */
export const DEFAULT_TRACKER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes default fallback

function isDayEnded(todayRecord) {
  if (!todayRecord || !todayRecord.checkIn) return true;
  if (todayRecord.checkOut) return true; // Already checked out

  // Stop at midnight Kolkata time (IST) — if the attendance date is not today
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA'); // yyyy-mm-dd in local timezone (IST)
  const recordDate = todayRecord.date?.split('T')[0];
  if (recordDate && recordDate !== todayStr) {
    console.log('[Tracker] Day has ended (past midnight IST). Automatic tracking stopped.');
    return true;
  }

  return false;
}

export default function BackgroundLocationTracker() {
  const { profile, user } = useAuth();
  const nativeStartedRef = useRef(false);
  const activeIntervalRef = useRef(DEFAULT_TRACKER_INTERVAL_MS);

  const isNative = Capacitor.isNativePlatform();
  const isEmployee = user && profile?.role === 'employee';

  useEffect(() => {
    // Only run on native platforms (Android app). Do NOT track on web.
    if (!isNative || !isEmployee) return;

    let checkTimer = null;
    let pollInterval = null;

    const checkAndManageTracking = async () => {
      try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        
        // Fetch attendance status and dynamic server config (/news returns tracking_interval_minutes)
        const [attRes, newsRes] = await Promise.allSettled([
          api.get('/employee/attendance'),
          api.get('/news')
        ]);

        const attendanceList = (attRes.status === 'fulfilled' ? attRes.value.data : []) || [];
        const dynamicMins = (newsRes.status === 'fulfilled' && newsRes.value.data?.tracking_interval_minutes)
          ? Number(newsRes.value.data.tracking_interval_minutes)
          : 15;
        const targetIntervalMs = Math.max(1, dynamicMins) * 60 * 1000;

        const todayRecord = 
          attendanceList.find(r => r.date?.split('T')[0] === todayStr) || 
          attendanceList.find(r => r.date && new Date(r.date).toDateString() === new Date().toDateString());

        const isCheckedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
        const shouldStop = !isCheckedIn || isDayEnded(todayRecord);

        if (shouldStop) {
          if (nativeStartedRef.current) {
            console.log('[Tracker] Stopping native foreground service (not checked in or day ended)');
            NativeLocationTracker.stopTracking().catch(() => {});
            nativeStartedRef.current = false;
          }
        } else {
          // Employee is checked in — start or reschedule the native foreground service
          const intervalChanged = activeIntervalRef.current !== targetIntervalMs;
          if (!nativeStartedRef.current || intervalChanged) {
            const token = localStorage.getItem('token');
            if (token) {
              try {
                await NativeLocationTracker.startTracking({
                  serverUrl: 'https://hrms-qwv3.onrender.com/api/employee/attendance/punch',
                  token: token,
                  intervalMs: targetIntervalMs
                });
                nativeStartedRef.current = true;
                activeIntervalRef.current = targetIntervalMs;
                console.log(`[Tracker] Native Android Foreground Service ${intervalChanged ? 'rescheduled' : 'started'}. Dynamic interval: ${dynamicMins} min(s).`);
              } catch (err) {
                console.warn('[Tracker] Native Foreground Service start error:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Tracker] Status check error:', err.response?.data?.error || err.message);
      }
    };

    // Initial check after 3 seconds
    checkTimer = setTimeout(checkAndManageTracking, 3000);

    // Periodic check every 60s to ensure service matches attendance status
    pollInterval = setInterval(checkAndManageTracking, 60000);

    // App state listener when returning to foreground
    let appStateListener = null;
    CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        checkAndManageTracking();
      }
    }).then(l => { appStateListener = l; });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndManageTracking();
      }
    };
    window.addEventListener('focus', checkAndManageTracking);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(checkTimer);
      if (pollInterval) clearInterval(pollInterval);
      if (appStateListener) appStateListener.remove();
      window.removeEventListener('focus', checkAndManageTracking);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isNative, isEmployee]);

  return null;
}
