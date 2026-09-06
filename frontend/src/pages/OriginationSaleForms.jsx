import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Sparkles, 
  Construction, 
  Clock, 
  ShoppingBag,
  User,
  Phone,
  Package,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import OriginationMobileSaleForms from './OriginationMobileSaleForms';
import { maskPhoneNumber } from '../utils/phoneUtils';

export default function OriginationSaleForms() {
  const location = useLocation();
  const navigate = useNavigate();

  const fromPath = location.state?.from || '/employee/sales/origination/members';
  const clientName = location.state?.name || location.state?.clientName || 'Prospect Client';
  const clientPhone = location.state?.phone || '';
  const productType = location.state?.product_type || location.state?.loan_type || 'Sales Product';

  return (
    <>
      {/* Mobile Experience */}
      <div className="md:hidden">
        <OriginationMobileSaleForms />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12 w-full max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Sales Workspace &bull; Application Form
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2" style={{ fontWeight: 500 }}>
              <span>Sales Origination <span className="font-medium italic text-[#137333]">Form</span></span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Online Registration &amp; Onboarding Module
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-4 py-2 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft size={14} className="text-[#5f6368]" />
            <span>Back to Members</span>
          </button>
        </div>

        {/* Card Content */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-12 text-center shadow-xs space-y-6 max-w-2xl mx-auto">
          {/* Icon Badge */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#137333]/30"
            />
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#e6f4ea] to-[#ceead6] text-[#137333] flex items-center justify-center shadow-xs">
              <Construction size={40} className="animate-bounce" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shadow-2xs">
              <Clock size={14} /> Under Active Development
            </span>
            <h2 className="text-3xl font-bold text-[#1f1f1f] tracking-tight pt-2">
              Coming Soon
            </h2>
            <p className="text-base font-bold text-[#137333]">
              Still Developing
            </p>
            <p className="text-sm text-[#5f6368] leading-relaxed max-w-md mx-auto">
              The Sales Onboarding &amp; Application Form module is currently being developed. You will soon be able to submit tailored sales applications and documentation directly from here.
            </p>
          </div>

          {/* Client Target Context Card */}
          {clientName && clientName !== 'Prospect Client' && (
            <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-4 text-left space-y-2 max-w-md mx-auto text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">
                Target Prospect Record
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#1f1f1f]">
                  <User size={14} className="text-[#137333] shrink-0" />
                  <span>{clientName}</span>
                </div>
                {clientPhone && (
                  <div className="flex items-center gap-2 text-[#5f6368]">
                    <Phone size={14} className="text-[#80868b] shrink-0" />
                    <span>{maskPhoneNumber(clientPhone)}</span>
                  </div>
                )}
                {productType && (
                  <div className="flex items-center gap-2 text-[#137333] font-semibold">
                    <Package size={14} className="text-[#137333] shrink-0" />
                    <span>{productType}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="inline-flex items-center justify-center gap-2 bg-[#137333] hover:bg-[#0d5926] text-white py-3 px-8 rounded-full text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Return to Members Directory</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
