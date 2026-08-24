import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, KeyRound, Check } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No reset token provided. Please use the link sent to your email.');
    }
  }, [token]);

  const passwordRequirements = [
    { id: 'length', text: 'At least 8 characters', regex: /.{8,}/ },
    { id: 'uppercase', text: 'One uppercase letter', regex: /[A-Z]/ },
    { id: 'lowercase', text: 'One lowercase letter', regex: /[a-z]/ },
    { id: 'number', text: 'One number', regex: /[0-9]/ },
    { id: 'special', text: 'One special character', regex: /[^A-Za-z0-9]/ },
  ];

  const calculateStrength = (pass) => {
    let score = 0;
    passwordRequirements.forEach(req => {
      if (req.regex.test(pass)) score++;
    });
    return score;
  };

  const strengthScore = calculateStrength(newPassword);

  const getStrengthColor = () => {
    if (strengthScore <= 2) return 'bg-[#EA4335]'; // Google Red
    if (strengthScore <= 4) return 'bg-[#FBBC05]'; // Google Yellow/Amber
    return 'bg-[#34A853]'; // Google Green
  };

  const getStrengthLabel = () => {
    if (strengthScore === 0) return '';
    if (strengthScore <= 2) return 'Weak';
    if (strengthScore <= 4) return 'Moderate';
    return 'Strong';
  };

  const isPasswordValid = strengthScore === passwordRequirements.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet all security requirements.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/reset-password', { token, newPassword });
      toast.success('Password successfully reset! You can now log in.');
      setIsSubmitted(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please try again later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

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
                  <span className="text-[11px] font-medium text-[#5f6368] ml-1">Password Security</span>
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[30px] font-normal text-[#1f1f1f] mt-3 md:mt-4 mb-1 leading-tight tracking-tight">
                Create new password
              </h1>
              <p className="text-xs sm:text-sm text-[#5f6368] font-normal">
                Set a strong, unique password to secure your account
              </p>

              {/* Colorful Feature Pills - Visible on both Mobile & Desktop */}
              <div className="mt-4 md:mt-5 grid grid-cols-1 gap-2 md:gap-2.5">
                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e8f0fe]/70 border border-[#d2e3fc] text-[#1967d2] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e8f0fe]">
                  <div className="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck size={13} />
                  </div>
                  <span>Enterprise Zero-Trust Password Standards</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e6f4ea]/70 border border-[#ceead6] text-[#137333] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e6f4ea]">
                  <div className="w-6 h-6 rounded-lg bg-[#34A853] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={13} />
                  </div>
                  <span>Single-Use Cryptographic Reset Token</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fef7e0]/70 border border-[#feefc3] text-[#b06000] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fef7e0]">
                  <div className="w-6 h-6 rounded-lg bg-[#FBBC05] text-[#1f1f1f] flex items-center justify-center shrink-0 shadow-sm">
                    <KeyRound size={13} />
                  </div>
                  <span>Instant Session & Credential Invalidation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form & Confirmation */}
          <div className="flex flex-col justify-between">
            {/* Top Back Navigation Pill */}
            <div className="flex justify-start mb-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </Link>
            </div>

            {/* Error Message Box */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-3.5 p-3 bg-[#fce8e6] border border-[#f28b82] rounded-[10px] flex items-start gap-2.5 text-[#d93025] text-xs shadow-sm"
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
                <h3 className="text-base font-semibold text-[#1f1f1f] mb-1">Password reset complete</h3>
                <p className="text-xs text-[#5f6368] mb-4">
                  Your new password is now active. You can safely sign in to your account.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center min-w-[140px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-all shadow-md shadow-[#4285F4]/25"
                >
                  Sign in now
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* New Password Input Field */}
                <div className="relative">
                  <div
                    className={`relative rounded-[8px] border transition-all duration-200 bg-white flex items-center ${
                      newPasswordFocused
                        ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20 shadow-sm shadow-[#4285F4]/10'
                        : 'border-[#dadce0] hover:border-[#5f6368]'
                    }`}
                  >
                    <label
                      htmlFor="new-password"
                      className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${
                        newPasswordFocused || newPassword
                          ? '-top-2.5 text-xs font-semibold text-[#4285F4]'
                          : 'top-3 text-sm text-[#5f6368]'
                      }`}
                    >
                      New password
                    </label>
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setNewPasswordFocused(true)}
                      onBlur={() => setNewPasswordFocused(false)}
                      className="w-full pl-3.5 pr-9 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                      required
                      disabled={!token}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 p-1 text-[#5f6368] hover:text-[#1f1f1f] transition-colors rounded-full hover:bg-black/5"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input Field */}
                <div className="relative">
                  <div
                    className={`relative rounded-[8px] border transition-all duration-200 bg-white flex items-center ${
                      confirmPasswordFocused
                        ? 'border-[#FBBC05] ring-2 ring-[#FBBC05]/30 shadow-sm shadow-[#FBBC05]/15'
                        : 'border-[#dadce0] hover:border-[#5f6368]'
                    }`}
                  >
                    <label
                      htmlFor="confirm-password"
                      className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${
                        confirmPasswordFocused || confirmPassword
                          ? '-top-2.5 text-xs font-semibold text-[#b06000]'
                          : 'top-3 text-sm text-[#5f6368]'
                      }`}
                    >
                      Confirm new password
                    </label>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      className="w-full pl-3.5 pr-9 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                      required
                      disabled={!token}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 p-1 text-[#5f6368] hover:text-[#1f1f1f] transition-colors rounded-full hover:bg-black/5"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="p-2.5 bg-[#f8fafd] border border-[#dadce0] rounded-xl">
                    <div className="flex items-center justify-between text-[11px] font-medium text-[#5f6368] mb-1.5">
                      <span>Password strength</span>
                      <span className="font-semibold">{getStrengthLabel()}</span>
                    </div>
                    <div className="flex gap-1.5 mb-2 h-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            strengthScore >= level ? getStrengthColor() : 'bg-[#e0e3e7]'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {passwordRequirements.map((req) => {
                        const passed = req.regex.test(newPassword);
                        return (
                          <div key={req.id} className="flex items-center gap-1.5">
                            <div
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white transition-colors shrink-0 ${
                                passed ? 'bg-[#34A853]' : 'bg-[#dadce0]'
                              }`}
                            >
                              <Check size={9} strokeWidth={3} />
                            </div>
                            <span className={passed ? 'text-[#137333] font-medium' : 'text-[#5f6368]'}>
                              {req.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                    disabled={isLoading || !isPasswordValid || !confirmPassword || newPassword !== confirmPassword || !token}
                    className="w-full sm:w-auto min-w-[130px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-sm sm:text-xs font-semibold px-6 py-3.5 sm:py-2.5 rounded-full transition-all shadow-md shadow-[#4285F4]/25 hover:shadow-lg hover:shadow-[#4285F4]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Reset password'
                    )}
                  </button>
                </div>

                {/* Mobile Footer (Links & Credits) inside Card */}
                <div className="mt-4 pt-3 border-t border-[#f1f3f4] flex flex-col items-center gap-2 text-[11px] text-[#5f6368] sm:hidden">
                  <div className="flex items-center justify-center gap-4 text-[11px]">
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
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
                    <span>Designed &amp; Developed by Gowtham Chowdary Kondapaneni</span>
                  </div>
                </div>
              </form>
            )}
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

export default ResetPassword;
