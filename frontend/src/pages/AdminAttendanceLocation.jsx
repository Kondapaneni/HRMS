import React, { useEffect, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { MapPin, ArrowRightToLine, ArrowLeftFromLine, MapPinOff, ArrowLeft, ArrowRight } from 'lucide-react';

const AdminAttendanceLocation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromRegularize = location.state?.fromRegularize;
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const date = searchParams.get('date');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ checkIn: null, checkOut: null, punch: [] });
  const infoWindowRef = useRef(null);
  const pinnedMarkerRef = useRef(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin', 'attendance-location', id],
    queryFn: async () => {
      const response = await axios.get(`/admin/attendance/location/${id}`);
      return response.data;
    },
    enabled: !!id,
    onError: () => {
      toast.error('Failed to fetch attendance location details.');
      navigate('/admin/attendance');
    },
  });

  useEffect(() => {
    if (!data || !data.googleMapsApiKey || !mapRef.current) return;

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.googleMapsApiKey}&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      window.initGoogleMap = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      const { record, punches } = data;

      const checkInCoords = record.checkInLat && record.checkInLng;
      const checkOutCoords = record.checkOutLat && record.checkOutLng;

      let defaultCenter = { lat: 0, lng: 0 };
      if (checkInCoords) {
        defaultCenter = { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) };
      } else if (checkOutCoords) {
        defaultCenter = { lat: parseFloat(record.checkOutLat), lng: parseFloat(record.checkOutLng) };
      }

      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 12,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
      });
      mapInstanceRef.current = map;

      map.addListener('click', () => {
        pinnedMarkerRef.current = null;
        hidePhotoInfo();
      });

      const infoWindow = new window.google.maps.InfoWindow({
        maxWidth: 400,
        // Shift right and further down to align with the pointer
        pixelOffset: new window.google.maps.Size(210, 90),
        disableAutoPan: true,
      });
      infoWindowRef.current = infoWindow;

      const createMarker = (position, title, color, key, index = null) => {
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="8" fill="${color}" stroke="#ffffff" stroke-width="2"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="${color}" stroke-width="2">
              <animate attributeName="r" from="8" to="20" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </svg>
        `;
        const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

        const marker = new window.google.maps.Marker({
          position,
          map,
          title,
          icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
        });

        marker.addListener('mouseover', () => {
          if (pinnedMarkerRef.current !== marker) {
            showPhotoInfo(key, marker, index);
          }
        });
        marker.addListener('mouseout', () => {
          if (pinnedMarkerRef.current !== marker) {
            hidePhotoInfo();
          }
        });
        marker.addListener('click', () => {
          pinnedMarkerRef.current = marker;
          showPhotoInfo(key, marker, index);
        });
        return marker;
      };

      if (checkInCoords) {
        markersRef.current.checkIn = createMarker(
          { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
          'Check In',
          '#22c55e',
          'checkIn'
        );
      }

      if (checkOutCoords) {
        markersRef.current.checkOut = createMarker(
          { lat: parseFloat(record.checkOutLat), lng: parseFloat(record.checkOutLng) },
          'Check Out',
          '#ef4444',
          'checkOut'
        );
      }

      if (punches && punches.length) {
        punches.forEach((punch, idx) => {
          if (punch.latitude && punch.longitude) {
            const marker = createMarker(
              { lat: parseFloat(punch.latitude), lng: parseFloat(punch.longitude) },
              `Punch In #${idx + 1}`,
              '#2563eb',
              'punch',
              idx
            );
            markersRef.current.punch.push(marker);
          }
        });
      }

      const showAllMarkers = () => {
        const bounds = new window.google.maps.LatLngBounds();
        let hasMarkers = false;

        if (markersRef.current.checkIn) {
          markersRef.current.checkIn.setMap(map);
          bounds.extend(markersRef.current.checkIn.getPosition());
          hasMarkers = true;
        }
        if (markersRef.current.checkOut) {
          markersRef.current.checkOut.setMap(map);
          bounds.extend(markersRef.current.checkOut.getPosition());
          hasMarkers = true;
        }
        markersRef.current.punch.forEach(m => {
          m.setMap(map);
          bounds.extend(m.getPosition());
          hasMarkers = true;
        });

        if (hasMarkers) {
          map.fitBounds(bounds);
          // Limit zoom so it doesn't zoom in too close if there's only 1 marker
          const listener = window.google.maps.event.addListener(map, "idle", function () {
            if (map.getZoom() > 16) map.setZoom(16);
            window.google.maps.event.removeListener(listener);
          });
        }
      };

      // Expose showAllMarkers to component scope so the button can use it
      window.__showAllMarkers = showAllMarkers;

      showAllMarkers();
    };

    const showPhotoInfo = (key, marker, index) => {
      const infoWindow = infoWindowRef.current;
      const map = mapInstanceRef.current;
      if (!infoWindow || !map) return;

      const { record, punches } = data;
      let photoUrl, lat, lng, address, title;

      if (key === 'checkIn') {
        photoUrl = record.checkInPhoto;
        lat = record.checkInLat;
        lng = record.checkInLng;
        address = record.checkInAddress;
        title = 'Check In';
      } else if (key === 'checkOut') {
        photoUrl = record.checkOutPhoto;
        lat = record.checkOutLat;
        lng = record.checkOutLng;
        address = record.checkOutAddress;
        title = 'Check Out';
      } else if (key === 'punch') {
        const punch = punches[index] || {};
        photoUrl = punch.photo;
        lat = punch.latitude;
        lng = punch.longitude;
        address = punch.address;
        title = `Punch In #${index + 1}`;
      }

      let content = `<div style="max-width:350px;font-family:Arial, sans-serif;color:#111;">
        <div style="font-weight:700;margin-bottom:8px;">${title}</div>
        <div style="display:flex;gap:12px;align-items:flex-start;">`;

      if (photoUrl) {
        content += `<div style="flex-shrink:0;width:120px;"><img src="${photoUrl}" alt="${title}" style="width:100%;height:auto;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.15);" /></div>`;
      } else {
        content += `<div style="flex-shrink:0;width:120px;padding:10px;background:#f8fafc;border-radius:12px;color:#475569;font-size:12px;text-align:center;box-sizing:border-box;">No photo</div>`;
      }

      content += `<div style="font-size:13px;line-height:1.5;color:#334155;flex-grow:1;">
        <div><strong>Location:</strong> ${lat && lng ? `${lat}, ${lng}` : 'Not available'}</div>
        <div style="margin-top:6px;"><strong>Address:</strong> ${address || 'Not available'}</div>
      </div>
      </div></div>`;

      infoWindow.setContent(content);
      infoWindow.open(map, marker);
    };

    const hidePhotoInfo = () => {
      if (infoWindowRef.current) infoWindowRef.current.close();
    };

    loadGoogleMapsScript();

  }, [data]);

  const showAllMarkers = () => {
    if (window.__showAllMarkers) window.__showAllMarkers();
  };

  const focusMarker = (key, index = 0) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Hide all markers
    if (markersRef.current.checkIn) markersRef.current.checkIn.setMap(null);
    if (markersRef.current.checkOut) markersRef.current.checkOut.setMap(null);
    markersRef.current.punch.forEach(m => m.setMap(null));

    let marker;
    if (key === 'punch') {
      marker = markersRef.current.punch[index];
    } else {
      marker = markersRef.current[key];
    }

    if (!marker) return;

    marker.setMap(map);
    map.panTo(marker.getPosition());
    map.setZoom(17);
    window.google.maps.event.trigger(marker, 'click');
  };

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <p>Loading location details...</p>
        </div>
      </div>
    );
  }

  const { record, employee, punches } = data;
  const displayDate = new Date(record.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const employeeName = `${employee.firstName} ${employee.lastName}`;

  const checkInTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'No record';
  const checkInCoordsStr = (record.checkInLat && record.checkInLng) ? `${parseFloat(record.checkInLat).toFixed(6)}, ${parseFloat(record.checkInLng).toFixed(6)}` : 'No location';

  const checkOutTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Missing';
  const checkOutCoordsStr = (record.checkOutLat && record.checkOutLng) ? `${parseFloat(record.checkOutLat).toFixed(6)}, ${parseFloat(record.checkOutLng).toFixed(6)}` : 'No location';

  if (loading) return <PageLoader message="Loading Location Data..." />;

  return (
    <div
      className="flex flex-col gap-4 overflow-hidden -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 -mb-4 sm:-mb-6"
      style={{ height: 'calc(100vh - 61px)' }}
    >
      <style>{`
        .gm-ui-hover-effect {
          display: none !important;
        }
        .gm-style-iw-c button[title="Close"] {
          display: none !important;
        }
        /* Hide the default downward-pointing tail of the InfoWindow */
        .gm-style-iw-tc {
          display: none !important;
        }
      `}</style>


      <div className="grid gap-4 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] min-h-0 flex-1">
        <aside className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 bg-slate-50/50">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Map view</p>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                {displayDate} - {employeeName}
              </h2>
            </div>
            {fromRegularize && (
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-8 px-2.5 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Calender
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Remote clock in / clock out</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <ArrowRightToLine className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{checkInTime}</p>
                      <p className="text-xs text-slate-500">{checkInCoordsStr}</p>
                    </div>
                  </div>
                  {record.checkInLat && record.checkInLng && (
                    <button
                      onClick={() => focusMarker('checkIn')}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600 shadow-sm hover:border-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                      title="Focus on map"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                      <ArrowLeftFromLine className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{checkOutTime}</p>
                      <p className="text-xs text-slate-500">{checkOutCoordsStr}</p>
                    </div>
                  </div>
                  {record.checkOutLat && record.checkOutLng && (
                    <button
                      onClick={() => focusMarker('checkOut')}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 shadow-sm hover:border-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Focus on map"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Location punches</p>
              {punches && punches.length > 0 ? (
                <div className="space-y-3">
                  {punches.map((punch, idx) => (
                    <div key={punch.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <span className="text-xs font-bold">{idx + 1}</span>
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {new Date(punch.punchTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(punch.latitude && punch.longitude) ? `${parseFloat(punch.latitude).toFixed(6)}, ${parseFloat(punch.longitude).toFixed(6)}` : 'No location'}
                            </p>
                          </div>
                        </div>
                        {(punch.latitude && punch.longitude) && (
                          <button
                            onClick={() => focusMarker('punch', idx)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-sm hover:border-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                            title="Focus on map"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                  <MapPinOff className="w-6 h-6 mb-2 opacity-50" />
                  <p className="text-xs">No punches recorded for this day.</p>
                </div>
              )}
            </section>
          </div>
        </aside>

        <section className="relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full min-h-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Attendance Map</h2>
              <p className="text-xs text-slate-500">Visual markers for check-in, check-out and punches.</p>
            </div>
            <div className="flex items-center gap-2">
              {!data.googleMapsApiKey && (
                <div className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 font-medium mr-2">
                  Google Maps API Key Missing
                </div>
              )}
              {data.prevRecord && (
                <button
                  onClick={() => navigate(`/admin/attendance/location?id=${data.prevRecord.id}&date=${data.prevRecord.date}`, { replace: true, state: location.state })}
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-8 px-2.5 transition-colors cursor-pointer"
                  title={`Previous Date: ${data.prevRecord.date}`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </button>
              )}
              {data.nextRecord && (
                <button
                  onClick={() => navigate(`/admin/attendance/location?id=${data.nextRecord.id}&date=${data.nextRecord.date}`, { replace: true, state: location.state })}
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-8 px-2.5 transition-colors cursor-pointer"
                  title={`Next Date: ${data.nextRecord.date}`}
                >
                  Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {data.googleMapsApiKey ? (
              <div ref={mapRef} className="w-full h-full"></div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <MapPinOff className="w-10 h-10 mb-3 text-slate-300" />
                <p className="font-medium text-slate-700">Map is unavailable</p>
                <p className="text-xs mt-1 max-w-sm text-center">
                  Please provide a valid Google Maps API Key in the backend `.env` file to view the attendance map.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminAttendanceLocation;
