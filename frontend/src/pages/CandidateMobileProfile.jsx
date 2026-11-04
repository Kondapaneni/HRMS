import React from 'react';
import { 
  Camera, 
  Save, 
  FileText, 
  UploadCloud, 
  User, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  Mail, 
  Briefcase, 
  Sparkles, 
  ExternalLink, 
  Trash2 
} from 'lucide-react';

const CandidateMobileProfile = ({
  formData, handleInputChange, handleSave, handleAvatarUpload, 
  isUploadingAvatar, isUploadingResume, handleFileUpload, 
  handleSetPrimaryResume, handleDeleteResume
}) => {
  return (
    <div className="space-y-4 pb-14 antialiased select-none font-sans md:hidden">
      {/* Header */}
      <section className="pt-1 pb-1">
        <div className="pt-0.5 flex items-center gap-4">
          {/* Avatar with Camera Button */}
          <div className="relative cursor-pointer shrink-0">
            <label className="cursor-pointer block relative">
              <div className="w-16 h-16 rounded-[16px] bg-[var(--brand-tint)] border border-[var(--line)] shadow-xs overflow-hidden text-xl font-bold text-[var(--brand-deep)] flex items-center justify-center relative">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Candidate Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{formData.firstName?.charAt(0) || 'C'}</span>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  </div>
                )}
              </div>

              {/* Camera Badge Button */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--ink)] text-white flex items-center justify-center border-2 border-[var(--surface)] shadow-xs transition-transform">
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
            <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-[var(--accent-pink-deep)]" />
              Candidate Credentials
            </p>
            <h2 className="text-xl font-semibold text-[var(--text)] tracking-tight truncate">
              {formData.firstName} {formData.lastName}
            </h2>
            <p className="text-xs font-medium text-[var(--muted)] truncate">
              {formData.currentTitle || 'Candidate Profile'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-4 px-0.5">
        
        {/* Personal Details Card */}
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--line)]">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Personal Information</h2>
              <p className="text-[10px] text-[var(--muted)]">Your verified contact profile</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">First Name</label>
                <input
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  readOnly
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 py-2 text-xs font-semibold text-[var(--muted)] outline-none cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Last Name</label>
                <input
                  type="text" 
                  name="lastName" 
                  value={formData.lastName} 
                  readOnly
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 py-2 text-xs font-semibold text-[var(--muted)] outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  readOnly
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full pl-11 pr-4 py-2 text-xs font-semibold text-[var(--muted)] outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full pl-11 pr-4 py-2 text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Address / Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleInputChange}
                  placeholder="City, State, Country"
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full pl-11 pr-4 py-2 text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Professional Details Card */}
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--line)]">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Professional Background</h2>
              <p className="text-[10px] text-[var(--muted)]">Experience and career role</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Current Job Title</label>
              <input
                type="text" 
                name="currentTitle" 
                value={formData.currentTitle} 
                onChange={handleInputChange}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 py-2 text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Years of Experience</label>
              <select
                name="experience" 
                value={formData.experience} 
                onChange={handleInputChange}
                className="w-full h-9 bg-[var(--surface-alt)] border border-[var(--line)] rounded-full px-4 text-xs font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none cursor-pointer"
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
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Attached Resumes</h2>
                <p className="text-[10px] text-[var(--muted)]">Manage up to 3 documents</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--surface-alt)] border border-[var(--line)] px-2.5 py-0.5 rounded-full">
              {formData.resumes.length} / 3
            </span>
          </div>

          <div className="space-y-3">
            {formData.resumes.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[var(--line)] p-6 flex flex-col items-center justify-center text-center text-[var(--muted)] bg-[var(--surface-alt)] space-y-1">
                <FileText className="h-7 w-7 text-[var(--muted)] opacity-60" />
                <p className="text-xs font-semibold text-[var(--text)]">No resumes uploaded yet</p>
                <p className="text-[10px] text-[var(--muted)]">Add your resume to apply for job openings.</p>
              </div>
            ) : (
              formData.resumes.map((resume, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-[14px] border transition-all ${
                    resume.isPrimary ? 'border-[var(--brand)]/30 bg-[var(--brand-tint)]/40' : 'border-[var(--line)] bg-[var(--surface-alt)]'
                  } space-y-2.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-[8px] bg-[var(--surface)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 border border-[var(--line)]">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text)] truncate">{resume.name}</p>
                        <a
                          href={resume.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-semibold text-[var(--brand-deep)] hover:underline inline-flex items-center gap-0.5 mt-0.5"
                        >
                          <span>Preview document</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handleDeleteResume(idx)} 
                      className="w-7 h-7 rounded-full text-[#D64550] hover:bg-[#FDE8EA] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Delete resume"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!resume.isPrimary ? (
                    <button 
                      type="button" 
                      onClick={() => handleSetPrimaryResume(idx)}
                      className="text-[10px] font-semibold text-[var(--brand-deep)] bg-[var(--surface)] border border-[var(--line)] rounded-full py-1.5 w-full hover:bg-[var(--line)]/50 transition-all cursor-pointer"
                    >
                      Set as Primary Resume
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-[#1F9D55] pt-0.5">
                      <CheckCircle2 size={12} />
                      <span>Primary Resume Active</span>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Upload Dropzone */}
            {formData.resumes.length < 3 && (
              <label className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full border-2 border-dashed ${
                formData.resumes.length >= 3 
                  ? 'border-[var(--line)] bg-[var(--surface-alt)] text-[var(--muted)] cursor-not-allowed' 
                  : 'border-[var(--brand)]/30 bg-[var(--brand-tint)]/30 text-[var(--brand-deep)] hover:bg-[var(--brand-tint)]/50 cursor-pointer'
              } transition-all text-xs font-semibold`}>
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
          className="w-full bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full py-3 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Profile Changes</span>
        </button>

      </form>
    </div>
  );
};

export default CandidateMobileProfile;
