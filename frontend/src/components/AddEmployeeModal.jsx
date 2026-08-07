import React, { useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const initialFormState = {
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
  };

  const [formData, setFormData] = useState(initialFormState);

  const generateRandomPassword = () => {
    const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowers = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()';
    const all = uppers + lowers + numbers + specials;
    
    let pass = '';
    pass += uppers.charAt(Math.floor(Math.random() * uppers.length));
    pass += lowers.charAt(Math.floor(Math.random() * lowers.length));
    pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pass += specials.charAt(Math.floor(Math.random() * specials.length));
    
    for (let i = 0; i < 8; i++) {
      pass += all.charAt(Math.floor(Math.random() * all.length));
    }
    
    return pass.split('').sort(() => 0.5 - Math.random()).join('');
  };

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
      setFormData({ 
        ...initialFormState, 
        password: generateRandomPassword() 
      });
    } else {
      // Optional: clear form when closed
      setFormData(initialFormState);
      setError(null);
      setAvatarFile(null);
      setAvatarPreview(null);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let avatarUrl = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrlData.publicUrl;
      }

      const res = await api.post('/employees', {
        ...formData,
        salary: parseFloat(formData.salary),
        ...(avatarUrl && { avatar: avatarUrl })
      });
      setLoading(false);
      toast.success('Employee created successfully!');
      onSuccess();
      
      // Navigate to the edit page for the newly created employee
      if (res.data && res.data.id) {
        navigate(`/admin/employees/${res.data.id}/edit`);
      }
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden transform transition-transform duration-300">
        
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Add New Employee</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden group">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="text-slate-400" size={28} />
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-xs font-medium">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-2">Profile Picture (Optional)</p>
            </div>

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
                <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                <input required type="text" readOnly name="password" value={formData.password} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-100 text-slate-500 cursor-not-allowed outline-none transition-all" />
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
