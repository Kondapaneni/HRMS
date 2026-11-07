import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import AuthSideCarousel from '../components/AuthSideCarousel';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    passwordRequirements.forEach((req) => {
      if (req.regex.test(pass)) score++;
    });
    return score;
  };

  const strengthScore = calculateStrength(newPassword);

  const getStrengthBarColor = (score) => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 4) return 'bg-amber-500';
    return 'bg-[#2F6B38]';
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
    <div className="min-h-screen w-full overflow-y-auto bg-[#ECEEEA] flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315]">
      {/* Main 2-Column Card matching Login page */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="my-auto w-full max-w-md sm:max-w-lg lg:max-w-[1080px] bg-white rounded-[28px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shrink-0"
      >
        {/* ============================================================
            LEFT COLUMN: Reset Password Form
            ============================================================ */}
        <div className="order-2 lg:order-1 lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full">
          <div>
            {/* Back link */}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors mb-6 font-medium cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to sign in</span>
            </Link>

            {/* Acme HRMS Brand Badge */}
            <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
              <img
                src="/logo.png"
                alt="Acme HRMS"
                className="w-8 h-8 rounded-xl object-contain shadow-xs"
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B38]">
                Acme HRMS
              </span>
            </div>

            {/* Header Titles */}
            <div className="text-center sm:text-left mb-6">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#131315]">
                New password
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed font-normal">
                Set a secure password different from previously used credentials.
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
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* New Password */}
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    autoComplete="new-password"
                    className="w-full h-12 pl-5 pr-12 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    autoComplete="new-password"
                    className="w-full h-12 pl-5 pr-12 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Checklist */}
                {newPassword.length > 0 && (
                  <div className="p-3.5 bg-neutral-50 rounded-2xl space-y-2 border border-neutral-200/70">
                    <div className="flex items-center gap-1.5 h-1.5">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`flex-1 h-full rounded-full transition-all duration-200 ${
                            strengthScore >= lvl ? getStrengthBarColor(strengthScore) : 'bg-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 pt-1">
                      {passwordRequirements.map((req) => {
                        const passed = req.regex.test(newPassword);
                        return (
                          <div key={req.id} className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                passed ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-400'
                              }`}
                            >
                              ✓
                            </span>
                            <span className={passed ? 'text-neutral-800 font-medium' : 'text-neutral-400'}>
                              {req.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
                >
                  {isLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    'Save and update password'
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <CheckCircle2 size={30} />
                </div>
                <h2 className="text-xl font-bold text-[#131315]">Password updated</h2>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">
                  Your new password has been applied. You can now use it to sign in to your workspace.
                </p>
                <div className="pt-2">
                  <Link to="/login">
                    <button className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center active:scale-[0.99]">
                      Proceed to sign in
                    </button>
                  </Link>
                </div>
              </div>
            )}
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

export default ResetPassword;
