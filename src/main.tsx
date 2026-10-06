import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// ثبت سرویس‌ورکر PWA با بروزرسانی فوری و کش آفلاین پایدار
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.info('[WarRoom PWA] نسخه جدید در دسترس است.');
    },
    onOfflineReady() {
      console.info('[WarRoom PWA] سامانه با موفقیت برای دسترسی ۱۰۰٪ آفلاین آماده شد.');
    },
  });
}

// جلوگیری از خطای بارگذاری قطعات دینامیک در حالت آفلاین
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[WarRoom PWA] ماژول در شبکه در دسترس نیست؛ استفاده از کَش ذخیره‌شده...', event);
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
