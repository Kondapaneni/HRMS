import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Full-page loading spinner shown during initial data load.
 * Renders a centered spinner with an optional message.
 *
 * Usage:
 *   if (loading) return <PageLoader />;
 *   if (loading) return <PageLoader message="Loading employees..." />;
 */
const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" style={{ animationDuration: '1.5s' }} />
        {/* Spinner */}
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin relative z-10" strokeWidth={2.5} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400 tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default PageLoader;
