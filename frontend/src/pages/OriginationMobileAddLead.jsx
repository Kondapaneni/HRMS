import React, { useState } from 'react';
import { ArrowLeft, Loader2, Save, User, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { capitalizeWords, validateLeadPhone } from '../utils/loanValidations';
import { createLead } from '../services/loanServices';

const OriginationMobileAddLead = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    loan_type: 'Personal Loan'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name' || name === 'address') {
      value = capitalizeWords(value);
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address || !formData.loan_type) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!validateLeadPhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit Indian phone number (starting with 6-9)');
      return;
    }

    try {
      setIsSubmitting(true);
      await createLead(formData);
      toast.success('Lead added successfully!');
      // Navigate back to leads list
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
        
        <div className="bg-white p-5 rounded-[24px] shadow-lg border border-slate-100/50 space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Lead Name *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Phone Number *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Phone size={18} className="text-slate-400" />
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Loan Type *</label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="loan_type"
                  value="Personal Loan"
                  checked={formData.loan_type === 'Personal Loan'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-slate-700 font-medium">Personal Loan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="loan_type"
                  value="Business Loan"
                  checked={formData.loan_type === 'Business Loan'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-slate-700 font-medium">Business Loan</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Address *</label>
            <div className="relative">
              <div className="absolute top-3.5 left-0 pl-3.5 pointer-events-none">
                <MapPin size={18} className="text-slate-400" />
              </div>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                placeholder="Enter complete address"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default OriginationMobileAddLead;
