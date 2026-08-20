import React from 'react';
import { ArrowLeft, Phone, MapPin, Calendar, Briefcase, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';

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
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading member details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-4">
        <p className="text-base font-semibold text-slate-700">Member profile not found.</p>
        <button
          type="button"
          onClick={() => navigate('/employee/sales/origination/members')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      {/* Animated Hero Header */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between px-2">
          <button 
            type="button" 
            onClick={() => navigate('/employee/sales/origination/members')} 
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              Origination Sales Module
            </p>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm font-sans">
              Member Details
            </h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </section>

      {/* Profile Card */}
      <div className="space-y-6 relative z-20 -mt-12 mx-4">
        <div className="bg-white p-6 rounded-[28px] shadow-xl border border-slate-100 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner">
                {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{member.name}</h3>
                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider leading-none bg-emerald-100 text-emerald-700 mt-1.5">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>Converted Member</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Phone */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Phone</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-emerald-600" />
              </div>
              <span className="font-medium text-lg">{member.phone}</span>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location / Address</h3>
            <div className="flex items-start gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0 mt-1">
                <MapPin size={18} className="text-teal-600" />
              </div>
              <span className="font-medium leading-relaxed pt-2">{member.address || '—'}</span>
            </div>
          </div>

          {/* Member Since */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Member Since</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <span className="font-medium">{member.created_at ? format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a') : '—'}</span>
            </div>
          </div>

        </div>

        {/* Product History Section */}
        <div className="bg-white p-6 rounded-[28px] shadow-xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Product History</h3>
          </div>

          <div className="space-y-3">
            {member.products && member.products.length > 0 ? (
              member.products.map((prod) => (
                <div key={prod.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-slate-900 text-sm">{prod.product_type || 'General Member Product'}</h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={11} /> Converted
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={12} />
                    <span>{prod.created_at ? format(new Date(prod.created_at), 'MMM d, yyyy h:mm a') : '—'}</span>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-all cursor-pointer">
                      Fill Application <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-3 text-center">No product history available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileSaleMemberDetails;
