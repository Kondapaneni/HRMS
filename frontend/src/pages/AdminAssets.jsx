import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Shield, 
  Edit2, 
  Search, 
  X, 
  Monitor, 
  Plus, 
  Trash2, 
  History, 
  ArrowRight,
  Laptop,
  Smartphone,
  Tablet,
  Keyboard,
  Mouse,
  Headphones,
  HardDrive,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const getCategoryIcon = (category) => {
  switch ((category || '').toLowerCase()) {
    case 'laptop': return Laptop;
    case 'monitor': return Monitor;
    case 'phone': return Smartphone;
    case 'tablet': return Tablet;
    case 'keyboard': return Keyboard;
    case 'mouse': return Mouse;
    case 'audio': return Headphones;
    default: return HardDrive;
  }
};

const AdminAssets = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Filters and Pagination
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Drawer / Modal State
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [modalMode, setModalMode] = useState(''); // 'assign', 'add', 'edit', 'history'
  const [modalSearch, setModalSearch] = useState('');
  const [assetHistory, setAssetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Laptop',
    serial_number: '',
    status: 'Available'
  });

  const categories = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Phone', 'Tablet', 'Audio', 'Other'];

  // Fetch Assets from API
  const { data: assetsResponse, isLoading: assetsLoading } = useQuery({
    queryKey: ['admin', 'assets', page, debouncedSearchQuery, filter, categoryFilter],
    queryFn: async () => {
      const res = await api.get(`/admin/assets?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearchQuery)}&status=${filter}&category=${categoryFilter}`);
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const assets = assetsResponse?.data || [];
  const stats = assetsResponse?.stats || {
    totalCount: 0,
    availableCount: 0,
    assignedCount: 0,
    maintenanceCount: 0,
    damagedCount: 0
  };
  const totalCount = assetsResponse?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Fetch Employees for assignment dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async () => {
      const res = await api.get('/admin/employees?limit=200');
      return res.data.employees || [];
    },
  });

  const loading = assetsLoading && !assetsResponse;

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'EM';
  };

  const openAddModal = () => {
    setFormData({ name: '', category: 'Laptop', serial_number: '', status: 'Available' });
    setModalMode('add');
    setSelectedAsset(null);
  };

  const openEditModal = (asset) => {
    setFormData({
      name: asset.name,
      category: asset.category,
      serial_number: asset.serial_number || '',
      status: asset.status
    });
    setModalMode('edit');
    setSelectedAsset(asset);
  };

  const openAssignModal = (asset) => {
    setModalMode('assign');
    setSelectedAsset(asset);
    setModalSearch('');
  };

  const openHistoryModal = async (asset) => {
    setModalMode('history');
    setSelectedAsset(asset);
    setHistoryLoading(true);
    setAssetHistory([]);
    try {
      const response = await api.get(`/admin/assets/${asset.id}/history`);
      setAssetHistory(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load asset history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeModal = () => {
    setModalMode('');
    setSelectedAsset(null);
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (modalMode === 'add') {
        await api.post('/admin/assets', formData);
        toast.success('Asset created successfully.');
      } else {
        await api.put(`/admin/assets/${selectedAsset.id}`, formData);
        toast.success('Asset updated successfully.');
      }
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save asset.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await api.delete(`/admin/assets/${id}`);
      toast.success('Asset deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
    } catch (error) {
      toast.error('Failed to delete asset.');
    }
  };

  const handleAssignUser = async (userId) => {
    try {
      setSaving(true);
      await api.put(`/admin/assets/${selectedAsset.id}`, { assigned_to: userId });
      toast.success(userId ? 'Asset assigned successfully.' : 'Asset unassigned.');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
    } catch (error) {
      toast.error('Failed to update assignment.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <ShieldCheck className="w-3.5 h-3.5" /> In Stock (Available)
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <UserCheck className="w-3.5 h-3.5" /> Assigned
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Wrench className="w-3.5 h-3.5" /> Maintenance
          </span>
        );
      case 'Damaged':
      case 'Missing':
      case 'Retired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <AlertTriangle className="w-3.5 h-3.5" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
            {status}
          </span>
        );
    }
  };

  const filteredUsersForModal = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const employeeId = (u.employeeId || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const q = modalSearch.toLowerCase();
    return fullName.includes(q) || employeeId.includes(q) || email.includes(q);
  });

  if (loading) return <PageLoader message="Loading Assets..." />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
            <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
            <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
            <span className="w-2 h-2 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Hardware & Devices</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Asset Management <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{totalCount} Items</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Track company equipment, monitor inventory allocation, and audit employee hardware history.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Inventory" 
          value={stats.totalCount} 
          subtitle="Registered hardware items" 
          icon={Monitor} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Assigned Equipment" 
          value={stats.assignedCount} 
          subtitle="Currently held by staff" 
          icon={UserCheck} 
          colorTheme="purple" 
        />
        <StatCard 
          title="In Stock (Available)" 
          value={stats.availableCount} 
          subtitle="Ready for allocation" 
          icon={ShieldCheck} 
          colorTheme="green" 
        />
        <StatCard 
          title="Maintenance / Repair" 
          value={stats.maintenanceCount + stats.damagedCount} 
          subtitle={`${stats.maintenanceCount} servicing • ${stats.damagedCount} damaged`} 
          icon={Wrench} 
          colorTheme="amber" 
        />
      </div>

      {/* Main Assets Table Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Available', 'Assigned', 'Maintenance'].map((st) => (
              <button
                key={st}
                onClick={() => { setFilter(st); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === st
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                }`}
              >
                {st} {st === 'All' ? `(${stats.totalCount})` : st === 'Available' ? `(${stats.availableCount})` : st === 'Assigned' ? `(${stats.assignedCount})` : `(${stats.maintenanceCount})`}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto px-3.5 py-2 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs text-[#1f1f1f] outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Google Pill Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
              <input
                type="search"
                placeholder="Search asset, S/N, employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto custom-scrollbar">
          {assets.length === 0 ? (
            <div className="p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
              <Monitor className="w-12 h-12 text-[#dadce0] mb-1" />
              <p className="text-sm font-semibold text-[#1f1f1f]">No assets found</p>
              <p className="text-xs text-[#5f6368]">
                {searchQuery ? "Try adjusting your search criteria." : "Click \"Add Asset\" to register your first hardware device."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Asset Details</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Serial Number</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5">Current Holder</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e7]">
                {assets.map(asset => {
                  const CatIcon = getCategoryIcon(asset.category);
                  return (
                    <tr key={asset.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#f1f3f4] text-[#1f1f1f] shrink-0 border border-[#e0e3e7]">
                            <CatIcon className="w-4 h-4 text-[#1a73e8]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1f1f1f] text-xs">{asset.name}</p>
                            <span className="text-[11px] text-[#5f6368]">Added {format(new Date(asset.created_at || new Date()), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-[#3c4043]">
                        {asset.category}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-medium text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded-md">
                          {asset.serial_number || 'N/A'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {getStatusBadge(asset.status)}
                      </td>

                      <td className="px-5 py-3.5">
                        {asset.employee_id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] font-bold text-[10px] shrink-0">
                              {getInitials(asset.employee_first_name, asset.employee_last_name)}
                            </div>
                            <span className="font-semibold text-[#1f1f1f] text-xs">
                              {asset.employee_first_name} {asset.employee_last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#5f6368] italic font-normal">Unassigned / In Stock</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openAssignModal(asset)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                            title="Assign to Employee"
                          >
                            <User className="w-3.5 h-3.5 text-[#5f6368]" />
                            {asset.employee_id ? 'Reassign' : 'Assign'}
                          </button>
                          <button
                            onClick={() => openHistoryModal(asset)}
                            className="p-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#1a73e8] transition-all cursor-pointer"
                            title="View Track History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] hover:text-[#1a73e8] transition-all cursor-pointer"
                            title="Edit Asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 rounded-full border border-[#fce8e6] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] transition-all cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <p className="text-[#5f6368]">
              Showing <span className="font-semibold text-[#1f1f1f]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[#1f1f1f]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[#1f1f1f]">{totalCount}</span> assets
            </p>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-[#1f1f1f] bg-white border border-[#dadce0] rounded-full">
                Page {page} of {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slideover Right Drawers (createPortal) */}
      {modalMode && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
            onClick={closeModal} 
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="p-5 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    {modalMode === 'assign' ? <UserCheck className="w-5 h-5" /> :
                     modalMode === 'history' ? <History className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1f1f1f]">
                      {modalMode === 'assign' ? `Assign Asset` :
                       modalMode === 'add' ? 'Add New Asset' :
                       modalMode === 'history' ? `Track History` : 'Edit Asset Details'}
                    </h3>
                    <p className="text-xs text-[#5f6368]">
                      {modalMode === 'assign' ? `Allocate ${selectedAsset?.name} to an employee` :
                       modalMode === 'history' ? `Audit log for ${selectedAsset?.name}` : 'Configure device specifications'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeModal} 
                  className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
                {modalMode === 'assign' ? (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
                      <input
                        type="search"
                        placeholder="Search employee by name, ID, or email..."
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] outline-none transition-all"
                      />
                    </div>

                    {/* Unassign Option */}
                    {selectedAsset?.employee_id && (
                      <div
                        onClick={() => handleAssignUser(null)}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-[#fad2cf] bg-[#fce8e6] hover:bg-[#fad2cf] cursor-pointer transition-all"
                      >
                        <div>
                          <h4 className="font-bold text-[#c5221f] text-xs">Return to Stock (Unassign)</h4>
                          <p className="text-[11px] text-[#c5221f]/80 mt-0.5">Remove current holder and mark as available</p>
                        </div>
                        <X className="w-4 h-4 text-[#c5221f]" />
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      {filteredUsersForModal.map(u => {
                        const isCurrent = selectedAsset?.employee_id === u.userId;
                        return (
                          <div
                            key={u.userId}
                            onClick={() => !isCurrent && handleAssignUser(u.userId)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                              isCurrent
                                ? 'border-[#4285F4] bg-[#e8f0fe] cursor-default'
                                : 'border-[#e0e3e7] hover:border-[#4285F4] hover:bg-[#f8fafd] cursor-pointer'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(u.firstName, u.lastName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#1f1f1f] text-xs truncate">{u.firstName} {u.lastName}</h4>
                              <p className="text-[11px] text-[#5f6368] truncate">{u.employeeId} • {u.position || 'Staff'}</p>
                            </div>
                            {isCurrent ? (
                              <span className="text-[10px] font-bold text-[#1a73e8] bg-white px-2 py-0.5 rounded-full border border-[#d2e3fc]">
                                Current Holder
                              </span>
                            ) : (
                              <ArrowRight className="w-4 h-4 text-[#5f6368]" />
                            )}
                          </div>
                        );
                      })}
                      {filteredUsersForModal.length === 0 && (
                        <div className="py-8 text-center text-[#5f6368] text-xs italic">
                          No employees matching "{modalSearch}"
                        </div>
                      )}
                    </div>
                  </>
                ) : modalMode === 'history' ? (
                  <div className="space-y-4">
                    {historyLoading ? (
                      <div className="py-8 text-center text-[#5f6368]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#4285F4] mb-2" />
                        <p className="text-xs">Loading audit trail...</p>
                      </div>
                    ) : assetHistory.length === 0 ? (
                      <div className="py-8 text-center text-[#5f6368] text-xs italic">No history records found for this asset.</div>
                    ) : (
                      <div className="relative border-l-2 border-[#e0e3e7] ml-3 pl-5 space-y-4">
                        {assetHistory.map((log, index) => {
                          const isCreation = log.action_type === 'INSERT';
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                              className="relative"
                            >
                              <div className={`absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${isCreation ? 'bg-[#137333]' : 'bg-[#1a73e8]'}`} />
                              <div className="bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl p-3.5 space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-semibold text-[#5f6368] bg-white px-2 py-0.5 rounded-full border border-[#dadce0]">
                                    {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                                  </span>
                                  {getStatusBadge(log.status)}
                                </div>
                                <h4 className="text-xs font-semibold text-[#1f1f1f]">
                                  {isCreation ? 'Device Registered in Inventory' : 'Status / Allocation Changed'}
                                </h4>
                                {log.assigned_to_employee_id ? (
                                  <p className="text-xs text-[#5f6368] flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
                                    Assigned to <span className="font-semibold text-[#1f1f1f]">{log.firstName} {log.lastName}</span>
                                  </p>
                                ) : (
                                  !isCreation && (
                                    <p className="text-xs text-[#5f6368] flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" />
                                      Returned to Available Inventory
                                    </p>
                                  )
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <form id="asset-form" onSubmit={handleSaveAsset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                        Asset Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none transition-all"
                        placeholder="e.g. MacBook Pro M3 Max"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none cursor-pointer transition-all"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                        Serial Number / Tag ID
                      </label>
                      <input
                        type="text"
                        value={formData.serial_number}
                        onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none font-mono transition-all"
                        placeholder="e.g. C02X1234ABCD"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                        Operational Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs text-[#1f1f1f] outline-none cursor-pointer transition-all"
                      >
                        <option value="Available">Available (In Stock)</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Retired">Retired</option>
                      </select>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer */}
              {(modalMode === 'add' || modalMode === 'edit') && (
                <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-2.5">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    form="asset-form"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : modalMode === 'add' ? 'Register Asset' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminAssets;
