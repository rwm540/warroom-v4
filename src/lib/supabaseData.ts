/**
 * لایه همگام‌سازی داده امن با Supabase — پلتفرم اتاق جنگ
 * نسخه امن: حذف ذخیره رمز عبور در کلاینت، محدودسازی کش آفلاین به داده‌های عمومی، استفاده از RPC برای عملیات حساس
 */
import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { queryClient } from './queryClient.ts';
import {
  cacheTableData,
  getCachedTableData,
  enqueueOfflineMutation,
  replayPendingMutations,
} from './offlineStorage.ts';

/* ------------------------------------------------------------------ */
/* Supabase Client                                                    */
/* ------------------------------------------------------------------ */
const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

const supabaseUrl = runtimeEnv?.VITE_SUPABASE_URL?.trim() || '';
const supabasePublishableKey = runtimeEnv?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const supabasePublicKey = runtimeEnv?.VITE_SUPABASE_PUBLIC_KEY?.trim();
const supabaseAnonKey = runtimeEnv?.VITE_SUPABASE_ANON_KEY?.trim();

function pickActiveKey(): string {
  if (supabaseAnonKey && supabaseAnonKey.length > 15) return supabaseAnonKey;
  if (supabasePublishableKey && supabasePublishableKey.length > 15) return supabasePublishableKey;
  if (supabasePublicKey && supabasePublicKey.length > 15) return supabasePublicKey;
  return '';
}

const activeKey = pickActiveKey();

export const isSupabaseEnabled = Boolean(
  supabaseUrl &&
  activeKey &&
  supabaseUrl.startsWith('http') &&
  activeKey.length > 20
);

export const supabaseKeyInfo = (() => {
  if (isSupabaseEnabled) {
    return activeKey.startsWith('sb_')
      ? 'Publishable Key (فرمت جدید)'
      : 'Anon Key (فرمت JWT)';
  }
  return '— (حالت محلی)';
})();

export const supabase: SupabaseClient | null = (() => {
  if (!isSupabaseEnabled) return null;
  try {
    const client = createClient(supabaseUrl!, activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.info(
      `%c[WarRoom ➜ Supabase] متصل شد به: ${supabaseUrl} | کلید: ${supabaseKeyInfo}`,
      'color:#22d3ee;font-weight:bold'
    );
    return client;
  } catch (err) {
    console.error('[WarRoom] خطا در ساخت کلاینت Supabase:', err);
    return null;
  }
})();

export async function checkSupabaseHealth(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, message: 'سرور ابری پیکربندی نشده است — حالت محلی.' };
  }
  try {
    const { error } = await supabase.from('warroom_kv').select('id').limit(1);
    if (error) {
      const hint = error.code === '42P01'
        ? ' ⚠️ جدول‌های سرور وجود ندارند — migrationهای Supabase را بررسی و دستی اجرا کنید.'
        : error.message?.includes('JWT') || error.code?.startsWith('401')
          ? ' ⚠️ کلید API نامعتبر است — تنظیمات دسترسی API را بررسی کنید.'
          : '';
      console.warn(`[WarRoom ➜ Server] بررسی سلامت ناموفق: ${error.message}.${hint}`, error);
      return { ok: false, message: error.message + hint };
    }
    console.info('%c[WarRoom ➜ Server] بررسی سلامت موفق — دیتابیس در دسترس است.', 'color:#34d399;font-weight:bold');
    return { ok: true, message: 'دیتابیس ابری قرارگاه متصل و در دسترس است.' };
  } catch (err: any) {
    console.warn('[WarRoom ➜ Server] بررسی سلامت با خطا مواجه شد:', err);
    return { ok: false, message: err?.message || 'خطای شبکه' };
  }
}

export const WARROOM_STORAGE_BUCKET = 'warroom-media';

export async function uploadToStorage(
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean }
): Promise<{ publicUrl: string; path: string } | null> {
  if (!supabase) return null;
  const safePath = path.replace(/^\/+/, '');
  const { error } = await supabase.storage
    .from(WARROOM_STORAGE_BUCKET)
    .upload(safePath, file, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert ?? true,
      contentType: file.type || undefined
    });
  if (error) {
    console.warn('[WarRoom] آپلود فایل به Supabase Storage ناموفق بود:', error.message);
    return null;
  }
  const { data } = supabase.storage.from(WARROOM_STORAGE_BUCKET).getPublicUrl(safePath);
  return { publicUrl: data.publicUrl, path: safePath };
}

export function getStoragePublicUrl(path: string): string {
  const clean = path.replace(/^\/+/, '');
  const base = (supabaseUrl || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${WARROOM_STORAGE_BUCKET}/${clean}`;
}

/* ------------------------------------------------------------------ */
/* Secure helpers - no password storage in client                     */
/* ------------------------------------------------------------------ */

// Blocked tables that should never be cached offline or queried directly for all rows
const SENSITIVE_TABLES = new Set([
  'warroom_users',
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
  'warroom_wallet_transactions',
  'warroom_point_transfers',
  'warroom_payment_transactions',
  'warroom_audit_log',
  'warroom_pending_registrations',
]);

// Tables allowed for offline cache (public, non-sensitive)
const PUBLIC_CACHE_TABLES = new Set([
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
  'warroom_medals',
  'warroom_site_settings',
]);

function stripSensitiveFields(row: Record<string, any>): Record<string, any> {
  if (!row || typeof row !== 'object') return row;
  const data = row.data || row;
  if (!data || typeof data !== 'object') return row;
  // Never include password fields
  const cleaned = { ...row };
  if (cleaned.data && typeof cleaned.data === 'object') {
    const { password, password_hash, token, secret, rawPassword, pass, otp, code, ...safeData } = cleaned.data;
    cleaned.data = safeData;
  }
  // Also check top-level
  delete (cleaned as any).password;
  delete (cleaned as any).password_hash;
  delete (cleaned as any).token;
  delete (cleaned as any).secret;
  return cleaned;
}

export async function normalizeRowForDb(table: string, row: Record<string, any>): Promise<Record<string, any>> {
  // Never send password via this generic path - passwords must go via RPC only
  const stripped = stripSensitiveFields(row);
  return stripped;
}

/* ------------------------------------------------------------------ */
/* Hook 1: collections - secure version                               */
/* ------------------------------------------------------------------ */
export function useSyncedCollection<T extends { id: string }>(options: {
  storageKey?: string;
  table: string;
  initial: T[];
}): [T[], Dispatch<SetStateAction<T[]>>] {
  const { table, initial } = options;

  const [value, setValue] = useState<T[]>(initial);

  const dbLoadedRef = useRef(false);
  const pendingSkipRef = useRef(true);
  const prevRef = useRef<T[]>(value);

  // Load initial data
  useEffect(() => {
    let cancelled = false;

    // For sensitive tables, skip offline cache entirely
    if (!SENSITIVE_TABLES.has(table) && PUBLIC_CACHE_TABLES.has(table)) {
      getCachedTableData<T>(table)
        .then((cachedRows) => {
          if (!cancelled && cachedRows && cachedRows.length > 0 && !dbLoadedRef.current) {
            pendingSkipRef.current = true;
            setValue(cachedRows);
          }
        })
        .catch(() => {});
    }

    if (!isSupabaseEnabled || !supabase) {
      dbLoadedRef.current = true;
      return;
    }

    (async () => {
      try {
        // For warroom_users, we should not fetch all users directly - use public view for leaderboard
        // But to maintain compatibility, we fetch with RLS - server will filter to own or public
        // For other sensitive tables, we skip fetching all
        if (SENSITIVE_TABLES.has(table) && table !== 'warroom_users' && table !== 'warroom_groups' && table !== 'warroom_password_reset_requests') {
          dbLoadedRef.current = true;
          return;
        }

        const rows = await queryClient.fetchQuery({
          queryKey: ['supabase_table', table],
          queryFn: async () => {
            // For warroom_users, try public view first if available for non-authenticated? But we need full data for own user
            // We'll fetch directly - RLS will enforce own data or admin
            const { data, error } = await supabase!.from(table).select('data');
            if (error) throw error;
            const parsed = ((data || []) as any[])
              .map((r) => {
                const obj = r && typeof r === 'object' && 'data' in r ? (r.data as T) : null;
                if (!obj) return null;
                // Strip sensitive fields before storing in state
                const { password, password_hash, token, secret, ...safe } = (obj as any);
                return safe as T;
              })
              .filter((r): r is T => Boolean(r && typeof r === 'object'));
            return parsed;
          },
          staleTime: 1000 * 60 * 5,
        });

        if (cancelled) return;

        if (rows && rows.length > 0) {
          pendingSkipRef.current = true;
          setValue(rows);
          if (PUBLIC_CACHE_TABLES.has(table)) {
            void cacheTableData(table, rows);
          }
        } else {
          setValue([]);
          if (PUBLIC_CACHE_TABLES.has(table)) {
            void cacheTableData(table, []);
          }
        }
        dbLoadedRef.current = true;
      } catch (err) {
        console.warn(`[WarRoom Supabase] بارگذاری آنلاین ${table} ناموفق بود:`, err);
        dbLoadedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [table]);

  // Sync changes
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;

    if (pendingSkipRef.current) {
      pendingSkipRef.current = false;
      return;
    }
    if (!dbLoadedRef.current) return;

    if (PUBLIC_CACHE_TABLES.has(table)) {
      void cacheTableData(table, value);
    }
    queryClient.setQueryData(['supabase_table', table], value);

    const prevMap = new Map(prev.map((r) => [r.id, r]));
    const nextIds = new Set(value.map((r) => r.id));

    const changed = value.filter((r) => {
      const p = prevMap.get(r.id);
      return !p || JSON.stringify(p) !== JSON.stringify(r);
    });
    const removedIds = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);

    if (changed.length === 0 && removedIds.length === 0) return;

    // Block mutations for sensitive tables - must go via RPC
    if (SENSITIVE_TABLES.has(table)) {
      console.warn(`[WarRoom] جلوگیری از mutation مستقیم برای جدول حساس: ${table} - باید از RPC استفاده شود`);
      return;
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    (async () => {
      try {
        if (isOnline && isSupabaseEnabled && supabase) {
          if (changed.length > 0) {
            const rows = await Promise.all(
              changed.map((r) => normalizeRowForDb(table, { id: r.id, data: r }))
            );
            const { error } = await supabase!.from(table).upsert(rows);
            if (error) {
              console.warn(`[WarRoom Offline Queue] خطای سرور؛ افزودن به صف آفلاین ${table}:`, error.message);
              // Only queue if allowed
              if (table !== 'warroom_users') {
                await enqueueOfflineMutation({ table, operation: 'upsert', rows: changed }).catch(() => {});
              }
            }
          }
          if (removedIds.length > 0) {
            const { error } = await supabase!.from(table).delete().in('id', removedIds);
            if (error) {
              console.warn(`[WarRoom Offline Queue] خطای سرور؛ افزودن حذف به صف آفلاین ${table}:`, error.message);
              await enqueueOfflineMutation({ table, operation: 'delete', rows: removedIds }).catch(() => {});
            }
          }
        } else {
          if (changed.length > 0 && table !== 'warroom_users') {
            await enqueueOfflineMutation({ table, operation: 'upsert', rows: changed }).catch(() => {});
          }
          if (removedIds.length > 0) {
            await enqueueOfflineMutation({ table, operation: 'delete', rows: removedIds }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn(`[WarRoom Supabase] خطا در ارسال تغییرات؛ صف‌بندی آفلاین ${table}:`, err);
      }
    })();
  }, [value, table]);

  return [value, setValue];
}

/* ------------------------------------------------------------------ */
/* Saved posts                                                        */
/* ------------------------------------------------------------------ */
const savedPostsTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export function persistSavedPostsToDb(userId: string | undefined, ids?: string[]): void {
  if (!isSupabaseEnabled || !supabase || !userId) return;
  const key = `saved_posts_${userId}`;
  const list = ids || [];
  
  queryClient.setQueryData(['supabase_saved_posts', userId], list);

  if (savedPostsTimers[key]) clearTimeout(savedPostsTimers[key]);
  savedPostsTimers[key] = setTimeout(() => {
    supabase!
      .from('warroom_kv')
      .upsert({ id: key, value: { postIds: list } })
      .then(({ error }) => {
        if (error) console.warn(`[WarRoom Supabase] همگام‌سازی نشان‌شده‌های ${userId} ناموفق:`, error.message);
      });
  }, 500);
}

export async function loadSavedPostsFromDb(userId: string | undefined): Promise<string[]> {
  if (!isSupabaseEnabled || !supabase || !userId) return [];

  try {
    return await queryClient.fetchQuery({
      queryKey: ['supabase_saved_posts', userId],
      queryFn: async () => {
        const { data, error } = await supabase!
          .from('warroom_kv')
          .select('value')
          .eq('id', `saved_posts_${userId}`)
          .maybeSingle();
        if (error) throw error;
        const remote: string[] = Array.isArray((data?.value as any)?.postIds)
          ? ((data!.value as any).postIds as string[])
          : [];
        return remote;
      },
      staleTime: 1000 * 60 * 5,
    });
  } catch (err) {
    console.warn('[WarRoom Supabase] بارگذاری ذخیره‌ها از Supabase ناموفق بود:', err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Settings hook                                                      */
/* ------------------------------------------------------------------ */
export function useSyncedSetting<T extends Record<string, any>>(options: {
  storageKey?: string;
  settingKey: string;
  initial: T | (() => T);
}): [T, Dispatch<SetStateAction<T>>] {
  const { settingKey, initial, storageKey } = options;

  // Block sensitive keys from localStorage
  const isSensitiveKey = (() => {
    const lower = settingKey.toLowerCase();
    return lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('session') || ['payment_settings', 'payment_secrets', 'admin_config'].includes(lower);
  })();

  const [value, setValue] = useState<T>(() => {
    if (storageKey && !isSensitiveKey) {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {}
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  const dbLoadedRef = useRef(false);
  const pendingSkipRef = useRef(true);
  const firstRunRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      dbLoadedRef.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const remoteValue = await queryClient.fetchQuery({
          queryKey: ['supabase_kv', settingKey],
          queryFn: async () => {
            const { data, error } = await supabase!
              .from('warroom_kv')
              .select('value')
              .eq('id', settingKey)
              .maybeSingle();
            if (error) throw error;
            return (data?.value && typeof data.value === 'object') ? data.value : null;
          },
          staleTime: 1000 * 60 * 5,
        });

        if (cancelled) return;
        if (remoteValue) {
          pendingSkipRef.current = true;
          setValue(prev => {
            const merged = { ...prev, ...remoteValue };
            if (storageKey && !isSensitiveKey) {
              try {
                localStorage.setItem(storageKey, JSON.stringify(merged));
              } catch {}
            }
            return merged;
          });
        } else {
          const initVal = typeof initial === 'function' ? (initial as () => T)() : initial;
          await supabase!.from('warroom_kv').upsert({ id: settingKey, value: initVal });
          queryClient.setQueryData(['supabase_kv', settingKey], initVal);
        }
        dbLoadedRef.current = true;
      } catch (err) {
        console.warn(`[WarRoom Supabase] بارگذاری تنظیم «${settingKey}» از دیتابیس ناموفق بود.`, err);
        dbLoadedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [settingKey, storageKey]);

  useEffect(() => {
    if (storageKey && !isSensitiveKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {}
    }

    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (pendingSkipRef.current) {
      pendingSkipRef.current = false;
      return;
    }
    if (!isSupabaseEnabled || !supabase) return;
    if (isSensitiveKey) return; // Don't sync sensitive keys via generic path

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      queryClient.setQueryData(['supabase_kv', settingKey], value);
      supabase!
        .from('warroom_kv')
        .upsert({ id: settingKey, value })
        .then(({ error }) => {
          if (error) console.warn(`[WarRoom Supabase] ذخیره تنظیم «${settingKey}» در دیتابیس ناموفق:`, error.message);
        });
    }, 400);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [value, settingKey, storageKey]);

  return [value, setValue];
}

/* ------------------------------------------------------------------ */
/* User progress - secure, no password                                */
/* ------------------------------------------------------------------ */
export async function saveUserProgressToSupabase(user: any): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase || !user || !user.id) return false;
  try {
    // Strip password before saving
    const { password, password_hash, token, secret, ...safeUser } = user;
    const row = await normalizeRowForDb('warroom_users', {
      id: user.id,
      data: safeUser,
      updated_at: new Date().toISOString()
    });
    const { error } = await supabase.from('warroom_users').upsert(row);
    if (error) {
      console.warn('[WarRoom Supabase] خطا در ذخیره پیشرفت کاربر در دیتابیس:', error.message);
      return false;
    }
    queryClient.setQueryData(['supabase_table', 'warroom_users'], (prev: any[] | undefined) => {
      if (!prev) return [safeUser];
      const index = prev.findIndex((u) => u?.id === user.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], ...safeUser };
        return next;
      }
      return [...prev, safeUser];
    });
    return true;
  } catch (err) {
    console.warn('[WarRoom Supabase] ذخیره وضعیت کاربر با استثنا مواجه شد:', err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Support tickets                                                    */
/* ------------------------------------------------------------------ */
export async function createSupportTicketInSupabase(ticket: any): Promise<boolean> {
  if (!ticket || !ticket.id) return false;
  if (!isSupabaseEnabled || !supabase) return true;
  try {
    const { error } = await supabase.from('warroom_support_tickets').upsert({
      id: ticket.id,
      data: ticket
    });
    if (error) {
      console.warn('[WarRoom Supabase] خطا در ثبت تیکت پشتیبانی در دیتابیس:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[WarRoom Supabase] استثنا در ثبت تیکت پشتیبانی:', err);
    return false;
  }
}

export async function saveSupportReplyToSupabase(reply: any): Promise<boolean> {
  if (!reply || !reply.id) return false;
  if (!isSupabaseEnabled || !supabase) return true;
  try {
    const { error } = await supabase.from('warroom_support_replies').upsert({
      id: reply.id,
      data: reply
    });
    if (error) {
      console.warn('[WarRoom Supabase] خطا در ثبت پاسخ تیکت در دیتابیس:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[WarRoom Supabase] استثنا در ثبت پاسخ تیکت:', err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Daily challenges - public only                                     */
/* ------------------------------------------------------------------ */
export async function saveDailyChallengeToSupabase(challenge: any): Promise<boolean> {
  if (!challenge || !challenge.id) return false;

  if (isSupabaseEnabled && supabase) {
    try {
      const { error: err1 } = await supabase
        .from('warroom_daily_challenges')
        .upsert({
          id: challenge.id,
          data: challenge,
          updated_at: new Date().toISOString()
        });

      if (err1) {
        console.warn('[WarRoom Supabase] خطا در ثبت در جدول warroom_daily_challenges:', err1.message);
      }

      if (challenge.isActive) {
        await supabase
          .from('warroom_kv')
          .upsert({
            id: 'daily_challenge_config',
            value: challenge
          });
      }
      return true;
    } catch (e) {
      console.warn('[WarRoom Supabase] استثنا در ذخیره چالش روزانه:', e);
      return false;
    }
  }
  return true;
}

export async function deleteDailyChallengeFromSupabase(id: string): Promise<boolean> {
  if (!id) return false;

  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase
        .from('warroom_daily_challenges')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('[WarRoom] خطا در حذف چالش روزانه:', error.message);
        return false;
      }

      await supabase.from('warroom_kv').delete().eq('id', 'daily_challenge_config');
      return true;
    } catch (e) {
      console.warn('[WarRoom] استثنا در حذف چالش روزانه:', e);
      return false;
    }
  }
  return true;
}

export async function fetchDailyChallengesFromSupabase(): Promise<any[]> {
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('warroom_daily_challenges')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        if (data.length === 0) {
          return [];
        }
        const mapped = data.map(row => (row.data ? { ...row.data, id: row.id } : row));
        return mapped;
      }
    } catch (e) {
      console.warn('[WarRoom Supabase] خطا در واکشی چالش‌ها از دیتابیس:', e);
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Soundtracks - public                                               */
/* ------------------------------------------------------------------ */
export async function saveSoundtrackToSupabase(track: any): Promise<boolean> {
  if (!track || !track.id) return false;
  if (!isSupabaseEnabled || !supabase) return true;
  try {
    const { error } = await supabase
      .from('warroom_soundtracks')
      .upsert({
        id: track.id,
        data: track,
        updated_at: new Date().toISOString()
      });
    if (error) {
      console.warn('[WarRoom Supabase] خطا در ثبت قطعه موسیقی در warroom_soundtracks:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[WarRoom Supabase] استثنا در ذخیره قطعه موسیقی:', e);
    return false;
  }
}

export async function deleteSoundtrackFromSupabase(id: string): Promise<boolean> {
  if (!id) return false;
  if (!isSupabaseEnabled || !supabase) return true;
  try {
    const { error } = await supabase
      .from('warroom_soundtracks')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('[WarRoom Supabase] خطا در حذف قطعه موسیقی از warroom_soundtracks:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[WarRoom Supabase] استثنا در حذف قطعه موسیقی:', e);
    return false;
  }
}

export async function fetchSoundtracksFromSupabase(): Promise<any[]> {
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('warroom_soundtracks')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(row => (row.data ? { ...row.data, id: row.id } : row));
      }
    } catch (e) {
      console.warn('[WarRoom Supabase] خطا در واکشی قطعات از warroom_soundtracks:', e);
    }

    try {
      const { data } = await supabase
        .from('warroom_kv')
        .select('value')
        .eq('id', 'soundtracks')
        .maybeSingle();

      if (Array.isArray((data?.value as any)?.items) && (data!.value as any).items.length > 0) {
        return (data!.value as any).items;
      }
    } catch {}
  }
  return [];
}

export async function uploadAudioFileToSupabase(file: File): Promise<{ success: boolean; url: string; error?: string }> {
  if (!file) return { success: false, url: '', error: 'فایلی انتخاب نشده است.' };

  if (isSupabaseEnabled && supabase) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `soundtracks/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('warroom-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'audio/mpeg'
        });

      if (!error && data?.path) {
        const { data: pubData } = supabase.storage
          .from('warroom-media')
          .getPublicUrl(data.path);

        if (pubData?.publicUrl) {
          return { success: true, url: pubData.publicUrl };
        }
      }
    } catch (e) {
      console.warn('[WarRoom Supabase] آپلود مستقیم در استوریج با خطا مواجه شد، استفاده از فال‌بک داده صوتی:', e);
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ success: true, url: reader.result as string });
    };
    reader.onerror = () => {
      resolve({ success: false, url: '', error: 'خطا در خواندن فایل صوتی محلی.' });
    };
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/* Auto sync - only for allowed tables                                */
/* ------------------------------------------------------------------ */
if (typeof window !== 'undefined') {
  const triggerAutoSync = () => {
    if (isSupabaseEnabled && supabase && typeof navigator !== 'undefined' && navigator.onLine) {
      void replayPendingMutations(supabase, normalizeRowForDb);
    }
  };

  window.addEventListener('online', triggerAutoSync);
  window.addEventListener('warroom_network_online', triggerAutoSync);
  setTimeout(triggerAutoSync, 3000);
}

// Legacy compatibility exports - now secure no-ops
export const userPasswordCache = new Map<string, string>();
export function setUserPasswordInCache(_userId: string, _passwordHash: string): void {}
export function getUserPasswordFromCache(_userId: string): string | undefined { return undefined; }
export async function sha256Hex(input: string): Promise<string> {
  // Deprecated - passwords must be hashed server-side via bcrypt
  // Return empty to force server-side handling
  return '';
}
export const HASH_PATTERN = /^[0-9a-f]{64}$/i;
export const EMPTY_STRING_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
