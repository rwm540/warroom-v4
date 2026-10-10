import { QueryClient } from '@tanstack/react-query';

/**
 * ⚡ پیکربندی بهینه React Query برای مدیریت کش درخواست‌های Supabase
 * - جلوگیری از درخواست‌های تکراری و همزمان (Request Deduplication)
 * - کش هوشمند داده‌ها در حافظه برای ۵ دقیقه (Stale Time)
 * - عدم ارسال درخواست مکرر هنگام فوکوس مجدد پنجره (refetchOnWindowFocus: false)
 * - نگهداری کش به مدت ۳۰ دقیقه در حافظه (Garbage Collection Time)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // ۵ دقیقه تازگی داده‌ها بدون درخواست مجدد به سرور
      gcTime: 1000 * 60 * 30, // ۳۰ دقیقه ماندگاری در حافظه رم
      refetchOnWindowFocus: false, // جلوگیری از ارسال درخواست با هر بار جابجایی تب
      refetchOnReconnect: true, // به‌روزرسانی هوشمند هنگام وصل مجدد اینترنت
      refetchOnMount: false, // استفاده از داده‌های موجود در کش به جای درخواست مجدد
      retry: 1, // حداکثر ۱ بار تلاش مجدد در صورت خطای شبکه
    },
  },
});
