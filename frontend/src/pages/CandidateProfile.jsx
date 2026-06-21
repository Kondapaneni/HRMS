import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, MapPin, Briefcase, UploadCloud, Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const CandidateProfile = () => {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    phone: '',
    address: '',
    currentTitle: '',
    experience: '',
    bio: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Profile updated successfully!');
    }, 1000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
      toast.success('Resume uploaded successfully!');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal information and resume to speed up applications.</p>
        </motion.div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Personal Information Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm border border-white">
              <User size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-500 font-medium bg-slate-100 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Address / Location</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="City, State, Country"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Professional Details Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-white">
              <Briefcase size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Professional Details</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Current Job Title</label>
              <input
                type="text"
                name="currentTitle"
                value={formData.currentTitle}
                onChange={handleInputChange}
                placeholder="e.g. Software Engineer"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Years of Experience</label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white appearance-none cursor-pointer"
              >
                <option value="" disabled>Select experience level</option>
                <option value="0-1">0-1 years (Entry Level)</option>
                <option value="1-3">1-3 years (Junior)</option>
                <option value="3-5">3-5 years (Mid-Level)</option>
                <option value="5-10">5-10 years (Senior)</option>
                <option value="10+">10+ years (Lead/Principal)</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Professional Summary</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                placeholder="A brief summary of your skills and career goals..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white resize-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Resume Upload Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-white">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Resume / CV</h2>
          </div>
          
          <div className="p-6">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100/50 transition-colors relative">
              <input 
                type="file" 
                accept=".pdf,.doc,.docx" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-blue-500 mb-4">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Click to upload or drag and drop</h3>
              <p className="text-sm text-slate-500 mb-4">SVG, PNG, JPG or GIF (max. 800x400px)</p>
              
              {uploadedFileName && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-medium text-sm">
                  <CheckCircle2 size={16} />
                  {uploadedFileName}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="flex justify-end pt-4 pb-12">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={20} />
                Save Profile Updates
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CandidateProfile;
