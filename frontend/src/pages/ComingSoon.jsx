import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

const ComingSoon = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-[32px] p-8 sm:p-10 text-center shadow-[0_24px_60px_rgba(19,19,21,0.08)]">
        {/* Soft Pink Icon Tile */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center mx-auto mb-5">
          <Sparkles size={28} />
        </div>

        <h1 className="text-2xl font-medium text-[var(--text)] tracking-tight mb-2">
          Under development
        </h1>

        <p className="text-xs sm:text-sm text-[var(--muted)] mb-8 max-w-sm mx-auto leading-relaxed">
          This module is currently being built and tested for your workspace. Stay tuned for upcoming feature releases!
        </p>

        <Link to="/admin">
          <Button variant="primary" className="h-11 px-6 rounded-[12px] font-medium text-xs justify-center w-full">
            <Home size={15} />
            <span>Back to dashboard</span>
          </Button>
        </Link>
      </div>

      <footer className="mt-8 text-center text-xs text-[var(--muted)]">
        Acme HRMS &bull; Feature roadmap
      </footer>
    </div>
  );
};

export default ComingSoon;
