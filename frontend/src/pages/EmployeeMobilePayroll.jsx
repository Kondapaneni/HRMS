import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Download, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  X,
  Calendar,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Receipt,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';

const EmployeeMobilePayroll = ({ profile }) => {
  const { data: payslips = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'payroll'],
    queryFn: async () => {
      const res = await api.get('/employee/payroll');
      return res.data?.payslips || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const latestPayslip = payslips?.[0];
  
  const getBasicSalary = (earnings) => {
    if (!earnings) return 0;
    const basic = earnings.find(e => e.label.toLowerCase().includes('basic'));
    return basic ? parseFloat(basic.value) : 0;
  };

  const getAllowances = (earnings) => {
    if (!earnings) return 0;
    const allowances = earnings.filter(e => !e.label.toLowerCase().includes('basic'));
    return allowances.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
  };

  const getTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
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
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleDownload = async (e, payslip) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      toast.loading('Preparing download...', { id: 'download-toast' });
      const formattedPayslip = {
        ...payslip,
        employeeName: payslip.employeeName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Employee',
        employeeCode: payslip.employeeCode || payslip.details?.employeeNumber || profile?.employeeId || 'N/A'
      };
      
      const blob = await pdf(<PayslipPDF payslip={formattedPayslip} />).toBlob();
      const fileName = `${formattedPayslip.employeeName.replace(/[^a-zA-Z0-9 _-]/g, '')} - Payslip - ${getMonthYearString(payslip.month, payslip.year)}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.dismiss('download-toast');
        await navigator.share({
          files: [file],
          title: 'Payslip',
          text: 'Here is your payslip PDF.',
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success('Download started', { id: 'download-toast' });
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF document.', { id: 'download-toast' });
    }
  };

  if (loading) return <PageLoader message="Loading Compensation Details..." />;

  const latestBasic = latestPayslip ? getBasicSalary(latestPayslip.earnings) : 0;
  const latestAllowances = latestPayslip ? getAllowances(latestPayslip.earnings) : 0;
  const latestDeductions = latestPayslip ? getTotal(latestPayslip.deductions) : 0;
  const latestNet = latestPayslip ? (latestPayslip.netSalary || 0) : 0;

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
                Salary &amp; Compensation
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              My Payroll
            </h1>
            <p className="text-xs text-[#5f6368]">
              Official compensation breakdown and payslip statements
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Latest Salary Highlight Banner */}
      {latestPayslip && (
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e7]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Recent Pay Cycle</span>
              <h3 className="text-sm font-bold text-[#1f1f1f]">
                {getMonthYearString(latestPayslip.month, latestPayslip.year)}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
              {latestPayslip.status || 'Disbursed'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-[#5f6368] uppercase">Net Take-Home Pay</p>
              <p className="text-2xl font-bold text-[#1a73e8] tracking-tight mt-0.5">
                {formatCurrency(latestNet)}
              </p>
            </div>

            <button 
              type="button"
              onClick={() => setSelectedPayslip(latestPayslip)}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] transition-all cursor-pointer shadow-2xs"
            >
              View Breakdown
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Grid (2x2) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Basic Salary */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Basic Pay</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1f1f1f]">{formatCurrency(latestBasic)}</p>
          <p className="text-[10px] text-[#5f6368]">Base contract</p>
        </div>

        {/* Allowances */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Allowances</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#137333]">+{formatCurrency(latestAllowances)}</p>
          <p className="text-[10px] text-[#5f6368]">HRA &amp; special</p>
        </div>

        {/* Deductions */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Deductions</span>
            <div className="p-1.5 rounded-lg bg-[#fce8e6] text-[#c5221f]">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#c5221f]">-{formatCurrency(latestDeductions)}</p>
          <p className="text-[10px] text-[#5f6368]">Tax &amp; PF</p>
        </div>

        {/* Net Take-Home */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Net Pay</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#8430ce]">{formatCurrency(latestNet)}</p>
          <p className="text-[10px] text-[#5f6368]">Bank transfer</p>
        </div>
      </div>

      {/* Payslip Archive Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f1f1f]">Payslip Archive</h3>
          <span className="text-[10px] text-[#5f6368]">{payslips.length} Statements</span>
        </div>

        {payslips.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-[#e0e3e7] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[#5f6368] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No payslips available</p>
            <p className="text-[11px] text-[#5f6368]">Your monthly payroll statements will appear here once processed.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {payslips.map((ps) => (
              <div 
                key={ps.id} 
                className="bg-white p-4 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f1f1f]">
                        {getMonthYearString(ps.month, ps.year)}
                      </h4>
                      <p className="text-[10px] text-[#5f6368]">
                        Status: <span className="capitalize text-[#137333] font-medium">{ps.status || 'Generated'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-[#1f1f1f]">{formatCurrency(ps.netSalary)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f1f3f4]">
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(ps)}
                    className="w-full py-2 rounded-full bg-[#f8fafd] border border-[#dadce0] hover:bg-[#e8f0fe] text-[#1f1f1f] text-xs font-semibold transition-all cursor-pointer text-center"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, ps)}
                    className="w-full py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payslip Breakdown Bottom Sheet Drawer (Mounted via createPortal) */}
      {selectedPayslip && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPayslip(null); }}
          className="fixed inset-0 z-[10000] flex flex-col justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-[#e0e3e7] w-full max-w-md mx-auto max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* Top 4-Color Gradient Line */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Bottom Sheet Header */}
            <div className="p-4 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1f1f1f]">
                    {getMonthYearString(selectedPayslip.month, selectedPayslip.year)} Payslip
                  </h3>
                  <p className="text-[10px] text-[#5f6368]">
                    {(selectedPayslip.employeeName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Employee')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-1.5 rounded-full hover:bg-[#e0e3e7]/60 text-[#5f6368] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Employee Summary Chip Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] text-xs">
                <div>
                  <span className="text-[9px] font-semibold text-[#5f6368] uppercase">Employee ID</span>
                  <p className="font-bold text-[#1f1f1f]">{selectedPayslip.employeeCode || selectedPayslip.details?.employeeNumber || profile?.employeeId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-[#5f6368] uppercase">Payable Days</span>
                  <p className="font-bold text-[#1f1f1f]">{selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}</p>
                </div>
              </div>

              {/* Earnings Table */}
              <div className="border border-[#e0e3e7] rounded-2xl overflow-hidden bg-white">
                <div className="bg-[#e6f4ea]/60 px-3.5 py-2 border-b border-[#e0e3e7]">
                  <span className="text-[11px] font-bold text-[#137333]">Earnings &amp; Allowances</span>
                </div>
                <div className="p-3 space-y-1.5 text-xs">
                  {selectedPayslip.earnings?.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 border-b border-[#f1f3f4] last:border-0">
                      <span className="text-[#5f6368]">{item.label}</span>
                      <span className="font-semibold text-[#1f1f1f]">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-[#e0e3e7] flex justify-between font-bold text-xs">
                    <span>Gross Earnings</span>
                    <span className="text-[#137333]">{formatCurrency(getTotal(selectedPayslip.earnings))}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="border border-[#e0e3e7] rounded-2xl overflow-hidden bg-white">
                <div className="bg-[#fce8e6]/60 px-3.5 py-2 border-b border-[#e0e3e7]">
                  <span className="text-[11px] font-bold text-[#c5221f]">Statutory Deductions</span>
                </div>
                <div className="p-3 space-y-1.5 text-xs">
                  {selectedPayslip.deductions?.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 border-b border-[#f1f3f4] last:border-0">
                      <span className="text-[#5f6368]">{item.label}</span>
                      <span className="font-semibold text-[#1f1f1f]">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-[#e0e3e7] flex justify-between font-bold text-xs">
                    <span>Total Deductions</span>
                    <span className="text-[#c5221f]">{formatCurrency(getTotal(selectedPayslip.deductions))}</span>
                  </div>
                </div>
              </div>

              {/* Net Disbursed Banner */}
              <div className="bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8]">Net Take-Home Salary</span>
                  <p className="text-[10px] text-[#5f6368]">Disbursed to Bank Account</p>
                </div>
                <span className="text-xl font-bold text-[#1a73e8]">{formatCurrency(selectedPayslip.netSalary)}</span>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="flex-1 py-2.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={(e) => handleDownload(e, selectedPayslip)}
                className="flex-1 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default EmployeeMobilePayroll;
