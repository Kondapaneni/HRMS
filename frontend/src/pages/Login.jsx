import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, KeyRound, ShieldCheck, Users, CalendarCheck, Sparkles, MailCheck, Send, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Automatically detect and sync autofilled or prefilled values from browser credentials managers
  useEffect(() => {
    const syncAutofill = () => {
      const emailEl = document.getElementById('google-email') || document.getElementById('otp-email');
      const passEl = document.getElementById('google-password');
      if (emailEl && emailEl.value) {
        setEmail(emailEl.value);
      }
      if (passEl && passEl.value) {
        setPassword(passEl.value);
      }
    };

    syncAutofill();
    const t1 = setTimeout(syncAutofill, 100);
    const t2 = setTimeout(syncAutofill, 400);
    const t3 = setTimeout(syncAutofill, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loginMethod]);

  const { user, profile, profileLoading, signIn, sendLoginOtp, signInWithOtp, signOut } = useAuth();

  const ADMIN_ROLES = ['admin'];

  // If already authenticated and profile is loaded, redirect immediately
  if (user) {
    if (profileLoading || !profile) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafd] text-[#444746] text-sm overflow-hidden">
          <div className="w-10 h-10 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mb-4" />
          <span className="font-medium text-[#1f1f1f]">Signing in to Acme HRMS...</span>
        </div>
      );
    }
    if (profile.forcePasswordChange) {
      return <Navigate to="/change-password" replace />;
    }
    if (profile.role === 'candidate') {
      return <Navigate to="/candidate/dashboard" replace />;
    }
    return <Navigate to={ADMIN_ROLES.includes(profile.role) ? '/admin' : '/employee'} replace />;
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const userData = await signIn(email, password);

      if (userData.forcePasswordChange) {
        navigate('/change-password');
      } else if (ADMIN_ROLES.includes(userData.role)) {
        navigate('/admin');
      } else if (userData.role === 'employee') {
        navigate('/employee');
      } else if (userData.role === 'candidate') {
        if (signOut) await signOut();
        throw new Error('Please use the Candidate Portal to sign in.');
      } else {
        throw new Error(`Unrecognised account role '${userData.role}'. Contact your administrator.`);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        if (err.response.data?.secondsRemaining) {
          setLockoutSeconds(err.response.data.secondsRemaining);
        }
        setError(err.response.data?.error || 'Too Many Requests. Please Try Again Later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await sendLoginOtp(email.trim());
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMessage(res.message || 'Verification code sent to your email.');
    } catch (err) {
      if (err.response?.status === 429) {
        if (err.response.data?.secondsRemaining) {
          setLockoutSeconds(err.response.data.secondsRemaining);
        }
        setError(err.response.data?.error || 'Too many attempts. Please try again later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const userData = await signInWithOtp(email.trim(), otp.trim());

      if (userData.forcePasswordChange) {
        navigate('/change-password');
      } else if (ADMIN_ROLES.includes(userData.role)) {
        navigate('/admin');
      } else if (userData.role === 'employee') {
        navigate('/employee');
      } else if (userData.role === 'candidate') {
        if (signOut) await signOut();
        throw new Error('Please use the Candidate Portal to sign in.');
      } else {
        throw new Error(`Unrecognised account role '${userData.role}'. Contact your administrator.`);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        if (err.response.data?.secondsRemaining) {
          setLockoutSeconds(err.response.data.secondsRemaining);
        }
        setError(err.response.data?.error || 'Too many attempts. Please try again later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] md:h-screen md:max-h-screen w-full flex flex-col justify-between bg-[#f8fafd] text-[#1f1f1f] selection:bg-[#c2e7ff] selection:text-[#001d35] font-editorial antialiased overflow-y-auto md:overflow-hidden relative" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Colorful Google Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4285F4]/12 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EA4335]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-[#FBBC05]/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#34A853]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Card Viewport */}
      <div className="flex-1 flex items-center justify-center p-2.5 sm:p-4 md:p-6 relative z-10">
        {/* Google Material 3 Sign-in Card */}
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
              <h1 className="font-editorial text-[28px] sm:text-[34px] font-medium text-[#1f1f1f] mt-1 md:mt-2 mb-1.5 leading-tight tracking-tight" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
                Sign in to <span className="italic font-normal text-[#4285F4]">Acme HRMS</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#5f6368] font-normal leading-relaxed">
                Use your Acme authenticated enterprise account
              </p>

              {/* Colorful Google Feature Pills */}
              <div className="mt-4 md:mt-5 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-2.5">
                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e8f0fe]/70 border border-[#d2e3fc] text-[#1967d2] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e8f0fe]">
                  <div className="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Secure Email OTP</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e6f4ea]/70 border border-[#ceead6] text-[#137333] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e6f4ea]">
                  <div className="w-6 h-6 rounded-lg bg-[#34A853] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CalendarCheck size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Smart Attendance</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fef7e0]/70 border border-[#feefc3] text-[#b06000] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fef7e0]">
                  <div className="w-6 h-6 rounded-lg bg-[#FBBC05] text-[#1f1f1f] flex items-center justify-center shrink-0 shadow-sm">
                    <Users size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Employee Directory</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fce8e6]/70 border border-[#fad2cf] text-[#c5221f] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fce8e6]">
                  <div className="w-6 h-6 rounded-lg bg-[#EA4335] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Zero-Trust Access</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form & Method Switcher */}
          <div className="flex flex-col justify-between">
            {/* Method Switcher Pill Tabs */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex p-1 bg-[#f1f3f4] rounded-full border border-[#dadce0] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                    loginMethod === 'password'
                      ? 'bg-[#4285F4] text-white shadow-md shadow-[#4285F4]/25 font-semibold'
                      : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-black/5 font-medium'
                  }`}
                >
                  <KeyRound size={14} className="shrink-0" />
                  <span>Password Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('otp');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                    loginMethod === 'otp'
                      ? 'bg-[#1e8e3e] text-white shadow-md shadow-[#34A853]/25 font-semibold'
                      : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-black/5 font-medium'
                  }`}
                >
                  <MailCheck size={14} className="shrink-0" />
                  <span>Email OTP Sign In</span>
                </button>
              </div>
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

            {/* Success Message Box */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 p-3 bg-[#e6f4ea] border border-[#81c995] rounded-[10px] flex items-start gap-2.5 text-[#137333] text-xs shadow-sm"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-[#34A853]" />
                  <span className="font-medium">{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PASSWORD LOGIN FORM */}
            {loginMethod === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {/* Email Input Field */}
                <div className="relative">
                  <div
                    className={`relative rounded-[8px] border transition-all duration-200 bg-white floating-input-group ${
                      emailFocused
                        ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20 shadow-sm shadow-[#4285F4]/10'
                        : 'border-[#dadce0] hover:border-[#5f6368]'
                    }`}
                  >
                    <input
                      id="google-email"
                      type="email"
                      placeholder=" "
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onInput={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onAnimationStart={(e) => {
                        if (e.animationName === 'onAutoFillStart' || e.target.value) {
                          setEmail(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                      required
                      autoComplete="email"
                    />
                    <label
                      htmlFor="google-email"
                      className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white font-medium ${
                        emailFocused || email
                          ? '-top-2.5 text-xs text-[#4285F4]'
                          : 'top-3 text-sm text-[#5f6368]'
                      }`}
                    >
                      Email address
                    </label>
                  </div>
                </div>

                {/* Password Input Field */}
                <div className="relative">
                  <div
                    className={`relative rounded-[8px] border transition-all duration-200 bg-white flex items-center floating-input-group ${
                      passwordFocused
                        ? 'border-[#FBBC05] ring-2 ring-[#FBBC05]/30 shadow-sm shadow-[#FBBC05]/15'
                        : 'border-[#dadce0] hover:border-[#5f6368]'
                    }`}
                  >
                    <input
                      id="google-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder=" "
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onInput={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      onAnimationStart={(e) => {
                        if (e.animationName === 'onAutoFillStart' || e.target.value) {
                          setPassword(e.target.value);
                        }
                      }}
                      className="w-full pl-3.5 pr-9 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                      required
                      autoComplete="current-password"
                    />
                    <label
                      htmlFor="google-password"
                      className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white font-medium ${
                        passwordFocused || password
                          ? '-top-2.5 text-xs text-[#b06000]'
                          : 'top-3 text-sm text-[#5f6368]'
                      }`}
                    >
                      Enter your password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 p-1 text-[#5f6368] hover:text-[#1f1f1f] transition-colors rounded-full hover:bg-black/5 cursor-pointer z-10"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-start">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Action Buttons Section */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 w-full sm:w-auto justify-center sm:justify-start">
                    <a
                      href="mailto:gowthamkondapaneni2003@gmail.com"
                      className="text-xs font-semibold text-[#d93025] hover:bg-[#fce8e6] px-2.5 sm:px-3 py-1.5 rounded-full transition-colors text-center whitespace-nowrap"
                    >
                      Contact HR Admin
                    </a>
                    <span className="text-[#dadce0]">•</span>
                    <Link
                      to="/candidate/login"
                      className="text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] px-2.5 sm:px-3 py-1.5 rounded-full transition-colors text-center whitespace-nowrap"
                    >
                      Candidate Portal
                    </Link>
                  </div>

                  <div className="w-full sm:w-auto flex flex-col items-center sm:items-end shrink-0">
                    <button
                      type="submit"
                      disabled={isLoading || lockoutSeconds > 0}
                      className="w-full sm:w-auto min-w-[110px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-sm sm:text-xs font-semibold px-6 py-3 sm:py-2.5 rounded-full transition-all shadow-md shadow-[#4285F4]/25 hover:shadow-lg hover:shadow-[#4285F4]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : lockoutSeconds > 0 ? (
                        `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                      ) : (
                        'Sign in'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* EMAIL OTP LOGIN FORM */}
            {loginMethod === 'otp' && (
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                {/* Email Input Field */}
                <div className="relative">
                  <div
                    className={`relative rounded-[8px] border transition-all duration-200 bg-white floating-input-group ${
                      emailFocused
                        ? 'border-[#1e8e3e] ring-2 ring-[#34A853]/20 shadow-sm shadow-[#34A853]/10'
                        : 'border-[#dadce0] hover:border-[#5f6368]'
                    }`}
                  >
                    <input
                      id="otp-email"
                      type="email"
                      placeholder=" "
                      value={email}
                      disabled={otpSent}
                      onChange={(e) => setEmail(e.target.value)}
                      onInput={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onAnimationStart={(e) => {
                        if (e.animationName === 'onAutoFillStart' || e.target.value) {
                          setEmail(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm disabled:text-[#70757a]"
                      required
                      autoComplete="email"
                    />
                    <label
                      htmlFor="otp-email"
                      className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white font-medium ${
                        emailFocused || email
                          ? '-top-2.5 text-xs text-[#1e8e3e]'
                          : 'top-3 text-sm text-[#5f6368]'
                      }`}
                    >
                      Email address
                    </label>
                  </div>
                </div>

                {/* 6-Digit OTP Code Input (Appears when code sent) */}
                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div
                      className={`relative rounded-[8px] border transition-all duration-200 bg-white floating-input-group ${
                        otpFocused
                          ? 'border-[#1e8e3e] ring-2 ring-[#34A853]/20 shadow-sm shadow-[#34A853]/10'
                          : 'border-[#dadce0] hover:border-[#5f6368]'
                      }`}
                    >
                      <input
                        id="login-otp"
                        type="text"
                        maxLength={6}
                        inputMode="numeric"
                        placeholder=" "
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        onInput={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        onFocus={() => setOtpFocused(true)}
                        onBlur={() => setOtpFocused(false)}
                        className="w-full px-3.5 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-lg font-mono tracking-widest text-center"
                        required
                        autoFocus
                      />
                      <label
                        htmlFor="login-otp"
                        className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white font-medium ${
                          otpFocused || otp
                            ? '-top-2.5 text-xs text-[#1e8e3e]'
                            : 'top-3 text-sm text-[#5f6368]'
                        }`}
                      >
                        6-Digit Verification Code
                      </label>
                    </div>

                    <div className="flex items-center justify-between text-xs px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp('');
                          setError('');
                        }}
                        className="inline-flex items-center gap-1 text-[#5f6368] hover:text-[#1f1f1f] cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>Change Email</span>
                      </button>

                      {otpCountdown > 0 ? (
                        <span className="text-[#5f6368]">
                          Resend in <strong className="text-[#1f1f1f]">{otpCountdown}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isLoading}
                          className="text-[#1a73e8] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          <span>Resend Code</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* OTP Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 w-full sm:w-auto justify-center sm:justify-start">
                    <a
                      href="mailto:gowthamkondapaneni2003@gmail.com"
                      className="text-xs font-semibold text-[#d93025] hover:bg-[#fce8e6] px-2.5 sm:px-3 py-1.5 rounded-full transition-colors text-center whitespace-nowrap"
                    >
                      Contact HR Admin
                    </a>
                  </div>

                  <div className="w-full sm:w-auto flex flex-col items-center sm:items-end shrink-0">
                    {!otpSent ? (
                      <button
                        type="submit"
                        disabled={isLoading || lockoutSeconds > 0}
                        className="w-full sm:w-auto min-w-[130px] bg-[#1e8e3e] hover:bg-[#188038] active:bg-[#137333] text-white text-sm sm:text-xs font-semibold px-6 py-3 sm:py-2.5 rounded-full transition-all shadow-md shadow-[#34A853]/25 hover:shadow-lg hover:shadow-[#34A853]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Send OTP Code</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLoading || otp.length < 6 || lockoutSeconds > 0}
                        className="w-full sm:w-auto min-w-[130px] bg-[#1e8e3e] hover:bg-[#188038] active:bg-[#137333] text-white text-sm sm:text-xs font-semibold px-6 py-3 sm:py-2.5 rounded-full transition-all shadow-md shadow-[#34A853]/25 hover:shadow-lg hover:shadow-[#34A853]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck size={15} />
                            <span>Verify &amp; Sign In</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}

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

export default Login;
