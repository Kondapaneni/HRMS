import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  KeyRound, 
  ShieldCheck, 
  Users, 
  CalendarCheck, 
  Sparkles, 
  MailCheck, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeft 
} from 'lucide-react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

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
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const otpInputsRef = useRef([]);
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
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--muted)] text-sm">
          <div className="w-9 h-9 border-3 border-[var(--brand)] border-t-transparent rounded-full animate-spin mb-4" />
          <span className="font-medium text-[var(--text)]">Signing in to Acme HRMS...</span>
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
    <div className="min-h-[100dvh] w-full flex flex-col justify-between bg-[var(--bg)] text-[var(--text)] select-none overflow-y-auto p-4 sm:p-6 lg:p-8">
      {/* Centered Main Viewport */}
      <div className="flex-1 flex items-center justify-center my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-[1020px] grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch"
        >
          {/* ============================================================
              LEFT PANEL (Section 9.1: #131315 rounded panel, radius 32px)
              ============================================================ */}
          <div className="md:col-span-5 bg-[#131315] text-white rounded-[32px] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border border-white/5 min-h-[360px] md:min-h-[560px]">
            {/* Soft Ambient Blurred Shapes */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#8AADDB]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#E3B9DF]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Brand Header */}
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-[14px] bg-[#1F1F23] border border-white/10 flex items-center justify-center mb-6">
                <div className="w-6 h-6 rounded-[6px] bg-[#8AADDB] text-[#131315] font-bold text-xs flex items-center justify-center">
                  A
                </div>
              </div>

              <h2 className="text-[26px] sm:text-[30px] font-medium text-white tracking-[-0.01em] leading-tight mb-2">
                Acme <span className="text-[#8AADDB]">HRMS</span>
              </h2>
              <p className="text-[13px] text-[#8B8B95] font-normal leading-relaxed">
                Enterprise Human Resource & Workspace Management
              </p>
            </div>

            {/* Raised Feature Tiles (#1F1F23) */}
            <div className="relative z-10 space-y-2.5 my-6">
              <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[#1F1F23] border border-white/5 text-[13px]">
                <div className="w-8 h-8 rounded-[10px] bg-[#8AADDB]/15 text-[#8AADDB] flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} strokeWidth={1.7} />
                </div>
                <div>
                  <p className="font-medium text-white text-[12.5px]">Zero-Trust Security</p>
                  <p className="text-[11px] text-[#8B8B95]">Role-guarded workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[#1F1F23] border border-white/5 text-[13px]">
                <div className="w-8 h-8 rounded-[10px] bg-[#E3B9DF]/15 text-[#E3B9DF] flex items-center justify-center shrink-0">
                  <MailCheck size={16} strokeWidth={1.7} />
                </div>
                <div>
                  <p className="font-medium text-white text-[12.5px]">Secure Email OTP</p>
                  <p className="text-[11px] text-[#8B8B95]">Passwordless 1-click login</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[#1F1F23] border border-white/5 text-[13px]">
                <div className="w-8 h-8 rounded-[10px] bg-[#8AADDB]/15 text-[#8AADDB] flex items-center justify-center shrink-0">
                  <CalendarCheck size={16} strokeWidth={1.7} />
                </div>
                <div>
                  <p className="font-medium text-white text-[12.5px]">Smart Attendance</p>
                  <p className="text-[11px] text-[#8B8B95]">Geofenced check-in</p>
                </div>
              </div>
            </div>

            {/* Bottom Note */}
            <div className="relative z-10 pt-2 text-[11px] text-[#8B8B95]">
              <span>Need access? </span>
              <a href="mailto:support@acme.com" className="text-[#8AADDB] hover:underline">
                Contact administrator
              </a>
            </div>
          </div>

          {/* ============================================================
              RIGHT PANEL (Section 9.1: White card, radius 24px)
              ============================================================ */}
          <div className="md:col-span-7 bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-6 sm:p-9 flex flex-col justify-between border border-[var(--line)] shadow-none">
            <div>
              {/* Header: Title & Method Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-[22px] font-medium text-[var(--text)] tracking-tight">
                    Welcome back
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5">
                    Sign in to access your dashboard
                  </p>
                </div>

                {/* Method Switcher Pills */}
                <div className="inline-flex p-1 bg-[var(--surface-alt)] rounded-full border border-[var(--line)] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                      loginMethod === 'password'
                        ? 'bg-[#131315] text-white dark:bg-white dark:text-[#131315] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('otp');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                      loginMethod === 'otp'
                        ? 'bg-[#131315] text-white dark:bg-white dark:text-[#131315] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Email OTP
                  </button>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-4 p-3 bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[12px] flex items-start gap-2.5 text-[12px]"
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span className="font-medium">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Message */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-4 p-3 bg-[var(--success-bg)] text-[var(--success-text)] rounded-[12px] flex items-start gap-2.5 text-[12px]"
                  >
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    <span className="font-medium">{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PASSWORD SIGN-IN FORM */}
              {loginMethod === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  {/* Floating Email Field */}
                  <div className="relative">
                    <div
                      className={`relative rounded-[12px] border transition-all bg-[var(--surface-alt)] floating-input-group ${
                        emailFocused
                          ? 'border-[var(--brand)] ring-3 ring-[var(--brand-tint)]'
                          : 'border-[var(--line)]'
                      }`}
                    >
                      <input
                        id="login-email"
                        type="email"
                        placeholder=" "
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        className="w-full px-3.5 pt-4 pb-2.5 bg-transparent outline-none text-[var(--text)] text-[14px]"
                        required
                        autoComplete="email"
                      />
                      <label
                        htmlFor="login-email"
                        className={`absolute left-3.5 transition-all duration-150 pointer-events-none px-1 rounded font-medium select-none ${
                          emailFocused || email
                            ? '-top-2.5 text-[11px] bg-[var(--surface)] text-[var(--brand-deep)]'
                            : 'top-3.5 text-[13px] text-[var(--muted)]'
                        }`}
                      >
                        Email address
                      </label>
                    </div>
                  </div>

                  {/* Floating Password Field */}
                  <div className="relative">
                    <div
                      className={`relative rounded-[12px] border transition-all bg-[var(--surface-alt)] flex items-center floating-input-group ${
                        passwordFocused
                          ? 'border-[var(--brand)] ring-3 ring-[var(--brand-tint)]'
                          : 'border-[var(--line)]'
                      }`}
                    >
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder=" "
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        className="w-full pl-3.5 pr-10 pt-4 pb-2.5 bg-transparent outline-none text-[var(--text)] text-[14px]"
                        required
                        autoComplete="current-password"
                      />
                      <label
                        htmlFor="login-password"
                        className={`absolute left-3.5 transition-all duration-150 pointer-events-none px-1 rounded font-medium select-none ${
                          passwordFocused || password
                            ? '-top-2.5 text-[11px] bg-[var(--surface)] text-[var(--brand-deep)]'
                            : 'top-3.5 text-[13px] text-[var(--muted)]'
                        }`}
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 text-[var(--icon-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password link in #5B86C2 */}
                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-[12px] font-medium text-[#5B86C2] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Primary Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isLoading || lockoutSeconds > 0}
                    isLoading={isLoading}
                    className="w-full h-[44px]"
                  >
                    {lockoutSeconds > 0
                      ? `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                      : 'Sign in'}
                  </Button>
                </form>
              )}

              {/* OTP SIGN-IN FORM */}
              {loginMethod === 'otp' && (
                <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                  {/* Email Field */}
                  <div className="relative">
                    <div
                      className={`relative rounded-[12px] border transition-all bg-[var(--surface-alt)] floating-input-group ${
                        emailFocused
                          ? 'border-[var(--brand)] ring-3 ring-[var(--brand-tint)]'
                          : 'border-[var(--line)]'
                      }`}
                    >
                      <input
                        id="otp-email"
                        type="email"
                        placeholder=" "
                        value={email}
                        disabled={otpSent}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        className="w-full px-3.5 pt-4 pb-2.5 bg-transparent outline-none text-[var(--text)] text-[14px] disabled:opacity-50"
                        required
                        autoComplete="email"
                      />
                      <label
                        htmlFor="otp-email"
                        className={`absolute left-3.5 transition-all duration-150 pointer-events-none px-1 rounded font-medium select-none ${
                          emailFocused || email
                            ? '-top-2.5 text-[11px] bg-[var(--surface)] text-[var(--brand-deep)]'
                            : 'top-3.5 text-[13px] text-[var(--muted)]'
                        }`}
                      >
                        Email address
                      </label>
                    </div>
                  </div>

                  {/* OTP Step: Six 48px rounded input boxes with #8AADDB focus */}
                  {otpSent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-1"
                    >
                      <label className="block text-[13px] font-normal text-[var(--muted)]">
                        Enter 6-digit verification code
                      </label>

                      <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
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
                            className="w-11 sm:w-12 h-12 rounded-[12px] bg-[var(--surface-alt)] text-[var(--text)] text-center text-lg font-mono font-semibold border border-[var(--line)] outline-none focus:border-[#8AADDB] focus:ring-3 focus:ring-[#8AADDB]/20 transition-all"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[12px] text-[var(--muted)] pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp(['', '', '', '', '', '']);
                            setError('');
                          }}
                          className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
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
                            className="text-[#5B86C2] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={12} />
                            <span>Resend code</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isLoading || (otpSent && otp.join('').length < 6) || lockoutSeconds > 0}
                    isLoading={isLoading}
                    className="w-full h-[44px]"
                  >
                    {!otpSent ? 'Send verification code' : 'Verify & sign in'}
                  </Button>
                </form>
              )}
            </div>

            {/* Bottom Links: Candidate portal & Admin assistance */}
            <div className="pt-6 mt-6 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--muted)]">
              <Link
                to="/candidate/login"
                className="font-medium text-[var(--text)] hover:text-[#5B86C2] transition-colors"
              >
                Candidate portal →
              </Link>
              <a
                href="mailto:gowthamkondapaneni2003@gmail.com"
                className="hover:underline text-[var(--muted)]"
              >
                Contact HR support
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1020px] mx-auto pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-[var(--muted)]">
        <p>© Acme HRMS • Enterprise Workspace</p>
        <div className="flex items-center gap-4">
          <a href="mailto:support@acme.com" className="hover:text-[var(--text)]">Help</a>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
};

export default Login;
