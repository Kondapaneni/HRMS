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
  Camera,
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
          if (geoData?.display_name) {
            setAddress(geoData.display_name);
          } else {
            setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        } catch (e) {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied. Please enable location services in your device settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out.';
            break;
          default:
            msg = 'An unknown error occurred while requesting location.';
        }
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (!currentLocation || !data) return;

    const apiKey = data.googleMapsApiKey;
    if (!apiKey) return;

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const scriptId = 'google-maps-script';
      let script = document.getElementById(scriptId);

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => initMap();
        script.onerror = () => {
          console.error('Failed to load Google Maps SDK.');
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', () => initMap());
      }
    };

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: currentLocation,
        zoom: 16,
        minZoom: 16,
        maxZoom: 16,
        disableDefaultUI: true,
        zoomControl: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        keyboardShortcuts: false,
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
    <div className="flex h-[100dvh] flex-col bg-slate-50 overflow-hidden relative font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      
      {/* Header */}
      <div className="flex items-center px-4 py-4 bg-white border-b border-slate-200 z-10 shadow-sm relative">
        <button
          onClick={() => navigate('/employee', { replace: true })}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="ml-2 text-lg font-medium text-slate-900" style={{ fontWeight: 500 }}>
          Verify <span className="font-medium italic text-[#1a73e8]">Location</span>
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col min-h-0">
        
        {/* Map Container */}
        <div className="flex-1 relative bg-slate-100">
          {mapLockoutSeconds !== null && mapLockoutSeconds > 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white space-y-4 z-20">
              <div className="w-16 h-16 rounded-3xl bg-[#fef7e0] text-[#b06000] flex items-center justify-center border border-[#feefc3] shadow-xs">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-bold text-slate-900">Punch Rate Limit Active</h3>
                <p className="text-xs text-slate-500">
                  Too many punch requests were received in a short time. Location verification is temporarily locked.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 text-center space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unlocks Automatically In</span>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white space-y-3 z-10">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                <MapPinOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Location Access Denied</h3>
              <p className="text-xs text-slate-500 max-w-xs">{locationError}</p>
              <button 
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : !currentLocation || loadingGeofences ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/50 backdrop-blur-sm z-10">
              <Loader2 className="w-10 h-10 text-[#1a73e8] animate-spin mb-4" />
              <p className="text-slate-600 font-medium animate-pulse text-xs">Acquiring GPS Signal...</p>
            </div>
          ) : !data?.googleMapsApiKey ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-100 z-10">
              <MapPin className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">Map unavailable</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Waiting for admin to configure Google Maps API key.</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
        </div>

        {/* Bottom Drawer */}
        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-20 relative pt-2 px-6 pb-8 border-t border-slate-100">
          {/* Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />

          {/* Location Info */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#e8f0fe] flex items-center justify-center shrink-0 border border-[#d2e3fc]">
              <Navigation className="w-5 h-5 text-[#1a73e8]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 mb-0.5">Current Location</h3>
              <p className="text-xs text-slate-500 leading-snug line-clamp-2">{address}</p>
            </div>
          </div>

          {/* Geofence Status */}
          {currentLocation && isGeoFenceEnabled && action !== 'punch' && isInsideGeofence !== null && (
            <div className={`p-4 rounded-2xl mb-5 border ${isInsideGeofence ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-start gap-3">
                {isInsideGeofence ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className={`text-sm font-bold ${isInsideGeofence ? 'text-emerald-900' : 'text-red-900'}`}>
                    {isInsideGeofence ? 'Inside Geofence' : 'Outside Geofence'}
                  </h4>
                  <p className={`text-xs mt-1 ${isInsideGeofence ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isInsideGeofence 
                      ? "You are within the approved area to punch." 
                      : distanceToNearest 
                        ? `You are ${Math.round(distanceToNearest)} meters away from the nearest boundary.`
                        : "You must be within a company location to proceed."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning for disabled geofence or punch action */}
          {currentLocation && (!isGeoFenceEnabled || action === 'punch') && (
            <div className="p-4 rounded-2xl mb-5 bg-slate-50 border border-slate-100">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-700">Remote {getActionLabel()} Allowed</h4>
                  <p className="text-xs mt-1 text-slate-500">Your location will be recorded with this {getActionLabel().toLowerCase()}.</p>
                </div>
              </div>
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed || !currentLocation}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Camera className="w-5 h-5" />
            <span>Proceed to Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeMobileMap;
