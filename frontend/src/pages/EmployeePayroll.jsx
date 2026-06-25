import React, { useState } from 'react';
import { Download, Eye, IndianRupee, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import EmployeeMobilePayroll from './EmployeeMobilePayroll';
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';

const EmployeePayroll = () => {
  const { profile } = useAuth();
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const { data: payslips = [], isLoading: loading } = useQuery({
    queryKey: ['employee', 'payroll'],
    queryFn: async () => {
      const res = await api.get('/employee/payroll');
      return res.data.payslips;
    },
    staleTime: 15 * 60 * 1000, // payroll rarely changes — 15 min cache
    onError: () => toast.error('Failed to load payroll data.'),
  });

  const latestPayslip = payslips[0];
  
  const getBasicSalary = (earnings) => {
    const basic = earnings.find(e => e.label.toLowerCase().includes('basic'));
    return basic ? basic.value : 0;
  };

  const getTotal = (items) => {
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
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
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

  return (
    <>
      <div className="md:hidden">
        <EmployeeMobilePayroll profile={profile} />
      </div>
      <div className="hidden md:block space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payroll</h1>
          <p className="text-sm text-slate-500 mt-1">View your salary details and download payslips</p>
        </div>

      {/* Salary Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-slate-600">Basic Salary</h3>
            <IndianRupee className="h-4 w-4 text-slate-400" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              {latestPayslip ? formatCurrency(getBasicSalary(latestPayslip.earnings)) : '₹0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">monthly</p>
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-slate-600">Allowances</h3>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-green-600">
              {latestPayslip ? formatCurrency(getTotal(latestPayslip.earnings) - getBasicSalary(latestPayslip.earnings)) : '₹0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">HRA, Transport, etc.</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-slate-600">Deductions</h3>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-red-600">
              {latestPayslip ? formatCurrency(getTotal(latestPayslip.deductions)) : '₹0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Tax, PF, Insurance</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
          <div className="p-6 flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-slate-600">Net Salary</h3>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {latestPayslip ? formatCurrency(latestPayslip.netSalary) : '₹0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">take home</p>
          </div>
        </div>
      </div>

      {/* Payslip Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            Payslip History
          </h3>
          <p className="text-sm text-slate-500 mt-1">View and download your monthly payslips</p>
        </div>
        <div className="p-6 pt-0">
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3">Basic Salary</th>
                  <th className="p-3">Allowances</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Salary</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">Loading payslips...</td>
                  </tr>
                ) : payslips.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">No payslips found.</td>
                  </tr>
                ) : (
                  payslips.map((ps) => {
                    const basic = getBasicSalary(ps.earnings);
                    const allowances = getTotal(ps.earnings) - basic;
                    const deductions = getTotal(ps.deductions);
                    
                    return (
                      <tr key={ps.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700">{getMonthYearString(ps.month, ps.year)}</td>
                        <td className="p-3 text-slate-600">{formatCurrency(basic)}</td>
                        <td className="p-3 text-green-600">+{formatCurrency(allowances)}</td>
                        <td className="p-3 text-red-600">-{formatCurrency(deductions)}</td>
                        <td className="p-3 font-semibold text-slate-800">{formatCurrency(ps.netSalary)}</td>
                        <td className="p-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            ps.status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {ps.status.charAt(0).toUpperCase() + ps.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedPayslip(ps)}
                              className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View Breakdown"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDownload(ps)}
                              className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
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

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="relative z-[100]">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPayslip(null)} />

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-xl font-bold leading-6 text-slate-900">
                      Payslip Details
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {(selectedPayslip.employeeName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Employee')} - {getMonthYearString(selectedPayslip.month, selectedPayslip.year)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPayslip(null)}
                    className="rounded-full p-1.5 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-slate-500">Employee ID:</p>
                      <p className="font-semibold text-slate-900">
                        {selectedPayslip.employeeCode || selectedPayslip.details?.employeeNumber || profile?.employeeId || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Designation:</p>
                      <p className="font-semibold text-slate-900">
                        {selectedPayslip.details?.designation || profile?.position || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Payable Days:</p>
                      <p className="font-semibold text-slate-900">
                        {selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Loss of Pay (Days):</p>
                      <p className="font-semibold text-slate-900">
                        {selectedPayslip.details?.lossOfPayDays ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Earnings */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h4 className="font-semibold text-slate-800">Earnings</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        {selectedPayslip.earnings?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-600">{item.label}</span>
                            <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                        <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between font-semibold">
                          <span className="text-slate-900">Gross Earnings</span>
                          <span className="text-green-600">
                            {formatCurrency(selectedPayslip.earnings?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h4 className="font-semibold text-slate-800">Deductions</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        {selectedPayslip.deductions?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-600">{item.label}</span>
                            <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                        <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between font-semibold">
                          <span className="text-slate-900">Total Deductions</span>
                          <span className="text-red-600">
                            {formatCurrency(selectedPayslip.deductions?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-900">Net Salary</span>
                    <span className="text-2xl font-bold text-blue-700">{formatCurrency(selectedPayslip.netSalary)}</span>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default EmployeePayroll;
