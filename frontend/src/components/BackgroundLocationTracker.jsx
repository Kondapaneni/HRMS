import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import api from '../api/axios';

/**
 * Continuous Background Location Tracker
 * Interval: Configured to 2 minutes for testing (change to 15 * 60 * 1000 for production).
 * Heartbeat: Checks every 15 seconds to ensure zero timer drift and precise 2-minute punches.
 * Caches GPS coordinates via watchPosition for instant punch recording.
 * Automatically stops tracking if employee forgets to checkout and day or shift ends.
 */
export const TRACKER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes (change to 15 * 60 * 1000 when ready)
const HEARTBEAT_INTERVAL_MS = 15 * 1000; // 15-second heartbeat for tight punch intervals

/**
 * Helper to determine if the day or shift has ended and tracking should automatically stop
 * when the employee forgets to check out.
 */
function isDayOrShiftEnded(todayRecord) {
  if (!todayRecord || !todayRecord.checkIn) return true;
  if (todayRecord.checkOut) return true; // Already checked out

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA');

  // 1. If date changed (e.g. past midnight next day)
  const recordDate = todayRecord.date?.split('T')[0];
  if (recordDate && recordDate !== todayStr) {
    console.log('[Tracker] Day has ended (date rolled over). Automatic tracking stopped.');
    return true;
  }

  // 2. Max 12 hours from check-in threshold (employee forgot to check out)
  const checkInTime = new Date(todayRecord.checkIn).getTime();
  const MAX_HOURS_MS = 12 * 60 * 60 * 1000;
  if (now.getTime() - checkInTime > MAX_HOURS_MS) {
    console.log('[Tracker] Maximum active shift duration (12 hours) exceeded. Automatic tracking stopped.');
    return true;
  }

  // 3. Shift end time with 2-hour grace/overtime buffer
  // (Only applies if the employee checked in before or during the shift window)
  if (todayRecord.shiftEndTime) {
    const [h, m] = todayRecord.shiftEndTime.split(':').map(Number);
    const shiftEnd = new Date(now);
    shiftEnd.setHours(h, m, 0, 0);

    // If overnight shift where end is earlier than start
    if (todayRecord.shiftStartTime) {
      const [shH, shM] = todayRecord.shiftStartTime.split(':').map(Number);
      if (h < shH) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }
    }

    const cutoff = shiftEnd.getTime() + (2 * 60 * 60 * 1000); // 2-hour buffer
    if (checkInTime < cutoff && now.getTime() > cutoff) {
      console.log(`[Tracker] Shift ended at ${todayRecord.shiftEndTime} (+2h grace). Employee forgot to check out. Automatic tracking stopped.`);
      return true;
    }
  }

  return false;
}

export default function BackgroundLocationTracker() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const isPunchingRef = useRef(false);
  const latestCoordsRef = useRef(null);

  // 1. Continuous location watcher to keep GPS warm and eliminate 10-15s cold-start delays
  useEffect(() => {
    if (!user || profile?.role !== 'employee') return;

    let watchId = null;

    const startWatching = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
            (pos) => {
              if (pos?.coords) {
                latestCoordsRef.current = {
                  coords: pos.coords,
                  timestamp: Date.now()
                };
              }
            }
          );
        } else if (navigator.geolocation) {
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
      if (watchId !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchId }).catch(() => {});
        } else if (navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
        }
      }
    };
  }, [user, profile?.role]);

  // 2. Main tracking loop with fast 15-second heartbeat
  useEffect(() => {
    if (!user || profile?.role !== 'employee') return;

    let heartbeatTimer = null;

    const executeTrackerPunch = async () => {
      if (isPunchingRef.current) return;
      isPunchingRef.current = true;

      try {
        // A. Fetch today's attendance status
        const todayStr = new Date().toLocaleDateString('en-CA');
        const res = await api.get('/employee/attendance');
        const attendanceList = res.data || [];
        const todayRecord = 
          attendanceList.find(r => r.date?.split('T')[0] === todayStr) || 
          attendanceList.find(r => r.date && new Date(r.date).toDateString() === new Date().toDateString());

        const isCheckedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;

        // If employee is not checked in or already checked out, do not punch
        if (!isCheckedIn) {
          return;
        }

        // B. Automatic stop if employee forgot to check out and day/shift has ended
        if (isDayOrShiftEnded(todayRecord)) {
          return;
        }

        // C. Check elapsed time since last punch (enforce exact TRACKER_INTERVAL_MS with 5s grace)
        const lastPunchTime = parseInt(localStorage.getItem('last_tracker_punch_time') || '0', 10);
        const now = Date.now();
        if (lastPunchTime > 0 && (now - lastPunchTime < TRACKER_INTERVAL_MS - 5000)) {
          return;
        }

        // D. Retrieve GPS coordinates (use pre-warmed cached coords if < 30s old, otherwise query fresh)
        let coords = null;
        if (latestCoordsRef.current && (now - latestCoordsRef.current.timestamp < 30000)) {
          coords = latestCoordsRef.current.coords;
        }

        if (!coords) {
          if (Capacitor.isNativePlatform()) {
            try {
              const pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 15000
              });
              coords = pos.coords;
            } catch (capErr) {
              console.warn('[Tracker] getCurrentPosition native error:', capErr);
            }
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
        }

        if (!coords || !coords.latitude || !coords.longitude) {
          console.warn('[Tracker] GPS coordinates unavailable for tracker punch. Retrying next heartbeat.');
          return;
        }

        // E. Send tracker punch to attendance_punches table
        await api.post('/employee/attendance/punch', {
          action: 'punch',
          latitude: coords.latitude,
          longitude: coords.longitude,
          photo: 'Tracker'
        });

        localStorage.setItem('last_tracker_punch_time', Date.now().toString());
        console.log(`[Tracker] Punch recorded at ${new Date().toLocaleTimeString()} (Lat: ${coords.latitude}, Lng: ${coords.longitude})`);

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['employee', 'attendance'] });
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });

      } catch (err) {
        console.error('[Tracker] Tracking error:', err.response?.data?.error || err.message);
      } finally {
        isPunchingRef.current = false;
      }
    };

    // Fast heartbeat check: runs every 15 seconds to check if TRACKER_INTERVAL_MS has elapsed
    const checkHeartbeat = () => {
      const lastPunchTime = parseInt(localStorage.getItem('last_tracker_punch_time') || '0', 10);
      const now = Date.now();
      if (lastPunchTime === 0 || (now - lastPunchTime >= TRACKER_INTERVAL_MS - 5000)) {
        executeTrackerPunch();
      }
    };

    // Initial check after 3 seconds
    const initialTimeout = setTimeout(checkHeartbeat, 3000);

    // Heartbeat timer every 15s
    heartbeatTimer = setInterval(checkHeartbeat, HEARTBEAT_INTERVAL_MS);

    // App resume listener (Android background to foreground)
    let appStateListener = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          checkHeartbeat();
        }
      }).then(l => { appStateListener = l; });
    }

    // Window focus and visibility change listeners
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkHeartbeat();
      }
    };
    window.addEventListener('focus', checkHeartbeat);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialTimeout);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (appStateListener) appStateListener.remove();
      window.removeEventListener('focus', checkHeartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, profile?.role, queryClient]);

  return null;
}
