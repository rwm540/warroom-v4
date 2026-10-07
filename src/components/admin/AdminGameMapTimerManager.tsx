import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Save, Sparkles, Check, AlertCircle, ShieldAlert, Zap, Timer, RefreshCw } from 'lucide-react';
import { SiteSettings } from '../../types';
import { formatToPersianDigits, normalizeToEnglishDigits } from '../../utils/jalali';
import { CountdownTimerCard } from '../home/CountdownTimerCard';

interface AdminGameMapTimerManagerProps {
  siteSettings: SiteSettings;
  setSiteSettings: (settings: any) => void;
  triggerAlert: (msg: string) => void;
}

export const AdminGameMapTimerManager: React.FC<AdminGameMapTimerManagerProps> = ({
  siteSettings,
  setSiteSettings,
  triggerAlert
}) => {
  // Local state synced with siteSettings
  const [timerDeadline, setTimerDeadline] = useState<string>(
    siteSettings?.gameMapTimerDeadline || siteSettings?.countdownTargetDate || '2026-11-01T23:59:59Z'
  );
  const [heroCountdown, setHeroCountdown] = useState<string>(
    siteSettings?.heroCountdown || '۰۲:۱۴:۳۹:۱۵'
  );
  const [showCountdownTimer, setShowCountdownTimer] = useState<boolean>(
    siteSettings?.showCountdownTimer !== false
  );
  const [isSaving, setIsSaving] = useState(false);

  // Live countdown breakdown calculation in JavaScript
  const [calculatedSecLeft, setCalculatedSecLeft] = useState<number>(0);

  useEffect(() => {
    if (!timerDeadline) {
      setCalculatedSecLeft(0);
      return;
    }
    const target = new Date(timerDeadline).getTime();
    if (isNaN(target)) {
      setCalculatedSecLeft(0);
      return;
    }
    const diff = Math.floor((target - Date.now()) / 1000);
    setCalculatedSecLeft(diff > 0 ? diff : 0);
  }, [timerDeadline]);

  // Live JS ticking timer for preview
  useEffect(() => {
    if (calculatedSecLeft <= 0) return;
    const interval = setInterval(() => {
      setCalculatedSecLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [calculatedSecLeft]);

  // Quick preset helper to add days/hours to current deadline or now
  const applyPresetTime = (daysToAdd: number) => {
    const baseTime = Date.now();
    const futureTime = new Date(baseTime + daysToAdd * 86400 * 1000);
    const isoStr = futureTime.toISOString();
    setTimerDeadline(isoStr);
    
    // Also format countdown string as DD:HH:MM:SS
    const d = String(daysToAdd).padStart(2, '0');
    setHeroCountdown(`${d}:00:00:00`);
    triggerAlert(`مهلت مسابقه به میزان ${formatToPersianDigits(daysToAdd)} روز تمدید شد.`);
  };

  const handleSaveTimerSettings = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...siteSettings,
        gameMapTimerDeadline: timerDeadline,
        countdownTargetDate: timerDeadline,
        heroCountdown: heroCountdown.trim(),
        showCountdownTimer: showCountdownTimer,
        updatedAt: new Date().toISOString()
      };

      // Save to parent state and localStorage
      setSiteSettings(updatedSettings);
      localStorage.setItem('warroom_site_settings', JSON.stringify(updatedSettings));

      // Attempt Supabase save
      try {
        const { supabase } = await import('../../lib/supabaseData');
        if (supabase) {
          await supabase
            .from('warroom_site_settings')
            .upsert({ id: 'main_settings', data: updatedSettings, updated_at: new Date().toISOString() });
        }
      } catch (err) {
        console.warn('Supabase timer update warning:', err);
      }

      triggerAlert('⏰ تنظیمات تایمر و مهلت مسابقه با موفقیت در سیستم ذخیره گردید.');
    } catch (err) {
      triggerAlert('خطا در ذخیره تنظیمات تایمر!');
    } finally {
      setIsSaving(false);
    }
  };

  // Convert ISO date string to datetime-local value (YYYY-MM-DDTHH:MM) for HTML input
  const formatIsoToInput = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    try {
      const d = new Date(val);
      setTimerDeadline(d.toISOString());
    } catch (err) {
      // ignore invalid input
    }
  };

  return (
    <div className="space-y-6 dir-rtl font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-[#0a1630] to-[#080d21] border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Clock size={16} className="text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>سیستم زمان‌بندی و شمارش معکوس اتاق جنگ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              مدیریت تایمر مراحل و نقشه بازی
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              در این بخش می‌توانید مهلت زمانی پایانی مسابقه (DeadLine) را مشخص فرمایید. این زمان در بالای نقشه بازی به صورت زنده (محاسبه در کلاینت) نمایش داده می‌شود. پس از انقضای تایمر، صعود به مراحل بعدی مسدود می‌شود.
            </p>
          </div>

          <button
            onClick={handleSaveTimerSettings}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-95 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Save size={18} />
            <span>{isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات تایمر'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Form Controls */}
        <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Timer className="text-amber-400" size={20} />
            <h3 className="text-sm font-black text-white">تنظیم تاریخ و زمان انقضای نقشه</h3>
          </div>

          {/* Show Timer Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="space-y-0.5">
              <label className="text-xs font-black text-white block">نمایش تایمر در بالای نقشه بازی</label>
              <p className="text-[11px] text-slate-400">نمایش نوار شمارش معکوس زنده برای کلیه رزمندگان</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCountdownTimer(!showCountdownTimer)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                showCountdownTimer ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                showCountdownTimer ? 'translate-x-1' : 'translate-x-6'
              }`} />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-400" />
              <span>تاریخ و ساعت دقیق مهلت پایانی مسابقه (ISO / Datetime)</span>
            </label>
            <input
              type="datetime-local"
              value={formatIsoToInput(timerDeadline)}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-white font-mono dir-ltr"
            />
            <p className="text-[11px] text-slate-400">
              مقدار فعلی ذخیره‌شده: <span className="font-mono text-amber-300">{timerDeadline}</span>
            </p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 block">تمدید سریع مهلت مسابقه:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPresetTime(1)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-bold transition cursor-pointer"
              >
                + ۱ روز
              </button>
              <button
                type="button"
                onClick={() => applyPresetTime(3)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-bold transition cursor-pointer"
              >
                + ۳ روز
              </button>
              <button
                type="button"
                onClick={() => applyPresetTime(7)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-bold transition cursor-pointer"
              >
                + ۷ روز (۱ هفته)
              </button>
              <button
                type="button"
                onClick={() => applyPresetTime(30)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-bold transition cursor-pointer"
              >
                + ۳۰ روز (۱ ماه)
              </button>
            </div>
          </div>

          {/* Hero Countdown text string input */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-black text-slate-300 block">
              فرمت نمایشی شمارش معکوس (روز:ساعت:دقیقه:ثانیه)
            </label>
            <input
              type="text"
              value={heroCountdown}
              onChange={(e) => setHeroCountdown(e.target.value)}
              placeholder="مثال: ۰۲:۱۴:۳۹:۱۵"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-2.5 text-xs text-white font-mono"
            />
          </div>

        </div>

        {/* Right Column: Live JS Preview */}
        <div className="bg-[#080d21] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400 animate-pulse" size={18} />
                <h3 className="text-sm font-black text-white">پیش‌نمایش زنده تایمر (محاسبه در کلاینت JS)</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2.5 py-1 rounded-full">
                بدون ریکوئست زنده سرور
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              تایمر در لایه کلاینت به‌صورت خودکار هر ثانیه کاهش می‌یابد بدون آنکه فشار اضافی روی دیتابیس یا سرور ایجاد نماید.
            </p>

            {/* Live Component Preview */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/20 my-2 space-y-3">
              <span className="text-[10px] text-slate-400 font-bold block text-center">ظاهر تایمر در بالای نقشه بازی:</span>
              <CountdownTimerCard
                themeMode="boys"
                targetDate={timerDeadline}
                countdownString={heroCountdown}
                countdownStyle="minimal"
                removeBorder={true}
              />
            </div>

            {/* Time Breakdown Cards */}
            <div className="grid grid-cols-4 gap-2 text-center dir-ltr">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <span className="text-lg font-black font-mono text-cyan-400 block">
                  {formatToPersianDigits(Math.floor(calculatedSecLeft / 86400))}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">روز باقی‌مانده</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <span className="text-lg font-black font-mono text-blue-400 block">
                  {formatToPersianDigits(Math.floor((calculatedSecLeft % 86400) / 3600))}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">ساعت</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <span className="text-lg font-black font-mono text-purple-400 block">
                  {formatToPersianDigits(Math.floor((calculatedSecLeft % 3600) / 60))}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">دقیقه</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <span className="text-lg font-black font-mono text-amber-400 block animate-pulse">
                  {formatToPersianDigits(calculatedSecLeft % 60)}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">ثانیه</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2.5">
            <ShieldAlert size={18} className="shrink-0 text-amber-400" />
            <span>با انقضای مهلت مسابقه، دکمه ورود به مراحل جدید غیرفعال می‌گردد ولی دسترسی به مراحل تکمیل شده و نقشه حفظ خواهد شد.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminGameMapTimerManager;
