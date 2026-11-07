import React from 'react';
import { ArrowLeft, Phone, MapPin, Calendar, ShoppingBag, CheckCircle2, Loader2, ArrowRight, Lock, FileEdit } from 'lucide-react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';
import { getLoanApplications } from '../services/loanServices';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileSaleMemberDetails = ({ member: propMember }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone } = useParams();

  // Fetch leads if propMember or location.state.member is missing
  const { data: response, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['sales', 'leads', 'member-details', phone],
    queryFn: () => getSalesLeads(),
    enabled: !propMember && !location.state?.member
  });

  const { data: appsResponse, isLoading: isLoadingApps } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
  });

  const createdLeadIds = React.useMemo(() => {
    if (!appsResponse?.applications) return new Set();
    return new Set(
      appsResponse.applications
        .filter(app => app.status !== 'Draft' && app.lead_id)
        .map(app => String(app.lead_id))
    );
  }, [appsResponse]);

  const member = React.useMemo(() => {
    if (propMember) return propMember;
    if (location.state?.member) {
      try {
        sessionStorage.setItem('current_sale_member', JSON.stringify(location.state.member));
      } catch {
        // The in-memory member remains available if session storage is blocked.
      }
      return location.state.member;
    }
    try {
      const saved = sessionStorage.getItem('current_sale_member');
      if (saved) return JSON.parse(saved);
    } catch {
      // Continue with the API-backed member fallback.
    }
    if ((response?.leads || response?.data) && phone) {
      const leads = response?.leads || response?.data || [];
      const converted = leads.filter(l => l.status === 'Converted' && String(l.phone) === String(phone));
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
          products: converted
        };
      }
    }
    return null;
  }, [propMember, location.state?.member, response, phone]);

  if (isLoadingLeads && !member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-[var(--muted)]">
        <Loader2 className="w-8 h-8 text-[var(--brand-deep)] animate-spin mb-3" />
        <p className="text-xs font-semibold">Loading member details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-[var(--muted)] space-y-3">
        <p className="text-sm font-semibold text-[var(--text)]">Member profile not found.</p>
        <button
          type="button"
          onClick={() => navigate('/employee/sales/origination/members')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">
      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Sales Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Member <span className="text-[var(--accent-pink-deep)]">Details</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate('/employee/sales/origination/members')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            Verified Members Profile
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-4">

        {/* Member Profile Card */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs space-y-4">
        
          {/* Profile Avatar & Name Row */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--accent-pink-tint)] flex items-center justify-center text-base font-semibold text-[var(--accent-pink-deep)] shrink-0">
                {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text)] truncate">
                  {member.name}
                </h2>
                <p className="text-xs text-[var(--accent-pink-deep)] font-medium truncate mt-0.5">
                  Verified Member
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

        {/* 3. Associated Products Card */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
                <ShoppingBag className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Sale Applications</h3>
                <p className="text-[11px] text-[var(--muted)]">Pipeline Requests on Record</p>
              </div>
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              {member.products?.length || 1} Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {member.products && member.products.length > 0 ? (
              member.products.map((prod, idx) => {
                const currentLeadId = String(prod.id || prod.lead_id || member.lead_id || '');
                const isCreated = createdLeadIds.has(currentLeadId);

                return (
                  <div key={prod.id || idx} className="p-4 rounded-[16px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text)] truncate">
                          {prod.product_type || member.product_type || 'Savings & Deposits'}
                        </p>
                        <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5">
                          Lead Ref: #{String(prod.id || '').substring(0, 8)}
                        </p>
                      </div>

                      {isLoadingApps && !appsResponse ? (
                        <div className="h-6 w-20 bg-[var(--line)] animate-pulse rounded-[8px]" />
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold ${
                          isCreated 
                            ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]' 
                            : 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
                        }`}>
                          <CheckCircle2 size={13} /> {isCreated ? 'Created' : 'Converted'}
                        </span>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-[var(--line)] flex items-center justify-end">
                      {isLoadingApps && !appsResponse ? (
                        <div className="h-8 w-32 bg-[var(--line)] animate-pulse rounded-[10px]" />
                      ) : isCreated ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-[10px] bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]">
                          <Lock size={12} /> Application Created
                        </span>
                      ) : (
                        <Link
                          to="/employee/sales/form"
                          state={{ 
                            name: member.name, 
                            phone: member.phone, 
                            lead_id: currentLeadId, 
                            product_type: prod.product_type || member.product_type || 'Sales Product',
                            from: '/employee/sales/origination/members/details'
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
              <div className="p-4 rounded-[16px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                      {member.product_type || 'Savings & Deposits'}
                    </p>
                    <p className="text-[11px] font-medium text-[var(--muted)] mt-0.5">Primary Enrolled Service</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
                    <CheckCircle2 size={13} /> Converted
                  </span>
                </div>

                <div className="pt-2.5 border-t border-[var(--line)] flex items-center justify-end">
                  <Link
                    to="/employee/sales/form"
                    state={{ 
                      name: member.name, 
                      phone: member.phone, 
                      lead_id: member.lead_id, 
                      product_type: member.product_type || 'Sales Product',
                      from: '/employee/sales/origination/members/details'
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <FileEdit size={13} />
                    <span>Fill Application</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileSaleMemberDetails;