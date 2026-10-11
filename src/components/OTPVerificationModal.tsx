import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { verifyOtp, resendOtp } from '../lib/otpApi';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  userPhone: string;
  nationalCode: string;
  challengeToken?: string;
  onChallengeToken?: (token: string) => void;
  campaignTheme?: 'girls' | 'boys';
}

/**
 * کامپوننت تایید کد OTP
 * با تایمر 120 ثانیه و ارسال مجدد
 */
export default function OTPVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  userPhone,
  nationalCode,
  challengeToken = '',
  onChallengeToken,
  campaignTheme = 'boys'
}: OTPVerificationModalProps) {
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 180 ثانیه (3 دقیقه برای کد ۶ رقمی)
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [activeChallengeToken, setActiveChallengeToken] = useState(challengeToken);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isGirls = campaignTheme === 'girls';

  useEffect(() => {
    setActiveChallengeToken(challengeToken);
  }, [challengeToken]);

  // تایمر شمارش معکوس
  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(120);
      setCanResend(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // فرمت زمان به دقیقه:ثانیه
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * تایید کد OTP
   */
  const handleVerifyOTP = async () => {
    setError(null);
    setIsVerifying(true);

    const cleanCode = otpCode.trim();

    // بررسی طول کد
    if (cleanCode.length !== 6) {
      setError('کد تایید باید ۶ رقم باشد');
      setIsVerifying(false);
      return;
    }

    if (!activeChallengeToken) {
      setError('نشست اعتبارسنجی کد تایید نامعتبر است؛ لطفاً دوباره کد را ارسال کنید.');
      setIsVerifying(false);
      return;
    }

    try {
      const result = await verifyOtp(nationalCode, cleanCode, activeChallengeToken);

      if (!result.success) {
        setError(result.error || result.message || 'کد تایید نامعتبر است.');
        setIsVerifying(false);
        return;
      }

      const token = result.accessToken || result.token || '';
      const user = result.user || {};

      if (token || user) {
        onSuccess(token, user);
      } else {
        setError('خطا در دریافت اطلاعات کاربر');
      }
      
      setIsVerifying(false);
    } catch (err) {
      console.error('خطا در اعتبارسنجی OTP:', err);
      setError('خطا در بررسی کد تایید. لطفاً دوباره تلاش کنید');
      setIsVerifying(false);
    }
  };

  /**
   * ارسال مجدد کد
   */
  const handleResendOTP = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await resendOtp(nationalCode);

      if (result.success) {
        const nextToken = result.challengeToken || '';
        if (nextToken) {
          setActiveChallengeToken(nextToken);
          onChallengeToken?.(nextToken);
        }
        setOtpCode('');
        setTimeLeft(120);
        setCanResend(false);
        setError(null);
      } else {
        setError(result.error || 'خطا در ارسال مجدد');
      }
    } catch (err) {
      setError('خطا در ارسال مجدد کد');
    } finally {
      setIsResending(false);
    }
  };

  // ریست کردن state هنگام بستن
  useEffect(() => {
    if (!isOpen) {
      setOtpCode('');
      setError(null);
      setIsVerifying(false);
      setTimeLeft(120);
      setCanResend(false);
    }
  }, [isOpen]);

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
            کد تایید ۴ رقمی به شماره <span className="font-bold">{userPhone}</span> ارسال شد
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

          {/* فیلدهای چهارخانه ورود کد */}
          <div className="mb-6">
            <div className="flex justify-center gap-3" dir="ltr" onPaste={(event) => {
              const pasted = event.clipboardData.getData('text').replace(/[^0-9۰-۹٠-٩]/g, '')
                .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
                .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
                .slice(0, 4);
              if (!pasted) return;
              event.preventDefault();
              setOtpCode(pasted);
              setError(null);
              inputRefs.current[Math.min(pasted.length, 5)]?.focus();
            }}>
              {Array.from({ length: 6 }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  autoFocus={index === 0}
                  maxLength={1}
                  aria-label={`رقم ${index + 1} کد تایید`}
                  value={otpCode[index] || ''}
                  onChange={(event) => {
                    const digit = event.target.value.replace(/[^0-9۰-۹٠-٩]/g, '')
                      .replace(/[۰-۹]/g, value => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(value)))
                      .replace(/[٠-٩]/g, value => String('٠١٢٣٤٥٦٧٨٩'.indexOf(value)))
                      .slice(-1);
                    const nextCode = otpCode.padEnd(4, ' ').split('');
                    nextCode[index] = digit;
                    setOtpCode(nextCode.join('').replace(/\s/g, ''));
                    setError(null);
                    if (digit && index < 3) inputRefs.current[index + 1]?.focus();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && !otpCode[index] && index > 0) {
                      inputRefs.current[index - 1]?.focus();
                    }
                    if (event.key === 'Enter' && otpCode.length === 6) handleVerifyOTP();
                  }}
                  disabled={isVerifying || timeLeft === 0}
                  className={`h-14 w-14 rounded-xl border-2 text-center text-2xl font-black transition focus:outline-none focus:ring-4
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
            onClick={handleVerifyOTP}
            disabled={otpCode.length !== 6 || isVerifying || timeLeft === 0}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg transition-all transform
              ${(isVerifying || otpCode.length !== 6 || timeLeft === 0)
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

          {/* نمایش در محیط توسعه */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 rounded-xl bg-yellow-100 border border-yellow-300"
            >
              <p className="text-xs text-yellow-800 text-center">
                <strong>توجه (فقط در محیط توسعه):</strong>
                <br />
                کد تایید به شماره {userPhone} ارسال شد
                <br />
                کد ملی: {nationalCode}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
