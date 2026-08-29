import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Briefcase,
  Sparkles,
  FileText,
  ShieldCheck,
  Send,
  LogIn,
  UserPlus,
  Compass,
  FileCheck
} from 'lucide-react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const CandidateLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Field focus states for Google outlined floating label effect
  const [focusedField, setFocusedField] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();
  const { user, profile, profileLoading } = useAuth();

  useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Password requirements for registration
  const passwordRequirements = [
    { id: 'length', text: 'At least 8 characters', regex: /.{8,}/ },
    { id: 'uppercase', text: 'One uppercase letter', regex: /[A-Z]/ },
    { id: 'lowercase', text: 'One lowercase letter', regex: /[a-z]/ },
    { id: 'number', text: 'One number', regex: /[0-9]/ },
    { id: 'special', text: 'One special character', regex: /[^A-Za-z0-9]/ }
  ];

  const calculateStrength = (pass) => {
    let score = 0;
    passwordRequirements.forEach((req) => {
      if (req.regex.test(pass)) score++;
    });
    return score;
  };

  const strengthScore = calculateStrength(formData.password);

  const getStrengthColor = () => {
    if (strengthScore <= 2) return 'bg-[#EA4335]'; // Google Red
    if (strengthScore <= 4) return 'bg-[#FBBC05]'; // Google Yellow
    return 'bg-[#34A853]'; // Google Green
  };

  const isPasswordValid = strengthScore === passwordRequirements.length;

  // If already authenticated and candidate profile exists, redirect
  if (user && profile) {
    if (profile.role === 'candidate') {
      return <Navigate to="/candidate/dashboard" replace />;
    }
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Sign In via Candidate endpoint
        const res = await api.post('/candidate/login', {
          email: formData.email,
          password: formData.password
        });

        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }

        toast.success('Welcome back!');
        window.location.href = '/candidate/dashboard';
      } else {
        // Validation check for Sign Up
        if (!isPasswordValid) {
          setError('Password does not meet all security requirements.');
          setIsLoading(false);
          return;
        }

        // Sign Up via Candidate Register endpoint
        const res = await api.post('/candidate/register', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        });

        setSuccess(res.data.message || 'Registration successful! Please check your email to activate your account.');
        setFormData({ firstName: '', lastName: '', email: '', password: '' });
        setIsLogin(true);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        if (err.response.data?.secondsRemaining) {
          setLockoutSeconds(err.response.data.secondsRemaining);
        }
        setError(err.response.data?.error || 'Too Many Requests. Please Try Again Later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (mode) => {
    setIsLogin(mode);
    setError('');
    setSuccess('');
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
                  <span className="text-[11px] font-medium text-[#5f6368] ml-1">Candidate Portal</span>
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[30px] font-normal text-[#1f1f1f] mt-3 md:mt-4 mb-1 leading-tight tracking-tight">
                {isLogin ? 'Candidate Sign In' : 'Create Account'}
              </h1>
              <p className="text-xs sm:text-sm text-[#5f6368] font-normal">
                {isLogin
                  ? 'Access your applications, track assessments, and schedule interviews'
                  : 'Join our talent community and start your journey with Acme'}
              </p>

              {/* Colorful Google Feature Pills - Candidate Specific */}
              <div className="mt-4 md:mt-5 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-2.5">
                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e8f0fe]/70 border border-[#d2e3fc] text-[#1967d2] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e8f0fe]">
                  <div className="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Compass size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Career Opportunities</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#e6f4ea]/70 border border-[#ceead6] text-[#137333] text-[11px] md:text-xs font-medium transition-all hover:bg-[#e6f4ea]">
                  <div className="w-6 h-6 rounded-lg bg-[#34A853] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileCheck size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Live Application Tracking</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fef7e0]/70 border border-[#feefc3] text-[#b06000] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fef7e0]">
                  <div className="w-6 h-6 rounded-lg bg-[#FBBC05] text-[#1f1f1f] flex items-center justify-center shrink-0 shadow-sm">
                    <FileText size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Digital Document Portal</span>
                </div>

                <div className="flex items-center gap-2 p-2 md:p-2.5 rounded-xl bg-[#fce8e6]/70 border border-[#fad2cf] text-[#c5221f] text-[11px] md:text-xs font-medium transition-all hover:bg-[#fce8e6]">
                  <div className="w-6 h-6 rounded-lg bg-[#EA4335] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck size={13} />
                  </div>
                  <span className="truncate md:overflow-visible">Direct HR &amp; Interview Connect</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form & Mode Switcher */}
          <div className="flex flex-col justify-between">
            {/* Colorful Mode Switcher Pill Tabs */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex p-1 bg-[#f1f3f4] rounded-full border border-[#dadce0] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => toggleMode(true)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isLogin
                      ? 'bg-[#4285F4] text-white shadow-md shadow-[#4285F4]/25'
                      : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-black/5 font-medium'
                  }`}
                >
                  <LogIn size={15} className="shrink-0" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    !isLogin
                      ? 'bg-[#34A853] text-white shadow-md shadow-[#34A853]/25'
                      : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-black/5 font-medium'
                  }`}
                >
                  <UserPlus size={15} className="shrink-0" />
                  <span>Create Account</span>
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
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 p-3 bg-[#e6f4ea] border border-[#ceead6] rounded-[10px] flex items-start gap-2.5 text-[#137333] text-xs shadow-sm"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-[#34A853]" />
                  <span className="font-medium">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAuth} className="space-y-3 sm:space-y-3.5">
              {/* First & Last Name Fields (Sign Up only) */}
              {!isLogin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* First Name */}
                  <div className="relative">
                    <div
                      className={`relative rounded-[8px] border transition-all duration-200 bg-white ${
                        focusedField === 'firstName'
                          ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20 shadow-sm shadow-[#4285F4]/10'
                          : 'border-[#dadce0] hover:border-[#5f6368]'
                      }`}
                    >
                      <label
                        htmlFor="first-name"
                        className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${
                          focusedField === 'firstName' || formData.firstName
                            ? '-top-2.5 text-xs font-semibold text-[#4285F4]'
                            : 'top-3 text-sm text-[#5f6368]'
                        }`}
                      >
                        First name
                      </label>
                      <input
                        id="first-name"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('firstName')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full px-3.5 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                        required={!isLogin}
                        autoComplete="given-name"
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="relative">
                    <div
                      className={`relative rounded-[8px] border transition-all duration-200 bg-white ${
                        focusedField === 'lastName'
                          ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20 shadow-sm shadow-[#4285F4]/10'
                          : 'border-[#dadce0] hover:border-[#5f6368]'
                      }`}
                    >
                      <label
                        htmlFor="last-name"
                        className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${
                          focusedField === 'lastName' || formData.lastName
                            ? '-top-2.5 text-xs font-semibold text-[#4285F4]'
                            : 'top-3 text-sm text-[#5f6368]'
                        }`}
                      >
                        Last name
                      </label>
                      <input
                        id="last-name"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('lastName')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full px-3.5 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                        required={!isLogin}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Input Field - Google Blue Highlight */}
              <div className="relative">
                <div
                  className={`relative rounded-[8px] border transition-all duration-200 bg-white ${
                    focusedField === 'email'
                      ? 'border-[#4285F4] ring-2 ring-[#4285F4]/20 shadow-sm shadow-[#4285F4]/10'
                      : 'border-[#dadce0] hover:border-[#5f6368]'
                  }`}
                >
                  <label
                    htmlFor="candidate-email"
                    className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${
                      focusedField === 'email' || formData.email
                        ? '-top-2.5 text-xs font-semibold text-[#4285F4]'
                        : 'top-3 text-sm text-[#5f6368]'
                    }`}
                  >
                    Email address
                  </label>
                  <input
                    id="candidate-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-3.5 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input Field - Google Amber / Yellow Highlight */}
              <div className="relative">
                <div
                  className={`relative rounded-[8px] border transition-all duration-200 bg-white flex items-center ${
                    focusedField === 'password'
                      ? 'border-[#FBBC05] ring-2 ring-[#FBBC05]/30 shadow-sm shadow-[#FBBC05]/15'
                      : 'border-[#dadce0] hover:border-[#5f6368]'
                  }`}
                >
                  <label
                    htmlFor="candidate-password"
                    className={`absolute left-3 transition-all duration-200 pointer-events-none px-1 bg-white ${
                      focusedField === 'password' || formData.password
                        ? '-top-2.5 text-xs font-semibold text-[#b06000]'
                        : 'top-3 text-sm text-[#5f6368]'
                    }`}
                  >
                    {isLogin ? 'Enter your password' : 'Create a strong password'}
                  </label>
                  <input
                    id="candidate-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-3.5 pr-9 pt-3 pb-2.5 bg-transparent outline-none text-[#1f1f1f] text-sm"
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
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

                {/* Password Strength Indicator - For Sign Up */}
                {!isLogin && formData.password.length > 0 && (
                  <div className="mt-2.5 px-0.5">
                    <div className="flex gap-1 mb-1.5 h-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            strengthScore >= level ? getStrengthColor() : 'bg-[#e0e3e7]'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 mt-1.5">
                      {passwordRequirements.map((req) => {
                        const passed = req.regex.test(formData.password);
                        return (
                          <div key={req.id} className="flex items-center gap-1">
                            <span
                              className={`w-2.5 h-2.5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold ${
                                passed ? 'bg-[#34A853] text-white' : 'bg-[#dadce0] text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`text-[10.5px] leading-tight transition-colors ${
                                passed ? 'text-[#137333] font-medium' : 'text-[#5f6368]'
                              }`}
                            >
                              {req.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Forgot Password Link / Remember (Sign In Mode) */}
              {isLogin && (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[#dadce0] text-[#1a73e8] focus:ring-[#4285F4]/30 cursor-pointer accent-[#1a73e8]"
                    />
                    <span className="text-xs text-[#5f6368]">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password?type=candidate"
                    className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {/* Action Buttons Section */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Secondary Actions: Contact HR Admin & Employee Portal */}
                <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 w-full sm:w-auto justify-center sm:justify-start">
                  <a
                    href="mailto:gowthamkondapaneni2003@gmail.com"
                    className="text-xs font-semibold text-[#d93025] hover:bg-[#fce8e6] px-2.5 sm:px-3 py-1.5 rounded-full transition-colors text-center whitespace-nowrap"
                  >
                    Contact HR Admin
                  </a>
                  <span className="text-[#dadce0]">•</span>
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] px-2.5 sm:px-3 py-1.5 rounded-full transition-colors text-center whitespace-nowrap"
                  >
                    Employee Portal
                  </Link>
                </div>

                {/* Primary Action Button */}
                <div className="w-full sm:w-auto flex flex-col items-center sm:items-end shrink-0">
                  <button
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0}
                    className={`w-full sm:w-auto min-w-[120px] text-white text-sm sm:text-xs font-semibold px-6 py-3.5 sm:py-2.5 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLogin
                        ? 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] shadow-md shadow-[#4285F4]/25 hover:shadow-lg hover:shadow-[#4285F4]/30'
                        : 'bg-[#1e8e3e] hover:bg-[#188038] active:bg-[#137333] shadow-md shadow-[#34A853]/25 hover:shadow-lg hover:shadow-[#34A853]/30'
                    }`}
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : lockoutSeconds > 0 ? (
                      `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                    ) : isLogin ? (
                      'Sign in'
                    ) : (
                      'Create Account'
                    )}
                  </button>
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
    </div>
  );
};

export default CandidateLogin;
