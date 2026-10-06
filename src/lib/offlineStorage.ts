/**
 * سامانه جامع ذخیره‌سازی آفلاین و صف جهش‌ها (IndexedDB + Offline Mutation Queue)
 * پلتفرم اتاق جنگ — Offline First Architecture
 */

export interface QueuedMutation {
  id: string;
  table: string;
  operation: 'upsert' | 'delete';
  rows: any[];
  timestamp: number;
  retryCount: number;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
}

const DB_NAME = 'warroom_offline_v1';
const DB_VERSION = 1;
const STORE_TABLES = 'tables_cache';
const STORE_MUTATIONS = 'mutation_queue';
const STORE_KV = 'kv_store';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/** باز کردن یا ایجاد پایگاه داده IndexedDB */
export function openOfflineDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB در این مرورگر پشتیبانی نمی‌شود'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TABLES)) {
        db.createObjectStore(STORE_TABLES, { keyPath: 'table' });
      }
      if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
        const store = db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.warn('[WarRoom Offline DB] باز کردن IndexedDB با خطا مواجه شد:', request.error);
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/* ========================================================================== */
/* ۱. کَش جداول داده (Table Cache)                                            */
/* ========================================================================== */

/** ذخیره فوری آرایه‌ای از رکوردهای جدول در IndexedDB */
export async function cacheTableData(table: string, rows: any[]): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_TABLES, 'readwrite');
    const store = tx.objectStore(STORE_TABLES);
    store.put({
      table,
      rows: Array.isArray(rows) ? rows : [],
      updatedAt: Date.now()
    });
  } catch (err) {
    // بازگشت امن به LocalStorage در صورت بروز خطای IndexedDB
    try {
      localStorage.setItem(`warroom_offline_tbl_${table}`, JSON.stringify(rows));
    } catch {
      // ignore
    }
  }
}

/** بازیابی رکوردهای کَش‌شده جدول برای دسترسی بدون اینترنت */
export async function getCachedTableData<T = any>(table: string): Promise<T[] | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TABLES, 'readonly');
      const store = tx.objectStore(STORE_TABLES);
      const req = store.get(table);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.rows) && req.result.rows.length > 0) {
          resolve(req.result.rows as T[]);
        } else {
          // بررسی نسخه ذخیره در LocalStorage
          resolve(loadFromLocalStorageFallback<T>(table));
        }
      };
      req.onerror = () => {
        resolve(loadFromLocalStorageFallback<T>(table));
      };
    });
  } catch {
    return loadFromLocalStorageFallback<T>(table);
  }
}

function loadFromLocalStorageFallback<T>(table: string): T[] | null {
  try {
    const raw = localStorage.getItem(`warroom_offline_tbl_${table}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

/* ========================================================================== */
/* ۲. صف جهش‌های آفلاین (Offline Mutation Queue)                               */
/* ========================================================================== */

/** افزودن عملیات در حال انجام به صف آفلاین */
export async function enqueueOfflineMutation(mutation: {
  table: string;
  operation: 'upsert' | 'delete';
  rows: any[];
}): Promise<string> {
  const id = `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedMutation = {
    id,
    table: mutation.table,
    operation: mutation.operation,
    rows: mutation.rows,
    timestamp: Date.now(),
    retryCount: 0
  };

  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
    tx.objectStore(STORE_MUTATIONS).put(item);
  } catch {
    // پشتیبان در LocalStorage
    try {
      const q = getLocalStorageMutationQueue();
      q.push(item);
      localStorage.setItem('warroom_offline_mutations', JSON.stringify(q));
    } catch {
      // ignore
    }
  }

  notifySyncStatusChange();
  return id;
}

/** دریافت تمامی جهش‌های منتظر ارسال */
export async function getPendingMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MUTATIONS, 'readonly');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const idbMutations = req.result || [];
        const lsMutations = getLocalStorageMutationQueue();
        // ترکیب بدون تکرار
        const map = new Map<string, QueuedMutation>();
        idbMutations.forEach((m: QueuedMutation) => map.set(m.id, m));
        lsMutations.forEach((m: QueuedMutation) => map.set(m.id, m));
        resolve(Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp));
      };
      req.onerror = () => {
        resolve(getLocalStorageMutationQueue());
      };
    });
  } catch {
    return getLocalStorageMutationQueue();
  }
}

/** حذف یک جهش پس از ارسال موفقیت‌آمیز به سرور */
export async function removePendingMutation(id: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
    tx.objectStore(STORE_MUTATIONS).delete(id);
  } catch {
    // ignore
  }

  try {
    const q = getLocalStorageMutationQueue().filter((m) => m.id !== id);
    localStorage.setItem('warroom_offline_mutations', JSON.stringify(q));
  } catch {
    // ignore
  }

  notifySyncStatusChange();
}

function getLocalStorageMutationQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem('warroom_offline_mutations');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ========================================================================== */
/* ۳. ذخیره‌سازی کلید-مقدار آفلاین (KV Store)                                   */
/* ========================================================================== */

export async function setOfflineKv(key: string, value: any): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_KV, 'readwrite');
    tx.objectStore(STORE_KV).put({ key, value, updatedAt: Date.now() });
  } catch {
    try {
      localStorage.setItem(`warroom_kv_${key}`, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
}

export async function getOfflineKv<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_KV, 'readonly');
      const req = tx.objectStore(STORE_KV).get(key);
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(getLocalStorageKv<T>(key));
        }
      };
      req.onerror = () => {
        resolve(getLocalStorageKv<T>(key));
      };
    });
  } catch {
    return getLocalStorageKv<T>(key);
  }
}

function getLocalStorageKv<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`warroom_kv_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/* ========================================================================== */
/* ۴. بازپخش و همگام‌سازی جهش‌های صف‌بندی‌شده (Replay Offline Mutations)         */
/* ========================================================================== */

let isCurrentlyReplaying = false;

export async function replayPendingMutations(
  supabaseClient: any,
  normalizeRowFn?: (table: string, row: any) => Promise<any>
): Promise<{ synced: number; failed: number }> {
  if (isCurrentlyReplaying || !supabaseClient) {
    return { synced: 0, failed: 0 };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  isCurrentlyReplaying = true;
  notifySyncStatusChange(true);

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingMutations();
    if (pending.length === 0) {
      isCurrentlyReplaying = false;
      notifySyncStatusChange(false);
      return { synced: 0, failed: 0 };
    }

    console.info(`[WarRoom Sync] آغاز همگام‌سازی ${pending.length} تغییرات صف‌بندی‌شده آفلاین...`);

    for (const item of pending) {
      try {
        if (item.operation === 'upsert') {
          let rowsToUpload = item.rows;
          if (normalizeRowFn) {
            rowsToUpload = await Promise.all(
              item.rows.map((r: any) => normalizeRowFn(item.table, { id: r.id, data: r }))
            );
          }
          const { error } = await supabaseClient.from(item.table).upsert(rowsToUpload);
          if (error) {
            console.warn(`[WarRoom Sync] خطای ارسال رکورد به ${item.table}:`, error.message);
            failed++;
          } else {
            await removePendingMutation(item.id);
            synced++;
          }
        } else if (item.operation === 'delete') {
          const ids = item.rows.map((r: any) => (typeof r === 'string' ? r : r.id));
          const { error } = await supabaseClient.from(item.table).delete().in('id', ids);
          if (error) {
            console.warn(`[WarRoom Sync] خطای حذف رکورد از ${item.table}:`, error.message);
            failed++;
          } else {
            await removePendingMutation(item.id);
            synced++;
          }
        }
      } catch (opErr) {
        console.warn('[WarRoom Sync] خطای اجرای جهش در صف:', opErr);
        failed++;
      }
    }

    console.info(`[WarRoom Sync] همگام‌سازی تکمیل شد: ${synced} موفق، ${failed} ناموفق.`);
  } finally {
    isCurrentlyReplaying = false;
    notifySyncStatusChange(false);
  }

  return { synced, failed };
}

/* ========================================================================== */
/* ۵. سیستم اطلاع‌رسانی وضعیت همگام‌سازی به رابط کاربری (Sync Status Events)   */
/* ========================================================================== */

export const SYNC_STATUS_EVENT = 'warroom_sync_status_changed';

export function notifySyncStatusChange(syncing: boolean = isCurrentlyReplaying): void {
  if (typeof window === 'undefined') return;

  getPendingMutations().then((pending) => {
    const status: OfflineSyncStatus = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: syncing,
      pendingCount: pending.length,
      lastSyncTime: Date.now()
    };

    window.dispatchEvent(
      new CustomEvent(SYNC_STATUS_EVENT, { detail: status })
    );
  }).catch(() => {
    // ignore
  });
}

// ثبت شنونده‌های تغییر اتصال شبکه
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[WarRoom Network] وضعیت شبکه: آنلاین شد. آغاز بررسی صف همگام‌سازی...');
    notifySyncStatusChange(false);
    // تریگر رویداد سراسری آنلاین برای کامپوننت‌ها
    window.dispatchEvent(new CustomEvent('warroom_network_online'));
  });

  window.addEventListener('offline', () => {
    console.warn('[WarRoom Network] وضعیت شبکه: آفلاین شد. حالت آفلاین پایدار فعال گردید.');
    notifySyncStatusChange(false);
  });
}
