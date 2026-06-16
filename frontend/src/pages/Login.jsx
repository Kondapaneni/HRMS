import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Briefcase, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [isFocused, setIsFocused] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { user, profile, profileLoading, signIn } = useAuth();

  const ADMIN_ROLES = ['admin'];

  // If already authenticated and profile is loaded, redirect immediately
  if (user) {
    if (profileLoading || !profile) {
      return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] text-slate-500">Signing in...</div>;
    }
    return <Navigate to={ADMIN_ROLES.includes(profile.role) ? '/admin' : '/employee'} replace />;
  }

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Authenticate via our custom PHP backend
      const userData = await signIn(email, password);

      // Redirect based on role
      if (ADMIN_ROLES.includes(userData.role)) {
        navigate('/admin');
      } else if (userData.role === 'employee') {
        navigate('/employee');
      } else {
        throw new Error(`Unrecognised account role '${userData.role}'. Contact your administrator.`);
      }

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
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
              Manage your <span className="text-blue-600">workforce</span> beautifully.
            </h1>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              Experience the next generation of human resources management. Streamlined, colorful, and built for modern teams.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative z-20 bg-slate-50 overflow-hidden">
        
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
          <div className="bg-white border-[3px] border-[#1E1B4B] rounded-2xl p-8 sm:p-10 relative overflow-visible">

            <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#F59E0B] rounded-full border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] z-20 animate-[bounce_3s_infinite]" />
            <div className="absolute top-1/2 -left-6 w-12 h-12 bg-[#10B981] rounded-lg border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] z-20 transform -rotate-12" />

            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-xl border-[3px] border-[#1E1B4B] flex items-center justify-center text-white shadow-[4px_4px_0px_#1E1B4B]">
                <Briefcase size={24} strokeWidth={3} />
              </div>
              <span className="text-3xl font-black tracking-tight text-[#1E1B4B]">Acme HRMS</span>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
              <h2 className="text-4xl font-black text-[#1E1B4B] mb-2 tracking-tight">Sign In</h2>
              <p className="text-[#4F46E5] font-black text-lg">Access your HR dashboard.</p>
            </motion.div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border-[3px] border-red-500 rounded-xl text-red-700 font-bold">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="relative group">
                <label className="block text-sm font-black text-[#1E1B4B] mb-2 uppercase tracking-wide">
                  Email Address
                </label>
                <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'email' ? 'shadow-[6px_6px_0px_#10B981] -translate-y-1 -translate-x-1' : 'shadow-[4px_4px_0px_#E5E7EB]'
                  }`}>
                  <div className={`pl-4 transition-colors ${isFocused === 'email' ? 'text-[#10B981]' : 'text-[#1E1B4B]'}`}>
                    <Mail size={22} strokeWidth={2.5} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    onFocus={() => setIsFocused('email')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full py-4 px-4 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF]"
                    required
                  />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="relative group">
                <div className="mb-2">
                  <label className="block text-sm font-black text-[#1E1B4B] uppercase tracking-wide">
                    Password
                  </label>
                </div>
                <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'password' ? 'shadow-[6px_6px_0px_#F59E0B] -translate-y-1 -translate-x-1' : 'shadow-[4px_4px_0px_#E5E7EB]'
                  }`}>
                  <div className={`pl-4 transition-colors ${isFocused === 'password' ? 'text-[#F59E0B]' : 'text-[#1E1B4B]'}`}>
                    <Lock size={22} strokeWidth={2.5} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onFocus={() => setIsFocused('password')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full py-4 px-4 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`pr-4 transition-colors hover:text-[#F59E0B] ${isFocused === 'password' ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'}`}
                  >
                    {showPassword ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                  </button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center justify-between mt-6">
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center">
                    <input id="remember" type="checkbox" className="peer appearance-none w-7 h-7 border-[3px] border-[#1E1B4B] rounded bg-white checked:bg-[#10B981] cursor-pointer transition-colors shadow-[3px_3px_0px_#1E1B4B]" />
                    <svg className="absolute w-5 h-5 text-[#1E1B4B] opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" stroke="#1E1B4B" strokeWidth="1" />
                    </svg>
                  </div>
                  <label htmlFor="remember" className="ml-3 text-base font-black text-[#1E1B4B] cursor-pointer">
                    Remember me
                  </label>
                </div>

                <a href="#" className="text-sm font-black text-[#3B82F6] hover:text-[#2563EB] transition-colors hover:underline decoration-[3px] underline-offset-4">
                  Forgot Password?
                </a>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 bg-[#EF4444] text-white py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 border-[3px] border-[#1E1B4B] shadow-[8px_8px_0px_#1E1B4B] active:shadow-[0px_0px_0px_#1E1B4B] active:translate-x-[8px] active:translate-y-[8px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                  {!isLoading && <ArrowRight size={24} strokeWidth={3} className="ml-2" />}
                </button>
              </motion.div>

            </form>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-8 text-center">
            <p className="text-[#1E1B4B] font-black">
              Don't have an account?{' '}
              <a href="#" className="text-[#EF4444] font-black hover:text-[#DC2626] transition-colors hover:underline decoration-[3px] underline-offset-4">
                Contact HR Admin
              </a>
            </p>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
};

export default Login;
