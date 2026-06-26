import React from 'react';
import { Camera, Save, FileText, UploadCloud, User, X, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CandidateMobileProfile = ({
  formData, handleInputChange, handleSave, handleAvatarUpload, 
  isUploadingAvatar, isUploadingResume, handleFileUpload, 
  handleSetPrimaryResume, handleDeleteResume
}) => {
  return (
    <div className="space-y-6 pb-2 md:hidden">
      {/* Hero Section with Animated Motion Graphics (Orange/Amber Theme) */}
      <section className="-mx-4 -mt-6 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-orange-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-amber-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-rose-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex flex-col items-center justify-center pt-4">
          <div className="relative group cursor-pointer mb-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 border-2 border-white/50 shadow-md overflow-hidden text-2xl font-medium text-slate-600 relative">
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span>{formData.firstName?.charAt(0) || 'C'}</span>
              )}
              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white cursor-pointer transition-all">
                {isUploadingAvatar ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Camera className="h-5 w-5 opacity-80" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                  </>
                )}
              </label>
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">{formData.firstName} {formData.lastName}</h2>
          <p className="text-sm font-medium text-amber-100 drop-shadow-sm opacity-90">{formData.currentTitle || 'Candidate'}</p>
        </div>
      </section>

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6 px-1 pb-6 relative z-20 -mt-10">
        
        {/* Personal Details */}
        <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Personal Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">First Name</label>
                <input
                  type="text" name="firstName" value={formData.firstName} readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Last Name</label>
                <input
                  type="text" name="lastName" value={formData.lastName} readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
              <input
                type="email" name="email" value={formData.email} readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
              <input
                type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Location</label>
              <input
                type="text" name="address" value={formData.address} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="City, State, Country"
              />
            </div>
          </div>
        </section>

        {/* Professional Details */}
        <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Professional Profile</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Title</label>
              <input
                type="text" name="currentTitle" value={formData.currentTitle} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="Software Engineer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Years of Experience</label>
              <select
                name="experience" value={formData.experience} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
              >
                <option value="">Select experience level</option>
                <option value="Fresher">Fresher (0 years)</option>
                <option value="0-2 years">0-2 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="5-8 years">5-8 years</option>
                <option value="8+ years">8+ years</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Professional Bio</label>
              <textarea
                name="bio" value={formData.bio} onChange={handleInputChange} rows="4"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                placeholder="Tell us about your skills and goals..."
              />
            </div>
          </div>
        </section>

        {/* Resume Management */}
        <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Resumes</h2>
          </div>
          <div className="p-5 space-y-4">
            {formData.resumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50">
                <FileText className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium">No resumes uploaded.</p>
                <p className="text-[11px] text-slate-400">Add a resume to easily apply to jobs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.resumes.map((resume, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${resume.isPrimary ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-slate-50'} flex flex-col gap-3 relative`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${resume.isPrimary ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-sm font-medium text-slate-900 truncate">{resume.name}</p>
                        {resume.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 mt-1">
                            <CheckCircle2 className="w-3 h-3" /> Primary
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => handleDeleteResume(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {!resume.isPrimary && (
                      <button 
                        type="button" 
                        onClick={() => handleSetPrimaryResume(idx)}
                        className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-white border border-orange-200 rounded-lg py-1.5 w-full active:scale-95 transition-all"
                      >
                        Set as Primary
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <label className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed ${formData.resumes.length >= 3 ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-orange-200 bg-orange-50/50 text-orange-600 hover:bg-orange-50 cursor-pointer'} transition-all text-sm font-medium`}>
                {isUploadingResume ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    {formData.resumes.length >= 3 ? 'Max 3 Resumes Reached' : 'Upload Resume'}
                    <input
                      type="file" accept=".pdf,.doc,.docx" className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploadingResume || formData.resumes.length >= 3}
                    />
                  </>
                )}
              </label>
            </div>
          </div>
        </section>

        {/* Save Button floating or at bottom */}
        <button 
          type="submit"
          className="w-full bg-slate-900 text-white rounded-[1.5rem] py-4 text-sm font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>

      </form>
    </div>
  );
};

export default CandidateMobileProfile;
