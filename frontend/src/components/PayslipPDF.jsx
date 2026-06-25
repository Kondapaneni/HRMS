import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 15,
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    color: '#0f172a',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 10
  },
  companyName: {
    fontSize: 14,
    color: '#1e293b'
  },
  companyAddress: {
    color: '#64748b'
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 8
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
    opacity: 0.05
  },
  watermarkImage: {
    width: 350,
    height: 350
  },
  employeeName: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 10
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20
  },
  gridItem: {
    width: '25%',
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 8,
    paddingRight: 10
  },
  gridLabel: {
    color: '#94a3b8',
    fontSize: 8,
    marginBottom: 2
  },
  gridValue: {
    color: '#1e293b',
    fontSize: 10
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 14,
    color: '#1e293b'
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  column: {
    width: '48%'
  },
  sectionTitle: {
    fontSize: 10,
    color: '#1e293b',
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 4,
    marginBottom: 10
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  listLabel: {
    color: '#475569'
  },
  listValue: {
    color: '#1e293b'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 6,
    marginTop: 6
  },
  totalLabel: {
    color: '#1e293b'
  },
  totalValue: {
    color: '#1e293b'
  },
  netSalaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 6,
    marginBottom: 30
  },
  netSalaryLabel: {
    color: '#ffffff',
    fontSize: 12
  },
  netSalaryValue: {
    color: '#ffffff',
    fontSize: 18
  },
  footer: {
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 15,
    marginTop: 20
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    marginBottom: 2
  }
});

const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount);
  return `Rs. ${formatted}`;
};

const getMonthName = (monthNum) => {
  const date = new Date();
  date.setMonth(monthNum - 1);
  return date.toLocaleString('default', { month: 'long' });
};

function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  if (!num) return 'Zero Rupees only';
  
  const parsed = Math.round(parseFloat(num));
  if (isNaN(parsed) || parsed <= 0) return 'Zero Rupees only';
  
  const numStr = parsed.toString();
  if (numStr.length > 9) return 'overflow';
  
  let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return 'Zero Rupees only';
  
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees only' : 'Rupees only';
  return str.trim();
}

const PayslipPDF = ({ payslip }) => {
  if (!payslip) return null;

  const grossEarnings = payslip.earnings?.reduce((s, i) => s + parseFloat(i.value), 0) || 0;
  const totalDeductions = payslip.deductions?.reduce((s, i) => s + parseFloat(i.value), 0) || 0;

  const monthlySalary = parseFloat(payslip.details?.monthlySalary || 0);
  const visibleDeductions = payslip.deductions?.filter(d => {
    if (monthlySalary > 20000 && (d.label === 'Employee ESI' || d.label === 'Employer ESI')) {
      return false;
    }
    return true;
  }) || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <View style={styles.watermarkContainer} fixed>
          <Image src="/pwa-512x512.png" style={styles.watermarkImage} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PAYSLIP</Text>
            <Text style={styles.subtitle}>{getMonthName(payslip.month)} {payslip.year}</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.companyName}>Acme HRMS</Text>
              <Text style={styles.companyAddress}>123 Business Avenue, Tech District</Text>
              <Text style={styles.companyAddress}>San Francisco, CA 94107</Text>
            </View>
          </View>
          <Image src="/pwa-192x192.png" style={styles.logo} />
        </View>

        {/* Employee Details */}
        <Text style={styles.employeeName}>{payslip.employeeName}</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Employee Number</Text>
            <Text style={styles.gridValue}>{payslip.employeeCode}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Date Joined</Text>
            <Text style={styles.gridValue}>{payslip.details?.dateJoined || 'N/A'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Designation</Text>
            <Text style={styles.gridValue}>{payslip.details?.designation || 'N/A'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Date Of Birth</Text>
            <Text style={styles.gridValue}>{payslip.details?.dateOfBirth || 'N/A'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Location</Text>
            <Text style={styles.gridValue}>{payslip.details?.location || 'N/A'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Payment Mode</Text>
            <Text style={styles.gridValue}>{payslip.details?.paymentMode || 'Bank Transfer'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Monthly Salary</Text>
            <Text style={styles.gridValue}>{payslip.details?.monthlySalary || '0'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>PAN Number</Text>
            <Text style={styles.gridValue}>{payslip.details?.panNumber || 'N/A'}</Text>
          </View>
        </View>

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <View style={[styles.summaryItem, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
            <Text style={styles.summaryLabel}>Actual Payable Days</Text>
            <Text style={styles.summaryValue}>{payslip.details?.totalWorkingDays || 30.0}</Text>
          </View>
          <View style={[styles.summaryItem, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
            <Text style={styles.summaryLabel}>Total Working Days</Text>
            <Text style={styles.summaryValue}>{payslip.details?.totalWorkingDays || 30.0}</Text>
          </View>
          <View style={[styles.summaryItem, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
            <Text style={styles.summaryLabel}>Loss Of Pay Days</Text>
            <Text style={styles.summaryValue}>{payslip.details?.lossOfPayDays || 0}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Days Payable</Text>
            <Text style={styles.summaryValue}>{payslip.details?.daysPayable || 30}</Text>
          </View>
        </View>

        {/* Earnings & Deductions */}
        <View style={styles.detailsContainer}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            {payslip.earnings?.map((e, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listLabel}>{e.label}</Text>
                <Text style={styles.listValue}>{formatCurrency(e.value)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Gross Earnings</Text>
              <Text style={styles.totalValue}>{formatCurrency(grossEarnings)}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            {visibleDeductions.map((d, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listLabel}>{d.label}</Text>
                <Text style={styles.listValue}>{formatCurrency(d.value)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Deductions</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* Net Salary */}
        <View style={[styles.netSalaryBox, { backgroundColor: '#f8fafc', padding: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#1e293b', fontSize: 10 }}>Net Salary Payable ( A - B )</Text>
            <Text style={{ color: '#1e293b', fontSize: 10 }}>{formatCurrency(payslip.netSalary)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#1e293b', fontSize: 10 }}>Net Salary in words</Text>
            <Text style={{ color: '#1e293b', fontSize: 10, fontWeight: 'bold' }}>{numberToWords(payslip.netSalary)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This is a computer generated payslip and does not require a physical signature.</Text>
          <Text style={styles.footerText}>Acme HRMS © {new Date().getFullYear()}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PayslipPDF;
