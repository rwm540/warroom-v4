import React, { useState, useEffect } from 'react';
import { Clock, Flame, Zap, ShieldAlert, Sparkles, Move } from 'lucide-react';
import { formatToPersianDigits, normalizeToEnglishDigits } from '../../utils/jalali';

export interface CountdownTimerCardProps {
  themeMode?: 'girls' | 'boys';
  countdownTitle?: string;
  targetDate?: string;
  countdownString?: string;
  countdownStyle?: 'tactical' | 'compact' | 'neon';
  className?: string;
  removeBorder?: boolean;
  onExpire?: (isExpired: boolean) => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const CountdownTimerCard: React.FC<CountdownTimerCardProps> = ({
  themeMode = 'boys',
  countdownTitle,
  targetDate,
  countdownString,
  countdownStyle = 'tactical',
  className = '',
  removeBorder = true,
  onExpire
}) => {
  const isGirls = themeMode === 'girls';

  // Helper to parse initial seconds from string or target date
  const calculateInitialSeconds = (): number => {
    // 1. If explicit targetDate is provided
    if (targetDate) {
      const targetTime = new Date(targetDate).getTime();
      if (!isNaN(targetTime)) {
        const diff = Math.floor((targetTime - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
      }
    }

    // 2. If countdown string like "02:14:39:15" or "۲:۱۴:۳۹:۱۵" is provided
    if (countdownString) {
      const clean = normalizeToEnglishDigits(countdownString).trim();
      const parts = clean.split(/[:\-\s]/).map(p => parseInt(p, 10));
      if (parts.length === 4 && parts.every(p => !isNaN(p))) {
        // days:hours:mins:secs
        return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
      }
      if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        // hours:mins:secs
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    // 3. Default fallback: 2 days, 14 hours, 39 minutes, 15 seconds (225555 seconds)
    return 2 * 86400 + 14 * 3600 + 39 * 60 + 15;
  };

  const [totalSecondsLeft, setTotalSecondsLeft] = useState<number>(calculateInitialSeconds);

  // Recalculate when props change
  useEffect(() => {
    const sec = calculateInitialSeconds();
    setTotalSecondsLeft(sec);
    if (sec <= 0 && onExpire) {
      onExpire(true);
    } else if (sec > 0 && onExpire) {
      onExpire(false);
    }
  }, [targetDate, countdownString]);

  // Live ticking timer
  useEffect(() => {
    if (totalSecondsLeft <= 0) {
      onExpire?.(true);
      return;
    }

    const interval = setInterval(() => {
      setTotalSecondsLeft(prev => {
        if (prev <= 1) {
          onExpire?.(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSecondsLeft, onExpire]);

  // Derive breakdown
  const getTimeBreakdown = (totalSec: number): TimeRemaining => {
    if (totalSec <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { days, hours, minutes, seconds, isExpired: false };
  };

  const time = getTimeBreakdown(totalSecondsLeft);
  const pad = (n: number) => n.toString().padStart(2, '0');

  // =========================================================================
  // STYLE 2: COMPACT SLIM STRIP (نوار فشرده مینیمال - کاملاً بدون پس‌زمینه و بردر)
  // =========================================================================
  if (countdownStyle === 'compact') {
    return (
      <div 
        className={`w-full relative overflow-hidden bg-transparent border-0 border-transparent outline-none ring-0 shadow-none px-2 py-1.5 ${className}`}
        dir="rtl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className={`animate-spin ${isGirls ? 'text-fuchsia-400' : 'text-cyan-400'}`} style={{ animationDuration: '6s' }} />
            <span className="text-xs sm:text-sm font-black text-white">
              {countdownTitle || 'مهلت رویداد اتاق جنگ:'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 dir-ltr">
            {/* Days */}
            <div className={`px-2 py-1 rounded-lg font-mono font-black text-xs sm:text-sm ${
              isGirls ? 'bg-fuchsia-950/90 text-fuchsia-300' : 'bg-cyan-950/90 text-cyan-300'
            }`}>
              {formatToPersianDigits(pad(time.days))} <span className="text-[10px] text-slate-400">روز</span>
            </div>
            <span className="font-bold text-slate-500">:</span>
            {/* Hours */}
            <div className={`px-2 py-1 rounded-lg font-mono font-black text-xs sm:text-sm ${
              isGirls ? 'bg-fuchsia-950/90 text-fuchsia-300' : 'bg-cyan-950/90 text-cyan-300'
            }`}>
              {formatToPersianDigits(pad(time.hours))} <span className="text-[10px] text-slate-400">ساعت</span>
            </div>
            <span className="font-bold text-slate-500">:</span>
            {/* Minutes */}
            <div className={`px-2 py-1 rounded-lg font-mono font-black text-xs sm:text-sm ${
              isGirls ? 'bg-fuchsia-950/90 text-fuchsia-300' : 'bg-cyan-950/90 text-cyan-300'
            }`}>
              {formatToPersianDigits(pad(time.minutes))} <span className="text-[10px] text-slate-400">دقیقه</span>
            </div>
            <span className="font-bold text-slate-500">:</span>
            {/* Seconds */}
            <div className={`px-2 py-1 rounded-lg font-mono font-black text-xs sm:text-sm animate-pulse ${
              isGirls ? 'bg-pink-900/80 text-pink-200' : 'bg-amber-900/80 text-amber-200'
            }`}>
              {formatToPersianDigits(pad(time.seconds))} <span className="text-[10px] text-slate-300">ثانیه</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STYLE 3: CYBER NEON GLOW (نئونی سایبرپانکی - کاملاً بدون بک‌گراند)
  // =========================================================================
  if (countdownStyle === 'neon') {
    return (
      <div 
        className={`w-full relative overflow-hidden bg-transparent border-0 border-transparent outline-none ring-0 shadow-none p-1 sm:p-2 ${className}`}
        dir="rtl"
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className={`animate-bounce ${isGirls ? 'text-fuchsia-400' : 'text-cyan-400'}`} />
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
              {countdownTitle || 'مهلت ثبت‌نام و آغاز رویداد بزرگ اتاق جنگ'}
            </h3>
            <Zap size={16} className={`animate-bounce ${isGirls ? 'text-fuchsia-400' : 'text-cyan-400'}`} />
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3.5 w-full max-w-md mx-auto dir-ltr">
            {[
              { label: 'روز', val: time.days, color: isGirls ? 'bg-fuchsia-950/70 text-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'bg-cyan-950/70 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]' },
              { label: 'ساعت', val: time.hours, color: isGirls ? 'bg-pink-950/70 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'bg-blue-950/70 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]' },
              { label: 'دقیقه', val: time.minutes, color: isGirls ? 'bg-purple-950/70 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-indigo-950/70 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)]' },
              { label: 'ثانیه', val: time.seconds, color: isGirls ? 'bg-rose-950/80 text-rose-200 animate-pulse shadow-[0_0_25px_rgba(244,63,94,0.4)]' : 'bg-amber-950/80 text-amber-200 animate-pulse shadow-[0_0_25px_rgba(245,158,11,0.4)]' },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`w-full aspect-[4/3] rounded-2xl flex items-center justify-center border-0 border-transparent ${item.color}`}>
                  <span className="text-xl sm:text-2xl md:text-3xl font-black font-mono">
                    {formatToPersianDigits(pad(item.val))}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-black text-slate-300 mt-1.5">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Flame size={13} className={isGirls ? 'text-pink-400' : 'text-amber-400'} />
            <span>زمان باقی‌مانده تا شروع فاز ارزیابی و چالش‌های سرنوشت‌ساز</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STYLE 1: DEFAULT TACTICAL GLASS (کاملاً بدون بک‌گراند و بردر)
  // =========================================================================
  return (
    <div 
      className={`w-full relative overflow-hidden bg-transparent border-0 border-transparent outline-none ring-0 shadow-none p-1 sm:p-2 transition-all duration-300 ${className}`}
      dir="rtl"
    >
      <div className="relative z-10 flex flex-col items-center text-center space-y-3.5">
        
        {/* Header Tag & Title */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border-0 ${
            isGirls
              ? 'bg-fuchsia-950/80 text-fuchsia-300'
              : 'bg-cyan-950/80 text-cyan-300'
          }`}>
            <Clock size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
            <span>شمارش معکوس رویداد و مأموریت‌ها</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide mt-0.5">
            {countdownTitle || 'مهلت ثبت‌نام و آغاز رویداد بزرگ اتاق جنگ'}
          </h3>
        </div>

        {/* Tactical Digit Boxes (روز : ساعت : دقیقه : ثانیه) - شیک و کاملاً بدون کادر و پس‌زمینه محفظه */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3.5 w-full max-w-md mx-auto dir-ltr">
          
          {/* 1. DAYS (روز) */}
          <div className="flex flex-col items-center">
            <div className={`w-full aspect-[4/3] rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden transition-transform duration-300 hover:scale-105 border-0 border-transparent ${
              isGirls
                ? 'bg-gradient-to-b from-[#2a0b32] to-[#14041a] shadow-[0_0_20px_rgba(236,72,153,0.25)]'
                : 'bg-gradient-to-b from-[#0b1c3e] to-[#040c1d] shadow-[0_0_20px_rgba(6,182,212,0.25)]'
            }`}>
              <span className={`text-xl sm:text-2xl md:text-3xl font-black font-mono tracking-wider drop-shadow ${
                isGirls ? 'text-fuchsia-300' : 'text-cyan-300'
              }`}>
                {formatToPersianDigits(pad(time.days))}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-300 mt-1.5">روز</span>
          </div>

          {/* 2. HOURS (ساعت) */}
          <div className="flex flex-col items-center">
            <div className={`w-full aspect-[4/3] rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden transition-transform duration-300 hover:scale-105 border-0 border-transparent ${
              isGirls
                ? 'bg-gradient-to-b from-[#2a0b32] to-[#14041a] shadow-[0_0_20px_rgba(236,72,153,0.25)]'
                : 'bg-gradient-to-b from-[#0b1c3e] to-[#040c1d] shadow-[0_0_20px_rgba(6,182,212,0.25)]'
            }`}>
              <span className={`text-xl sm:text-2xl md:text-3xl font-black font-mono tracking-wider drop-shadow ${
                isGirls ? 'text-fuchsia-300' : 'text-cyan-300'
              }`}>
                {formatToPersianDigits(pad(time.hours))}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-300 mt-1.5">ساعت</span>
          </div>

          {/* 3. MINUTES (دقیقه) */}
          <div className="flex flex-col items-center">
            <div className={`w-full aspect-[4/3] rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden transition-transform duration-300 hover:scale-105 border-0 border-transparent ${
              isGirls
                ? 'bg-gradient-to-b from-[#2a0b32] to-[#14041a] shadow-[0_0_20px_rgba(236,72,153,0.25)]'
                : 'bg-gradient-to-b from-[#0b1c3e] to-[#040c1d] shadow-[0_0_20px_rgba(6,182,212,0.25)]'
            }`}>
              <span className={`text-xl sm:text-2xl md:text-3xl font-black font-mono tracking-wider drop-shadow ${
                isGirls ? 'text-fuchsia-300' : 'text-cyan-300'
              }`}>
                {formatToPersianDigits(pad(time.minutes))}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-300 mt-1.5">دقیقه</span>
          </div>

          {/* 4. SECONDS (ثانیه) */}
          <div className="flex flex-col items-center">
            <div className={`w-full aspect-[4/3] rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden transition-transform duration-300 hover:scale-105 border-0 border-transparent ${
              isGirls
                ? 'bg-gradient-to-b from-pink-900/80 to-[#14041a] shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-b from-cyan-900/80 to-[#040c1d] shadow-[0_0_25px_rgba(34,211,238,0.4)]'
            }`}>
              <span className={`text-xl sm:text-2xl md:text-3xl font-black font-mono tracking-wider drop-shadow animate-pulse ${
                isGirls ? 'text-pink-300' : 'text-amber-300'
              }`}>
                {formatToPersianDigits(pad(time.seconds))}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-300 mt-1.5">ثانیه</span>
          </div>

        </div>

        {/* Motivational status note */}
        <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-400 pt-0.5">
          <Flame size={14} className={isGirls ? 'text-fuchsia-400' : 'text-amber-400'} />
          <span>پس از پایان مهلت، مراحل داوری و ورود به مرحله دوم آغاز خواهد شد.</span>
        </div>

      </div>
    </div>
  );
};

export default CountdownTimerCard;
