import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ScanFace, AlertCircle, KeyRound, ShieldCheck, Users, CalendarCheck, Sparkles } from 'lucide-react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FastFaceScanner from '../components/FastFaceScanner';


const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'face'
  const [isScanning, setIsScanning] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const { user, profile, profileLoading, signIn, signInWithFace, signOut } = useAuth();

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
    if (profile.role === 'employee' && !profile.isFaceRegistered) {
      return <Navigate to="/employee/face-registration" replace />;
    }
    return <Navigate to={ADMIN_ROLES.includes(profile.role) ? '/admin' : '/employee'} replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (loginMethod === 'face') {
      if (!email) return;
      setIsScanning(true);
      return;
    }

    setIsLoading(true);

    try {
      let userData = await signIn(email, password);

      // Redirect based on role
      if (userData.forcePasswordChange) {
        navigate('/change-password');
      } else if (ADMIN_ROLES.includes(userData.role)) {
        navigate('/admin');
      } else if (userData.role === 'employee') {
        if (!userData.isFaceRegistered) {
          navigate('/employee/face-registration');
        } else {
          navigate('/employee');
        }
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

  const handleFaceDetected = async (descriptor) => {
    setIsScanning(false);
    setError('');
    setIsLoading(true);

    try {
      const userData = await signInWithFace(email, descriptor);

      // Redirect based on role
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
      if (err.response?.data?.error === 'Face is not Registered') {
        setError('Face is not registered. Please login with your password to register your face.');
        setLoginMethod('password');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Face matching failed or credentials incorrect.');
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
                  <span className="text-[11px] font-medium text-[#5f6368] ml-1">Workspace Portal</span>
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[30px] font-normal text-[#1f1f1f] mt-3 md:mt-4 mb-1 leading-tight tracking-tight">
                Sign in
              </h1>
              <p className="text-xs sm:text-sm text-[#5f6368] font-normal">
                Use your Acme Authenticated HR Account
              </p>

              {/* Colorful Google Feature Pills - Visible on both Mobile & Desktop */}
              <div className="mt-4 md:mt-5 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-2.5">
                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e8f0fe]/70 border border-[#d2e3fc] text-[#1967d2] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e8f0fe]">
                  <div className="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">AI Face Recognition</span>
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
                    <ShieldCheck size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Zero-Trust Security</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form & Method Switcher */}
          <div className="flex flex-col justify-between">
            {/* Colorful Method Switcher Pill Tabs */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex p-1 bg-[#f1f3f4] rounded-full border border-[#dadce0] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setIsScanning(false); }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${loginMethod === 'password'
                      ? 'bg-[#4285F4] text-white shadow-md shadow-[#4285F4]/25'
                      : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-black/5 font-medium'
                    }`}
                >
                  <KeyRound size={15} className="shrink-0" />
                  <span>Password Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('face'); setIsScanning(false); }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${loginMethod === 'face'
                      ? 'bg-[#34A853] text-white shadow-md shadow-[#34A853]/25'
                      : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-black/5 font-medium'
                    }`}
                >
                  <ScanFace size={15} className="shrink-0" />
                  <span>Face ID Sign In</span>
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

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input Field - Google Blue Highlight */}
              <div className="relative">
                <div
                  className={`relative rounded-[8px] border transition-all duration-200 bg-white ${emailFocused
                      ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20 shadow-sm shadow-[#4285F4]/10'
                      : 'border-[#dadce0] hover:border-[#5f6368]'
                    }`}
                >
                  <label
                    htmlFor="google-email"
                    className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${emailFocused || email
                        ? '-top-2.5 text-xs font-semibold text-[#4285F4]'
                        : 'top-3 text-sm text-[#5f6368]'
                      }`}
                  >
                    Email address
                  </label>
                  <input
                    id="google-email"
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

              {loginMethod === 'password' && (
                <>
                  {/* Password Input Field - Google Amber / Yellow Highlight on Focus */}
                  <div className="relative">
                    <div
                      className={`relative rounded-[8px] border transition-all duration-200 bg-white flex items-center ${passwordFocused
                          ? 'border-[#FBBC05] ring-2 ring-[#FBBC05]/30 shadow-sm shadow-[#FBBC05]/15'
                          : 'border-[#dadce0] hover:border-[#5f6368]'
                        }`}
                    >
                      <label
                        htmlFor="google-password"
                        className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${passwordFocused || password
                            ? '-top-2.5 text-xs font-semibold text-[#b06000]'
                            : 'top-3 text-sm text-[#5f6368]'
                          }`}
                      >
                        Enter your password
                      </label>
                      <input
                        id="google-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        className="w-full pl-3.5 pr-9 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                        required={loginMethod === 'password'}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 p-1 text-[#5f6368] hover:text-[#1f1f1f] transition-colors rounded-full hover:bg-black/5"
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
                </>
              )}

              {/* Action Buttons Section */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Secondary Actions: Contact HR Admin & Candidate Portal */}
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

                {/* Primary Action Button */}
                <div className="w-full sm:w-auto flex flex-col items-center sm:items-end shrink-0">
                  {loginMethod === 'password' ? (
                    <button
                      type="submit"
                      disabled={isLoading || lockoutSeconds > 0}
                      className="w-full sm:w-auto min-w-[110px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-sm sm:text-xs font-semibold px-6 py-3.5 sm:py-2.5 rounded-full transition-all shadow-md shadow-[#4285F4]/25 hover:shadow-lg hover:shadow-[#4285F4]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : lockoutSeconds > 0 ? (
                        `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                      ) : (
                        'Sign in'
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading || lockoutSeconds > 0}
                      className="w-full sm:w-auto min-w-[110px] bg-[#1e8e3e] hover:bg-[#188038] active:bg-[#137333] text-white text-sm sm:text-xs font-semibold px-6 py-3.5 sm:py-2.5 rounded-full transition-all shadow-md shadow-[#34A853]/25 hover:shadow-lg hover:shadow-[#34A853]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : lockoutSeconds > 0 ? (
                        `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                      ) : (
                        <>
                          <ScanFace size={16} className="sm:w-[15px] sm:h-[15px]" />
                          <span>Scan Face</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
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

      {/* Face Scanner Fullscreen Modal */}
      {isScanning && loginMethod === 'face' && (
        <FastFaceScanner
          isScanning={isScanning}
          onFaceDetected={handleFaceDetected}
          onCancel={() => setIsScanning(false)}
          mode="verify"
        />
      )}
    </div>
  );
};

export default Login;
