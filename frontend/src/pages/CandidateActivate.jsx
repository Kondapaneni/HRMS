import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import api from '../api/axios';
import AuthSideCarousel from '../components/AuthSideCarousel';

const CandidateActivate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('ready'); // 'ready', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Display the activation confirmation first. Email link scanners and
    // previews should not consume a one-time activation token on page load.
    if (!token) {
      setStatus('error');
      setMessage('Invalid activation link. Open the activation link from your registration email.');
    } else {
      setStatus('ready');
      setMessage('');
    }
  }, [token]);

  const activateAccount = async () => {
    if (!token || status !== 'ready') return;
    setStatus('loading');
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

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#ECEEEA] flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315]">
      {/* Main 2-Column Card matching Login page */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="my-auto w-full max-w-md sm:max-w-lg lg:max-w-[1080px] bg-white rounded-[28px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shrink-0"
      >
        {/* ============================================================
            LEFT COLUMN: Account Activation
            ============================================================ */}
        <div className="order-2 lg:order-1 lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full text-center">
          <div>
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <img
                src="/logo.png"
                alt="Acme HRMS"
                className="w-8 h-8 rounded-xl object-contain shadow-xs"
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B38]">
                Candidate Portal
              </span>
            </div>

            {/* Status content */}
            {status === 'ready' && (
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#131315] mb-2">Activate your account</h2>
                <p className="text-xs sm:text-sm text-neutral-500 mb-6 max-w-sm mx-auto leading-relaxed">
                  Confirm your email address to activate your candidate account.
                </p>
                <button
                  type="button"
                  onClick={activateAccount}
                  className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  Activate Account
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
            {status === 'loading' && (
              <div className="py-8">
                <div className="w-12 h-12 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#131315] mb-2">Activating your account...</h2>
                <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">
                  Please wait while we verify your activation link and configure your candidate workspace.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#131315] mb-2">Account activated!</h2>
                <p className="text-xs sm:text-sm text-neutral-500 mb-6 max-w-sm mx-auto leading-relaxed">
                  {message}
                </p>
                <Link to="/candidate/login">
                  <button className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.99]">
                    <span>Sign in to candidate portal</span>
                    <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="py-4">
                <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#131315] mb-2">Activation failed</h2>
                <p className="text-xs sm:text-sm text-red-600 mb-6 max-w-sm mx-auto leading-relaxed font-medium">
                  {message}
                </p>
                <div className="space-y-3">
                  <Link to="/candidate/login">
                    <button className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center active:scale-[0.99]">
                      Return to sign in
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {/* Security badge note */}
            <div className="mt-8 pt-5 border-t border-neutral-200/70 flex items-center justify-center gap-2 text-[11px] text-neutral-500 font-medium">
              <ShieldCheck size={14} className="text-[#2F6B38]" />
              <span>End-to-end encrypted candidate verification</span>
            </div>
          </div>

          {/* Footer Support & Credits */}
          <div className="text-center space-y-2.5 pt-6">
            <p className="text-xs text-neutral-500 font-medium">
              Don't have Access?{' '}
              <a
                href="mailto:hr@acme.com?subject=HRMS%20Access%20Request"
                className="text-[#2F6B38] hover:text-[#1E4D27] hover:underline font-semibold transition-colors"
              >
                Contact HR Admin
              </a>
            </p>
            <p className="text-[11px] text-neutral-400 font-normal">
              Designed and developed by{' '}
              <span className="text-neutral-700 font-semibold">Gowtham Chowdary Kondapaneni</span>
            </p>
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN: Calming Sage Green Interactive HRMS Carousel
            ============================================================ */}
        <AuthSideCarousel />
      </motion.div>
    </div>
  );
};

export default CandidateActivate;
