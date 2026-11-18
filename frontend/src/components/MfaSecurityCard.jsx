import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  KeyRound, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  Loader2,
  Lock,
  Smartphone
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function MfaSecurityCard() {
  const queryClient = useQueryClient();

  // Dialog & Flow States
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1: QR, 2: Verify, 3: Backup Codes
  const [setupData, setSetupData] = useState(null); // { secret, otpauthUri, email }
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);
  const [hasCopiedCodes, setHasCopiedCodes] = useState(false);

  // Disable Modal State
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Regenerate Backup Codes Modal State
  const [isRegenOpen, setIsRegenOpen] = useState(false);
  const [regenCode, setRegenCode] = useState('');
  const [newRegenCodes, setNewRegenCodes] = useState([]);

  // Fetch MFA Status
  const { data: mfaStatus, isLoading, refetch } = useQuery({
    queryKey: ['mfa', 'status'],
    queryFn: async () => {
      const res = await api.get('/mfa/status');
      return res.data;
    },
  });

  // Start Setup Mutation
  const startSetupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/mfa/setup');
      return res.data;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setSetupStep(1);
      setVerifyCode('');
      setBackupCodes([]);
      setIsSetupOpen(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to start 2FA setup');
    }
  });

  // Confirm Setup Mutation
  const confirmSetupMutation = useMutation({
    mutationFn: async (code) => {
      const res = await api.post('/mfa/confirm', { code });
      return res.data;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      setSetupStep(3);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
      toast.success('Two-factor authentication successfully verified!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Invalid verification code');
    }
  });

  // Regenerate Backup Codes Mutation
  const regenCodesMutation = useMutation({
    mutationFn: async (code) => {
      const res = await api.post('/mfa/backup-codes/regenerate', { code });
      return res.data;
    },
    onSuccess: (data) => {
      setNewRegenCodes(data.backupCodes || []);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
      toast.success('New backup recovery codes generated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to regenerate backup codes');
    }
  });

  // Disable MFA Mutation
  const disableMfaMutation = useMutation({
    mutationFn: async ({ password, code }) => {
      const res = await api.post('/mfa/disable', { password, code });
      return res.data;
    },
    onSuccess: () => {
      setIsDisableOpen(false);
      setDisablePassword('');
      setDisableCode('');
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
      toast.success('Two-factor authentication disabled');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to disable 2FA');
    }
  });

  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setHasCopiedSecret(true);
    toast.success('Secret key copied to clipboard');
    setTimeout(() => setHasCopiedSecret(false), 2500);
  };

  const handleCopyBackupCodes = (codesToCopy) => {
    const list = codesToCopy.length ? codesToCopy : backupCodes;
    if (!list.length) return;
    navigator.clipboard.writeText(list.join('\n'));
    setHasCopiedCodes(true);
    toast.success('Backup codes copied to clipboard');
    setTimeout(() => setHasCopiedCodes(false), 2500);
  };

  const handleDownloadBackupCodes = (codesToDownload) => {
    const list = codesToDownload.length ? codesToDownload : backupCodes;
    if (!list.length) return;
    const content = `ACME HRMS - Emergency 2FA Backup Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\nEach code can be used ONCE if you lose access to your Authenticator app:\n\n${list.join('\n')}\n\nKeep these codes in a secure, confidential place.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acme-hrms-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  // If loading or not authorized by admin, do NOT show to employee!
  if (isLoading || !mfaStatus?.authorized) {
    return null;
  }

  const isEnabled = mfaStatus?.enabled;

  return (
    <>
      {/* Main Security Card */}
      <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6 space-y-5 antialiased font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] shrink-0">
              <ShieldCheck className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--text)] whitespace-nowrap">Two-Factor Authentication (MFA)</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  isEnabled 
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)]'
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                  <span className="whitespace-nowrap">{isEnabled ? 'Active & Enforced' : 'Not Configured'}</span>
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Strengthen workspace security by requiring an Authenticator app (TOTP) code when signing in.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {isEnabled ? (
              <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setRegenCode('');
                    setNewRegenCodes([]);
                    setIsRegenOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  Regenerate Backup Codes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisablePassword('');
                    setDisableCode('');
                    setIsDisableOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  Disable 2FA
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startSetupMutation.mutate()}
                disabled={startSetupMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap shrink-0 active:scale-95"
              >
                {startSetupMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
                ) : (
                  <Smartphone className="w-4.5 h-4.5 shrink-0 text-white stroke-[2.2]" />
                )}
                <span className="whitespace-nowrap">Configure Authenticator</span>
              </button>
            )}
          </div>
        </div>

        {/* Informational Status Banner */}
        {isEnabled ? (
          <div className="p-4 rounded-[18px] bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                  Authenticator App is active on your account
                </p>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  Every sign-in requires your password plus a one-time verification code from Google Authenticator, Microsoft Authenticator, or Authy.
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 px-3 py-1 bg-white/70 dark:bg-black/30 rounded-full border border-emerald-500/20 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                <strong className="font-semibold">{mfaStatus?.remainingBackupCodes ?? 0}</strong> of 8 backup codes remaining
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                <Smartphone className="w-4.5 h-4.5 shrink-0 text-[#2F6B38]" />
                <span className="whitespace-nowrap">Standard TOTP</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                Works with any standard app: Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
              </p>
            </div>
            <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                <Lock className="w-4.5 h-4.5 shrink-0 text-[#2F6B38]" />
                <span className="whitespace-nowrap">Zero Trust Login</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                Prevents unauthorized access even if your password is breached or accidentally exposed.
              </p>
            </div>
            <div className="p-3.5 rounded-[16px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                <KeyRound className="w-4.5 h-4.5 shrink-0 text-[#2F6B38]" />
                <span className="whitespace-nowrap">Emergency Backup</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                Includes 8 single-use recovery codes so you never lose account access if your device is unavailable.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SETUP WIZARD MODAL */}
      <AnimatePresence>
        {isSetupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-[var(--surface)] border border-[var(--line)] rounded-[28px] shadow-2xl p-6 sm:p-7 space-y-5 text-[var(--text)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Setup Two-Factor Authentication</h4>
                    <p className="text-[11px] text-[var(--muted)]">Step {setupStep} of 3</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSetupOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* STEP 1: SCAN QR CODE */}
              {setupStep === 1 && setupData && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold">1. Scan QR code in your Authenticator app</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      Open Google Authenticator, Microsoft Authenticator, or Authy and scan the code below.
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex justify-center py-2">
                    <div className="p-4 bg-white rounded-2xl shadow-md border border-neutral-200">
                      <QRCodeSVG
                        value={setupData.otpauthUri}
                        size={170}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Manual Key Fallback */}
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--line)] space-y-1.5 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--muted)]">Manual Secret Key</span>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer"
                      >
                        {hasCopiedSecret ? <Check size={14} className="shrink-0" /> : <Copy size={14} className="shrink-0" />}
                        <span>{hasCopiedSecret ? 'Copied' : 'Copy key'}</span>
                      </button>
                    </div>
                    <p className="font-sans text-xs sm:text-sm tracking-wider font-semibold break-all text-[var(--text)] select-all leading-relaxed">
                      {setupData.secret}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSetupOpen(false)}
                      className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetupStep(2)}
                      className="px-5 py-2 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                    >
                      Next: Verify Code
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: VERIFY INITIAL CODE */}
              {setupStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold">2. Enter 6-digit confirmation code</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      Type the rotating 6-digit security code currently shown in your Authenticator app.
                    </p>
                  </div>

                  <div className="flex justify-center py-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-48 h-12 text-center font-sans text-xl tracking-[0.35em] font-bold rounded-2xl border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--text)] outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSetupStep(1)}
                      className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      Back to QR Code
                    </button>
                    <button
                      type="button"
                      disabled={verifyCode.length < 6 || confirmSetupMutation.isPending}
                      onClick={() => confirmSetupMutation.mutate(verifyCode)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                    >
                      {confirmSetupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                      <span>Verify &amp; Enable</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: BACKUP CODES */}
              {setupStep === 3 && (
                <div className="space-y-4 font-sans">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold">Save your emergency backup recovery codes!</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Each code can only be used once. If you ever lose your phone or Authenticator app, these codes are the only way to log in without contacting an administrator.
                      </p>
                    </div>
                  </div>

                  {/* Codes Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--line)]">
                    {backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="py-2 px-3 rounded-xl bg-white dark:bg-neutral-800 text-center font-sans text-xs font-semibold tracking-wider text-[var(--text)] border border-[var(--line)] select-all shadow-2xs whitespace-nowrap"
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyBackupCodes(backupCodes)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] transition-all cursor-pointer whitespace-nowrap"
                      >
                        {hasCopiedCodes ? <Check size={14} className="shrink-0" /> : <Copy size={14} className="shrink-0" />}
                        <span>{hasCopiedCodes ? 'Copied' : 'Copy All'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadBackupCodes(backupCodes)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Download size={14} className="shrink-0" />
                        <span>Download .txt</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSetupOpen(false)}
                      className="px-6 py-2 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REGENERATE BACKUP CODES MODAL */}
      <AnimatePresence>
        {isRegenOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-[28px] shadow-2xl p-6 space-y-4 text-[var(--text)]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <h4 className="text-sm font-semibold">Regenerate Emergency Backup Codes</h4>
                <button
                  type="button"
                  onClick={() => setIsRegenOpen(false)}
                  className="p-1 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {!newRegenCodes.length ? (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Generating new backup codes will immediately invalidate all previously issued backup codes.
                    Please enter the 6-digit code from your Authenticator app to authorize this action:
                  </p>

                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      placeholder="6-digit authenticator code"
                      value={regenCode}
                      onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] font-sans text-center tracking-widest text-sm font-semibold text-[var(--text)] outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRegenOpen(false)}
                      className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={regenCode.length < 6 || regenCodesMutation.isPending}
                      onClick={() => regenCodesMutation.mutate(regenCode)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                    >
                      {regenCodesMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Generate New Codes</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  <p className="text-xs font-semibold text-emerald-600">New backup codes generated!</p>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[var(--surface-alt)] border border-[var(--line)]">
                    {newRegenCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="py-1.5 px-2.5 rounded-lg bg-white dark:bg-neutral-800 text-center font-sans text-xs font-semibold tracking-wider text-[var(--text)] border border-[var(--line)] select-all whitespace-nowrap shadow-2xs"
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleCopyBackupCodes(newRegenCodes)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--text)] hover:bg-[var(--line)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Copy size={14} className="shrink-0" />
                      <span>Copy All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegenOpen(false)}
                      className="px-5 py-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISABLE MFA CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDisableOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-[28px] shadow-2xl p-6 space-y-4 text-[var(--text)]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={18} />
                  <h4 className="text-sm font-semibold">Disable Two-Factor Authentication</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDisableOpen(false)}
                  className="p-1 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Turning off two-factor authentication reduces your account security. To confirm, please enter your workspace account password or a 6-digit Authenticator code:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                    Workspace Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>

                <div className="text-center text-[11px] text-[var(--muted)] font-medium">
                  &mdash; OR &mdash;
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                    6-Digit Authenticator Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] font-sans text-xs font-medium text-[var(--text)] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisableOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] transition-all cursor-pointer whitespace-nowrap"
                >
                  Keep 2FA Enabled
                </button>
                <button
                  type="button"
                  disabled={(!disablePassword && !disableCode) || disableMfaMutation.isPending}
                  onClick={() => disableMfaMutation.mutate({ password: disablePassword, code: disableCode })}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                >
                  {disableMfaMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Disable 2FA</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

