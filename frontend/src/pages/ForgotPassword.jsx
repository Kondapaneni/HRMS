import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Mail, AlertCircle, CheckCircle2, KeyRound, Sparkles, Send } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);

  React.useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const backLink = type === 'candidate' ? '/candidate/login' : '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/forgot-password', { email });
      setIsSubmitted(true);
      toast.success('Password reset link sent!');
    } catch (err) {
      if (err.response?.status === 429) {
        if (err.response.data?.secondsRemaining) {
          setLockoutSeconds(err.response.data.secondsRemaining);
        }
        setError(err.response.data?.error || 'Too Many Requests. Please Try Again Later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen w-full flex flex-col justify-between bg-[#f8fafd] text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] font-sans antialiased overflow-y-auto md:overflow-hidden relative">
      {/* Colorful Google Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4285F4]/12 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EA4335]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-[#FBBC05]/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#34A853]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Card Viewport */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6 relative z-10">
        
        {/* Google Material 3 Card */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-[980px] bg-white rounded-[24px] p-5 sm:p-8 md:p-9 border border-[#e0e3e7] shadow-[0_4px_24px_rgba(66,133,244,0.08),0_1px_3px_rgba(0,0,0,0.05)] md:grid md:grid-cols-2 md:gap-10 items-center relative overflow-hidden my-auto"
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
                  <span className="text-[11px] font-medium text-[#5f6368] ml-1">Account Recovery</span>
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[30px] font-normal text-[#1f1f1f] mt-3 md:mt-4 mb-1 leading-tight tracking-tight">
                Forgot password?
              </h1>
              <p className="text-xs sm:text-sm text-[#5f6368] font-normal">
                {type === 'candidate' ? 'Recover your Candidate Portal access' : 'Recover your Acme Employee or Admin account'}
              </p>

              {/* Colorful Feature Pills - Visible on both Mobile & Desktop */}
              <div className="mt-4 md:mt-5 grid grid-cols-1 gap-1.5 md:gap-2">
                <div className="flex items-center gap-2 p-1.5 md:p-2 rounded-xl bg-[#e8f0fe]/70 border border-[#d2e3fc] text-[#1967d2] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e8f0fe]">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Mail size={12} />
                  </div>
                  <span>Instant Password Reset Link via Registered Email</span>
                </div>

                <div className="flex items-center gap-2 p-1.5 md:p-2 rounded-xl bg-[#e6f4ea]/70 border border-[#ceead6] text-[#137333] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e6f4ea]">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-[#34A853] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck size={12} />
                  </div>
                  <span>Single-Use Secure Token</span>
                </div>

                <div className="flex items-center gap-2 p-1.5 md:p-2 rounded-xl bg-[#fef7e0]/70 border border-[#feefc3] text-[#b06000] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fef7e0]">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-[#FBBC05] text-[#1f1f1f] flex items-center justify-center shrink-0 shadow-sm">
                    <KeyRound size={12} />
                  </div>
                  <span>Zero-Trust Credential Safeguards</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form & Confirmation */}
          <div className="flex flex-col justify-between">
            {/* Top Back Navigation Pill */}
            <div className="flex justify-start mb-4">
              <Link
                to={backLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to {type === 'candidate' ? 'Candidate Sign In' : 'Sign in'}</span>
              </Link>
            </div>

            {/* Error Message Box */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 p-3 bg-[#fce8e6] border border-[#f28b82] rounded-[10px] flex items-start gap-2.5 text-[#d93025] text-xs shadow-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#EA4335]" />
                  <span className="font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-[#e6f4ea]/60 border border-[#ceead6] rounded-[16px] text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#34A853] text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-[#34A853]/25">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-base font-semibold text-[#1f1f1f] mb-1">Check your email</h3>
                <p className="text-xs text-[#5f6368] mb-4">
                  We've sent a password reset link to <strong className="text-[#1f1f1f] font-semibold">{email}</strong>. Please check your inbox and spam folder.
                </p>
                <Link
                  to={backLink}
                  className="inline-flex items-center justify-center min-w-[140px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-all shadow-md shadow-[#4285F4]/25"
                >
                  Return to sign in
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input Field - Google Blue Highlight */}
                <div className="relative">
                  <div
                    className={`relative rounded-[8px] border transition-all duration-200 bg-white ${
                      emailFocused
                        ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20 shadow-sm shadow-[#4285F4]/10'
                        : 'border-[#dadce0] hover:border-[#5f6368]'
                    }`}
                  >
                    <label
                      htmlFor="forgot-email"
                      className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${
                        emailFocused || email
                          ? '-top-2.5 text-xs font-semibold text-[#4285F4]'
                          : 'top-3 text-sm text-[#5f6368]'
                      }`}
                    >
                      Registered email address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      className="w-full px-3.5 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Action Buttons Section */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Secondary Action: Contact HR Admin */}
                  <a
                    href="mailto:gowthamkondapaneni2003@gmail.com"
                    className="text-xs font-semibold text-[#d93025] hover:bg-[#fce8e6] px-3.5 py-2 rounded-full transition-colors w-full sm:w-auto text-center"
                  >
                    Contact HR Admin
                  </a>

                  {/* Primary Action Button */}
                  <button
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0 || !email}
                    className="w-full sm:w-auto min-w-[130px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-sm sm:text-xs font-semibold px-6 py-3.5 sm:py-2.5 rounded-full transition-all shadow-md shadow-[#4285F4]/25 hover:shadow-lg hover:shadow-[#4285F4]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : lockoutSeconds > 0 ? (
                      `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                    ) : (
                      <>
                        <span>Send reset link</span>
                        <Send size={14} className="sm:w-3 sm:h-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>

      {/* Google-style Clean Bottom Footer */}
      <footer className="w-full max-w-[980px] mx-auto px-4 sm:px-6 pt-1 pb-10 sm:pb-3 mb-2 sm:mb-0 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5f6368] gap-1.5 sm:gap-2 shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 font-medium text-center sm:text-left">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
          <span>Designed &amp; Developed by Gowtham Chowdary Kondapaneni</span>
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          <a
            href="mailto:gowthamkondapaneni2003@gmail.com"
            className="hover:text-[#4285F4] transition-colors"
          >
            Help
          </a>
          <span className="hover:text-[#4285F4] cursor-default transition-colors">
            Privacy
          </span>
          <span className="hover:text-[#4285F4] cursor-default transition-colors">
            Terms
          </span>
          <span className="text-[#5f6368]">
            © Acme HRMS
          </span>
        </div>
      </footer>
    </div>
  );
};

export default ForgotPassword;
