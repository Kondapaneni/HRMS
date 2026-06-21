import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  React.useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const backLink = type === 'candidate' ? '/candidate/login' : '/';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/forgot-password', { email });
      setIsSubmitted(true);
      toast.success('Password reset link sent!');
    } catch (err) {
      if (err.response?.status === 429) {
        if (err.response.data?.secondsRemaining) {
          setLockoutSeconds(err.response.data.secondsRemaining);
        }
        setError(err.response.data?.error || 'Too Many Requests. Please Try Again Later.');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to request reset');
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
        <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#10B981] rounded-full opacity-90 top-1/4 -left-12" />
        <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-80 h-80 bg-[#3B82F6] rounded-3xl opacity-90 bottom-1/4 right-0 rotate-12" />

        <div className="relative z-20 text-slate-800 max-w-md px-12 backdrop-blur-md bg-white/60 p-8 rounded-2xl border border-white/40 shadow-xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#10B981] rounded-xl flex items-center justify-center text-white shadow-md">
                <ShieldCheck size={24} strokeWidth={2.5} />
              </div>
              <span className="text-3xl font-black tracking-tight text-slate-900">Account Recovery</span>
            </div>
            <h1 className="text-5xl font-black mb-6 leading-[1.1] tracking-tight text-slate-900">
              Get back to <span className="text-[#10B981]">work</span> quickly.
            </h1>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              Enter your work email address, and we'll send you a secure link to reset your password and regain access to the HRMS portal.
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

            <Link to={backLink} className="inline-flex items-center gap-2 text-slate-500 hover:text-[#1E1B4B] font-bold mb-6 transition-colors">
              <ArrowLeft size={18} strokeWidth={3} />
              Back to Login
            </Link>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
              <h2 className="text-4xl font-black text-[#1E1B4B] mb-2 tracking-tight">Forgot Password?</h2>
              <p className="text-[#4F46E5] font-black text-lg">We'll help you reset it.</p>
            </motion.div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border-[3px] border-red-500 rounded-xl text-red-700 font-bold">
                {error}
              </div>
            )}

            {isSubmitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-6 bg-green-50 border-[3px] border-[#10B981] rounded-xl shadow-[4px_4px_0px_#10B981]">
                <ShieldCheck size={48} className="mx-auto text-[#10B981] mb-4" strokeWidth={2.5} />
                <h3 className="text-2xl font-black text-[#1E1B4B] mb-2">Check your email</h3>
                <p className="text-slate-600 font-medium">We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.</p>
              </motion.div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="relative group">
                  <div className="mb-2">
                    <label className="block text-sm font-black text-[#1E1B4B] uppercase tracking-wide">
                      Email Address
                    </label>
                  </div>
                  <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused ? 'shadow-[6px_6px_0px_#4F46E5] -translate-y-1 -translate-x-1' : 'shadow-[4px_4px_0px_#E5E7EB]'}`}>
                    <div className={`pl-4 transition-colors ${isFocused ? 'text-[#4F46E5]' : 'text-[#1E1B4B]'}`}>
                      <Mail size={22} strokeWidth={2.5} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="work@acme.com"
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className="w-full py-4 px-4 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF]"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <button
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0}
                    className="w-full mt-2 bg-[#10B981] text-white py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 border-[3px] border-[#1E1B4B] shadow-[8px_8px_0px_#1E1B4B] active:shadow-[0px_0px_0px_#1E1B4B] active:translate-x-[8px] active:translate-y-[8px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Sending Link...' : lockoutSeconds > 0 ? `Locked out (${Math.floor(lockoutSeconds / 60)}:${(lockoutSeconds % 60).toString().padStart(2, '0')})` : 'Send Reset Link'}
                    {!isLoading && lockoutSeconds === 0 && <ArrowRight size={24} strokeWidth={3} className="ml-2" />}
                  </button>
                </motion.div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
