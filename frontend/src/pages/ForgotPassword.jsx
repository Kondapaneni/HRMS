import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Mail, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--bg)] text-[var(--text)] font-sans antialiased p-4 sm:p-6 md:p-8 selection:bg-[var(--brand-tint)] selection:text-[var(--text)]">
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-[480px] bg-[var(--surface)] rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_24px_60px_rgba(19,19,21,0.08)]"
        >
          {/* Back link */}
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            <span>Back to sign in</span>
          </Link>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[14px] bg-[var(--ink)] text-white flex items-center justify-center font-semibold text-lg">
              A
            </div>
            <div>
              <div className="text-xl font-medium tracking-tight text-[var(--text)]">
                Acme <span className="text-[var(--brand-deep)]">HRMS</span>
              </div>
              <div className="text-[11px] text-[var(--muted)]">Account Recovery</div>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-medium text-[var(--text)] tracking-tight">
              Reset your password
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              {type === 'candidate'
                ? 'Enter the email address registered with your Acme candidate application.'
                : 'Enter your workplace email address to receive password reset instructions.'}
            </p>
          </div>

          {/* Error alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mb-5 p-3.5 bg-[#FDE8EA] text-[#D64550] rounded-[12px] flex items-start gap-2.5 text-xs font-medium"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="email"
                  className="peer w-full h-11 px-3.5 pt-4 pb-1 text-xs text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                />
                <label
                  htmlFor="reset-email"
                  className="absolute left-3.5 top-1 text-[11px] text-[var(--muted)] pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-[var(--muted)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-[var(--brand-deep)] font-normal"
                >
                  Work or registered email
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || lockoutSeconds > 0}
                loading={isLoading}
                className="w-full h-11 rounded-[12px] font-medium text-xs justify-center"
              >
                {lockoutSeconds > 0
                  ? `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                  : 'Send reset instructions'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-[#E6F6EC] text-[#1F9D55] rounded-[16px] flex items-start gap-3">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <div className="font-semibold mb-0.5">Reset email dispatched</div>
                  If an account exists for <span className="font-semibold underline">{email}</span>, you will receive a single-use reset link within 2 minutes.
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsSubmitted(false)}
                className="w-full h-11 rounded-[12px] font-medium text-xs justify-center"
              >
                Try another email
              </Button>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Remembered your password?</span>
            <Link to={backLink} className="text-[var(--brand-deep)] hover:underline font-medium">
              Sign in &rarr;
            </Link>
          </div>
        </motion.div>
      </div>

      <footer className="mt-6 text-center text-xs text-[var(--muted)]">
        Acme HRMS &bull; Designed &amp; developed by Gowtham Chowdary Kondapaneni
      </footer>
    </div>
  );
};

export default ForgotPassword;
