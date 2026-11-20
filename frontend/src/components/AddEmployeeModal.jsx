import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useBranchDirectory } from '../query/useBranchDirectory.js';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { data: branches = [], isLoading: branchesLoading, isError: branchesError } = useBranchDirectory(isOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
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

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormState);
    } else {
      setFormData(initialFormState);
      setError(null);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [isOpen]);

  // Set a default once per opening, without resetting a user's selection
  // when a stale reference list revalidates in the background.
  useEffect(() => {
    if (isOpen && branches.length) {
      setFormData(previous => previous.branch_id
        ? previous : { ...previous, branch_id: branches[0].id });
    }
  }, [isOpen, branches]);


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
    // A disabled required select is excluded from native form validation.
    // Never create an employee without a current authorized branch choice.
    if (branchesLoading || branchesError ||
        !branches.some(branch => String(branch.id) === String(formData.branch_id))) {
      setError('Choose a valid branch after the branch list finishes loading.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let avatarUrl = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path);

        avatarUrl = publicUrlData.publicUrl;
      }

      const res = await api.post('/employees', {
        ...formData,
        salary: parseFloat(formData.salary),
        ...(avatarUrl && { avatar: avatarUrl })
      });
      setLoading(false);
      toast.success('Employee created. Secure account setup email queued.');
      onSuccess();
      
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
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs antialiased font-sans"
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-[var(--surface)] shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">Staff Onboarding</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
              Add New Employee
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-[var(--surface)]">
          <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Avatar Upload (Rounded Square per Ronas IT Guidelines) */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative w-20 h-20 rounded-[18px] border-2 border-dashed border-[var(--line)] flex items-center justify-center bg-[var(--surface-alt)] overflow-hidden group shadow-xs">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[var(--muted)]">
                    <Camera size={22} className="text-[var(--brand-deep)] mb-1" />
                    <span className="text-[10px] text-[var(--muted)] font-medium">Add Photo</span>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[18px]">
                  <span className="text-white text-xs font-semibold">Change</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1.5">Profile Photo (Optional)</p>
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">First Name *</label>
                <input 
                  required 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all placeholder:text-[var(--muted)]" 
                  placeholder="e.g. Gowtham"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Last Name *</label>
                <input 
                  required 
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all placeholder:text-[var(--muted)]" 
                  placeholder="e.g. Kondapaneni"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Email Address *</label>
                <input 
                  required 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all placeholder:text-[var(--muted)]" 
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Phone Number *</label>
                <input 
                  required 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all placeholder:text-[var(--muted)]" 
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Department *</label>
                <input 
                  required 
                  type="text" 
                  name="department" 
                  value={formData.department} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all placeholder:text-[var(--muted)]" 
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Position / Role *</label>
                <input 
                  required 
                  type="text" 
                  name="position" 
                  value={formData.position} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all placeholder:text-[var(--muted)]" 
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            {/* Branch & Join Date */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Assigned Branch *</label>
                <select 
                  required 
                  disabled={branchesLoading || branchesError || branches.length === 0}
                  name="branch_id" 
                  value={formData.branch_id} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {branchesError && <p role="alert" className="mt-1 text-xs text-red-600">Unable to load branches. Reopen the form to retry.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Joining Date *</label>
                <input 
                  required 
                  type="date" 
                  name="joinDate" 
                  value={formData.joinDate} 
                  onChange={handleChange} 
                  className="w-full px-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all cursor-pointer" 
                />
              </div>
            </div>

            {/* Salary & secure onboarding invitation */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Monthly Salary (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs font-semibold pointer-events-none">₹</span>
                  <input 
                    required 
                    type="number" 
                    step="1" 
                    name="salary" 
                    value={formData.salary} 
                    onChange={handleChange} 
                    className="w-full pl-7 pr-3.5 py-2 border border-[var(--line)] rounded-[12px] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] outline-none transition-all placeholder:text-[var(--muted)]" 
                    placeholder="50000"
                  />
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                The employee will receive a one-time password setup invitation,
                valid for one hour. No initial password is generated or displayed to HR.
              </p>
            </div>

          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="add-employee-form" 
            disabled={loading || branchesLoading || branchesError || !branches.some(branch => String(branch.id) === String(formData.branch_id))} 
            className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
