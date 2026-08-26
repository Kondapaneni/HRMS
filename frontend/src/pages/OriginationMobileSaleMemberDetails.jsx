import React from 'react';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Lock,
  FileEdit
} from 'lucide-react';
import { motion } from 'framer-motion';
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
        <p className="text-xs font-semibold">Loading member details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-[#5f6368] space-y-3">
        <p className="text-sm font-semibold text-[#1f1f1f]">Member profile not found.</p>
        <button
          type="button"
          onClick={() => navigate('/employee/sales/origination/members')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-full shadow-xs cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-14">

      {/* 1. Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs with Sales Origination Emerald Theme */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              Origination &bull; Sales Pipeline
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              Member Details
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              Verified Client Profile
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/employee/sales/origination/members')}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-full text-xs font-bold backdrop-blur-md border border-white/30 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
      </section>

      {/* 2. Elevated Content Layer */}
      <div className="relative z-20 -mt-8 mx-0.5 space-y-4">

        {/* Member Profile Card */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
        
          {/* Profile Avatar & Name Row */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#f1f3f4]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-full bg-[#e6f4ea] border-2 border-[#ceead6] flex items-center justify-center text-lg font-bold text-[#137333] shrink-0 shadow-2xs">
                {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#1f1f1f] truncate">
                  {member.name}
                </h2>
                <p className="text-xs text-[#137333] font-semibold truncate mt-0.5">
                  Verified Client
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold shrink-0 shadow-2xs bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                <CheckCircle2 size={15} /> Member
              </span>
            </div>
          </div>

          {/* Contact Info Rows */}
          <div className="space-y-3 pt-1">
            {/* Phone with Call Action */}
            <div>
              <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1 pl-1">
                Contact Number
              </span>
              {member.phone ? (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center justify-between pl-3.5 pr-1.5 py-1.5 rounded-full bg-[#f8fafd] hover:bg-[#f1f3f4] border border-[#e0e3e7] transition-all cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                      <Phone size={14} />
                    </div>
                    <span className="font-bold text-sm text-[#1f1f1f]">
                      {maskPhoneNumber(member.phone)}
                    </span>
                  </div>
                  <span className="text-[13px] font-bold text-[#1a73e8] bg-white px-4 py-2 rounded-full border border-[#d2e3fc] shadow-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 fill-[#1a73e8]" />
                    <span>Call</span>
                  </span>
                </a>
              ) : (
                <p className="text-xs text-[#80868b] pl-1">—</p>
              )}
            </div>

            {/* Address */}
            {member.address && (
              <div className="pt-2 border-t border-[#f1f3f4]">
                <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1 pl-1">
                  Residential Address
                </span>
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] text-xs text-[#1f1f1f]">
                  <MapPin size={15} className="text-[#137333] shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{member.address}</span>
                </div>
              </div>
            )}

            {/* Member Since */}
            {member.created_at && (
              <div className="pt-2 border-t border-[#f1f3f4]">
                <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1 pl-1">
                  Member Since
                </span>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#f8fafd] border border-[#e0e3e7] text-xs text-[#1f1f1f]">
                  <Calendar size={15} className="text-[#137333] shrink-0" />
                  <span className="font-medium">{format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a')}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* 3. Associated Products Card */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f3f4]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
                <ShoppingBag className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1f1f1f]">Sale Products</h3>
                <p className="text-[11px] text-[#5f6368]">Products assigned to this client</p>
              </div>
            </div>

            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shadow-2xs">
              {member.products?.length || 1} Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {member.products && member.products.length > 0 ? (
              member.products.map((prod, idx) => {
                const currentLeadId = String(prod.id || prod.lead_id || member.lead_id || '');
                const isCreated = createdLeadIds.has(currentLeadId);

                return (
                  <div key={prod.id || idx} className="p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1f1f1f] truncate">
                          {prod.product_type || member.product_type || 'Savings & Deposits'}
                        </p>
                        <p className="text-[11px] font-medium text-[#5f6368] mt-0.5">
                          Lead Ref: #{String(prod.id || '').substring(0, 8)}
                        </p>
                      </div>

                      {isLoadingApps && !appsResponse ? (
                        <div className="h-6 w-20 bg-[#e0e3e7] animate-pulse rounded-full" />
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shadow-2xs ${
                          isCreated 
                            ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' 
                            : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
                        }`}>
                          <CheckCircle2 size={13} /> {isCreated ? 'Created' : 'Converted'}
                        </span>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-[#e0e3e7] flex items-center justify-end">
                      {isLoadingApps && !appsResponse ? (
                        <div className="h-8 w-32 bg-[#e0e3e7] animate-pulse rounded-full" />
                      ) : isCreated ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
                          <Lock size={12} /> Application Created
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
                          className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white px-5 py-2.5 shadow-xs transition-all active:scale-95 cursor-pointer"
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
              <div className="p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1f1f1f] truncate">
                      {member.product_type || 'Savings & Deposits'}
                    </p>
                    <p className="text-[11px] font-medium text-[#5f6368] mt-0.5">Primary Enrolled Service</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shadow-2xs shrink-0">
                    <CheckCircle2 size={13} /> Converted
                  </span>
                </div>

                <div className="pt-2.5 border-t border-[#e0e3e7] flex items-center justify-end">
                  <Link
                    to="/employee/loans/form"
                    state={{ 
                      name: member.name, 
                      phone: member.phone, 
                      lead_id: member.lead_id, 
                      loan_type: member.product_type || 'Personal Loan',
                      from: '/employee/sales/origination/members'
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white px-5 py-2.5 shadow-xs transition-all active:scale-95 cursor-pointer"
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
