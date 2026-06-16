import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const { session } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    position: '',
    branch_id: '',
    joinDate: '',
    salary: '',
    status: 'Active',
    manager_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches || []);
      if (res.data.branches && res.data.branches.length > 0) {
        setFormData(prev => ({ ...prev, branch_id: res.data.branches[0].id }));
      }
    } catch (e) {
      console.error("Failed to fetch branches", e);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/employees', {
        ...formData,
        salary: parseFloat(formData.salary)
      });
      setLoading(false);
      toast.success('Employee created successfully!');
      onSuccess();
    } catch (err) {
      console.error(err);
      const errMessage = err.response?.data?.error || err.message || "Failed to create employee.";
      setError(errMessage);
      toast.error(errMessage);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add New Employee</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
                <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
                <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone *</label>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Department *</label>
                <input required type="text" name="department" value={formData.department} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Position *</label>
                <input required type="text" name="position" value={formData.position} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Branch *</label>
                <select required name="branch_id" value={formData.branch_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-white cursor-pointer">
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Join Date *</label>
                <input required type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Salary *</label>
                <input required type="number" step="0.01" name="salary" value={formData.salary} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status *</label>
                <select required name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-white cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Manager ID (Optional)</label>
                <input type="text" name="manager_id" value={formData.manager_id} onChange={handleChange} placeholder="UUID" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" />
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit" form="add-employee-form" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
            {loading ? 'Saving...' : 'Add Employee'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddEmployeeModal;
