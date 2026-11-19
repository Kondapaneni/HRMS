import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { capitalizeWords, validateAddLeadForm } from '../utils/loanValidations';
import { createLead } from '../services/loanServices';
import { createSalesLead } from '../services/salesServices';
import { useRefreshControl } from '../state/remote.js';
import {
  TextField,
  PhoneField,
  TextareaField
} from './forms';

const AddLeadSidebar = ({ isOpen, onClose, type = 'loan' }) => {
  const isSale = type === 'sale';
  const refreshControl = useRefreshControl();

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
        refreshControl.refresh({ scope: ['sales', 'leads'] });
        refreshControl.refresh({ scope: ['sales', 'leads', 'list'] });
        refreshControl.refresh({ scope: ['salesDashboard'] });
        toast.success('Sales lead added successfully!');
      } else {
        await createLead(formData);
        refreshControl.refresh({ scope: ['origination', 'leads'] });
        refreshControl.refresh({ scope: ['origination', 'leads', 'list'] });
        refreshControl.refresh({ scope: ['leadsDashboard'] });
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
        className="bg-[var(--surface)] text-[var(--text)] shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface)] shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">New Prospect</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">Add New Lead</h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
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
              prefix={<User size={15} className="text-[var(--muted)]" />}
            />

            <PhoneField
              name="phone"
              label="Phone Number"
              value={formData.phone}
              onChange={handlePhoneChange}
              required
              placeholder="10-digit mobile number"
              error={errors.phone}
              prefix={<Phone size={15} className="text-[var(--muted)]" />}
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
            form="add-lead-form"
            disabled={isSubmitting}
            className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Lead</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default AddLeadSidebar;
