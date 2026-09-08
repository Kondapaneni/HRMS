import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Settings, User, Mail, Phone, MapPin, Briefcase,
  CalendarDays, Building2, Shield, CreditCard, HeartHandshake, Globe,
  Clock, Laptop, Droplets, Heart, Download, Camera, IndianRupee,
  CheckCircle2, Sparkles, AlertCircle, TrendingUp, Award, X
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const AdminEmployeeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [isUploading, setIsUploading] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    newPosition: '',
    newSalary: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: '',
    sendEmail: true
  });
  const [isPromoting, setIsPromoting] = useState(false);

  const { data, isLoading: loading, isFetching } = useQuery({
    queryKey: ['admin', 'employee', id],
    queryFn: async () => {
      const res = await api.get(`/admin/employees/${id}`);
      return res.data;
    },
    onError: () => toast.error('Failed to load employee details.'),
  });

  const handleDownload = async (payslip) => {
    try {
      const blob = await pdf(<PayslipPDF payslip={payslip} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const getMonthName = (monthNum) => {
        const date = new Date();
        date.setMonth(monthNum - 1);
        return date.toLocaleString('default', { month: 'long' });
      };
      link.download = `${payslip.employeeName.replace(/[^a-zA-Z0-9 _-]/g, '')} - Payslip - ${getMonthName(payslip.month)} ${payslip.year}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  if (loading || (!data && isFetching)) {
    return <PageLoader message="Loading Employee Details..." />;
  }

  if (!data || !data.employee) {
    return (
      <div className="text-center py-16 text-[#5f6368]">
        <AlertCircle className="w-10 h-10 text-[#EA4335] mx-auto mb-2 opacity-80" />
        <p className="text-sm font-semibold text-[#1f1f1f]">Employee record not found</p>
        <button
          onClick={() => navigate('/admin/employees')}
          className="mt-3 px-4 py-1.5 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] rounded-full hover:bg-[#d2e3fc] transition-colors"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const { employee, leaveBalance, recentPayslips, assets } = data;

  const {
    firstName = '', lastName = '', email = '', phone = '', address = '', position = '', department = '', branch = '', branch_name = '',
    employeeId = '', dateOfBirth = '', bloodGroup = '', gender = '', maritalStatus = '', nationality = '',
    joinDate = '', workEmail = '', panNumber = '', employmentType = '', noticePeriod = '', shiftTime = '',
    workMode = '', weekOff = '', emergencyContact = '', emergencyPhone = '', avatar = '', timeline = '',
    status = 'active'
  } = employee;

  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const openPromoteModal = () => {
    setPromoteForm({
      newPosition: position || '',
      newSalary: employee?.salary ? String(employee.salary) : '',
      effectiveDate: new Date().toISOString().split('T')[0],
      notes: '',
      sendEmail: true
    });
    setIsPromoteModalOpen(true);
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    if (!promoteForm.newPosition.trim()) {
      toast.error('Please enter a new designation / role');
      return;
    }
    if (!promoteForm.newSalary || isNaN(promoteForm.newSalary) || Number(promoteForm.newSalary) < 0) {
      toast.error('Please enter a valid salary amount');
      return;
    }

    try {
      setIsPromoting(true);
      const res = await api.post(`/admin/employees/${id}/promote`, {
        newPosition: promoteForm.newPosition.trim(),
        newSalary: Number(promoteForm.newSalary),
        effectiveDate: promoteForm.effectiveDate,
        notes: promoteForm.notes.trim(),
        sendEmail: promoteForm.sendEmail
      });

      toast.success(res.data?.message || 'Employee promoted successfully!');
      setIsPromoteModalOpen(false);
      queryClient.invalidateQueries(['admin', 'employee', id]);
      queryClient.invalidateQueries(['admin', 'employees']);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to promote employee');
    } finally {
      setIsPromoting(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'work', label: 'Work Info', icon: Briefcase },
    { id: 'work-shift', label: 'Work Shift', icon: Clock },
    { id: 'emergency', label: 'Emergency', icon: Phone },
    { id: 'asset', label: 'My Assets', icon: Laptop },
    { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  ];

  const formatDate = (val) => {
    if (!val) return 'Not set';
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (st) => {
    switch (st?.toLowerCase()) {
      case 'active': return 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]';
      case 'on leave': return 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]';
      case 'inactive': case 'terminated': case 'resigned': case 'absconded': return 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]';
      default: return 'bg-[#f1f3f4] text-[#444746] border-[#dadce0]';
    }
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const avatarUrl = window.location.origin + "/Avatar/" + fileName;

      await api.put(`/admin/employees/${id}`, { avatar: avatarUrl });

      queryClient.invalidateQueries(['admin', 'employee', id]);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
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

        if (status?.toLowerCase() !== 'active' && employee.employmentStatusDate) {
          const exitDate = new Date(employee.employmentStatusDate);
          if (anniversaryDate > exitDate) break;
        }

        const title = `${yearsCompleted}${yearsCompleted === 1 ? 'st' : yearsCompleted === 2 ? 'nd' : yearsCompleted === 3 ? 'rd' : 'th'} Work Anniversary`;
        const exists = history.some(e => e.title === title);

        if (!exists) {
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
      <div className="relative border-l-2 border-[#e0e3e7] ml-3.5 space-y-6 mt-3 py-2">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute -left-[9px] mt-1 flex h-4 w-4 items-center justify-center">
              {idx === 0 && <span className="absolute h-6 w-6 animate-ping rounded-full bg-[#4285F4]/30"></span>}
              <span className="relative h-3.5 w-3.5 rounded-full bg-[#1a73e8] border-2 border-white ring-2 ring-[#e8f0fe]"></span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-0.5">
              <h4 className="text-xs font-semibold text-[#1f1f1f]">{event.title}</h4>
              <time className="text-[11px] text-[#5f6368] font-medium">{formatDate(event.date)}</time>
            </div>
            <p className="text-xs text-[#5f6368] mt-0.5">{event.description}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Staff Profile & Records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            <span className="font-medium italic text-[#1a73e8]">{fullName}</span> <span className="text-xs font-medium text-[#5f6368] bg-[#f1f3f4] border border-[#e0e3e7] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{employeeId}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            {position || 'Staff Member'} &bull; {department || 'General'} &bull; {branch_name || branch || 'Main Branch'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openPromoteModal}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#137333] hover:bg-[#0d652d] text-white px-4 py-2 shadow-md shadow-[#34A853]/25 hover:shadow-lg transition-all cursor-pointer gap-1.5"
          >
            <TrendingUp size={14} />
            <span>Promote Employee</span>
          </button>
          <button
            onClick={() => navigate(`/admin/employees/${id}/edit`)}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2 shadow-md shadow-[#4285F4]/25 hover:shadow-lg transition-all cursor-pointer gap-1.5"
          >
            <Edit3 size={14} />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => navigate(`/admin/employees/${id}/settings`)}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs"
          >
            <Settings size={14} />
            <span>Access Settings</span>
          </button>
          <button
            onClick={() => navigate('/admin/employees')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] px-3.5 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back To Employees</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Profile Card, Leave Quota & Recent Payslips */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="h-1 w-full bg-[#4285F4] absolute top-0 left-0" />

            {/* Avatar with Camera Upload */}
            <div className="relative group cursor-pointer h-22 w-22 mx-auto mb-3.5">
              <div className="h-full w-full overflow-hidden rounded-full bg-[#e8f0fe] border-2 border-[#d2e3fc] text-2xl font-bold text-[#1a73e8] flex items-center justify-center shadow-xs">
                {avatar ? <img src={avatar} alt="Avatar" className="h-full w-full object-cover" /> : initials}
              </div>
              <label className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center text-white cursor-pointer transition-all rounded-full">
                {isUploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Camera size={18} />
                    <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </>
                )}
              </label>
            </div>

            <h2 className="text-lg font-semibold text-[#1f1f1f]">{fullName}</h2>
            <p className="text-xs text-[#5f6368] mt-0.5">{position || 'Employee'}</p>

            <div className="mt-2.5">
              <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[10.5px] font-semibold capitalize ${getStatusBadge(status)}`}>
                {status}
              </span>
            </div>

            {/* Leave Balance Quota */}
            <div className="w-full mt-6 pt-5 border-t border-[#f1f3f4]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#1f1f1f]">Leave Balance Quota</p>
                <span className="text-[11px] text-[#5f6368]">Annual</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[#d2e3fc] bg-[#e8f0fe]/50 p-2.5 text-center">
                  <p className="text-lg font-bold text-[#1a73e8]">{leaveBalance?.paidTotal || 12}</p>
                  <p className="text-[10.5px] font-medium text-[#5f6368]">Paid Total</p>
                </div>
                <div className="rounded-xl border border-[#ceead6] bg-[#e6f4ea]/50 p-2.5 text-center">
                  <p className="text-lg font-bold text-[#137333]">{(leaveBalance?.paidTotal || 12) - (leaveBalance?.paidUsed || 0)}</p>
                  <p className="text-[10.5px] font-medium text-[#5f6368]">Remaining Paid</p>
                </div>
                <div className="rounded-xl border border-[#fad2cf] bg-[#fce8e6]/50 p-2.5 text-center">
                  <p className="text-lg font-bold text-[#c5221f]">{leaveBalance?.paidUsed || 0}</p>
                  <p className="text-[10.5px] font-medium text-[#5f6368]">Paid Used</p>
                </div>
                <div className="rounded-xl border border-[#feefc3] bg-[#fef7e0]/50 p-2.5 text-center">
                  <p className="text-lg font-bold text-[#b06000]">{leaveBalance?.unpaidUsed || 0}</p>
                  <p className="text-[10.5px] font-medium text-[#5f6368]">Unpaid Used</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payslips Card */}
          <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#1f1f1f]">Recent Payslips</h3>
              <span className="text-[10.5px] font-medium text-[#5f6368]">Payroll History</span>
            </div>
            <div className="p-4">
              {recentPayslips?.length > 0 ? (
                <div className="space-y-2.5">
                  {recentPayslips.map((ps, i) => (
                    <div key={i} className="flex justify-between items-center text-xs border-b border-[#f1f3f4] pb-2.5 last:border-0 last:pb-0">
                      <span className="text-[#5f6368] font-medium">
                        {new Date(ps.year, ps.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-[#1f1f1f]">₹{ps.netSalary}</span>
                        <button
                          onClick={() => handleDownload(ps)}
                          className="text-[#1a73e8] hover:text-[#1557b0] p-1.5 rounded-full hover:bg-[#e8f0fe] transition-colors cursor-pointer"
                          title="Download Payslip PDF"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#5f6368] text-center py-4 italic">No payslips generated yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Tabbed Details */}
        <div className="md:col-span-2 space-y-4">
          {/* Material 3 Tabs Navigation Bar */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#f8fafd] border border-[#e0e3e7] rounded-full overflow-x-auto hide-scrollbar shadow-2xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#c2e7ff]/70 text-[#001d35] shadow-xs'
                      : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#001d35]' : 'text-[#5f6368]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
            {/* Tab Contents */}
            <div className="p-6">
              {/* PERSONAL INFO */}
              {activeTab === 'personal' && (
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Mail size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Email Address</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] truncate mt-0.5">{email || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Phone size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Phone Number</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] truncate mt-0.5">{phone || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <User size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Gender</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{gender || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <HeartHandshake size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Marital Status</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{maritalStatus || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Globe size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Nationality</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{nationality || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Residential Address</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{address || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <CreditCard size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">PAN Number</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{panNumber || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <CalendarDays size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Date of Birth</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{formatDate(dateOfBirth)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Droplets size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Blood Group</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{bloodGroup || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* WORK INFO */}
              {activeTab === 'work' && (
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Shield size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Employee ID</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{employeeId || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Mail size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Official Work Email</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] truncate mt-0.5">{workEmail || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <CalendarDays size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Joining Date</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{formatDate(joinDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Designation / Position</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{position || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Department</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{department || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Branch Location</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{branch_name || branch || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Employment Type</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{employmentType || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Notice Period</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{noticePeriod ? `${noticePeriod} days` : 'Not set'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* WORK SHIFT */}
              {activeTab === 'work-shift' && (
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Daily Shift Hours</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{shiftTime || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Working Arrangement</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{workMode || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <CalendarDays size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Weekly Off</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{weekOff || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* EMERGENCY */}
              {activeTab === 'emergency' && (
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <User size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Emergency Contact Name</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{emergencyContact || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl border border-[#f1f3f4] bg-[#f8fafd]/40">
                    <div className="p-2 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                      <Phone size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#5f6368]">Emergency Phone Number</p>
                      <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{emergencyPhone || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ASSET */}
              {activeTab === 'asset' && (
                <div>
                  {assets && assets.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider border-b border-[#e0e3e7] bg-[#f8fafd]">
                          <tr>
                            <th className="px-4 py-2.5">Product Name</th>
                            <th className="px-4 py-2.5">Serial Number</th>
                            <th className="px-4 py-2.5">Assigned Date</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f3f4]">
                          {assets.map((ast, i) => (
                            <tr key={i} className="hover:bg-[#f8fafd] transition-colors">
                              <td className="px-4 py-3 font-semibold text-[#1f1f1f]">{ast.productName}</td>
                              <td className="px-4 py-3 text-[#5f6368]">{ast.serialNumber}</td>
                              <td className="px-4 py-3 text-[#5f6368]">{formatDate(ast.assignedAt)}</td>
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#f1f3f4] text-[10.5px] font-semibold text-[#444746] capitalize">
                                  {ast.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-[#5f6368]">
                      <Laptop className="w-8 h-8 text-[#dadce0] mx-auto mb-2" />
                      <p className="text-xs font-medium text-[#1f1f1f]">No corporate assets assigned</p>
                      <p className="text-[11px] text-[#5f6368]">Hardware and devices assigned to this employee will appear here.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TIMELINE */}
              {activeTab === 'timeline' && renderTimeline()}
            </div>
          </div>
        </div>
      </div>

      {/* Promote Employee Modal */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dadce0] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Google 4-Color Accent Line */}
            <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-[#f8fafd] border-b border-[#e0e3e7] flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center justify-center shrink-0 shadow-xs">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1f1f1f]">
                    Promote Employee
                  </h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    Advance <span className="font-semibold text-[#1f1f1f]">{fullName}</span> ({employeeId}) and update compensation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(false)}
                className="text-[#5f6368] hover:text-[#1f1f1f] p-1.5 rounded-full hover:bg-[#e0e3e7] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePromoteSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto font-sans">
              {/* Current Overview Card */}
              <div className="p-3.5 bg-[#f8fafd] rounded-xl border border-[#e0e3e7] grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#5f6368] block text-[11px] font-medium">Current Designation</span>
                  <span className="font-semibold text-[#1f1f1f]">{position || 'Staff Member'}</span>
                </div>
                <div>
                  <span className="text-[#5f6368] block text-[11px] font-medium">Current Monthly Salary</span>
                  <span className="font-semibold text-[#1f1f1f]">₹{Number(employee?.salary || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* New Position */}
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1.5">
                  New Designation / Role <span className="text-[#EA4335]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5f6368]">
                    <Briefcase size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={promoteForm.newPosition}
                    onChange={(e) => setPromoteForm({ ...promoteForm, newPosition: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Revised Salary */}
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1.5">
                  Revised Monthly Salary (₹) <span className="text-[#EA4335]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5f6368]">
                    <IndianRupee size={15} />
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={promoteForm.newSalary}
                    onChange={(e) => setPromoteForm({ ...promoteForm, newSalary: e.target.value })}
                    placeholder="e.g. 75000"
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all"
                  />
                </div>

                {/* Hike Calculation Banner */}
                {Number(promoteForm.newSalary) > 0 && Number(employee?.salary || 0) > 0 && (
                  <div className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    (Number(promoteForm.newSalary) - Number(employee?.salary || 0)) > 0
                      ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                      : (Number(promoteForm.newSalary) - Number(employee?.salary || 0)) === 0
                        ? 'bg-[#f1f3f4] border-[#dadce0] text-[#444746]'
                        : 'bg-[#fef7e0] border-[#feefc3] text-[#b06000]'
                  }`}>
                    <span className="font-medium text-[11.5px]">Salary Adjustment:</span>
                    <span className="font-bold">
                      {(Number(promoteForm.newSalary) - Number(employee?.salary || 0)) > 0
                        ? `+₹${(Number(promoteForm.newSalary) - Number(employee?.salary || 0)).toLocaleString('en-IN')} (+${Math.round(((Number(promoteForm.newSalary) - Number(employee?.salary || 0)) / Number(employee?.salary || 1)) * 100)}% Hike)`
                        : (Number(promoteForm.newSalary) - Number(employee?.salary || 0)) === 0
                          ? 'Same Base Pay'
                          : `-₹${Math.abs(Number(promoteForm.newSalary) - Number(employee?.salary || 0)).toLocaleString('en-IN')} (${Math.round(((Number(promoteForm.newSalary) - Number(employee?.salary || 0)) / Number(employee?.salary || 1)) * 100)}% Adjustment)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1.5">
                  Effective Date <span className="text-[#EA4335]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5f6368]">
                    <CalendarDays size={15} />
                  </div>
                  <input
                    type="date"
                    required
                    value={promoteForm.effectiveDate}
                    onChange={(e) => setPromoteForm({ ...promoteForm, effectiveDate: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Remarks / Promotion Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1.5">
                  Promotion Remarks / Notes <span className="text-[#5f6368] font-normal">(Included in letter)</span>
                </label>
                <textarea
                  rows={2}
                  value={promoteForm.notes}
                  onChange={(e) => setPromoteForm({ ...promoteForm, notes: e.target.value })}
                  placeholder="e.g. In recognition of outstanding contributions, leadership on core initiatives, and mentoring peers..."
                  className="w-full p-2.5 text-xs rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none transition-all"
                />
              </div>

              {/* Send Promotion Letter Email Checkbox */}
              <div className="p-3 bg-[#e8f0fe]/60 rounded-xl border border-[#d2e3fc] flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="sendEmailCheckbox"
                  checked={promoteForm.sendEmail}
                  onChange={(e) => setPromoteForm({ ...promoteForm, sendEmail: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-[#dadce0]"
                />
                <label htmlFor="sendEmailCheckbox" className="text-xs cursor-pointer select-none">
                  <span className="font-semibold text-[#1a73e8] block">Send Official Promotion Letter to Employee Email</span>
                  <span className="text-[11px] text-[#5f6368] block mt-0.5">
                    Dispatches a formatted congratulations letter with revised compensation breakdown directly to <strong>{email || 'employee address'}</strong>.
                  </span>
                </label>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#e0e3e7]">
                <button
                  type="button"
                  disabled={isPromoting}
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#444746] hover:bg-[#f1f3f4] rounded-full border border-[#dadce0] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPromoting}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#137333] hover:bg-[#0d652d] rounded-full shadow-md shadow-[#34A853]/20 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPromoting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={14} />
                      <span>Confirm Promotion</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployeeView;
