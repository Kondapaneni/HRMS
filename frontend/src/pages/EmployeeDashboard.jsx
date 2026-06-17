import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Building, Calendar, Mail, Briefcase, LogIn, LogOut, Clock, CalendarDays, BarChart3, AlertCircle, Loader2, Coffee } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EmployeeMobileDashboard from './EmployeeMobileDashboard';

const EmployeeDashboard = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [punchingAction, setPunchingAction] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['employee', 'dashboard'],
    queryFn: async () => {
      const [attRes, leavesRes, perfRes, profileRes, payslipsRes] = await Promise.all([
        api.get('/employee/attendance').catch(() => ({ data: [] })),
        api.get('/employee/leaves').catch(() => ({ data: null })),
        api.get('/employee/performance').catch(() => ({ data: {} })),
        api.get('/employee/profile').catch(() => ({ data: {} })),
        api.get('/employee/payroll').catch(() => ({ data: { payslips: [] } }))
      ]);
      return {
        attendance: attRes.data,
        leaves: leavesRes.data,
        performance: perfRes.data?.currentMonthSummary || null,
        fullProfile: profileRes.data?.profile || null,
        latestPayslip: payslipsRes.data?.payslips?.[0] || null
      };
    },
    staleTime: 30 * 1000
  });

  const attendance = dashboardData?.attendance || [];
  const leaves = dashboardData?.leaves || null;
  const performance = dashboardData?.performance || null;
  const fullProfile = dashboardData?.fullProfile || profile;
  const latestPayslip = dashboardData?.latestPayslip || null;

  const reverseGeocode = async (lat, lng) => {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handlePunch = async (action) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setPunchingAction(action);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const addr = await reverseGeocode(lat, lng);

        let isAllowed = true;
        const isGeoFenceEnabled = profile?.geoFenceEnabled == 1 || profile?.geoFenceEnabled === true || profile?.geoFenceEnabled === '1' || profile?.geoFenceEnabled === 'true';
        
        if (isGeoFenceEnabled && action !== 'punch') {
          try {
            const geofenceRes = await api.get('/employee/geofences');
            const geofences = geofenceRes.data?.geofences || [];
            if (geofences.length > 0) {
              let insideAny = false;
              geofences.forEach(gf => {
                const d = getDistanceFromLatLonInMeters(lat, lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                if (d <= parseFloat(gf.radius)) insideAny = true;
              });
              if (!insideAny) isAllowed = false;
            }
          } catch (err) {
            console.error('Failed to validate geofences:', err);
            toast.error('Failed to validate geofence. Please try again.');
            setPunchingAction(null);
            return;
          }
        }
        
        if (!isAllowed) {
          toast.error(`You are outside the company premises. Geofencing is required to ${action.replace('-', ' ')}.`);
          setPunchingAction(null);
          return;
        }

        try {
          await api.post('/employee/attendance/punch', {
            action,
            latitude: lat,
            longitude: lng,
            address: addr
          });
          toast.success(`Successfully ${action.replace('-', ' ')}ed!`);
          queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] });
        } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.error || `Failed to ${action}.`);
        } finally {
          setPunchingAction(null);
        }
      },
      (error) => {
        toast.error('Unable to read your location. Please allow location access to check in/out.');
        setPunchingAction(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayRecord = attendance.find(r => r.date?.split('T')[0] === todayStr) || attendance.find(r => r.date && new Date(r.date).toDateString() === new Date().toDateString());
  const checkedIn = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;
  const checkOutTime = todayRecord && todayRecord.checkOut;

  const shapeVariants = {
    animate: (i) => ({
      y: [0, -15, 0],
      x: [0, 10, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4 + i * 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    })
  };

  return (
    <>
      <div className="md:hidden">
        <EmployeeMobileDashboard />
      </div>

      <div className="hidden md:block space-y-6">
        {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{getGreeting()}, {profile?.firstName}!</h1>
          <p className="text-sm text-slate-500 mt-1">Here is your daily overview and performance stats.</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-blue-600">{currentTime.toLocaleTimeString()}</p>
          <p className="text-sm text-slate-500">{currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Quick Punch Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-2 relative overflow-hidden group hover:border-blue-200 transition-colors z-0">
          {/* Animated Background Graphics */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#F59E0B] rounded-full opacity-20 -top-10 -right-10" />
            <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-24 h-24 bg-[#10B981] rounded-3xl opacity-20 bottom-[-20px] left-1/4 rotate-12" />
            <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-40 h-40 bg-[#3B82F6] rounded-full opacity-15 top-1/2 left-1/2" />
            <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-20 h-20 bg-[#EC4899] rounded-xl opacity-20 top-4 left-10 -rotate-12" />
          </div>

          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
            <Clock size={18} className="text-blue-500" />
            Quick Punch
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="text-center sm:text-left">
              <p className="text-slate-500 text-sm mb-2">Track your daily attendance</p>
              {todayRecord?.checkIn ? (
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-slate-500">Check-in:</span> <span className="font-medium text-slate-900">{new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                  {todayRecord?.checkOut && (
                    <p className="text-sm">
                      <span className="text-slate-500">Check-out:</span> <span className="font-medium text-slate-900">{new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block">Not checked in yet</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handlePunch('check-in')}
                disabled={punchingAction || checkedIn || checkOutTime}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-11 px-6 min-w-[140px] disabled:opacity-50 transition-all hover:shadow-md"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {punchingAction === 'check-in' ? 'Checking In...' : 'Check In'}
              </button>

              <button
                onClick={() => handlePunch('punch')}
                disabled={punchingAction || !checkedIn || checkOutTime}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-11 px-6 min-w-[140px] disabled:opacity-50 transition-all hover:shadow-md"
              >
                <Clock className="mr-2 h-4 w-4 text-slate-500" />
                {punchingAction === 'punch' ? 'Punching...' : 'Punch'}
              </button>

              <button
                onClick={() => handlePunch('check-out')}
                disabled={punchingAction || !checkedIn || checkOutTime}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-11 px-6 min-w-[140px] disabled:opacity-50 transition-all hover:shadow-md"
              >
                <LogOut className="mr-2 h-4 w-4 text-slate-500" />
                {punchingAction === 'check-out' ? 'Checking Out...' : 'Check Out'}
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100/60 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Standard Shift</p>
                <p className="text-sm font-medium text-slate-800">{fullProfile?.shiftTime || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shadow-sm border border-purple-100">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Week Off</p>
                <p className="text-sm font-medium text-slate-800">{fullProfile?.weekOff || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shadow-sm border border-emerald-100">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Work Location</p>
                <p className="text-sm font-medium text-slate-800">{fullProfile?.branch_name || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10"></div>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-3xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (profile?.firstName || profile?.email || 'E').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">My Profile</h2>
              <p className="text-sm text-slate-500">Employee Information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Role</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{profile?.role}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Department</p>
              <p className="text-sm font-medium text-slate-900">{profile?.department || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
              <p className="text-sm font-medium text-slate-900 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Performance Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart3 size={18} className="text-purple-500" />
            Current Month Performance
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Attendance Score</p>
              <p className="text-3xl font-bold text-slate-800">
                {performance?.attendancePct !== undefined ? performance.attendancePct : '--'}%
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">On-Time Score</p>
              <p className="text-3xl font-bold text-slate-800">
                {performance?.onTimePct !== undefined ? performance.onTimePct : '--'}%
              </p>
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-2 bg-purple-50 text-purple-700 p-3 rounded-md text-sm border border-purple-100">
              <AlertCircle size={16} />
              <span>Aim to keep your scores above 90% for a good rating!</span>
            </div>
          </div>
        </div>

        {/* Leave Balances */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CalendarDays size={18} className="text-emerald-500" />
            Leave Balances
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Paid Leaves (Annual)</p>
                <p className="text-xs text-slate-500">Available to use</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-800">
                  {leaves?.balance ? Math.max(0, leaves.balance.paidTotal - leaves.balance.paidUsed) : '--'}
                </p>
                <p className="text-xs text-slate-500">out of {leaves?.balance?.paidTotal || '--'}</p>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Unpaid Leaves</p>
                <p className="text-xs text-slate-500">Used this year</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-800">{leaves?.balance?.unpaidUsed || '0'}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default EmployeeDashboard;
