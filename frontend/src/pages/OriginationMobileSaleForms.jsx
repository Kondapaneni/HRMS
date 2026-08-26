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
    <div className="space-y-4 pb-14">
      {/* 1. Hero Section with Animated Emerald/Teal Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs with Sales Origination Emerald, Teal & Cyan Theme */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              Origination &bull; Sales Pipeline
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              Sales Form
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              Online Registration &amp; Onboarding
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </section>

      {/* 2. Elevated Content Container */}
      <div className="relative z-20 -mt-8 mx-0.5 space-y-4">
        
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
