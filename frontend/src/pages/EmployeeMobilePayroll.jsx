import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { 
  Download, 
  IndianRupee, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  X,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  useEffect(() => {
    if (selectedPayslip) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [selectedPayslip]);

  const latestPayslip = payslips?.[0];
  
  const getBasicSalary = (earnings) => {
    if (!earnings) return 0;
    const basic = earnings.find(e => e.label?.toLowerCase().includes('basic'));
    return basic ? parseFloat(basic.value) || 0 : 0;
  };

  const getAllowances = (earnings) => {
    if (!earnings) return 0;
    return earnings
      .filter(e => !e.label?.toLowerCase().includes('basic'))
      .reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
  };

  const getTotal = (items) => {
    if (!items) return 0;
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
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
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

      // Use native Web Share API on mobile if available
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
    <div className="space-y-6 pb-4">

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 mb-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Finances</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Payroll & Salary</h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">View compensation breakdown & payslip archive</p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Grid (2x2 Compact Cards) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 -mt-10 mx-0.5">
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
          <p className="text-[10px] text-[#5f6368]">HRA & special</p>
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
          <p className="text-[10px] text-[#5f6368]">Tax & PF</p>
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
      </section>

      {/* Latest Salary Highlight Card */}
      {latestPayslip && (
        <section className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-4 mx-0.5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Pay Cycle</span>
              <h3 className="text-sm font-bold text-slate-800">
                {getMonthYearString(latestPayslip.month, latestPayslip.year)}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200/60">
              {latestPayslip.status || 'Disbursed'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Net Take-Home Pay</p>
              <p className="text-2xl font-black text-[#1a73e8] tracking-tight mt-0.5">
                {formatCurrency(latestNet)}
              </p>
            </div>

            <button 
              type="button"
              onClick={() => setSelectedPayslip(latestPayslip)}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              View Breakdown
            </button>
          </div>
        </section>
      )}

      {/* Payslip Archive Feed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Payslip Archive</h3>
          <span className="text-xs font-semibold text-slate-400">{payslips.length} Statements</span>
        </div>

        {payslips.length === 0 ? (
          <div className="bg-white p-8 rounded-[1.5rem] text-center border border-slate-200 shadow-sm space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
            <p className="text-sm font-bold text-slate-800">No payslips available</p>
            <p className="text-xs text-slate-500">Your monthly payroll statements will appear here once processed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payslips.map((ps) => (
              <div 
                key={ps.id} 
                className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {getMonthYearString(ps.month, ps.year)}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Status: <span className="capitalize text-emerald-600 font-bold">{ps.status || 'Generated'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-800">{formatCurrency(ps.netSalary)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(ps)}
                    className="w-full py-2 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer text-center active:scale-98"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, ps)}
                    className="w-full py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payslip Breakdown Bottom Sheet Drawer (Mounted via createPortal with Framer Motion) */}
      {createPortal(
        <AnimatePresence>
          {selectedPayslip && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
              {/* Smooth Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => setSelectedPayslip(null)}
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

                {/* Bottom Sheet Header */}
                <div className="px-5 py-3.5 border-b border-[#e0e3e7] flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] block">Payroll Breakdown</span>
                      <h3 className="text-sm font-bold text-[#1f1f1f]">
                        {getMonthYearString(selectedPayslip.month, selectedPayslip.year)} Payslip
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(null)}
                    className="w-8 h-8 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#5f6368] hover:text-[#1f1f1f] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  
                  {/* Employee Summary Chip Grid */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-[9.5px] font-semibold text-slate-500 uppercase">Employee ID</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedPayslip.employeeCode || selectedPayslip.details?.employeeNumber || profile?.employeeId || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-semibold text-slate-500 uppercase">Payable Days</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}</p>
                    </div>
                  </div>

                  {/* Earnings Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <div className="bg-emerald-50 px-3.5 py-2 border-b border-slate-200">
                      <span className="text-[11px] font-bold text-emerald-800">Earnings & Allowances</span>
                    </div>
                    <div className="p-3 space-y-1.5 text-xs">
                      {selectedPayslip.earnings?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between font-bold text-xs">
                        <span>Gross Earnings</span>
                        <span className="text-emerald-700">{formatCurrency(getTotal(selectedPayslip.earnings))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <div className="bg-rose-50 px-3.5 py-2 border-b border-slate-200">
                      <span className="text-[11px] font-bold text-rose-800">Statutory Deductions</span>
                    </div>
                    <div className="p-3 space-y-1.5 text-xs">
                      {selectedPayslip.deductions?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between font-bold text-xs">
                        <span>Total Deductions</span>
                        <span className="text-rose-700">{formatCurrency(getTotal(selectedPayslip.deductions))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Disbursed Banner */}
                  <div className="bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8]">Net Take-Home Salary</span>
                      <p className="text-[10px] text-slate-500">Disbursed to Bank Account</p>
                    </div>
                    <span className="text-xl font-black text-[#1a73e8]">{formatCurrency(selectedPayslip.netSalary)}</span>
                  </div>

                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(null)}
                    className="flex-1 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, selectedPayslip)}
                    className="flex-1 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
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

export default EmployeeMobilePayroll;
