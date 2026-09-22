/**
 * 🛡️ مودال «تغییر اجباری رمز عبور»
 * ---------------------------------------------------------------
 * زمانی نمایش داده می‌شود که مدیر با رمز پیش‌فرض/موقت وارد شده باشد
 * (must_change_password). تا تغییر رمز، سرور عملیات حساس مدیریتی را
 * با کد PASSWORD_CHANGE_REQUIRED مسدود می‌کند.
 */
import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, AlertTriangle, Eye, EyeOff, LogOut } from 'lucide-react';
import { apiChangePassword } from '../lib/backendApi';

interface ForcePasswordChangeModalProps {
  /** نام نمایشی کاربر */
  userName: string;
  /** آیا رمز فعلی، رمز پیش‌فرض سامانه است؟ */
  isDefault?: boolean;
  /** پس از تغییر موفق رمز اجرا می‌شود (معمولاً خروج و ورود مجدد) */
  onChanged: () => void;
  /** خروج از حساب */
  onLogout: () => void;
}

const passwordProblems = (password: string, isAdmin: boolean): string[] => {
  const min = isAdmin ? 10 : 8;
  const problems: string[] = [];
  if (password.length < min) problems.push(`حداقل ${min} کاراکتر`);
  if (!/[A-Za-z]/.test(password)) problems.push('حداقل یک حرف لاتین');
  if (!/\d/.test(password)) problems.push('حداقل یک رقم');
  if (/\s/.test(password)) problems.push('بدون فاصله');
  return problems;
};

export default function ForcePasswordChangeModal({
  userName,
  isDefault = true,
  onChanged,
  onLogout
}: ForcePasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword) {
      setError('رمز فعلی و رمز جدید الزامی است.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('تکرار رمز جدید با رمز جدید یکسان نیست.');
      return;
    }
    const problems = passwordProblems(newPassword, true);
    if (problems.length) {
      setError(`رمز جدید باید دارای این ویژگی‌ها باشد: ${problems.join('، ')}.`);
      return;
    }
    if (newPassword === currentPassword) {
      setError('رمز جدید باید با رمز فعلی متفاوت باشد.');
      return;
    }

    setIsSubmitting(true);
    const result = await apiChangePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error?.message || 'تغییر رمز ناموفق بود.');
      return;
    }

    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl">
      <div className="bg-[#0b1226] border border-amber-500/50 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 text-white shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <KeyRound size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">تغییر اجباری رمز عبور</h3>
            <p className="text-[10px] text-amber-300/90">
              {isDefault
                ? 'شما با رمز پیش‌فرض سامانه وارد شده‌اید.'
                : 'رمز عبور شما موقت است و باید تغییر کند.'}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-[10px] text-amber-100 leading-relaxed flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
          <span>
            به دلایل امنیتی، استفاده از رمز پیش‌فرض/موقت در سامانه مجاز نیست. تا زمانی که رمز عبور خود را
            تغییر ندهید، عملیات مدیریتی و دسترسی به بخش‌های حساس مسدود می‌ماند.
          </span>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-500/60 text-rose-200 text-[11px] leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-300 block">رمز عبور فعلی ({userName})</label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full py-2.5 px-3 pr-9 pl-9 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-400 text-left"
                placeholder="رمز فعلی"
              />
              <Lock size={15} className="absolute right-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300 block">رمز عبور جدید</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-400 text-left"
              placeholder="حداقل ۱۰ کاراکتر شامل حرف و رقم"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300 block">تکرار رمز عبور جدید</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-400 text-left"
              placeholder="تکرار رمز جدید"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
          >
            {showPasswords ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{showPasswords ? 'مخفی کردن رمزها' : 'نمایش رمزها'}</span>
          </button>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[9px] text-slate-400 leading-relaxed flex items-start gap-2">
            <ShieldCheck size={13} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>
              رمز شما با الگوریتم scrypt و Salt یکتا روی سرور هش می‌شود و هرگز به‌صورت متن ساده ذخیره یا
              نمایش داده نمی‌شود. پس از تغییر، نشست‌های قبلی باطل می‌شوند.
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs transition"
            >
              {isSubmitting ? 'در حال ثبت...' : 'تغییر رمز عبور و ادامه'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              <LogOut size={13} />
              <span>خروج</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
