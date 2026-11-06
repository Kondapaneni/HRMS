import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  User, 
  Phone, 
  MapPin, 
  UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { capitalizeWords, validateAddLeadForm } from '../utils/loanValidations';
import { createLead } from '../services/loanServices';

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
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">

      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Add New <span className="text-[var(--brand-deep)]">Lead</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate('/employee/loans/origination/leads')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            Register Prospective Applicant
          </p>
        </div>
      </section>

      {/* Form Container Card */}
      <div className="relative z-20 space-y-4">
        <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs space-y-4">
        
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--line)]">
            <div className="p-1.5 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">Prospect Profile</h2>
              <p className="text-[10px] text-[var(--muted)]">Enter Contact Details For Field Verification</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">
                Prospect Full Name <span className="text-[var(--badge-danger-text)]">*</span>
              </label>
              <div className="relative flex items-center">
                <User size={15} className="text-[var(--icon-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className={`w-full bg-[var(--surface-alt)] border ${
                    errors.name ? 'border-[var(--badge-danger-text)] focus:ring-[var(--badge-danger-text)]/20' : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                  } rounded-[12px] pl-10 pr-4 py-2.5 text-xs font-normal text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:ring-2 outline-none transition-all`}
                />
              </div>
              {errors.name && <p className="text-[10px] text-[var(--badge-danger-text)] font-medium pl-3">{errors.name}</p>}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">
                Mobile Number <span className="text-[var(--badge-danger-text)]">*</span>
              </label>
              <div className="relative flex items-center">
                <Phone size={15} className="text-[var(--icon-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="10-digit primary contact number"
                  required
                  className={`w-full bg-[var(--surface-alt)] border ${
                    errors.phone ? 'border-[var(--badge-danger-text)] focus:ring-[var(--badge-danger-text)]/20' : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                  } rounded-[12px] pl-10 pr-4 py-2.5 text-xs font-normal text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:ring-2 outline-none transition-all`}
                />
              </div>
              {errors.phone && <p className="text-[10px] text-[var(--badge-danger-text)] font-medium pl-3">{errors.phone}</p>}
            </div>

            {/* Residential / Business Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">
                Residential / Business Address <span className="text-[var(--badge-danger-text)]">*</span>
              </label>
              <div className="relative">
                <MapPin size={15} className="text-[var(--icon-muted)] absolute left-3.5 top-3 pointer-events-none z-10" />
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Complete address including street, area, city, and pincode"
                  required
                  className={`w-full bg-[var(--surface-alt)] border ${
                    errors.address ? 'border-[var(--badge-danger-text)] focus:ring-[var(--badge-danger-text)]/20' : 'border-[var(--line)] focus:border-[var(--brand)] focus:ring-[var(--brand)]/20'
                  } rounded-[12px] pl-10 pr-4 py-2.5 text-xs font-normal text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:ring-2 outline-none transition-all resize-none`}
                />
              </div>
              {errors.address && <p className="text-[10px] text-[var(--badge-danger-text)] font-medium pl-3">{errors.address}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[var(--line)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/employee/loans/origination/leads')}
              className="h-9 px-4 inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
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

    </div>
  );
};

export default OriginationMobileLoanAddLead;