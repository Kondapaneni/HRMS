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
 * Runs only when employee has checked in and has not yet checked out.
 * Automatically stops tracking if the employee forgets to check out and the shift or day has ended.
 * Records location into attendance_punches with photo = 'Tracker'.
 */
export const TRACKER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes (switch to 15 * 60 * 1000 when ready)

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
    if (now.getTime() > cutoff) {
      console.log(`[Tracker] Shift ended at ${todayRecord.shiftEndTime} (+2h grace). Employee forgot to check out. Automatic tracking stopped.`);
      return true;
    }
  } else {
    // Default end-of-business-day cutoff at 23:30 (11:30 PM)
    if (now.getHours() === 23 && now.getMinutes() >= 30) {
      console.log('[Tracker] End of business day reached (23:30). Automatic tracking stopped.');
      return true;
    }
  }

  return false;
}

export default function BackgroundLocationTracker() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const isPunchingRef = useRef(false);

  useEffect(() => {
    // Only run for authenticated employees
    if (!user || profile?.role !== 'employee') return;

    let timerId = null;

    const executeTrackerPunch = async () => {
      if (isPunchingRef.current) return;
      isPunchingRef.current = true;

      try {
        // 1. Fetch today's attendance status to verify employee is actively checked in
        const todayStr = new Date().toLocaleDateString('en-CA');
        const res = await api.get('/employee/attendance');
        const attendanceList = res.data || [];
        const todayRecord = 
          attendanceList.find(r => r.date?.split('T')[0] === todayStr) || 
          attendanceList.find(r => r.date && new Date(r.date).toDateString() === new Date().toDateString());

        const isCheckedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;

        // If employee is not checked in or already checked out, do not record tracker punch
        if (!isCheckedIn) {
          return;
        }

        // 2. Automatic stop if employee forgot to check out and day/shift has ended
        if (isDayOrShiftEnded(todayRecord)) {
          return;
        }

        // 3. Prevent duplicate punches within interval (allow 5s leeway)
        const lastPunchTime = parseInt(localStorage.getItem('last_tracker_punch_time') || '0', 10);
        const now = Date.now();
        if (now - lastPunchTime < TRACKER_INTERVAL_MS - 5000) {
          return;
        }

        // 4. Acquire current GPS coordinates
        let coords = null;
        if (Capacitor.isNativePlatform()) {
          try {
            const perm = await Geolocation.checkPermissions();
            if (perm.location !== 'granted') {
              await Geolocation.requestPermissions();
            }
            const pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 30000
            });
            coords = pos.coords;
          } catch (capErr) {
            console.warn('[Tracker] Capacitor Geolocation failed, trying fallback:', capErr);
          }
        }

        // Browser fallback / Web attendance
        if (!coords && navigator.geolocation) {
          coords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve(p.coords),
              (err) => {
                console.warn('[Tracker] navigator.geolocation failed:', err);
                resolve(null);
              },
              { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
            );
          });
        }

        if (!coords || !coords.latitude || !coords.longitude) {
          console.warn('[Tracker] Unable to retrieve GPS coordinates for tracker punch.');
          return;
        }

        // 5. Send background tracker punch to attendance_punches table
        await api.post('/employee/attendance/punch', {
          action: 'punch',
          latitude: coords.latitude,
          longitude: coords.longitude,
          photo: 'Tracker'
        });

        localStorage.setItem('last_tracker_punch_time', now.toString());
        console.log(`[Tracker] Background location punch recorded at ${new Date().toLocaleTimeString()} (Lat: ${coords.latitude}, Lng: ${coords.longitude})`);

        // Refresh queries so UI stays synced
        queryClient.invalidateQueries({ queryKey: ['employee', 'attendance'] });
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });

      } catch (err) {
        console.error('[Tracker] Background location tracking error:', err.response?.data?.error || err.message);
      } finally {
        isPunchingRef.current = false;
      }
    };

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(() => {
      executeTrackerPunch();
    }, 5000);

    // Periodic check every TRACKER_INTERVAL_MS (2 minutes)
    timerId = setInterval(executeTrackerPunch, TRACKER_INTERVAL_MS);

    // Resume listener when app returns to foreground
    let appStateListener = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          executeTrackerPunch();
        }
      }).then(l => { appStateListener = l; });
    }

    // Window focus listener for web
    const handleFocus = () => executeTrackerPunch();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimeout);
      if (timerId) clearInterval(timerId);
      if (appStateListener) appStateListener.remove();
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, profile?.role, queryClient]);

  return null;
}
