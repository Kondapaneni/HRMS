import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  KeyRound
} from 'lucide-react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import AuthSideCarousel from '../components/AuthSideCarousel';
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


  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#ECEEEA] flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315]">
      {/* Main 2-Column Card (Clean container without fake browser chrome bar) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="my-auto w-full max-w-md sm:max-w-lg lg:max-w-[1080px] bg-white rounded-[28px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shrink-0"
      >
        {/* ============================================================
            LEFT COLUMN: Clean Minimalist Login Form
            ============================================================ */}
        <div className="order-2 lg:order-1 lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full">
          <div>
            {/* Acme HRMS Brand Badge */}
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-5 sm:mb-6">
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
                A
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B38]">
                Acme HRMS
              </span>
            </div>

            {/* Header Titles */}
            <div className="text-center sm:text-left mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#131315]">
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
                          className="flex-1 min-w-0 max-w-11 h-11 sm:h-12 rounded-xl bg-neutral-50 text-neutral-900 text-center text-base sm:text-lg font-mono font-semibold border border-neutral-300 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
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
        <AuthSideCarousel />
      </motion.div>
    </div>
  );
};

export default Login;
