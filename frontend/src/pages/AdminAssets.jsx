import React, { useState } from 'react';
import { Shield, Edit2, Search, X, Monitor, Plus, Trash2, History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AdminAssets = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Modal State
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [modalMode, setModalMode] = useState(''); // 'assign', 'add', 'edit', 'history'
  const [modalSearch, setModalSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [assetHistory, setAssetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Laptop',
    serial_number: '',
    status: 'Available'
  });

  const categories = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Phone', 'Tablet', 'Other'];

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['admin', 'assets'],
    queryFn: async () => {
      const res = await api.get('/admin/assets');
      return res.data.data;
    },
    onError: (error) => toast.error(error.response?.data?.error || error.message),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async () => {
      const res = await api.get('/admin/employees');
      return res.data.employees;
    },
  });

  const loading = assetsLoading || usersLoading;

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
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

  const filteredUsersForModal = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(modalSearch.toLowerCase()) || (u.email && u.email.toLowerCase().includes(modalSearch.toLowerCase()));
  });

  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    const holderName = `${asset.employee_first_name || ''} ${asset.employee_last_name || ''}`.toLowerCase();
    const assetName = (asset.name || '').toLowerCase();
    const search = searchQuery.toLowerCase();
    return holderName.includes(search) || assetName.includes(search);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Monitor className="text-blue-600" />
            Asset Management
          </h1>
          <p className="text-slate-500 mt-1">Track and manage company equipment and assignments.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all"
        >
          <Plus size={18} className="mr-2" /> Add Asset
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by asset or holder name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Monitor size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-900">No assets found</p>
            <p className="text-sm mt-1">
              {searchQuery ? "Try adjusting your search criteria." : "Click \"Add Asset\" to create your first inventory item."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-6 w-1/2">Asset Details</th>
                <th className="py-4 px-6">Assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAssets.map(asset => {
                return (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-6 align-top">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-slate-900 text-base">{asset.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          asset.status === 'Available' ? 'bg-green-100 text-green-700' :
                          asset.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                          asset.status === 'Missing' ? 'bg-orange-100 text-orange-700' :
                          asset.status === 'Damaged' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {asset.status}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => openHistoryModal(asset)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                            title="View Track/History"
                          >
                            <History size={14} />
                          </button>
                          <button 
                            onClick={() => openEditModal(asset)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                            title="Edit Asset"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Delete Asset"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="text-slate-500 leading-relaxed text-sm flex flex-col gap-1 mt-3">
                        <div><span className="font-medium text-slate-700">Category:</span> {asset.category}</div>
                        <div><span className="font-medium text-slate-700">S/N:</span> {asset.serial_number || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-6 px-6 align-top">
                      <div className="text-sm font-medium text-slate-700 mb-4">Current Holder</div>
                      
                      <div className="flex flex-wrap gap-3 mb-4">
                        {!asset.employee_id ? (
                          <span className="text-slate-400 italic text-sm">Unassigned</span>
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full pr-3 pl-1 py-1">
                            <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center">
                              {getInitials(asset.employee_first_name, asset.employee_last_name)}
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {asset.employee_first_name} {asset.employee_last_name}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => openAssignModal(asset)}
                        className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors text-sm"
                      >
                        {asset.employee_id ? 'Change Assignment' : 'Assign to Employee'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === 'assign' ? `Assign ${selectedAsset.name}` : 
                   modalMode === 'add' ? 'Add New Asset' : 
                   modalMode === 'history' ? `Track History: ${selectedAsset.name}` : 'Edit Asset'}
                </h2>
                <p className="text-sm text-slate-500">
                  {modalMode === 'assign' ? 'Select an employee to assign this asset to.' : 
                   modalMode === 'history' ? 'View the assignment and status history.' : 'Enter the details of the asset.'}
                </p>
              </div>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col">
              {modalMode === 'assign' ? (
                <>
                  <div className="relative mb-4 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search by name or email..." 
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-[300px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                      {/* Unassign Option */}
                      {selectedAsset.employee_id && (
                        <div 
                          onClick={() => handleAssignUser(null)}
                          className="flex items-center gap-3 p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer transition-all"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-red-700 text-sm">Unassign Asset</h4>
                            <p className="text-xs text-red-600 mt-0.5">Return to inventory</p>
                          </div>
                        </div>
                      )}
                      
                      {filteredUsersForModal.map(u => {
                        const isCurrent = selectedAsset.employee_id === u.userId;
                        return (
                          <div 
                            key={u.userId}
                            onClick={() => !isCurrent && handleAssignUser(u.userId)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              isCurrent
                                ? 'border-blue-500 bg-blue-50 cursor-default' 
                                : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0">
                              {getInitials(u.firstName, u.lastName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 text-sm truncate">{u.firstName} {u.lastName}</h4>
                              <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                            {isCurrent && (
                              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white outline outline-1 outline-blue-200 shrink-0"></div>
                            )}
                          </div>
                        );
                      })}
                      {filteredUsersForModal.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-500 text-sm italic">
                          No users found matching "{modalSearch}"
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalMode === 'history' ? (
                <div className="space-y-4">
                  {historyLoading ? (
                    <div className="py-8 text-center text-slate-500">Loading history...</div>
                  ) : assetHistory.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 italic">No history found for this asset.</div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                      {assetHistory.map((log, index) => {
                        const isCreation = log.action_type === 'INSERT';
                        return (
                          <motion.div 
                            key={index} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.15, ease: "easeOut" }}
                            className="relative"
                          >
                            <div className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${isCreation ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  log.status === 'Available' ? 'text-green-700 bg-green-100' : 
                                  log.status === 'Assigned' ? 'text-blue-700 bg-blue-100' : 
                                  log.status === 'Missing' ? 'text-orange-700 bg-orange-100' :
                                  log.status === 'Damaged' ? 'text-red-700 bg-red-100' :
                                  'text-yellow-700 bg-yellow-100'
                                }`}>
                                  {log.status}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                                {isCreation ? 'Asset Added to Inventory' : 'Asset Updated'}
                              </h4>
                              {log.assigned_to_employee_id ? (
                                <p className="text-sm text-slate-600 flex items-center gap-2">
                                  <ArrowRight size={14} className="text-slate-400" />
                                  Assigned to <span className="font-medium text-slate-900">{log.firstName} {log.lastName}</span>
                                </p>
                              ) : (
                                !isCreation && (
                                  <p className="text-sm text-slate-600 flex items-center gap-2">
                                    <ArrowRight size={14} className="text-slate-400" />
                                    Unassigned from employee
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. MacBook Pro M2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                    <input 
                      type="text" 
                      value={formData.serial_number}
                      onChange={e => setFormData({...formData, serial_number: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. C02X1234ABCD"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Available">Available</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            {(modalMode === 'add' || modalMode === 'edit') && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  form="asset-form"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssets;
