import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import api from '../api/axios';

/**
 * Register native Android Foreground Service plugin.
 * On native Android, the Foreground Service handles ALL tracking (even when app is closed).
 * On web/non-native, the JS heartbeat handles tracking.
 */
const NativeLocationTracker = registerPlugin('LocationTracker');

/**
 * Continuous Background Location Tracker
 * Interval: 2 minutes for testing (change to 15 * 60 * 1000 for production).
 * 
 * NATIVE ANDROID: The native LocationTrackerService.java handles all punching via
 * AlarmManager (Doze-resistant). JS only starts/stops the service and manages check-in status.
 * 
 * WEB FALLBACK: Uses JS heartbeat loop for non-native platforms.
 */
export const TRACKER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const HEARTBEAT_INTERVAL_MS = 15 * 1000; // 15-second heartbeat (web fallback only)

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
  const queryClient = useQueryClient();
  const isPunchingRef = useRef(false);
  const latestCoordsRef = useRef(null);
  const nativeStartedRef = useRef(false);

  // 1. GPS watcher to keep location pre-warmed (for web fallback only)
  useEffect(() => {
    if (!user || profile?.role !== 'employee') return;
    // On native, the foreground service handles GPS directly — skip JS watcher
    if (Capacitor.isNativePlatform()) return;

    let watchId = null;

    const startWatching = async () => {
      try {
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              if (pos?.coords) {
                latestCoordsRef.current = {
                  coords: pos.coords,
                  timestamp: Date.now()
                };
              }
            },
            (err) => console.warn('[Tracker] watchPosition fallback error:', err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
          );
        }
      } catch (e) {
        console.warn('[Tracker] Unable to start continuous watchPosition:', e);
      }
    };

    startWatching();

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user, profile?.role]);

  // 2. Main tracking logic: Start/Stop native service OR run JS heartbeat on web
  useEffect(() => {
    if (!user || profile?.role !== 'employee') return;

    let heartbeatTimer = null;
    let checkTimer = null;

    // Check attendance status and manage native service / web fallback
    const checkAndManageTracking = async () => {
      try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const res = await api.get('/employee/attendance');
        const attendanceList = res.data || [];
        const todayRecord = 
          attendanceList.find(r => r.date?.split('T')[0] === todayStr) || 
          attendanceList.find(r => r.date && new Date(r.date).toDateString() === new Date().toDateString());

        const isCheckedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
        const shouldStop = !isCheckedIn || isDayEnded(todayRecord);

        if (Capacitor.isNativePlatform()) {
          // === NATIVE ANDROID: Let the foreground service handle everything ===
          if (shouldStop) {
            if (nativeStartedRef.current) {
              console.log('[Tracker] Stopping native foreground service (not checked in or day ended)');
              NativeLocationTracker.stopTracking().catch(() => {});
              nativeStartedRef.current = false;
            }
          } else if (!nativeStartedRef.current) {
            // Employee is checked in — start the native foreground service
            const token = localStorage.getItem('token');
            if (token) {
              try {
                await NativeLocationTracker.startTracking({
                  serverUrl: 'https://hrms-qwv3.onrender.com/api/employee/attendance/punch',
                  token: token,
                  intervalMs: TRACKER_INTERVAL_MS
                });
                nativeStartedRef.current = true;
                console.log('[Tracker] Native Android Foreground Service started. It will track every ' + (TRACKER_INTERVAL_MS / 60000) + ' min(s).');
              } catch (err) {
                console.warn('[Tracker] Native Foreground Service start error:', err);
              }
            }
          }
          // On native, do NOT send JS punches — the service handles it
          return;
        }

        // === WEB FALLBACK: Use JS heartbeat for punching ===
        if (shouldStop) return;

        await executeWebPunch();

      } catch (err) {
        console.error('[Tracker] Status check error:', err.response?.data?.error || err.message);
      }
    };

    // Web-only punch logic
    const executeWebPunch = async () => {
      if (isPunchingRef.current) return;
      isPunchingRef.current = true;

      try {
        const lastPunchTime = parseInt(localStorage.getItem('last_tracker_punch_time') || '0', 10);
        const now = Date.now();
        if (lastPunchTime > 0 && (now - lastPunchTime < TRACKER_INTERVAL_MS - 5000)) {
          return;
        }

        let coords = null;
        if (latestCoordsRef.current && (now - latestCoordsRef.current.timestamp < 30000)) {
          coords = latestCoordsRef.current.coords;
        }

        if (!coords && navigator.geolocation) {
          coords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve(p.coords),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
            );
          });
        }

        if (!coords || !coords.latitude || !coords.longitude) {
          console.warn('[Tracker] GPS coordinates unavailable. Retrying next heartbeat.');
          return;
        }

        await api.post('/employee/attendance/punch', {
          action: 'punch',
          latitude: coords.latitude,
          longitude: coords.longitude,
          photo: 'Tracker'
        });

        localStorage.setItem('last_tracker_punch_time', Date.now().toString());
        console.log(`[Tracker] Web punch at ${new Date().toLocaleTimeString()} (${coords.latitude}, ${coords.longitude})`);

        queryClient.invalidateQueries({ queryKey: ['employee', 'attendance'] });
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });

      } catch (err) {
        console.error('[Tracker] Web punch error:', err.response?.data?.error || err.message);
      } finally {
        isPunchingRef.current = false;
      }
    };

    // Initial check after 3 seconds
    checkTimer = setTimeout(checkAndManageTracking, 3000);

    // For native: Re-check status every 60s (just to start/stop the service, NOT to punch)
    // For web: Heartbeat every 15s to send punches
    const interval = Capacitor.isNativePlatform() ? 60000 : HEARTBEAT_INTERVAL_MS;
    heartbeatTimer = setInterval(checkAndManageTracking, interval);

    // App resume listener
    let appStateListener = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          checkAndManageTracking();
        }
      }).then(l => { appStateListener = l; });
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndManageTracking();
      }
    };
    window.addEventListener('focus', checkAndManageTracking);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(checkTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (appStateListener) appStateListener.remove();
      window.removeEventListener('focus', checkAndManageTracking);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, profile?.role, queryClient]);

  return null;
}
