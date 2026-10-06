import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // در صورت نصب بودن اپلیکیشن در حالت Standalone، دکمه مخفی می‌شود
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  if (installSuccess) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>اپلیکیشن نصب شد</span>
      </div>
    );
  }

  // نصب در اندروید، کروم، و دسکتاپ
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        title="نصب اپلیکیشن روی دستگاه برای دسترسی سریع و آفلاین"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md hover:shadow-cyan-500/25 transition active:scale-95 ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>نصب اپلیکیشن</span>
      </button>
    );
  }

  // راهنمای نصب برای آیفون و آیپد (Safari iOS)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="نصب نسخه آیفون / آیپد"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>نصب در iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 dir-rtl text-right">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/30 p-5 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">نصب اتاق جنگ در iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="flex items-start gap-2.5 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px]">۱</span>
                  <p>در نوار پایین مرورگر سافاری (Safari)، دکمه اشتراک‌گذاری <strong>Share (آیکون مربع با فلش بالا)</strong> را لمس کنید.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px]">۲</span>
                  <p>صفحه را به پایین بکشید و گزینه <strong>Add to Home Screen (افزودن به صفحه اصلی)</strong> را انتخاب کنید.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px]">۳</span>
                  <p>در بالای صفحه روی <strong>Add</strong> بزنید. اکنون آیکون اتاق جنگ مانند یک اپ اصلی روی صفحه گوشی شما قرار دارد!</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
