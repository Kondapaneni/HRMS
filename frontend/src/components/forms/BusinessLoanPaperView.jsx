import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  Printer, 
  ArrowLeft, 
  Calendar, 
  Home, 
  Lock,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * Line-based Paper Application Field
 * Matches authentic printed physical application form with underline fill-ins
 */
const PaperLine = ({ label, value, className = '', labelWidth = 'min-w-[130px] sm:min-w-[160px]' }) => {
  const displayVal = value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : '';

  return (
    <div className={`flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-1.5 ${className}`}>
      <span className={`${labelWidth} text-xs sm:text-sm font-semibold text-slate-700 shrink-0 select-none`}>
        {label}:
      </span>
      <div className="flex-1 border-b border-slate-300 sm:border-slate-400 min-h-[26px] flex items-end pb-0.5">
        <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide break-words">
          {displayVal || <span className="text-slate-300 font-normal italic">—</span>}
        </span>
      </div>
    </div>
  );
};

export function BusinessLoanPaperView({ formData = {}, application = {}, onBack }) {
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

  const formattedDate = formatDateSafe(application.created_at || application.updated_at) || format(new Date(), 'dd MMM yyyy');
  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const status = application.status || 'Submitted';

  const formatCurrency = (val) => {
    if (!val) return '—';
    const num = Number(String(val).replace(/\D/g, ''));
    return isNaN(num) || num === 0 ? '—' : `₹ ${num.toLocaleString('en-IN')} / Month`;
  };

  const renderGuarantorPaper = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const labelPfx = `Guarantor ${idx}`;
    const gName = formData[`${pfx}name`];
    const gPhone = formData[`${pfx}phone_number`];
    const gAadhaar = formData[`${pfx}aadhaar_number`];
    const gAge = formData[`${pfx}age`];
    const gGender = formData[`${pfx}gender`];
    const gMarital = formData[`${pfx}marital_status`];
    const gFather = formData[`${pfx}father_name`];
    const gMother = formData[`${pfx}mother_name`];
    const gHusband = formData[`${pfx}husband_name`];
    const gOwnHouse = formData[`${pfx}own_house`];

    const gCurAddr = formData[`${pfx}current_address`];
    const gCurStreet = formData[`${pfx}current_street`];
    const gCurCity = formData[`${pfx}current_city`];
    const gCurState = formData[`${pfx}current_state`];
    const gCurZip = formData[`${pfx}current_postal_code`];

    const gPermAddr = formData[`${pfx}permanent_address`];
    const gPermStreet = formData[`${pfx}permanent_street`];
    const gPermCity = formData[`${pfx}permanent_city`];
    const gPermState = formData[`${pfx}permanent_state`];
    const gPermZip = formData[`${pfx}permanent_postal_code`];

    const gEmp = formData[`${pfx}employment`];
    const gJobName = formData[`${pfx}job_name`];
    const gJobAddr = formData[`${pfx}job_address`];
    const gJobIncome = formData[`${pfx}job_income_per_month`];
    const gBizName = formData[`${pfx}business_name`];
    const gBizAddr = formData[`${pfx}business_address`];
    const gBizIncome = formData[`${pfx}business_income_per_month`];

    return (
      <div className="space-y-6">
        {/* Personal Details */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            A. {labelPfx} Personal Details
          </div>
          <PaperLine label={`${labelPfx} Name`} value={gName} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <PaperLine label="Phone Number" value={gPhone} />
            <PaperLine label="Aadhaar Number" value={gAadhaar} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
            <PaperLine label="Age" value={gAge ? `${gAge} Years` : ''} labelWidth="min-w-[70px]" />
            <PaperLine label="Gender" value={gGender} labelWidth="min-w-[70px]" />
            <PaperLine label="Marital Status" value={gMarital === 'Yes' ? 'Married' : gMarital === 'No' ? 'Unmarried' : gMarital} labelWidth="min-w-[100px]" />
          </div>

          {gFather && <PaperLine label="Father's Name" value={gFather} />}
          {gMother && <PaperLine label="Mother's Name" value={gMother} />}
          {gHusband && <PaperLine label="Husband's Name" value={gHusband} />}
          <PaperLine label="Own House" value={gOwnHouse} />
        </div>

        {/* Current Address */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            B. {labelPfx} Current Residential Address
          </div>
          <PaperLine label="Current Address" value={gCurAddr} />
          <PaperLine label="Street / Locality" value={gCurStreet} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
            <PaperLine label="City" value={gCurCity} labelWidth="min-w-[60px]" />
            <PaperLine label="State" value={gCurState} labelWidth="min-w-[60px]" />
            <PaperLine label="Postal Code" value={gCurZip} labelWidth="min-w-[90px]" />
          </div>
        </div>

        {/* Permanent Address */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            C. {labelPfx} Permanent Residential Address
          </div>
          <PaperLine label="Permanent Address" value={gPermAddr} />
          <PaperLine label="Street / Locality" value={gPermStreet} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
            <PaperLine label="City" value={gPermCity} labelWidth="min-w-[60px]" />
            <PaperLine label="State" value={gPermState} labelWidth="min-w-[60px]" />
            <PaperLine label="Postal Code" value={gPermZip} labelWidth="min-w-[90px]" />
          </div>
        </div>

        {/* Employment & Income */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            D. {labelPfx} Occupation & Income Details
          </div>
          <PaperLine label="Employment Type" value={gEmp === 'Job' ? 'Job (Salaried)' : gEmp === 'Business' ? 'Business (Self-Employed)' : gEmp} />
          
          {gEmp === 'Job' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <PaperLine label="Job / Employer Name" value={gJobName} />
                <PaperLine label="Job Monthly Income" value={formatCurrency(gJobIncome)} />
              </div>
              <PaperLine label="Workplace Address" value={gJobAddr} />
            </>
          )}

          {gEmp === 'Business' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <PaperLine label="Business Name" value={gBizName} />
                <PaperLine label="Business Monthly Income" value={formatCurrency(gBizIncome)} />
              </div>
              <PaperLine label="Business Address" value={gBizAddr} />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full space-y-6 pb-12">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-9 px-3.5 transition-colors gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Applications
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Lock className="w-3.5 h-3.5 text-blue-600" /> Read-Only Mode
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-9 px-3.5 transition-colors gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Application Form
          </button>
        </div>
      </div>

      {/* Main Physical Paper Document View */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        
        {/* Paper Form Header (Matching Acme HRMS Theme) */}
        <div className="p-6 sm:p-7 bg-white border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                <Building2 className="w-4 h-4 text-blue-600" /> Acme Financial Services • Credit Origination
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase">
                Business Loan Application Form
              </h1>
              <p className="text-xs text-slate-500">
                Official Commercial Credit Record • Form Code: BL-ORIG-2026
              </p>
            </div>

            {/* App / Loan ID & Status Info (Clean, No Box, Big ID) */}
            <div className="flex flex-col items-start md:items-end gap-1 text-left md:text-right">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Application ID
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-600">
                {appId}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {status}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> {formattedDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Paper Sheet Form Fields Body */}
        <div className="p-6 sm:p-8 space-y-8 bg-white text-slate-900">
          
          {/* ================= 1. APPLICANT PERSONAL DETAILS ================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Applicant Personal Details
              </h2>
            </div>

            <div className="space-y-1 pt-1">
              <PaperLine label="Applicant Name" value={formData.applicant_name} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <PaperLine label="Phone Number" value={formData.phone_number} />
                <PaperLine label="Aadhaar Number" value={formData.aadhaar_number} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                <PaperLine label="Age" value={formData.age ? `${formData.age} Years` : ''} labelWidth="min-w-[70px]" />
                <PaperLine label="Gender" value={formData.gender} labelWidth="min-w-[70px]" />
                <PaperLine label="Marital Status" value={formData.marital_status === 'Yes' ? 'Married' : formData.marital_status === 'No' ? 'Unmarried' : formData.marital_status} labelWidth="min-w-[100px]" />
              </div>

              {formData.father_name && <PaperLine label="Father's Name" value={formData.father_name} />}
              {formData.mother_name && <PaperLine label="Mother's Name" value={formData.mother_name} />}
              {formData.husband_name && <PaperLine label="Husband's Name" value={formData.husband_name} />}
              <PaperLine label="Own House" value={formData.own_house} />
            </div>
          </section>

          {/* ================= 2. RESIDENTIAL ADDRESSES ================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Applicant Residential Address Details
              </h2>
            </div>

            {/* Current Address */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                A. Current Address
              </div>
              <PaperLine label="Current Address" value={formData.current_address} />
              <PaperLine label="Street / Locality" value={formData.current_street} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
                <PaperLine label="City" value={formData.current_city} labelWidth="min-w-[60px]" />
                <PaperLine label="State" value={formData.current_state} labelWidth="min-w-[60px]" />
                <PaperLine label="Postal Code" value={formData.current_postal_code} labelWidth="min-w-[90px]" />
              </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-1 pt-2">
              <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                B. Permanent Address
              </div>
              <PaperLine label="Permanent Address" value={formData.permanent_address} />
              <PaperLine label="Street / Locality" value={formData.permanent_street} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
                <PaperLine label="City" value={formData.permanent_city} labelWidth="min-w-[60px]" />
                <PaperLine label="State" value={formData.permanent_state} labelWidth="min-w-[60px]" />
                <PaperLine label="Postal Code" value={formData.permanent_postal_code} labelWidth="min-w-[90px]" />
              </div>
            </div>
          </section>

          {/* ================= 3. EMPLOYMENT & INCOME ================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">3</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Employment & Monthly Income Details
              </h2>
            </div>

            <div className="space-y-1 pt-1">
              <PaperLine 
                label="Employment Type" 
                value={formData.employment === 'Job' ? 'Job (Salaried)' : formData.employment === 'Business' ? 'Business (Self-Employed)' : formData.employment} 
              />

              {formData.employment === 'Job' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <PaperLine label="Job / Employer Name" value={formData.job_name} />
                    <PaperLine label="Job Monthly Income" value={formatCurrency(formData.job_income_per_month)} />
                  </div>
                  <PaperLine label="Workplace Address" value={formData.job_address} />
                </>
              )}

              {formData.employment === 'Business' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <PaperLine label="Business Name" value={formData.business_name} />
                    <PaperLine label="Business Monthly Income" value={formatCurrency(formData.business_income_per_month)} />
                  </div>
                  <PaperLine label="Business Address" value={formData.business_address} />
                </>
              )}
            </div>
          </section>

          {/* ================= 4. CO-APPLICANT DETAILS ================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">4</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Co-Applicant Details
              </h2>
            </div>

            <PaperLine label="Has Co-Applicant" value={formData.has_co_applicant || 'No'} />

            {formData.has_co_applicant === 'Yes' && (
              <div className="space-y-4 pt-2">
                {/* Co-applicant Personal */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                    A. Co-Applicant Personal Particulars
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <PaperLine label="Co-Applicant Name" value={formData.co_applicant_name} />
                    <PaperLine label="Relation with Applicant" value={formData.co_relation_with_applicant} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <PaperLine label="Phone Number" value={formData.co_phone_number} />
                    <PaperLine label="Aadhaar Number" value={formData.co_aadhaar_number} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                    <PaperLine label="Age" value={formData.co_age ? `${formData.co_age} Years` : ''} labelWidth="min-w-[70px]" />
                    <PaperLine label="Gender" value={formData.co_gender} labelWidth="min-w-[70px]" />
                    <PaperLine label="Marital Status" value={formData.co_marital_status === 'Yes' ? 'Married' : formData.co_marital_status === 'No' ? 'Unmarried' : formData.co_marital_status} labelWidth="min-w-[100px]" />
                  </div>
                  {formData.co_father_name && <PaperLine label="Father's Name" value={formData.co_father_name} />}
                  {formData.co_mother_name && <PaperLine label="Mother's Name" value={formData.co_mother_name} />}
                  {formData.co_husband_name && <PaperLine label="Husband's Name" value={formData.co_husband_name} />}
                  <PaperLine label="Own House" value={formData.co_own_house} />
                </div>

                {/* Co-applicant Current Address */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                    B. Co-Applicant Current Address
                  </div>
                  <PaperLine label="Current Address" value={formData.co_current_address} />
                  <PaperLine label="Street / Locality" value={formData.co_current_street} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
                    <PaperLine label="City" value={formData.co_current_city} labelWidth="min-w-[60px]" />
                    <PaperLine label="State" value={formData.co_current_state} labelWidth="min-w-[60px]" />
                    <PaperLine label="Postal Code" value={formData.co_current_postal_code} labelWidth="min-w-[90px]" />
                  </div>
                </div>

                {/* Co-applicant Permanent Address */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                    C. Co-Applicant Permanent Address
                  </div>
                  <PaperLine label="Permanent Address" value={formData.co_permanent_address} />
                  <PaperLine label="Street / Locality" value={formData.co_permanent_street} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
                    <PaperLine label="City" value={formData.co_permanent_city} labelWidth="min-w-[60px]" />
                    <PaperLine label="State" value={formData.co_permanent_state} labelWidth="min-w-[60px]" />
                    <PaperLine label="Postal Code" value={formData.co_permanent_postal_code} labelWidth="min-w-[90px]" />
                  </div>
                </div>

                {/* Co-applicant Employment */}
                {formData.co_employment && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                      D. Co-Applicant Employment & Income
                    </div>
                    <PaperLine label="Employment Type" value={formData.co_employment === 'Job' ? 'Job (Salaried)' : formData.co_employment === 'Business' ? 'Business (Self-Employed)' : formData.co_employment} />
                    {formData.co_employment === 'Job' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                          <PaperLine label="Job Name" value={formData.co_job_name} />
                          <PaperLine label="Job Income" value={formatCurrency(formData.co_job_income_per_month)} />
                        </div>
                        <PaperLine label="Job Address" value={formData.co_job_address} />
                      </>
                    )}
                    {formData.co_employment === 'Business' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                          <PaperLine label="Business Name" value={formData.co_business_name} />
                          <PaperLine label="Business Income" value={formatCurrency(formData.co_business_income_per_month)} />
                        </div>
                        <PaperLine label="Business Address" value={formData.co_business_address} />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ================= 5. GUARANTOR DETAILS (3 REQUIRED) ================= */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">5</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                  Guarantors Details (3 Required)
                </h2>
              </div>

              {/* Guarantor Tabs Styled Like Add Lead Button */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {[1, 2, 3].map((gIdx) => {
                  const isActive = activeGuarantorTab === gIdx;
                  const gName = formData[`guarantor_${gIdx}_name`];
                  const shortName = gName ? ` (${gName.split(' ')[0]})` : '';

                  return (
                    <button
                      key={gIdx}
                      type="button"
                      onClick={() => setActiveGuarantorTab(gIdx)}
                      className={`inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium h-9 px-3.5 transition-colors gap-1.5 cursor-pointer shadow-xs ${
                        isActive
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-300'
                      }`}
                    >
                      Guarantor {gIdx}{shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Guarantor Form in Screen View */}
            <div className="p-4 sm:p-5 rounded-md border border-slate-200 bg-slate-50/50">
              {renderGuarantorPaper(activeGuarantorTab)}
            </div>

            {/* Print View: Render all 3 Guarantors sequentially when printing */}
            <div className="hidden print:block space-y-6 pt-4">
              <div className="p-4 border border-slate-300 rounded-md">
                <h3 className="font-bold text-sm uppercase mb-3 text-blue-950">Guarantor 1 Details</h3>
                {renderGuarantorPaper(1)}
              </div>
              <div className="p-4 border border-slate-300 rounded-md">
                <h3 className="font-bold text-sm uppercase mb-3 text-blue-950">Guarantor 2 Details</h3>
                {renderGuarantorPaper(2)}
              </div>
              <div className="p-4 border border-slate-300 rounded-md">
                <h3 className="font-bold text-sm uppercase mb-3 text-blue-950">Guarantor 3 Details</h3>
                {renderGuarantorPaper(3)}
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Bottom Back Button */}
      <div className="flex justify-center pt-2 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-6 transition-colors gap-2 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Applications List
        </button>
      </div>
    </div>
  );
}

export default BusinessLoanPaperView;
