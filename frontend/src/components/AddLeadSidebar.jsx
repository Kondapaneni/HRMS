import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin } from 'lucide-react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add New Lead</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-4">
                <TextField
                  name="name"
                  label="Lead Name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  placeholder="e.g. Rahul Sharma"
                  error={errors.name}
                  prefix={<User size={16} className="text-slate-400" />}
                />

                <PhoneField
                  name="phone"
                  label="Phone Number"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="10-digit mobile number"
                  error={errors.phone}
                  prefix={<Phone size={16} className="text-slate-400" />}
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

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium text-white h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50 ${
                      isSale
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Lead'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddLeadSidebar;
