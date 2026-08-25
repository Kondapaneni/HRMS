import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  User, 
  Phone, 
  MapPin, 
  UserPlus, 
  Sparkles,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { capitalizeWords, validateAddLeadForm } from '../utils/loanValidations';
import { createLead } from '../services/loanServices';
import {
  TextField,
  PhoneField,
  TextareaField
} from '../components/forms';

const OriginationMobileLoanAddLead = () => {
  const navigate = useNavigate();
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
      queryClient.invalidateQueries({ queryKey: ['origination', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['origination', 'leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['leadsDashboard'] });
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
    <div className="space-y-4 pb-14">

      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
                Origination Workspace
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Add New Lead
            </h1>
            <p className="text-xs text-[#5f6368]">
              Register prospective applicant to pipeline
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/employee/loans/origination/leads')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3.5 py-2 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* 2. Form Container Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4.5">
        
        <div className="flex items-center gap-2 pb-3 border-b border-[#e0e3e7]">
          <div className="p-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Prospect Profile</h2>
            <p className="text-[10px] text-[#5f6368]">Enter contact details for field verification</p>
          </div>
        </div>

        <div className="space-y-4">
          <TextField
            name="name"
            label="Prospect Full Name"
            value={formData.name}
            onChange={handleNameChange}
            required
            placeholder="e.g. Rahul Sharma"
            error={errors.name}
            prefix={<User size={15} className="text-[#5f6368]" />}
          />

          <PhoneField
            name="phone"
            label="Mobile Number"
            value={formData.phone}
            onChange={handlePhoneChange}
            required
            placeholder="10-digit primary contact number"
            error={errors.phone}
            prefix={<Phone size={15} className="text-[#5f6368]" />}
          />

          <TextareaField
            name="address"
            label="Residential / Business Address"
            value={formData.address}
            onChange={handleAddressChange}
            required
            placeholder="Complete address including street, area, city, and pincode"
            rows={3}
            error={errors.address}
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#e0e3e7] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/employee/loans/origination/leads')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-5 py-2.5 transition-all shadow-2xs cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white px-6 py-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Lead...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save & Create Lead</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export default OriginationMobileLoanAddLead;
