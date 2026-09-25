import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Clock, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Award, 
  HelpCircle, 
  Sparkles,
  ArrowLeft,
  Share2,
  Calendar,
  Timer
} from 'lucide-react';
import { formatToPersianDigits } from '../utils/jalali';
import { playTacticalSound } from '../utils/epicBgmEngine';
import { DailyChallengeConfig } from '../types';

interface DailyChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerAlert: (msg: string) => void;
  onAwardPoints?: (points: number) => void;
  dailyChallengeConfig?: DailyChallengeConfig | null;
}

export default function DailyChallengeModal({
  isOpen,
  onClose,
  triggerAlert,
  onAwardPoints,
  dailyChallengeConfig
}: DailyChallengeModalProps) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `warroom_daily_challenge_${todayKey}`;

  const [isCompletedToday, setIsCompletedToday] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const [streakCount, setStreakCount] = useState<number>(() => {
    const saved = localStorage.getItem('warroom_daily_streak');
    return saved ? parseInt(saved, 10) : 3;
  });

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // 10-second active quiz timer
  const [tenSecLeft, setTenSecLeft] = useState<number>(10);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Derive active question data from config or local storage or null
  const config = dailyChallengeConfig || (() => {
    try {
      const saved = localStorage.getItem('warroom_daily_challenge_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  })();

  const activeTitle = config?.title || 'چالش تاکتیکی روزانه';
  const activePoints = config?.pointsReward ?? 150;
  const activeScenario = config?.questionText || config?.question || config?.description || '';
  const rawOptions = config?.options || [];
  const correctOptionIdx = config?.correctOptionIndex ?? 0;
  const timerDuration = config?.timeLimitSeconds && config.timeLimitSeconds >= 5 && config.timeLimitSeconds <= 600 
    ? config.timeLimitSeconds 
    : 10;

  // Notify global app layout to hide bottom navigation menu while modal is open
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: true } }));
      return () => {
        window.dispatchEvent(new CustomEvent('warroom_modal_active_change', { detail: { active: false } }));
      };
    }
  }, [isOpen]);

  // Start timer when modal opens
  useEffect(() => {
    if (isOpen && !isCompletedToday && !hasSubmitted) {
      setTenSecLeft(timerDuration);
      setIsTimerRunning(true);
      setSelectedOption(null);
    } else {
      setIsTimerRunning(false);
    }
  }, [isOpen, isCompletedToday, hasSubmitted, timerDuration]);

  // Countdown interval
  useEffect(() => {
    if (!isTimerRunning) return;
    if (tenSecLeft <= 0) {
      setIsTimerRunning(false);
      setHasSubmitted(true);
      setIsCorrect(false);
      playTacticalSound('click');
      triggerAlert(`مهلت ${formatToPersianDigits(timerDuration)} ثانیه‌ای پاسخگویی به چالش به پایان رسید!`);
      return;
    }
    const timer = setInterval(() => {
      setTenSecLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, tenSecLeft, timerDuration, triggerAlert]);

  // Midnight countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setTimeLeft(`${formatToPersianDigits(pad(hours))}:${formatToPersianDigits(pad(minutes))}:${formatToPersianDigits(pad(seconds))}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const handleSubmitAnswer = () => {
    if (selectedOption === null) {
      triggerAlert('لطفاً یکی از گزینه‌ها را انتخاب کنید.');
      return;
    }

    setIsTimerRunning(false);
    const correct = selectedOption === correctOptionIdx;

    setHasSubmitted(true);
    setIsCorrect(correct);

    if (correct) {
      playTacticalSound('win');
      setIsCompletedToday(true);
      localStorage.setItem(storageKey, 'true');

      const newStreak = streakCount + 1;
      setStreakCount(newStreak);
      localStorage.setItem('warroom_daily_streak', newStreak.toString());

      if (onAwardPoints) {
        onAwardPoints(activePoints);
      }
      triggerAlert(`آفرین رزمنده! پاسخ صحیح بود. +${formatToPersianDigits(activePoints)} امتیاز به کارنامه شما اضافه گردید.`);
    } else {
      playTacticalSound('click');
      const penalty = Math.max(1, config?.wrongAnswerPenalty && config.wrongAnswerPenalty > 0 ? config.wrongAnswerPenalty : 20);
      if (onAwardPoints) {
        onAwardPoints(-penalty);
      }
      triggerAlert(`پاسخ نادرست است! ⚠️ ${formatToPersianDigits(penalty)}- امتیاز نمره منفی کسر گردید.`);
    }
  };

  const handleResetForRetry = () => {
    setHasSubmitted(false);
    setSelectedOption(null);
    setTenSecLeft(timerDuration);
    setIsTimerRunning(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-lg bg-[#070d1e] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-white text-right dir-rtl overflow-hidden"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-28 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Flame size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  چالش تاکتیکی روزانه
                </h3>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  فرصت ویژه
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                فرصت ویژه افزایش امتیاز و ثبت زنجیره افتخار
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 10-Second Active Countdown Bar */}
        {!isCompletedToday && !hasSubmitted && (
          <div className="mt-3 bg-amber-950/80 border border-amber-500/60 p-2.5 rounded-2xl flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center justify-between text-xs font-black text-amber-300">
              <span className="flex items-center gap-1.5">
                <Timer size={16} className="text-amber-400 animate-spin" />
                <span>زمان پاسخگویی سریع (زمان محدود):</span>
              </span>
              <span className="text-sm font-mono font-black text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40">
                {formatToPersianDigits(tenSecLeft)} ثانیه
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-amber-500/30">
              <div 
                className={`h-full transition-all duration-1000 ${
                  tenSecLeft <= 3 ? 'bg-rose-500' : tenSecLeft <= (timerDuration / 2) ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (tenSecLeft / timerDuration) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats strip: Countdown timer & Streak */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          <div className="bg-slate-900/80 border border-slate-800/90 p-2.5 rounded-2xl flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock size={13} className="text-amber-400" />
              مهلت چالش امروز:
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {timeLeft}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/90 p-2.5 rounded-2xl flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Flame size={13} className="text-rose-400" />
              زنجیره متوالی:
            </span>
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
              <span>{formatToPersianDigits(streakCount)}</span>
              <span>روز</span>
              <span>🔥</span>
            </span>
          </div>
        </div>

        {/* Main Content Body */}
        {!config ? (
          <div className="py-12 text-center space-y-3">
            <Flame size={36} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-bold text-slate-300">در حال حاضر چالش روزانه‌ای فعال نیست</h4>
            <p className="text-xs text-slate-500">چالش‌های جدید به محض تعریف در دیتابیس مرکزی در این بخش قرار می‌گیرند.</p>
          </div>
        ) : isCompletedToday ? (
          /* COMPLETED STATE */
          <div className="py-4 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-emerald-400">
                چالش امروز با پیروزی تکمیل شد!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                امتیاز <strong className="text-amber-300 font-mono">+{formatToPersianDigits(activePoints)}</strong> به حساب شما واریز شد و زنجیره رزمندگی شما تداوم یافت.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3 rounded-2xl transition shadow-lg cursor-pointer"
              >
                بازگشت به نقشه مراحل بازی
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTION FORM */
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/60 border border-amber-500/30 p-3.5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs sm:text-sm text-amber-300">
                  {activeTitle}
                </h4>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30 font-mono">
                  +{formatToPersianDigits(activePoints)} امتیاز
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {activeScenario}
              </p>
            </div>

            {/* Options List */}
            <div className="space-y-2">
              {rawOptions.map((optText: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption = idx === correctOptionIdx;
                let optionStyle = 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-slate-700';

                if (hasSubmitted) {
                  if (isCorrectOption) {
                    optionStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200';
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle = 'bg-rose-950/60 border-rose-500 text-rose-200';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-amber-500/15 border-amber-500/80 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => !hasSubmitted && setSelectedOption(idx)}
                    className={`p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer select-none text-xs leading-relaxed ${optionStyle}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5 border ${
                      isSelected ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold' : 'border-slate-700 text-slate-400'
                    }`}>
                      {formatToPersianDigits(idx + 1)}
                    </div>
                    <span className="flex-1">{optText}</span>
                  </div>
                );
              })}
            </div>

            {/* Error Message & Retry */}
            {hasSubmitted && !isCorrect && (
              <div className="bg-rose-950/60 border border-rose-800/80 p-3 rounded-2xl text-xs text-rose-300 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={15} />
                  <span>پاسخ شما نادرست بود یا زمان ۱۰ ثانیه به پایان رسید!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  نگران نباشید، می‌توانید دوباره تلاش کرده و گزینه درست را انتخاب کنید.
                </p>
                <button
                  onClick={handleResetForRetry}
                  className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  تلاش مجدد (۱۰ ثانیه)
                </button>
              </div>
            )}

            {/* Action Buttons */}
            {!hasSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className={`w-full py-3 rounded-2xl font-black text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                  selectedOption !== null
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Zap size={16} />
                <span>ثبت پاسخ نهایی و دریافت {formatToPersianDigits(activePoints)} امتیاز</span>
              </button>
            ) : null}
          </div>
        )}
      </motion.div>
    </div>
  );
}
