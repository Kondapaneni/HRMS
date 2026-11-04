import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import AuthSideCarousel from '../components/AuthSideCarousel';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
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
        setError(err.response.data?.error || 'Too many requests. Please try again later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#ECEEEA] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315]">
      {/* Main 2-Column Card matching Login page */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[1080px] bg-white rounded-[32px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
      >
        {/* ============================================================
            LEFT COLUMN: Forgot Password Form
            ============================================================ */}
        <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full">
          <div>
            {/* Back link */}
            <Link
              to={backLink}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors mb-6 font-medium cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to sign in</span>
            </Link>

            {/* Header Titles */}
            <div className="text-center sm:text-left mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#131315]">
                Reset password
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed font-normal">
                {type === 'candidate'
                  ? 'Enter the email registered with your candidate profile.'
                  : 'Enter your workplace email to receive password reset instructions.'}
              </p>
            </div>

            {/* Error alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 shadow-2xs font-medium"
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Work or registered email"
                    required
                    autoComplete="email"
                    className="w-full h-12 px-5 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || lockoutSeconds > 0}
                  className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {isLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : lockoutSeconds > 0 ? (
                    `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                  ) : (
                    'Send reset instructions'
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 shadow-2xs">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-semibold mb-0.5">Reset email dispatched</div>
                    If an account exists for <span className="font-semibold underline">{email}</span>, you will receive a single-use reset link within 2 minutes.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="w-full h-12 rounded-full border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-medium text-sm transition-all cursor-pointer flex items-center justify-center active:scale-[0.99]"
                >
                  Try another email
                </button>
              </div>
            )}

            {/* Back to sign in prompt */}
            <div className="text-center pt-4">
              <span className="text-xs text-neutral-500 font-medium">Remembered your password? </span>
              <Link to={backLink} className="text-xs text-[#2F6B38] hover:text-[#1E4D27] hover:underline font-semibold transition-colors">
                Sign in &rarr;
              </Link>
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

export default ForgotPassword;
