import React, { ComponentType, lazy } from 'react';

const executeImport = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retriesLeft: number,
  interval: number
): Promise<{ default: T }> => {
  return factory().catch((error) => {
    console.warn('[WarRoom Offline] دریافت چانک ماژول با خطا مواجه شد، تلاش مجدد...', error);
    if (retriesLeft <= 0) {
      const FallbackComponent: React.FC<any> = () => (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center text-slate-200 dir-rtl">
          <div className="w-14 h-14 mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-white mb-2">دسترسی موقت در حالت آفلاین</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
            این بخش از سامانه هنوز در حافظه محلی دستگاه ذخیره نشده است. به محض اتصال مجدد به شبکه، به‌صورت خودکار همگام و در دسترس قرار خواهد گرفت.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg"
          >
            تلاش مجدد برای بارگذاری
          </button>
        </div>
      );
      return { default: FallbackComponent as unknown as T };
    }

    return new Promise<{ default: T }>((resolve) => {
      setTimeout(() => {
        resolve(executeImport(factory, retriesLeft - 1, interval * 1.5));
      }, interval);
    });
  });
};

/**
 * ایجاد کامپوننت Lazy با قابلیت بازیابی خودکار در شرایط قطعی اینترنت و آفلاین (Offline Chunk Recovery)
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retriesLeft = 2,
  interval = 1000
): React.LazyExoticComponent<T> {
  return lazy(() => executeImport(factory, retriesLeft, interval));
}
