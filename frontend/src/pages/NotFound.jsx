import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 selection:bg-[var(--brand-tint)] selection:text-[var(--text)]">
      <div className="w-full max-w-md text-center flex flex-col items-center">
        {/* Big 404 number */}
        <div className="text-[96px] sm:text-[120px] font-medium leading-none tracking-tight text-[var(--text)] mb-3 select-none">
          404
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-medium text-[var(--text)] tracking-tight mb-2">
          Page not found
        </h1>

        {/* Subline */}
        <p className="text-xs sm:text-sm text-[var(--muted)] max-w-sm mb-8 leading-relaxed">
          The page or workspace resource you are searching for might have been moved, renamed, or is temporarily inaccessible.
        </p>

        {/* Action Button */}
        <Link to="/">
          <Button variant="primary" className="h-11 px-6 rounded-[12px] font-medium text-xs justify-center">
            <Home size={15} />
            <span>Return to workspace</span>
          </Button>
        </Link>
      </div>

      <footer className="mt-16 text-center text-xs text-[var(--muted)]">
        Acme HRMS &bull; Designed &amp; developed by Gowtham Chowdary Kondapaneni
      </footer>
    </div>
  );
};

export default NotFound;
