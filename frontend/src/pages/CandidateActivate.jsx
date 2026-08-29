import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Compass,
  FileCheck,
  FileText,
  ShieldCheck
} from 'lucide-react';
import api from '../api/axios';

const CandidateActivate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error
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
        setMessage(err.response?.data?.error || 'Failed to activate account. The activation link may have expired or already been used.');
      }
    };

    activateAccount();
  }, [token]);

  return (
    <div className="min-h-screen min-h-[100dvh] md:h-screen md:max-h-screen w-full flex flex-col justify-between bg-[#f8fafd] text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] font-sans antialiased overflow-y-auto md:overflow-hidden relative">
      {/* Colorful Google Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4285F4]/12 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EA4335]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-[#FBBC05]/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#34A853]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Card Viewport */}
      <div className="flex-1 flex items-center justify-center p-2.5 sm:p-4 md:p-6 relative z-10">
        {/* Google Material 3 Card */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-[980px] bg-white rounded-[24px] p-4 sm:p-8 md:p-9 border border-[#e0e3e7] shadow-[0_4px_24px_rgba(66,133,244,0.08),0_1px_3px_rgba(0,0,0,0.05)] md:grid md:grid-cols-2 md:gap-10 items-center relative overflow-hidden my-auto"
        >
          {/* Top 4-Color Google Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

          {/* Left Column: Branding & Feature Chips */}
          <div className="flex flex-col justify-between h-full pr-0 md:pr-2 mb-6 md:mb-0">
            <div>
              {/* Brand Header */}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1f1f1f]">Acme</span>
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#4285F4]">HRMS</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[11px] font-medium text-[#5f6368] ml-1">Account Activation</span>
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[30px] font-normal text-[#1f1f1f] mt-3 md:mt-4 mb-1 leading-tight tracking-tight">
                Candidate Portal
              </h1>
              <p className="text-xs sm:text-sm text-[#5f6368] font-normal">
                Verifying your candidate credentials and activating your workspace account
              </p>

              {/* Colorful Google Feature Pills */}
              <div className="mt-4 md:mt-5 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-2.5">
                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e8f0fe]/70 border border-[#d2e3fc] text-[#1967d2] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e8f0fe]">
                  <div className="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Compass size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Career Opportunities</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e6f4ea]/70 border border-[#ceead6] text-[#137333] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e6f4ea]">
                  <div className="w-6 h-6 rounded-lg bg-[#34A853] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileCheck size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Live Application Tracking</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fef7e0]/70 border border-[#feefc3] text-[#b06000] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fef7e0]">
                  <div className="w-6 h-6 rounded-lg bg-[#FBBC05] text-[#1f1f1f] flex items-center justify-center shrink-0 shadow-sm">
                    <FileText size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Digital Document Portal</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fce8e6]/70 border border-[#fad2cf] text-[#c5221f] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fce8e6]">
                  <div className="w-6 h-6 rounded-lg bg-[#EA4335] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Direct HR &amp; Interview Connect</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Status Cards */}
          <div className="flex flex-col justify-center">
            {status === 'loading' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]"
              >
                <div className="w-12 h-12 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-medium text-[#1f1f1f] mb-1.5">Activating Account...</h2>
                <p className="text-xs text-[#5f6368]">Please wait while we verify your token and configure your profile.</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center bg-[#e6f4ea]/60 border border-[#ceead6] rounded-[20px]"
              >
                <div className="w-14 h-14 rounded-full bg-[#34A853] text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-[#34A853]/25">
                  <CheckCircle2 size={30} />
                </div>
                <h2 className="text-xl font-semibold text-[#1f1f1f] mb-1.5">Account Activated!</h2>
                <p className="text-xs text-[#137333] mb-6 max-w-sm mx-auto font-medium">{message}</p>
                <Link
                  to="/candidate/login"
                  className="inline-flex items-center justify-center gap-2 min-w-[160px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-xs font-semibold px-6 py-3 rounded-full transition-all shadow-md shadow-[#4285F4]/25 hover:shadow-lg hover:shadow-[#4285F4]/30"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center bg-[#fce8e6]/60 border border-[#f28b82] rounded-[20px]"
              >
                <div className="w-14 h-14 rounded-full bg-[#EA4335] text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-[#EA4335]/25">
                  <AlertCircle size={30} />
                </div>
                <h2 className="text-xl font-semibold text-[#1f1f1f] mb-1.5">Activation Failed</h2>
                <p className="text-xs text-[#d93025] mb-6 max-w-sm mx-auto font-medium">{message}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/candidate/login"
                    className="inline-flex items-center justify-center min-w-[140px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-all shadow-md shadow-[#4285F4]/25"
                  >
                    Return to Sign In
                  </Link>
                  <a
                    href="mailto:gowthamkondapaneni2003@gmail.com"
                    className="inline-flex items-center justify-center min-w-[140px] bg-white hover:bg-[#f1f3f4] text-[#d93025] border border-[#dadce0] text-xs font-semibold px-5 py-2.5 rounded-full transition-all"
                  >
                    Contact Support
                  </a>
                </div>
              </motion.div>
            )}

            {/* Mobile Footer inside Card */}
            <div className="mt-6 pt-3 border-t border-[#f1f3f4] flex flex-col items-center gap-2 text-[11px] text-[#5f6368] sm:hidden">
              <div className="flex items-center justify-center gap-4 text-[11px]">
                <a href="mailto:gowthamkondapaneni2003@gmail.com" className="hover:text-[#4285F4] transition-colors">
                  Help
                </a>
                <span className="hover:text-[#4285F4] cursor-default transition-colors">Privacy</span>
                <span className="hover:text-[#4285F4] cursor-default transition-colors">Terms</span>
                <span className="text-[#5f6368]">© Acme HRMS</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
                <span>Designed &amp; Developed by Gowtham Chowdary Kondapaneni</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Google-style Clean Bottom Footer - Desktop only */}
      <footer className="hidden sm:flex w-full max-w-[980px] mx-auto px-6 py-3 items-center justify-between text-[11px] text-[#5f6368] shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
          <span>Designed &amp; Developed by Gowtham Chowdary Kondapaneni</span>
        </div>

        <div className="flex items-center gap-5">
          <a href="mailto:gowthamkondapaneni2003@gmail.com" className="hover:text-[#4285F4] transition-colors">
            Help
          </a>
          <span className="hover:text-[#4285F4] cursor-default transition-colors">Privacy</span>
          <span className="hover:text-[#4285F4] cursor-default transition-colors">Terms</span>
          <span className="text-[#5f6368]">© Acme HRMS</span>
        </div>
      </footer>
    </div>
  );
};

export default CandidateActivate;
