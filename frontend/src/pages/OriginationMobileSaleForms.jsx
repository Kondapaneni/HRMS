import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Construction, 
  Clock, 
  User, 
  Phone, 
  Package
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
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">
      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Sales Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Sales Form
            </h2>

            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-[12px] text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            Online Registration &amp; Onboarding
          </p>
        </div>
      </section>

      {/* 2. Content Container */}
      <div className="relative z-20 space-y-4">
        
        {/* Main "Coming Soon Still Developing" Card */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-6 shadow-xs text-center space-y-5">
          
          {/* Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-[16px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
            <Construction size={28} />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]">
              <Clock size={12} /> Under Active Development
            </span>
            <h3 className="text-xl font-semibold text-[var(--text)] tracking-tight pt-1">
              Coming Soon
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto pt-1">
              The Sales Onboarding &amp; Application Form module is currently being built. You will soon be able to configure and submit comprehensive sales applications right from your mobile device.
            </p>
          </div>

          {/* Client Target Context Card */}
          {clientName && clientName !== 'Prospect Client' && (
            <div className="bg-[var(--surface-alt)] rounded-[14px] border border-[var(--line)] p-3.5 text-left space-y-2 text-xs">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Target Prospect Record
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
                  <User size={13} className="text-[var(--brand-deep)] shrink-0" />
                  <span>{clientName}</span>
                </div>
                {clientPhone && (
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Phone size={13} className="text-[var(--icon-muted)] shrink-0" />
                    <span>{maskPhoneNumber(clientPhone)}</span>
                  </div>
                )}
                {productType && (
                  <div className="flex items-center gap-2 text-[var(--brand-deep)] font-medium">
                    <Package size={13} className="text-[var(--brand-deep)] shrink-0" />
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
              className="w-full inline-flex items-center justify-center gap-2 bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white py-2.5 px-6 rounded-[12px] text-xs font-semibold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
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