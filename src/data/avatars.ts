// Centralized Avatar Management & Storage System — WarRoom Platform
// Supports full CRUD: Add, Edit, Delete, Filter by Gender, and Reset
// Full Cloud Synchronization with Supabase (warroom_kv) + Offline Persistence (IndexedDB / LocalStorage)

import { setOfflineKv, getOfflineKv, enqueueOfflineMutation } from '../lib/offlineStorage';
import { supabase, isSupabaseEnabled } from '../lib/supabaseData';

export interface AvatarItem {
  id: string;
  name: string;
  url: string;
  gender: 'دختر' | 'پسر';
  isCustom?: boolean;
}

export const DEFAULT_WOMAN_AVATARS: AvatarItem[] = [
  { id: 'w_cmd_1', name: 'فرمانده نگار (ستاد نور)', url: '/images/avatar/woman/Commander_giving_orders_2K_202608210108.jpeg', gender: 'دختر' },
  { id: 'w_cmd_2', name: 'فرمانده ارشد دختران', url: '/images/avatar/woman/Female_commander_in_military_uni…_202608210116.jpeg', gender: 'دختر' },
  { id: 'w_cmd_3', name: 'بانوی قهرمان پیروز', url: '/images/avatar/woman/Female_commander_in_victory_pose_202608210116.jpeg', gender: 'دختر' },
  { id: 'w_cmd_4', name: 'تکاور سایبری دختران', url: '/images/avatar/woman/Female_commando_commander_charac…_2K_202608210111.jpeg', gender: 'دختر' },
  { id: 'w_cmd_5', name: 'راهنمای عملیات دختران', url: '/images/avatar/woman/Female_commando_presenting_gesture_2K_202608210116.jpeg', gender: 'دختر' },
  { id: 'w_cmd_6', name: 'افسر مراقبت هوشمند', url: '/images/avatar/woman/Female_commando_showing_stop_ges…_202608210111.jpeg', gender: 'دختر' },
  { id: 'w_cmd_7', name: 'طراح استراتژیک نور', url: '/images/avatar/woman/Tactical_commander_character_design_2K_202608210119.jpeg', gender: 'دختر' },
  { id: 'w_cmd_8', name: 'دیده‌بان پیشتاز دختران', url: '/images/avatar/woman/Woman_scanning_horizon_with_bino…_202608210111.jpeg', gender: 'دختر' },
];

export const DEFAULT_MALE_AVATARS: AvatarItem[] = [
  { id: 'm_cmd_1', name: 'فرمانده کاوه (ستاد فاتحان)', url: '/images/avatar/male/Commander_in_tactical_uniform_ready_202608210056.jpeg', gender: 'پسر' },
  { id: 'm_cmd_2', name: 'فرمانده تاکتیکی پسران', url: '/images/avatar/male/Commander_wearing_tactical_uniform_2K_202608210049.jpeg', gender: 'پسر' },
  { id: 'm_cmd_3', name: 'افسر پیروز میدان', url: '/images/avatar/male/Commander_doing_victory_pose_2K_202608210056.jpeg', gender: 'پسر' },
  { id: 'm_cmd_4', name: 'رزمنده پیشتاز احترام', url: '/images/avatar/male/Cartoon_commander_saluting_2K_202608210048.jpeg', gender: 'پسر' },
  { id: 'm_cmd_5', name: 'افسر اقتدار و رزم', url: '/images/avatar/male/Commander_crossing_arms_2K_202608210055.jpeg', gender: 'پسر' },
  { id: 'm_cmd_6', name: 'تکاور عملیات ویژه', url: '/images/avatar/male/Commander_gesturing_quiet_sign_2K_202608210056.jpeg', gender: 'پسر' },
  { id: 'm_cmd_7', name: 'فرمانده تهاجم هوشمند', url: '/images/avatar/male/Commander_pointing_forward_in_un…_202608210049 (1).jpeg', gender: 'پسر' },
  { id: 'm_cmd_8', name: 'دیده‌بان استراتژیک پسران', url: '/images/avatar/male/Commander_scanning_horizon_with_…_202608210055.jpeg', gender: 'پسر' },
];

// Compatibility exports
export const WOMAN_AVATARS = DEFAULT_WOMAN_AVATARS;
export const MALE_AVATARS = DEFAULT_MALE_AVATARS;

export const ALL_AVATARS_STORAGE_KEY = 'warroom_all_active_avatars_v2';
export const CUSTOM_AVATARS_STORAGE_KEY = 'warroom_custom_profile_avatars';

let inMemoryAvatars: AvatarItem[] | null = null;
let isSupabaseSyncInitialized = false;

/**
 * دریافت لیست کامل و یکپارچه تمامی آواتارها (شامل پیش‌فرض‌ها، ویرایش‌شده‌ها و موارد جدید)
 */
export function getAllAvatars(): AvatarItem[] {
  if (inMemoryAvatars && inMemoryAvatars.length > 0) {
    return inMemoryAvatars;
  }

  if (typeof window === 'undefined') {
    return [...DEFAULT_WOMAN_AVATARS, ...DEFAULT_MALE_AVATARS];
  }

  try {
    const raw = localStorage.getItem(ALL_AVATARS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryAvatars = parsed;
        return parsed;
      }
    }

    // مهاجرت از کلید قدیمی در صورت وجود
    const legacyRaw = localStorage.getItem(CUSTOM_AVATARS_STORAGE_KEY);
    let legacyCustom: AvatarItem[] = [];
    if (legacyRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy)) legacyCustom = parsedLegacy;
      } catch {}
    }

    const initial = [
      ...legacyCustom.map(a => ({ ...a, isCustom: true })),
      ...DEFAULT_WOMAN_AVATARS,
      ...DEFAULT_MALE_AVATARS
    ];
    inMemoryAvatars = initial;
    saveAllAvatars(initial);
    return initial;
  } catch {
    return [...DEFAULT_WOMAN_AVATARS, ...DEFAULT_MALE_AVATARS];
  }
}

/**
 * ذخیره لیست کامل آواتارها در حافظه پایدار، IndexedDB و پایگاه داده سوپابیس (Supabase)
 */
export function saveAllAvatars(avatars: AvatarItem[]): void {
  inMemoryAvatars = avatars;
  if (typeof window === 'undefined') return;

  try {
    // ۱. ذخیره بلادرنگ در LocalStorage
    localStorage.setItem(ALL_AVATARS_STORAGE_KEY, JSON.stringify(avatars));
    const customOnly = avatars.filter(a => a.isCustom || a.id.startsWith('custom_'));
    localStorage.setItem(CUSTOM_AVATARS_STORAGE_KEY, JSON.stringify(customOnly));

    // ۲. ذخیره در حافظه پایدار آفلاین IndexedDB
    setOfflineKv(ALL_AVATARS_STORAGE_KEY, avatars).catch(() => {});

    // ۳. همگام‌سازی ابری با پایگاه داده Supabase (جدول warroom_kv)
    if (isSupabaseEnabled && supabase) {
      Promise.resolve(
        supabase
          .from('warroom_kv')
          .upsert({
            id: ALL_AVATARS_STORAGE_KEY,
            value: avatars,
            updated_at: new Date().toISOString()
          })
      )
        .then((res: any) => {
          if (res?.error) {
            console.warn('[WarRoom Supabase] خطا در ذخیره آواتارها در سوپابیس، انتقال به صف آفلاین:', res.error.message);
            enqueueOfflineMutation({
              table: 'warroom_kv',
              operation: 'upsert',
              rows: [{ id: ALL_AVATARS_STORAGE_KEY, value: avatars }]
            }).catch(() => {});
          } else {
            console.log('[WarRoom Supabase] لیست آواتارها با موفقیت در پایگاه داده ابری سوپابیس ذخیره شد.');
          }
        })
        .catch((err: any) => {
          console.warn('[WarRoom Supabase] قطع ارتباط، ثبت جهش آواتار در صف آفلاین:', err);
          enqueueOfflineMutation({
            table: 'warroom_kv',
            operation: 'upsert',
            rows: [{ id: ALL_AVATARS_STORAGE_KEY, value: avatars }]
          }).catch(() => {});
        });
    }

    // ۴. اطلاع‌رسانی به تمامی کامپوننت‌های رابط کاربری
    window.dispatchEvent(new CustomEvent('warroom_custom_avatars_changed', { detail: avatars }));
  } catch (e) {
    console.error('Error saving avatars:', e);
  }
}

/**
 * استعلام و همگام‌سازی بلادرنگ آواتارها از پایگاه داده سوپابیس
 */
export async function syncAvatarsWithSupabase(): Promise<AvatarItem[]> {
  if (!isSupabaseEnabled || !supabase) {
    return getAllAvatars();
  }

  try {
    const { data, error } = await supabase
      .from('warroom_kv')
      .select('value')
      .eq('id', ALL_AVATARS_STORAGE_KEY)
      .maybeSingle();

    if (error) {
      console.warn('[WarRoom Supabase] خطا در دریافت آواتارها از سوپابیس:', error.message);
      return getAllAvatars();
    }

    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      inMemoryAvatars = data.value;
      localStorage.setItem(ALL_AVATARS_STORAGE_KEY, JSON.stringify(data.value));
      setOfflineKv(ALL_AVATARS_STORAGE_KEY, data.value).catch(() => {});
      window.dispatchEvent(new CustomEvent('warroom_custom_avatars_changed', { detail: data.value }));
      return data.value;
    } else {
      // اگر هنوز رکوردی در سوپابیس نبود، آواتارهای فعلی را در سوپابیس بارگذاری می‌کنیم
      const current = getAllAvatars();
      saveAllAvatars(current);
      return current;
    }
  } catch (err) {
    console.warn('[WarRoom Supabase] بارگذاری آواتارها از سوپابیس با شکست مواجه شد:', err);
    return getAllAvatars();
  }
}

/**
 * راه‌اندازی شنونده تغییرات بلادرنگ سوپابیس برای آواتارها
 */
export function initAvatarSupabaseRealtime(): void {
  if (isSupabaseSyncInitialized || !isSupabaseEnabled || !supabase) return;
  isSupabaseSyncInitialized = true;

  // اجرای بارگذاری اولیه از سوپابیس
  syncAvatarsWithSupabase().catch(() => {});

  try {
    supabase
      .channel('realtime_warroom_avatars')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warroom_kv',
          filter: `id=eq.${ALL_AVATARS_STORAGE_KEY}`
        },
        (payload: any) => {
          if (payload.new && payload.new.value && Array.isArray(payload.new.value)) {
            inMemoryAvatars = payload.new.value;
            localStorage.setItem(ALL_AVATARS_STORAGE_KEY, JSON.stringify(payload.new.value));
            setOfflineKv(ALL_AVATARS_STORAGE_KEY, payload.new.value).catch(() => {});
            window.dispatchEvent(new CustomEvent('warroom_custom_avatars_changed', { detail: payload.new.value }));
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('[WarRoom Realtime] خطا در اتصال کانال تغییرات سوپابیس برای آواتارها:', e);
  }
}

/**
 * افزودن آواتار جدید
 */
export function addAvatar(avatar: AvatarItem): AvatarItem[] {
  const current = getAllAvatars();
  const newItem = { ...avatar, isCustom: true };
  const updated = [newItem, ...current.filter(a => a.id !== avatar.id)];
  saveAllAvatars(updated);
  return updated;
}

/**
 * ویرایش آواتار موجود (هم پیش‌فرض و هم سفارشی)
 */
export function updateAvatar(id: string, updatedFields: Partial<AvatarItem>): AvatarItem[] {
  const current = getAllAvatars();
  const updated = current.map(item => {
    if (item.id === id) {
      return {
        ...item,
        ...updatedFields,
        id: item.id // شناسه ثابت بماند
      };
    }
    return item;
  });
  saveAllAvatars(updated);
  return updated;
}

/**
 * حذف آواتار (هم پیش‌فرض و هم سفارشی) و حذف از سوپابیس و حافظه محلی
 */
export function deleteAvatar(id: string): AvatarItem[] {
  const current = getAllAvatars();
  const updated = current.filter(a => a.id !== id);
  saveAllAvatars(updated);
  return updated;
}

/**
 * بازنشانی کلیه آواتارها به فهرست اصلی پیش‌فرض پروژه
 */
export function resetToDefaultAvatars(): AvatarItem[] {
  const defaults = [...DEFAULT_WOMAN_AVATARS, ...DEFAULT_MALE_AVATARS];
  saveAllAvatars(defaults);
  return defaults;
}

// توابع سازگار با کدهای قبلی
export function getCustomAvatars(): AvatarItem[] {
  return getAllAvatars().filter(a => a.isCustom || a.id.startsWith('custom_'));
}

export function saveCustomAvatars(avatars: AvatarItem[]): void {
  const nonCustom = getAllAvatars().filter(a => !a.isCustom && !a.id.startsWith('custom_'));
  saveAllAvatars([...avatars.map(a => ({ ...a, isCustom: true })), ...nonCustom]);
}

export function addCustomAvatar(avatar: AvatarItem): AvatarItem[] {
  return addAvatar(avatar);
}

export function removeCustomAvatar(id: string): AvatarItem[] {
  return deleteAvatar(id);
}

/**
 * دریافت آواتارها فیلترشده بر اساس جنسیت کاربر با در نظر گرفتن کلیه ویرایش‌ها و حذف‌ها
 */
export function getAvatarsByGender(gender?: string, campaignTheme?: string): AvatarItem[] {
  const isFemale = gender === 'دختر' || gender === 'woman' || gender === 'female' || campaignTheme === 'girls';
  const targetGender: 'دختر' | 'پسر' = isFemale ? 'دختر' : 'پسر';
  
  const all = getAllAvatars();
  const filtered = all.filter(a => a.gender === targetGender);

  if (filtered.length > 0) return filtered;
  // Fallback if all were deleted for some reason
  return isFemale ? DEFAULT_WOMAN_AVATARS : DEFAULT_MALE_AVATARS;
}

/**
 * دریافت آدرس آواتار پیش‌فرض برای جنسیت کاربر
 */
export function getDefaultAvatar(gender?: string, campaignTheme?: string): string {
  const available = getAvatarsByGender(gender, campaignTheme);
  if (available.length > 0 && available[0].url) {
    return available[0].url;
  }
  const isFemale = gender === 'دختر' || gender === 'woman' || gender === 'female' || campaignTheme === 'girls';
  return isFemale
    ? '/images/avatar/woman/Commander_giving_orders_2K_202608210108.jpeg'
    : '/images/avatar/male/Commander_in_tactical_uniform_ready_202608210056.jpeg';
}
