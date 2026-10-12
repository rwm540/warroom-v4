import React, { useState, useEffect } from 'react';
import { Clock, Users, Shield, AlertTriangle, Timer, Zap } from 'lucide-react';
import { formatToPersianDigits } from '../utils/jalali';
import { Group } from '../types';

const GROUP_TIMER_DAYS = 14;
const GROUP_TIMER_SECONDS = GROUP_TIMER_DAYS * 24 * 60 * 60;

interface GroupTimerBarProps {
  currentGroup?: Group;
  groups: Group[];
  isLeader: boolean;
  isGirls?: boolean;
  onTimerStart?: (groupId: string) => void;
  /** فعال‌سازی تایمر (از تنظیمات ادمین) */
  enabled?: boolean;
  /** تعداد روزهای مهلت (از تنظیمات ادمین، پیش‌فرض ۱۴) */
  timerDays?: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

/**
 * پیدا کردن گروه ریشه (گروه اصلی سرگروه) از زنجیره والد-فرزندی
 * زیرگره‌ها تایمر سرگروه خود را می‌بینند
 */
function findRootGroup(group: Group, allGroups: Group[]): Group {
  if (!group.parent_group_id) return group;
  const parent = allGroups.find(g => g.id === group.parent_group_id);
  if (!parent) return group;
  return findRootGroup(parent, allGroups);
}

export default function GroupTimerBar({
  currentGroup,
  groups,
  isLeader,
  isGirls = false,
  onTimerStart,
  enabled = true,
  timerDays,
}: GroupTimerBarProps) {
  const groupTimerDays = timerDays || GROUP_TIMER_DAYS;
  const groupTimerSeconds = groupTimerDays * 24 * 60 * 60;

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const rootGroup = currentGroup ? findRootGroup(currentGroup, groups) : undefined;
  const isSubGroup = currentGroup?.parent_group_id ? true : false;

  useEffect(() => {
    if (!enabled) return;
    if (!rootGroup?.timer_started_at) {
      setTimeLeft(null);
      setIsInitialized(false);
      return;
    }

    setIsInitialized(true);

    const calculate = () => {
      const startTime = new Date(rootGroup.timer_started_at!).getTime();
      const endTime = startTime + groupTimerSeconds * 1000;
      const diff = endTime - Date.now();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ days, hours, minutes, seconds, totalSeconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [rootGroup?.timer_started_at]);

  // شروع خودکار تایمر اگر کاربر سرگروه است و هنوز تایمر شروع نشده
  useEffect(() => {
    if (isLeader && currentGroup && !isSubGroup && !rootGroup?.timer_started_at) {
      onTimerStart?.(currentGroup.id);
    }
  }, [isLeader, currentGroup, isSubGroup, rootGroup?.timer_started_at, onTimerStart]);

  if (!enabled) return null;
  if (!currentGroup || !rootGroup) return null;
  if (!isInitialized && !isLeader) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  // محاسبه درصد پیشرفت زمان
  const progressPercent = timeLeft
    ? Math.max(0, Math.min(100, ((groupTimerSeconds - timeLeft.totalSeconds) / groupTimerSeconds) * 100))
    : 0;

  // ───────────────────────────────────────────────────────────
  //  طراحی کاملاً منطبق با زبان بصری اپ:
  //  HUD bar → bg-[#060c20]/92, rounded-2xl, backdrop-blur-xl
  //  سلول‌ها → bg-[#090e1a]/60, border-slate-800/40, rounded-lg
  //  چالش روزانه → gradient amber/fuchsia, border glow
  //  تایمر → bg-[#0a1630]/90, text-cyan-300, border-cyan-500/35
  // ───────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-md mx-auto mb-2 px-1.5" dir="rtl">

      {/* ── کانتینر اصلی: دقیقاً منطبق با استایل Daily Challenge Banner ── */}
      <div className={`w-full p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 shadow-xl ${
        timeLeft?.isExpired
          ? 'bg-gradient-to-r from-red-950/70 via-[#1a0505] to-slate-900 border-red-500/60 shadow-[0_0_25px_rgba(220,38,38,0.25)]'
          : isGirls
          ? 'bg-gradient-to-r from-fuchsia-950/70 via-[#180a2b] to-slate-900 border-fuchsia-500/60 shadow-[0_0_25px_rgba(236,72,153,0.25)]'
          : 'bg-gradient-to-r from-cyan-950/70 via-[#0a1630] to-slate-900 border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
      }`}>

        <div className="flex items-center justify-between gap-3">

          {/* ── بخش راست: آیکون + عنوان + نام گروه ── */}
          <div className="flex items-center gap-3 min-w-0">

            {/* آیکون — دقیقاً مثل Daily Challenge: w-11 h-11 rounded-xl */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              timeLeft?.isExpired
                ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : isGirls
                ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            }`}>
              {isSubGroup ? <Users size={22} /> : <Timer size={22} className={!timeLeft?.isExpired && timeLeft ? 'animate-pulse' : ''} />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs sm:text-sm font-black text-white truncate`}>
                  مهلت {formatToPersianDigits(groupTimerDays)} روزه جوخه
                </span>
                {isSubGroup && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                    زیرگره
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                {rootGroup.name}{isSubGroup && ' (تایمر سرگروه)'}
              </p>
            </div>
          </div>

          {/* ── بخش چپ: وضعیت + دکمه/badge ── */}
          <div className="flex items-center gap-2 shrink-0">
            {timeLeft?.isExpired ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse shrink-0">
                <AlertTriangle size={12} />
                پایان مهلت
              </span>
            ) : timeLeft ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                <Clock size={12} className="animate-pulse" />
                فعال
              </span>
            ) : null}

            {/* نمایش روز باقی‌مانده — مثل نمایش امتیاز پاداش در Daily Challenge */}
            {timeLeft && !timeLeft.isExpired && (
              <div className="text-left font-mono hidden sm:block">
                <span className={`text-xs sm:text-sm font-black ${isGirls ? 'text-fuchsia-400' : 'text-cyan-400'}`}>
                  {formatToPersianDigits(timeLeft.days)}
                </span>
                <span className="text-[10px] text-slate-400 block">روز باقی‌مانده</span>
              </div>
            )}

            {/* دکمه فلش — مثل Daily Challenge */}
            <div className={`p-2 rounded-xl border transition ${
              timeLeft?.isExpired
                ? 'bg-red-900/40 border-red-600 text-red-300'
                : isGirls
                ? 'bg-fuchsia-500 text-slate-950 border-fuchsia-400 font-black shadow-md'
                : 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
            }`}>
              <Clock size={16} />
            </div>
          </div>

        </div>

        {/* ── نوار پیشرفت زمانی — زیر هدر، منطبق با استایل HUD ── */}
        {timeLeft && (
          <div className="mt-3 space-y-2.5">
            <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  timeLeft.isExpired ? 'bg-red-600' : isGirls ? 'bg-fuchsia-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* ── اعداد تایمر — دقیقاً منطبق با CountdownTimerCard minimal style ── */}
            {timeLeft.isExpired ? (
              <div className="text-center py-1">
                <p className="text-xs font-bold text-red-300">
                  ⏰ مهلت {formatToPersianDigits(groupTimerDays)} روزه این جوخه به پایان رسیده است!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full dir-ltr">
                {[
                  {
                    label: 'روز',
                    val: timeLeft.days,
                    color: isGirls
                      ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/35 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
                      : 'bg-[#0a1630]/90 text-cyan-300 border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  },
                  {
                    label: 'ساعت',
                    val: timeLeft.hours,
                    color: isGirls
                      ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/35 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
                      : 'bg-[#0a1630]/90 text-cyan-300 border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  },
                  {
                    label: 'دقیقه',
                    val: timeLeft.minutes,
                    color: isGirls
                      ? 'bg-purple-950/80 text-purple-300 border-purple-500/35 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-[#071d3a]/90 text-blue-300 border-blue-500/35 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  },
                  {
                    label: 'ثانیه',
                    val: timeLeft.seconds,
                    color: isGirls
                      ? 'bg-pink-950/90 text-pink-200 border-pink-500/50 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                      : 'bg-[#1e1503]/90 text-amber-300 border-amber-500/50 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className={`w-full py-1.5 sm:py-2 rounded-2xl flex items-center justify-center border backdrop-blur-md transition-transform hover:scale-105 ${item.color}`}>
                      <span className="text-base sm:text-lg font-black font-mono tracking-wider">
                        {formatToPersianDigits(pad(item.val))}
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 mt-1">{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── اطلاعات تکمیلی — مثل HUD stats bar ── */}
            {!timeLeft.isExpired && (
              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/50">
                <span>گذشته: {formatToPersianDigits(Math.round(progressPercent))}٪</span>
                <span>باقی‌مانده: {formatToPersianDigits(timeLeft.days)} روز و {formatToPersianDigits(timeLeft.hours)} ساعت</span>
              </div>
            )}
          </div>
        )}

        {/* ── حالت بدون تایمر (هنوز شروع نشده) ── */}
        {!timeLeft && (
          <div className="mt-2 text-center py-1">
            <p className="text-[11px] text-slate-400">
              {isLeader ? '⏳ تایمر در حال آماده‌سازی...' : '⏳ تایمر هنوز توسط سرگروه فعال نشده است'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}