import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Compass,
  FileCheck
} from 'lucide-react';
import api from '../api/axios';
import Button from '../components/ui/Button';

const CandidateActivate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const activateAccount = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid activation link. No token provided.');
        return;
      }

      try {
        const res = await api.post('/candidate/activate', { token });
        setStatus('success');
        setMessage(res.data.message || 'Your candidate account has been activated successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(
          err.response?.data?.error ||
            'Failed to activate account. The activation link may have expired or already been used.'
        );
      }
    };

    activateAccount();
  }, [token]);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--bg)] text-[var(--text)] font-sans antialiased p-4 sm:p-6 md:p-8 selection:bg-[var(--brand-tint)] selection:text-[var(--text)]">
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-[500px] bg-[var(--surface)] rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_24px_60px_rgba(19,19,21,0.08)] text-center"
        >
          {/* Brand Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[14px] bg-[var(--ink)] text-white flex items-center justify-center font-semibold text-lg">
              A
            </div>
            <div className="text-left">
              <div className="text-lg font-medium tracking-tight text-[var(--text)]">
                Acme <span className="text-[var(--accent-pink-deep)]">HRMS</span>
              </div>
              <div className="text-[11px] text-[var(--muted)]">Candidate Portal</div>
            </div>
          </div>

          {/* Status content */}
          {status === 'loading' && (
            <div className="py-8">
              <div className="w-10 h-10 border-3 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-medium text-[var(--text)] mb-1">Activating your account...</h2>
              <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
                Please wait while we verify your activation link and configure your candidate workspace.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#E6F6EC] text-[#1F9D55] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="text-xl font-medium text-[var(--text)] mb-2">Account activated!</h2>
              <p className="text-xs text-[var(--muted)] mb-6 max-w-sm mx-auto leading-relaxed">
                {message}
              </p>
              <Link to="/candidate/login">
                <Button variant="primary" className="w-full h-11 rounded-[12px] font-medium text-xs justify-center">
                  <span>Sign in to candidate portal</span>
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FDE8EA] text-[#D64550] flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={30} />
              </div>
              <h2 className="text-xl font-medium text-[var(--text)] mb-2">Activation failed</h2>
              <p className="text-xs text-[#D64550] mb-6 max-w-sm mx-auto leading-relaxed font-medium">
                {message}
              </p>
              <div className="space-y-2.5">
                <Link to="/candidate/login">
                  <Button variant="primary" className="w-full h-11 rounded-[12px] font-medium text-xs justify-center">
                    Return to sign in
                  </Button>
                </Link>
                <a
                  href="mailto:gowthamkondapaneni2003@gmail.com"
                  className="inline-block text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1"
                >
                  Contact support team
                </a>
              </div>
            </div>
          )}

          {/* Security badge note */}
          <div className="mt-8 pt-4 border-t border-[var(--line)] flex items-center justify-center gap-2 text-[11px] text-[var(--muted)]">
            <ShieldCheck size={14} className="text-[#1F9D55]" />
            <span>End-to-end encrypted candidate verification</span>
          </div>
        </motion.div>
      </div>

      <footer className="mt-6 text-center text-xs text-[var(--muted)]">
        Acme HRMS &bull; Designed &amp; developed by Gowtham Chowdary Kondapaneni
      </footer>
    </div>
  );
};

export default CandidateActivate;
