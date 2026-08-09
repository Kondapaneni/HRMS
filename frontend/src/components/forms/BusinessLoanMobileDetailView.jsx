import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

/**
 * A single read-only detail field for mobile: small label on top, bold value below.
 * No icons — clean and spacious.
 */
const DetailField = ({ label, value }) => {
  const displayVal =
    value !== null && value !== undefined && String(value).trim() !== ''
      ? String(value)
      : '—';

  return (
    <div className="py-2.5">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-[15px] font-semibold text-slate-800 leading-snug break-words">
        {displayVal}
      </p>
    </div>
  );
};

/**
 * A thin divider between fields.
 */
const FieldDivider = () => <div className="border-b border-slate-100" />;

/**
 * Section card wrapper with title.
 */
const SectionCard = ({ number, title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
        {number}
      </div>
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="px-5 pb-5">{children}</div>
  </div>
);

/**
 * Sub-section header inside a card (e.g. "Current Address", "Permanent Address").
 */
const SubSectionHeader = ({ label }) => (
  <div className="pt-3 pb-1">
    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
      {label}
    </p>
    <div className="border-b border-blue-100 mt-1" />
  </div>
);

export function BusinessLoanMobileDetailView({ formData = {}, application = {}, onBack }) {
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : format(d, 'dd MMM yyyy, hh:mm a');
    } catch {
      return null;
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '—';
    const num = Number(String(val).replace(/\D/g, ''));
    return isNaN(num) || num === 0 ? '—' : `₹ ${num.toLocaleString('en-IN')} / Month`;
  };

  const formattedDate =
    formatDateSafe(application.created_at || application.updated_at) ||
    format(new Date(), 'dd MMM yyyy');
  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const loanType = application.loan_type || formData.loan_type || 'Business Loan';

  // ── Guarantor renderer ──
  const renderGuarantor = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const g = (key) => formData[`${pfx}${key}`];
    const gEmp = g('employment');
    const gMarital = g('marital_status');

    return (
      <div className="space-y-0">
        <SubSectionHeader label="Personal Details" />
        <DetailField label="Full Name" value={g('name')} />
        <FieldDivider />
        <DetailField label="Phone Number" value={g('phone_number')} />
        <FieldDivider />
        <DetailField label="Aadhaar Number" value={g('aadhaar_number')} />
        <FieldDivider />
        <DetailField label="Age" value={g('age') ? `${g('age')} Years` : ''} />
        <FieldDivider />
        <DetailField label="Gender" value={g('gender')} />
        <FieldDivider />
        <DetailField
          label="Marital Status"
          value={gMarital === 'Yes' ? 'Married' : gMarital === 'No' ? 'Unmarried' : gMarital}
        />
        {g('father_name') && (
          <>
            <FieldDivider />
            <DetailField label="Father's Name" value={g('father_name')} />
          </>
        )}
        {g('mother_name') && (
          <>
            <FieldDivider />
            <DetailField label="Mother's Name" value={g('mother_name')} />
          </>
        )}
        {g('husband_name') && (
          <>
            <FieldDivider />
            <DetailField label="Husband's Name" value={g('husband_name')} />
          </>
        )}
        <FieldDivider />
        <DetailField label="Own House" value={g('own_house')} />

        {/* Current Address */}
        <SubSectionHeader label="Current Address" />
        <DetailField label="Address" value={g('current_address')} />
        <FieldDivider />
        <DetailField label="Street / Locality" value={g('current_street')} />
        <FieldDivider />
        <DetailField label="City" value={g('current_city')} />
        <FieldDivider />
        <DetailField label="State" value={g('current_state')} />
        <FieldDivider />
        <DetailField label="Postal Code" value={g('current_postal_code')} />

        {/* Permanent Address */}
        <SubSectionHeader label="Permanent Address" />
        <DetailField label="Address" value={g('permanent_address')} />
        <FieldDivider />
        <DetailField label="Street / Locality" value={g('permanent_street')} />
        <FieldDivider />
        <DetailField label="City" value={g('permanent_city')} />
        <FieldDivider />
        <DetailField label="State" value={g('permanent_state')} />
        <FieldDivider />
        <DetailField label="Postal Code" value={g('permanent_postal_code')} />

        {/* Employment */}
        <SubSectionHeader label="Occupation & Income" />
        <DetailField
          label="Employment Type"
          value={
            gEmp === 'Job'
              ? 'Job (Salaried)'
              : gEmp === 'Business'
              ? 'Business (Self-Employed)'
              : gEmp
          }
        />
        {gEmp === 'Job' && (
          <>
            <FieldDivider />
            <DetailField label="Job / Employer Name" value={g('job_name')} />
            <FieldDivider />
            <DetailField label="Job Monthly Income" value={formatCurrency(g('job_income_per_month'))} />
            <FieldDivider />
            <DetailField label="Workplace Address" value={g('job_address')} />
          </>
        )}
        {gEmp === 'Business' && (
          <>
            <FieldDivider />
            <DetailField label="Business Name" value={g('business_name')} />
            <FieldDivider />
            <DetailField label="Business Monthly Income" value={formatCurrency(g('business_income_per_month'))} />
            <FieldDivider />
            <DetailField label="Business Address" value={g('business_address')} />
          </>
        )}
      </div>
    );
  };

  // ── Main Render ──
  return (
    <div className="w-full pb-2">
      {/* ━━━ Hero Header — identical blobs and gradient to Applications list ━━━ */}
      <section className="relative px-6 pt-6 pb-20 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="absolute top-5 left-4 z-20 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Header Content: Application ID, Loan Type, Submitted Date */}
        <div className="relative z-10 text-center px-4 pt-2 pb-1">
          <h1 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
            {appId}
          </h1>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
            {loanType}
          </p>
          <p className="text-xs text-slate-200 mt-1 drop-shadow-sm opacity-90">
            Submitted on {formattedDate}
          </p>
        </div>
      </section>

      {/* ━━━ Content Cards ━━━ */}
      <div className="relative z-20 -mt-12 px-4 space-y-4">

        {/* ── 1. Applicant Personal Details ── */}
        <SectionCard number="1" title="Personal Details">
          <DetailField label="Applicant Name" value={formData.applicant_name} />
          <FieldDivider />
          <DetailField label="Phone Number" value={formData.phone_number} />
          <FieldDivider />
          <DetailField label="Aadhaar Number" value={formData.aadhaar_number} />
          <FieldDivider />
          <DetailField label="Age" value={formData.age ? `${formData.age} Years` : ''} />
          <FieldDivider />
          <DetailField label="Gender" value={formData.gender} />
          <FieldDivider />
          <DetailField
            label="Marital Status"
            value={
              formData.marital_status === 'Yes'
                ? 'Married'
                : formData.marital_status === 'No'
                ? 'Unmarried'
                : formData.marital_status
            }
          />
          {formData.father_name && (
            <>
              <FieldDivider />
              <DetailField label="Father's Name" value={formData.father_name} />
            </>
          )}
          {formData.mother_name && (
            <>
              <FieldDivider />
              <DetailField label="Mother's Name" value={formData.mother_name} />
            </>
          )}
          {formData.husband_name && (
            <>
              <FieldDivider />
              <DetailField label="Husband's Name" value={formData.husband_name} />
            </>
          )}
          <FieldDivider />
          <DetailField label="Own House" value={formData.own_house} />
        </SectionCard>

        {/* ── 2. Residential Addresses ── */}
        <SectionCard number="2" title="Residential Address">
          <SubSectionHeader label="Current Address" />
          <DetailField label="Address" value={formData.current_address} />
          <FieldDivider />
          <DetailField label="Street / Locality" value={formData.current_street} />
          <FieldDivider />
          <DetailField label="City" value={formData.current_city} />
          <FieldDivider />
          <DetailField label="State" value={formData.current_state} />
          <FieldDivider />
          <DetailField label="Postal Code" value={formData.current_postal_code} />

          <SubSectionHeader label="Permanent Address" />
          <DetailField label="Address" value={formData.permanent_address} />
          <FieldDivider />
          <DetailField label="Street / Locality" value={formData.permanent_street} />
          <FieldDivider />
          <DetailField label="City" value={formData.permanent_city} />
          <FieldDivider />
          <DetailField label="State" value={formData.permanent_state} />
          <FieldDivider />
          <DetailField label="Postal Code" value={formData.permanent_postal_code} />
        </SectionCard>

        {/* ── 3. Employment & Income ── */}
        <SectionCard number="3" title="Employment & Income">
          <DetailField
            label="Employment Type"
            value={
              formData.employment === 'Job'
                ? 'Job (Salaried)'
                : formData.employment === 'Business'
                ? 'Business (Self-Employed)'
                : formData.employment
            }
          />

          {formData.employment === 'Job' && (
            <>
              <FieldDivider />
              <DetailField label="Job / Employer Name" value={formData.job_name} />
              <FieldDivider />
              <DetailField label="Job Monthly Income" value={formatCurrency(formData.job_income_per_month)} />
              <FieldDivider />
              <DetailField label="Workplace Address" value={formData.job_address} />
            </>
          )}

          {formData.employment === 'Business' && (
            <>
              <FieldDivider />
              <DetailField label="Business Name" value={formData.business_name} />
              <FieldDivider />
              <DetailField label="Business Monthly Income" value={formatCurrency(formData.business_income_per_month)} />
              <FieldDivider />
              <DetailField label="Business Address" value={formData.business_address} />
            </>
          )}
        </SectionCard>

        {/* ── 4. Co-Applicant Details ── */}
        <SectionCard number="4" title="Co-Applicant">
          <DetailField label="Has Co-Applicant" value={formData.has_co_applicant || 'No'} />

          {formData.has_co_applicant === 'Yes' && (
            <>
              <SubSectionHeader label="Co-Applicant Personal Details" />
              <DetailField label="Name" value={formData.co_applicant_name} />
              <FieldDivider />
              <DetailField label="Relation with Applicant" value={formData.co_relation_with_applicant} />
              <FieldDivider />
              <DetailField label="Phone Number" value={formData.co_phone_number} />
              <FieldDivider />
              <DetailField label="Aadhaar Number" value={formData.co_aadhaar_number} />
              <FieldDivider />
              <DetailField label="Age" value={formData.co_age ? `${formData.co_age} Years` : ''} />
              <FieldDivider />
              <DetailField label="Gender" value={formData.co_gender} />
              <FieldDivider />
              <DetailField
                label="Marital Status"
                value={
                  formData.co_marital_status === 'Yes'
                    ? 'Married'
                    : formData.co_marital_status === 'No'
                    ? 'Unmarried'
                    : formData.co_marital_status
                }
              />
              {formData.co_father_name && (
                <>
                  <FieldDivider />
                  <DetailField label="Father's Name" value={formData.co_father_name} />
                </>
              )}
              {formData.co_mother_name && (
                <>
                  <FieldDivider />
                  <DetailField label="Mother's Name" value={formData.co_mother_name} />
                </>
              )}
              {formData.co_husband_name && (
                <>
                  <FieldDivider />
                  <DetailField label="Husband's Name" value={formData.co_husband_name} />
                </>
              )}
              <FieldDivider />
              <DetailField label="Own House" value={formData.co_own_house} />

              {/* Co-Applicant Current Address */}
              <SubSectionHeader label="Co-Applicant Current Address" />
              <DetailField label="Address" value={formData.co_current_address} />
              <FieldDivider />
              <DetailField label="Street / Locality" value={formData.co_current_street} />
              <FieldDivider />
              <DetailField label="City" value={formData.co_current_city} />
              <FieldDivider />
              <DetailField label="State" value={formData.co_current_state} />
              <FieldDivider />
              <DetailField label="Postal Code" value={formData.co_current_postal_code} />

              {/* Co-Applicant Permanent Address */}
              <SubSectionHeader label="Co-Applicant Permanent Address" />
              <DetailField label="Address" value={formData.co_permanent_address} />
              <FieldDivider />
              <DetailField label="Street / Locality" value={formData.co_permanent_street} />
              <FieldDivider />
              <DetailField label="City" value={formData.co_permanent_city} />
              <FieldDivider />
              <DetailField label="State" value={formData.co_permanent_state} />
              <FieldDivider />
              <DetailField label="Postal Code" value={formData.co_permanent_postal_code} />

              {/* Co-Applicant Employment */}
              {formData.co_employment && (
                <>
                  <SubSectionHeader label="Co-Applicant Employment & Income" />
                  <DetailField
                    label="Employment Type"
                    value={
                      formData.co_employment === 'Job'
                        ? 'Job (Salaried)'
                        : formData.co_employment === 'Business'
                        ? 'Business (Self-Employed)'
                        : formData.co_employment
                    }
                  />
                  {formData.co_employment === 'Job' && (
                    <>
                      <FieldDivider />
                      <DetailField label="Job Name" value={formData.co_job_name} />
                      <FieldDivider />
                      <DetailField label="Job Income" value={formatCurrency(formData.co_job_income_per_month)} />
                      <FieldDivider />
                      <DetailField label="Job Address" value={formData.co_job_address} />
                    </>
                  )}
                  {formData.co_employment === 'Business' && (
                    <>
                      <FieldDivider />
                      <DetailField label="Business Name" value={formData.co_business_name} />
                      <FieldDivider />
                      <DetailField label="Business Income" value={formatCurrency(formData.co_business_income_per_month)} />
                      <FieldDivider />
                      <DetailField label="Business Address" value={formData.co_business_address} />
                    </>
                  )}
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* ── 5. Guarantors ── */}
        <SectionCard number="5" title="Guarantors (3 Required)">
          {/* Guarantor Pill Tabs */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            {[1, 2, 3].map((gIdx) => {
              const isActive = activeGuarantorTab === gIdx;
              const gName = formData[`guarantor_${gIdx}_name`];
              const shortName = gName ? ` (${gName.split(' ')[0]})` : '';

              return (
                <button
                  key={gIdx}
                  type="button"
                  onClick={() => setActiveGuarantorTab(gIdx)}
                  className={`shrink-0 inline-flex items-center justify-center rounded-full text-xs font-semibold h-8 px-4 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  G{gIdx}{shortName}
                </button>
              );
            })}
          </div>

          {/* Active Guarantor */}
          {renderGuarantor(activeGuarantorTab)}
        </SectionCard>

        {/* ── Bottom Back Button ── */}
        <div className="flex justify-center pt-1 pb-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-slate-900 text-white h-11 px-6 transition-colors gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Applications
          </button>
        </div>
      </div>
    </div>
  );
}

export default BusinessLoanMobileDetailView;
