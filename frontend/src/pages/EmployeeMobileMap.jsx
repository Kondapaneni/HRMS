import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  MapPinOff, 
  ArrowLeft, 
  Loader2, 
  Navigation, 
  AlertCircle, 
  CheckCircle2,
  Sparkles,
  Camera,
  Compass,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileMap = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state;
  const action = locationState?.action;
  
  const { profile } = useAuth();
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [address, setAddress] = useState('Locating your position...');
  const [locationError, setLocationError] = useState('');
  const [isInsideGeofence, setIsInsideGeofence] = useState(null); // null = checking, true/false
  const [distanceToNearest, setDistanceToNearest] = useState(null);
  const [mapLockoutSeconds, setMapLockoutSeconds] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circlesRef = useRef([]);

  // Redirect if no action provided
  useEffect(() => {
    if (!action) {
      navigate('/employee', { replace: true });
    }
  }, [action, navigate]);

  // Fetch geofences from backend
  const { data, isLoading: loadingGeofences, error: geofencesError } = useQuery({
    queryKey: ['employee', 'geofences'],
    queryFn: async () => {
      try {
        const response = await api.get('/employee/geofences');
        return response.data;
      } catch (err) {
        if (err.response?.status === 429) {
          try {
            const statusRes = await api.get('/employee/maps-rate-limit-status');
            if (statusRes.data?.secondsRemaining) {
              setMapLockoutSeconds(statusRes.data.secondsRemaining);
            } else {
              setMapLockoutSeconds(600);
            }
          } catch (e) {
            setMapLockoutSeconds(600);
          }
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 0
  });

  // Countdown timer for map lockout
  useEffect(() => {
    if (mapLockoutSeconds !== null && mapLockoutSeconds > 0) {
      const timer = setInterval(() => {
        setMapLockoutSeconds(prev => (prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mapLockoutSeconds]);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your device browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });

        // Reverse geocoding via Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const geoData = await res.json();
          if (geoData && geoData.display_name) {
            setAddress(geoData.display_name);
          } else {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch (err) {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (error) => {
        let errorMsg = 'Unable to determine your GPS location.';
        if (error.code === 1) errorMsg = 'Location access permission was denied. Please allow location access in your browser settings.';
        else if (error.code === 2) errorMsg = 'GPS location is currently unavailable.';
        else if (error.code === 3) errorMsg = 'Location request timed out. Please check signal strength.';
        setLocationError(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Initialize Map and check geofence distance
  useEffect(() => {
    if (!currentLocation || !data || !data.googleMapsApiKey || !mapRef.current) return;

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', initMap);
        return;
      }
      
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.googleMapsApiKey}&libraries=geometry&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      window.initGoogleMap = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      const map = new window.google.maps.Map(mapRef.current, {
        center: currentLocation,
        zoom: 16,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
      });
      mapInstanceRef.current = map;

      // User marker
      markerRef.current = new window.google.maps.Marker({
        position: currentLocation,
        map,
        title: 'Your Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1a73e8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });

      // Clear previous circles
      circlesRef.current.forEach(c => c.setMap(null));
      circlesRef.current = [];

      const geofences = data.geofences || [];
      let isInsideAny = false;
      let minDistance = Infinity;

      geofences.forEach(gf => {
        const gfCenter = { lat: parseFloat(gf.latitude), lng: parseFloat(gf.longitude) };
        const radius = parseInt(gf.radius, 10);

        // Draw circle
        const circle = new window.google.maps.Circle({
          strokeColor: '#1a73e8',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#1a73e8',
          fillOpacity: 0.15,
          map,
          center: gfCenter,
          radius: radius,
        });
        circlesRef.current.push(circle);

        // Calculate distance
        if (window.google.maps.geometry) {
          const userLatLng = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
          const gfLatLng = new window.google.maps.LatLng(gfCenter.lat, gfCenter.lng);
          const distance = window.google.maps.geometry.spherical.computeDistanceBetween(userLatLng, gfLatLng);
          
          if (distance < minDistance) {
            minDistance = distance;
          }
          
          if (distance <= radius) {
            isInsideAny = true;
            circle.setOptions({
              strokeColor: '#137333',
              fillColor: '#137333',
            });
          }
        }
      });

      if (geofences.length > 0) {
        setIsInsideGeofence(isInsideAny);
        setDistanceToNearest(minDistance);
      } else {
        setIsInsideGeofence(true);
      }
    };

    loadGoogleMapsScript();
  }, [currentLocation, data]);

  // Timeout safety
  useEffect(() => {
    if (currentLocation && isInsideGeofence !== null) {
      const timer = setTimeout(() => {
        toast.error('Location Verification Session Expired. Please Try Again.');
        navigate('/employee', { replace: true });
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [currentLocation, isInsideGeofence, navigate]);

  const handleProceed = () => {
    navigate('/employee/attendance/camera', {
      state: {
        action,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        address
      }
    });
  };

  const rawGeoFenceEnabled = data?.geoFenceEnabled !== undefined ? data.geoFenceEnabled : profile?.geoFenceEnabled;
  const isGeoFenceEnabled = rawGeoFenceEnabled == 1 || rawGeoFenceEnabled === true || rawGeoFenceEnabled === '1' || rawGeoFenceEnabled === 'true';
  
  let canProceed = false;
  if (currentLocation) {
    if (!isGeoFenceEnabled || action === 'punch') {
      canProceed = true;
    } else if (isInsideGeofence === true) {
      canProceed = true;
    }
  }

  const getActionLabel = () => {
    if (!action) return 'Punch';
    if (action === 'check-in') return 'Check In';
    if (action === 'check-out') return 'Check Out';
    return 'Punch';
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f8fafd] overflow-hidden relative">
      
      {/* Header Card */}
      <div className="bg-white border-b border-[#e0e3e7] p-4 z-10 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/employee', { replace: true })}
              className="p-2 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                  GPS Verification
                </span>
              </div>
              <h1 className="text-base font-bold text-[#1f1f1f] tracking-tight mt-0.5">
                Verify Location &amp; Geofence
              </h1>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Compass className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="flex-1 relative flex flex-col min-h-0">
        
        <div className="flex-1 relative bg-[#f1f3f4]">
          {mapLockoutSeconds !== null && mapLockoutSeconds > 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white space-y-4 z-20">
              <div className="w-16 h-16 rounded-3xl bg-[#fef7e0] text-[#b06000] flex items-center justify-center border border-[#feefc3] shadow-xs">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-bold text-[#1f1f1f]">Punch Rate Limit Active</h3>
                <p className="text-xs text-[#5f6368]">
                  Too many punch requests were received in a short time. Location verification is temporarily locked.
                </p>
              </div>
              <div className="bg-[#f8fafd] border border-[#dadce0] rounded-2xl px-6 py-3 text-center space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Unlocks Automatically In</span>
                <p className="text-2xl font-black font-mono text-[#b06000]">
                  {Math.floor(mapLockoutSeconds / 60)}m {String(mapLockoutSeconds % 60).padStart(2, '0')}s
                </p>
              </div>
              <button 
                type="button"
                onClick={() => navigate('/employee', { replace: true })}
                className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          ) : locationError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] text-[#c5221f] flex items-center justify-center border border-[#fad2cf]">
                <MapPinOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#1f1f1f]">Location Permission Denied</h3>
              <p className="text-xs text-[#5f6368] max-w-xs">{locationError}</p>
              <button 
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Retry Location Request
              </button>
            </div>
          ) : !currentLocation || loadingGeofences ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/70 backdrop-blur-xs z-10 space-y-3">
              <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin" />
              <p className="text-xs font-semibold text-[#1f1f1f] animate-pulse">Acquiring High-Accuracy GPS Coordinates...</p>
            </div>
          ) : !data?.googleMapsApiKey ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#f8fafd] z-10 space-y-2">
              <MapPin className="w-8 h-8 text-[#5f6368] opacity-40" />
              <p className="text-xs font-semibold text-[#1f1f1f]">Map Visual Unavailable</p>
              <p className="text-[11px] text-[#5f6368] max-w-xs">GPS coordinates are active and will be recorded with your attendance log.</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
        </div>

        {/* Bottom Drawer Card */}
        <div className="bg-white rounded-t-3xl shadow-2xl border-t border-[#e0e3e7] z-20 relative p-5 space-y-4">
          
          {/* Top 4-Color Gradient Line */}
          <div className="h-1 -mt-5 -mx-5 mb-3 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

          {/* Current Address Pill */}
          <div className="flex items-center gap-3 p-3 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
            <div className="w-8 h-8 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 border border-[#d2e3fc]">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-[#5f6368] uppercase tracking-wider">Current GPS Address</p>
              <p className="text-xs font-semibold text-[#1f1f1f] leading-snug line-clamp-1 mt-0.5">{address}</p>
            </div>
          </div>

          {/* Geofence Status Alerts */}
          {currentLocation && isGeoFenceEnabled && action !== 'punch' && isInsideGeofence !== null && (
            <div className={`p-3.5 rounded-2xl border ${
              isInsideGeofence ? 'bg-[#e6f4ea] border-[#ceead6]' : 'bg-[#fce8e6] border-[#fad2cf]'
            }`}>
              <div className="flex items-start gap-2.5">
                {isInsideGeofence ? (
                  <CheckCircle2 className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#c5221f] shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className={`text-xs font-bold ${isInsideGeofence ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                    {isInsideGeofence ? 'Inside Approved Workplace Geofence' : 'Outside Workplace Geofence'}
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isInsideGeofence ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                    {isInsideGeofence 
                      ? 'You are within the authorized workplace boundary. You may proceed to photo punch.' 
                      : distanceToNearest 
                        ? `You are currently ~${Math.round(distanceToNearest)} meters away from the nearest designated office location.`
                        : 'Attendance must be marked within an authorized company geofence boundary.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning for Remote / Flexible Punch Mode */}
          {currentLocation && (!isGeoFenceEnabled || action === 'punch') && (
            <div className="p-3.5 rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#1a73e8]">Remote {getActionLabel()} Enabled</h4>
                  <p className="text-[11px] text-[#5f6368] mt-0.5">Your verified GPS location coordinates will be submitted alongside your attendance record.</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed || !currentLocation}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
          >
            <Camera className="w-4 h-4" />
            <span>Proceed to Face Capture</span>
          </button>

        </div>
      </div>

    </div>
  );
};

export default EmployeeMobileMap;
