import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [isFocused, setIsFocused] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No reset token provided. Please use the link from your email.');
    }
  }, [token]);

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

  const strengthScore = calculateStrength(newPassword);
  
  const getStrengthColor = () => {
    if (strengthScore <= 2) return 'bg-[#EF4444]'; // Red
    if (strengthScore <= 4) return 'bg-[#F59E0B]'; // Yellow
    return 'bg-[#10B981]'; // Green
  };

  const isPasswordValid = strengthScore === passwordRequirements.length;

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

    if (!token) {
      setError('Invalid reset token.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet all security requirements');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/reset-password', { token, newPassword });
      toast.success('Password successfully reset! You can now log in.');
      setIsSubmitted(true);
    } catch (err) {
      if (err.response?.status === 429) return;
      setError(err.response?.data?.error || err.message || 'Failed to reset password');
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
        
        <div className="relative z-20 text-slate-800 max-w-md px-12 backdrop-blur-md bg-white/60 p-8 rounded-2xl border border-white/40 shadow-xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#F59E0B] rounded-xl flex items-center justify-center text-white shadow-md">
                <ShieldCheck size={24} strokeWidth={2.5} />
              </div>
              <span className="text-3xl font-black tracking-tight text-slate-900">Secure Recovery</span>
            </div>
            <h1 className="text-5xl font-black mb-6 leading-[1.1] tracking-tight text-slate-900">
              Create a <span className="text-[#F59E0B]">new password</span>.
            </h1>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              Please enter a strong, unique password that you haven't used before. Make sure it meets all the security requirements.
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
          className="w-full max-w-md relative z-10 mb-20 sm:mb-28 lg:mb-0"
        >
          <div className="bg-white border-[3px] border-[#1E1B4B] rounded-2xl p-8 sm:p-10 relative overflow-visible">

            <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#10B981] rounded-full border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] z-20 animate-[bounce_3s_infinite]" />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8 text-center">
              <h2 className="text-4xl font-black text-[#1E1B4B] mb-2 tracking-tight">Reset Password</h2>
              <p className="text-[#F59E0B] font-black text-lg">Enter your new credentials below.</p>
            </motion.div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border-[3px] border-red-500 rounded-xl text-red-700 font-bold">
                {error}
              </div>
            )}

            {isSubmitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-6 bg-green-50 border-[3px] border-[#10B981] rounded-xl shadow-[4px_4px_0px_#10B981]">
                <ShieldCheck size={48} className="mx-auto text-[#10B981] mb-4" strokeWidth={2.5} />
                <h3 className="text-2xl font-black text-[#1E1B4B] mb-2">Password Reset Complete</h3>
                <p className="text-slate-600 font-medium">Your new password is now ready to use.</p>
              </motion.div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="relative group">
                <div className="mb-2">
                  <label className="block text-sm font-black text-[#1E1B4B] uppercase tracking-wide">
                    New Password
                  </label>
                </div>
                <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'newPassword' ? 'shadow-[6px_6px_0px_#10B981] -translate-y-1 -translate-x-1' : 'shadow-[4px_4px_0px_#E5E7EB]'}`}>
                  <div className={`pl-4 transition-colors ${isFocused === 'newPassword' ? 'text-[#10B981]' : 'text-[#1E1B4B]'}`}>
                    <Lock size={22} strokeWidth={2.5} />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    onFocus={() => setIsFocused('newPassword')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full py-4 px-4 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF]"
                    required
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`pr-4 transition-colors hover:text-[#10B981] ${isFocused === 'newPassword' ? 'text-[#10B981]' : 'text-[#9CA3AF]'}`}
                  >
                    {showNewPassword ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && !isPasswordValid && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                    <div className="flex gap-2 mb-2 h-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div 
                          key={level} 
                          className={`flex-1 rounded-full transition-all duration-300 ${strengthScore >= level ? getStrengthColor() : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {passwordRequirements.map((req) => (
                        <div key={req.id} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-colors ${req.regex.test(newPassword) ? 'border-[#10B981] bg-[#10B981]' : 'border-slate-300'}`}>
                            {req.regex.test(newPassword) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className={`text-xs font-bold transition-colors ${req.regex.test(newPassword) ? 'text-[#10B981]' : 'text-slate-500'}`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="relative group">
                <div className="mb-2">
                  <label className="block text-sm font-black text-[#1E1B4B] uppercase tracking-wide">
                    Confirm Password
                  </label>
                </div>
                <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden border-[3px] border-[#1E1B4B] bg-white ${isFocused === 'confirmPassword' ? 'shadow-[6px_6px_0px_#F59E0B] -translate-y-1 -translate-x-1' : 'shadow-[4px_4px_0px_#E5E7EB]'}`}>
                  <div className={`pl-4 transition-colors ${isFocused === 'confirmPassword' ? 'text-[#F59E0B]' : 'text-[#1E1B4B]'}`}>
                    <Lock size={22} strokeWidth={2.5} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    onFocus={() => setIsFocused('confirmPassword')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full py-4 px-4 bg-transparent outline-none text-[#1E1B4B] font-bold placeholder:font-bold placeholder:text-[#9CA3AF]"
                    required
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`pr-4 transition-colors hover:text-[#F59E0B] ${isFocused === 'confirmPassword' ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'}`}
                  >
                    {showConfirmPassword ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                  </button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid || !confirmPassword || newPassword !== confirmPassword || !token}
                  className="w-full mt-6 bg-[#F59E0B] text-[#1E1B4B] py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 border-[3px] border-[#1E1B4B] shadow-[8px_8px_0px_#1E1B4B] active:shadow-[0px_0px_0px_#1E1B4B] active:translate-x-[8px] active:translate-y-[8px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                  {!isLoading && <ArrowRight size={24} strokeWidth={3} className="ml-2" />}
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

export default ResetPassword;
