import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { capitalizeWords, validateAddLeadForm } from '../utils/loanValidations';
import { createLead } from '../services/loanServices';
import { createSalesLead } from '../services/salesServices';
import { useQueryClient } from '@tanstack/react-query';
import {
  TextField,
  PhoneField,
  TextareaField
} from './forms';

const AddLeadSidebar = ({ isOpen, onClose, type = 'loan' }) => {
  const isSale = type === 'sale';
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val) => {
    setFormData((prev) => ({ ...prev, name: capitalizeWords(val) }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
  };

  const handlePhoneChange = (val) => {
    setFormData((prev) => ({ ...prev, phone: val }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
  };

  const handleAddressChange = (val) => {
    setFormData((prev) => ({ ...prev, address: capitalizeWords(val) }));
    if (errors.address) setErrors((prev) => ({ ...prev, address: null }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: ''
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateAddLeadForm(formData);

    if (!isValid) {
      setErrors(validationErrors);
      const firstErrKey = Object.keys(validationErrors)[0];
      toast.error(validationErrors[firstErrKey]);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSale) {
        await createSalesLead(formData);
        queryClient.invalidateQueries(['sales', 'leads']);
        queryClient.invalidateQueries(['sales', 'leads', 'list']);
        queryClient.invalidateQueries(['salesDashboard']);
        toast.success('Sales lead added successfully!');
      } else {
        await createLead(formData);
        queryClient.invalidateQueries(['origination', 'leads']);
        queryClient.invalidateQueries(['origination', 'leads', 'list']);
        queryClient.invalidateQueries(['leadsDashboard']);
        toast.success('Lead added successfully!');
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error(error.response?.data?.error || 'Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
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
              <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">New Prospect</span>
            </div>
            <h2 className="text-lg font-semibold text-[#1f1f1f]">Add New Lead</h2>
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
          <form id="add-lead-form" onSubmit={handleSubmit} className="space-y-4">
            <TextField
              name="name"
              label="Lead Name"
              value={formData.name}
              onChange={handleNameChange}
              required
              placeholder="e.g. Rahul Sharma"
              error={errors.name}
              prefix={<User size={15} className="text-[#5f6368]" />}
            />

            <PhoneField
              name="phone"
              label="Phone Number"
              value={formData.phone}
              onChange={handlePhoneChange}
              required
              placeholder="10-digit mobile number"
              error={errors.phone}
              prefix={<Phone size={15} className="text-[#5f6368]" />}
            />

            <TextareaField
              name="address"
              label="Address"
              value={formData.address}
              onChange={handleAddressChange}
              required
              placeholder="Enter full address"
              rows={3}
              error={errors.address}
            />
          </form>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-lead-form"
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-full text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95 ${
              isSale
                ? 'bg-[#137333] hover:bg-[#0d5926]'
                : 'bg-[#1a73e8] hover:bg-[#1557b0]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Save Lead</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default AddLeadSidebar;
