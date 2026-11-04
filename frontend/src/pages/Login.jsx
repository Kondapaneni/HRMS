import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  KeyRound,
  Users,
  CalendarCheck,
  Wallet
} from 'lucide-react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Carousel State for Right Panel
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const otpInputsRef = useRef([]);
  const navigate = useNavigate();

  // Carousel Slides Content tailored strictly to HRMS (Human Resource Management System)
  const carouselSlides = [
    {
      id: 'workforce',
      cardTitle: 'Workforce Hub',
      cardSubtitle: '248 Active Staff',
      cardBadge: 'People Ops',
      cardProgress: '96%',
      badgeIcon: Users,
      headline: 'Make your work easier and organized with Acme HRMS',
      description: 'Streamline team directories, organizational hierarchy, and employee onboarding.',
      themeAccent: '#10B981',
    },
    {
      id: 'attendance',
      cardTitle: 'Smart Attendance',
      cardSubtitle: 'Shift Geofenced',
      cardBadge: 'Live Verified',
      cardProgress: '98%',
      badgeIcon: CalendarCheck,
      headline: 'Automated attendance & real-time shift verification',
      description: 'Geofenced check-ins, automated leave approvals, and dynamic shift roster tracking.',
      themeAccent: '#0D9488',
    },
    {
      id: 'payroll',
      cardTitle: 'Payroll Engine',
      cardSubtitle: 'Disbursements Ready',
      cardBadge: 'Compliant',
      cardProgress: '100%',
      badgeIcon: Wallet,
      headline: 'Frictionless payroll processing & tax compliance',
      description: 'Automated salary disbursements, tax deductions, and verified employee pay slips.',
      themeAccent: '#5B86C2',
    },
  ];

  // Auto-play carousel every 5 seconds (pauses on hover)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, carouselSlides.length]);

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

  // Sync autofill values from browser credential managers
  useEffect(() => {
    const syncAutofill = () => {
      const emailEl = document.getElementById('login-email') || document.getElementById('otp-email');
      const passEl = document.getElementById('login-password');
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

  // Redirect if already authenticated
  if (user) {
    if (profileLoading || !profile) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F4F6F4] text-neutral-600 text-sm">
          <div className="w-9 h-9 border-3 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <span className="font-medium text-neutral-800">Signing in to Acme HRMS...</span>
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
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
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

  const handleOtpChange = (index, value) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const userData = await signInWithOtp(email.trim(), otpCode);

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


  const currentSlide = carouselSlides[activeSlide];

  return (
    <div className="min-h-screen w-full bg-[#ECEEEA] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315]">
      {/* Main 2-Column Card (Clean container without fake browser chrome bar) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[1080px] bg-white rounded-[32px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
      >
        {/* ============================================================
            LEFT COLUMN: Clean Minimalist Login Form
            ============================================================ */}
        <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full">
          <div>
            {/* Header Titles */}
            <div className="text-center sm:text-left mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#131315]">
                Welcome back!
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed font-normal">
                Simplify your workflow and boost your productivity with <strong className="text-neutral-800 font-semibold">Acme HRMS</strong>.
              </p>
            </div>

            {/* Error & Success Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 shadow-2xs"
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                  <span className="font-medium leading-tight">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 shadow-2xs"
                >
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span className="font-medium leading-tight">{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PASSWORD SIGN-IN FORM */}
            {loginMethod === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {/* Username / Email Pill Input */}
                <div>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full h-12 px-5 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                  />
                </div>

                {/* Password Pill Input with Eye toggle */}
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full h-12 pl-5 pr-12 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Forgot Password link */}
                <div className="text-right pt-0.5">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-neutral-500 hover:text-black transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Full-width Black Pill Login Button */}
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
                    'Login'
                  )}
                </button>
              </form>
            )}

            {/* OTP SIGN-IN FORM */}
            {loginMethod === 'otp' && (
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                {/* Email Pill Input */}
                <div>
                  <input
                    id="otp-email"
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    disabled={otpSent}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full h-12 px-5 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs disabled:opacity-60"
                  />
                </div>

                {/* OTP 6-box input */}
                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2.5 pt-1"
                  >
                    <label className="block text-xs font-medium text-neutral-600 text-center">
                      Enter 6-digit verification code
                    </label>

                    <div className="flex items-center justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputsRef.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e.key)}
                          className="w-10 sm:w-11 h-12 rounded-xl bg-neutral-50 text-neutral-900 text-center text-lg font-mono font-semibold border border-neutral-300 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp(['', '', '', '', '', '']);
                          setError('');
                        }}
                        className="inline-flex items-center gap-1 text-neutral-500 hover:text-black cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>Change email</span>
                      </button>

                      {otpCountdown > 0 ? (
                        <span>Resend in <strong>{otpCountdown}s</strong></span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isLoading}
                          className="text-black font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          <span>Resend code</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (otpSent && otp.join('').length < 6) || lockoutSeconds > 0}
                  className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {isLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : !otpSent ? (
                    'Send verification code'
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>
            )}

            {/* Toggle between Password and OTP Login */}
            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod(loginMethod === 'password' ? 'otp' : 'password');
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-medium transition-colors cursor-pointer"
              >
                {loginMethod === 'password' ? 'Sign in with Email OTP instead' : 'Sign in with Password instead'}
              </button>
            </div>
          </div>

          {/* Footer Information & Credits */}
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
        <div 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="lg:col-span-6 bg-[#F3F9F1] rounded-[28px] sm:rounded-[36px] m-3 sm:m-4 p-6 sm:p-10 flex flex-col items-center justify-between min-h-[460px] sm:min-h-[520px] relative overflow-hidden select-none border border-neutral-100"
        >
          {/* Subtle green ambient light */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#E2F2DE]/60 rounded-full blur-3xl pointer-events-none" />

          {/* Carousel Slide Animation Container */}
          <div className="relative w-full max-w-[380px] h-[310px] flex items-center justify-center my-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {/* Floating Avatar 1 (Top Left) */}
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-2 left-4 z-20"
                >
                  <div className="w-11 h-11 rounded-full border-2 border-[#1F2937] bg-[#D1FAE5] p-0.5 shadow-md overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="w-full h-full">
                      <circle cx="20" cy="20" r="18" fill="#A7F3D0" />
                      <circle cx="20" cy="18" r="8" fill="#1F2937" />
                      <circle cx="20" cy="17" r="7.5" fill="#FDE68A" />
                      <circle cx="17.5" cy="16.5" r="1.2" fill="#1F2937" />
                      <circle cx="22.5" cy="16.5" r="1.2" fill="#1F2937" />
                      <path d="M18 20 Q20 22 22 20" stroke="#1F2937" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                      <path d="M15 13 Q20 8 25 13 Q22 10 18 11 Z" fill="#1F2937" />
                      <path d="M12 36 C12 28 28 28 28 36 Z" fill="#10B981" />
                    </svg>
                  </div>
                </motion.div>

                {/* Floating Avatar 2 (Mid Right) */}
                <motion.div 
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  className="absolute top-32 right-4 z-20"
                >
                  <div className="w-11 h-11 rounded-full border-2 border-[#1F2937] bg-white p-0.5 shadow-md overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="w-full h-full">
                      <circle cx="20" cy="20" r="18" fill="#FEE2E2" />
                      <circle cx="20" cy="18" r="8" fill="#1F2937" />
                      <circle cx="20" cy="17" r="7.5" fill="#FED7AA" />
                      <circle cx="17.5" cy="16" r="1.2" fill="#1F2937" />
                      <circle cx="22.5" cy="16" r="1.2" fill="#1F2937" />
                      <circle cx="20" cy="20.5" r="2" fill="#1F2937" />
                      <path d="M12 18 C12 10 28 10 28 18 C28 22 26 24 26 24 L24 17 C22 14 18 14 16 17 L14 24 C14 24 12 22 12 18 Z" fill="#1F2937" />
                      <path d="M11 36 C11 28 29 28 29 36 Z" fill="#1F2937" />
                    </svg>
                  </div>
                </motion.div>

                {/* Central Meditating Character Illustration */}
                <div className="relative z-10 flex flex-col items-center">
                  <svg width="220" height="210" viewBox="0 0 240 230" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Floating Green Aura Loops */}
                    <path 
                      d="M 50 110 C 25 50, 100 10, 120 45 C 140 10, 215 50, 190 110" 
                      stroke="#86EFAC" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      fill="none" 
                      strokeDasharray="4 2"
                    />
                    <path 
                      d="M 45 105 C 15 45, 100 5, 120 40 C 140 5, 225 45, 195 105" 
                      stroke="#A7F3D0" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      fill="none" 
                    />

                    {/* Hair Back */}
                    <ellipse cx="120" cy="95" rx="22" ry="24" fill="#1F2937" />
                    {/* Neck */}
                    <path d="M114 105 L114 120 L126 120 L126 105 Z" fill="#FCD34D" stroke="#1F2937" strokeWidth="2" />
                    {/* Face */}
                    <ellipse cx="120" cy="92" rx="16" ry="17" fill="#FDE68A" stroke="#1F2937" strokeWidth="2" />

                    {/* Hair Front with Center Part */}
                    <path d="M104 88 C104 74 136 74 136 88 C136 88 126 82 120 84 C114 82 104 88 104 88 Z" fill="#1F2937" stroke="#1F2937" strokeWidth="1.5" />
                    <path d="M104 88 C104 98 107 106 107 106 C107 106 110 94 113 90 Z" fill="#1F2937" />
                    <path d="M136 88 C136 98 133 106 133 106 C133 106 130 94 127 90 Z" fill="#1F2937" />

                    {/* Serene Closed Eyes */}
                    <path d="M111 92 Q114 94 116 92" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    <path d="M124 92 Q126 94 129 92" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    {/* Smile */}
                    <path d="M117 99 Q120 102 123 99" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" fill="none" />

                    {/* Green Sweater Body */}
                    <path 
                      d="M 96 122 C 84 126, 75 140, 78 178 L 162 178 C 165 140, 156 126, 144 122 Z" 
                      fill="#9FE1B8" 
                      stroke="#1F2937" 
                      strokeWidth="2.5" 
                      strokeLinejoin="round"
                    />
                    <path d="M110 120 C110 126 130 126 130 120" stroke="#1F2937" strokeWidth="2.5" fill="none" />

                    {/* White Heart on Sweater */}
                    <path 
                      d="M 120 148 C 120 148, 110 141, 110 134 C 110 129, 115 127, 120 131 C 125 127, 130 129, 130 134 C 130 141, 120 148, 120 148 Z" 
                      fill="none" 
                      stroke="#FFFFFF" 
                      strokeWidth="2.5" 
                      strokeLinejoin="round" 
                    />

                    {/* Arms in Mudra */}
                    <path 
                      d="M 85 130 C 65 145, 55 175, 66 186 C 72 192, 85 186, 96 172" 
                      stroke="#1F2937" 
                      strokeWidth="2.5" 
                      fill="#9FE1B8" 
                      strokeLinejoin="round"
                    />
                    <circle cx="68" cy="188" r="5" fill="#FDE68A" stroke="#1F2937" strokeWidth="2" />
                    <path d="M65 184 Q62 188 66 191" stroke="#1F2937" strokeWidth="2" fill="none" />

                    <path 
                      d="M 155 130 C 175 145, 185 175, 174 186 C 168 192, 155 186, 144 172" 
                      stroke="#1F2937" 
                      strokeWidth="2.5" 
                      fill="#9FE1B8" 
                      strokeLinejoin="round"
                    />
                    <circle cx="172" cy="188" r="5" fill="#FDE68A" stroke="#1F2937" strokeWidth="2" />
                    <path d="M175 184 Q178 188 174 191" stroke="#1F2937" strokeWidth="2" fill="none" />

                    {/* White Trousers / Crossed Legs */}
                    <path 
                      d="M 80 178 C 65 182, 45 200, 75 210 C 98 218, 120 205, 120 195" 
                      fill="#FFFFFF" 
                      stroke="#1F2937" 
                      strokeWidth="2.5" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M 160 178 C 175 182, 195 200, 165 210 C 142 218, 120 205, 120 195" 
                      fill="#FFFFFF" 
                      stroke="#1F2937" 
                      strokeWidth="2.5" 
                      strokeLinejoin="round"
                    />
                    {/* Bare Feet */}
                    <ellipse cx="100" cy="206" rx="6" ry="4" fill="#FDE68A" stroke="#1F2937" strokeWidth="1.8" />
                    <ellipse cx="140" cy="206" rx="6" ry="4" fill="#FDE68A" stroke="#1F2937" strokeWidth="1.8" />
                  </svg>
                </div>

                {/* Floating HRMS Task Card (Bottom Left of Graphic) */}
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  className="absolute -bottom-1 -left-2 sm:left-1 z-20"
                >
                  <div className="bg-white rounded-[20px] p-3.5 shadow-xl border border-neutral-200/60 flex flex-col gap-2 min-w-[140px] backdrop-blur-xs">
                    <div>
                      <h4 className="font-bold text-[13px] text-neutral-800 tracking-tight leading-tight">
                        {currentSlide.cardTitle}
                      </h4>
                      <p className="text-[10px] text-neutral-400 font-medium">
                        {currentSlide.cardSubtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {/* HRMS Pill Badge */}
                      <span className="text-[10px] font-semibold text-neutral-600 border border-neutral-300 rounded-full px-2.5 py-0.5 inline-block">
                        {currentSlide.cardBadge}
                      </span>

                      {/* Radial Progress Ring */}
                      <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-neutral-200"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            style={{ stroke: currentSlide.themeAccent }}
                            strokeDasharray={`${parseInt(currentSlide.cardProgress)}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[8px] font-bold text-neutral-700">
                          {currentSlide.cardProgress}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Pagination Controls (Working Interactive Carousel) */}
          <div className="flex items-center gap-2 mt-4 z-20">
            {carouselSlides.map((slide, idx) => {
              const isActive = activeSlide === idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'w-5 h-1.5 bg-black rounded-full' 
                      : 'w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-500 rounded-full'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              );
            })}
          </div>

          {/* Bottom Slogan Headline with Smooth Transitions */}
          <div className="text-center mt-3 max-w-sm z-10 min-h-[56px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug">
                  {currentSlide.headline}
                </h2>
                <p className="text-[11.5px] text-neutral-500 mt-1 line-clamp-2">
                  {currentSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
