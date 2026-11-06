import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { createPortal } from 'react-dom';
import { Globe, Clock, Edit2, Trash2, AlertTriangle, X, Plus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

const AdminAttendanceConfig = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showGeoModal, setShowGeoModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingGeo, setEditingGeo] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (isLoading) return <PageLoader message="Loading attendance configuration..." />;

  return (
    <div className="space-y-5 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Locations &amp; shift timings
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Configure geo-fencing coordinates and allowed work shifts for attendance validation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setEditingGeo(null);
              setShowGeoModal(true);
            }}
            className="h-9 px-4 rounded-full text-xs font-medium"
          >
            <Globe size={14} />
            <span>Add location</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setEditingShift(null);
              setShowShiftModal(true);
            }}
            className="h-9 px-4 rounded-full text-xs font-medium"
          >
            <Clock size={14} />
            <span>Add shift time</span>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Geo Locations Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col justify-between">
          <div className="pb-3 border-b border-[var(--line)] flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                <Globe size={16} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text)]">Saved geo locations</h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Coordinates stored for geo-fence verification ({geoLocations.length})
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingGeo(null);
                setShowGeoModal(true);
              }}
              className="h-7 px-2.5 text-[11px] rounded-full font-medium"
            >
              <Plus size={12} /> Add
            </Button>
          </div>

          <div className="overflow-x-auto flex-1 custom-scrollbar min-h-[200px]">
            {geoLocations.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[12px] font-normal text-[var(--muted)]">
                  <tr>
                    <th className="h-9 px-3">Name</th>
                    <th className="h-9 px-3">Latitude</th>
                    <th className="h-9 px-3">Longitude</th>
                    <th className="h-9 px-3">Radius</th>
                    <th className="h-9 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] text-[12px]">
                  {geoLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-[var(--brand-tint)]/40 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-[var(--text)]">
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-[var(--brand-deep)]" />
                          <span>{loc.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--muted)] font-mono">{loc.latitude}</td>
                      <td className="px-3 py-2.5 text-[var(--muted)] font-mono">{loc.longitude}</td>
                      <td className="px-3 py-2.5 text-[var(--text)]">
                        <span className="bg-[var(--surface-alt)] text-[var(--text-2)] px-2 py-0.5 rounded-full font-medium text-[10px]">
                          {loc.radius}m
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGeo(loc);
                              setShowGeoModal(true);
                            }}
                            className="p-1.5 text-[var(--muted)] hover:text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] rounded-full transition-colors cursor-pointer"
                            title="Edit Location"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGeo(loc.id)}
                            className="p-1.5 text-[var(--muted)] hover:text-[#D64550] hover:bg-[#FDE8EA] rounded-full transition-colors cursor-pointer"
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
              <div className="p-10 flex flex-col items-center justify-center text-center text-[var(--muted)]">
                <Globe size={28} className="opacity-30 mb-2" />
                <p className="text-xs font-medium text-[var(--text)]">No geo locations configured</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Add office coordinates for GPS verification</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift Times Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col justify-between">
          <div className="pb-3 border-b border-[var(--line)] flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text)]">Saved shift times</h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Shift windows available for employee assignment ({shiftTimes.length})
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingShift(null);
                setShowShiftModal(true);
              }}
              className="h-7 px-2.5 text-[11px] rounded-full font-medium"
            >
              <Plus size={12} /> Add
            </Button>
          </div>

          <div className="overflow-x-auto flex-1 custom-scrollbar min-h-[200px]">
            {shiftTimes.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[12px] font-normal text-[var(--muted)]">
                  <tr>
                    <th className="h-9 px-3">Shift</th>
                    <th className="h-9 px-3">Start time</th>
                    <th className="h-9 px-3">End time</th>
                    <th className="h-9 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] text-[12px]">
                  {shiftTimes.map((shift) => (
                    <tr key={shift.id} className="hover:bg-[var(--brand-tint)]/40 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-[var(--text)]">
                        <span className="bg-[var(--brand-tint)] text-[var(--brand-deep)] px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                          {shift.shiftLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[var(--text)] font-medium">
                        {new Date(`2000-01-01T${shift.startTime}`).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[var(--text)] font-medium">
                        {new Date(`2000-01-01T${shift.endTime}`).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShift(shift);
                              setShowShiftModal(true);
                            }}
                            className="p-1.5 text-[var(--muted)] hover:text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] rounded-full transition-colors cursor-pointer"
                            title="Edit Shift"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(shift.id)}
                            className="p-1.5 text-[var(--muted)] hover:text-[#D64550] hover:bg-[#FDE8EA] rounded-full transition-colors cursor-pointer"
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
              <div className="p-10 flex flex-col items-center justify-center text-center text-[var(--muted)]">
                <Clock size={28} className="opacity-30 mb-2" />
                <p className="text-xs font-medium text-[var(--text)]">No shift times configured</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Add working shifts for automatic attendance processing</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geo Sidebar Drawer */}
      {showGeoModal &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) {
                setShowGeoModal(false);
                setEditingGeo(null);
              }
            }}
            className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs antialiased"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative border-l border-[var(--line)]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)] shrink-0">
                <div>
                  <h2 className="text-lg font-medium text-[var(--text)] tracking-tight">
                    {editingGeo ? 'Edit geo location' : 'Add geo location'}
                  </h2>
                  <p className="text-xs text-[var(--muted)]">Geo-fence boundary configuration</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGeoModal(false);
                    setEditingGeo(null);
                  }}
                  disabled={isSubmitting}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <form id="geo-form" onSubmit={handleAddGeo} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                      Location name <span className="text-[#D64550]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      name="location_name"
                      defaultValue={editingGeo?.name || ''}
                      placeholder="e.g. Headquarters, Bangalore Branch"
                      className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] outline-none bg-[var(--surface)] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                        Latitude <span className="text-[#D64550]">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        name="latitude"
                        defaultValue={editingGeo?.latitude || ''}
                        placeholder="12.9716"
                        className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] font-mono focus:border-[var(--brand)] outline-none bg-[var(--surface)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                        Longitude <span className="text-[#D64550]">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        name="longitude"
                        defaultValue={editingGeo?.longitude || ''}
                        placeholder="77.5946"
                        className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] font-mono focus:border-[var(--brand)] outline-none bg-[var(--surface)] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                      Allowed radius (meters) <span className="text-[#D64550]">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      name="radius"
                      defaultValue={editingGeo?.radius || 100}
                      placeholder="100"
                      className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] outline-none bg-[var(--surface)] transition-all"
                    />
                    <p className="text-[11px] text-[var(--muted)] mt-1">
                      Employees within this radius will be marked as in-office.
                    </p>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowGeoModal(false);
                    setEditingGeo(null);
                  }}
                  className="h-10 px-5 rounded-full text-xs font-medium"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="geo-form"
                  variant="primary"
                  className="h-10 px-6 rounded-full text-xs font-medium justify-center"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {editingGeo ? 'Update location' : 'Save location'}
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {/* Shift Sidebar Drawer */}
      {showShiftModal &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) {
                setShowShiftModal(false);
                setEditingShift(null);
              }
            }}
            className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs antialiased"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative border-l border-[var(--line)]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)] shrink-0">
                <div>
                  <h2 className="text-lg font-medium text-[var(--text)] tracking-tight">
                    {editingShift ? 'Edit shift time' : 'Add shift time'}
                  </h2>
                  <p className="text-xs text-[var(--muted)]">Shift timing windows</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftModal(false);
                    setEditingShift(null);
                  }}
                  disabled={isSubmitting}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <form id="shift-form" onSubmit={handleAddShift} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                        Start time <span className="text-[#D64550]">*</span>
                      </label>
                      <input
                        required
                        type="time"
                        name="start_time"
                        defaultValue={editingShift?.startTime || ''}
                        className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] outline-none bg-[var(--surface)] transition-all cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text)] mb-1.5">
                        End time <span className="text-[#D64550]">*</span>
                      </label>
                      <input
                        required
                        type="time"
                        name="end_time"
                        defaultValue={editingShift?.endTime || ''}
                        className="w-full h-10 rounded-[12px] border border-[var(--line)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] outline-none bg-[var(--surface)] transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    The shift label will be automatically computed (e.g. 09:45 AM - 06:30 PM).
                  </p>
                </form>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowShiftModal(false);
                    setEditingShift(null);
                  }}
                  className="h-10 px-5 rounded-full text-xs font-medium"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="shift-form"
                  variant="primary"
                  className="h-10 px-6 rounded-full text-xs font-medium justify-center"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {editingShift ? 'Update shift time' : 'Save shift time'}
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Dialog */}
      {itemToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs antialiased">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--surface)] rounded-[24px] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-sm overflow-hidden relative border border-[var(--line)]"
            >
              <div className="p-6 text-center pt-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FDE8EA] text-[#D64550] flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={22} />
                </div>
                <h2 className="text-lg font-medium text-[var(--text)] mb-1.5">Confirm deletion</h2>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Are you sure you want to delete this {itemToDelete.type === 'geo' ? 'geo location' : 'shift time'}?
                  This configuration rule will no longer apply.
                </p>
              </div>
              <div className="px-6 py-4 bg-[var(--surface-alt)] flex justify-end gap-2.5 border-t border-[var(--line)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setItemToDelete(null)}
                  className="h-9 px-4 rounded-full text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={confirmDelete}
                  className="h-9 px-5 rounded-full text-xs font-medium justify-center"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminAttendanceConfig;
