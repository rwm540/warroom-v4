/**
 * سامانه جامع ذخیره‌سازی آفلاین و صف جهش‌ها (IndexedDB + Offline Mutation Queue)
 * پلتفرم اتاق جنگ — Offline First Architecture
 * نسخه امن: فقط داده‌های عمومی و غیرحساس کش می‌شوند، از ذخیره رمز/توکن/OTP جلوگیری می‌شود.
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

const DB_NAME = 'warroom_offline_v2';
const DB_VERSION = 2;
const STORE_TABLES = 'tables_cache';
const STORE_MUTATIONS = 'mutation_queue';
const STORE_KV = 'kv_store';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

// جداول مجاز برای کش آفلاین - فقط داده‌های عمومی و غیرحساس
const ALLOWED_CACHE_TABLES = new Set([
  'warroom_missions',
  'warroom_trainings',
  'warroom_stages',
  'warroom_prizes',
  'warroom_announcements',
  'warroom_news',
  'warroom_home_announcements',
  'warroom_faqs',
  'warroom_game_portals',
  'warroom_daily_challenges',
  'warroom_soundtracks',
  'warroom_vitrin_posts',
  'warroom_vitrin_comments',
  'warroom_medals',
  'warroom_site_settings',
  'warroom_groups', // public groups, but filtered
  'warroom_kv', // only safe keys, filtered in supabaseData
]);

// جداول ممنوعه برای کش و صف آفلاین - حاوی PII یا اعتبارنامه
const BLOCKED_TABLES = new Set([
  'warroom_users',
  'warroom_users_public', // use direct fetch, not offline cache for PII
  'warroom_credentials',
  'warroom_otp_codes',
  'warroom_otp_rate_limits',
  'warroom_refresh_tokens',
  'warroom_sessions',
  'warroom_password_resets',
  'warroom_password_reset_requests',
  'warroom_security_kv',
  'warroom_payment_config',
  'warroom_admin_settings',
  'warroom_server_settings',
  'warroom_session_log',
  'warroom_wallet_transactions',
  'warroom_point_transfers',
  'warroom_payment_transactions',
  'warroom_audit_log',
  'warroom_pending_registrations',
]);

function isTableAllowedForCache(table: string): boolean {
  if (BLOCKED_TABLES.has(table)) return false;
  return ALLOWED_CACHE_TABLES.has(table);
}

function isTableAllowedForMutation(table: string): boolean {
  // Mutations only for non-sensitive, user-owned content
  if (BLOCKED_TABLES.has(table)) return false;
  const allowedMutations = new Set([
    'warroom_group_chat_messages',
    'warroom_group_chat_rooms',
    'warroom_vitrin_comments',
    'warroom_support_tickets',
    'warroom_support_replies',
    'warroom_submissions',
    'warroom_kv', // only safe keys
  ]);
  return allowedMutations.has(table);
}

function secureRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `mut_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      const hex = Array.from(arr).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
      return `mut_${Date.now()}_${hex}`;
    }
  } catch {}
  // Fallback: use timestamp + performance.now if crypto unavailable (still better than Math.random)
  return `mut_${Date.now()}_${String(performance.now()).replace('.', '').slice(0, 8)}`;
}

function containsSensitiveData(rows: any[]): boolean {
  if (!Array.isArray(rows)) return false;
  for (const row of rows) {
    const data = row?.data || row;
    if (!data || typeof data !== 'object') continue;
    // Check for password, token, otp, secret fields
    const keys = Object.keys(data).map(k => k.toLowerCase());
    if (keys.some(k => k.includes('password') || k.includes('secret') || k.includes('token') || k.includes('otp') || k === 'code' || k.includes('credential'))) {
      return true;
    }
    // Check nested data
    if (data.data && typeof data.data === 'object') {
      const nestedKeys = Object.keys(data.data).map(k => k.toLowerCase());
      if (nestedKeys.some(k => k.includes('password') || k.includes('secret') || k.includes('token') || k.includes('otp'))) {
        return true;
      }
    }
  }
  return false;
}

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
/* ۱. کَش جداول داده (Table Cache) - فقط داده‌های عمومی                        */
/* ========================================================================== */

export async function cacheTableData(table: string, rows: any[]): Promise<void> {
  if (!isTableAllowedForCache(table)) {
    // Silently ignore caching for sensitive tables
    return;
  }
  if (containsSensitiveData(rows)) {
    console.warn(`[WarRoom Offline] جلوگیری از کش داده حساس برای جدول ${table}`);
    return;
  }
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_TABLES, 'readwrite');
    const store = tx.objectStore(STORE_TABLES);
    store.put({
      table,
      rows: Array.isArray(rows) ? rows : [],
      updatedAt: Date.now()
    });
  } catch {
    // Fallback to localStorage only for allowed tables
    try {
      if (isTableAllowedForCache(table)) {
        localStorage.setItem(`warroom_offline_tbl_${table}`, JSON.stringify(rows));
      }
    } catch {
      // ignore
    }
  }
}

export async function getCachedTableData<T = any>(table: string): Promise<T[] | null> {
  if (!isTableAllowedForCache(table)) {
    return null;
  }
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
  if (!isTableAllowedForCache(table)) return null;
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
/* ۲. صف جهش‌های آفلاین (Offline Mutation Queue) - فقط جداول امن               */
/* ========================================================================== */

export async function enqueueOfflineMutation(mutation: {
  table: string;
  operation: 'upsert' | 'delete';
  rows: any[];
}): Promise<string> {
  if (!isTableAllowedForMutation(mutation.table)) {
    console.warn(`[WarRoom Offline] مسدودسازی جهش آفلاین برای جدول حساس: ${mutation.table}`);
    throw new Error(`Offline mutation not allowed for table: ${mutation.table}`);
  }
  if (containsSensitiveData(mutation.rows)) {
    throw new Error('Sensitive data cannot be queued offline');
  }

  const id = secureRandomId();
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

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MUTATIONS, 'readonly');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const idbMutations = (req.result || []).filter((m: QueuedMutation) => isTableAllowedForMutation(m.table));
        const lsMutations = getLocalStorageMutationQueue().filter(m => isTableAllowedForMutation(m.table));
        const map = new Map<string, QueuedMutation>();
        idbMutations.forEach((m: QueuedMutation) => map.set(m.id, m));
        lsMutations.forEach((m: QueuedMutation) => map.set(m.id, m));
        resolve(Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp));
      };
      req.onerror = () => {
        resolve(getLocalStorageMutationQueue().filter(m => isTableAllowedForMutation(m.table)));
      };
    });
  } catch {
    return getLocalStorageMutationQueue().filter(m => isTableAllowedForMutation(m.table));
  }
}

export async function removePendingMutation(id: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
    tx.objectStore(STORE_MUTATIONS).delete(id);
  } catch {}

  try {
    const q = getLocalStorageMutationQueue().filter((m) => m.id !== id);
    localStorage.setItem('warroom_offline_mutations', JSON.stringify(q));
  } catch {}

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
/* ۳. ذخیره‌سازی کلید-مقدار آفلاین (KV Store) - فقط کلیدهای عمومی              */
/* ========================================================================== */

const BLOCKED_KV_KEYS = new Set([
  'payment_settings',
  'payment_secrets',
  'admin_config',
  'api_keys',
  'server_secrets',
  'warroom_session_id',
  'warroom_current_user_data',
  'warroom_current_user_id',
  'warroom_otp',
  'password',
  'token',
  'secret',
]);

function isKvKeyAllowed(key: string): boolean {
  const lower = key.toLowerCase();
  if (BLOCKED_KV_KEYS.has(lower)) return false;
  if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('otp') || lower.includes('session')) {
    return false;
  }
  return true;
}

export async function setOfflineKv(key: string, value: any): Promise<void> {
  if (!isKvKeyAllowed(key)) {
    console.warn(`[WarRoom Offline] مسدودسازی KV حساس: ${key}`);
    return;
  }
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORE_KV, 'readwrite');
    tx.objectStore(STORE_KV).put({ key, value, updatedAt: Date.now() });
  } catch {
    try {
      localStorage.setItem(`warroom_kv_${key}`, JSON.stringify(value));
    } catch {}
  }
}

export async function getOfflineKv<T = any>(key: string): Promise<T | null> {
  if (!isKvKeyAllowed(key)) return null;
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
  if (!isKvKeyAllowed(key)) return null;
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
      if (!isTableAllowedForMutation(item.table)) {
        await removePendingMutation(item.id);
        continue;
      }
      try {
        if (item.operation === 'upsert') {
          let rowsToUpload = item.rows;
          if (normalizeRowFn) {
            rowsToUpload = await Promise.all(
              item.rows.map((r: any) => normalizeRowFn(item.table, { id: r.id, data: r }))
            );
          }
          if (containsSensitiveData(rowsToUpload)) {
            console.warn(`[WarRoom Sync] جلوگیری از ارسال داده حساس به ${item.table}`);
            await removePendingMutation(item.id);
            failed++;
            continue;
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
  }).catch(() => {});
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[WarRoom Network] وضعیت شبکه: آنلاین شد. آغاز بررسی صف همگام‌سازی...');
    notifySyncStatusChange(false);
    window.dispatchEvent(new CustomEvent('warroom_network_online'));
  });

  window.addEventListener('offline', () => {
    console.warn('[WarRoom Network] وضعیت شبکه: آفلاین شد. حالت آفلاین پایدار فعال گردید.');
    notifySyncStatusChange(false);
  });
}

// Cleanup legacy sensitive caches on load
if (typeof window !== 'undefined') {
  try {
    // Remove old sensitive offline caches
    const sensitiveKeys = [
      'warroom_offline_tbl_warroom_users',
      'warroom_offline_tbl_warroom_credentials',
      'warroom_offline_tbl_warroom_otp_codes',
      'warroom_offline_tbl_warroom_password_reset_requests',
      'warroom_offline_tbl_warroom_wallet_transactions',
      'warroom_offline_tbl_warroom_payment_transactions',
      'warroom_current_user_data',
      'warroom_current_user_id',
      'warroom_session_id',
    ];
    sensitiveKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  } catch {}
}
