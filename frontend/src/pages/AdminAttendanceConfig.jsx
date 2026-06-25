import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Globe,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import toast from "react-hot-toast";

const AdminAttendanceConfig = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showGeoModal, setShowGeoModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingGeo, setEditingGeo] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Extras query (geo locations + shift times)
  const { data: extrasData } = useQuery({
    queryKey: ["admin", "attendance-extras"],
    queryFn: async () => {
      const [geoRes, shiftRes] = await Promise.all([
        api.get("/admin/geolocations"),
        api.get("/admin/shifttimes"),
      ]);
      return {
        geoLocations: geoRes.data || [],
        shiftTimes: shiftRes.data || [],
      };
    },
  });

  const geoLocations = extrasData?.geoLocations || [];
  const shiftTimes = extrasData?.shiftTimes || [];

  const handleAddGeo = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      if (editingGeo) {
        await api.put(
          `/admin/geolocations/${editingGeo.id}`,
          Object.fromEntries(fd),
        );
        toast.success("Geo location updated successfully");
      } else {
        await api.post("/admin/geolocations", Object.fromEntries(fd));
        toast.success("Geo location saved successfully");
      }
      setShowGeoModal(false);
      setEditingGeo(null);
      queryClient.invalidateQueries({
        queryKey: ["admin", "attendance-extras"],
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save geo location");
    }
  };

  const handleDeleteGeo = (id) => {
    setItemToDelete({ type: "geo", id });
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      if (editingShift) {
        await api.put(
          `/admin/shifttimes/${editingShift.id}`,
          Object.fromEntries(fd),
        );
        toast.success("Shift time updated successfully");
      } else {
        await api.post("/admin/shifttimes", Object.fromEntries(fd));
        toast.success("Shift time saved successfully");
      }
      setShowShiftModal(false);
      setEditingShift(null);
      queryClient.invalidateQueries({
        queryKey: ["admin", "attendance-extras"],
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save shift time");
    }
  };

  const handleDeleteShift = (id) => {
    setItemToDelete({ type: "shift", id });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "geo") {
        await api.delete(`/admin/geolocations/${itemToDelete.id}`);
        toast.success("Geo location deleted successfully");
      } else if (itemToDelete.type === "shift") {
        await api.delete(`/admin/shifttimes/${itemToDelete.id}`);
        toast.success("Shift time deleted successfully");
      }
      queryClient.invalidateQueries({
        queryKey: ["admin", "attendance-extras"],
      });
    } catch (err) {
      toast.error("Failed to delete item");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate("/admin/attendance")}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Locations & Shifts
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-8">
            Configure geo-fences and valid shift timings for attendance tracking
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingGeo(null);
              setShowGeoModal(true);
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 h-10 px-4 py-2 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 mr-2 text-blue-500" /> Add Location
          </button>
          <button
            onClick={() => {
              setEditingShift(null);
              setShowShiftModal(true);
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 mr-2 text-slate-500" /> Add Shift Time
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Geo Locations */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">
              Saved Geo Locations
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Coordinates stored for attendance verification.
            </p>
          </div>
          <div className="overflow-x-auto flex-1">
            {geoLocations.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="h-10 px-4 font-medium">Name</th>
                    <th className="h-10 px-4 font-medium">Latitude</th>
                    <th className="h-10 px-4 font-medium">Longitude</th>
                    <th className="h-10 px-4 font-medium">Radius</th>
                    <th className="h-10 px-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {geoLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {loc.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {loc.latitude}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {loc.longitude}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {loc.radius}m
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingGeo(loc);
                            setShowGeoModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mx-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteGeo(loc.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded mx-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No geo locations configured yet.
              </div>
            )}
          </div>
        </div>

        {/* Shift Times */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">
              Saved Shift Times
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Shift windows available for assignment.
            </p>
          </div>
          <div className="overflow-x-auto flex-1">
            {shiftTimes.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="h-10 px-4 font-medium">Shift</th>
                    <th className="h-10 px-4 font-medium">Start Time</th>
                    <th className="h-10 px-4 font-medium">End Time</th>
                    <th className="h-10 px-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shiftTimes.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {shift.shiftLabel}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(
                          `2000-01-01T${shift.startTime}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(
                          `2000-01-01T${shift.endTime}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingShift(shift);
                            setShowShiftModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mx-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded mx-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No shift times configured yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geo Modal */}
      {showGeoModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <form onSubmit={handleAddGeo}>
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingGeo ? "Edit Geo Location" : "Add Geo Location"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {editingGeo
                      ? "Modify permitted attendance coordinates."
                      : "Save permitted attendance coordinates for this site."}
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      name="location_name"
                      defaultValue={editingGeo?.name || ""}
                      placeholder="Office Name"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        name="latitude"
                        defaultValue={editingGeo?.latitude || ""}
                        placeholder="12.9716"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        name="longitude"
                        defaultValue={editingGeo?.longitude || ""}
                        placeholder="77.5946"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Radius (meters) <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      name="radius"
                      defaultValue={editingGeo?.radius || 100}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="p-6 pt-0 flex justify-end gap-3 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGeoModal(false);
                      setEditingGeo(null);
                    }}
                    className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 mt-6 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 mt-6 cursor-pointer"
                  >
                    {editingGeo ? "Update Location" : "Save Location"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Shift Modal */}
      {showShiftModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <form onSubmit={handleAddShift}>
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingShift ? "Edit Shift Time" : "Add Shift Time"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {editingShift
                      ? "Modify shift using start and end time."
                      : "Create a new shift using start and end time."}
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="time"
                        name="start_time"
                        defaultValue={editingShift?.startTime || ""}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="time"
                        name="end_time"
                        defaultValue={editingShift?.endTime || ""}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-0 flex justify-end gap-3 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowShiftModal(false);
                      setEditingShift(null);
                    }}
                    className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 mt-6 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 mt-6 cursor-pointer"
                  >
                    {editingShift ? "Update Shift Time" : "Save Shift Time"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Confirmation Modal */}
      {itemToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  Confirm Deletion
                </h2>
                <p className="text-sm text-slate-500">
                  Are you sure you want to delete this{" "}
                  {itemToDelete.type === "geo" ? "Geo Location" : "Shift Time"}?
                  This action cannot be undone.
                </p>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default AdminAttendanceConfig;
