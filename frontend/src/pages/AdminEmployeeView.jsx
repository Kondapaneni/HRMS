import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import PageLoader from '../components/PageLoader';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Settings, User, Mail, Phone, MapPin, Briefcase,
  CalendarDays, Building2, Shield, CreditCard, HeartHandshake, Globe,
  Clock, Laptop, Droplets, Download, Camera,
  AlertCircle, TrendingUp, X, Sparkles
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Avatar from '../components/ui/Avatar';

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
      link.download = `${payslip.employeeName.replace(/[^a-zA-Z0-9 _-]/g, '')} - Payslip - ${getMonthName(
        payslip.month
      )} ${payslip.year}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  if (loading || (!data && isFetching)) {
    return <PageLoader message="Loading employee details..." />;
  }

  if (!data || !data.employee) {
    return (
      <div className="text-center py-16 text-[var(--muted)]">
        <AlertCircle className="w-10 h-10 text-[#D64550] mx-auto mb-2 opacity-80" />
        <p className="text-sm font-medium text-[var(--text)]">Employee record not found</p>
        <Button
          variant="outline"
          onClick={() => navigate('/admin/employees')}
          className="mt-3 h-9 px-4 rounded-[12px] text-xs font-medium"
        >
          Back to directory
        </Button>
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
    { id: 'personal', label: 'Personal info', icon: User },
    { id: 'work', label: 'Work info', icon: Briefcase },
    { id: 'work-shift', label: 'Work shift', icon: Clock },
    { id: 'emergency', label: 'Emergency', icon: Phone },
    { id: 'asset', label: 'Assigned assets', icon: Laptop },
    { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  ];

  const formatDate = (val) => {
    if (!val) return 'Not set';
    return new Date(val).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStatus = (st) => {
    const s = (st || '').toLowerCase();
    if (s === 'active') return <StatusBadge status="Success">Active</StatusBadge>;
    if (s === 'on leave') return <StatusBadge status="Warning">On leave</StatusBadge>;
    if (s === 'inactive' || s === 'terminated' || s === 'resigned' || s === 'absconded') {
      return <StatusBadge status="Danger">{st}</StatusBadge>;
    }
    return <StatusBadge status="Neutral">{st || 'Inactive'}</StatusBadge>;
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

      const avatarUrl = window.location.origin + '/Avatar/' + fileName;

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
      try {
        history = JSON.parse(timeline);
      } catch (e) {
        history = [];
      }
    }
    if (!history.length) {
      history = [{ date: joinDate, title: 'Joined company', description: `Started as ${position || 'Employee'}` }];
    } else {
      const hasJoined = history.some((e) => e.title === 'Joined Company' || e.title === 'Joined company');
      if (!hasJoined && joinDate) {
        history.unshift({ date: joinDate, title: 'Joined company', description: `Started as ${position || 'Employee'}` });
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

        const title = `${yearsCompleted}${
          yearsCompleted === 1 ? 'st' : yearsCompleted === 2 ? 'nd' : yearsCompleted === 3 ? 'rd' : 'th'
        } work anniversary`;
        const exists = history.some((e) => e.title.toLowerCase() === title.toLowerCase());

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
      <div className="relative border-l-2 border-[var(--line)] ml-3.5 space-y-6 mt-3 py-2">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute -left-[9px] mt-1 flex h-4 w-4 items-center justify-center">
              <span className="relative h-3 w-3 rounded-full bg-[var(--brand)] border-2 border-[var(--surface)]" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-0.5">
              <h4 className="text-xs font-medium text-[var(--text)]">{event.title}</h4>
              <time className="text-[11px] text-[var(--muted)]">{formatDate(event.date)}</time>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">{event.description}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 w-full pb-8 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 w-full">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
              {fullName}
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)]">
              {employeeId}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {position || 'Staff member'} &bull; {department || 'General'} &bull; {branch_name || branch || 'Main Branch'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Button
            variant="outline"
            onClick={openPromoteModal}
            className="h-9 px-4 rounded-[12px] font-medium text-xs justify-center"
          >
            <TrendingUp size={14} className="text-[#1F9D55]" />
            <span>Promote employee</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate(`/admin/employees/${id}/edit`)}
            className="h-9 px-4 rounded-[12px] font-medium text-xs justify-center"
          >
            <Edit3 size={14} />
            <span>Edit profile</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/employees/${id}/settings`)}
            className="h-9 px-3.5 rounded-[12px] font-medium text-xs justify-center"
          >
            <Settings size={14} />
            <span>Security</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/employees')}
            className="h-9 px-3.5 rounded-[12px] font-medium text-xs justify-center"
          >
            <ArrowLeft size={14} />
            <span>Directory</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 w-full">
        {/* Left Column - Profile Card, Leave Quota & Recent Payslips */}
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col items-center text-center relative overflow-hidden">
            {/* Avatar with Camera Upload (14px rounded square) */}
            <div className="relative group cursor-pointer h-20 w-20 mx-auto mb-3.5">
              <Avatar
                name={fullName}
                src={avatar}
                size={80}
                shape="square"
                radius={14}
              />
              <label className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center text-white cursor-pointer transition-all rounded-[14px]">
                {isUploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Camera size={16} />
                    <span className="text-[9px] font-medium mt-0.5">Upload</span>
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

            <h2 className="text-base font-medium text-[var(--text)]">{fullName}</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">{position || 'Employee'}</p>

            <div className="mt-2.5">
              {renderStatus(status)}
            </div>

            {/* Leave Balance Quota */}
            <div className="w-full mt-5 pt-4 border-t border-[var(--line)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[var(--text)]">Leave balance quota</p>
                <span className="text-[11px] text-[var(--muted)]">Annual</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[12px] bg-[var(--surface-alt)] p-2.5 text-center">
                  <p className="text-base font-medium text-[var(--brand-deep)]">{leaveBalance?.paidTotal || 12}</p>
                  <p className="text-[10px] text-[var(--muted)]">Paid total</p>
                </div>
                <div className="rounded-[12px] bg-[#E6F6EC] p-2.5 text-center">
                  <p className="text-base font-medium text-[#1F9D55]">
                    {(leaveBalance?.paidTotal || 12) - (leaveBalance?.paidUsed || 0)}
                  </p>
                  <p className="text-[10px] text-[#1F9D55]">Remaining</p>
                </div>
                <div className="rounded-[12px] bg-[#FDE8EA] p-2.5 text-center">
                  <p className="text-base font-medium text-[#D64550]">{leaveBalance?.paidUsed || 0}</p>
                  <p className="text-[10px] text-[#D64550]">Paid used</p>
                </div>
                <div className="rounded-[12px] bg-[#FDF3DC] p-2.5 text-center">
                  <p className="text-base font-medium text-[#B7791F]">{leaveBalance?.unpaidUsed || 0}</p>
                  <p className="text-[10px] text-[#B7791F]">Unpaid used</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payslips Card */}
          <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
            <div className="pb-3 border-b border-[var(--line)] flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-[var(--text)]">Recent payslips</h3>
              <span className="text-[11px] text-[var(--muted)]">Payroll history</span>
            </div>
            <div>
              {recentPayslips?.length > 0 ? (
                <div className="space-y-2">
                  {recentPayslips.map((ps, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs pb-2 border-b border-[var(--line)] last:border-0 last:pb-0"
                    >
                      <span className="text-[var(--muted)]">
                        {new Date(ps.year, ps.month - 1).toLocaleString('default', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text)]">₹{ps.netSalary}</span>
                        <button
                          type="button"
                          onClick={() => handleDownload(ps)}
                          className="text-[var(--brand-deep)] hover:text-[var(--text)] p-1 rounded-full hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                          title="Download Payslip PDF"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] text-center py-4 italic">
                  No payslips generated yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Tabbed Details */}
        <div className="md:col-span-2 space-y-3.5">
          {/* Tabs Navigation Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--surface)] rounded-full overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[var(--ink)] text-white dark:bg-[var(--text)] dark:text-[var(--surface)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
            {/* PERSONAL INFO */}
            {activeTab === 'personal' && (
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Mail size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Email address</p>
                    <p className="text-xs font-medium text-[var(--text)] truncate mt-0.5">{email || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Phone size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Phone number</p>
                    <p className="text-xs font-medium text-[var(--text)] truncate mt-0.5">{phone || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Gender</p>
                    <p className="text-xs font-medium text-[var(--text)] capitalize mt-0.5">{gender || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <HeartHandshake size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Marital status</p>
                    <p className="text-xs font-medium text-[var(--text)] capitalize mt-0.5">{maritalStatus || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Globe size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Nationality</p>
                    <p className="text-xs font-medium text-[var(--text)] capitalize mt-0.5">{nationality || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <MapPin size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Residential address</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{address || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <CreditCard size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">PAN number</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{panNumber || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <CalendarDays size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Date of birth</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{formatDate(dateOfBirth)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Droplets size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Blood group</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{bloodGroup || 'Not set'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* WORK INFO */}
            {activeTab === 'work' && (
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Shield size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Employee ID</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{employeeId || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Mail size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Official work email</p>
                    <p className="text-xs font-medium text-[var(--text)] truncate mt-0.5">{workEmail || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <CalendarDays size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Joining date</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{formatDate(joinDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Briefcase size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Designation / position</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{position || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Building2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Department</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{department || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Building2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Branch location</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{branch_name || branch || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Briefcase size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Employment type</p>
                    <p className="text-xs font-medium text-[var(--text)] capitalize mt-0.5">{employmentType || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Clock size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Notice period</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">
                      {noticePeriod ? `${noticePeriod} days` : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* WORK SHIFT */}
            {activeTab === 'work-shift' && (
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Clock size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Daily shift hours</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{shiftTime || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <MapPin size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Working arrangement</p>
                    <p className="text-xs font-medium text-[var(--text)] capitalize mt-0.5">{workMode || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <CalendarDays size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Weekly off</p>
                    <p className="text-xs font-medium text-[var(--text)] capitalize mt-0.5">{weekOff || 'Not set'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* EMERGENCY */}
            {activeTab === 'emergency' && (
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Emergency contact name</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{emergencyContact || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)]">
                  <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
                    <Phone size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--muted)]">Emergency phone number</p>
                    <p className="text-xs font-medium text-[var(--text)] mt-0.5">{emergencyPhone || 'Not set'}</p>
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
                      <thead className="text-[12px] font-medium text-[var(--muted)] border-b border-[var(--line)] bg-[var(--surface-alt)]">
                        <tr>
                          <th className="px-4 py-2.5">Product name</th>
                          <th className="px-4 py-2.5">Serial number</th>
                          <th className="px-4 py-2.5">Assigned date</th>
                          <th className="px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)]">
                        {assets.map((ast, i) => (
                          <tr key={i} className="hover:bg-[var(--brand-tint)]/40 transition-colors">
                            <td className="px-4 py-3 font-medium text-[var(--text)]">{ast.productName}</td>
                            <td className="px-4 py-3 text-[var(--muted)]">{ast.serialNumber}</td>
                            <td className="px-4 py-3 text-[var(--muted)]">{formatDate(ast.assignedAt)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-alt)] text-[11px] font-medium text-[var(--text-2)] capitalize">
                                {ast.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-[var(--muted)]">
                    <Laptop className="w-8 h-8 opacity-30 mx-auto mb-2" />
                    <p className="text-xs font-medium text-[var(--text)]">No corporate assets assigned</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      Hardware and devices assigned to this employee will appear here
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE */}
            {activeTab === 'timeline' && renderTimeline()}
          </div>
        </div>
      </div>

      {/* Slideover Right Drawer: Promote Employee */}
      {isPromoteModalOpen &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsPromoteModalOpen(false);
            }}
            className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs antialiased"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-md md:max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)] shrink-0">
                <div>
                  <h2 className="text-lg font-medium text-[var(--text)] tracking-tight">
                    Promote employee
                  </h2>
                  <p className="text-xs text-[var(--muted)]">Role advancement &amp; compensation revision</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form
                id="promote-form"
                onSubmit={handlePromoteSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-4 text-xs"
              >
                {/* Employee Target */}
                <div className="p-3 bg-[var(--surface-alt)] rounded-[12px] flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[var(--muted)]">Employee</p>
                    <p className="text-xs font-medium text-[var(--text)]">
                      {fullName} <span className="text-[var(--muted)]">({employeeId})</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[var(--muted)]">Department</p>
                    <p className="text-xs font-medium text-[var(--brand-deep)]">{department || 'General'}</p>
                  </div>
                </div>

                {/* Current Overview */}
                <div className="p-3.5 bg-[var(--surface)] rounded-[12px] border border-[var(--line)] grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[var(--muted)] block text-[11px]">Current designation</span>
                    <span className="font-medium text-[var(--text)] text-xs">{position || 'Staff member'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block text-[11px]">Current monthly salary</span>
                    <span className="font-medium text-[var(--text)] text-xs">
                      ₹{Number(employee?.salary || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* New Position */}
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1.5">
                    Designation / role <span className="text-[#D64550]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Software Engineer"
                    value={promoteForm.newPosition}
                    onChange={(e) => setPromoteForm({ ...promoteForm, newPosition: e.target.value })}
                    className="w-full h-11 px-3.5 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-xs text-[var(--text)] outline-none transition-all"
                  />
                </div>

                {/* Revised Salary */}
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1.5">
                    Monthly salary (₹) <span className="text-[#D64550]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    placeholder="e.g. 75000"
                    value={promoteForm.newSalary}
                    onChange={(e) => setPromoteForm({ ...promoteForm, newSalary: e.target.value })}
                    className="w-full h-11 px-3.5 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-xs text-[var(--text)] outline-none font-mono transition-all"
                  />

                  {/* Hike Calculation Banner */}
                  {Number(promoteForm.newSalary) > 0 && (
                    <div
                      className={`mt-2 p-2.5 rounded-[12px] text-xs flex items-center justify-between ${
                        Number(promoteForm.newSalary) - Number(employee?.salary || 0) > 0
                          ? 'bg-[#E6F6EC] text-[#1F9D55]'
                          : Number(promoteForm.newSalary) - Number(employee?.salary || 0) === 0
                          ? 'bg-[var(--surface-alt)] text-[var(--muted)]'
                          : 'bg-[#FDF3DC] text-[#B7791F]'
                      }`}
                    >
                      <span className="font-medium text-[11px]">Adjustment:</span>
                      <span className="font-semibold">
                        {Number(promoteForm.newSalary) - Number(employee?.salary || 0) > 0
                          ? `+₹${(
                              Number(promoteForm.newSalary) - Number(employee?.salary || 0)
                            ).toLocaleString('en-IN')} (+${
                              Number(employee?.salary || 0) > 0
                                ? Math.round(
                                    ((Number(promoteForm.newSalary) - Number(employee?.salary || 0)) /
                                      Number(employee?.salary || 1)) *
                                      100
                                  )
                                : 0
                            }% hike)`
                          : Number(promoteForm.newSalary) - Number(employee?.salary || 0) === 0
                          ? 'No change in base pay'
                          : `-₹${Math.abs(
                              Number(promoteForm.newSalary) - Number(employee?.salary || 0)
                            ).toLocaleString('en-IN')} (${
                              Number(employee?.salary || 0) > 0
                                ? Math.round(
                                    ((Number(promoteForm.newSalary) - Number(employee?.salary || 0)) /
                                      Number(employee?.salary || 1)) *
                                      100
                                  )
                                : 0
                            }% adjustment)`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Effective Date */}
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1.5">
                    Effective date <span className="text-[#D64550]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={promoteForm.effectiveDate}
                    onChange={(e) => setPromoteForm({ ...promoteForm, effectiveDate: e.target.value })}
                    className="w-full h-11 px-3.5 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-xs text-[var(--text)] outline-none transition-all"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block font-medium text-[var(--text)] mb-1.5">
                    Remarks / notes <span className="text-[var(--muted)] font-normal">(Included in letter)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={promoteForm.notes}
                    onChange={(e) => setPromoteForm({ ...promoteForm, notes: e.target.value })}
                    placeholder="e.g. In recognition of outstanding contributions, leadership on core initiatives..."
                    className="w-full p-3 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-[12px] text-xs text-[var(--text)] outline-none transition-all"
                  />
                </div>

                {/* Send Promotion Letter Email */}
                <div className="p-3 bg-[var(--surface-alt)] rounded-[12px] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="sendEmailCheckbox"
                    checked={promoteForm.sendEmail}
                    onChange={(e) => setPromoteForm({ ...promoteForm, sendEmail: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-[var(--ink)] focus:ring-[var(--brand)] border-[var(--line)] cursor-pointer"
                  />
                  <label htmlFor="sendEmailCheckbox" className="text-xs cursor-pointer select-none">
                    <span className="font-medium text-[var(--text)] block">
                      Send official letter to employee email
                    </span>
                    <span className="text-[11px] text-[var(--muted)] block mt-0.5">
                      Dispatches an official confirmation directly to {email || 'employee address'}.
                    </span>
                  </label>
                </div>
              </form>

              {/* Footer Actions */}
              <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPromoting}
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="h-10 px-5 rounded-[12px] text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="promote-form"
                  variant="primary"
                  disabled={isPromoting}
                  loading={isPromoting}
                  className="h-10 px-6 rounded-[12px] text-xs font-medium justify-center"
                >
                  <Sparkles size={14} />
                  <span>Confirm promotion</span>
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminEmployeeView;
