import React, { useEffect, useState, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRemoteData } from '../state/remote.js';
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
import useMapsBrowserKey from '../hooks/useMapsBrowserKey';

const EmployeeMobileMap = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state;
  const action = locationState?.action;
  
  const { profile } = useAuth();
  const { browserKey, loadingBrowserKey } = useMapsBrowserKey();
  
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
  const { data, isLoading: loadingGeofences, error: geofencesError } = useRemoteData({
    scope: ['employee', 'geofences'],
    load: async () => {
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
    if (!currentLocation || !data || !browserKey) return;

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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(browserKey)}&libraries=geometry`;
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
          fillColor: '#5B86C2',
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
          strokeColor: '#5B86C2',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#8AADDB',
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
              strokeColor: '#1F9D55',
              fillColor: '#1F9D55',
            });
          }
        }
      });

      if (geofences.length > 0) {
        setIsInsideGeofence(isInsideAny);
        setDistanceToNearest(minDistance);
      } else {
        // SEC-014: No configured office is not an allow-all geofence.
        setIsInsideGeofence(false);
        setDistanceToNearest(null);
      }
    };

    loadGoogleMapsScript();
  }, [currentLocation, data, browserKey]);

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
    <div className="flex h-[100dvh] flex-col bg-[var(--bg)] overflow-hidden relative font-sans antialiased text-[var(--text)]">
      
      {/* Header */}
      <div className="flex items-center px-4 py-3.5 bg-[var(--surface)] border-b border-[var(--line)] z-10 relative">
        <button
          onClick={() => navigate('/employee', { replace: true })}
          className="p-2 -ml-2 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] rounded-full transition-colors cursor-pointer"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="ml-2 text-base font-semibold text-[var(--text)]">
          Verify Location
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col min-h-0">
        
        {/* Map Container */}
        <div className="flex-1 relative bg-[var(--surface-alt)]">
          {mapLockoutSeconds !== null && mapLockoutSeconds > 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--surface)] space-y-4 z-20">
              <div className="w-14 h-14 rounded-[18px] bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] flex items-center justify-center border border-[var(--badge-warning-text)]/20 shadow-xs">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-semibold text-[var(--text)]">Rate Limit Active</h3>
                <p className="text-xs text-[var(--muted)]">
                  Too many punch requests were received in a short time. Location verification is temporarily locked.
                </p>
              </div>
              <div className="bg-[var(--surface-alt)] border border-[var(--line)] rounded-[16px] px-6 py-3 text-center space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Unlocks In</span>
                <p className="text-2xl font-bold font-mono text-[var(--badge-warning-text)]">
                  {Math.floor(mapLockoutSeconds / 60)}m {String(mapLockoutSeconds % 60).padStart(2, '0')}s
                </p>
              </div>
              <button 
                type="button"
                onClick={() => navigate('/employee', { replace: true })}
                className="px-6 py-2.5 bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          ) : locationError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--surface)] space-y-3 z-10">
              <div className="w-12 h-12 rounded-[16px] bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] flex items-center justify-center border border-[var(--badge-danger-text)]/20">
                <MapPinOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text)]">Location Access Denied</h3>
              <p className="text-xs text-[var(--muted)] max-w-xs">{locationError}</p>
              <button 
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : !currentLocation || loadingGeofences || loadingBrowserKey ? (
            <div className="absolute inset-0 z-10 bg-[var(--bg)] p-4 overflow-y-auto">
              <PageLoader message="Acquiring GPS signal..." />
            </div>
          ) : !browserKey ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--surface-alt)] z-10">
              <MapPin className="w-10 h-10 text-[var(--muted)] mb-3" />
              <p className="text-sm font-semibold text-[var(--text)]">Map unavailable</p>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-xs">Waiting for a restricted Maps JavaScript browser key.</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
        </div>

        {/* Bottom Drawer */}
        <div className="bg-[var(--surface)] rounded-t-[28px] shadow-xl z-20 relative pt-3 px-6 pb-8 border-t border-[var(--line)]">
          {/* Handle */}
          <div className="w-10 h-1 bg-[var(--line)] rounded-full mx-auto mb-4" />

          {/* Location Info */}
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] flex items-center justify-center shrink-0 border border-[var(--brand)]/20">
              <Navigation className="w-5 h-5 text-[var(--brand-deep)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-0.5">Current Location</h3>
              <p className="text-xs font-medium text-[var(--text)] leading-snug line-clamp-2">{address}</p>
            </div>
          </div>

          {/* Geofence Status */}
          {currentLocation && isGeoFenceEnabled && action !== 'punch' && isInsideGeofence !== null && (
            <div className={`p-3.5 rounded-[16px] mb-4 border ${
              isInsideGeofence 
                ? 'bg-[var(--badge-success-bg)] border-[var(--badge-success-text)]/20 text-[var(--badge-success-text)]' 
                : 'bg-[var(--badge-danger-bg)] border-[var(--badge-danger-text)]/20 text-[var(--badge-danger-text)]'
            }`}>
              <div className="flex items-start gap-3">
                {isInsideGeofence ? (
                  <CheckCircle2 className="w-5 h-5 text-[var(--badge-success-text)] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[var(--badge-danger-text)] shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-semibold">
                    {isInsideGeofence ? 'Inside Geofence' : 'Outside Geofence'}
                  </h4>
                  <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
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
            <div className="p-3.5 rounded-[16px] mb-4 bg-[var(--surface-alt)] border border-[var(--line)]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[var(--muted)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text)]">Remote {getActionLabel()} Allowed</h4>
                  <p className="text-[11px] mt-0.5 text-[var(--muted)]">Your location will be recorded with this {getActionLabel().toLowerCase()}.</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed || !currentLocation}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span>Proceed to Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeMobileMap;
