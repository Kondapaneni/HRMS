import React, { useState } from 'react';
import { ArrowLeft, Loader2, Save, User, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { capitalizeWords, validateAddLeadForm } from '../utils/loanValidations';
import { createLead } from '../services/loanServices';
import {
  TextField,
  PhoneField,
  TextareaField,
  RadioGroup
} from '../components/forms';

const OriginationMobileAddLead = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    loan_type: 'Personal Loan'
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

  const handleLoanTypeChange = (val) => {
    setFormData((prev) => ({ ...prev, loan_type: val }));
    if (errors.loan_type) setErrors((prev) => ({ ...prev, loan_type: null }));
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
      await createLead(formData);
      toast.success('Lead added successfully!');
      navigate('/employee/loans/origination/leads');
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error(error.response?.data?.error || 'Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-8">
      {/* Animated Hero Header */}
      <div className="relative pt-12 pb-24 px-6 overflow-hidden rounded-b-[40px] shadow-md bg-slate-900">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between px-2">
          <button type="button" onClick={() => navigate('/employee/loans/origination/leads')} className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">Origination Module</p>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">Add New Lead</h2>
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg disabled:opacity-50 transition-transform active:scale-95">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="space-y-6 relative z-20 -mt-12 mx-4">
        
        <div className="bg-white p-5 rounded-[24px] shadow-lg border border-slate-100/50 space-y-4">
          
          <TextField
            name="name"
            label="Lead Name"
            value={formData.name}
            onChange={handleNameChange}
            required
            placeholder="e.g. John Doe"
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

          <RadioGroup
            name="loan_type"
            label="Loan Type"
            value={formData.loan_type}
            onChange={handleLoanTypeChange}
            required
            error={errors.loan_type}
            options={[
              { label: 'Personal Loan', value: 'Personal Loan' },
              { label: 'Business Loan', value: 'Business Loan' },
              { label: 'Home Loan', value: 'Home Loan' }
            ]}
            direction="horizontal"
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

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/employee/loans/origination/leads')}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50 gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Lead'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OriginationMobileAddLead;
