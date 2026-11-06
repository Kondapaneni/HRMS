import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import {
  User, Mail, Phone, MapPin, Briefcase, CalendarDays, Building2,
  Shield, CreditCard, Heart, HeartHandshake, Globe, Clock3, Laptop,
  Calendar, Clock, UserCheck, Users, Camera, ChevronRight, FileText,
  X, Edit2, Sparkles, Building, CheckCircle2, AlertCircle,
  Download, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { isNativeApp, isIOS, getAssetUrl } from '../api/axios';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const controls = useDragControls();

  useEffect(() => {
    if (activeSection) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [activeSection]);

  const { data: profileResponse, isLoading: loading } = useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: async () => {
      const res = await api.get('/employee/profile');
      return res.data;
    },
    onError: () => toast.error('Failed to load profile data.'),
  });

  const profileData = profileResponse?.profile || null;
  const teamData = profileResponse?.team || null;
  const assetsData = profileResponse?.assets || [];

  const {
    firstName = '', lastName = '', email = '', phone = '', address = '', position = '', department = '', branch = '', branch_name = '',
    employeeId = '', dateOfBirth = '', bloodGroup = '', gender = '', maritalStatus = '', nationality = '',
    joinDate = '', workEmail = '', panNumber = '', employmentType = '', noticePeriod = '', shiftTime = '',
    workMode = '', weekOff = '', emergencyContact = '', emergencyPhone = '', avatar = '', timeline = ''
  } = profileData || {};

  const handleEditClick = () => {
    navigate('/employee/profile/edit');
  };

  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Employee';
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  const formatEnum = (val) => {
    if (!val) return 'Not set';
    return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (val) => {
    if (!val) return 'Not set';
    return new Date(val).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId || 'avatar'}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      if (avatar) {
        const parts = avatar.split('/Avatar/');
        if (parts.length > 1) {
          const oldStoragePath = parts[1];
          await supabase.storage.from('avatars').remove([oldStoragePath]);
        }
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const avatarUrl = window.location.origin + "/Avatar/" + fileName;
      await api.post('/employee/profile/avatar', { avatar: avatarUrl });

      toast.success('Profile photo updated successfully!');
      queryClient.invalidateQueries(['employee', 'profile']);
      if (fetchProfile) await fetchProfile();
    } catch (error) {
      toast.error(error.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const sections = [
    { id: 'personal', label: 'Personal Details', icon: User, color: 'text-[var(--brand-deep)]', bg: 'bg-[var(--brand-tint)]' },
    { id: 'work', label: 'Work Information', icon: Briefcase, color: 'text-[var(--accent-pink-deep)]', bg: 'bg-[var(--accent-pink-tint)]' },
    { id: 'shift', label: 'Shift & Working Hours', icon: Clock3, color: 'text-[var(--status-warning-text)]', bg: 'bg-[var(--status-warning-bg)]' },
    { id: 'emergency', label: 'Emergency Contact', icon: Shield, color: 'text-[var(--status-danger-text)]', bg: 'bg-[var(--status-danger-bg)]' },
    { id: 'my-team', label: 'My Team & Manager', icon: Users, color: 'text-[var(--status-success-text)]', bg: 'bg-[var(--status-success-bg)]' },
    { id: 'assets', label: 'Assigned Assets', icon: Laptop, color: 'text-[var(--brand-deep)]', bg: 'bg-[var(--brand-tint)]' },
    { id: 'timeline', label: 'Career Timeline', icon: Clock, color: 'text-[var(--text-2)]', bg: 'bg-[var(--surface-alt)]' }
  ];

  const DetailItem = ({ icon: Icon, label, value }) => {
    const currentSection = sections.find(s => s.id === activeSection);
    const iconColor = currentSection?.color || 'text-[var(--brand-deep)]';
    const iconBg = currentSection?.bg || 'bg-[var(--brand-tint)]';

    return (
      <div className="flex items-center gap-3 p-3 bg-[var(--surface-alt)] rounded-[14px] border border-[var(--line)]">
        <div className={`w-9 h-9 rounded-[10px] ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">{label}</p>
          <p className="text-xs font-semibold text-[var(--text)] break-words mt-0.5">
            {value || <span className="text-[var(--muted)] font-normal italic">Not provided</span>}
          </p>
        </div>
      </div>
    );
  };

  const TeamMemberCard = ({ employee }) => {
    if (!employee) return null;
    const initial = `${(employee.firstName || '').charAt(0)}${(employee.lastName || '').charAt(0)}`.toUpperCase() || 'U';
    return (
      <div className="flex items-center gap-3 p-3 bg-[var(--surface-alt)] rounded-[14px] border border-[var(--line)]">
        <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] flex items-center justify-center shrink-0 overflow-hidden font-semibold text-[var(--brand-deep)] border border-[var(--brand)]/20 shadow-2xs">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--text)] truncate">{employee.firstName} {employee.lastName}</p>
          <p className="text-[10px] font-medium text-[var(--muted)] truncate">{employee.position || 'Employee'}</p>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    let history = [];
    if (timeline) {
      try { history = JSON.parse(timeline); } catch (e) { history = []; }
    }
    if (!history.length) {
      history = [{ date: joinDate, title: 'Joined Company', description: `Started as ${position || 'Employee'}` }];
    } else {
      const hasJoined = history.some(e => e.title === 'Joined Company');
      if (!hasJoined && joinDate) {
        history.unshift({ date: joinDate, title: 'Joined Company', description: `Started as ${position || 'Employee'}` });
      }
    }

    if (joinDate) {
      const join = new Date(joinDate);
      const now = new Date();
      let yearsCompleted = 0;
      while (true) {
        yearsCompleted++;
        const anniversaryDate = new Date(join);
        anniversaryDate.setFullYear(join.getFullYear() + yearsCompleted);
        if (anniversaryDate > now) break;
        const title = `${yearsCompleted}${yearsCompleted === 1 ? 'st' : yearsCompleted === 2 ? 'nd' : yearsCompleted === 3 ? 'rd' : 'th'} Work Anniversary`;
        if (!history.some(e => e.title === title)) {
          history.push({
            date: anniversaryDate.toISOString().split('T')[0],
            title: title,
            description: `Completed ${yearsCompleted} year${yearsCompleted > 1 ? 's' : ''} at Acme HRMS!`
          });
        }
      }
    }
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="relative border-l-2 border-[var(--line)] ml-3 space-y-4">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-5">
            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[var(--brand)] border-2 border-white ring-2 ring-[var(--brand-tint)]" />
            <div className="flex items-center justify-between mb-0.5">
              <h4 className="text-xs font-semibold text-[var(--text)]">{event.title}</h4>
              <time className="text-[10px] text-[var(--muted)] font-medium">{formatDate(event.date)}</time>
            </div>
            <p className="text-[11px] text-[var(--muted)]">{event.description}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={Mail} label="Personal Email" value={email} />
            <DetailItem icon={Phone} label="Phone Number" value={phone} />
            <DetailItem icon={User} label="Gender" value={<span className="capitalize">{gender}</span>} />
            <DetailItem icon={HeartHandshake} label="Marital Status" value={<span className="capitalize">{maritalStatus}</span>} />
            <DetailItem icon={Globe} label="Nationality" value={nationality} />
            <DetailItem icon={MapPin} label="Residential Address" value={address} />
            <DetailItem icon={CreditCard} label="PAN Number" value={<span className="uppercase">{panNumber}</span>} />
            <DetailItem icon={CalendarDays} label="Date of Birth" value={formatDate(dateOfBirth)} />
            <DetailItem icon={Heart} label="Blood Group" value={bloodGroup} />
          </div>
        );
      case 'work':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={Shield} label="Employee ID" value={employeeId} />
            <DetailItem icon={Mail} label="Official Work Email" value={workEmail} />
            <DetailItem icon={CalendarDays} label="Date of Joining" value={formatDate(joinDate)} />
            <DetailItem icon={Briefcase} label="Designation" value={position} />
            <DetailItem icon={Building2} label="Department" value={department} />
            <DetailItem icon={Building} label="Branch Location" value={branch_name || branch} />
            <DetailItem icon={UserCheck} label="Reporting Manager" value={teamData?.manager ? `${teamData.manager.firstName} ${teamData.manager.lastName}` : 'Not set'} />
            <DetailItem icon={Shield} label="Employment Type" value={formatEnum(employmentType)} />
            <DetailItem icon={Clock} label="Notice Period" value={noticePeriod ? `${noticePeriod} Days` : 'Not set'} />
          </div>
        );
      case 'shift':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={Clock3} label="Assigned Shift Time" value={shiftTime} />
            <DetailItem icon={Laptop} label="Work Mode" value={formatEnum(workMode)} />
            <DetailItem icon={Calendar} label="Weekly Offs" value={weekOff} />
          </div>
        );
      case 'emergency':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={User} label="Contact Name" value={emergencyContact} />
            <DetailItem icon={Phone} label="Emergency Phone" value={emergencyPhone} />
          </div>
        );
      case 'my-team':
        return (
          <div className="space-y-3">
            {teamData?.manager && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Reporting Manager</p>
                <TeamMemberCard employee={teamData.manager} />
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Department Colleagues ({teamData?.peers?.length || 0})</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {teamData?.peers?.length ? (
                  teamData.peers.map((peer) => (
                    <TeamMemberCard key={peer.id} employee={peer} />
                  ))
                ) : (
                  <p className="text-xs text-[var(--muted)] py-3 text-center">No colleagues found.</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-2.5">
            {!assetsData || assetsData.length === 0 ? (
              <div className="p-6 text-center bg-[var(--surface-alt)] rounded-[14px] border border-[var(--line)]">
                <Laptop className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[var(--muted)] font-medium">No company assets assigned.</p>
              </div>
            ) : (
              assetsData.map((asset, i) => (
                <div key={i} className="p-3.5 bg-[var(--surface-alt)] rounded-[14px] border border-[var(--line)] space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-xs text-[var(--text)]">{asset.name}</h4>
                      <p className="text-[10px] text-[var(--muted)]">{asset.category}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-[var(--brand-tint)] text-[var(--brand-deep)] rounded-full border border-[var(--brand)]/20">
                      {asset.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-2)] bg-[var(--surface)] p-2 rounded-[10px] border border-[var(--line)]">
                    S/N: {asset.serial_number || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'timeline':
        return (
          <div className="p-4 bg-[var(--surface-alt)] rounded-[14px] border border-[var(--line)]">
            {renderTimeline()}
          </div>
        );
      default: return null;
    }
  };

  if (loading) return <PageLoader message="Loading Profile Data..." />;

  return (
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            My Profile
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Account & <span className="text-[var(--brand-deep)]">Profile</span>
            </h2>

            <button
              type="button"
              onClick={handleEditClick}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full-[14px] text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Edit2 className="w-3.5 h-3.5 text-white" />
              <span>Edit Profile</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-1">
            Personal credentials, settings & assets
          </p>
        </div>
      </section>

      {/* Profile Identity Card */}
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs p-5 relative z-20 mx-0.5 space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          
          {/* Avatar Container with Upload Badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-[18px] border-2 border-[var(--line)] shadow-xs bg-[var(--surface-alt)] overflow-hidden flex items-center justify-center text-xl font-bold text-[var(--text)]">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--ink)] hover:bg-[var(--ink-2)] border-2 border-white rounded-[10px] flex items-center justify-center text-white cursor-pointer shadow-xs active:scale-95 transition-all">
              <Camera className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">{fullName}</h2>
            <p className="text-xs font-semibold text-[var(--muted)] mt-0.5">{position || 'Employee'}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full pt-2 border-t border-[var(--line)]">
            <div className="bg-[var(--brand-tint)] rounded-[14px] p-2.5 text-center border border-[var(--brand)]/20">
              <p className="text-[9px] uppercase font-semibold text-[var(--brand-deep)] tracking-wider">Employee ID</p>
              <p className="font-bold text-xs text-[var(--brand-deep)] mt-0.5">{employeeId || '-'}</p>
            </div>
            <div className="bg-[var(--accent-pink-tint)] rounded-[14px] p-2.5 text-center border border-[var(--accent-pink-deep)]/20">
              <p className="text-[9px] uppercase font-semibold text-[var(--accent-pink-deep)] tracking-wider">Department</p>
              <p className="font-bold text-xs text-[var(--accent-pink-deep)] mt-0.5 truncate">{department || '-'}</p>
            </div>
          </div>

        </div>
      </section>

      {/* Profile Section Navigation Cards */}
      <section className="space-y-3">
        <div className="px-1">
          <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">Profile Categories</h3>
        </div>

        <div className="space-y-2.5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className="w-full bg-[var(--surface)] p-4 rounded-[20px] border border-[var(--line)] shadow-xs flex items-center justify-between hover:bg-[var(--surface-alt)] active:scale-[0.98] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[12px] ${section.bg} ${section.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-[var(--text)]">{section.label}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Mobile Profile Version Footer */}
      <div className="pt-3 pb-8 text-center select-none space-y-1.5">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--accent-pink)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--ink)]" />
          <span className="text-[11px] font-semibold text-[var(--muted)] tracking-wide">
            Acme HRMS {import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}
          </span>
        </div>
        <p className="text-[10px] text-[var(--muted)] font-medium">
          Build {import.meta.env.VITE_APP_VERSION || '2026.08.28'}
        </p>

        {!isNativeApp && !isIOS && (
          <div className="pt-1">
            <a
              href={getAssetUrl('/downloads/Acme%20HRMS.apk')}
              download="Acme HRMS.apk"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Mobile App (APK)</span>
            </a>
          </div>
        )}
      </div>

      {/* Slide-Up Bottom Sheet Drawer */}
      {createPortal(
        <AnimatePresence>
          {activeSection && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => setActiveSection(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
                drag="y"
                dragControls={controls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 400) {
                    setActiveSection(null);
                  }
                }}
                className="bg-[var(--surface)] rounded-t-[28px] shadow-2xl border-t border-[var(--line)] w-full max-w-md mx-auto max-h-[85vh] flex flex-col overflow-hidden relative z-10 font-sans antialiased text-[var(--text)]"
              >
                {/* Top Drag Indicator Area */}
                <div 
                  className="w-full pt-3 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing select-none shrink-0"
                  onPointerDown={(e) => controls.start(e)}
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-12 h-1.5 bg-[var(--line)] rounded-full pointer-events-none" />
                </div>

                {/* Bottom Sheet Header */}
                <div className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)] shrink-0">
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const current = sections.find(s => s.id === activeSection);
                      const Icon = current?.icon || User;
                      return (
                        <div className={`w-8 h-8 rounded-[10px] ${current?.bg || 'bg-[var(--brand-tint)]'} ${current?.color || 'text-[var(--brand-deep)]'} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)]">
                        {sections.find(s => s.id === activeSection)?.label}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--muted)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {renderContent()}
                </div>

                {/* Bottom Close Button */}
                <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)] shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="w-full py-2.5 px-4 rounded-full-[14px] border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-semibold transition-all cursor-pointer text-center active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default EmployeeMobileProfile;
