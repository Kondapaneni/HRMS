import React from 'react';
import PageLoader from '../components/PageLoader';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  FileEdit
} from 'lucide-react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useRemoteData } from '../state/remote.js';
import { getLoanApplications, getLeads } from '../services/loanServices';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileLoanMemberDetails = ({ member: propMember }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone } = useParams();

  // Fetch leads if propMember or location.state.member is missing
  const { data: response, isLoading: isLoadingLeads } = useRemoteData({
    scope: ['origination', 'leads', 'member-details', phone],
    load: getLeads,
    enabled: !propMember && !location.state?.member
  });

  const member = React.useMemo(() => {
    if (propMember) return propMember;
    if (location.state?.member) {
      return location.state.member;
    }
    if (response?.leads && phone) {
      const converted = response.leads.filter(l => l.status === 'Converted' && String(l.phone) === String(phone));
      if (converted.length > 0) {
        const lead = converted[0];
        return {
          id: lead.phone,
          lead_id: lead.id,
          name: lead.name,
          phone: lead.phone,
          address: lead.address,
          created_at: lead.created_at,
          status: 'Converted',
          loans: converted
        };
      }
    }
    return null;
  }, [propMember, location.state?.member, response, phone]);

  const { data: appsResponse, isLoading: isLoadingApps } = useRemoteData({
    scope: ['origination', 'applications', 'list'],
    load: getLoanApplications,
  });

  const createdLeadIds = React.useMemo(() => {
    if (!appsResponse?.applications) return new Set();
    return new Set(
      appsResponse.applications
        .filter(app => app.status !== 'Draft' && app.lead_id)
        .map(app => String(app.lead_id))
    );
  }, [appsResponse]);

  // Wait for both required reads before showing any member data.
  if ((isLoadingLeads && !member) || (isLoadingApps && !appsResponse)) {
    return <PageLoader message="Loading member details..." />;
  }

  if (!member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-[var(--muted)] space-y-3">
        <p className="text-sm font-semibold text-[var(--text)]">Member profile not found.</p>
        <button
          type="button"
          onClick={() => navigate('/employee/loans/origination/members')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--ink)] rounded-full shadow-xs cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Members
        </button>
      </div>
    );
  }

  const defaultLeadId = String(member.lead_id || member.id || '');
  const isMemberDefaultCreated = createdLeadIds.has(defaultLeadId);

  return (
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">

      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Member <span className="text-[var(--brand-deep)]">Details</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate('/employee/loans/origination/members')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            Verified Borrower Profile
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-4">

        {/* Member Profile Card */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs space-y-4">
        
          {/* Avatar, Name & Status Pill */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--brand-tint)] flex items-center justify-center text-base font-semibold text-[var(--brand-deep)] shrink-0">
                {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text)] truncate">
                  {member.name}
                </h2>
                <p className="text-xs text-[var(--brand-deep)] font-medium truncate mt-0.5">
                  Verified Borrower
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[8px] text-[12px] font-semibold shrink-0 bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]">
                <CheckCircle2 size={14} /> Member
              </span>
            </div>
          </div>

          {/* Contact Info Rows */}
          <div className="space-y-3 pt-1">
            {/* Phone with Call Action */}
            <div>
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 pl-1">
                Contact Number
              </span>
              {member.phone ? (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center justify-between pl-3.5 pr-1.5 py-1.5 rounded-[12px] bg-[var(--surface-alt)] hover:bg-[var(--line)] border border-[var(--line)] transition-all cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                      <Phone size={14} />
                    </div>
                    <span className="font-semibold text-sm text-[var(--text)]">
                      {maskPhoneNumber(member.phone)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--surface)] px-3.5 py-1.5 rounded-[8px] border border-[var(--line)] shadow-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </span>
                </a>
              ) : (
                <p className="text-xs text-[var(--muted)] pl-1">—</p>
              )}
            </div>

            {/* Address */}
            {member.address && (
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 pl-1">
                  Residential Address
                </span>
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)] text-xs text-[var(--text)]">
                  <MapPin size={15} className="text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-normal">{member.address}</span>
                </div>
              </div>
            )}

            {/* Member Since */}
            {member.created_at && (
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 pl-1">
                  Member Since
                </span>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[var(--surface-alt)] border border-[var(--line)] text-xs text-[var(--text)]">
                  <Calendar size={15} className="text-[var(--brand-deep)] shrink-0" />
                  <span className="font-normal">{format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a')}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* 3. Loan Origination Applications History */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                <Briefcase className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Loan Applications</h3>
                <p className="text-[11px] text-[var(--muted)]">Pipeline Requests on Record</p>
              </div>
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              {member.loans?.length || 0} Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {member.loans && member.loans.length > 0 ? (
              member.loans.map((loan) => {
                const currentLeadId = String(loan.id || loan.lead_id || member.lead_id || '');
                const isCreated = createdLeadIds.has(currentLeadId);

                return (
                  <div 
                    key={loan.id} 
                    className="p-4 rounded-[16px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">
                          {loan.loan_type || 'Personal Loan'}
                        </p>
                        <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5">
                          Lead Ref: #{loan.id ? String(loan.id).slice(0, 8) : 'Direct'}
                        </p>
                      </div>

                      {<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold ${
                          isCreated 
                            ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]' 
                            : 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
                        }`}>
                          <CheckCircle2 size={13} /> {isCreated ? 'Created' : (loan.status || 'Draft')}
                        </span>}
                    </div>

                    <div className="pt-2.5 border-t border-[var(--line)] flex items-center justify-end">
                      {isCreated ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-[10px] bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]">
                          <Lock size={12} /> Application Created
                        </span>
                      ) : (
                        <Link
                          to="/employee/loans/form"
                          state={{ 
                            name: member.name, 
                            phone: member.phone, 
                            lead_id: currentLeadId, 
                            loan_type: loan.loan_type,
                            from: '/employee/loans/origination/members'
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <FileEdit size={13} />
                          <span>Fill Application</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-[var(--muted)] font-medium bg-[var(--surface-alt)] rounded-[16px] border border-[var(--line)] space-y-3">
                <p>No loan history on record.</p>
                {isMemberDefaultCreated ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-[10px] bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]">
                    <Lock size={12} /> Application Created
                  </span>
                ) : (
                  <Link
                    to="/employee/loans/form"
                    state={{ 
                      name: member.name, 
                      phone: member.phone, 
                      lead_id: member.lead_id,
                      from: '/employee/loans/origination/members'
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <FileEdit size={13} />
                    <span>Start New Application</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default OriginationMobileLoanMemberDetails;