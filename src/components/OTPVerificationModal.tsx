import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { resendOtp, verifyOtp } from '../lib/otpApi';
import type { OTPVerifiedUser } from '../lib/otpApi';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: OTPVerifiedUser) => void;
  userPhone: string;
  nationalCode: string;
  challengeToken: string;
  expiresIn: number;
  onChallengeToken: (token: string) => void;
  onExpiresIn: (seconds: number) => void;
  /** Which server-side flow this challenge belongs to (controls resend semantics). */
  purpose?: 'login' | 'registration';
  campaignTheme?: 'girls' | 'boys';
}

function emptyOtpDigits() {
  return Array.from({ length: 6 }, () => '');
}

function normalizeOtpInput(value: string) {
  return value
    .replace(/[^0-9۰-۹٠-٩]/g, '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function hasValidExpiry(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 900;
}

/** OTP challenge modal with six digits and a server-provided expiration. */
export default function OTPVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  userPhone,
  nationalCode,
  challengeToken,
  expiresIn,
  onChallengeToken,
  onExpiresIn,
  purpose = 'registration',
  campaignTheme = 'boys'
}: OTPVerificationModalProps) {
  const [otpDigits, setOtpDigits] = useState<string[]>(emptyOtpDigits);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [activeChallengeToken, setActiveChallengeToken] = useState(challengeToken);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isGirls = campaignTheme === 'girls';
  const otpCode = otpDigits.join('');
  const isOtpComplete = otpDigits.every((digit) => /^\d$/.test(digit));

  useEffect(() => {
    setActiveChallengeToken(challengeToken);
  }, [challengeToken]);

  useEffect(() => {
    if (isOpen) {
      setOtpDigits(emptyOtpDigits());
      setError(null);
      setIsVerifying(false);
      setCanResend(false);
      return;
    }
    setOtpDigits(emptyOtpDigits());
    setError(null);
    setIsVerifying(false);
    setCanResend(false);
  }, [isOpen, challengeToken]);

  useEffect(() => {
    if (!isOpen || !hasValidExpiry(expiresIn)) {
      if (isOpen) {
        setTimeLeft(0);
        setCanResend(true);
      }
      return;
    }

    const deadline = Date.now() + expiresIn * 1000;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      setCanResend(remaining === 0);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [isOpen, challengeToken, expiresIn]);

  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async () => {
    if (!isOtpComplete) {
      setError('کد تأیید باید دقیقاً ۶ رقم باشد.');
      return;
    }
    if (!activeChallengeToken) {
      setError('نشست اعتبارسنجی کد تأیید نامعتبر است؛ لطفاً دوباره کد را ارسال کنید.');
      return;
    }
    if (timeLeft <= 0) {
      setError('کد تأیید منقضی شده است؛ کد تازه‌ای درخواست کنید.');
      return;
    }

    setError(null);
    setIsVerifying(true);
    try {
      const result = await verifyOtp(nationalCode, otpCode, activeChallengeToken);
      if (!result.success) {
        setError(result.error || result.message || 'کد تأیید نامعتبر است.');
        return;
      }
      if (!result.user?.otpProof) {
        setError('پاسخ تأیید سرور ناقص است. دوباره کد را ارسال کنید.');
        return;
      }
      onSuccess(result.user);
    } catch {
      setError('خطا در بررسی کد تأیید. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isResending || isVerifying) return;

    setIsResending(true);
    setError(null);
    try {
      const result = await resendOtp(nationalCode, purpose);
      if (!result.success) {
        setError(result.error || result.message || 'ارسال مجدد کد ناموفق بود.');
        return;
      }
      if (!result.challengeToken || !hasValidExpiry(result.expiresIn)) {
        setError(result.message || 'پاسخ سرور برای کد تازه ناقص است؛ دوباره تلاش کنید.');
        return;
      }

      setActiveChallengeToken(result.challengeToken);
      onChallengeToken(result.challengeToken);
      setOtpDigits(emptyOtpDigits());
      setTimeLeft(result.expiresIn);
      onExpiresIn(result.expiresIn);
      setCanResend(false);
      setError(null);
      inputRefs.current[0]?.focus();
    } catch {
      setError('خطا در ارسال مجدد کد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md rounded-3xl p-8 shadow-2xl ${
            isGirls
              ? 'bg-gradient-to-br from-pink-50 via-purple-50 to-fuchsia-50 border border-pink-200/50'
              : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border border-blue-200/50'
          }`}
        >
          {/* دکمه بستن */}
          <button
            onClick={onClose}
            disabled={isVerifying}
            className={`absolute top-4 right-4 p-2 rounded-full transition-all ${
              isGirls
                ? 'text-pink-400 hover:text-pink-600 hover:bg-pink-100'
                : 'text-blue-400 hover:text-blue-600 hover:bg-blue-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <X size={20} />
          </button>

          {/* آیکون امنیتی */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center ${
              isGirls
                ? 'bg-gradient-to-br from-pink-500 to-purple-500'
                : 'bg-gradient-to-br from-blue-500 to-indigo-500'
            }`}
          >
            <Shield size={40} className="text-white" />
          </motion.div>

          {/* عنوان */}
          <h2 className={`text-2xl font-black text-center mb-2 ${
            isGirls ? 'text-pink-900' : 'text-blue-900'
          }`}>
            تایید کد امنیتی
          </h2>

          <p className={`text-center text-sm mb-6 ${
            isGirls ? 'text-pink-700' : 'text-blue-700'
          }`}>
            کد تأیید ۶ رقمی به شماره <span className="font-bold">{userPhone}</span> ارسال شد
          </p>

          {/* تایمر */}
          <div className={`flex items-center justify-center gap-2 mb-4 p-3 rounded-xl ${
            timeLeft <= 30 
              ? 'bg-red-100 text-red-700' 
              : isGirls 
                ? 'bg-pink-100 text-pink-700'
                : 'bg-blue-100 text-blue-700'
          }`}>
            <Clock size={18} />
            <span className="font-bold">
              زمان باقی‌مانده: {formatTime(timeLeft)}
            </span>
          </div>

          {/* فیلدهای شش‌خانه ورود کد */}
          <div className="mb-6">
            <div className="mx-auto grid w-full max-w-[22rem] grid-cols-6 gap-2" dir="ltr" onPaste={(event) => {
              const pasted = normalizeOtpInput(event.clipboardData.getData('text')).slice(0, 6);
              if (!pasted) return;
              event.preventDefault();

              const focusedIndex = inputRefs.current.indexOf(event.target as HTMLInputElement);
              const startIndex = pasted.length === 6 ? 0 : Math.max(focusedIndex, 0);
              const nextDigits = pasted.length === 6 ? emptyOtpDigits() : [...otpDigits];
              pasted.slice(0, 6 - startIndex).split('').forEach((digit, offset) => {
                nextDigits[startIndex + offset] = digit;
              });
              setOtpDigits(nextDigits);
              setError(null);
              inputRefs.current[Math.min(startIndex + pasted.length, 5)]?.focus();
            }}>
              {Array.from({ length: 6 }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  autoFocus={index === 0}
                  maxLength={index === 0 ? 6 : 1}
                  aria-label={`رقم ${index + 1} کد تأیید`}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'otp-verification-error' : undefined}
                  value={otpDigits[index]}
                  onChange={(event) => {
                    const enteredDigits = normalizeOtpInput(event.currentTarget.value).slice(0, 6 - index);
                    const nextDigits = [...otpDigits];
                    enteredDigits.split('').forEach((digit, offset) => {
                      nextDigits[index + offset] = digit;
                    });
                    if (!enteredDigits) nextDigits[index] = '';
                    setOtpDigits(nextDigits);
                    setError(null);
                    if (enteredDigits) {
                      inputRefs.current[Math.min(index + enteredDigits.length, 5)]?.focus();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace') {
                      event.preventDefault();
                      const nextDigits = [...otpDigits];
                      if (nextDigits[index]) {
                        nextDigits[index] = '';
                        setOtpDigits(nextDigits);
                      } else if (index > 0) {
                        nextDigits[index - 1] = '';
                        setOtpDigits(nextDigits);
                        inputRefs.current[index - 1]?.focus();
                      }
                    } else if (event.key === 'ArrowLeft' && index > 0) {
                      event.preventDefault();
                      inputRefs.current[index - 1]?.focus();
                    } else if (event.key === 'ArrowRight' && index < 5) {
                      event.preventDefault();
                      inputRefs.current[index + 1]?.focus();
                    } else if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleVerifyOTP();
                    }
                  }}
                  disabled={isVerifying || timeLeft === 0}
                  className={`aspect-square w-full min-w-0 rounded-xl border-2 text-center text-2xl font-black transition focus:outline-none focus:ring-4
                    ${error
                      ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-200'
                      : isGirls
                        ? 'border-pink-300 bg-white/70 text-pink-900 focus:border-pink-500 focus:ring-pink-200'
                        : 'border-blue-300 bg-white/70 text-blue-900 focus:border-blue-500 focus:ring-blue-200'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                />
              ))}
            </div>
            {error && (
              <motion.div
                id="otp-verification-error"
                role="alert"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-3 text-red-600 text-sm"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          {/* دکمه تایید */}
          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={!isOtpComplete || isVerifying || timeLeft === 0}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg transition-all transform
              ${(isVerifying || !isOtpComplete || timeLeft === 0)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
              }
              ${isGirls
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
              }
              shadow-lg
            `}
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={20} className="animate-spin" />
                در حال بررسی...
              </span>
            ) : timeLeft === 0 ? (
              'کد منقضی شده است'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle size={20} />
                تایید کد
              </span>
            )}
          </button>

          {/* دکمه ارسال مجدد */}
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend || isResending || isVerifying}
            className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all
              ${canResend && !isResending
                ? isGirls
                  ? 'text-pink-700 hover:bg-pink-100'
                  : 'text-blue-700 hover:bg-blue-100'
                : 'text-gray-400 cursor-not-allowed'
              }
              disabled:opacity-50
            `}
          >
            {isResending ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                در حال ارسال...
              </span>
            ) : canResend ? (
              'ارسال مجدد کد تایید'
            ) : (
              `ارسال مجدد در ${formatTime(timeLeft)}`
            )}
          </button>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
