import React, { useState } from 'react';
import { ShieldCheck, KeyRound, RefreshCw, X } from 'lucide-react';
import type { User } from '../types';
import {
  clearAdminOtpProof,
  completeAdminOtpVerification,
  hasAdminOtpProof,
  requestAdminOtpChallenge,
} from '../lib/backendApi';

interface AdminOtpGateProps {
  currentUser: User;
  triggerAlert: (msg: string) => void;
}

/**
 * Fresh one-time admin OTP gate.
 *
 * Destructive administrative operations (blocking users, resetting passwords, revoking other
 * users' sessions, resolving reset requests) demand a single-use proof bound to the exact
 * operation. The proof is acquired here and kept in memory only - never in Web Storage.
 */
export default function AdminOtpGate({ currentUser, triggerAlert }: AdminOtpGateProps) {
  const [verified, setVerified] = useState<boolean>(() => hasAdminOtpProof());
  const [challengeToken, setChallengeToken] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const nationalCode = String(currentUser?.national_code || '').replace(/\D/g, '');

  const handleRequest = async () => {
    setError(null);
    setIsBusy(true);
    const result = await requestAdminOtpChallenge();
    setIsBusy(false);
    if (!result.ok || !result.data) {
      const message = result.error?.message || 'ارسال کد تأیید مدیریتی ناموفق بود.';
      setError(message);
      triggerAlert(message);
      return;
    }
    setChallengeToken(result.data.challengeToken);
    setMaskedPhone(result.data.maskedPhone || '');
    triggerAlert(result.data.maskedPhone
      ? `کد تأیید مدیریتی به شماره ${result.data.maskedPhone} ارسال شد.`
      : 'کد تأیید مدیریتی ارسال شد.');
  };

  const handleVerify = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))) {
      setError('کد تأیید باید ۶ رقم باشد.');
      return;
    }
    setIsBusy(true);
    const result = await completeAdminOtpVerification({ nationalCode, code, challengeToken });
    setIsBusy(false);
    if (!result.ok) {
      setError(result.error?.message || 'تأیید کد مدیریتی ناموفق بود.');
      return;
    }
    setVerified(true);
    setChallengeToken('');
    setCode('');
    triggerAlert('تأیید مدیریتی فعال شد؛ عملیات حساس تا چند دقیقه مجاز است.');
  };

  const handleClear = () => {
    clearAdminOtpProof();
    setVerified(false);
    setChallengeToken('');
    setCode('');
    setError(null);
  };

  if (verified) {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-100">
        <span className="flex items-center gap-1.5 font-bold">
          <ShieldCheck size={14} className="text-emerald-400" />
          تأیید OTP مدیر فعال است (فقط در همین نشست)
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 font-bold transition"
        >
          <X size={12} />
          پایان
        </button>
      </div>
    );
  }

  return (
    <div className="p-2.5 rounded-2xl bg-[#080d21] border border-slate-800 text-[11px] text-slate-200 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-bold">
          <KeyRound size={14} className="text-amber-400" />
          عملیات حساس نیازمند تأیید OTP تازه است
        </span>
        {!challengeToken && (
          <button
            type="button"
            onClick={handleRequest}
            disabled={isBusy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-black transition disabled:opacity-50"
          >
            {isBusy ? <RefreshCw size={12} className="animate-spin" /> : <KeyRound size={12} />}
            دریافت کد
          </button>
        )}
      </div>

      {challengeToken && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => { setCode(event.currentTarget.value.replace(/[^0-9۰-۹]/g, '')); setError(null); }}
            placeholder={maskedPhone ? `کد ۶ رقمی ارسال‌شده به ${maskedPhone}` : 'کد ۶ رقمی'}
            className="flex-1 min-w-[10rem] px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-center tracking-widest focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={isBusy}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black transition disabled:opacity-50"
          >
            تأیید کد
          </button>
          <button
            type="button"
            onClick={handleRequest}
            disabled={isBusy}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition disabled:opacity-50"
          >
            ارسال دوباره
          </button>
        </div>
      )}

      {error && <p className="text-rose-300 leading-relaxed">{error}</p>}
    </div>
  );
}
