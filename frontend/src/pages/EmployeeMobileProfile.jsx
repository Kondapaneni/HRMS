import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import {
  User, Mail, Phone, MapPin, Briefcase, CalendarDays, Building2,
  Shield, CreditCard, Heart, HeartHandshake, Globe, Clock3, Laptop,
  Calendar, Clock, UserCheck, Users, Camera, ChevronRight, FileText,
  X, Edit2, Sparkles, Building
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (activeSection) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
    { id: 'personal', label: 'Personal Details', icon: User, color: 'text-[#1a73e8]', bg: 'bg-[#e8f0fe]' },
    { id: 'work', label: 'Work Information', icon: Briefcase, color: 'text-[#8430ce]', bg: 'bg-[#f3e8fd]' },
    { id: 'shift', label: 'Shift & Working Hours', icon: Clock3, color: 'text-[#b06000]', bg: 'bg-[#fef7e0]' },
    { id: 'emergency', label: 'Emergency Contact', icon: Shield, color: 'text-[#c5221f]', bg: 'bg-[#fce8e6]' },
    { id: 'my-team', label: 'My Team & Manager', icon: Users, color: 'text-[#137333]', bg: 'bg-[#e6f4ea]' },
    { id: 'assets', label: 'Assigned Assets', icon: Laptop, color: 'text-[#0284c7]', bg: 'bg-[#e0f2fe]' },
    { id: 'timeline', label: 'Career Timeline', icon: Clock, color: 'text-[#4f46e5]', bg: 'bg-[#eef2ff]' }
  ];

  const DetailItem = ({ icon: Icon, label, value }) => {
    const currentSection = sections.find(s => s.id === activeSection);
    const iconColor = currentSection?.color || 'text-[#1a73e8]';
    const iconBg = currentSection?.bg || 'bg-[#e8f0fe]';

    return (
      <div className="flex items-center gap-3 p-3 bg-[#f8fafd] hover:bg-[#f1f3f4]/60 rounded-2xl border border-[#e0e3e7] transition-colors">
        <div className={`w-8 h-8 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider">{label}</p>
          <p className="text-xs font-semibold text-[#1f1f1f] break-words mt-0.5 select-all">
            {value || <span className="text-[#80868b] font-normal italic">Not provided</span>}
          </p>
        </div>
      </div>
    );
  };

  const TeamMemberCard = ({ employee }) => {
    if (!employee) return null;
    const initial = `${(employee.firstName || '').charAt(0)}${(employee.lastName || '').charAt(0)}`.toUpperCase() || 'U';
    return (
      <div className="flex items-center gap-3 p-3 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
        <div className="w-9 h-9 rounded-full bg-[#e8f0fe] flex items-center justify-center shrink-0 overflow-hidden font-bold text-[#1a73e8] border border-[#d2e3fc] shadow-2xs">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#1f1f1f] truncate">{employee.firstName} {employee.lastName}</p>
          <p className="text-[10px] font-medium text-[#5f6368] truncate">{employee.position || 'Employee'}</p>
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
      <div className="relative border-l-2 border-[#dadce0] ml-3 space-y-4">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-5">
            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#1a73e8] border-2 border-white ring-2 ring-[#e8f0fe]" />
            <div className="flex items-center justify-between mb-0.5">
              <h4 className="text-xs font-bold text-[#1f1f1f]">{event.title}</h4>
              <time className="text-[10px] text-[#5f6368] font-medium">{formatDate(event.date)}</time>
            </div>
            <p className="text-[11px] text-[#5f6368]">{event.description}</p>
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
            <DetailItem icon={User} label="Emergency Contact Person" value={emergencyContact} />
            <DetailItem icon={Phone} label="Emergency Phone Number" value={emergencyPhone} />
          </div>
        );
      case 'my-team':
        return (
          <div className="space-y-4">
            {!teamData ? (
              <div className="text-center py-6 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
                <Users className="w-8 h-8 text-[#5f6368] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#5f6368]">No team hierarchy configured.</p>
              </div>
            ) : (
              <>
                {teamData.manager && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider pl-1">Reporting Manager</h4>
                    <TeamMemberCard employee={teamData.manager} />
                  </div>
                )}
                
                {teamData.peers?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider pl-1">Team Peers ({teamData.peers.length})</h4>
                    <div className="space-y-2">
                      {teamData.peers.map(peer => <TeamMemberCard key={peer.id} employee={peer} />)}
                    </div>
                  </div>
                )}

                {teamData.subordinates?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider pl-1">Direct Reports ({teamData.subordinates.length})</h4>
                    <div className="space-y-2">
                      {teamData.subordinates.map(sub => <TeamMemberCard key={sub.id} employee={sub} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-2.5">
            {assetsData?.length === 0 ? (
              <div className="text-center py-6 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
                <Laptop className="w-8 h-8 text-[#5f6368] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#5f6368]">No company assets assigned.</p>
              </div>
            ) : (
              assetsData?.map((asset, i) => (
                <div key={i} className="p-3.5 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-[#1f1f1f]">{asset.name}</h4>
                      <p className="text-[10px] text-[#5f6368]">{asset.category}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#e8f0fe] text-[#1a73e8] rounded-full border border-[#d2e3fc]">
                      {asset.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#5f6368] bg-white p-2 rounded-xl border border-[#e0e3e7]">
                    S/N: {asset.serial_number || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'timeline':
        return (
          <div className="p-4 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
            {renderTimeline()}
          </div>
        );
      default: return null;
    }
  };

  if (loading) return <PageLoader message="Loading Profile Data..." />;

  return (
    <div className="space-y-4 pb-8">

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                Account &amp; Info
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              My Profile
            </h1>
            <p className="text-xs text-[#5f6368]">
              Personal credentials, work settings, and assigned assets
            </p>
          </div>

          <button
            type="button"
            onClick={handleEditClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Profile Identity Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
        <div className="flex flex-col items-center text-center space-y-3">
          
          {/* Avatar Container with Upload Badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-[#e8f0fe] shadow-sm bg-[#f8fafd] overflow-hidden flex items-center justify-center text-xl font-bold text-[#1a73e8]">
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

            <label className="absolute bottom-0 right-0 w-7 h-7 bg-[#1a73e8] hover:bg-[#1557b0] border-2 border-white rounded-full flex items-center justify-center text-white cursor-pointer shadow-xs active:scale-95 transition-all">
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
            <h2 className="text-base font-bold text-[#1f1f1f]">{fullName}</h2>
            <p className="text-xs text-[#5f6368]">{position || 'Employee'}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
            <div className="bg-[#f8fafd] rounded-2xl p-2.5 text-center border border-[#e0e3e7]">
              <p className="text-[9px] uppercase font-bold text-[#5f6368]">Employee ID</p>
              <p className="font-bold text-xs text-[#1f1f1f] mt-0.5">{employeeId || '-'}</p>
            </div>
            <div className="bg-[#f8fafd] rounded-2xl p-2.5 text-center border border-[#e0e3e7]">
              <p className="text-[9px] uppercase font-bold text-[#5f6368]">Department</p>
              <p className="font-bold text-xs text-[#1f1f1f] mt-0.5 truncate">{department || '-'}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Profile Section Navigation Cards */}
      <div className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Profile Categories</h3>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className="w-full bg-white p-3.5 rounded-2xl border border-[#e0e3e7] shadow-xs flex items-center justify-between hover:bg-[#f8fafd] active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${section.bg} ${section.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#1f1f1f] text-left">{section.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5f6368]" />
            </button>
          );
        })}
      </div>

      {/* Slide-Up Bottom Sheet Drawer (Mounted via createPortal with Framer Motion) */}
      {createPortal(
        <AnimatePresence>
          {activeSection && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
              {/* Smooth Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => setActiveSection(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
              />

              {/* Smooth Slide-Up Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
                className="bg-white rounded-t-[2rem] shadow-2xl border-t border-[#e0e3e7] w-full max-w-md mx-auto max-h-[85vh] flex flex-col overflow-hidden relative z-10"
              >
                {/* Top Drag Indicator */}
                <div className="w-10 h-1 bg-[#dadce0] rounded-full mx-auto my-2.5 shrink-0" />

                {/* Top 4-Color Gradient Line */}
                <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] shrink-0" />

                {/* Bottom Sheet Header */}
                <div className="px-5 py-3.5 border-b border-[#e0e3e7] flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${sections.find(s => s.id === activeSection)?.bg} ${sections.find(s => s.id === activeSection)?.color} flex items-center justify-center shrink-0 shadow-2xs`}>
                      {React.createElement(sections.find(s => s.id === activeSection)?.icon || User, { className: 'w-4 h-4' })}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5">Profile Info</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#1f1f1f]">
                        {sections.find(s => s.id === activeSection)?.label}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="w-8 h-8 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#5f6368] hover:text-[#1f1f1f] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content Body */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {renderContent()}
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-[#e0e3e7] bg-white flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="w-full py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                  >
                    Done
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
