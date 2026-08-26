import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  User, 
  Phone, 
  MapPin, 
  UserPlus, 
  ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { capitalizeWords, validateAddLeadForm } from '../utils/loanValidations';
import { createSalesLead } from '../services/salesServices';

const OriginationMobileSaleAddLead = () => {
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
    if (e && e.preventDefault) e.preventDefault();
    
    const { isValid, errors: validationErrors } = validateAddLeadForm(formData);

    if (!isValid) {
      setErrors(validationErrors);
      const firstErrKey = Object.keys(validationErrors)[0];
      toast.error(validationErrors[firstErrKey]);
      return;
    }

    try {
      setIsSubmitting(true);
      await createSalesLead(formData);
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
      toast.success('Lead added successfully!');
      navigate('/employee/sales/origination/leads');
    } catch (error) {
      console.error('Error adding sales lead:', error);
      toast.error(error.response?.data?.error || 'Failed to add sales lead');
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
              Register prospective client to sales pipeline
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/employee/sales/origination/leads')}
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
            <p className="text-[10px] text-[#5f6368]">Enter contact details for sales pipeline registration</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
              Prospect Full Name <span className="text-[#d93025]">*</span>
            </label>
            <div className="relative flex items-center">
              <User size={16} className="text-[#80868b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className={`w-full bg-[#f8fafd] border ${
                  errors.name ? 'border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/20' : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-[#1a73e8]/20'
                } rounded-full pl-10 pr-4 py-3 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] focus:bg-white focus:ring-2 outline-none transition-all`}
              />
            </div>
            {errors.name && <p className="text-[10px] text-[#d93025] font-medium pl-3">{errors.name}</p>}
          </div>

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
              Mobile Number <span className="text-[#d93025]">*</span>
            </label>
            <div className="relative flex items-center">
              <Phone size={16} className="text-[#80868b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="tel"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="10-digit primary contact number"
                required
                className={`w-full bg-[#f8fafd] border ${
                  errors.phone ? 'border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/20' : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-[#1a73e8]/20'
                } rounded-full pl-10 pr-4 py-3 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] focus:bg-white focus:ring-2 outline-none transition-all`}
              />
            </div>
            {errors.phone && <p className="text-[10px] text-[#d93025] font-medium pl-3">{errors.phone}</p>}
          </div>

          {/* Residential / Business Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block">
              Residential / Business Address <span className="text-[#d93025]">*</span>
            </label>
            <div className="relative">
              <MapPin size={16} className="text-[#80868b] absolute left-3.5 top-3.5 pointer-events-none z-10" />
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Complete address including street, area, city, and pincode"
                required
                className={`w-full bg-[#f8fafd] border ${
                  errors.address ? 'border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/20' : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-[#1a73e8]/20'
                } rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-[#1f1f1f] placeholder:text-[#80868b] focus:bg-white focus:ring-2 outline-none transition-all resize-none`}
              />
            </div>
            {errors.address && <p className="text-[10px] text-[#d93025] font-medium pl-3">{errors.address}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#e0e3e7] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/employee/sales/origination/leads')}
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

export default OriginationMobileSaleAddLead;
