import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

// Register fonts if needed. For now we use standard fonts, but we can configure this later.
Font.register({
  family: "Inter",
  src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
});

// Disable hyphenation
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica", // Built-in PDF font to avoid loading external fonts unnecessarily, though we can use Inter if needed.
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  logoContainer: {
    width: "60%",
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 50,
    height: 50,
    marginRight: 15,
    borderRadius: 8,
  },
  companyTextContainer: {
    justifyContent: "center",
  },
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1,
    opacity: 0.05,
  },
  watermarkImage: {
    width: 350,
    height: 350,
  },
  companyName: {
    fontSize: 28,
    color: "#1E1B4B",
    fontWeight: "bold",
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 10,
    color: "#475569",
  },
  contactInfo: {
    width: "40%",
    alignItems: "flex-end",
    fontSize: 9,
    color: "#475569",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 40,
    letterSpacing: 1,
  },
  metaData: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  toSection: {
    width: "50%",
  },
  dateSection: {
    width: "50%",
    alignItems: "flex-end",
  },
  textRow: {
    fontSize: 11,
    marginBottom: 4,
    color: "#334155",
  },
  boldText: {
    fontWeight: "bold",
    fontSize: 11,
    color: "#0f172a",
  },
  subjectLine: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#0f172a",
  },
  bodyText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#334155",
    marginBottom: 15,
    textAlign: "justify",
    textTransform: "capitalize",
  },
  signatureSection: {
    marginTop: 20,
  },
  employeeAcceptanceSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  employeeAcceptanceTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 15,
  },
  employeeSignatureRow: {
    fontSize: 11,
    color: "#0f172a",
    marginBottom: 15,
  },
  signatureImage: {
    width: 200,
    height: 30,
    paddingLeft: 5,
    paddingRight: 5,
  },
  signatureLine: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    marginTop: 5,
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.6,
  },
  signatureTitle: {
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
});

const numberToWords = (num) => {
  if (isNaN(num) || num === 0) return "Zero";
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100)
      return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        "Hundred " +
        (n % 100 !== 0 ? convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        "Thousand " +
        (n % 1000 !== 0 ? convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        "Lakh " +
        (n % 100000 !== 0 ? convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      "Crore " +
      (n % 10000000 !== 0 ? convert(n % 10000000) : "")
    );
  };
  return convert(num).trim();
};

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
    companyAddress = "Sri Ramachandra Nagar, Vijayawada",
    companyPhone = "9440230003",
    companyEmail = "gowthamkondapaneni2003@gmail.com",
    companyWebsite = "https://hrms-qwv3.onrender.com",
  } = data;

  const numericSalary = parseInt(
    (salary || "").toString().replace(/[^0-9]/g, ""),
    10,
  );
  let salaryText = <Text style={styles.boldText}>{salary}</Text>;

  if (!isNaN(numericSalary) && numericSalary > 0) {
    const monthly = Math.round(numericSalary / 12);
    const annualWords = numberToWords(numericSalary);
    const monthlyWords = numberToWords(monthly);
    salaryText = (
      <Text>
        <Text style={styles.boldText}>
          Rs. {monthly.toLocaleString("en-IN")}/- (Rupees {monthlyWords} Only)
        </Text>{" "}
        per month and{" "}
        <Text style={styles.boldText}>
          Rs. {numericSalary.toLocaleString("en-IN")}/- (Rupees {annualWords}{" "}
          Only)
        </Text>{" "}
        per annum
      </Text>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <View style={styles.watermarkContainer} fixed>
          <Image src="/pwa-512x512.png" style={styles.watermarkImage} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src="/pwa-192x192.png" style={styles.logoImage} />
            <View style={styles.companyTextContainer}>
              <Text style={styles.companyName}>ACME HRMS</Text>
              <Text style={styles.companyDetails}>{companyAddress}</Text>
            </View>
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
            <Text style={styles.boldText}>
              {firstName} {lastName}
            </Text>
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
          Dear{" "}
          <Text style={styles.boldText}>
            {firstName} {lastName}
          </Text>
          ,
        </Text>

        <Text style={styles.bodyText}>
          We are Pleased to Offer you the Position of{" "}
          <Text style={styles.boldText}>{jobTitle}</Text> with Our Organization.
          Based on our Discussions and Evaluation Process, We are Confident that
          your Skills, Experience, and Dedication will Contribute Significantly
          to the Growth and Success of the Company.
        </Text>

        <Text style={styles.bodyText}>
          Your Employment will Commence on{" "}
          <Text style={styles.boldText}>{joiningDate}</Text> and you will be
          Assigned to the <Text style={styles.boldText}>{department}</Text>{" "}
          Department. Your appointment will initially be governed by the
          Company's Policies, Appointment Terms, and Assigned Responsibilities.
          Detailed Employment Terms and Responsibilities will be Shared during
          your Onboarding Process.
        </Text>

        <Text style={styles.bodyText}>
          Your Compensation Package shall be {salaryText}. In addition to your
          fixed Remuneration, you will be eligible for benefits, incentives, and
          other Facilities as per Company Policies and Applicable Regulations.
        </Text>

        <Text style={styles.bodyText}>
          Your Performance will be Evaluated Periodically based on your Assigned
          Responsibilities, Business Objectives, and overall contribution to the
          Organization. Future Salary Revisions, Promotions, and Career Growth
          Opportunities will be based on your Performance and Organizational
          Requirements.
        </Text>

        <Text style={styles.bodyText}>
          If you wish to Resign from your Position, The Applicable Notice period
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
          Please confirm your acceptance of this offer on or before{" "}
          <Text style={styles.boldText}>{deadlineDate}</Text>. Upon acceptance,
          further details regarding joining formalities, orientation, and
          onboarding procedures will be communicated to you.
        </Text>

        <Text style={styles.bodyText}>
          We are excited about the opportunity to have you join our team and
          look forward to your valuable contribution. We wish you a successful
          and rewarding career with our organization.
        </Text>

        {/* HR Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.bodyText}>Sincerely,</Text>

          <Image src="/hr-signature.png" style={styles.signatureImage} />

          <View style={styles.signatureLine} />

          <Text style={styles.signatureName}>
            Gowtham Chowdary Kondapaneni,
          </Text>

          <Text style={styles.signatureTitle}>Human Resources Department</Text>

          <Text style={styles.signatureTitle}>ACME HRMS</Text>
        </View>

        {/* Employee Acceptance */}
        <View style={styles.employeeAcceptanceSection}>
          <Text style={styles.employeeAcceptanceTitle}>
            Employee Acceptance
          </Text>
          <Text style={styles.bodyText}>
            I,{" "}
            <Text style={styles.boldText}>
              {firstName} {lastName}
            </Text>
            , hereby accept the offer of employment and agree to abide by the
            terms and conditions mentioned in this Offer Letter.
          </Text>
          <Text style={styles.employeeSignatureRow}>
            Employee Signature: _________________________
          </Text>
          <Text style={styles.employeeSignatureRow}>
            Date: _________________________
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
