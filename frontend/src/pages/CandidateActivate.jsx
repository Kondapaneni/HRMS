import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Activating Account...</h2>
            <p className="text-slate-300">Please wait while we verify your details.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Account Activated!</h2>
            <p className="text-emerald-200 mb-6">{message}</p>
            <Link 
              to="/candidate/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Activation Failed</h2>
            <p className="text-red-200 mb-6">{message}</p>
            <Link 
              to="/candidate/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline underline-offset-4"
            >
              Return to Login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CandidateActivate;
