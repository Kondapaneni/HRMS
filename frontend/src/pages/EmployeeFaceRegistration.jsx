import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import FastFaceScanner from '../components/FastFaceScanner';
import { Camera, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const EmployeeFaceRegistration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error

  const handleFaceDetected = async (descriptor) => {
    setIsScanning(false);
    setStatus('processing');
    
    try {
      // Format descriptor array as string for pgvector '[1,2,3...]'
      const vectorString = `[${descriptor.join(',')}]`;
      
      await api.post('/employee/biometrics/face', {
        faceDescriptor: vectorString
      });

      setStatus('success');
      toast.success('Face registered successfully!');
      
      setTimeout(() => navigate('/employee'), 2000);
      
    } catch (err) {
      console.error(err);
      setStatus('error');
      toast.error('Failed to save face data.');
    }
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
    <div className="min-h-screen flex items-center justify-center w-full bg-[#f8f9fa] overflow-hidden relative p-4 selection:bg-[#4F46E5] selection:text-white">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div custom={1} variants={shapeVariants} animate="animate" className="absolute w-64 h-64 bg-[#F59E0B] rounded-full opacity-10 -top-20 -right-20" />
        <motion.div custom={2} variants={shapeVariants} animate="animate" className="absolute w-48 h-48 bg-[#10B981] rounded-3xl opacity-10 bottom-[-40px] left-1/4 rotate-12" />
        <motion.div custom={3} variants={shapeVariants} animate="animate" className="absolute w-96 h-96 bg-[#3B82F6] rounded-full opacity-5 top-1/2 left-1/3" />
        <motion.div custom={4} variants={shapeVariants} animate="animate" className="absolute w-32 h-32 bg-[#EC4899] rounded-xl opacity-10 top-20 left-10 -rotate-12" />
        <motion.div custom={5} variants={shapeVariants} animate="animate" className="absolute w-72 h-72 bg-[#8B5CF6] rounded-full opacity-10 bottom-20 right-1/4" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, type: "spring", bounce: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white border-[3px] border-[#1E1B4B] shadow-[12px_12px_0px_#1E1B4B] rounded-2xl p-8 sm:p-10 relative overflow-visible">
          
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#F59E0B] rounded-full border-[3px] border-[#1E1B4B] shadow-[4px_4px_0px_#1E1B4B] z-20 flex items-center justify-center text-[#1E1B4B] animate-[bounce_3s_infinite]">
            <Camera size={28} strokeWidth={2.5} />
          </div>

          <div className="mb-8 text-center mt-2">
            <h2 className="text-3xl font-black text-[#1E1B4B] mb-2 tracking-tight leading-tight">Biometric<br/>Registration</h2>
            <p className="text-[#4F46E5] font-black text-sm">Register your face for lightning-fast logins.</p>
          </div>

          <div className="bg-blue-50 border-[2px] border-blue-200 rounded-xl p-4 mb-8 flex gap-3 text-blue-800 shadow-[4px_4px_0px_#BFDBFE]">
            <AlertCircle className="shrink-0 mt-0.5" size={20} strokeWidth={2.5} />
            <div className="text-xs leading-relaxed font-semibold">
              <strong>Privacy Notice:</strong> By scanning, you consent to generating a mathematical representation of your face for identity verification only. We do not store raw photos.
            </div>
          </div>

          {status === 'success' ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center justify-center py-8 text-[#10B981]">
              <CheckCircle size={80} className="mb-4 drop-shadow-md" strokeWidth={2.5} />
              <h3 className="text-xl font-black text-[#1E1B4B]">Registration Complete</h3>
              <p className="text-slate-500 mt-2 font-bold text-sm">Redirecting to dashboard...</p>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center">
              {!isScanning ? (
                <button
                  onClick={() => setIsScanning(true)}
                  className="w-full bg-[#10B981] text-white py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 border-[3px] border-[#1E1B4B] shadow-[8px_8px_0px_#1E1B4B] active:shadow-[0px_0px_0px_#1E1B4B] active:translate-x-[8px] active:translate-y-[8px] transition-all"
                >
                  Start Scanning
                  <Camera size={24} strokeWidth={3} className="ml-1" />
                </button>
              ) : (
                <div className="w-full">
                  <div className="border-[3px] border-[#1E1B4B] rounded-xl overflow-hidden shadow-[8px_8px_0px_#1E1B4B] bg-black relative">
                    <FastFaceScanner 
                      isScanning={isScanning} 
                      onFaceDetected={handleFaceDetected}
                      onCancel={() => setIsScanning(false)}
                    />
                  </div>
                  <p className="text-center text-slate-500 font-bold text-sm mt-6">
                    Look directly at the camera.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EmployeeFaceRegistration;
