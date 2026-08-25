import React from 'react';
import { ArrowLeft, Phone, MapPin, Calendar, Briefcase, CheckCircle2, Loader2, Users, ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';
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
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30 space-y-2">
        {/* Workspace Tag */}
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
            Sales Origination Hub
          </span>
        </div>

        {/* Heading + Back Button Row */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
            Member Profile
          </h1>

          <button
            type="button"
            onClick={() => navigate('/employee/sales/origination/members')}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3.5 py-1.5 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Back</span>
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-[#5f6368] truncate">
          Active Converted Client &bull; Account Records
        </p>
      </div>

      {/* 2. Member Identity Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#f1f3f4]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#e6f4ea] border-2 border-[#ceead6] flex items-center justify-center text-lg font-bold text-[#137333] shrink-0 shadow-2xs">
              {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#1f1f1f] truncate">
                {member.name}
              </h2>
              <p className="text-xs text-[#5f6368] truncate mt-0.5">
                Registered Client Account
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
            <CheckCircle2 size={10} /> Converted
          </span>
        </div>

        {/* Contact Info Rows */}
        <div className="space-y-3 pt-1">
          {/* Phone */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                <Phone size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider">Contact Phone</p>
                <p className="text-xs font-bold text-[#1f1f1f] truncate">{maskPhoneNumber(member.phone)}</p>
              </div>
            </div>

            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#1a73e8] text-white text-[11px] font-semibold rounded-full shadow-xs active:scale-95 transition-all"
              >
                <Phone size={11} /> Call
              </a>
            )}
          </div>

          {/* Location */}
          <div className="p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider">Address / Location</p>
              <p className="text-xs text-[#1f1f1f] leading-relaxed pt-0.5">
                {member.address || '—'}
              </p>
            </div>
          </div>

          {/* Converted Date */}
          <div className="p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center shrink-0">
              <Calendar size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider">Joined On</p>
              <p className="text-xs font-semibold text-[#1f1f1f]">
                {member.created_at ? format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Associated Products Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[#f1f3f4]">
          <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
            <Briefcase size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
              Enrolled Products ({member.products?.length || 1})
            </h3>
            <p className="text-[10px] text-[#5f6368]">Products assigned to this client</p>
          </div>
        </div>

        <div className="space-y-2">
          {member.products && member.products.length > 0 ? (
            member.products.map((prod, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1f1f1f] truncate">
                    {prod.product_type || member.product_type || 'Loan / Account'}
                  </p>
                  <p className="text-[10px] text-[#5f6368]">
                    Lead ID: #{String(prod.id || '').substring(0, 8)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
                  Active
                </span>
              </div>
            ))
          ) : (
            <div className="p-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1f1f1f] truncate">
                  {member.product_type || 'Sales Account'}
                </p>
                <p className="text-[10px] text-[#5f6368]">Primary Enrolled Service</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
                Active
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileSaleMemberDetails;
