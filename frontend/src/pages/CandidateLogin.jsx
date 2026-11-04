import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Compass,
  FileCheck,
  ShieldCheck,
  Briefcase,
  RefreshCw,
  Sparkles,
  ArrowRight
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
    if (score <= 2) return 'bg-red-500';
    if (score <= 4) return 'bg-amber-500';
    return 'bg-[#2F6B38]';
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
    <div className="min-h-screen w-full bg-[#ECEEEA] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-[#131315]">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[1080px] bg-white rounded-[32px] sm:rounded-[36px] shadow-xl border border-neutral-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
      >
        {/* ============================================================
            LEFT COLUMN: Candidate Form
            ============================================================ */}
        <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 max-w-md mx-auto w-full">
          <div>
            {/* Header Titles */}
            <div className="text-center sm:text-left mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  A
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B38]">
                  Candidate Portal
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#131315]">
                {isLogin ? 'Welcome back!' : 'Create account'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed font-normal">
                {isLogin
                  ? 'Track your job applications, assessments, and offer statuses.'
                  : 'Start your application journey with Acme HRMS talent network.'}
              </p>
            </div>

            {/* Pill Mode Switcher */}
            <div className="flex items-center p-1 bg-neutral-100 rounded-full mb-6">
              <button
                type="button"
                onClick={() => toggleMode(true)}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  isLogin
                    ? 'bg-black text-white shadow-xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => toggleMode(false)}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  !isLogin
                    ? 'bg-black text-white shadow-xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                Create account
              </button>
            </div>

            {/* Alerts */}
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

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 shadow-2xs font-medium"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-3.5">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      name="firstName"
                      type="text"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full h-12 px-5 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <input
                      name="lastName"
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full h-12 px-5 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  className="w-full h-12 px-5 py-3 rounded-full border border-neutral-300 bg-white text-sm text-[#131315] placeholder:text-neutral-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                />
              </div>

              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
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

              {/* Password strength in registration */}
              {!isLogin && formData.password.length > 0 && (
                <div className="p-3 bg-neutral-50 rounded-2xl space-y-2 border border-neutral-200/70">
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
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                    {passwordRequirements.map((req) => {
                      const passed = req.regex.test(formData.password);
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

              {/* Forgot password in Login mode */}
              {isLogin && (
                <div className="text-right pt-0.5">
                  <Link
                    to="/forgot-password?type=candidate"
                    className="text-xs font-medium text-neutral-500 hover:text-black transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || lockoutSeconds > 0}
                className="w-full h-12 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : lockoutSeconds > 0 ? (
                  `Locked (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})`
                ) : isLogin ? (
                  'Sign in to portal'
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="text-center pt-3">
              <Link
                to="/login"
                className="text-xs text-neutral-500 hover:text-black font-medium transition-colors"
              >
                Staff or employee? Sign in to Workspace &rarr;
              </Link>
            </div>
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
            RIGHT COLUMN: Calming Sage Green Candidate Showcase Panel
            ============================================================ */}
        <div className="lg:col-span-6 bg-[#F3F9F1] rounded-[28px] sm:rounded-[36px] m-3 sm:m-4 p-6 sm:p-10 flex flex-col justify-between min-h-[460px] sm:min-h-[520px] relative overflow-hidden select-none border border-neutral-100">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#E2F2DE]/60 rounded-full blur-3xl pointer-events-none" />

          {/* Top Tag */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white border border-neutral-200/80 text-neutral-700 shadow-2xs">
              <Briefcase size={12} className="text-[#2F6B38]" />
              <span>Careers &amp; Talent Portal</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#131315] mt-4 tracking-tight leading-snug">
              Launch your career journey with Acme HRMS
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
              Experience transparent hiring, interactive assessments, and seamless onboarding with our modern talent platform.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="relative z-10 space-y-3 my-6">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-neutral-200/70 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Compass size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Live Application Tracking</h4>
                <p className="text-[11px] text-neutral-500">Real-time status updates at every stage of the pipeline</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-neutral-200/70 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#E2F2DE] text-[#2F6B38] flex items-center justify-center shrink-0">
                <FileCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Interactive Assessments</h4>
                <p className="text-[11px] text-neutral-500">Structured online evaluations with instant feedback</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-neutral-200/70 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Verified Digital Records</h4>
                <p className="text-[11px] text-neutral-500">Fast, secure document verification upon selection</p>
              </div>
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="relative z-10 pt-4 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-500">
            <span className="font-medium">Acme Enterprise Talent System</span>
            <span className="font-semibold text-[#2F6B38]">Official Applicant Portal</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CandidateLogin;
