import React from 'react';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  CheckCircle2, 
  Loader2, 
  Users, 
  ShoppingBag,
  ArrowRight,
  Lock,
  FileEdit
} from 'lucide-react';
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
      } catch (e) {}
      return location.state.member;
    }
    try {
      const saved = sessionStorage.getItem('current_sale_member');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
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
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-[#5f6368]">
        <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin mb-3" />
        <p className="text-xs font-medium">Loading member details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-[#5f6368] space-y-4">
        <p className="text-sm font-semibold text-[#1f1f1f]">Member profile not found.</p>
        <button
          type="button"
          onClick={() => navigate('/employee/sales/origination/members')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-full shadow-xs cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-14">
      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
                Origination Workspace
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Member Profile
            </h1>
            <p className="text-xs text-[#5f6368]">
              Converted Client &bull; Active Record
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/employee/sales/origination/members')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3.5 py-2 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* 2. Member Overview Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
        {/* Profile Avatar & Name Row */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-[#f1f3f4]">
          <div className="w-14 h-14 rounded-full bg-[#e8f0fe] border-2 border-[#d2e3fc] flex items-center justify-center text-lg font-bold text-[#1a73e8] shrink-0 shadow-2xs">
            {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-bold text-[#1f1f1f] truncate">
              {member.name}
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
              <CheckCircle2 size={10} /> Converted Member
            </span>
          </div>
        </div>

        {/* Contact Info Rows */}
        <div className="space-y-3 pt-1">
          {/* Phone with Call Action */}
          <div>
            <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1">
              Contact Number
            </span>
            {member.phone ? (
              <a
                href={`tel:${member.phone}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafd] hover:bg-[#f1f3f4] border border-[#e0e3e7] transition-all cursor-pointer group active:scale-98"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                    <Phone size={14} />
                  </div>
                  <span className="font-bold font-mono text-sm text-[#1f1f1f]">
                    {maskPhoneNumber(member.phone)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#1a73e8] bg-white px-3 py-1 rounded-full border border-[#d2e3fc] shadow-2xs flex items-center gap-1">
                  <Phone size={11} className="fill-[#1a73e8]" /> Call
                </span>
              </a>
            ) : (
              <p className="text-xs text-[#80868b]">—</p>
            )}
          </div>

          {/* Address */}
          {member.address && (
            <div className="pt-2 border-t border-[#f1f3f4]">
              <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1">
                Residential Address
              </span>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] text-xs text-[#1f1f1f]">
                <MapPin size={15} className="text-[#1a73e8] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{member.address}</span>
              </div>
            </div>
          )}

          {/* Member Since */}
          {member.created_at && (
            <div className="pt-2 border-t border-[#f1f3f4]">
              <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1">
                Member Since
              </span>
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] text-xs text-[#1f1f1f]">
                <Calendar size={15} className="text-[#1a73e8] shrink-0" />
                <span>{format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Associated Products Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e7]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Sale Products</h3>
              <p className="text-[10px] text-[#5f6368]">Products assigned to this client</p>
            </div>
          </div>

          <span className="text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
            {member.products?.length || 1} Total
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {member.products && member.products.length > 0 ? (
            member.products.map((prod, idx) => {
              const currentLeadId = String(prod.id || prod.lead_id || member.lead_id || '');
              const isCreated = createdLeadIds.has(currentLeadId);

              return (
                <div key={prod.id || idx} className="p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1f1f1f] truncate">
                        {prod.product_type || member.product_type || 'Savings & Deposits'}
                      </p>
                      <p className="text-[10px] text-[#5f6368]">
                        Lead Ref: #{String(prod.id || '').substring(0, 8)}
                      </p>
                    </div>

                    {isLoadingApps && !appsResponse ? (
                      <div className="h-5 w-16 bg-[#e0e3e7] animate-pulse rounded-full" />
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isCreated 
                          ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' 
                          : 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]'
                      }`}>
                        <CheckCircle2 size={10} /> {isCreated ? 'Created' : 'Converted'}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#e0e3e7] flex items-center justify-end">
                    {isLoadingApps && !appsResponse ? (
                      <div className="h-8 w-32 bg-[#e0e3e7] animate-pulse rounded-full" />
                    ) : isCreated ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
                        <Lock size={11} /> Application Created
                      </span>
                    ) : (
                      <Link
                        to="/employee/loans/form"
                        state={{ 
                          name: member.name, 
                          phone: member.phone, 
                          lead_id: currentLeadId, 
                          loan_type: prod.product_type || member.product_type || 'Personal Loan',
                          from: '/employee/sales/origination/members'
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <FileEdit size={12} />
                        <span>Fill Application</span>
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1f1f1f] truncate">
                    {member.product_type || 'Savings & Deposits'}
                  </p>
                  <p className="text-[10px] text-[#5f6368]">Primary Enrolled Service</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0">
                  <CheckCircle2 size={10} /> Converted
                </span>
              </div>

              <div className="pt-2 border-t border-[#e0e3e7] flex items-center justify-end">
                <Link
                  to="/employee/loans/form"
                  state={{ 
                    name: member.name, 
                    phone: member.phone, 
                    lead_id: member.lead_id, 
                    loan_type: member.product_type || 'Personal Loan',
                    from: '/employee/sales/origination/members'
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <FileEdit size={12} />
                  <span>Fill Application</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileSaleMemberDetails;
