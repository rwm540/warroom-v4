import { DailyChallengeConfig } from '../types';
import { supabase, isSupabaseEnabled } from './supabaseClient';
import { saveDailyChallengeToSupabase, deleteDailyChallengeFromSupabase, fetchDailyChallengesFromSupabase } from './supabaseData';

export const DEFAULT_DAILY_CHALLENGE: DailyChallengeConfig | null = null;

/**
 * واکشی تمام چالش‌های ثبت شده از دیتابیس ابری و لوکال استوریج
 */
export async function getAllDailyChallenges(): Promise<DailyChallengeConfig[]> {
  try {
    const list = await fetchDailyChallengesFromSupabase();
    if (Array.isArray(list)) {
      localStorage.setItem('warroom_all_daily_challenges', JSON.stringify(list));
      return list;
    }
  } catch (e) {
    console.warn('[DailyChallenge] خطا در واکشی آنلاین:', e);
  }

  // تلاش برای خواندن از لوکال استوریج
  try {
    const cached = localStorage.getItem('warroom_all_daily_challenges');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * ایجاد یک چالش جدید و ذخیره در Supabase
 */
export async function createDailyChallenge(
  challengeData: Omit<DailyChallengeConfig, 'id'> & { id?: string }
): Promise<DailyChallengeConfig> {
  const newId = challengeData.id || `dc_${Date.now()}`;
  const challenge: DailyChallengeConfig = {
    ...challengeData,
    id: newId,
    isActive: challengeData.isActive ?? true
  };

  // اگر فعال انتخاب شده، سایر چالش‌ها را غیرفعال کنیم
  if (challenge.isActive) {
    await markOthersInactive(newId);
  }

  await saveDailyChallengeToSupabase(challenge);

  // ارسال رویداد جهت به‌روزرسانی آنی فرانت‌اند
  window.dispatchEvent(new CustomEvent('warroom_daily_challenge_updated', { detail: challenge }));
  return challenge;
}

/**
 * ویرایش و به‌روزرسانی چالش موجود
 */
export async function updateDailyChallenge(challenge: DailyChallengeConfig): Promise<boolean> {
  if (!challenge || !challenge.id) return false;

  if (challenge.isActive) {
    await markOthersInactive(challenge.id);
  }

  const success = await saveDailyChallengeToSupabase(challenge);
  window.dispatchEvent(new CustomEvent('warroom_daily_challenge_updated', { detail: challenge }));
  return success;
}

/**
 * فعال‌سازی یک چالش خاص به عنوان چالش جاری روزانه
 */
export async function setActiveDailyChallenge(id: string): Promise<boolean> {
  const all = await getAllDailyChallenges();
  let target: DailyChallengeConfig | null = null;

  for (const item of all) {
    if (item.id === id) {
      item.isActive = true;
      target = item;
    } else {
      item.isActive = false;
    }
    await saveDailyChallengeToSupabase(item);
  }

  if (target) {
    localStorage.setItem('warroom_daily_challenge_config', JSON.stringify(target));
    if (isSupabaseEnabled && supabase) {
      await supabase.from('warroom_kv').upsert({
        id: 'daily_challenge_config',
        value: target
      });
    }
    window.dispatchEvent(new CustomEvent('warroom_daily_challenge_updated', { detail: target }));
    return true;
  }
  return false;
}

/**
 * حذف یک چالش روزانه
 */
export async function deleteDailyChallenge(id: string): Promise<boolean> {
  const success = await deleteDailyChallengeFromSupabase(id);
  window.dispatchEvent(new CustomEvent('warroom_daily_challenge_deleted', { detail: { id } }));
  return success;
}

/**
 * غیرفعال‌سازی سایر چالش‌ها هنگام فعال‌سازی یک چالش جدید
 */
async function markOthersInactive(activeId: string): Promise<void> {
  try {
    const all = await getAllDailyChallenges();
    for (const c of all) {
      if (c.id !== activeId && c.isActive) {
        c.isActive = false;
        await saveDailyChallengeToSupabase(c);
      }
    }
  } catch (e) {
    console.warn('[DailyChallenge] خطا در تغییر وضعیت سایر چالش‌ها:', e);
  }
}

/**
 * ریست کردن سابقه انجام چالش امروز برای کاربر جاری (جهت تست و آزمایش)
 */
export function resetDailyChallengeProgress(): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    localStorage.removeItem(`daily_challenge_done_${today}`);
    localStorage.removeItem('warroom_daily_challenge_done');
  } catch {}
}
