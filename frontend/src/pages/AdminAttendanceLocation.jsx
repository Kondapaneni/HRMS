import React, { useEffect, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { MapPin, ArrowRightToLine, ArrowLeftFromLine, MapPinOff, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

const AdminAttendanceLocation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromRegularize = location.state?.fromRegularize;
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ checkIn: null, checkOut: null, punch: [] });
  const infoWindowRef = useRef(null);
  const pinnedMarkerRef = useRef(null);
  const photoObjectUrlsRef = useRef({});

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

  // Load protected attendance photos with the authenticated API client.
  useEffect(() => {
    if (!data) return undefined;
    let cancelled = false;
    const createdUrls = [];
    const photoPaths = new Set([
      data.record?.checkInPhoto,
      data.record?.checkOutPhoto,
      ...(data.punches || []).map(punch => punch.photo)
    ].filter(value => typeof value === 'string' && value.startsWith('/Attendance/')));

    const loadPhotos = async () => {
      const nextUrls = {};
      await Promise.all([...photoPaths].map(async path => {
        const filename = path.slice('/Attendance/'.length);
        if (!/^[A-Za-z0-9._-]{1,181}$/.test(filename)) return;
        try {
          const response = await axios.get(`/storage/attendance/${encodeURIComponent(filename)}`, { responseType: 'blob' });
          const objectUrl = URL.createObjectURL(response.data);
          createdUrls.push(objectUrl);
          nextUrls[path] = objectUrl;
        } catch (error) {
          console.warn('Unable to load attendance photo securely:', error);
        }
      }));
      if (!cancelled) photoObjectUrlsRef.current = nextUrls;
    };

    photoObjectUrlsRef.current = {};
    loadPhotos();
    return () => {
      cancelled = true;
      createdUrls.forEach(url => URL.revokeObjectURL(url));
      photoObjectUrlsRef.current = {};
    };
  }, [data]);

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
      const isTracker = punch.photo === 'Tracker';
      title = isTracker ? `Tracker Punch #${index + 1}` : `Punch In #${index + 1}`;
    }

    let content = `<div style="max-width:320px;font-family:Inter,system-ui,sans-serif;color:#131315;padding:4px;">
      <div style="font-weight:600;margin-bottom:8px;font-size:13px;color:#131315;">${title}</div>
      <div style="display:flex;gap:10px;align-items:flex-start;">`;

    const isWebLabel = (url) => url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/');

    const displayPhotoUrl = photoObjectUrlsRef.current[photoUrl] || photoUrl;

    if (photoUrl && !isWebLabel(photoUrl)) {
      content += `<div style="flex-shrink:0;width:105px;"><img src="${displayPhotoUrl}" alt="${title}" style="width:100%;height:auto;max-height:130px;object-fit:cover;border-radius:12px;box-shadow:0 4px 12px rgba(19,19,21,0.08);" /></div>`;
    } else if (photoUrl && isWebLabel(photoUrl)) {
      content += `<div style="flex-shrink:0;width:95px;padding:12px 6px;background:#EAF0FA;border:1px solid #D2E0F5;border-radius:10px;color:#5B86C2;font-size:11px;text-align:center;box-sizing:border-box;font-weight:600;">${photoUrl}</div>`;
    } else {
      content += `<div style="flex-shrink:0;width:95px;padding:12px 6px;background:#F8F8F8;border:1px solid #EFEFF1;border-radius:10px;color:#6B6B75;font-size:11px;text-align:center;box-sizing:border-box;">No photo</div>`;
    }

    content += `<div style="font-size:11.5px;line-height:1.5;color:#6B6B75;flex-grow:1;min-width:0;">
      <div style="word-break:break-word;"><strong style="color:#131315;">Location:</strong><br/>${lat && lng ? `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}` : 'Not available'}</div>
      <div style="margin-top:6px;word-break:break-word;"><strong style="color:#131315;">Address:</strong><br/>${address || 'Not available'}</div>
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
          '#1F9D55',
          'checkIn'
        );
      }

      if (checkOutCoords) {
        markersRef.current.checkOut = createMarker(
          { lat: parseFloat(record.checkOutLat), lng: parseFloat(record.checkOutLng) },
          'Check Out',
          '#D64550',
          'checkOut'
        );
      }

      if (punches && punches.length) {
        punches.forEach((punch, idx) => {
          if (punch.latitude && punch.longitude) {
            const isTracker = punch.photo === 'Tracker';
            const marker = createMarker(
              { lat: parseFloat(punch.latitude), lng: parseFloat(punch.longitude) },
              isTracker ? `Tracker #${idx + 1}` : `Punch In #${idx + 1}`,
              isTracker ? '#A25C9B' : '#5B86C2',
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
    <div className="flex flex-col overflow-hidden rounded-[24px] bg-[var(--surface)] border border-[var(--line)] h-[calc(100vh-140px)] min-h-[520px] font-sans antialiased">
      <style>{`
        .gm-ui-hover-effect { display: none !important; }
        .gm-style-iw-c button[title="Close"] { display: none !important; }
        .gm-style-iw-tc { display: none !important; }
      `}</style>

      <div className="grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] min-h-0 flex-1">
        {/* Sidebar Panel */}
        <aside className="flex flex-col border-r border-[var(--line)] bg-[var(--surface)] overflow-hidden h-full z-10">
          {/* Sidebar Header */}
          <div className="border-b border-[var(--line)] p-4 bg-[var(--surface-alt)]/60 shrink-0">
            <span className="text-[11px] font-medium text-[var(--muted)]">Map View</span>
            <h2 className="text-base font-semibold text-[var(--text)] truncate mt-0.5">
              {employeeName}
            </h2>
            <p className="text-xs text-[var(--text-2)] mt-0.5">{displayDate}</p>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Check In / Check Out */}
            <section>
              <p className="text-xs font-medium text-[var(--muted)] mb-2.5">Remote Clock In / Clock Out</p>
              <div className="space-y-2.5">
                {/* Check In */}
                <div className="flex items-center justify-between p-3 rounded-[16px] bg-[var(--status-success-bg)] border border-[var(--status-success-text)]/20">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] bg-[var(--surface)] text-[var(--status-success-text)] shadow-xs">
                      <ArrowRightToLine size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[var(--status-success-text)]">{checkInTime}</p>
                      <p className="text-[11px] text-[var(--status-success-text)]/80 truncate max-w-[140px]">{checkInCoordsStr}</p>
                    </div>
                  </div>
                  {record.checkInLat && record.checkInLng && (
                    <button
                      onClick={() => focusMarker('checkIn')}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--status-success-text)] hover:bg-[var(--surface)]/80 transition-colors cursor-pointer shadow-xs"
                      title="Focus on map"
                    >
                      <MapPin size={13} />
                    </button>
                  )}
                </div>

                {/* Check Out */}
                <div className="flex items-center justify-between p-3 rounded-[16px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-text)]/20">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] bg-[var(--surface)] text-[var(--status-danger-text)] shadow-xs">
                      <ArrowLeftFromLine size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[var(--status-danger-text)]">{checkOutTime}</p>
                      <p className="text-[11px] text-[var(--status-danger-text)]/80 truncate max-w-[140px]">{checkOutCoordsStr}</p>
                    </div>
                  </div>
                  {record.checkOutLat && record.checkOutLng && (
                    <button
                      onClick={() => focusMarker('checkOut')}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--status-danger-text)] hover:bg-[var(--surface)]/80 transition-colors cursor-pointer shadow-xs"
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
              <p className="text-xs font-medium text-[var(--muted)] mb-2.5">Location Punches</p>
              {punches && punches.length > 0 ? (
                <div className="space-y-2">
                  {punches.map((punch, idx) => {
                    const isTracker = punch.photo === 'Tracker';
                    return (
                      <div
                        key={punch.id}
                        className={`rounded-[16px] border p-3 ${
                          isTracker
                            ? 'border-[var(--accent-pink-deep)]/20 bg-[var(--accent-pink-tint)]'
                            : 'border-[var(--brand)]/20 bg-[var(--brand-tint)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-[10px] bg-[var(--surface)] text-xs font-semibold shadow-xs ${
                                isTracker ? 'text-[var(--accent-pink-deep)]' : 'text-[var(--brand-deep)]'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className={`text-xs font-semibold ${isTracker ? 'text-[var(--accent-pink-deep)]' : 'text-[var(--brand-deep)]'}`}>
                                  {new Date(punch.punchTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {isTracker && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[9px] bg-[var(--surface)] text-[var(--accent-pink-deep)]">
                                    Tracker
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] truncate max-w-[140px] ${isTracker ? 'text-[var(--accent-pink-deep)]/80' : 'text-[var(--brand-deep)]/80'}`}>
                                {(punch.latitude && punch.longitude) ? `${parseFloat(punch.latitude).toFixed(6)}, ${parseFloat(punch.longitude).toFixed(6)}` : 'No location'}
                              </p>
                            </div>
                          </div>
                          {(punch.latitude && punch.longitude) && (
                            <button
                              onClick={() => focusMarker('punch', idx)}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] transition-colors cursor-pointer shadow-xs ${
                                isTracker ? 'text-[var(--accent-pink-deep)] hover:bg-[var(--surface)]/80' : 'text-[var(--brand-deep)] hover:bg-[var(--surface)]/80'
                              }`}
                              title="Focus on map"
                            >
                              <MapPin size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--muted)] bg-[var(--surface-alt)] rounded-[16px] border border-[var(--line)] border-dashed">
                  <MapPinOff size={20} className="mb-2 text-[var(--icon-muted)]" />
                  <p className="text-xs font-medium">No punches recorded for this day.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[var(--line)] bg-[var(--surface-alt)]/60 flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={showAllMarkers}
              className="flex-1 text-xs"
            >
              <MapPin size={13} className="mr-1" /> Show All
            </Button>
            {fromRegularize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex-1 text-xs"
              >
                <ArrowLeft size={13} className="mr-1" /> Calendar
              </Button>
            )}
          </div>
        </aside>

        {/* Map Section */}
        <section className="relative flex flex-col bg-[var(--surface)] overflow-hidden h-full min-h-0">
          <div className="p-4 border-b border-[var(--line)] bg-[var(--surface-alt)]/60 flex justify-between items-center shrink-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                <MapPin size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Attendance Map</h2>
                <p className="text-xs text-[var(--muted)]">Visual markers for check-in, check-out and punches</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!data.googleMapsApiKey && (
                <div className="px-2.5 py-1 bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] text-xs rounded-[9px] font-semibold">
                  API Key Missing
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/admin/attendance')}
                className="text-xs"
              >
                <ArrowLeft size={13} className="mr-1" /> Back
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {data.googleMapsApiKey ? (
              <div ref={mapRef} className="w-full h-full"></div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface-alt)] text-[var(--muted)]">
                <MapPinOff size={32} className="mb-3 text-[var(--icon-muted)]" />
                <p className="font-semibold text-sm text-[var(--text)]">Map is unavailable</p>
                <p className="text-xs mt-1 max-w-sm text-center">
                  Please provide a valid Google Maps API Key in the backend environment file to view the attendance map.
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