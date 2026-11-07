import { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Users,
  Shield,
  ShieldCheck,
  Calendar,
  UserCheck,
  Edit3,
  ChevronDown,
  ChevronUp,
  History,
  FileEdit,
  MapPin,
  Briefcase,
  Phone,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { preloadAndDecodeImages } from '../../utils/imageCompressor';

// ============================================================================
// HELPER UTILITIES & CONFIG
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
 * Compact Google Workspace Style Audit Log Diff Viewer
 * Displays only the modified fields (old value vs new value) and editor details.
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
    <div className="mt-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] p-3.5 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
          <div className="p-1 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--line)] flex items-center justify-center">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <span>
            Edited by <strong className="font-semibold text-[var(--text)]">{editorName}</strong>
          </span>
        </div>
        {changes.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-deep)] hover:opacity-85 bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--line)] shadow-xs transition-all cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isOpen ? 'Hide Diff' : 'View Diff'} ({changes.length})</span>
          </button>
        )}
      </div>

      {isOpen && changes.length > 0 && (
        <div className="rounded-[10px] border border-[var(--line)] overflow-x-auto bg-[var(--surface)] shadow-xs">
          <table className="w-full text-xs text-left table-fixed min-w-[500px]">
            <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[var(--muted)] font-semibold whitespace-nowrap">
              <tr>
                <th className="p-2.5 font-bold text-[var(--text)] w-[40%]">Modified Field</th>
                <th className="p-2.5 font-bold text-[var(--muted)] w-[30%]">Previous Value</th>
                <th className="p-2.5 font-bold text-[var(--brand-deep)] w-[30%]">Updated Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {changes.map((ch, cIdx) => (
                <tr key={cIdx} className="hover:bg-[var(--surface-alt)] transition-colors">
                  <td className="p-2.5 font-medium text-[#1f1f1f] break-words">
                    {ch.label || ch.field}
                  </td>
                  <td className="p-2.5 text-[#5f6368]">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] line-through">
                      {ch.old_value || '—'}
                    </span>
                  </td>
                  <td className="p-2.5 text-[#1f1f1f]">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
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
 * Google Material 3 Passport Photograph Box Component
 * Displays authentic rounded box with photo preview and tap-to-enlarge modal preview.
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
        className={`${boxDimensions} rounded-[16px] border-2 ${
          photoUrl 
            ? 'border-[var(--brand-deep)] bg-[var(--brand-tint)]/40' 
            : 'border-dashed border-[var(--line)] bg-[var(--surface-alt)]'
        } flex flex-col items-center justify-center p-1.5 overflow-hidden shadow-xs transition-all print:w-[110px] print:h-[140px] print:max-w-[110px] print:max-h-[140px]`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={label}
            width="110"
            height="140"
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover rounded-[12px] cursor-pointer hover:opacity-90 active:scale-95 transition-all print:w-[102px] print:h-[130px] print:max-h-[130px] print:object-cover shadow-xs"
            onClick={() => onPreview && onPreview(photoUrl)}
            title="Click to view full size"
          />
        ) : (
          <div className="text-center p-1.5 flex flex-col items-center justify-center h-full">
            <div className="p-2 rounded-[10px] bg-[var(--line)] text-[var(--icon-muted)] mb-1.5">
              <Icon className={`${isSmall ? 'w-4 h-4' : 'w-5 h-5'} text-[var(--icon-muted)]`} />
            </div>
            <p className={`${isSmall ? 'text-[8px]' : 'text-[9.5px]'} font-bold text-[var(--muted)] uppercase tracking-tight leading-tight`}>
              Passport Photo
            </p>
            <span className={`${isSmall ? 'text-[7.5px]' : 'text-[8.5px]'} text-[var(--icon-muted)] italic mt-0.5`}>
              Not Uploaded
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] font-bold text-[var(--muted)] mt-1.5 uppercase tracking-wider text-center print:text-[9px]">
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 1. MOBILE DETAIL VIEW SUB-COMPONENTS
// ============================================================================

const DetailField = ({ label, value }) => {
  const displayVal =
    value !== null && value !== undefined && String(value).trim() !== ''
      ? String(value)
      : '—';

  return (
    <div className="py-2">
      <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--text)] leading-snug break-words">
        {displayVal}
      </p>
    </div>
  );
};

const FieldDivider = () => <div className="border-b border-[var(--line)]" />;

const SectionCard = ({ number, title, icon: Icon, children }) => (
  <div className="bg-[var(--surface)] rounded-[20px] shadow-xs border border-[var(--line)] overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-[var(--line)] bg-[var(--surface-alt)]">
      <div className="w-6 h-6 rounded-[8px] bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
        {number}
      </div>
      {Icon && <Icon className="w-4 h-4 text-[var(--brand-deep)]" />}
      <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const SubSectionHeader = ({ label }) => (
  <div className="pt-3 pb-1">
    <p className="text-[11px] font-semibold text-[var(--brand-deep)] uppercase tracking-wider">
      {label}
    </p>
    <div className="border-b border-[var(--line)] mt-1" />
  </div>
);

/**
 * Mobile Read-Only View Component
 */
function MobileDetailView({
  formData = {},
  application = {},
  currentDocs: externalDocs,
  onPreviewDoc,
  localTimeline: externalTimeline,
  hideHeader = true
}) {
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);
  const currentDocs =
    externalDocs ||
    formData.documents ||
    application.documents ||
    application.form_data?.documents ||
    {};
  const resolveTimeline = () => {
    if (externalTimeline && Array.isArray(externalTimeline) && externalTimeline.length > 0) {
      return externalTimeline;
    }
    const raw = formData.timeline || application.form_data?.timeline || application.stage_history || [];
    const base = raw.filter(
      (ev) => ev.stage !== 'Application Updated' && !String(ev.action || '').includes('Modified')
    );
    const auditEvents = (application.audit_logs || []).map((al) => ({
      id: al.id,
      stage: 'Application Updated',
      action: 'Application Details Modified',
      timestamp: al.created_at,
      editor_name: al.editor_name,
      changes: al.changes,
      changes_count: al.changes_count
    }));
    return [...base, ...auditEvents].sort((a, b) => {
      return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    });
  };

  const localTimeline = resolveTimeline();

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

  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const loanType = application.loan_type || formData.loan_type || 'Business Loan';

  return (
    <div className="space-y-4 pb-12">
      {/* Mobile Header Card */}
      {!hideHeader && (
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--line)]">
                <Building2 className="w-3.5 h-3.5" />
                {loanType}
              </span>
              <span className="text-xs text-[var(--muted)] font-medium">
                {formattedDate}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text)]">
              {formData.applicant_name || 'Loan Application'}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              ID: <strong className="text-[var(--brand-deep)]">{appId}</strong>
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Applicant Personal Details ── */}
      <SectionCard number="1" title="Applicant Personal Details" icon={User}>
        <div className="flex items-start justify-between gap-3 pb-2">
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
        <div className="grid grid-cols-2 gap-x-3">
          <DetailField label="Age" value={formData.age ? `${formData.age} Years` : ''} />
          <DetailField label="Gender" value={formData.gender} />
        </div>
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

      {/* ── 2. Residential Addresses ── */}
      <SectionCard number="2" title="Residential Addresses" icon={MapPin}>
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
      <SectionCard number="3" title="Occupation & Income Details" icon={Briefcase}>
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
      <SectionCard number="4" title="Co-Applicant Profile" icon={Users}>
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
            <div className="grid grid-cols-2 gap-x-3">
              <DetailField label="Age" value={formData.co_age ? `${formData.co_age} Years` : ''} />
              <DetailField label="Gender" value={formData.co_gender} />
            </div>
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

      {/* ── 5. Guarantors Verification (3 Required) ── */}
      <SectionCard number="5" title="Guarantors Verification (3 Required)" icon={ShieldCheck}>
        {/* Guarantor Tab Buttons */}
        <div 
          className="flex items-center gap-1.5 p-1.5 bg-[#f8fafd] rounded-full border border-[#dadce0] mb-4 shadow-2xs overflow-x-auto no-scrollbar hide-scrollbar scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[1, 2, 3].map((idx) => {
            const isActive = activeGuarantorTab === idx;
            const gName = formData[`guarantor_${idx}_name`];
            const shortName = gName ? ` (${gName.split(' ')[0]})` : '';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveGuarantorTab(idx)}
                className={`flex-1 min-w-fit py-3 px-4 rounded-full text-xs font-bold transition-all cursor-pointer text-center leading-none whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[var(--ink)] text-white shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]'
                }`}
              >
                G{idx}{shortName}
              </button>
            );
          })}
        </div>

        {/* Selected Guarantor Details */}
        {(() => {
          const idx = activeGuarantorTab;
          const pfx = `guarantor_${idx}_`;
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
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <DetailField label="Guarantor Name" value={gName} />
                  <FieldDivider />
                  <DetailField label="Phone Number" value={gPhone} />
                  <FieldDivider />
                  <DetailField label="Aadhaar Number" value={gAadhaar} />
                </div>
                <PassportPhotoBox
                  doc={currentDocs[`guarantor_${idx}_photo`]}
                  label={`Guarantor ${idx}`}
                  icon={Shield}
                  size="sm"
                  onPreview={onPreviewDoc}
                />
              </div>
              <FieldDivider />
              <div className="grid grid-cols-2 gap-x-3">
                <DetailField label="Age" value={gAge ? `${gAge} Years` : ''} />
                <DetailField label="Gender" value={gGender} />
              </div>
              <FieldDivider />
              <DetailField
                label="Marital Status"
                value={gMarital === 'Yes' ? 'Married' : gMarital === 'No' ? 'Unmarried' : gMarital}
              />
              {gFather && (
                <>
                  <FieldDivider />
                  <DetailField label="Father's Name" value={gFather} />
                </>
              )}
              {gMother && (
                <>
                  <FieldDivider />
                  <DetailField label="Mother's Name" value={gMother} />
                </>
              )}
              {gHusband && (
                <>
                  <FieldDivider />
                  <DetailField label="Husband's Name" value={gHusband} />
                </>
              )}
              <FieldDivider />
              <DetailField label="Own House" value={gOwnHouse} />

              <SubSectionHeader label="Current Address" />
              <DetailField label="Address" value={gCurAddr} />
              <FieldDivider />
              <DetailField label="Street / Locality" value={gCurStreet} />
              <FieldDivider />
              <div className="grid grid-cols-2 gap-x-3">
                <DetailField label="City" value={gCurCity} />
                <DetailField label="State" value={gCurState} />
              </div>
              <FieldDivider />
              <DetailField label="Postal Code" value={gCurZip} />

              <SubSectionHeader label="Permanent Address" />
              <DetailField label="Address" value={gPermAddr} />
              <FieldDivider />
              <DetailField label="Street / Locality" value={gPermStreet} />
              <FieldDivider />
              <div className="grid grid-cols-2 gap-x-3">
                <DetailField label="City" value={gPermCity} />
                <DetailField label="State" value={gPermState} />
              </div>
              <FieldDivider />
              <DetailField label="Postal Code" value={gPermZip} />

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
                  <DetailField label="Job Name" value={gJobName} />
                  <FieldDivider />
                  <DetailField label="Job Income" value={formatCurrency(gJobIncome)} />
                  <FieldDivider />
                  <DetailField label="Job Address" value={gJobAddr} />
                </>
              )}
              {gEmp === 'Business' && (
                <>
                  <FieldDivider />
                  <DetailField label="Business Name" value={gBizName} />
                  <FieldDivider />
                  <DetailField label="Business Income" value={formatCurrency(gBizIncome)} />
                  <FieldDivider />
                  <DetailField label="Business Address" value={gBizAddr} />
                </>
              )}
            </div>
          );
        })()}
      </SectionCard>

      {/* ── 6. Application Timeline ── */}
      <SectionCard number="6" title="Application Timeline & History" icon={History}>
        <div className="relative border-l-2 border-[var(--line)] ml-3 space-y-5 pb-2 pt-1">
          {/* Created Event */}
          <div className="relative pl-5">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--brand-tint)] border-2 border-[var(--brand-deep)]" />
            <p className="text-xs font-semibold text-[var(--text)]">Application Submitted</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">{formattedDate}</p>
          </div>

          {/* Dynamic Events */}
          {localTimeline.map((event, idx) => {
            const isLast = idx === localTimeline.length - 1;
            const isUpdateEvent = Boolean(event.changes && event.changes.length > 0) || event.stage === 'Application Updated';

            return (
              <div key={idx} className="relative pl-5">
                <div
                  className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                    isUpdateEvent
                      ? 'bg-[var(--warning-tint,#FDF3DC)] border-[var(--warning-text,#B7791F)]'
                      : isLast
                      ? 'bg-[var(--success-tint,#E6F6EC)] border-[var(--success-text,#1F9D55)]'
                      : 'bg-[var(--brand-tint)] border-[var(--brand-deep)]'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--text)]">
                    {event.stage || event.action || 'Application Updated'}
                  </p>
                  {isUpdateEvent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-[var(--warning-tint,#FDF3DC)] text-[var(--warning-text,#B7791F)] border border-[var(--line)]">
                      <FileEdit className="w-2.5 h-2.5" /> Edited
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5f6368] mt-0.5">{formatDateSafe(event.timestamp)}</p>

                {isUpdateEvent && <AuditLogChangesViewer event={event} />}
              </div>
            );
          })}
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
const PaperLine = ({ label, value, className = '', labelWidth = 'min-w-[140px]' }) => {
  const displayVal = value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : '';

  return (
    <div className={`flex flex-row items-baseline py-1 print:py-0.5 ${className}`}>
      <span className={`${labelWidth} text-xs sm:text-sm font-semibold text-[#3c4043] shrink-0 select-none pr-2 print:text-xs print:font-bold`}>
        {label}:
      </span>
      <div className="flex-1 border-b border-[#dadce0] min-h-[22px] print:min-h-[20px] flex items-end pb-0.5">
        <span className="text-xs sm:text-sm font-bold text-[#1f1f1f] tracking-wide break-words print:text-xs">
          {displayVal || <span className="text-[#80868b] font-normal italic">—</span>}
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
  const resolveTimeline = () => {
    if (externalTimeline && Array.isArray(externalTimeline) && externalTimeline.length > 0) {
      return externalTimeline;
    }
    const raw = formData.timeline || application.form_data?.timeline || application.stage_history || [];
    const base = raw.filter(
      (ev) => ev.stage !== 'Application Updated' && !String(ev.action || '').includes('Modified')
    );
    const auditEvents = (application.audit_logs || []).map((al) => ({
      id: al.id,
      stage: 'Application Updated',
      action: 'Application Details Modified',
      timestamp: al.created_at,
      editor_name: al.editor_name,
      changes: al.changes,
      changes_count: al.changes_count
    }));
    return [...base, ...auditEvents].sort((a, b) => {
      return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    });
  };

  const localTimeline = resolveTimeline();

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
          <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 print:mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
          <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 print:mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
          <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 print:mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
          <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 print:mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
    <div className="relative bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden print:shadow-none print:border-0 print:rounded-none">
      {/* Full Page Diagonal Application ID Watermark (Print Only) */}
      <div className="print-watermark hidden print:flex">
        <span className="print-watermark-text">
          {appId}
        </span>
      </div>

      {/* Paper Form Header */}
      <div className="p-6 sm:p-7 bg-[var(--surface-alt)] border-b border-[var(--line)] print:bg-white print:px-0 print:pt-0 print:pb-3">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--brand-deep)] font-bold text-xs uppercase tracking-wider print:text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
              <span>Acme Financial Services • Loan Origination</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] uppercase print:text-lg">
              {loanType} Application Record
            </h1>
            <p className="text-xs text-[var(--muted)] print:text-[10px]">
              Official Credit & Underwriting Dossier • Form Ref: {loanType === 'Personal Loan' ? 'PL-ORIG-2026' : 'BL-ORIG-2026'}
            </p>
          </div>

          {/* App ID & Date Pill */}
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider print:text-[9px]">
              Application ID
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--brand-deep)] print:text-xl">
              {appId}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-[#5f6368] print:text-[10px]">
              <Calendar className="w-3.5 h-3.5 text-[#80868b] print:w-3 print:h-3" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Paper Sheet Form Fields Body */}
      <div className="p-6 sm:p-8 space-y-8 print:space-y-4 print:p-4 bg-white text-[#1f1f1f]">
        {/* ================= 1. APPLICANT PERSONAL DETAILS ================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--line)] print:border-[#ccc] pb-2">
            <div className="w-6 h-6 rounded-[8px] bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              1
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text)] uppercase tracking-wide">
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
          <div className="flex items-center gap-2 border-b border-[var(--line)] print:border-[#ccc] pb-2">
            <div className="w-6 h-6 rounded-[8px] bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              2
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text)] uppercase tracking-wide">
              Applicant Residential Address Details
            </h2>
          </div>

          {/* Current Address */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
            <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
          <div className="flex items-center gap-2 border-b border-[var(--line)] print:border-[#ccc] pb-2">
            <div className="w-6 h-6 rounded-[8px] bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              3
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text)] uppercase tracking-wide">
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
          <div className="flex items-center gap-2 border-b border-[var(--line)] print:border-[#ccc] pb-2">
            <div className="w-6 h-6 rounded-[8px] bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              4
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text)] uppercase tracking-wide">
              Co-Applicant Details
            </h2>
          </div>

          <PaperLine label="Has Co-Applicant" value={hasCoApplicant ? 'Yes' : 'No'} />

          {hasCoApplicant && (
            <div className="space-y-6 pt-2">
              {/* Co-Applicant Personal Details */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
                <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
                <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
                  <div className="text-xs font-semibold text-[var(--brand-deep)] uppercase tracking-wider border-b border-[var(--line)] print:border-[#ccc] pb-1 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] print:border-[#ccc] pb-2 print:hidden">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[8px] bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                5
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text)] uppercase tracking-wide">
                Guarantors Details (3 Required)
              </h2>
            </div>

            {/* Guarantor Tabs Styled Like Google Pill Buttons */}
            <div 
              className="flex items-center gap-2 overflow-x-auto no-scrollbar hide-scrollbar scrollbar-none print:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {[1, 2, 3].map((gIdx) => {
                const isActive = activeGuarantorTab === gIdx;
                const gName = formData[`guarantor_${gIdx}_name`];
                const shortName = gName ? ` (${gName.split(' ')[0]})` : '';

                return (
                  <button
                    key={gIdx}
                    type="button"
                    onClick={() => setActiveGuarantorTab(gIdx)}
                    className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-5 py-2.5 transition-all gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[var(--ink)] text-white shadow-xs'
                        : 'bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] border border-[var(--line)]'
                    }`}
                  >
                    Guarantor {gIdx}{shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Guarantor Form in Screen View (Hidden in Print to prevent duplication) */}
          <div className="p-5 rounded-[20px] border border-[var(--line)] bg-[var(--surface-alt)] print:hidden shadow-2xs">
            {renderGuarantorPaper(activeGuarantorTab)}
          </div>

          {/* Print Layout: Sequentially outputs all 3 Guarantors with pagination breaks */}
          <div className="hidden print:block">
            <div className="space-y-4 print-break-before">
              <div className="flex items-center gap-2 border-b border-[#e0e3e7] pb-2">
                <span className="text-base sm:text-lg font-bold text-[#1f1f1f] shrink-0">5.</span>
                <h2 className="text-base sm:text-lg font-bold text-[#1f1f1f] uppercase tracking-wide">Guarantor 1 Details</h2>
              </div>
              {renderGuarantorPaper(1)}
            </div>

            <div className="space-y-4 print-break-before">
              <div className="flex items-center gap-2 border-b border-[#e0e3e7] pb-2">
                <span className="text-base sm:text-lg font-bold text-[#1f1f1f] shrink-0">6.</span>
                <h2 className="text-base sm:text-lg font-bold text-[#1f1f1f] uppercase tracking-wide">Guarantor 2 Details</h2>
              </div>
              {renderGuarantorPaper(2)}
            </div>

            <div className="space-y-4 print-break-before">
              <div className="flex items-center gap-2 border-b border-[#e0e3e7] pb-2">
                <span className="text-base sm:text-lg font-bold text-[#1f1f1f] shrink-0">7.</span>
                <h2 className="text-base sm:text-lg font-bold text-[#1f1f1f] uppercase tracking-wide">Guarantor 3 Details</h2>
              </div>
              {renderGuarantorPaper(3)}
            </div>
          </div>
        </section>

        {/* ================= 6. APPLICATION TIMELINE ================= */}
        <section className="space-y-4 print:hidden">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
            <div className="w-6 h-6 rounded-[8px] bg-[var(--ink)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              6
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text)] uppercase tracking-wide">
              Application Timeline & Edit Logs
            </h2>
          </div>
          
          <div className="p-5 rounded-[20px] border border-[var(--line)] bg-[var(--surface-alt)] shadow-xs">
            <div className="relative border-l-2 border-[var(--line)] ml-3 space-y-6 pb-2">
              {/* Created Event (Inferred) */}
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--brand-tint)] border-2 border-[var(--brand-deep)]" />
                <p className="text-xs font-semibold text-[var(--text)]">Application Submitted</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">{formattedDate}</p>
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
                          ? 'bg-[var(--warning-tint,#FDF3DC)] border-[var(--warning-text,#B7791F)]'
                          : isLast
                          ? 'bg-[var(--success-tint,#E6F6EC)] border-[var(--success-text,#1F9D55)]'
                          : 'bg-[var(--brand-tint)] border-[var(--brand-deep)]'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[var(--text)]">
                        {event.stage || event.action || 'Application Updated'}
                      </p>
                      {isUpdateEvent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                          <FileEdit className="w-2.5 h-2.5" /> Edited
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#5f6368] mt-0.5">{formatDateSafe(event.timestamp)}</p>

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
  localTimeline,
  hideHeader = true
}) {
  // Pre-decode all document photos in background so print previews open instantaneously
  useEffect(() => {
    if (!currentDocs) return;
    const docKeys = [
      'applicant_photo',
      'co_applicant_photo',
      'guarantor_1_photo',
      'guarantor_2_photo',
      'guarantor_3_photo'
    ];
    const urls = docKeys
      .map((k) => getDocumentPhotoUrl(currentDocs[k]))
      .filter(Boolean);

    if (urls.length > 0) {
      preloadAndDecodeImages(urls, 1000).catch(() => {});
    }
  }, [currentDocs]);
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
          hideHeader={hideHeader}
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
