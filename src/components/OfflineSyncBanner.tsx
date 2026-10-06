import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle, Cloud, AlertCircle } from 'lucide-react';
import {
  SYNC_STATUS_EVENT,
  OfflineSyncStatus,
  getPendingMutations,
  replayPendingMutations,
} from '../lib/offlineStorage';
import { supabase, normalizeRowForDb, isSupabaseEnabled } from '../lib/supabaseData';

export const OfflineSyncBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    // بروزرسانی اولیه تعداد جهش‌های منتظر
    getPendingMutations().then((list) => setPendingCount(list.length)).catch(() => {});

    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent<OfflineSyncStatus>).detail;
      if (detail) {
        setIsOnline(detail.isOnline);
        setIsSyncing(detail.isSyncing);
        setPendingCount(detail.pendingCount);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      // اجرای بازپخش خودکار
      if (isSupabaseEnabled && supabase) {
        setIsSyncing(true);
        replayPendingMutations(supabase, normalizeRowForDb).then(({ synced }) => {
          setIsSyncing(false);
          if (synced > 0) {
            setJustSynced(true);
            setTimeout(() => setJustSynced(false), 4000);
          }
          getPendingMutations().then((list) => setPendingCount(list.length));
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(SYNC_STATUS_EVENT, handleSyncStatus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, handleSyncStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing || !supabase) return;
    setIsSyncing(true);
    const { synced } = await replayPendingMutations(supabase, normalizeRowForDb);
    setIsSyncing(false);
    if (synced > 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    }
    const list = await getPendingMutations();
    setPendingCount(list.length);
  };

  // اگر آنلاین هستیم و هیچ عملیات معلقی وجود ندارد و به‌تازگی همگام نشده، چیزی نشان نده
  if (isOnline && pendingCount === 0 && !isSyncing && !justSynced) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 pointer-events-auto dir-rtl transition-all">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border text-xs font-medium transition animate-in fade-in slide-in-from-bottom-2 bg-slate-900/90 text-slate-100 border-slate-700/80">
        {!isOnline ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-amber-300">حالت آفلاین فعال است</span>
              <span className="text-[10px] text-slate-400">
                اطلاعات از حافظه محلی لود شده است
                {pendingCount > 0 && ` (${pendingCount} تغییر در صف ارسال)`}
              </span>
            </div>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-cyan-300">در حال همگام‌سازی با پایگاه داده...</span>
              <span className="text-[10px] text-slate-400">{pendingCount} تغییر در حال ارسال به سرور</span>
            </div>
          </>
        ) : justSynced ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-emerald-300">همگام‌سازی با موفقیت انجام شد</span>
              <span className="text-[10px] text-slate-400">تمام تغییرات در سرور ثبت گردید</span>
            </div>
          </>
        ) : (
          <>
            <Cloud className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-slate-200">اتصال برقرار است</span>
              <span className="text-[10px] text-slate-400">{pendingCount} رکورد آماده همگام‌سازی</span>
            </div>
            <button
              onClick={handleManualSync}
              className="mr-1 px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold transition"
            >
              ارسال اکنون
            </button>
          </>
        )}
      </div>
    </div>
  );
};
