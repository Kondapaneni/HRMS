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
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    red: {
      iconBg: 'bg-[#fce8e6]',
      iconColor: 'text-[#c5221f]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
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

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Compensation &amp; Statements</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Payroll &amp; Salary Records <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">{payslips.length} Statements</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Monthly compensation ledger, gross breakdown, statutory deductions, and downloadable payslip PDFs.
            </p>
          </div>
        </div>

        {/* Salary Summary KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Monthly Basic Pay" 
            value={formatCurrency(latestBasic)} 
            subtitle="Base contract component" 
            icon={IndianRupee} 
            colorTheme="blue" 
          />
          <StatCard 
            title="Allowances &amp; HRA" 
            value={formatCurrency(latestAllowances)} 
            subtitle="Transport, special &amp; allowances" 
            icon={TrendingUp} 
            colorTheme="green" 
          />
          <StatCard 
            title="Total Deductions" 
            value={formatCurrency(latestDeductions)} 
            subtitle="Tax, PF, ESI &amp; withholdings" 
            icon={TrendingDown} 
            colorTheme="red" 
          />
          <StatCard 
            title="Net Take-Home Pay" 
            value={formatCurrency(latestNet)} 
            subtitle="Disbursed to bank account" 
            icon={Wallet} 
            colorTheme="purple" 
          />
        </div>

        {/* Payslip History Table Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          <div className="p-6 border-b border-[#e0e3e7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f]">Payslip Archive &amp; Statements</h3>
                <p className="text-xs text-[#5f6368]">Download official signed compensation statements for your records</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider text-[10px]">
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
              <tbody className="divide-y divide-[#f1f3f4]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#5f6368]">
                      Loading payslip archive...
                    </td>
                  </tr>
                ) : payslips.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#5f6368]">
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
                      <tr key={ps.id} className="hover:bg-[#f8fafd] transition-colors">
                        <td className="p-4 font-semibold text-[#1f1f1f]">
                          {getMonthYearString(ps.month, ps.year)}
                        </td>
                        <td className="p-4 text-[#1f1f1f] font-semibold">
                          {formatCurrency(basic)}
                        </td>
                        <td className="p-4 text-[#137333] font-semibold">
                          +{formatCurrency(allowances)}
                        </td>
                        <td className="p-4 text-[#c5221f] font-semibold">
                          -{formatCurrency(deductions)}
                        </td>
                        <td className="p-4 text-[#1f1f1f] font-bold">
                          {formatCurrency(ps.netSalary)}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isPaid 
                              ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' 
                              : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f8fafd] border border-[#dadce0] hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#5f6368]" />
                              <span>View</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDownload(ps)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e8f0fe] border border-[#d2e3fc] hover:bg-[#d2e3fc] text-[#1a73e8] transition-all cursor-pointer shadow-2xs"
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
          className="fixed inset-0 z-[10000] flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white shadow-2xl w-full max-w-xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* 4-Color Gradient Top Line */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">
                    Payslip Breakdown Details
                  </h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    {(selectedPayslip.employeeName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Employee')} &bull; {getMonthYearString(selectedPayslip.month, selectedPayslip.year)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-1.5 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Employee Summary Chip Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7]">
                <div>
                  <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Employee ID</p>
                  <p className="font-semibold text-[#1f1f1f] mt-0.5">
                    {selectedPayslip.employeeCode || selectedPayslip.details?.employeeNumber || profile?.employeeId || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Designation</p>
                  <p className="font-semibold text-[#1f1f1f] mt-0.5 truncate">
                    {selectedPayslip.details?.designation || profile?.position || 'Staff'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Payable Days</p>
                  <p className="font-semibold text-[#1f1f1f] mt-0.5">
                    {selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">LOP Days</p>
                  <p className="font-semibold text-[#c5221f] mt-0.5">
                    {selectedPayslip.details?.lossOfPayDays ?? 0} Days
                  </p>
                </div>
              </div>

              {/* Earnings & Deductions Columns */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Earnings Box */}
                <div className="border border-[#e0e3e7] rounded-2xl overflow-hidden bg-white">
                  <div className="bg-[#e6f4ea]/50 px-4 py-2.5 border-b border-[#e0e3e7]">
                    <h4 className="text-xs font-semibold text-[#137333]">Earnings &amp; Allowances</h4>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {selectedPayslip.earnings?.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-[#f1f3f4] last:border-0">
                        <span className="text-[#5f6368]">{item.label}</span>
                        <span className="font-semibold text-[#1f1f1f]">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-[#e0e3e7] flex justify-between font-bold">
                      <span className="text-[#1f1f1f]">Gross Earnings</span>
                      <span className="text-[#137333]">
                        {formatCurrency(selectedPayslip.earnings?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions Box */}
                <div className="border border-[#e0e3e7] rounded-2xl overflow-hidden bg-white">
                  <div className="bg-[#fce8e6]/50 px-4 py-2.5 border-b border-[#e0e3e7]">
                    <h4 className="text-xs font-semibold text-[#c5221f]">Statutory Deductions</h4>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {selectedPayslip.deductions?.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-[#f1f3f4] last:border-0">
                        <span className="text-[#5f6368]">{item.label}</span>
                        <span className="font-semibold text-[#1f1f1f]">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-[#e0e3e7] flex justify-between font-bold">
                      <span className="text-[#1f1f1f]">Total Deductions</span>
                      <span className="text-[#c5221f]">
                        {formatCurrency(selectedPayslip.deductions?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Net Disbursed Salary Banner */}
              <div className="bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1a73e8]">Net Take-Home Salary</span>
                  <p className="text-[11px] text-[#5f6368]">Disbursed to registered bank account</p>
                </div>
                <span className="text-2xl font-bold text-[#1a73e8]">{formatCurrency(selectedPayslip.netSalary)}</span>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-5 py-2 rounded-full text-xs font-semibold text-[#1f1f1f] bg-white border border-[#dadce0] hover:bg-[#f1f3f4] transition-all cursor-pointer shadow-2xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownload(selectedPayslip)}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] transition-all cursor-pointer shadow-xs"
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
