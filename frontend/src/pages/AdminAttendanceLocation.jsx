import React, { useEffect, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { MapPin, ArrowRightToLine, ArrowLeftFromLine, MapPinOff, ArrowLeft } from 'lucide-react';

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

  const hidePhotoInfo = () => {
    if (infoWindowRef.current) infoWindowRef.current.close();
  };

  const showPhotoInfo = (key, marker, index) => {
    const infoWindow = infoWindowRef.current;
    const map = mapInstanceRef.current;
    if (!infoWindow || !map || !data) return;

    const { record, punches } = data;
    let photoUrl, lat, lng, address, title;

    if (key === 'checkIn') {
      photoUrl = record?.checkInPhoto;
      lat = record?.checkInLat;
      lng = record?.checkInLng;
      address = record?.checkInAddress;
      title = 'Check In';
    } else if (key === 'checkOut') {
      photoUrl = record?.checkOutPhoto;
      lat = record?.checkOutLat;
      lng = record?.checkOutLng;
      address = record?.checkOutAddress;
      title = 'Check Out';
    } else if (key === 'punch') {
      const punch = (punches && punches[index]) || {};
      photoUrl = punch.photo;
      lat = punch.latitude;
      lng = punch.longitude;
      address = punch.address;
      title = `Punch In #${index + 1}`;
    }

    let content = `<div style="max-width:320px;font-family:'Google Sans',Arial,sans-serif;color:#1f1f1f;padding:2px;">
      <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#1f1f1f;">${title}</div>
      <div style="display:flex;gap:10px;align-items:flex-start;">`;

    // Helper to detect if photoUrl is a web attendance text label (not a real image URL)
    const isWebLabel = (url) => url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/');

    if (photoUrl && !isWebLabel(photoUrl)) {
      content += `<div style="flex-shrink:0;width:105px;"><img src="${photoUrl}" alt="${title}" style="width:100%;height:auto;max-height:130px;object-fit:cover;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.12);" /></div>`;
    } else if (photoUrl && isWebLabel(photoUrl)) {
      content += `<div style="flex-shrink:0;width:95px;padding:12px 6px;background:#e8f0fe;border:1px solid #d2e3fc;border-radius:10px;color:#1a73e8;font-size:11px;text-align:center;box-sizing:border-box;font-weight:600;">${photoUrl}</div>`;
    } else {
      content += `<div style="flex-shrink:0;width:95px;padding:12px 6px;background:#f8fafd;border:1px solid #e0e3e7;border-radius:10px;color:#5f6368;font-size:11px;text-align:center;box-sizing:border-box;">No photo</div>`;
    }

    content += `<div style="font-size:11.5px;line-height:1.5;color:#5f6368;flex-grow:1;min-width:0;">
      <div style="word-break:break-word;"><strong style="color:#1f1f1f;">Location:</strong><br/>${lat && lng ? `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` : 'Not available'}</div>
      <div style="margin-top:6px;word-break:break-word;"><strong style="color:#1f1f1f;">Address:</strong><br/>${address || 'Not available'}</div>
    </div>
    </div></div>`;

    infoWindow.setContent(content);
    infoWindow.open(map, marker);
  };

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
        maxWidth: 360,
        pixelOffset: new window.google.maps.Size(0, -10),
        disableAutoPan: false,
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
          '#34A853',
          'checkIn'
        );
      }

      if (checkOutCoords) {
        markersRef.current.checkOut = createMarker(
          { lat: parseFloat(record.checkOutLat), lng: parseFloat(record.checkOutLng) },
          'Check Out',
          '#EA4335',
          'checkOut'
        );
      }

      if (punches && punches.length) {
        punches.forEach((punch, idx) => {
          if (punch.latitude && punch.longitude) {
            const marker = createMarker(
              { lat: parseFloat(punch.latitude), lng: parseFloat(punch.longitude) },
              `Punch In #${idx + 1}`,
              '#4285F4',
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
          const listener = window.google.maps.event.addListener(map, "idle", function () {
            if (map.getZoom() > 16) map.setZoom(16);
            window.google.maps.event.removeListener(listener);
          });
        }
      };

      window.__showAllMarkers = showAllMarkers;
      showAllMarkers();
    };

    loadGoogleMapsScript();

  }, [data]);

  const showAllMarkers = () => {
    if (window.__showAllMarkers) window.__showAllMarkers();
  };

  const focusMarker = (key, index = 0) => {
    const map = mapInstanceRef.current;
    if (!map) return;

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
    pinnedMarkerRef.current = marker;
    showPhotoInfo(key, marker, index);
  };

  if (loading || !data) {
    return <PageLoader message="Loading Location Data..." />;
  }

  const { record, employee, punches } = data;
  const displayDate = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const employeeName = `${employee.firstName} ${employee.lastName}`;

  const checkInTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'No record';
  const checkInCoordsStr = (record.checkInLat && record.checkInLng) ? `${parseFloat(record.checkInLat).toFixed(6)}, ${parseFloat(record.checkInLng).toFixed(6)}` : 'No location';

  const checkOutTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Missing';
  const checkOutCoordsStr = (record.checkOutLat && record.checkOutLng) ? `${parseFloat(record.checkOutLat).toFixed(6)}, ${parseFloat(record.checkOutLng).toFixed(6)}` : 'No location';

  return (
    <div
      className="flex flex-col overflow-hidden -mx-4 sm:-mx-6 -my-4 sm:-my-6 h-[calc(100vh-61px)]"
    >
      <style>{`
        .gm-ui-hover-effect {
          display: none !important;
        }
        .gm-style-iw-c button[title="Close"] {
          display: none !important;
        }
        .gm-style-iw-tc {
          display: none !important;
        }
      `}</style>

      <div className="grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] min-h-0 flex-1 bg-white">
        {/* Sidebar Panel */}
        <aside className="flex flex-col border-r border-[#e0e3e7] bg-white overflow-hidden h-full z-10">
          {/* Sidebar Header */}
          <div className="border-b border-[#f1f3f4] p-4 bg-[#f8fafd]/80 shrink-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider ml-1">Map View</span>
            </div>
            <h2 className="text-sm font-semibold text-[#1f1f1f] truncate">
              {employeeName}
            </h2>
            <p className="text-[11px] text-[#5f6368] mt-0.5">{displayDate}</p>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Check In / Check Out */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] mb-2.5">Remote Clock In / Clock Out</p>
              <div className="space-y-2.5">
                {/* Check In */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#e6f4ea] border border-[#ceead6]">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#34A853] shadow-xs border border-[#ceead6]">
                      <ArrowRightToLine size={15} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[#137333]">{checkInTime}</p>
                      <p className="text-[10px] text-[#137333]/70 truncate max-w-[140px]">{checkInCoordsStr}</p>
                    </div>
                  </div>
                  {record.checkInLat && record.checkInLng && (
                    <button
                      onClick={() => focusMarker('checkIn')}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#34A853] border border-[#ceead6] hover:bg-[#ceead6] transition-colors cursor-pointer shadow-xs"
                      title="Focus on map"
                    >
                      <MapPin size={13} />
                    </button>
                  )}
                </div>

                {/* Check Out */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#fce8e6] border border-[#fad2cf]">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#EA4335] shadow-xs border border-[#fad2cf]">
                      <ArrowLeftFromLine size={15} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[#c5221f]">{checkOutTime}</p>
                      <p className="text-[10px] text-[#c5221f]/70 truncate max-w-[140px]">{checkOutCoordsStr}</p>
                    </div>
                  </div>
                  {record.checkOutLat && record.checkOutLng && (
                    <button
                      onClick={() => focusMarker('checkOut')}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#EA4335] border border-[#fad2cf] hover:bg-[#fad2cf] transition-colors cursor-pointer shadow-xs"
                      title="Focus on map"
                    >
                      <MapPin size={13} />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Location Punches */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] mb-2.5">Location Punches</p>
              {punches && punches.length > 0 ? (
                <div className="space-y-2">
                  {punches.map((punch, idx) => (
                    <div key={punch.id} className="rounded-xl border border-[#d2e3fc] bg-[#e8f0fe] p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1a73e8] text-[10px] font-bold border border-[#d2e3fc] shadow-xs">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-[#1a73e8]">
                              {new Date(punch.punchTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10px] text-[#1a73e8]/70 truncate max-w-[140px]">
                              {(punch.latitude && punch.longitude) ? `${parseFloat(punch.latitude).toFixed(6)}, ${parseFloat(punch.longitude).toFixed(6)}` : 'No location'}
                            </p>
                          </div>
                        </div>
                        {(punch.latitude && punch.longitude) && (
                          <button
                            onClick={() => focusMarker('punch', idx)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1a73e8] border border-[#d2e3fc] hover:bg-[#d2e3fc] transition-colors cursor-pointer shadow-xs"
                            title="Focus on map"
                          >
                            <MapPin size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-[#5f6368] bg-[#f8fafd] rounded-xl border border-[#e0e3e7] border-dashed">
                  <MapPinOff size={20} className="mb-2 text-[#dadce0]" />
                  <p className="text-[11px] font-medium">No punches recorded for this day.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[#f1f3f4] bg-[#f8fafd]/80 flex gap-2 shrink-0">
            <button
              onClick={showAllMarkers}
              className="flex-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] py-1.5 transition-colors cursor-pointer gap-1"
            >
              <MapPin size={11} /> Show All Markers
            </button>
            {fromRegularize && (
              <button
                onClick={() => navigate(-1)}
                className="flex-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] py-1.5 transition-colors cursor-pointer gap-1"
              >
                <ArrowLeft size={11} /> Back to Calendar
              </button>
            )}
          </div>
        </aside>

        {/* Map Section */}
        <section className="relative flex flex-col bg-white overflow-hidden h-full min-h-0">
          <div className="p-4 border-b border-[#f1f3f4] bg-[#f8fafd]/80 flex justify-between items-center shrink-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
                <MapPin size={15} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#1f1f1f]">Attendance Map</h2>
                <p className="text-[11px] text-[#5f6368]">Visual markers for check-in, check-out and punches</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!data.googleMapsApiKey && (
                <div className="px-2.5 py-1 bg-[#fef7e0] text-[#b06000] text-[10px] rounded-full border border-[#feefc3] font-semibold">
                  API Key Missing
                </div>
              )}
              <button
                onClick={() => navigate('/admin/attendance')}
                className="inline-flex items-center justify-center rounded-full text-[10px] font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] h-7 px-3 transition-colors cursor-pointer gap-1"
              >
                <ArrowLeft size={11} /> Attendance
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {data.googleMapsApiKey ? (
              <div ref={mapRef} className="w-full h-full"></div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8fafd] text-[#5f6368]">
                <MapPinOff size={32} className="mb-3 text-[#dadce0]" />
                <p className="font-semibold text-sm text-[#1f1f1f]">Map is unavailable</p>
                <p className="text-xs mt-1 max-w-sm text-center">
                  Please provide a valid Google Maps API Key in the backend <code className="bg-[#f1f3f4] px-1 py-0.5 rounded text-[#1a73e8] text-[10px]">.env</code> file to view the attendance map.
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
