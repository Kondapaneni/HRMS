import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Sparkles, 
  Construction, 
  Clock, 
  ChevronLeft, 
  ShoppingBag,
  User,
  Phone,
  Package,
  Layers
} from 'lucide-react';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileSaleForms = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const fromPath = location.state?.from || '/employee/sales/origination/members';
  const clientName = location.state?.name || location.state?.clientName || 'Prospect Client';
  const clientPhone = location.state?.phone || '';
  const productType = location.state?.product_type || location.state?.loan_type || 'Sales Product';

  return (
    <div className="space-y-4 pb-14 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Clean White Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Origination &bull; Sales Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              Sales <span className="font-medium italic text-[#137333]">Form</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[#5f6368]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1">
            Online Registration &amp; Onboarding
          </p>
        </div>
      </section>

      {/* 2. Content Container */}
      <div className="relative z-20 mx-0.5 space-y-4">
        
        {/* Main "Coming Soon Still Developing" Card */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-6 shadow-xs text-center space-y-5">
          
          {/* Animated Icon Badge */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#137333]/30"
            />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#e6f4ea] to-[#ceead6] text-[#137333] flex items-center justify-center shadow-xs">
              <Construction size={32} className="animate-bounce" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shadow-2xs">
              <Clock size={12} /> Under Active Development
            </span>
            <h3 className="text-2xl font-black text-[#1f1f1f] tracking-tight pt-1">
              Coming Soon
            </h3>
            <p className="text-sm font-bold text-[#137333]">
              Still Developing
            </p>
            <p className="text-xs text-[#5f6368] leading-relaxed max-w-sm mx-auto pt-1">
              The Sales Onboarding &amp; Application Form module is currently being built. You will soon be able to configure and submit comprehensive sales applications right from your mobile device.
            </p>
          </div>

          {/* Client Target Context Card */}
          {clientName && clientName !== 'Prospect Client' && (
            <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 text-left space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">
                Target Prospect Record
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#1f1f1f]">
                  <User size={13} className="text-[#137333] shrink-0" />
                  <span>{clientName}</span>
                </div>
                {clientPhone && (
                  <div className="flex items-center gap-2 text-[#5f6368]">
                    <Phone size={13} className="text-[#80868b] shrink-0" />
                    <span>{maskPhoneNumber(clientPhone)}</span>
                  </div>
                )}
                {productType && (
                  <div className="flex items-center gap-2 text-[#137333] font-medium">
                    <Package size={13} className="text-[#137333] shrink-0" />
                    <span>{productType}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#137333] hover:bg-[#0d5926] text-white py-3.5 px-6 rounded-full text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Return to Members List</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default OriginationMobileSaleForms;
