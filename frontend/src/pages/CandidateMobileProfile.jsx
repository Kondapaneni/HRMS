import React from 'react';
import { 
  Camera, 
  Save, 
  FileText, 
  UploadCloud, 
  User, 
  X, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  Mail, 
  Briefcase, 
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

const CandidateMobileProfile = ({
  formData, handleInputChange, handleSave, handleAvatarUpload, 
  isUploadingAvatar, isUploadingResume, handleFileUpload, 
  handleSetPrimaryResume, handleDeleteResume
}) => {
  return (
    <div className="space-y-4 pb-12 md:hidden">
      {/* 1. Hero Section with Animated Motion Graphics (Soft Emerald Theme) */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Soft Glowing Emerald, Teal, and Cyan Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2 flex items-center gap-4 pt-1">
          {/* Avatar with Camera Button Badge */}
          <div className="relative cursor-pointer shrink-0">
            <label className="cursor-pointer block relative">
              <div className="w-16 h-16 rounded-full bg-[#e6f4ea] border-2 border-white shadow-md overflow-hidden text-xl font-bold text-[#137333] flex items-center justify-center relative">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Candidate Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{formData.firstName?.charAt(0) || 'C'}</span>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  </div>
                )}
              </div>

              {/* Bottom-right Camera Badge Button */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#137333] hover:bg-[#0f5b28] active:scale-95 text-white flex items-center justify-center border-2 border-white shadow-md transition-transform">
                <Camera className="h-3 w-3" />
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
              />
            </label>
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest drop-shadow-md flex items-center gap-1">
              <Sparkles size={11} className="text-emerald-300" />
              Candidate Credentials
            </p>
            <h2 className="text-xl font-black text-white tracking-tight drop-shadow-sm truncate">
              {formData.firstName} {formData.lastName}
            </h2>
            <p className="text-xs font-medium text-slate-100 drop-shadow-sm opacity-90 truncate">
              {formData.currentTitle || 'Candidate Profile'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-4 px-0.5 relative z-20 -mt-8">
        
        {/* Personal Details Card */}
        <section className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1f3f4]">
            <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1f1f1f]">Personal Information</h2>
              <p className="text-[10px] text-[#5f6368]">Your verified contact profile</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">First Name</label>
                <input
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  readOnly
                  className="w-full bg-[#f1f3f4] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#5f6368] outline-none cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Last Name</label>
                <input
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  readOnly
                  className="w-full bg-[#f1f3f4] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#5f6368] outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                <input
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  readOnly
                  className="w-full bg-[#f1f3f4] border border-[#dadce0] rounded-full pl-11 pr-4 py-2.5 text-xs font-semibold text-[#5f6368] outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                <input
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full pl-11 pr-4 py-2.5 text-xs text-[#1f1f1f] focus:bg-white focus:border-[#137333] focus:ring-2 focus:ring-[#137333]/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Address / Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                <input
                  type="text" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleInputChange}
                  placeholder="City, State, Country"
                  className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full pl-11 pr-4 py-2.5 text-xs text-[#1f1f1f] focus:bg-white focus:border-[#137333] focus:ring-2 focus:ring-[#137333]/20 transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Professional Details Card */}
        <section className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1f3f4]">
            <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1f1f1f]">Professional Background</h2>
              <p className="text-[10px] text-[#5f6368]">Experience and career role</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Current Job Title</label>
              <input
                type="text" 
                name="currentTitle" 
                value={formData.currentTitle} 
                onChange={handleInputChange}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs text-[#1f1f1f] focus:bg-white focus:border-[#137333] focus:ring-2 focus:ring-[#137333]/20 transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Years of Experience</label>
              <select
                name="experience" 
                value={formData.experience} 
                onChange={handleInputChange}
                className="w-full bg-[#f8fafd] border border-[#dadce0] rounded-full px-4 py-2.5 text-xs font-semibold text-[#1f1f1f] focus:bg-white focus:border-[#137333] focus:ring-2 focus:ring-[#137333]/20 transition-all outline-none cursor-pointer"
              >
                <option value="">Select experience level</option>
                <option value="0-1">0-1 years (Entry Level)</option>
                <option value="1-3">1-3 years (Junior)</option>
                <option value="3-5">3-5 years (Mid-Level)</option>
                <option value="5-10">5-10 years (Senior)</option>
                <option value="10+">10+ years (Lead / Principal)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Resumes Locker Card */}
        <section className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f3f4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#f3e8fd] text-[#8430ce] flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1f1f1f]">Attached Resumes</h2>
                <p className="text-[10px] text-[#5f6368]">Manage up to 3 documents</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#5f6368] bg-[#f1f3f4] border border-[#dadce0] px-2 py-0.5 rounded-full">
              {formData.resumes.length} / 3
            </span>
          </div>

          <div className="space-y-3">
            {formData.resumes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dadce0] p-6 flex flex-col items-center justify-center text-center text-[#5f6368] bg-[#f8fafd] space-y-1">
                <FileText className="h-7 w-7 text-[#5f6368] opacity-60" />
                <p className="text-xs font-bold text-[#1f1f1f]">No resumes uploaded yet</p>
                <p className="text-[10px] text-[#5f6368]">Add your resume to apply for job openings.</p>
              </div>
            ) : (
              formData.resumes.map((resume, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-2xl border transition-all ${
                    resume.isPrimary ? 'border-[#ceead6] bg-[#e6f4ea]/40 shadow-2xs' : 'border-[#e0e3e7] bg-[#f8fafd]'
                  } space-y-2.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        resume.isPrimary ? 'bg-white text-[#137333] border-[#ceead6]' : 'bg-white text-[#5f6368] border-[#dadce0]'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1f1f1f] truncate">{resume.name}</p>
                        <a
                          href={resume.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-semibold text-[#1a73e8] hover:underline inline-flex items-center gap-0.5 mt-0.5"
                        >
                          <span>Preview document</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handleDeleteResume(idx)} 
                      className="w-7 h-7 rounded-full text-[#c5221f] hover:bg-[#fce8e6] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Delete resume"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!resume.isPrimary ? (
                    <button 
                      type="button" 
                      onClick={() => handleSetPrimaryResume(idx)}
                      className="text-[10px] font-bold text-[#137333] bg-white border border-[#ceead6] rounded-full py-1.5 w-full hover:bg-[#e6f4ea] transition-all cursor-pointer shadow-2xs"
                    >
                      Set as Primary Resume
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#137333] pt-0.5">
                      <CheckCircle2 size={12} />
                      <span>Primary Resume Active</span>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Upload Dropzone */}
            {formData.resumes.length < 3 && (
              <label className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed ${
                formData.resumes.length >= 3 
                  ? 'border-[#dadce0] bg-[#f1f3f4] text-[#5f6368] cursor-not-allowed' 
                  : 'border-[#ceead6] bg-[#e6f4ea]/30 text-[#137333] hover:bg-[#e6f4ea]/60 cursor-pointer'
              } transition-all text-xs font-bold shadow-2xs`}>
                {isUploadingResume ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    <span>Uploading Resume...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Resume (PDF, DOC)</span>
                    <input
                      type="file" 
                      accept=".pdf,.doc,.docx" 
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploadingResume || formData.resumes.length >= 3}
                    />
                  </>
                )}
              </label>
            )}
          </div>
        </section>

        {/* Save Button */}
        <button 
          type="submit"
          className="w-full bg-[#137333] hover:bg-[#0f5b28] active:bg-[#0b4820] text-white rounded-full py-3.5 text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Profile Changes</span>
        </button>

      </form>
    </div>
  );
};

export default CandidateMobileProfile;
