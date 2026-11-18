import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Briefcase, Clock } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';

const AdminEmployeeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const employeeQuery = useQuery({
    queryKey: ['admin', 'employee', id],
    queryFn: async () => {
      const res = await api.get(`/admin/employees/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const managersQuery = useQuery({
    queryKey: ['admin', 'employees-dropdown'],
    queryFn: async () => {
      const res = await api.get('/admin/employees?limit=500');
      return res.data.employees || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const branchesQuery = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.branches || [];
    }
  });

  const shiftsQuery = useQuery({
    queryKey: ['admin', 'shifttimes'],
    queryFn: async () => {
      const res = await api.get('/admin/shifttimes');
      return res.data || [];
    }
  });

  useEffect(() => {
    if (!employeeQuery.data || !employeeQuery.data.employee) return;

    const emp = employeeQuery.data.employee;

    const cleanData = {};
    Object.keys(emp).forEach((k) => (cleanData[k] = emp[k] || ''));
    if (emp.salary == null) delete cleanData.salary; // delegated staff must not submit redacted salary
    if (cleanData.dateOfBirth) cleanData.dateOfBirth = cleanData.dateOfBirth.split('T')[0];
    if (cleanData.joinDate) cleanData.joinDate = cleanData.joinDate.split('T')[0];

    setFormData(cleanData);
  }, [employeeQuery.data]);

  useEffect(() => {
    if (formData.managerId && managersQuery.data) {
      const m = managersQuery.data.find((emp) => emp.id === formData.managerId);
      if (m) setManagerSearch(`${m.firstName} ${m.lastName} (${m.employeeId})`);
    } else if (!formData.managerId) {
      setManagerSearch('');
    }
  }, [formData.managerId, managersQuery.data]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/admin/employees/${id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employee', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'performance'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    }
  });

  const originalName = employeeQuery.data?.employee
    ? `${employeeQuery.data.employee.firstName} ${employeeQuery.data.employee.lastName}`
    : '';
  const managers = managersQuery.data || [];
  const branches = branchesQuery.data || [];
  const shifts = shiftsQuery.data || [];

  const loading =
    employeeQuery.isLoading || managersQuery.isLoading || branchesQuery.isLoading || shiftsQuery.isLoading;

  const filteredManagers = managers.filter((m) => {
    const searchString = `${m.firstName} ${m.lastName} ${m.employeeId}`.toLowerCase();
    return searchString.includes(managerSearch.toLowerCase());
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateEmployeeMutation.mutateAsync();
      toast.success('Employee updated successfully');
      navigate(`/admin/employees/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader message="Loading employee data..." />;
  }

  return (
    <div className="space-y-5 w-full pb-12 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
              Edit profile: {originalName}
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)]">
              {formData.employeeId}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Update personal records, assignments, compensation, and work logistics
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate(`/admin/employees/${id}`)}
          className="h-9 px-4 rounded-full font-medium text-xs justify-center shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft size={14} />
          <span>Back to profile</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Info Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
          <div className="pb-3 border-b border-[var(--line)] flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <User size={15} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Personal information</h3>
              <p className="text-[11px] text-[var(--muted)]">Primary contact and demographic records</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">First name *</label>
                <input
                  required
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Last name *</label>
                <input
                  required
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Personal email *</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Phone number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Marital status</label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Residential address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">PAN number</label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Date of birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Blood group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--line)]">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Emergency contact name (Self-service managed)
                </label>
                <input
                  readOnly
                  type="text"
                  value={formData.emergencyContact || ''}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] px-3.5 text-xs text-[var(--muted)] outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Emergency contact phone (Self-service managed)
                </label>
                <input
                  readOnly
                  type="text"
                  value={formData.emergencyPhone || ''}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface-alt)] px-3.5 text-xs text-[var(--muted)] outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Work Info Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
          <div className="pb-3 border-b border-[var(--line)] flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Briefcase size={15} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Work profile &amp; assignments</h3>
              <p className="text-[11px] text-[var(--muted)]">Position, reporting structure, and compensation</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Official work email</label>
                <input
                  type="email"
                  name="workEmail"
                  value={formData.workEmail}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Position / role *</label>
                <input
                  required
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Department *</label>
                <input
                  required
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Assigned branch</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Reporting manager</label>
                <input
                  type="text"
                  value={managerSearch}
                  onChange={(e) => {
                    setManagerSearch(e.target.value);
                    setFormData((prev) => ({ ...prev, managerId: '' }));
                    setShowManagerDropdown(true);
                  }}
                  onFocus={() => setShowManagerDropdown(true)}
                  onBlur={() => setShowManagerDropdown(false)}
                  placeholder="Search manager by name or ID..."
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
                {showManagerDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-[var(--surface)] border border-[var(--line)] rounded-[14px] shadow-[0_24px_60px_rgba(19,19,21,0.18)] max-h-48 overflow-y-auto p-1 text-xs">
                    <div
                      className="px-3 py-2 rounded-[8px] cursor-pointer hover:bg-[var(--surface-alt)] text-[var(--muted)]"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFormData((prev) => ({ ...prev, managerId: '' }));
                        setManagerSearch('');
                        setShowManagerDropdown(false);
                      }}
                    >
                      No manager (Direct executive)
                    </div>
                    {filteredManagers.map((m) => (
                      <div
                        key={m.id}
                        className="px-3 py-2 rounded-[8px] cursor-pointer hover:bg-[var(--brand-tint)] text-[var(--text)] font-medium"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData((prev) => ({ ...prev, managerId: m.id }));
                          setManagerSearch(`${m.firstName} ${m.lastName} (${m.employeeId})`);
                          setShowManagerDropdown(false);
                        }}
                      >
                        {m.firstName} {m.lastName}{' '}
                        <span className="text-[var(--muted)] font-normal">({m.employeeId})</span>
                      </div>
                    ))}
                    {filteredManagers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-[var(--muted)] italic">No matching managers found</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Employment type</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select type</option>
                  <option value="full-time">Full time</option>
                  <option value="part-time">Part time</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Notice period (Days)</label>
                <input
                  type="number"
                  name="noticePeriod"
                  value={formData.noticePeriod}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Monthly salary (₹) {employeeQuery.data?.employee?.salary == null ? "— restricted" : ""}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs font-medium pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    name="salary"
                    disabled={employeeQuery.data?.employee?.salary == null}
                    value={formData.salary ?? ""}
                    onChange={handleChange}
                    className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] pl-8 pr-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Joining date</label>
                <input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Work Shift Card */}
        <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
          <div className="pb-3 border-b border-[var(--line)] flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Clock size={15} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">Shift &amp; workplace logistics</h3>
              <p className="text-[11px] text-[var(--muted)]">Shift timings, work mode, and regular off days</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Shift time</label>
                <select
                  name="shiftTime"
                  value={formData.shiftTime}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.shiftLabel}>
                      {s.shiftLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Work mode</label>
                <select
                  name="workMode"
                  value={formData.workMode}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select mode</option>
                  <option value="office">Office</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Weekly off day</label>
                <select
                  name="weekOff"
                  value={formData.weekOff}
                  onChange={handleChange}
                  className="w-full h-10 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select day</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/admin/employees/${id}`)}
            className="h-10 px-5 rounded-full text-xs font-medium"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            loading={saving}
            className="h-10 px-6 rounded-full text-xs font-medium justify-center"
          >
            <Save size={14} />
            <span>Save changes</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminEmployeeEdit;
