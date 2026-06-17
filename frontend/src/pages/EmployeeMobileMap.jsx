import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { MapPin, MapPinOff, ArrowLeft, Loader2, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileMap = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state;
  const action = locationState?.action;
  
  const { profile } = useAuth();
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [address, setAddress] = useState('Locating...');
  const [locationError, setLocationError] = useState('');
  const [isInsideGeofence, setIsInsideGeofence] = useState(null); // null = checking, true/false
  const [distanceToNearest, setDistanceToNearest] = useState(null);

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
  const { data, isLoading: loadingGeofences } = useQuery({
    queryKey: ['employee', 'geofences'],
    queryFn: async () => {
      const response = await api.get('/employee/geofences');
      return response.data;
    },
    staleTime: 5 * 60 * 1000 // 5 mins
  });

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
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
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch (err) {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (error) => {
        let errorMsg = 'Unable to read your location.';
        if (error.code === 1) errorMsg = 'Location permission denied.';
        else if (error.code === 2) errorMsg = 'Location unavailable.';
        else if (error.code === 3) errorMsg = 'Location request timed out.';
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
          fillColor: '#3b82f6',
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

      // Ensure geometry library is loaded
      if (!window.google.maps.geometry) {
        console.error("Google Maps Geometry library not loaded!");
      }

      geofences.forEach(gf => {
        const gfCenter = { lat: parseFloat(gf.latitude), lng: parseFloat(gf.longitude) };
        const radius = parseInt(gf.radius, 10);

        // Draw circle
        const circle = new window.google.maps.Circle({
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#3b82f6',
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
              strokeColor: '#22c55e',
              fillColor: '#22c55e',
            });
          }
        }
      });

      if (geofences.length > 0) {
        setIsInsideGeofence(isInsideAny);
        setDistanceToNearest(minDistance);
      } else {
        // No geofences defined in system, default to true
        setIsInsideGeofence(true);
      }
    };

    loadGoogleMapsScript();
  }, [currentLocation, data]);

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

  const isGeoFenceEnabled = profile?.geoFenceEnabled === 1 || profile?.geoFenceEnabled === true;
  
  // Determine if user can proceed
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
    <div className="flex h-[100dvh] flex-col bg-slate-50 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center px-4 py-4 bg-white border-b border-slate-200 z-10 shadow-sm relative">
        <button
          onClick={() => navigate('/employee', { replace: true })}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="ml-2 text-lg font-bold text-slate-900">Verify Location</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col min-h-0">
        
        {/* Map Container */}
        <div className="flex-1 relative bg-slate-100">
          {locationError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <MapPinOff className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-slate-900 font-bold text-lg mb-2">Location Access Denied</h3>
              <p className="text-slate-500 text-sm">{locationError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-sm active:scale-95 transition-transform"
              >
                Try Again
              </button>
            </div>
          ) : !currentLocation || loadingGeofences ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/50 backdrop-blur-sm z-10">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-600 font-medium animate-pulse">Acquiring GPS Signal...</p>
            </div>
          ) : !data?.googleMapsApiKey ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-100 z-10">
              <MapPin className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">Map unavailable</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Waiting for admin to configure Google Maps API key.</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full"></div>
          )}
        </div>

        {/* Bottom Drawer */}
        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-20 relative pt-2 px-6 pb-8 border-t border-slate-100">
          {/* Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5"></div>

          {/* Location Info */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 mb-1">Current Location</h3>
              <p className="text-sm text-slate-500 leading-snug line-clamp-2">{address}</p>
            </div>
          </div>

          {/* Geofence Status */}
          {currentLocation && isGeoFenceEnabled && action !== 'punch' && isInsideGeofence !== null && (
            <div className={`p-4 rounded-2xl mb-6 border ${isInsideGeofence ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
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
            <div className="p-4 rounded-2xl mb-6 bg-slate-50 border border-slate-100">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-700">Remote Punching Allowed</h4>
                  <p className="text-xs mt-1 text-slate-500">Your location will be recorded with this {action === 'punch' ? 'punch' : 'action'}.</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleProceed}
            disabled={!canProceed || !currentLocation}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-sm transition-all active:scale-[0.98] ${
              canProceed && currentLocation
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Proceed to Camera
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeMobileMap;
