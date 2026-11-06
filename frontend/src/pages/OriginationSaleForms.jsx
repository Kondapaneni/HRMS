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

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 w-full max-w-5xl mx-auto font-sans text-[var(--text)]">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Sales Workspace &bull; Application Form
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <span>Sales Origination Form</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Online Registration &amp; Onboarding Module
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] px-4 py-2 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
            <span>Back to Members</span>
          </button>
        </div>

        {/* Card Content */}
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-12 text-center shadow-xs space-y-6 max-w-2xl mx-auto">
          {/* Icon Badge */}
          <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-[20px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
            <Construction size={36} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]">
              <Clock size={13} /> Under Active Development
            </span>
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight pt-2">
              Coming Soon
            </h2>
            <p className="text-xs text-[var(--muted)] leading-relaxed max-w-md mx-auto">
              The Sales Onboarding &amp; Application Form module is currently being developed. You will soon be able to submit tailored sales applications and documentation directly from here.
            </p>
          </div>

          {/* Client Target Context Card */}
          {clientName && clientName !== 'Prospect Client' && (
            <div className="bg-[var(--surface-alt)] rounded-[16px] border border-[var(--line)] p-4 text-left space-y-2 max-w-md mx-auto text-xs">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Target Prospect Record
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
                  <User size={14} className="text-[var(--brand-deep)] shrink-0" />
                  <span>{clientName}</span>
                </div>
                {clientPhone && (
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Phone size={14} className="text-[var(--icon-muted)] shrink-0" />
                    <span>{maskPhoneNumber(clientPhone)}</span>
                  </div>
                )}
                {productType && (
                  <div className="flex items-center gap-2 text-[var(--brand-deep)] font-medium">
                    <Package size={14} className="text-[var(--brand-deep)] shrink-0" />
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
              className="inline-flex items-center justify-center gap-2 bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white py-2.5 px-6 rounded-full text-xs font-semibold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
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