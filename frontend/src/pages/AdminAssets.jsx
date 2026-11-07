import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import SearchBar from '../components/ui/SearchBar';
import { 
  Edit2, 
  X, 
  Monitor, 
  Plus, 
  Trash2, 
  History, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Keyboard, 
  Mouse, 
  Headphones, 
  HardDrive, 
  User, 
  Wrench, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  UserCheck, 
  Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { StatCard, StatusBadge, Button, Avatar } from '../components/ui';

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
  const [, setAssetHistory] = useState([]);
  const [, setHistoryLoading] = useState(false);
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
  const { data: assetsResponse, isLoading: assetsLoading, isFetching: assetsFetching } = useQuery({
    queryKey: ['admin', 'assets', page, debouncedSearchQuery, filter, categoryFilter],
    queryFn: async () => {
      const res = await api.get(`/admin/assets?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearchQuery)}&status=${filter}&category=${categoryFilter}`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
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
  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async () => {
      const res = await api.get('/admin/employees?limit=200');
      return res.data.employees || [];
    },
  });

  const loading = assetsLoading && !assetsResponse && !debouncedSearchQuery;

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

  const handleAssign = handleAssignUser;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return <StatusBadge status="Available" variant="success" />;
      case 'Assigned':
        return <StatusBadge status="Assigned" variant="info" />;
      case 'Maintenance':
        return <StatusBadge status="Maintenance" variant="warning" />;
      case 'Damaged':
      case 'Missing':
      case 'Retired':
        return <StatusBadge status={status} variant="danger" />;
      default:
        return <StatusBadge status={status || 'Unknown'} variant="neutral" />;
    }
  };

  const filteredUsersForModal = users.filter(u => {
    const fullName = `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.toLowerCase();
    const employeeId = (u.employeeId || u.employee_id || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const q = modalSearch.toLowerCase();
    return fullName.includes(q) || employeeId.includes(q) || email.includes(q);
  });
  const filteredEmployees = filteredUsersForModal;

  if (loading) return <PageLoader message="Loading Assets..." />;

  return (
    <div className="space-y-4 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Asset Management
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Track company equipment, monitor inventory allocation, and audit employee hardware history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {totalCount} Items
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Asset
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Inventory" 
          value={stats.totalCount} 
          subtitle="Registered hardware items" 
          icon={Monitor} 
        />
        <StatCard 
          title="Assigned Equipment" 
          value={stats.assignedCount} 
          subtitle="Currently held by staff" 
          badgeText="Assigned"
          badgeType="info"
          icon={UserCheck} 
        />
        <StatCard 
          title="In Stock (Available)" 
          value={stats.availableCount} 
          subtitle="Ready for allocation" 
          badgeText="In Stock"
          badgeType="success"
          icon={ShieldCheck} 
        />
        <StatCard 
          title="Maintenance / Repair" 
          value={stats.maintenanceCount + stats.damagedCount} 
          subtitle={`${stats.maintenanceCount} servicing • ${stats.damagedCount} damaged`} 
          badgeText="Service"
          badgeType="warning"
          icon={Wrench} 
        />
      </div>

      {/* Main Assets Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col">
        {/* Table Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[var(--line)] mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {['All', 'Available', 'Assigned', 'Maintenance'].map((st) => (
              <button
                key={st}
                onClick={() => { setFilter(st); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === st
                    ? 'bg-[var(--ink)] text-white shadow-xs'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
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
              className="w-full sm:w-auto h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Search */}
            <SearchBar
              placeholder="Search asset, S/N, employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              isFetching={assetsFetching}
              wrapperClassName="w-full sm:w-72"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto custom-scrollbar relative">
          {assetsLoading && assets.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 text-[var(--brand-deep)] animate-spin mb-1" />
              <p className="text-xs">Loading hardware assets...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center space-y-2">
              <Monitor className="w-12 h-12 text-[var(--icon-muted)] mb-1" />
              <p className="text-sm font-semibold text-[var(--text)]">No assets found</p>
              <p className="text-xs text-[var(--muted)]">
                {searchQuery ? "Try adjusting your search criteria." : "Click \"Add Asset\" to register your first hardware device."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Asset Details</th>
                  <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Serial Number</th>
                  <th className="px-4 py-3 font-normal text-xs text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Current Holder</th>
                  <th className="px-4 py-3 font-normal text-xs text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {assets.map(asset => {
                  const CatIcon = getCategoryIcon(asset.category);
                  return (
                    <tr key={asset.id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[12px] bg-[var(--surface-alt)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text)] text-xs">{asset.name}</p>
                            <span className="text-[11px] text-[var(--muted)]">Added {format(new Date(asset.created_at || new Date()), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-[var(--text-2)]">
                        {asset.category}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-[6px]">
                          {asset.serial_number || 'N/A'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(asset.status)}
                      </td>

                      <td className="px-4 py-3">
                        {asset.employee_id ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={`${asset.employee_first_name} ${asset.employee_last_name}`} size="xs" />
                            <span className="font-semibold text-[var(--text)] text-xs">
                              {asset.employee_first_name} {asset.employee_last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)] italic font-normal">Unassigned / In Stock</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openAssignModal(asset)}
                            className="text-xs"
                            title="Assign to Employee"
                          >
                            <User className="w-3.5 h-3.5 mr-1" />
                            {asset.employee_id ? 'Reassign' : 'Assign'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openHistoryModal(asset)}
                            className="p-1.5 h-8 w-8"
                            title="View Track History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 h-8 w-8"
                            title="Edit Asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 h-8 w-8 text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)]"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
          <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--muted)]">
            <p>
              Showing <span className="font-semibold text-[var(--text)]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[var(--text)]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[var(--text)]">{totalCount}</span> assets
            </p>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 text-xs font-medium text-[var(--text)] bg-[var(--surface-alt)] rounded-[8px]">
                {page} / {totalPages}
              </span>
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Slideover Right Drawers (createPortal) */}
      {modalMode && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs font-sans antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {modalMode === 'assign' ? 'Asset Allocation' :
                     modalMode === 'history' ? 'Asset Audit Log' : 'Asset Management'}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  {modalMode === 'assign' ? 'Assign Asset' :
                   modalMode === 'add' ? 'Add New Asset' :
                   modalMode === 'history' ? 'Track History' : 'Edit Asset Details'}
                </h2>
              </div>
              <button 
                type="button"
                onClick={closeModal} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
              {modalMode === 'assign' ? (
                <>
                  <SearchBar
                    placeholder="Search employee by name, ID, or email..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    wrapperClassName="mb-2"
                  />

                  {/* Unassign Option */}
                  {(selectedAsset?.employee_id || selectedAsset?.assigned_to) && (
                    <button
                      onClick={() => handleAssign(null)}
                      disabled={saving}
                      className="w-full p-3 mb-3 rounded-[16px] border border-[var(--status-danger-text)]/20 bg-[var(--status-danger-bg)] flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--status-danger-text)] shadow-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--status-danger-text)]">Unassign &amp; Return to Inventory</p>
                          <p className="text-[11px] text-[var(--muted)]">Remove currently assigned employee</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--status-danger-text)] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Employee Directory List */}
                  <div className="space-y-2">
                    <p className="font-semibold text-[var(--muted)] uppercase tracking-wider text-[10px]">Select Employee</p>
                    {filteredEmployees.length === 0 ? (
                      <p className="text-center py-6 text-[var(--muted)]">No employees found</p>
                    ) : (
                      filteredEmployees.map(emp => {
                        const isAssigned = 
                          (selectedAsset?.employee_id && (selectedAsset.employee_id === emp.userId || selectedAsset.employee_id === emp.id)) ||
                          (selectedAsset?.assigned_to && (selectedAsset.assigned_to === emp.id || selectedAsset.assigned_to === emp.userId));
                        return (
                          <div
                            key={emp.id}
                            onClick={() => handleAssign(emp.userId || emp.id)}
                            className={`p-3 rounded-[16px] border flex items-center justify-between cursor-pointer transition-all ${
                              isAssigned
                                ? 'border-[var(--brand)] bg-[var(--brand-tint)]'
                                : 'border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--surface)]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Avatar name={`${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`} size="sm" />
                              <div>
                                <p className="font-semibold text-[var(--text)]">{emp.first_name || emp.firstName} {emp.last_name || emp.lastName}</p>
                                <p className="text-[11px] text-[var(--muted)]">{emp.designation || emp.position || 'Staff'} • {emp.department || 'General'}</p>
                              </div>
                            </div>
                            {isAssigned ? (
                              <span className="text-[10px] font-semibold text-[var(--brand-deep)] bg-[var(--surface)] px-2 py-0.5 rounded-[9px]">Assigned</span>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--icon-muted)]" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : modalMode === 'history' ? (
                /* History Timeline Mode */
                <div className="space-y-4">
                  {selectedAsset?.asset_history?.length === 0 ? (
                    <div className="text-center py-10 text-[var(--muted)]">
                      <History className="w-8 h-8 mx-auto mb-2 text-[var(--icon-muted)]" />
                      <p>No audit history recorded for this asset yet.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 border-l border-[var(--line)] ml-2">
                      {selectedAsset?.asset_history?.map((hist, i) => (
                        <div key={i} className="relative group">
                          <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)] bg-[var(--brand-deep)] shadow-xs" />
                          <div className="bg-[var(--surface-alt)] border border-[var(--line)] rounded-[16px] p-3.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[var(--text)]">{hist.action}</span>
                              <span className="text-[10px] text-[var(--muted)]">{hist.timestamp ? format(new Date(hist.timestamp), 'dd MMM yyyy, hh:mm a') : '—'}</span>
                            </div>
                            <p className="text-[var(--text-2)]">{hist.details}</p>
                            {hist.performed_by_name && (
                              <p className="text-[10px] text-[var(--brand-deep)] font-medium pt-1">By: {hist.performed_by_name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Add / Edit Form */
                <form id="asset-form" onSubmit={handleSaveAsset} className="space-y-4">
                  <div>
                    <label className="block font-semibold text-[var(--text)] mb-1.5">Asset Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MacBook Pro 16, Dell UltraSharp 27"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--text)] mb-1.5">Asset Category *</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] cursor-pointer transition-all"
                      >
                        {categories.filter(c => c !== 'All').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--text)] mb-1.5">Serial Number</label>
                      <input
                        type="text"
                        placeholder="e.g. C02G1234MD6R"
                        value={formData.serial_number}
                        onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                        className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none font-mono focus:ring-2 focus:ring-[var(--brand)] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text)] mb-1.5">Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] cursor-pointer transition-all"
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
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                {modalMode === 'add' || modalMode === 'edit' ? 'Cancel' : 'Close'}
              </button>
              {(modalMode === 'add' || modalMode === 'edit') && (
                <button
                  type="submit"
                  form="asset-form"
                  disabled={saving}
                  className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : modalMode === 'add' ? 'Register Asset' : 'Save Changes'}
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminAssets;