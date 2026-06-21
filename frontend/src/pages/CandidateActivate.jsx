import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Briefcase, ArrowRight } from 'lucide-react';
import api from '../api/axios';

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

const bgShapeVariants = {
  animate: (i) => ({
    y: [0, -15, 0],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 4 + i,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.2
    }
  })
};

const CandidateActivate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const activateAccount = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid activation link. No token provided.');
        return;
      }

      try {
        const res = await api.post('/candidate/activate', { token });
        setStatus('success');
        setMessage(res.data.message || 'Account activated successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Failed to activate account. The link may have expired.');
      }
    };

    activateAccount();
  }, [token]);

  return (
    <div className="min-h-screen flex w-full bg-[#f8f9fa] overflow-hidden selection:bg-[#4F46E5] selection:text-white font-['Inter',sans-serif]">

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
          <motion.div custom={1} variants={bgShapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-10 -top-20 -right-20" />
          <motion.div custom={2} variants={bgShapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#10B981] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12" />
          <motion.div custom={3} variants={bgShapeVariants} animate="animate" className="absolute w-96 h-96 bg-[#3B82F6] rounded-full opacity-5 top-1/2 left-1/3" />
          <motion.div custom={4} variants={bgShapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#EC4899] rounded-xl opacity-10 top-20 left-10 -rotate-12" />
          <motion.div custom={5} variants={bgShapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#8B5CF6] rounded-full opacity-10 bottom-20 right-1/4" />
          
          <motion.div custom={6} variants={bgShapeVariants} animate="animate" className="hidden md:block absolute w-40 h-40 bg-[#14B8A6] rounded-2xl opacity-10 top-[-20px] left-[18rem] rotate-45" />
          <motion.div custom={7} variants={bgShapeVariants} animate="animate" className="hidden md:block absolute w-28 h-28 bg-[#F43F5E] rounded-3xl opacity-10 top-32 left-[24rem] -rotate-12" />
          <motion.div custom={8} variants={bgShapeVariants} animate="animate" className="hidden md:block absolute w-56 h-56 bg-[#6366F1] rounded-full opacity-[0.06] top-10 left-[35%]" />
          
          <motion.div custom={9} variants={bgShapeVariants} animate="animate" className="hidden md:block absolute w-36 h-36 bg-[#EAB308] rounded-2xl opacity-10 bottom-10 right-10 -rotate-12" />
          <motion.div custom={10} variants={bgShapeVariants} animate="animate" className="hidden md:block absolute w-24 h-24 bg-[#06B6D4] rounded-full opacity-10 bottom-40 right-28 rotate-45" />
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

            <div className="flex flex-col items-center text-center mt-2">
              {status === 'loading' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
                  <Loader2 className="w-16 h-16 text-[#3B82F6] animate-spin mb-6" strokeWidth={3} />
                  <h2 className="text-3xl font-black text-[#1E1B4B] mb-2 tracking-tight">Activating...</h2>
                  <p className="text-[#6B7280] font-bold text-sm sm:text-base">Please wait while we verify your details.</p>
                </motion.div>
              )}

              {status === 'success' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full">
                  <div className="bg-[#D1FAE5] rounded-full p-4 border-[3px] border-[#10B981] mb-6 shadow-[4px_4px_0px_#10B981]">
                    <CheckCircle2 className="w-12 h-12 text-[#047857]" strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl font-black text-[#1E1B4B] mb-2 tracking-tight">Activated!</h2>
                  <p className="text-[#10B981] font-bold text-sm sm:text-base mb-8">{message}</p>
                  <Link 
                    to="/candidate/login"
                    className="w-full bg-[#10B981] text-white py-3 px-6 rounded-xl font-black text-lg flex items-center justify-center gap-2 border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] hover:shadow-[6px_6px_0px_#1E1B4B] active:shadow-[0px_0px_0px_#1E1B4B] active:translate-x-[4px] active:translate-y-[4px] transition-all group"
                  >
                    Go to Login
                    <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full">
                  <div className="bg-red-100 rounded-full p-4 border-[3px] border-[#EF4444] mb-6 shadow-[4px_4px_0px_#EF4444]">
                    <XCircle className="w-12 h-12 text-[#B91C1C]" strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl font-black text-[#1E1B4B] mb-2 tracking-tight">Failed</h2>
                  <p className="text-[#EF4444] font-bold text-sm sm:text-base mb-8">{message}</p>
                  <Link 
                    to="/candidate/login"
                    className="text-[#3B82F6] hover:text-[#2563EB] font-black transition-colors hover:underline decoration-[2px] underline-offset-4 text-sm uppercase tracking-wide"
                  >
                    Return to Login
                  </Link>
                </motion.div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CandidateActivate;
