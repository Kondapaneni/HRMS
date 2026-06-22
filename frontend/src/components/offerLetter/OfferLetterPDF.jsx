import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts if needed. For now we use standard fonts, but we can configure this later.
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf'
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica', // Built-in PDF font to avoid loading external fonts unnecessarily, though we can use Inter if needed.
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb'
  },
  logoContainer: {
    width: '60%'
  },
  companyName: {
    fontSize: 28,
    color: '#1E1B4B',
    fontWeight: 'bold',
    marginBottom: 4
  },
  companyDetails: {
    fontSize: 10,
    color: '#475569'
  },
  contactInfo: {
    width: '40%',
    alignItems: 'flex-end',
    fontSize: 9,
    color: '#475569'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1
  },
  metaData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  toSection: {
    width: '50%'
  },
  dateSection: {
    width: '50%',
    alignItems: 'flex-end'
  },
  textRow: {
    fontSize: 11,
    marginBottom: 4,
    color: '#334155'
  },
  boldText: {
    fontWeight: 'bold',
    fontSize: 11,
    color: '#0f172a'
  },
  subjectLine: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#0f172a'
  },
  bodyText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155',
    marginBottom: 15,
    textAlign: 'justify'
  },
  signatureSection: {
    marginTop: 60
  },
  signatureImage: {
    width: 120,
    height: 60,
    marginBottom: 10
  },
  signatureLine: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    marginTop: 30,
    marginBottom: 5
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  signatureTitle: {
    fontSize: 10,
    color: '#475569'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  }
});

const OfferLetterPDF = ({ data }) => {
  const {
    firstName,
    lastName,
    date,
    jobTitle,
    department,
    joiningDate,
    salary,
    deadlineDate,
    companyAddress = '123 Tech Park, Innovation Valley, TX 75001',
    companyPhone = '+1 (555) 123-4567',
    companyEmail = 'hr@acme-hrms.com',
    companyWebsite = 'www.acme-hrms.com'
  } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.companyName}>ACME HRMS</Text>
            <Text style={styles.companyDetails}>{companyAddress}</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={{ marginBottom: 2 }}>{companyPhone}</Text>
            <Text style={{ marginBottom: 2 }}>{companyEmail}</Text>
            <Text>{companyWebsite}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>JOB OFFER LETTER</Text>

        {/* Meta Data */}
        <View style={styles.metaData}>
          <View style={styles.toSection}>
            <Text style={styles.textRow}>To:</Text>
            <Text style={styles.boldText}>{firstName} {lastName}</Text>
          </View>
          <View style={styles.dateSection}>
            <Text style={styles.textRow}>{date}</Text>
          </View>
        </View>

        {/* Subject */}
        <Text style={styles.subjectLine}>
          Subject: Offer of Employment – {jobTitle}
        </Text>

        {/* Body */}
        <Text style={styles.bodyText}>
          Dear {firstName} {lastName},
        </Text>

        <Text style={styles.bodyText}>
          We are pleased to offer you the position of {jobTitle} with our
          organization. Based on our discussions and evaluation process, we are
          confident that your skills, experience, and dedication will contribute
          significantly to the growth and success of the company.
        </Text>

        <Text style={styles.bodyText}>
          Your employment will commence on {joiningDate} and you will be assigned
          to the {department} department. Your appointment will initially be
          governed by the company's policies, appointment terms, and assigned
          responsibilities. Detailed employment terms and responsibilities will be
          shared during your onboarding process.
        </Text>

        <Text style={styles.bodyText}>
          Your compensation package shall be {salary}. In addition to your fixed
          remuneration, you will be eligible for benefits, incentives, and other
          facilities as per company policies and applicable regulations.
        </Text>

        <Text style={styles.bodyText}>
          Your performance will be evaluated periodically based on your assigned
          responsibilities, business objectives, and overall contribution to the
          organization. Future salary revisions, promotions, and career growth
          opportunities will be based on your performance and organizational
          requirements.
        </Text>

        <Text style={styles.bodyText}>
          If you wish to resign from your position, the applicable notice period
          and separation policies of the organization shall apply. You will also
          be expected to comply with all company rules, confidentiality
          requirements, and professional standards throughout your employment.
        </Text>

        <Text style={styles.bodyText}>
          To complete your employment formalities, you may be required to submit
          supporting documents including identity proof, address proof,
          educational certificates, photographs, bank account details, and any
          other documents requested by the Human Resources department.
        </Text>

        <Text style={styles.bodyText}>
          Please confirm your acceptance of this offer on or before {deadlineDate}.
          Upon acceptance, further details regarding joining formalities,
          orientation, and onboarding procedures will be communicated to you.
        </Text>

        <Text style={styles.bodyText}>
          We are excited about the opportunity to have you join our team and look
          forward to your valuable contribution. We wish you a successful and
          rewarding career with our organization.
        </Text>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.bodyText}>Sincerely,</Text>

          <View style={styles.signatureLine} />

          <Text style={styles.signatureName}>
            Authorized Signatory
          </Text>

          <Text style={styles.signatureTitle}>
            Human Resources Department
          </Text>

          <Text style={styles.signatureTitle}>
            ACME HRMS
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Acceptance of this offer constitutes agreement to the terms and
          conditions of employment. This document may be executed electronically
          and shall be considered valid without a physical signature.
        </Text>

      </Page>
    </Document>
  );
};

export default OfferLetterPDF;
