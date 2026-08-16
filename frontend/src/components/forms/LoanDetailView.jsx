import React, { useState } from 'react';
import {
  Building2,
  User,
  Users,
  Shield,
  Calendar,
  UserCheck,
  Edit3,
  ChevronDown,
  ChevronUp,
  History,
  FileEdit
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// HELPER UTILITIES
// ============================================================================

const SYSTEM_IGNORED_FIELDS = [
  'loan_type',
  'application_id',
  'id',
  'lead_id',
  'status',
  'stage',
  'branch',
  'branch_name',
  'created_by',
  'creator_name',
  'created_at',
  'updated_at',
  'timeline',
  'documents',
  'signatures',
  'edit_logs',
  'from'
];

/**
 * Compact Audit Log Diff Viewer for edited loan applications
 * Displays only the modified fields (old value vs new value) and editor details, matching the applications table styling.
 */
const AuditLogChangesViewer = ({ event }) => {
  const [isOpen, setIsOpen] = useState(true);
  const rawChanges = event.changes || [];
  const changes = rawChanges.filter(
    (ch) => !SYSTEM_IGNORED_FIELDS.includes(String(ch.field || '').toLowerCase())
  );
  const editorName = event.editor_name || 'Branch Officer';

  if (changes.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <div className="p-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <span>
            Edited by <strong className="font-semibold text-slate-900">{editorName}</strong>
          </span>
        </div>
        {changes.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isOpen ? 'Hide Changes' : 'View Changes'} ({changes.length})</span>
          </button>
        )}
      </div>

      {isOpen && changes.length > 0 && (
        <div className="rounded-md border border-slate-200 overflow-x-auto bg-white shadow-2xs">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium whitespace-nowrap text-xs">
              <tr>
                <th className="p-3 font-semibold text-slate-700">Modified Field</th>
                <th className="p-3 font-semibold text-slate-700">Old Value</th>
                <th className="p-3 font-semibold text-slate-700">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {changes.map((ch, cIdx) => (
                <tr key={cIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-medium text-slate-900 whitespace-nowrap text-sm">
                    {ch.label || ch.field}
                  </td>
                  <td className="p-3 whitespace-nowrap text-sm text-slate-700">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 line-through">
                      {ch.old_value || '—'}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-sm text-slate-700">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {ch.new_value || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


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

/**
 * Resolves photo URL for loan documents matching employee avatar implementation
 */
const getDocumentPhotoUrl = (doc) => {
  if (!doc) return null;
  if (typeof doc === 'object' && doc !== null) {
    return doc.url || doc.proxy_url || null;
  }
  if (typeof doc === 'string') {
    return doc;
  }
  return null;
};

/**
 * Unified Passport Photograph Box Component
 * Displays authentic dashed placeholder with icon + "PASSPORT PHOTO" / "Not Uploaded"
 * or the uploaded image with tap-to-enlarge preview.
 */
const PassportPhotoBox = ({ doc, label, onPreview, icon: Icon = User, size = 'md' }) => {
  const photoUrl = getDocumentPhotoUrl(doc);

  const isSmall = size === 'sm';
  const boxDimensions = isSmall 
    ? 'w-24 h-32' 
    : 'w-28 h-36 sm:w-32 sm:h-40';

  return (
    <div className="shrink-0 flex flex-col items-center select-none passport-photo-box print:w-[110px] print:h-[140px] print:shrink-0">
      <div
        className={`${boxDimensions} rounded-xl border-2 ${
          photoUrl 
            ? 'border-blue-400 bg-blue-50/20' 
            : 'border-dashed border-slate-300 bg-slate-50/70'
        } flex flex-col items-center justify-center p-1 overflow-hidden shadow-2xs transition-all print:w-[110px] print:h-[140px] print:max-w-[110px] print:max-h-[140px]`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={label}
            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all print:w-[102px] print:h-[130px] print:max-h-[130px] print:object-cover"
            onClick={() => onPreview && onPreview(photoUrl)}
            title="Click to view full size"
          />
        ) : (
          <div className="text-center p-1.5 flex flex-col items-center justify-center h-full">
            <Icon className={`${isSmall ? 'w-6 h-6' : 'w-8 h-8'} text-slate-300 mx-auto mb-1`} />
            <p className={`${isSmall ? 'text-[8.5px]' : 'text-[10px]'} font-bold text-slate-400 uppercase tracking-tight leading-tight`}>
              Passport Photo
            </p>
            <span className={`${isSmall ? 'text-[7.5px]' : 'text-[9px]'} text-slate-300 italic mt-0.5`}>
              Not Uploaded
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-wider text-center print:text-[9px]">
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 1. MOBILE DETAIL VIEW SUB-COMPONENTS
// ============================================================================

/**
 * A single read-only detail field for mobile: small label on top, bold value below.
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
 * A thin divider between mobile fields.
 */
const FieldDivider = () => <div className="border-b border-slate-100" />;

/**
 * Mobile section card wrapper with numbered badge and title.
 */
const SectionCard = ({ number, title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div className="flex items-center gap-1.5 px-5 pt-5 pb-3">
      <span className="text-base font-bold text-slate-800 shrink-0">
        {number}.
      </span>
      <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="px-5 pb-5">{children}</div>
  </div>
);

/**
 * Sub-section header inside a mobile card (e.g. "Current Address", "Permanent Address").
 */
const SubSectionHeader = ({ label }) => (
  <div className="pt-3 pb-1">
    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
      {label}
    </p>
    <div className="border-b border-blue-100 mt-1" />
  </div>
);

/**
 * Mobile Read-Only View Component (Designed for small screens)
 */
function MobileDetailView({
  formData = {},
  application = {},
  currentDocs: externalDocs,
  onPreviewDoc,
  localTimeline: externalTimeline
}) {
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);
  const currentDocs =
    externalDocs ||
    formData.documents ||
    application.documents ||
    application.form_data?.documents ||
    {};
  const baseTimeline =
    externalTimeline ||
    formData.timeline ||
    application.form_data?.timeline ||
    [];

  const auditLogsAsEvents = (application.audit_logs || []).map((al) => ({
    stage: 'Application Updated',
    action: 'Application Details Modified',
    timestamp: al.created_at,
    editor_name: al.editor_name,
    changes: al.changes,
    changes_count: al.changes_count
  }));

  const localTimeline = [...baseTimeline, ...auditLogsAsEvents].sort((a, b) => {
    const tA = new Date(a.timestamp || 0).getTime();
    const tB = new Date(b.timestamp || 0).getTime();
    return tA - tB;
  });

  const formattedDate =
    formatDateSafe(application.created_at || application.updated_at) ||
    format(new Date(), 'dd MMM yyyy');

  const hasCoApplicant =
    formData.has_co_applicant === 'Yes' ||
    (formData.co_applicant_name && String(formData.co_applicant_name).trim() !== '');

  const maritalDisplay =
    formData.marital_status === 'Yes'
      ? 'Married'
      : formData.marital_status === 'No'
        ? 'Unmarried'
        : formData.marital_status;

  const coMaritalDisplay =
    formData.co_marital_status === 'Yes'
      ? 'Married'
      : formData.co_marital_status === 'No'
        ? 'Unmarried'
        : formData.co_marital_status;

  const renderGuarantor = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const g = (field) => formData[`${pfx}${field}`];
    const gMarital = g('marital_status');
    const gEmp = g('employment');
    const gPhoto = currentDocs[`guarantor_${idx}_photo`];

    return (
      <div className="space-y-0">
        <SubSectionHeader label="Personal Details" />
        <div className="flex items-start justify-between gap-3 pt-1 pb-1">
          <div className="flex-1 min-w-0">
            <DetailField label="Full Name" value={g('name')} />
            <FieldDivider />
            <DetailField label="Phone Number" value={g('phone_number')} />
            <FieldDivider />
            <DetailField label="Aadhaar Number" value={g('aadhaar_number')} />
          </div>
          <PassportPhotoBox
            doc={gPhoto}
            label={`Guarantor ${idx}`}
            icon={Shield}
            size="sm"
            onPreview={onPreviewDoc}
          />
        </div>
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
        <div className="grid grid-cols-2 gap-x-3">
          <DetailField label="City" value={g('current_city')} />
          <DetailField label="State" value={g('current_state')} />
        </div>
        <FieldDivider />
        <DetailField label="Postal Code" value={g('current_postal_code')} />

        {/* Permanent Address */}
        <SubSectionHeader label="Permanent Address" />
        <DetailField label="Address" value={g('permanent_address')} />
        <FieldDivider />
        <DetailField label="Street / Locality" value={g('permanent_street')} />
        <FieldDivider />
        <div className="grid grid-cols-2 gap-x-3">
          <DetailField label="City" value={g('permanent_city')} />
          <DetailField label="State" value={g('permanent_state')} />
        </div>
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

  return (
    <div className="w-full space-y-4 pb-2">
      {/* ── 1. Applicant Details ── */}
      <SectionCard number="1" title="Applicant Personal Details">
        <div className="flex items-start justify-between gap-3 pt-1 pb-1">
          <div className="flex-1 min-w-0">
            <DetailField label="Full Name" value={formData.applicant_name} />
            <FieldDivider />
            <DetailField label="Phone Number" value={formData.phone_number} />
            <FieldDivider />
            <DetailField label="Aadhaar Number" value={formData.aadhaar_number} />
          </div>
          <PassportPhotoBox
            doc={currentDocs.applicant_photo}
            label="Applicant"
            icon={User}
            size="sm"
            onPreview={onPreviewDoc}
          />
        </div>
        <FieldDivider />
        <DetailField label="Age" value={formData.age ? `${formData.age} Years` : ''} />
        <FieldDivider />
        <DetailField label="Gender" value={formData.gender} />
        <FieldDivider />
        <DetailField label="Marital Status" value={maritalDisplay} />
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

      {/* ── 2. Residential Address ── */}
      <SectionCard number="2" title="Residential Address">
        <SubSectionHeader label="Current Address" />
        <DetailField label="Address" value={formData.current_address} />
        <FieldDivider />
        <DetailField label="Street / Locality" value={formData.current_street} />
        <FieldDivider />
        <div className="grid grid-cols-2 gap-x-3">
          <DetailField label="City" value={formData.current_city} />
          <DetailField label="State" value={formData.current_state} />
        </div>
        <FieldDivider />
        <DetailField label="Postal Code" value={formData.current_postal_code} />

        <SubSectionHeader label="Permanent Address" />
        <DetailField label="Address" value={formData.permanent_address} />
        <FieldDivider />
        <DetailField label="Street / Locality" value={formData.permanent_street} />
        <FieldDivider />
        <div className="grid grid-cols-2 gap-x-3">
          <DetailField label="City" value={formData.permanent_city} />
          <DetailField label="State" value={formData.permanent_state} />
        </div>
        <FieldDivider />
        <DetailField label="Postal Code" value={formData.permanent_postal_code} />
      </SectionCard>

      {/* ── 3. Employment / Business Details ── */}
      <SectionCard number="3" title="Occupation Details">
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
            <DetailField label="Monthly Income" value={formatCurrency(formData.job_income_per_month)} />
            <FieldDivider />
            <DetailField label="Workplace Address" value={formData.job_address} />
          </>
        )}
        {formData.employment === 'Business' && (
          <>
            <FieldDivider />
            <DetailField label="Business Name" value={formData.business_name} />
            <FieldDivider />
            <DetailField label="Monthly Income" value={formatCurrency(formData.business_income_per_month)} />
            <FieldDivider />
            <DetailField label="Business Address" value={formData.business_address} />
          </>
        )}
      </SectionCard>

      {/* ── 4. Co-Applicant Details ── */}
      <SectionCard number="4" title="Co-Applicant Details">
        <DetailField
          label="Has Co-Applicant?"
          value={hasCoApplicant ? 'Yes' : 'No'}
        />
        {hasCoApplicant && (
          <>
            <SubSectionHeader label="Personal Details" />
            <div className="flex items-start justify-between gap-3 pt-1 pb-1">
              <div className="flex-1 min-w-0">
                <DetailField label="Full Name" value={formData.co_applicant_name} />
                <FieldDivider />
                <DetailField label="Relation with Applicant" value={formData.co_relation_with_applicant} />
                <FieldDivider />
                <DetailField label="Phone Number" value={formData.co_phone_number} />
                <FieldDivider />
                <DetailField label="Aadhaar Number" value={formData.co_aadhaar_number} />
              </div>
              <PassportPhotoBox
                doc={currentDocs.co_applicant_photo}
                label="Co-Applicant"
                icon={Users}
                size="sm"
                onPreview={onPreviewDoc}
              />
            </div>
            <FieldDivider />
            <DetailField label="Age" value={formData.co_age ? `${formData.co_age} Years` : ''} />
            <FieldDivider />
            <DetailField label="Gender" value={formData.co_gender} />
            <FieldDivider />
            <DetailField label="Marital Status" value={coMaritalDisplay} />
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

            <SubSectionHeader label="Current Address" />
            <DetailField label="Address" value={formData.co_current_address} />
            <FieldDivider />
            <DetailField label="Street / Locality" value={formData.co_current_street} />
            <FieldDivider />
            <div className="grid grid-cols-2 gap-x-3">
              <DetailField label="City" value={formData.co_current_city} />
              <DetailField label="State" value={formData.co_current_state} />
            </div>
            <FieldDivider />
            <DetailField label="Postal Code" value={formData.co_current_postal_code} />

            <SubSectionHeader label="Permanent Address" />
            <DetailField label="Address" value={formData.co_permanent_address} />
            <FieldDivider />
            <DetailField label="Street / Locality" value={formData.co_permanent_street} />
            <FieldDivider />
            <div className="grid grid-cols-2 gap-x-3">
              <DetailField label="City" value={formData.co_permanent_city} />
              <DetailField label="State" value={formData.co_permanent_state} />
            </div>
            <FieldDivider />
            <DetailField label="Postal Code" value={formData.co_permanent_postal_code} />

            {formData.co_employment && (
              <>
                <SubSectionHeader label="Occupation & Income" />
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
                Guarantor {gIdx}{shortName}
              </button>
            );
          })}
        </div>
        {renderGuarantor(activeGuarantorTab)}
      </SectionCard>

      {/* ── 6. Application Timeline ── */}
      <SectionCard number="6" title="Application Timeline">
        <div className="py-2">
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600" />
              <p className="text-sm font-bold text-slate-800">Application Created</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{formattedDate}</p>
            </div>
            {localTimeline.map((event, idx) => {
              const isLast = idx === localTimeline.length - 1;
              const isUpdateEvent = Boolean(event.changes && event.changes.length > 0) || event.stage === 'Application Updated';

              return (
                <div key={idx} className="relative pl-6">
                  <div
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                      isUpdateEvent
                        ? 'bg-amber-100 border-amber-600'
                        : isLast
                        ? 'bg-emerald-100 border-emerald-600'
                        : 'bg-blue-100 border-blue-600'
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      {event.stage || event.action || 'Application Updated'}
                    </p>
                    {isUpdateEvent && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <FileEdit className="w-2.5 h-2.5" /> Edited
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{formatDateSafe(event.timestamp)}</p>

                  {isUpdateEvent && <AuditLogChangesViewer event={event} />}
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================================
// 2. DESKTOP PHYSICAL PAPER DETAIL VIEW SUB-COMPONENTS
// ============================================================================

/**
 * Line-based Paper Application Field
 * Matches authentic printed physical application form with underline fill-ins
 */
const PaperLine = ({ label, value, className = '', labelWidth = 'min-w-[135px]' }) => {
  const displayVal = value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : '';

  return (
    <div className={`flex flex-row items-baseline py-1 print:py-0.5 ${className}`}>
      <span className={`${labelWidth} text-xs sm:text-sm font-semibold text-slate-700 shrink-0 select-none pr-2 print:text-xs print:font-bold`}>
        {label}:
      </span>
      <div className="flex-1 border-b border-slate-300 sm:border-slate-400 min-h-[22px] print:min-h-[20px] flex items-end pb-0.5">
        <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide break-words print:text-xs">
          {displayVal || <span className="text-slate-300 font-normal italic">—</span>}
        </span>
      </div>
    </div>
  );
};

function DesktopPaperView({
  formData = {},
  application = {},
  currentDocs: externalDocs,
  onPreviewDoc,
  localTimeline: externalTimeline
}) {
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);
  const currentDocs =
    externalDocs ||
    formData.documents ||
    application.documents ||
    application.form_data?.documents ||
    {};
  const baseTimeline =
    externalTimeline ||
    formData.timeline ||
    application.form_data?.timeline ||
    [];

  const auditLogsAsEvents = (application.audit_logs || []).map((al) => ({
    stage: 'Application Updated',
    action: 'Application Details Modified',
    timestamp: al.created_at,
    editor_name: al.editor_name,
    changes: al.changes,
    changes_count: al.changes_count
  }));

  const localTimeline = [...baseTimeline, ...auditLogsAsEvents].sort((a, b) => {
    const tA = new Date(a.timestamp || 0).getTime();
    const tB = new Date(b.timestamp || 0).getTime();
    return tA - tB;
  });

  const formattedDate =
    formatDateSafe(application.created_at || application.updated_at) ||
    format(new Date(), 'dd MMM yyyy');
  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const loanType = application.loan_type || formData.loan_type || 'Business Loan';

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
      <div className="space-y-6 print:space-y-3 print-avoid-break">
        {/* Personal Details */}
        <div className="space-y-2 print:space-y-1">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2 print:mb-1">
            A. {labelPfx} Personal Details
          </div>
          <div className="flex flex-row items-start justify-between gap-4 print:flex-row print:items-start">
            <div className="flex-1 space-y-1 w-full">
              <PaperLine label={`${labelPfx} Name`} value={gName} />

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                <PaperLine label="Phone Number" value={gPhone} />
                <PaperLine label="Aadhaar Number" value={gAadhaar} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                <PaperLine label="Age" value={gAge ? `${gAge} Years` : ''} labelWidth="min-w-[70px]" />
                <PaperLine label="Gender" value={gGender} labelWidth="min-w-[70px]" />
                <PaperLine label="Marital Status" value={gMarital === 'Yes' ? 'Married' : gMarital === 'No' ? 'Unmarried' : gMarital} labelWidth="min-w-[100px]" />
              </div>

              {gFather && <PaperLine label="Father's Name" value={gFather} />}
              {gMother && <PaperLine label="Mother's Name" value={gMother} />}
              {gHusband && <PaperLine label="Husband's Name" value={gHusband} />}
              <PaperLine label="Own House" value={gOwnHouse} />
            </div>

            {/* Passport Photo Box */}
            <PassportPhotoBox
              doc={currentDocs[`guarantor_${idx}_photo`]}
              label={`Guarantor ${idx}`}
              icon={Shield}
              onPreview={onPreviewDoc}
            />
          </div>
        </div>

        {/* Current Address */}
        <div className="space-y-2 print:space-y-1">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2 print:mb-1">
            B. {labelPfx} Current Residential Address
          </div>
          <PaperLine label="Current Address" value={gCurAddr} />
          <PaperLine label="Street / Locality" value={gCurStreet} />
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
            <PaperLine label="City" value={gCurCity} labelWidth="min-w-[60px]" />
            <PaperLine label="State" value={gCurState} labelWidth="min-w-[60px]" />
            <PaperLine label="Postal Code" value={gCurZip} labelWidth="min-w-[90px]" />
          </div>
        </div>

        {/* Permanent Address */}
        <div className="space-y-2 print:space-y-1">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2 print:mb-1">
            C. {labelPfx} Permanent Residential Address
          </div>
          <PaperLine label="Permanent Address" value={gPermAddr} />
          <PaperLine label="Street / Locality" value={gPermStreet} />
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
            <PaperLine label="City" value={gPermCity} labelWidth="min-w-[60px]" />
            <PaperLine label="State" value={gPermState} labelWidth="min-w-[60px]" />
            <PaperLine label="Postal Code" value={gPermZip} labelWidth="min-w-[90px]" />
          </div>
        </div>

        {/* Employment & Income */}
        <div className="space-y-2 print:space-y-1">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2 print:mb-1">
            D. {labelPfx} Occupation & Income Details
          </div>
          <PaperLine label="Employment Type" value={gEmp === 'Job' ? 'Job (Salaried)' : gEmp === 'Business' ? 'Business (Self-Employed)' : gEmp} />

          {gEmp === 'Job' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                <PaperLine label="Job / Employer Name" value={gJobName} />
                <PaperLine label="Job Monthly Income" value={formatCurrency(gJobIncome)} labelWidth="min-w-[170px]" />
              </div>
              <PaperLine label="Workplace Address" value={gJobAddr} />
            </>
          )}

          {gEmp === 'Business' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                <PaperLine label="Business Name" value={gBizName} />
                <PaperLine label="Business Monthly Income" value={formatCurrency(gBizIncome)} labelWidth="min-w-[175px]" />
              </div>
              <PaperLine label="Business Address" value={gBizAddr} />
            </>
          )}
        </div>
      </div>
    );
  };

  const hasCoApplicant =
    formData.has_co_applicant === 'Yes' ||
    (formData.co_applicant_name && String(formData.co_applicant_name).trim() !== '');

  const maritalDisplay =
    formData.marital_status === 'Yes'
      ? 'Married'
      : formData.marital_status === 'No'
        ? 'Unmarried'
        : formData.marital_status;

  const coMaritalDisplay =
    formData.co_marital_status === 'Yes'
      ? 'Married'
      : formData.co_marital_status === 'No'
        ? 'Unmarried'
        : formData.co_marital_status;

  return (
    <div className="relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
      {/* Full Page Diagonal Application ID Watermark (Centered cross on every printed page with light fadeout color) */}
      <div className="print-watermark hidden print:flex">
        <span className="print-watermark-text">
          {appId}
        </span>
      </div>

      {/* Paper Form Header (Matching Acme HRMS Theme) */}
      <div className="p-6 sm:p-7 bg-white border-b border-slate-200 print:px-0 print:pt-0 print:pb-3">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest print:text-[10px]">
              <Building2 className="w-4 h-4 text-blue-600 print:w-3.5 print:h-3.5" /> Acme Financial Services • Credit Origination
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase print:text-lg">
              {loanType} Application Form
            </h1>
            <p className="text-xs text-slate-500 print:text-[10px]">
              Official Commercial Credit Record • Form Code: {loanType === 'Personal Loan' ? 'PL-ORIG-2026' : 'BL-ORIG-2026'}
            </p>
          </div>

          {/* App / Loan ID & Date Info */}
          <div className="flex flex-col items-end gap-0.5 text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider print:text-[9px]">
              Application ID
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-blue-600 print:text-xl">
              {appId}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 print:text-[10px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400 print:w-3 print:h-3" /> {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Paper Sheet Form Fields Body */}
      <div className="p-6 sm:p-8 space-y-8 print:space-y-4 print:p-4 bg-white text-slate-900">
        {/* ================= 1. APPLICANT PERSONAL DETAILS ================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">1.</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Applicant Personal Details
            </h2>
          </div>

          <div className="flex flex-row items-start justify-between gap-4 print:flex-row print:items-start pt-1">
            <div className="flex-1 space-y-1 w-full">
              <PaperLine label="Applicant Name" value={formData.applicant_name} />

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                <PaperLine label="Phone Number" value={formData.phone_number} />
                <PaperLine label="Aadhaar Number" value={formData.aadhaar_number} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                <PaperLine label="Age" value={formData.age ? `${formData.age} Years` : ''} labelWidth="min-w-[70px]" />
                <PaperLine label="Gender" value={formData.gender} labelWidth="min-w-[70px]" />
                <PaperLine label="Marital Status" value={maritalDisplay} labelWidth="min-w-[100px]" />
              </div>

              {formData.father_name && <PaperLine label="Father's Name" value={formData.father_name} />}
              {formData.mother_name && <PaperLine label="Mother's Name" value={formData.mother_name} />}
              {formData.husband_name && <PaperLine label="Husband's Name" value={formData.husband_name} />}
              <PaperLine label="Own House" value={formData.own_house} />
            </div>

            {/* Passport Photo Box */}
            <PassportPhotoBox
              doc={currentDocs.applicant_photo}
              label="Applicant"
              icon={User}
              onPreview={onPreviewDoc}
            />
          </div>
        </section>

        {/* ================= 2. APPLICANT RESIDENTIAL ADDRESS DETAILS ================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">2.</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Applicant Residential Address Details
            </h2>
          </div>

          {/* Current Address */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              A. Current Address
            </div>
            <PaperLine label="Current Address" value={formData.current_address} />
            <PaperLine label="Street / Locality" value={formData.current_street} />
            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
              <PaperLine label="City" value={formData.current_city} labelWidth="min-w-[60px]" />
              <PaperLine label="State" value={formData.current_state} labelWidth="min-w-[60px]" />
              <PaperLine label="Postal Code" value={formData.current_postal_code} labelWidth="min-w-[90px]" />
            </div>
          </div>

          {/* Permanent Address */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              B. Permanent Address
            </div>
            <PaperLine label="Permanent Address" value={formData.permanent_address} />
            <PaperLine label="Street / Locality" value={formData.permanent_street} />
            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
              <PaperLine label="City" value={formData.permanent_city} labelWidth="min-w-[60px]" />
              <PaperLine label="State" value={formData.permanent_state} labelWidth="min-w-[60px]" />
              <PaperLine label="Postal Code" value={formData.permanent_postal_code} labelWidth="min-w-[90px]" />
            </div>
          </div>
        </section>

        {/* ================= 3. APPLICANT OCCUPATION & INCOME ================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">3.</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Applicant Occupation & Income Details
            </h2>
          </div>

          <div className="space-y-2">
            <PaperLine
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
                <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                  <PaperLine label="Job / Employer Name" value={formData.job_name} />
                  <PaperLine label="Job Monthly Income" value={formatCurrency(formData.job_income_per_month)} labelWidth="min-w-[170px]" />
                </div>
                <PaperLine label="Workplace Address" value={formData.job_address} />
              </>
            )}

            {formData.employment === 'Business' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                  <PaperLine label="Business Name" value={formData.business_name} />
                  <PaperLine label="Business Monthly Income" value={formatCurrency(formData.business_income_per_month)} labelWidth="min-w-[175px]" />
                </div>
                <PaperLine label="Business Address" value={formData.business_address} />
              </>
            )}
          </div>
        </section>

        {/* ================= 4. CO-APPLICANT DETAILS ================= */}
        <section className={`space-y-4 ${hasCoApplicant ? 'print-break-before print:space-y-2 print:p-0 print:m-0' : 'print:hidden'}`}>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">4.</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Co-Applicant Details
            </h2>
          </div>

          <PaperLine label="Has Co-Applicant" value={hasCoApplicant ? 'Yes' : 'No'} />

          {hasCoApplicant && (
            <div className="space-y-6 pt-2">
              {/* Co-Applicant Personal Details */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  A. Co-Applicant Personal Details
                </div>
                <div className="flex flex-row items-start justify-between gap-4 print:flex-row print:items-start pt-1">
                  <div className="flex-1 space-y-1 w-full">
                    <PaperLine label="Co-Applicant Name" value={formData.co_applicant_name} />
                    <PaperLine label="Relation with Applicant" value={formData.co_relation_with_applicant} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                      <PaperLine label="Phone Number" value={formData.co_phone_number} />
                      <PaperLine label="Aadhaar Number" value={formData.co_aadhaar_number} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                      <PaperLine label="Age" value={formData.co_age ? `${formData.co_age} Years` : ''} labelWidth="min-w-[70px]" />
                      <PaperLine label="Gender" value={formData.co_gender} labelWidth="min-w-[70px]" />
                      <PaperLine label="Marital Status" value={coMaritalDisplay} labelWidth="min-w-[100px]" />
                    </div>

                    {formData.co_father_name && <PaperLine label="Father's Name" value={formData.co_father_name} />}
                    {formData.co_mother_name && <PaperLine label="Mother's Name" value={formData.co_mother_name} />}
                    {formData.co_husband_name && <PaperLine label="Husband's Name" value={formData.co_husband_name} />}
                    <PaperLine label="Own House" value={formData.co_own_house} />
                  </div>

                  {/* Passport Photo Box */}
                  <PassportPhotoBox
                    doc={currentDocs.co_applicant_photo}
                    label="Co-Applicant"
                    icon={Users}
                    onPreview={onPreviewDoc}
                  />
                </div>
              </div>

              {/* Co-Applicant Current Address */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  B. Co-Applicant Current Residential Address
                </div>
                <PaperLine label="Current Address" value={formData.co_current_address} />
                <PaperLine label="Street / Locality" value={formData.co_current_street} />
                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                  <PaperLine label="City" value={formData.co_current_city} labelWidth="min-w-[60px]" />
                  <PaperLine label="State" value={formData.co_current_state} labelWidth="min-w-[60px]" />
                  <PaperLine label="Postal Code" value={formData.co_current_postal_code} labelWidth="min-w-[90px]" />
                </div>
              </div>

              {/* Co-Applicant Permanent Address */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  C. Co-Applicant Permanent Residential Address
                </div>
                <PaperLine label="Permanent Address" value={formData.co_permanent_address} />
                <PaperLine label="Street / Locality" value={formData.co_permanent_street} />
                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                  <PaperLine label="City" value={formData.co_permanent_city} labelWidth="min-w-[60px]" />
                  <PaperLine label="State" value={formData.co_permanent_state} labelWidth="min-w-[60px]" />
                  <PaperLine label="Postal Code" value={formData.co_permanent_postal_code} labelWidth="min-w-[90px]" />
                </div>
              </div>

              {/* Co-Applicant Employment */}
              {formData.co_employment && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                    D. Co-Applicant Occupation & Income Details
                  </div>
                  <PaperLine
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                        <PaperLine label="Job Name" value={formData.co_job_name} />
                        <PaperLine label="Job Income" value={formatCurrency(formData.co_job_income_per_month)} labelWidth="min-w-[170px]" />
                      </div>
                      <PaperLine label="Job Address" value={formData.co_job_address} />
                    </>
                  )}

                  {formData.co_employment === 'Business' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                        <PaperLine label="Business Name" value={formData.co_business_name} />
                        <PaperLine label="Business Income" value={formatCurrency(formData.co_business_income_per_month)} labelWidth="min-w-[175px]" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">5.</span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
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

          {/* Active Guarantor Form in Screen View (Hidden in Print to prevent duplication) */}
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 bg-slate-50/50 print:hidden">
            {renderGuarantorPaper(activeGuarantorTab)}
          </div>

          {/* Print Layout: Sequentially outputs all 3 Guarantors with pagination breaks */}
          <div className="hidden print:block">
            <div className="space-y-4 print-break-before">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">5.</span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">Guarantor 1 Details</h2>
              </div>
              {renderGuarantorPaper(1)}
            </div>

            <div className="space-y-4 print-break-before">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">6.</span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">Guarantor 2 Details</h2>
              </div>
              {renderGuarantorPaper(2)}
            </div>

            <div className="space-y-4 print-break-before">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">7.</span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">Guarantor 3 Details</h2>
              </div>
              {renderGuarantorPaper(3)}
            </div>
          </div>
        </section>

        {/* ================= 6. APPLICATION TIMELINE ================= */}
        <section className="space-y-4 print:hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 shrink-0">6.</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Application Timeline
            </h2>
          </div>
          
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 bg-slate-50/50">
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
              {/* Created Event (Inferred) */}
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600" />
                <p className="text-sm font-bold text-slate-800">Application Created</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{formattedDate}</p>
              </div>
              
              {/* Dynamic Events from localTimeline */}
              {localTimeline.map((event, idx) => {
                const isLast = idx === localTimeline.length - 1;
                const isUpdateEvent = Boolean(event.changes && event.changes.length > 0) || event.stage === 'Application Updated';

                return (
                  <div key={idx} className="relative pl-6">
                    <div
                      className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                        isUpdateEvent
                          ? 'bg-amber-100 border-amber-600'
                          : isLast
                          ? 'bg-emerald-100 border-emerald-600'
                          : 'bg-blue-100 border-blue-600'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        {event.stage || event.action || 'Application Updated'}
                      </p>
                      {isUpdateEvent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <FileEdit className="w-3 h-3" /> Edited
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formatDateSafe(event.timestamp)}</p>

                    {isUpdateEvent && <AuditLogChangesViewer event={event} />}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// ============================================================================
// 3. UNIFIED RESPONSIVE BUSINESS LOAN DETAIL VIEW EXPORT
// ============================================================================

export function LoanDetailView({
  formData = {},
  application = {},
  currentDocs,
  onPreviewDoc,
  localTimeline
}) {
  return (
    <>
      {/* Mobile Detail View: Spacious cards (Hidden in Print) */}
      <div className="md:hidden print:hidden">
        <MobileDetailView
          formData={formData}
          application={application}
          currentDocs={currentDocs}
          onPreviewDoc={onPreviewDoc}
          localTimeline={localTimeline}
        />
      </div>

      {/* Desktop Detail View: Physical paper document with print capabilities (Always forced visible in Print) */}
      <div className="hidden md:block print:block">
        <DesktopPaperView
          formData={formData}
          application={application}
          currentDocs={currentDocs}
          onPreviewDoc={onPreviewDoc}
          localTimeline={localTimeline}
        />
      </div>
    </>
  );
}

export { LoanDetailView as BusinessLoanDetailView, MobileDetailView as BusinessLoanMobileDetailView, DesktopPaperView as BusinessLoanPaperView };
export default LoanDetailView;
