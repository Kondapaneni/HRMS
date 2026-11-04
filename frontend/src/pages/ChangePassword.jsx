import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { profile, fetchProfile, signOut } = useAuth();

  const ADMIN_ROLES = ['admin'];

  const passwordRequirements = [
    { id: 'length', text: 'At least 8 characters', regex: /.{8,}/ },
    { id: 'uppercase', text: 'One uppercase letter', regex: /[A-Z]/ },
    { id: 'lowercase', text: 'One lowercase letter', regex: /[a-z]/ },
    { id: 'number', text: 'One number', regex: /[0-9]/ },
    { id: 'special', text: 'One special character', regex: /[^A-Za-z0-9]/ },
  ];

  const calculateStrength = (pass) => {
    let score = 0;
    passwordRequirements.forEach((req) => {
      if (req.regex.test(pass)) score++;
    });
    return score;
  };

  const strengthScore = calculateStrength(newPassword);

  const getStrengthBarColor = (score) => {
    if (score <= 2) return 'bg-[#D64550]';
    if (score <= 4) return 'bg-[#B7791F]';
    return 'bg-[#1F9D55]';
  };

  const isPasswordValid = strengthScore === passwordRequirements.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
      await api.put('/change-password', { newPassword });
      await fetchProfile();
      toast.success('Password updated successfully!');

      if (profile && ADMIN_ROLES.includes(profile.role)) {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--bg)] text-[var(--text)] font-sans antialiased p-4 sm:p-6 md:p-8 selection:bg-[var(--brand-tint)] selection:text-[var(--text)]">
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-[480px] bg-[var(--surface)] rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_24px_60px_rgba(19,19,21,0.08)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--ink)] text-white flex items-center justify-center font-semibold text-lg">
                A
              </div>
              <div>
                <div className="text-xl font-medium tracking-tight text-[var(--text)]">
                  Acme <span className="text-[var(--brand-deep)]">HRMS</span>
                </div>
                <div className="text-[11px] text-[var(--muted)]">Mandatory Security Update</div>
              </div>
            </div>

            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="p-2 text-[var(--muted)] hover:text-[#D64550] transition-colors rounded-full hover:bg-[var(--surface-alt)]"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-medium text-[var(--text)] tracking-tight">
              Update your password
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              For security compliance, please set a new strong password before continuing to your workspace.
            </p>
          </div>

          {/* Error alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mb-5 p-3.5 bg-[#FDE8EA] text-[#D64550] rounded-[12px] flex items-start gap-2.5 text-xs font-medium"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="relative">
              <input
                id="change-newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder=" "
                required
                autoComplete="new-password"
                className="peer w-full h-11 pl-3.5 pr-10 pt-4 pb-1 text-xs text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              />
              <label
                htmlFor="change-newPassword"
                className="absolute left-3.5 top-1 text-[11px] text-[var(--muted)] pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-[var(--muted)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-[var(--brand-deep)] font-normal"
              >
                New password
              </label>
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                id="change-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder=" "
                required
                autoComplete="new-password"
                className="peer w-full h-11 pl-3.5 pr-10 pt-4 pb-1 text-xs text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              />
              <label
                htmlFor="change-confirmPassword"
                className="absolute left-3.5 top-1 text-[11px] text-[var(--muted)] pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:text-[var(--muted)] peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-[var(--brand-deep)] font-normal"
              >
                Confirm new password
              </label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password Strength Checklist */}
            {newPassword.length > 0 && (
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
                    const passed = req.regex.test(newPassword);
                    return (
                      <div key={req.id} className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                            passed ? 'bg-[#E6F6EC] text-[#1F9D55]' : 'bg-[var(--line)] text-[var(--muted)]'
                          }`}
                        >
                          ✓
                        </span>
                        <span className={passed ? 'text-[var(--text)] font-medium' : 'text-[var(--muted)]'}>
                          {req.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !isPasswordValid}
              loading={isLoading}
              className="w-full h-11 rounded-[12px] font-medium text-xs justify-center"
            >
              Update and continue to workspace
            </Button>
          </form>

          {/* Footer security note */}
          <div className="mt-8 pt-4 border-t border-[var(--line)] flex items-center justify-center gap-2 text-[11px] text-[var(--muted)]">
            <ShieldCheck size={14} className="text-[#1F9D55]" />
            <span>Secure zero-knowledge credential exchange</span>
          </div>
        </motion.div>
      </div>

      <footer className="mt-6 text-center text-xs text-[var(--muted)]">
        Acme HRMS &bull; Designed &amp; developed by Gowtham Chowdary Kondapaneni
      </footer>
    </div>
  );
};

export default ChangePassword;
