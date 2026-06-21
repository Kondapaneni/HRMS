import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Briefcase, Eye, EyeOff, User, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const CandidateLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isFocused, setIsFocused] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

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

  const strengthScore = calculateStrength(formData.password);
  
  const getStrengthColor = () => {
    if (strengthScore <= 2) return 'bg-[#EF4444]'; // Red
    if (strengthScore <= 4) return 'bg-[#F59E0B]'; // Yellow
    return 'bg-[#10B981]'; // Green
  };

  const isPasswordValid = strengthScore === passwordRequirements.length;

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Sign In via PHP Backend
        const res = await api.post('/candidate/login', {
          email: formData.email,
          password: formData.password
        });
        
        localStorage.setItem('token', res.data.token);
        toast.success('Welcome back!');
        window.location.href = '/candidate/dashboard'; 

      } else {
        // Validation check for Sign Up
        if (!isPasswordValid) {
          setError('Password does not meet all security requirements.');
          setIsLoading(false);
          return;
        }

        // Sign Up via PHP Backend
        const res = await api.post('/candidate/register', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        });

        setSuccess(res.data.message || 'Registration successful! Please check your email to confirm your account.');
        setFormData({ firstName: '', lastName: '', email: '', password: '' });
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
  };

  const shapeVariants = {
    animate: (i) => ({
      y: [0, -20, 0],
      x: [0, 15, 0],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 5 + i * 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    })
  };

  return (
    <div className="min-h-screen flex w-full bg-[#f8f9fa] overflow-hidden selection:bg-[#4F46E5] selection:text-white">

      {/* LEFT SIDE */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-1/2 bg-slate-50 relative items-center justify-center overflow-hidden z-10"
      >
        <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-90 top-1/4 -left-12" />
        <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-80 h-80 bg-[#10B981] rounded-3xl opacity-90 bottom-1/4 right-0 rotate-12" />
        <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#EF4444] rounded-full opacity-90 -bottom-16 left-1/4" />
        <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#3B82F6] rounded-2xl opacity-90 top-20 right-20 -rotate-12" />
        <motion.div custom={5} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#EC4899] rounded-full opacity-90 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-20 text-slate-800 max-w-md px-12 backdrop-blur-md bg-white/60 p-8 rounded-2xl border border-white/40 shadow-xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <Briefcase size={24} strokeWidth={2.5} />
              </div>
              <span className="text-3xl font-black tracking-tight text-slate-900">Acme HRMS</span>
            </div>
            <h1 className="text-5xl font-black mb-6 leading-[1.1] tracking-tight text-slate-900">
              Join our <span className="text-blue-600">incredible</span> team.
            </h1>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              Discover opportunities, track your applications, and embark on your next great career journey with us.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-20 bg-slate-50 overflow-hidden">
        
        {/* Animated Background Graphics */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-10 -top-20 -right-20" />
          <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#10B981] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12" />
          <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-96 h-96 bg-[#3B82F6] rounded-full opacity-5 top-1/2 left-1/3" />
          <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#EC4899] rounded-xl opacity-10 top-20 left-10 -rotate-12" />
          <motion.div custom={5} variants={shapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#8B5CF6] rounded-full opacity-10 bottom-20 right-1/4" />
          
          <motion.div custom={6} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-40 h-40 bg-[#14B8A6] rounded-2xl opacity-10 top-[-20px] left-[18rem] rotate-45" />
          <motion.div custom={7} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-28 h-28 bg-[#F43F5E] rounded-3xl opacity-10 top-32 left-[24rem] -rotate-12" />
          <motion.div custom={8} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-56 h-56 bg-[#6366F1] rounded-full opacity-[0.06] top-10 left-[35%]" />
          
          <motion.div custom={9} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-36 h-36 bg-[#EAB308] rounded-2xl opacity-10 bottom-10 right-10 -rotate-12" />
          <motion.div custom={10} variants={shapeVariants} animate="animate" className="hidden md:block absolute w-24 h-24 bg-[#06B6D4] rounded-full opacity-10 bottom-40 right-28 rotate-45" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", bounce: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white border-[3px] border-[#1E1B4B] rounded-2xl p-6 sm:p-8 relative overflow-visible">

            <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#F59E0B] rounded-full border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] z-20 animate-[bounce_3s_infinite]" />
            <div className="absolute top-1/2 -left-6 w-12 h-12 bg-[#10B981] rounded-lg border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] z-20 transform -rotate-12" />

            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-xl border-[3px] border-[#1E1B4B] flex items-center justify-center text-white shadow-[3px_3px_0px_#1E1B4B]">
                <Briefcase size={20} strokeWidth={3} />
              </div>
              <span className="text-2xl font-black tracking-tight text-[#1E1B4B]">Acme HRMS</span>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-4">
              <h2 className="text-3xl font-black text-[#1E1B4B] mb-1 tracking-tight">{isLogin ? 'Welcome Back' : 'Join Us'}</h2>
              <p className="text-[#4F46E5] font-black text-sm sm:text-base">
                {isLogin ? 'Access your candidate portal.' : 'Create an account to apply.'}
              </p>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }} 
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-red-100 border-[3px] border-red-500 rounded-xl text-red-700 font-bold p-4 overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }} 
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-[#D1FAE5] border-[3px] border-[#10B981] rounded-xl text-[#047857] font-bold p-4 overflow-hidden flex items-start gap-3"
                >
                  <CheckCircle2 className="shrink-0 mt-0.5" size={20} strokeWidth={2.5} />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAuth}>
              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4 overflow-hidden pt-1 -mt-1 px-1 -mx-1 pb-2"
                  >
                    <div className="relative group flex-1">
                      <label className="block text-xs font-black text-[#1E1B4B] mb-1 uppercase tracking-wide">
                        First Name
                      </label>
                      <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'firstName' ? 'shadow-[4px_4px_0px_#10B981] -translate-y-0.5 -translate-x-0.5' : 'shadow-[2px_2px_0px_#E5E7EB]'}`}>
                        <div className={`pl-3 transition-colors ${isFocused === 'firstName' ? 'text-[#10B981]' : 'text-[#1E1B4B]'}`}>
                          <User size={20} strokeWidth={2.5} />
                        </div>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="Jane"
                          onFocus={() => setIsFocused('firstName')}
                          onBlur={() => setIsFocused(null)}
                          className="w-full py-3 px-3 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF] text-sm sm:text-base"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div className="relative group flex-1">
                      <label className="block text-xs font-black text-[#1E1B4B] mb-1 uppercase tracking-wide">
                        Last Name
                      </label>
                      <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'lastName' ? 'shadow-[4px_4px_0px_#10B981] -translate-y-0.5 -translate-x-0.5' : 'shadow-[2px_2px_0px_#E5E7EB]'}`}>
                        <div className={`pl-3 transition-colors ${isFocused === 'lastName' ? 'text-[#10B981]' : 'text-[#1E1B4B]'}`}>
                          <User size={20} strokeWidth={2.5} />
                        </div>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Doe"
                          onFocus={() => setIsFocused('lastName')}
                          onBlur={() => setIsFocused(null)}
                          className="w-full py-3 px-3 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF] text-sm sm:text-base"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className={`relative group ${!isLogin ? 'mt-2' : ''}`}>
                <label className="block text-xs font-black text-[#1E1B4B] mb-1 uppercase tracking-wide">
                  Email Address
                </label>
                  <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'email' ? 'shadow-[4px_4px_0px_#10B981] -translate-y-0.5 -translate-x-0.5' : 'shadow-[2px_2px_0px_#E5E7EB]'}`}>
                  <div className={`pl-3 transition-colors ${isFocused === 'email' ? 'text-[#10B981]' : 'text-[#1E1B4B]'}`}>
                    <Mail size={20} strokeWidth={2.5} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    onFocus={() => setIsFocused('email')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full py-3 px-3 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF] text-sm sm:text-base"
                    required
                  />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="relative group mt-4">
                <div className="mb-1">
                  <label className="block text-xs font-black text-[#1E1B4B] uppercase tracking-wide">
                    Password
                  </label>
                </div>
                <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'password' ? 'shadow-[4px_4px_0px_#F59E0B] -translate-y-0.5 -translate-x-0.5' : 'shadow-[2px_2px_0px_#E5E7EB]'}`}>
                  <div className={`pl-3 transition-colors ${isFocused === 'password' ? 'text-[#F59E0B]' : 'text-[#1E1B4B]'}`}>
                    <Lock size={20} strokeWidth={2.5} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    onFocus={() => setIsFocused('password')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full py-3 px-3 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF] text-sm sm:text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`pr-4 transition-colors hover:text-[#F59E0B] ${isFocused === 'password' ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'}`}
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator - Only for Sign Up */}
                {!isLogin && formData.password.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                    <div className="flex gap-1 mb-1.5 h-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div 
                          key={level} 
                          className={`flex-1 rounded-full transition-all duration-300 ${strengthScore >= level ? getStrengthColor() : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {passwordRequirements.map((req) => (
                        <div key={req.id} className="flex items-center gap-1">
                          <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center border-[1.5px] transition-colors ${req.regex.test(formData.password) ? 'border-[#10B981] bg-[#10B981]' : 'border-slate-300'}`}>
                            {req.regex.test(formData.password) && <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className={`text-[9.5px] font-bold transition-colors tracking-tight ${req.regex.test(formData.password) ? 'text-[#10B981]' : 'text-slate-500'}`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {isLogin && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center justify-between mt-4">
                  <div className="flex items-center">
                    <div className="relative flex items-center justify-center">
                      <input id="remember" type="checkbox" className="peer appearance-none w-5 h-5 border-[2px] border-[#1E1B4B] rounded bg-white checked:bg-[#10B981] cursor-pointer transition-colors shadow-[2px_2px_0px_#1E1B4B]" />
                      <svg className="absolute w-4 h-4 text-[#1E1B4B] opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" stroke="#1E1B4B" strokeWidth="1" />
                      </svg>
                    </div>
                    <label htmlFor="remember" className="ml-2 text-sm font-black text-[#1E1B4B] cursor-pointer">
                      Remember me
                    </label>
                  </div>
  
                  <Link to="/forgot-password?type=candidate" className="text-xs font-black text-[#3B82F6] hover:text-[#2563EB] transition-colors hover:underline decoration-[2px] underline-offset-2">
                    Forgot Password?
                  </Link>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 bg-[#EF4444] text-white py-3 rounded-xl font-black text-lg flex items-center justify-center gap-2 border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] hover:shadow-[6px_6px_0px_#1E1B4B] active:shadow-[0px_0px_0px_#1E1B4B] active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (isLogin ? 'Signing in...' : 'Creating Account...') : (isLogin ? 'Sign in' : 'Create Account')}
                  {!isLoading && <ArrowRight size={20} strokeWidth={3} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                </button>
              </motion.div>

            </form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6 text-center">
              <button 
                onClick={toggleMode}
                className="text-[#1E1B4B] text-sm font-black hover:text-[#4F46E5] transition-colors"
              >
                {isLogin ? (
                  <>Don't have an account? <span className="text-[#EF4444] hover:text-[#DC2626] hover:underline decoration-[2px] underline-offset-2 transition-colors">Sign Up</span></>
                ) : (
                  <>Already have an account? <span className="text-[#EF4444] hover:text-[#DC2626] hover:underline decoration-[2px] underline-offset-2 transition-colors">Sign In</span></>
                )}
              </button>
            </motion.div>

          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default CandidateLogin;
