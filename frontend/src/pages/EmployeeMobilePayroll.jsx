import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { Download, IndianRupee, TrendingDown, TrendingUp, Wallet, AlertCircle, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
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
  const controls = useDragControls();

  useEffect(() => {
    // Intentionally empty: Removing body.style.overflow = 'hidden' to prevent 
    // the notorious iOS Safari safe-area inset glitch (gray status bar bug).
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
    const basic = earnings.find(e => e.label.toLowerCase().includes('basic'));
    return basic ? basic.value : 0;
  };

  const getTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + parseFloat(item.value), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMonthYearString = (month, year) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const numberToWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty ','Thirty ','Forty ','Fifty ', 'Sixty ','Seventy ','Eighty ','Ninety '];

    const parsedNum = Math.floor(Number(num));
    if (isNaN(parsedNum) || parsedNum === 0) return 'Zero Rupees Only';
    if (parsedNum.toString().length > 9) return 'Amount too large';

    const n = ('000000000' + parsedNum).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
    return str.trim() + ' Rupees Only';
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

      // Use native Web Share API on mobile to avoid Safari tab/bfcache bugs
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

  if (loading) return <PageLoader message="Loading Payroll..." />;

  return (
    <div className="space-y-6 pb-2">
      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
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
              <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Payroll</h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">View salary details</p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Salary Overview */}
      <section className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-lg relative z-20 -mt-10 mx-1">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Latest Salary</h3>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <Wallet className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{latestPayslip ? formatCurrency(latestPayslip.netSalary) : '₹0'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Net Take Home</p>
            </div>
          </div>
          <button 
            onClick={() => latestPayslip && setSelectedPayslip(latestPayslip)}
            className="text-xs font-bold bg-[#84dcc6]/20 text-teal-700 px-3 py-1.5 rounded-full"
          >
            View Details
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-slate-500">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Earnings</p>
            </div>
            <p className="text-sm font-black text-slate-800">{latestPayslip ? formatCurrency(getTotal(latestPayslip.earnings)) : '₹0'}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-slate-500">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Deductions</p>
            </div>
            <p className="text-sm font-black text-slate-800">{latestPayslip ? formatCurrency(getTotal(latestPayslip.deductions)) : '₹0'}</p>
          </div>
        </div>
      </section>

      {/* History List */}
      <section className="space-y-4 px-1">
        <h3 className="text-lg font-black text-slate-900 tracking-tight px-1">Payslip History</h3>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff686b] mx-auto"></div>
          </div>
        ) : !payslips || payslips.length === 0 ? (
          <div className="bg-white p-8 rounded-[2rem] text-center border border-slate-200 shadow-sm">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No payslips found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payslips.map((ps) => {
              return (
                <button 
                  key={ps.id} 
                  onClick={() => setSelectedPayslip(ps)}
                  className="w-full bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                          {getMonthYearString(ps.month, ps.year)}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 capitalize">
                          Status: {ps.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-800">{formatCurrency(ps.netSalary)}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail Slide-Over Modal */}
      <AnimatePresence>
        {selectedPayslip && (
          <div className="fixed inset-x-0 top-0 bottom-0 z-[100] flex flex-col justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPayslip(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl h-[80dvh] flex flex-col"
            >
              <div 
                className="shrink-0 pt-3 pb-4 flex flex-col items-center cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => controls.start(e)}
                style={{ touchAction: 'none' }}
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4 pointer-events-none"></div>
                <div className="px-6 w-full flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 uppercase">
                    {getMonthYearString(selectedPayslip.month, selectedPayslip.year)} Payslip
                  </h3>
                  <button 
                    onClick={() => setSelectedPayslip(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 pb-8 overscroll-contain space-y-6">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Emp ID</p>
                      <p className="font-bold text-slate-800">{profile?.employeeId || profile?.id?.substring(0, 8) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Role</p>
                      <p className="font-bold text-slate-800 capitalize">{profile?.role || profile?.position || 'Employee'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    </div>
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider">Earnings</h4>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
                    {selectedPayslip.earnings.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-black text-sm border-t border-slate-100 pt-3">
                      <span className="text-slate-900 uppercase text-[11px] tracking-wider">Total</span>
                      <span className="text-emerald-500">{formatCurrency(getTotal(selectedPayslip.earnings))}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                      <TrendingDown className="w-3 h-3 text-rose-600" />
                    </div>
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider">Deductions</h4>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
                    {selectedPayslip.deductions.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-black text-sm border-t border-slate-100 pt-3">
                      <span className="text-slate-900 uppercase text-[11px] tracking-wider">Total</span>
                      <span className="text-rose-500">{formatCurrency(getTotal(selectedPayslip.deductions))}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-[20px] flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Net Salary</span>
                  <span className="text-4xl font-black text-emerald-600 tracking-tight mb-3">
                    {formatCurrency(selectedPayslip.netSalary)}
                  </span>
                  <div className="bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center block">
                      {numberToWords(selectedPayslip.netSalary)}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={(e) => handleDownload(e, selectedPayslip)}
                  className="w-full bg-[#84dcc6] text-slate-900 font-bold text-sm py-4 rounded-[16px] flex justify-center items-center gap-2 active:scale-[0.98] transition-all shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  Download PDF Payslip
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeMobilePayroll;
