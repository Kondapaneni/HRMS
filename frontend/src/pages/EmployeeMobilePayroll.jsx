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
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { employeeQueryOptions } from '../queries/employeeQueries';

const EmployeeMobilePayroll = ({ profile }) => {
  const controls = useDragControls();
  const { data: payslips = [], isLoading: loading } = useQuery(employeeQueryOptions.payroll());
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
      
      // Defer the ~1.4MB PDF engine until the user requests an actual download.
      // Navigating to a payroll or employee view must not require PDF rendering.
      const [{ pdf }, { default: PayslipPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/PayslipPDF'),
      ]);
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
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            My Finances
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight">
            Payroll & <span className="text-[var(--brand-deep)]">Salary</span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-0.5">
            View compensation breakdown & payslip archive
          </p>
        </div>
      </section>

      {/* KPI Stats Grid (2x2 Compact Cards) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 mx-0.5">
        {/* Basic Salary */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Basic Pay</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--text)]">{formatCurrency(latestBasic)}</p>
          <p className="text-[10px] text-[var(--muted)]">Base contract</p>
        </div>

        {/* Allowances */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Allowances</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)]">+{formatCurrency(latestAllowances)}</p>
          <p className="text-[10px] text-[var(--muted)]">HRA & special</p>
        </div>

        {/* Deductions */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Deductions</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-danger-text)]">-{formatCurrency(latestDeductions)}</p>
          <p className="text-[10px] text-[var(--muted)]">Tax & PF</p>
        </div>

        {/* Net Take-Home */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Net Pay</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--accent-pink-deep)]">{formatCurrency(latestNet)}</p>
          <p className="text-[10px] text-[var(--muted)]">Bank transfer</p>
        </div>
      </section>

      {/* Latest Salary Highlight Card */}
      {latestPayslip && (
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs p-4 mx-0.5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--line)]">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Recent Pay Cycle</span>
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {getMonthYearString(latestPayslip.month, latestPayslip.year)}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20">
              {latestPayslip.status || 'Disbursed'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div>
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase">Net Take-Home Pay</p>
              <p className="text-2xl font-bold text-[var(--text)] tracking-tight mt-0.5">
                {formatCurrency(latestNet)}
              </p>
            </div>

            <button 
              type="button"
              onClick={() => setSelectedPayslip(latestPayslip)}
              className="px-3.5 py-2 rounded-full text-xs font-semibold bg-[var(--brand-tint)] hover:opacity-90 text-[var(--brand-deep)] transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              View Breakdown
            </button>
          </div>
        </section>
      )}

      {/* Payslip Archive Feed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">
            Payslip <span className="text-[var(--brand-deep)]">Archive</span>
          </h3>
          <span className="text-xs font-medium text-[var(--muted)]">{payslips.length} Statements</span>
        </div>

        {payslips.length === 0 ? (
          <div className="bg-[var(--surface)] p-8 rounded-[20px] text-center border border-[var(--line)] shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-[var(--muted)] mx-auto opacity-60" />
            <p className="text-sm font-semibold text-[var(--text)]">No payslips available</p>
            <p className="text-xs text-[var(--muted)]">Your monthly payroll statements will appear here once processed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payslips.map((ps) => (
              <div 
                key={ps.id} 
                className="bg-[var(--surface)] p-4 rounded-[20px] border border-[var(--line)] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text)]">
                        {getMonthYearString(ps.month, ps.year)}
                      </h4>
                      <p className="text-[10px] text-[var(--muted)] font-medium">
                        Status: <span className="capitalize text-[var(--status-success-text)] font-semibold">{ps.status || 'Generated'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-[var(--text)]">{formatCurrency(ps.netSalary)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(ps)}
                    className="w-full py-2 rounded-full bg-[var(--surface-alt)] border border-[var(--line)] hover:bg-[var(--surface)] text-[var(--text)] text-xs font-semibold transition-all cursor-pointer text-center active:scale-98"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, ps)}
                    className="w-full py-2 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
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

      {/* Payslip Breakdown Bottom Sheet Drawer */}
      {createPortal(
        <AnimatePresence>
          {selectedPayslip && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => setSelectedPayslip(null)}
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
                    setSelectedPayslip(null);
                  }
                }}
                className="bg-[var(--surface)] rounded-t-[28px] shadow-2xl border-t border-[var(--line)] w-full max-w-md mx-auto max-h-[85vh] flex flex-col overflow-hidden relative z-10 font-sans antialiased text-[var(--text)]"
              >
                {/* Top Drag Handle Bar */}
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
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block">Payroll Breakdown</span>
                      <h3 className="text-sm font-semibold text-[var(--text)]">
                        {getMonthYearString(selectedPayslip.month, selectedPayslip.year)} <span className="text-[var(--brand-deep)]">Payslip</span>
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(null)}
                    className="w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  
                  {/* Employee Summary Chip Grid */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] text-xs">
                    <div>
                      <span className="text-[9.5px] font-semibold text-[var(--muted)] uppercase">Employee ID</span>
                      <p className="font-semibold text-[var(--text)] mt-0.5">{selectedPayslip.employeeCode || selectedPayslip.details?.employeeNumber || profile?.employeeId || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-semibold text-[var(--muted)] uppercase">Payable Days</span>
                      <p className="font-semibold text-[var(--text)] mt-0.5">{selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}</p>
                    </div>
                  </div>

                  {/* Earnings Table */}
                  <div className="border border-[var(--line)] rounded-[14px] overflow-hidden bg-[var(--surface)]">
                    <div className="bg-[var(--status-success-bg)] px-3.5 py-2 border-b border-[var(--line)]">
                      <span className="text-[11px] font-semibold text-[var(--status-success-text)]">Earnings & Allowances</span>
                    </div>
                    <div className="p-3 space-y-1.5 text-xs">
                      {selectedPayslip.earnings?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-[var(--line)] last:border-0">
                          <span className="text-[var(--text-2)]">{item.label}</span>
                          <span className="font-semibold text-[var(--text)]">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-[var(--line)] flex justify-between font-semibold text-xs">
                        <span>Gross Earnings</span>
                        <span className="text-[var(--status-success-text)]">{formatCurrency(getTotal(selectedPayslip.earnings))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Table */}
                  <div className="border border-[var(--line)] rounded-[14px] overflow-hidden bg-[var(--surface)]">
                    <div className="bg-[var(--status-danger-bg)] px-3.5 py-2 border-b border-[var(--line)]">
                      <span className="text-[11px] font-semibold text-[var(--status-danger-text)]">Statutory Deductions</span>
                    </div>
                    <div className="p-3 space-y-1.5 text-xs">
                      {selectedPayslip.deductions?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-[var(--line)] last:border-0">
                          <span className="text-[var(--text-2)]">{item.label}</span>
                          <span className="font-semibold text-[var(--text)]">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-[var(--line)] flex justify-between font-semibold text-xs">
                        <span>Total Deductions</span>
                        <span className="text-[var(--status-danger-text)]">{formatCurrency(getTotal(selectedPayslip.deductions))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Disbursed Banner */}
                  <div className="bg-[var(--brand-tint)] border border-[var(--brand)]/20 rounded-[14px] p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-deep)]">Net Take-Home Salary</span>
                      <p className="text-[10px] text-[var(--muted)]">Disbursed to Bank Account</p>
                    </div>
                    <span className="text-xl font-bold text-[var(--brand-deep)]">{formatCurrency(selectedPayslip.netSalary)}</span>
                  </div>

                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)] flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(null)}
                    className="flex-1 py-2.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-xs font-semibold text-[var(--text)] transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, selectedPayslip)}
                    className="flex-1 py-2.5 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
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
