import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Download, 
  Eye, 
  IndianRupee, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  X,
  FileText,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import EmployeeMobilePayroll from './EmployeeMobilePayroll';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[var(--brand-tint)]',
      iconColor: 'text-[var(--brand-deep)]',
    },
    green: {
      iconBg: 'bg-[#E6F6EC]',
      iconColor: 'text-[#1F9D55]',
    },
    purple: {
      iconBg: 'bg-[var(--accent-pink-tint)]',
      iconColor: 'text-[var(--accent-pink-deep)]',
    },
    red: {
      iconBg: 'bg-[#FDE8EA]',
      iconColor: 'text-[#D64550]',
    },
    amber: {
      iconBg: 'bg-[#FDF3DC]',
      iconColor: 'text-[#B7791F]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 transition-all duration-200 hover:border-[var(--brand)]/40">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[var(--text)] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[var(--muted)] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-[14px] ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const EmployeePayroll = () => {
  const { profile } = useAuth();
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const { data: payslips = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'payroll'],
    queryFn: async () => {
      const res = await api.get('/employee/payroll');
      return res.data.payslips || [];
    },
    staleTime: 15 * 60 * 1000,
    onError: () => toast.error('Failed to load payroll data.'),
  });

  const latestPayslip = payslips[0];
  
  const getBasicSalary = (earnings = []) => {
    const basic = earnings.find(e => e.label?.toLowerCase().includes('basic'));
    return basic ? parseFloat(basic.value) || 0 : 0;
  };

  const getTotal = (items = []) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getMonthYearString = (month, year) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDownload = async (payslip) => {
    try {
      const formattedPayslip = {
        ...payslip,
        employeeName: payslip.employeeName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Employee',
        employeeCode: payslip.employeeCode || payslip.details?.employeeNumber || profile?.employeeId || 'N/A'
      };
      
      // Defer the ~1.4MB PDF engine until the user requests an actual download.
      // Navigating to a payroll or employee view must not require PDF rendering.
      const [{ pdf }, { default: PayslipPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/PayslipPDF'),
      ]);
      const blob = await pdf(<PayslipPDF payslip={formattedPayslip} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formattedPayslip.employeeName.replace(/[^a-zA-Z0-9 _-]/g, '')} - Payslip - ${getMonthYearString(payslip.month, payslip.year)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF document.');
    }
  };

  if (loading) return <PageLoader message="Loading Payroll Details..." />;

  const latestBasic = latestPayslip ? getBasicSalary(latestPayslip.earnings) : 0;
  const latestAllowances = latestPayslip ? getTotal(latestPayslip.earnings) - latestBasic : 0;
  const latestDeductions = latestPayslip ? getTotal(latestPayslip.deductions) : 0;
  const latestNet = latestPayslip ? (parseFloat(latestPayslip.netSalary) || 0) : 0;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EmployeeMobilePayroll profile={profile} />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Compensation &amp; statements</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>Payroll &amp; salary records</span>
              <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                {payslips.length} Statements
              </span>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Monthly compensation ledger, gross breakdown, statutory deductions, and downloadable payslip PDFs.
            </p>
          </div>
        </div>

        {/* Salary Summary KPI Cards */}
        <div className="grid gap-[14px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Monthly basic pay" 
            value={formatCurrency(latestBasic)} 
            subtitle="Base contract component" 
            icon={IndianRupee} 
          />
          <StatCard 
            title="Allowances &amp; HRA" 
            value={formatCurrency(latestAllowances)} 
            subtitle="Transport, special &amp; allowances" 
            icon={TrendingUp} 
          />
          <StatCard 
            title="Total deductions" 
            value={formatCurrency(latestDeductions)} 
            subtitle="Tax, PF, ESI &amp; withholdings" 
            icon={TrendingDown} 
          />
          <StatCard 
            title="Net take-home pay" 
            value={formatCurrency(latestNet)} 
            subtitle="Disbursed to bank account" 
            icon={Wallet} 
          />
        </div>

        {/* Payslip History Table Card */}
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden">
          <div className="p-6 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">Payslip Archive &amp; Statements</h3>
                <p className="text-xs text-[var(--muted)]">Download official signed compensation statements for your records</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[var(--muted)] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Pay Period</th>
                  <th className="p-4">Basic Salary</th>
                  <th className="p-4">Allowances</th>
                  <th className="p-4">Deductions</th>
                  <th className="p-4">Net Salary</th>
                  <th className="p-4">Disbursement</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[var(--muted)]">
                      Loading payslip archive...
                    </td>
                  </tr>
                ) : payslips.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[var(--muted)]">
                      No payslip records available yet.
                    </td>
                  </tr>
                ) : (
                  payslips.map((ps) => {
                    const basic = getBasicSalary(ps.earnings);
                    const allowances = getTotal(ps.earnings) - basic;
                    const deductions = getTotal(ps.deductions);
                    const isPaid = (ps.status || '').toLowerCase() === 'paid';
                    
                    return (
                      <tr key={ps.id} className="hover:bg-[var(--brand-tint)]/15 transition-colors">
                        <td className="p-4 font-semibold text-[var(--text)]">
                          {getMonthYearString(ps.month, ps.year)}
                        </td>
                        <td className="p-4 text-[var(--text)] font-semibold">
                          {formatCurrency(basic)}
                        </td>
                        <td className="p-4 text-[#1F9D55] font-semibold">
                          +{formatCurrency(allowances)}
                        </td>
                        <td className="p-4 text-[#D64550] font-semibold">
                          -{formatCurrency(deductions)}
                        </td>
                        <td className="p-4 text-[var(--text)] font-bold">
                          {formatCurrency(ps.netSalary)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            isPaid 
                              ? 'bg-[#E6F6EC] text-[#1F9D55]' 
                              : 'bg-[#FDF3DC] text-[#B7791F]'
                          }`}>
                            {isPaid && <CheckCircle2 className="w-3 h-3" />}
                            {ps.status ? ps.status.charAt(0).toUpperCase() + ps.status.slice(1) : 'Processed'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button"
                              onClick={() => setSelectedPayslip(ps)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-alt)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--text)] transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
                              <span>View</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDownload(ps)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--brand-tint)] hover:bg-[var(--brand-tint)]/80 text-[var(--brand-deep)] transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right Slideover Drawer with createPortal to blur entire viewport including sidebar */}
      {selectedPayslip && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPayslip(null); }}
          className="fixed inset-0 z-[10000] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[var(--surface)] text-[var(--text)] shadow-2xl w-full max-w-xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 antialiased">
            
            {/* Drawer Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  PAYROLL BREAKDOWN
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Payslip Breakdown
                </h2>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Employee Summary Chip Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[var(--surface-alt)] p-4 rounded-[18px] border border-[var(--line)]">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Employee ID</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">
                    {selectedPayslip.employeeCode || selectedPayslip.details?.employeeNumber || profile?.employeeId || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Designation</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5 truncate">
                    {selectedPayslip.details?.designation || profile?.position || 'Staff'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Payable Days</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">
                    {selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">LOP Days</p>
                  <p className="font-semibold text-[#D64550] mt-0.5">
                    {selectedPayslip.details?.lossOfPayDays ?? 0} Days
                  </p>
                </div>
              </div>

              {/* Earnings & Deductions Columns */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Earnings Box */}
                <div className="border border-[var(--line)] rounded-[18px] overflow-hidden bg-[var(--surface)]">
                  <div className="bg-[#E6F6EC]/60 px-4 py-2.5 border-b border-[var(--line)]">
                    <h4 className="text-xs font-semibold text-[#1F9D55]">Earnings &amp; Allowances</h4>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {selectedPayslip.earnings?.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-[var(--line)] last:border-0">
                        <span className="text-[var(--text-2)]">{item.label}</span>
                        <span className="font-semibold text-[var(--text)]">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-[var(--line)] flex justify-between font-bold">
                      <span className="text-[var(--text)]">Gross Earnings</span>
                      <span className="text-[#1F9D55]">
                        {formatCurrency(selectedPayslip.earnings?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions Box */}
                <div className="border border-[var(--line)] rounded-[18px] overflow-hidden bg-[var(--surface)]">
                  <div className="bg-[#FDE8EA]/60 px-4 py-2.5 border-b border-[var(--line)]">
                    <h4 className="text-xs font-semibold text-[#D64550]">Statutory Deductions</h4>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {selectedPayslip.deductions?.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-[var(--line)] last:border-0">
                        <span className="text-[var(--text-2)]">{item.label}</span>
                        <span className="font-semibold text-[var(--text)]">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-[var(--line)] flex justify-between font-bold">
                      <span className="text-[var(--text)]">Total Deductions</span>
                      <span className="text-[#D64550]">
                        {formatCurrency(selectedPayslip.deductions?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Net Disbursed Salary Banner */}
              <div className="bg-[var(--brand-tint)] border border-[var(--brand)]/30 rounded-[18px] p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-deep)]">Net Take-Home Salary</span>
                  <p className="text-[11px] text-[var(--muted)]">Disbursed to registered bank account</p>
                </div>
                <span className="text-2xl font-bold text-[var(--brand-deep)]">{formatCurrency(selectedPayslip.netSalary)}</span>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownload(selectedPayslip)}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </>
  );
};

export default EmployeePayroll;
