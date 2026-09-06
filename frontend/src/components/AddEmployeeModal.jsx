import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, IndianRupee, KeyRound, Sparkles, User, Mail, Phone, Building, Briefcase, Calendar, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

  return createPortal(
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm font-editorial antialiased"
      style={{ fontFamily: "'Newsreader', Georgia, serif" }}
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10"
      >
        {/* Top 4-Color Google Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Staff Onboarding</span>
            </div>
            <h2 className="text-lg font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
              Add <span className="font-medium italic text-[#1a73e8]">New Employee</span>
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative w-22 h-22 rounded-full border-2 border-dashed border-[#dadce0] flex items-center justify-center bg-[#f8fafd] overflow-hidden group shadow-xs">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#5f6368]">
                    <Camera size={24} className="text-[#1a73e8] mb-1" />
                    <span className="text-[10px] text-[#5f6368]">Add Photo</span>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-xs font-semibold">Change</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <p className="text-[11px] text-[#5f6368] mt-1.5">Profile Photo (Optional)</p>
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">First Name *</label>
                <input 
                  required 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" 
                  placeholder="e.g. Gowtham Chowdary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Last Name *</label>
                <input 
                  required 
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" 
                  placeholder="e.g. Kondapaneni"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Email Address *</label>
                <input 
                  required 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" 
                  placeholder="name@gmail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Phone Number *</label>
                <input 
                  required 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" 
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Department *</label>
                <input 
                  required 
                  type="text" 
                  name="department" 
                  value={formData.department} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" 
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Position / Role *</label>
                <input 
                  required 
                  type="text" 
                  name="position" 
                  value={formData.position} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" 
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            {/* Branch & Join Date */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Assigned Branch *</label>
                <select 
                  required 
                  name="branch_id" 
                  value={formData.branch_id} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Joining Date *</label>
                <input 
                  required 
                  type="date" 
                  name="joinDate" 
                  value={formData.joinDate} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer" 
                />
              </div>
            </div>

            {/* Salary & Auto Password */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Monthly Salary (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6368] text-xs font-bold pointer-events-none">₹</span>
                  <input 
                    required 
                    type="number" 
                    step="1" 
                    name="salary" 
                    value={formData.salary} 
                    onChange={handleChange} 
                    className="w-full pl-7 pr-3.5 py-2 border border-[#dadce0] rounded-xl text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" 
                    placeholder="50000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Initial Password *</label>
                <input 
                  required 
                  type="text" 
                  readOnly 
                  name="password" 
                  value={formData.password} 
                  className="w-full px-3.5 py-2 border border-[#e0e3e7] rounded-xl text-xs bg-[#f8fafd] text-[#5f6368] cursor-not-allowed outline-none transition-all font-mono" 
                />
              </div>
            </div>

          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 text-xs font-semibold text-[#444746] bg-white border border-[#dadce0] rounded-full hover:bg-[#f1f3f4] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="add-employee-form" 
            disabled={loading} 
            className="px-6 py-2 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-full shadow-md shadow-[#4285F4]/25 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Add Employee'}
          </button>
        </div>

      </motion.div>
    </div>,
    document.body
  );
};

export default AddEmployeeModal;
