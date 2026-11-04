import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Compass,
  FileCheck,
  FileText,
  ShieldCheck,
  LogIn,
  UserPlus,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const CandidateLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const [focusedField, setFocusedField] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();
  const { user, profile } = useAuth();

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

  const getStrengthBarColor = (score) => {
    if (score <= 2) return 'bg-[#D64550]';
    if (score <= 4) return 'bg-[#B7791F]';
    return 'bg-[#1F9D55]';
  };

  const isPasswordValid = strengthScore === passwordRequirements.length;

  if (user && profile && profile.role === 'candidate') {
    return <Navigate to="/candidate/dashboard" replace />;
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
        if (!isPasswordValid) {
          setError('Password does not meet all security requirements.');
          setIsLoading(false);
          return;
        }

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
        setError(err.response.data?.error || 'Too many requests. Please try again later.');
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--bg)] text-[var(--text)] font-sans antialiased selection:bg-[var(--brand-tint)] selection:text-[var(--text)] p-3 sm:p-5 md:p-8">
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-[1020px] bg-[var(--surface)] rounded-[32px] overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-[0_24px_60px_rgba(19,19,21,0.08)]"
        >
          {/* Left Hero Panel (Dark with Soft Pink & Blue Accents) */}
          <div className="md:col-span-5 bg-[var(--ink)] text-[var(--sidebar-text)] p-6 sm:p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Accent Shapes */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[var(--accent-pink)]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[var(--brand)]/15 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Brand Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[var(--ink-2)] border border-[#2A2A30] flex items-center justify-center text-[var(--brand)] font-semibold text-lg">
                  A
                </div>
                <div>
                  <div className="text-xl font-medium tracking-tight text-white flex items-center gap-1.5">
                    Acme <span className="text-[var(--accent-pink)]">HRMS</span>
                  </div>
                  <div className="text-[11px] text-[var(--sidebar-muted)]">Candidate Portal</div>
                </div>
              </div>

              {/* Tagline & Title */}
              <div className="mt-8 md:mt-12">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[var(--ink-2)] text-[var(--accent-pink)] border border-[var(--accent-pink)]/20 mb-3">
                  <Briefcase size={12} />
                  <span>Careers &amp; Opportunities</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight leading-tight">
                  {isLogin ? 'Welcome to your career journey' : 'Start your story at Acme'}
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-[var(--sidebar-muted)] leading-relaxed">
                  {isLogin
                    ? 'Track your applications, complete assessments, and collaborate with our hiring team in real time.'
                    : 'Create your candidate profile in under a minute and explore open positions across teams.'}
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="mt-8 space-y-2.5 hidden sm:block">
                <div className="flex items-center gap-3 p-3 rounded-[16px] bg-[var(--ink-2)] border border-[#26262B]">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--brand)]/15 text-[var(--brand)] flex items-center justify-center shrink-0">
                    <Compass size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Live application tracking</div>
                    <div className="text-[11px] text-[var(--sidebar-muted)]">Real-time status updates at every stage</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-[16px] bg-[var(--ink-2)] border border-[#26262B]">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-pink)]/15 text-[var(--accent-pink)] flex items-center justify-center shrink-0">
                    <FileCheck size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Interactive assessments</div>
                    <div className="text-[11px] text-[var(--sidebar-muted)]">Fast, structured skills evaluations</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-[16px] bg-[var(--ink-2)] border border-[#26262B]">
                  <div className="w-8 h-8 rounded-[10px] bg-white/10 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Verified digital documents</div>
                    <div className="text-[11px] text-[var(--sidebar-muted)]">Seamless onboarding upon selection</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer on Left Rail */}
            <div className="mt-8 pt-4 border-t border-[#26262B] text-[11px] text-[var(--sidebar-muted)] relative z-10 flex items-center justify-between">
              <span>Candidate Access</span>
              <Link to="/login" className="text-[var(--brand)] hover:underline">
                Employee sign in &rarr;
              </Link>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="md:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between">
            <div>
              {/* Sign In vs Create Account Pill Switcher */}
              <div className="flex items-center justify-center mb-6">
                <div className="inline-flex p-1 bg-[var(--surface-alt)] rounded-full border border-[var(--line)] w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => toggleMode(true)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium transition-all ${
                      isLogin
                        ? 'bg-[var(--ink)] text-white shadow-xs dark:bg-white dark:text-[#131315]'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <LogIn size={14} />
                    <span>Sign in</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode(false)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium transition-all ${
                      !isLogin
                        ? 'bg-[var(--ink)] text-white shadow-xs dark:bg-white dark:text-[#131315]'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <UserPlus size={14} />
                    <span>Create account</span>
                  </button>
                </div>
              </div>

              {/* Form Heading */}
              <div className="mb-5 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-medium text-[var(--text)] tracking-tight">
                  {isLogin ? 'Sign in to candidate portal' : 'Create your candidate account'}
                </h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {isLogin ? 'Enter your registered credentials below' : 'Please provide your details to get started'}
                </p>
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-4 p-3 bg-[#FDE8EA] text-[#D64550] rounded-[12px] flex items-start gap-2.5 text-xs font-medium"
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Alert */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-4 p-3 bg-[#E6F6EC] text-[#1F9D55] rounded-[12px] flex items-start gap-2.5 text-xs font-medium"
                  >
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-3.5">
                {!isLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* First Name */}
                    <div className="relative">
                      <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('firstName')}
                        onBlur={() => setFocusedField(null)}
                        placeholder=" "
                        required={!isLogin}
                        className="peer w-full h-11 px-3.5 pt-4 pb-1 text-xs text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                      <label
                        htmlFor="firstName"
                        className="absolute left-3.5 top-1 text-[11px] text-[var(--muted)] pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-[var(--muted)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-[var(--brand-deep)] font-normal"
                      >
                        First name
                      </label>
                    </div>

                    {/* Last Name */}
                    <div className="relative">
                      <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('lastName')}
                        onBlur={() => setFocusedField(null)}
                        placeholder=" "
                        required={!isLogin}
                        className="peer w-full h-11 px-3.5 pt-4 pb-1 text-xs text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                      <label
                        htmlFor="lastName"
                        className="absolute left-3.5 top-1 text-[11px] text-[var(--muted)] pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-[var(--muted)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-[var(--brand-deep)] font-normal"
                      >
                        Last name
                      </label>
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder=" "
                    required
                    autoComplete="email"
                    className="peer w-full h-11 px-3.5 pt-4 pb-1 text-xs text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-3.5 top-1 text-[11px] text-[var(--muted)] pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-[var(--muted)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-[var(--brand-deep)] font-normal"
                  >
                    Email address
                  </label>
                </div>

                {/* Password */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder=" "
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="peer w-full h-11 pl-3.5 pr-10 pt-4 pb-1 text-xs text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-3.5 top-1 text-[11px] text-[var(--muted)] pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-[var(--muted)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-[var(--brand-deep)] font-normal"
                  >
                    {isLogin ? 'Password' : 'Create strong password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Checklist (Sign Up only) */}
                {!isLogin && formData.password.length > 0 && (
                  <div className="p-3 bg-[var(--surface-alt)] rounded-[12px] space-y-2 border border-[var(--line)]">
                    <div className="flex items-center gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`flex-1 h-full rounded-full transition-all duration-200 ${
                            strengthScore >= lvl ? getStrengthBarColor(strengthScore) : 'bg-[var(--line)]'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                      {passwordRequirements.map((req) => {
                        const passed = req.regex.test(formData.password);
                        return (
                          <div key={req.id} className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                                passed
                                  ? 'bg-[#E6F6EC] text-[#1F9D55]'
                                  : 'bg-[var(--line)] text-[var(--muted)]'
                              }`}
                            >
                              ✓
                            </span>
                            <span className={passed ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
                              {req.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Forgot Password link (Sign In only) */}
                {isLogin && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--muted)] hover:text-[var(--text)]">
                      <input
                        type="checkbox"
                        className="rounded-[4px] border-[var(--line)] text-[var(--ink)] focus:ring-[var(--brand)] cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>
                    <Link
                      to="/forgot-password?type=candidate"
                      className="text-[var(--brand-deep)] hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading || lockoutSeconds > 0}
                    loading={isLoading}
                    className="w-full h-11 rounded-[12px] font-medium text-xs justify-center"
                  >
                    {lockoutSeconds > 0
                      ? `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                      : isLogin
                      ? 'Sign in to portal'
                      : 'Create account'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Bottom Actions & Support */}
            <div className="mt-8 pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <span>Need assistance?</span>
                <a
                  href="mailto:gowthamkondapaneni2003@gmail.com"
                  className="text-[var(--brand-deep)] hover:underline font-medium"
                >
                  Contact HR team
                </a>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <Link to="/login" className="text-[var(--text)] hover:underline font-medium">
                  Staff sign in
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-[var(--muted)]">
        Acme HRMS &bull; Designed &amp; developed by Gowtham Chowdary Kondapaneni
      </footer>
    </div>
  );
};

export default CandidateLogin;
