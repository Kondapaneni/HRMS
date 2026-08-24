import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { Globe, Clock, Edit2, Trash2, AlertTriangle, ArrowLeft, X, Plus, MapPin, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AdminAttendanceConfig = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showGeoModal, setShowGeoModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingGeo, setEditingGeo] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extras query (geo locations + shift times)
  const { data: extrasData, isLoading } = useQuery({
    queryKey: ['admin', 'attendance-extras'],
    queryFn: async () => {
      const [geoRes, shiftRes] = await Promise.all([
        api.get('/admin/geolocations'),
        api.get('/admin/shifttimes')
      ]);
      return { geoLocations: geoRes.data || [], shiftTimes: shiftRes.data || [] };
    },
  });

  const geoLocations = extrasData?.geoLocations || [];
  const shiftTimes = extrasData?.shiftTimes || [];

  const handleAddGeo = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setIsSubmitting(true);
    try {
      if (editingGeo) {
        await api.put(`/admin/geolocations/${editingGeo.id}`, Object.fromEntries(fd));
        toast.success('Geo location updated successfully');
      } else {
        await api.post('/admin/geolocations', Object.fromEntries(fd));
        toast.success('Geo location saved successfully');
      }
      setShowGeoModal(false);
      setEditingGeo(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance-extras'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save geo location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGeo = (id) => {
    setItemToDelete({ type: 'geo', id });
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setIsSubmitting(true);
    try {
      if (editingShift) {
        await api.put(`/admin/shifttimes/${editingShift.id}`, Object.fromEntries(fd));
        toast.success('Shift time updated successfully');
      } else {
        await api.post('/admin/shifttimes', Object.fromEntries(fd));
        toast.success('Shift time saved successfully');
      }
      setShowShiftModal(false);
      setEditingShift(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance-extras'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save shift time');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = (id) => {
    setItemToDelete({ type: 'shift', id });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'geo') {
        await api.delete(`/admin/geolocations/${itemToDelete.id}`);
        toast.success('Geo location deleted successfully');
      } else if (itemToDelete.type === 'shift') {
        await api.delete(`/admin/shifttimes/${itemToDelete.id}`);
        toast.success('Shift time deleted successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance-extras'] });
    } catch (err) {
      toast.error('Failed to delete item');
    } finally {
      setItemToDelete(null);
    }
  };

  if (isLoading) return <PageLoader message="Loading Attendance Configuration..." />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Attendance Configuration & Rules</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight">
            Locations & Shift Timings
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Configure geo-fencing coordinates and allowed work shifts for attendance validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setEditingGeo(null); setShowGeoModal(true); }}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2 transition-all cursor-pointer gap-1.5 shadow-md shadow-[#4285F4]/25"
          >
            <Globe size={14} />
            <span>Add Location</span>
          </button>
          <button
            onClick={() => { setEditingShift(null); setShowShiftModal(true); }}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs"
          >
            <Clock size={14} className="text-[#5f6368]" />
            <span>Add Shift Time</span>
          </button>
          <button
            onClick={() => navigate('/admin/attendance')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] px-3.5 py-2 transition-colors cursor-pointer gap-1 shadow-xs"
          >
            <ArrowLeft size={13} />
            <span>Attendance</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Geo Locations Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
                <Globe size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f]">Saved Geo Locations</h3>
                <p className="text-[11px] text-[#5f6368]">Coordinates stored for geo-fence verification ({geoLocations.length})</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingGeo(null); setShowGeoModal(true); }}
              className="inline-flex items-center justify-center rounded-full text-[11px] font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] px-2.5 py-1 transition-colors cursor-pointer gap-1"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="overflow-x-auto flex-1 custom-scrollbar min-h-[200px]">
            {geoLocations.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7]">
                  <tr>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Name</th>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Latitude</th>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Longitude</th>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Radius</th>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {geoLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1f1f1f]">
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-[#1a73e8]" />
                          <span>{loc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5f6368] font-mono">{loc.latitude}</td>
                      <td className="px-4 py-3 text-xs text-[#5f6368] font-mono">{loc.longitude}</td>
                      <td className="px-4 py-3 text-xs text-[#1f1f1f]">
                        <span className="bg-[#f1f3f4] text-[#444746] px-2 py-0.5 rounded-full font-medium text-[10px]">
                          {loc.radius}m
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingGeo(loc); setShowGeoModal(true); }}
                            className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#e8f0fe] rounded-full transition-colors cursor-pointer"
                            title="Edit Location"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteGeo(loc.id)}
                            className="p-1.5 text-[#5f6368] hover:text-[#c5221f] hover:bg-[#fce8e6] rounded-full transition-colors cursor-pointer"
                            title="Delete Location"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 flex flex-col items-center justify-center text-center text-[#5f6368]">
                <Globe size={28} className="text-[#dadce0] mb-2" />
                <p className="text-xs font-semibold text-[#1f1f1f]">No geo locations configured</p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">Add office coordinates for GPS verification</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift Times Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
                <Clock size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1f1f1f]">Saved Shift Times</h3>
                <p className="text-[11px] text-[#5f6368]">Shift windows available for employee assignment ({shiftTimes.length})</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingShift(null); setShowShiftModal(true); }}
              className="inline-flex items-center justify-center rounded-full text-[11px] font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] px-2.5 py-1 transition-colors cursor-pointer gap-1"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="overflow-x-auto flex-1 custom-scrollbar min-h-[200px]">
            {shiftTimes.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7]">
                  <tr>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Shift</th>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">Start Time</th>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider">End Time</th>
                    <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {shiftTimes.map((shift) => (
                    <tr key={shift.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1f1f1f]">
                        <span className="bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                          {shift.shiftLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#1f1f1f] font-medium">
                        {new Date(`2000-01-01T${shift.startTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#1f1f1f] font-medium">
                        {new Date(`2000-01-01T${shift.endTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingShift(shift); setShowShiftModal(true); }}
                            className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#e8f0fe] rounded-full transition-colors cursor-pointer"
                            title="Edit Shift"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="p-1.5 text-[#5f6368] hover:text-[#c5221f] hover:bg-[#fce8e6] rounded-full transition-colors cursor-pointer"
                            title="Delete Shift"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 flex flex-col items-center justify-center text-center text-[#5f6368]">
                <Clock size={28} className="text-[#dadce0] mb-2" />
                <p className="text-xs font-semibold text-[#1f1f1f]">No shift times configured</p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">Add working shifts for automatic attendance processing</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geo Sidebar Drawer */}
      {showGeoModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) { setShowGeoModal(false); setEditingGeo(null); } }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative"
          >
            {/* Top Accent Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] absolute top-0 left-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-[#1a73e8] mb-0.5">
                  <Globe size={15} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider">Geo-Fence Configuration</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">{editingGeo ? 'Edit Geo Location' : 'Add Geo Location'}</h2>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowGeoModal(false); setEditingGeo(null); }}
                disabled={isSubmitting}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="geo-form" onSubmit={handleAddGeo} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                    Location Name <span className="text-[#EA4335]">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    name="location_name"
                    defaultValue={editingGeo?.name || ''}
                    placeholder="e.g. Headquarters, Bangalore Branch"
                    className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                      Latitude <span className="text-[#EA4335]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      name="latitude"
                      defaultValue={editingGeo?.latitude || ''}
                      placeholder="12.9716"
                      className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] font-mono focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                      Longitude <span className="text-[#EA4335]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      name="longitude"
                      defaultValue={editingGeo?.longitude || ''}
                      placeholder="77.5946"
                      className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] font-mono focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                    Allowed Radius (meters) <span className="text-[#EA4335]">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    name="radius"
                    defaultValue={editingGeo?.radius || 100}
                    placeholder="100"
                    className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all"
                  />
                  <p className="text-[10px] text-[#5f6368] mt-1">Employees within this radius will be marked as in-office.</p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setShowGeoModal(false); setEditingGeo(null); }}
                className="px-5 py-2 text-xs font-semibold border border-[#dadce0] rounded-full text-[#444746] bg-white hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="geo-form"
                className="px-6 py-2 text-xs font-semibold rounded-full text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-md shadow-[#4285F4]/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editingGeo ? 'Update Location' : 'Save Location'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Shift Sidebar Drawer */}
      {showShiftModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) { setShowShiftModal(false); setEditingShift(null); } }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative"
          >
            {/* Top Accent Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] absolute top-0 left-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-[#1a73e8] mb-0.5">
                  <Clock size={15} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider">Shift Timings</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">{editingShift ? 'Edit Shift Time' : 'Add Shift Time'}</h2>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowShiftModal(false); setEditingShift(null); }}
                disabled={isSubmitting}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form id="shift-form" onSubmit={handleAddShift} className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                      Start Time <span className="text-[#EA4335]">*</span>
                    </label>
                    <input
                      required
                      type="time"
                      name="start_time"
                      defaultValue={editingShift?.startTime || ''}
                      className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">
                      End Time <span className="text-[#EA4335]">*</span>
                    </label>
                    <input
                      required
                      type="time"
                      name="end_time"
                      defaultValue={editingShift?.endTime || ''}
                      className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#5f6368]">
                  The shift label will be automatically computed (e.g. 09:45 AM - 06:30 PM).
                </p>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setShowShiftModal(false); setEditingShift(null); }}
                className="px-5 py-2 text-xs font-semibold border border-[#dadce0] rounded-full text-[#444746] bg-white hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="shift-form"
                className="px-6 py-2 text-xs font-semibold rounded-full text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-md shadow-[#4285F4]/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editingShift ? 'Update Shift Time' : 'Save Shift Time'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {itemToDelete && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden relative border border-[#e0e3e7]"
          >
            {/* Top 4-Color Accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            <div className="p-6 text-center pt-8">
              <div className="w-12 h-12 rounded-full bg-[#fce8e6] text-[#c5221f] flex items-center justify-center mx-auto mb-3 border border-[#fad2cf]">
                <AlertTriangle size={22} />
              </div>
              <h2 className="text-base font-semibold text-[#1f1f1f] mb-1.5">Confirm Deletion</h2>
              <p className="text-xs text-[#5f6368] leading-relaxed">
                Are you sure you want to delete this {itemToDelete.type === 'geo' ? 'Geo Location' : 'Shift Time'}? This configuration rule will no longer apply.
              </p>
            </div>
            <div className="px-6 py-4 bg-[#f8fafd] flex justify-end gap-2.5 border-t border-[#f1f3f4]">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-1.5 text-xs font-semibold border border-[#dadce0] rounded-full text-[#444746] bg-white hover:bg-[#f1f3f4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-1.5 text-xs font-semibold rounded-full text-white bg-[#d93025] hover:bg-[#b3261e] shadow-md shadow-[#d93025]/20 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminAttendanceConfig;
