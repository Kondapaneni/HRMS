import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Full-page loading spinner shown during initial data load.
 * Restyled with design tokens: #8AADDB brand accent, Inter typography, dark mode compatible.
 *
 * Usage:
 *   if (loading) return <PageLoader />;
 *   if (loading) return <PageLoader message="Loading employees..." />;
 */
export const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-6 select-none">
      <div className="relative">
        {/* Soft brand glow ring */}
        <div
          className="absolute inset-0 rounded-full bg-[var(--brand)]/20 animate-ping"
          style={{ animationDuration: '2s' }}
        />
        {/* Spinner */}
        <Loader2
          className="w-9 h-9 text-[var(--brand-deep)] animate-spin relative z-10"
          strokeWidth={2}
        />
      </div>
      <p className="mt-4 text-[13px] font-medium text-[var(--muted)] tracking-tight">
        {message}
      </p>
    </div>
  );
};

export default PageLoader;
