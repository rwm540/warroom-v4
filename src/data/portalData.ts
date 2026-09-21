import { GamePortal } from '../types';

export const DEFAULT_GAME_PORTALS: GamePortal[] = [
  {
    id: 'warroom',
    title: 'اتاق جنگ',
    subtitle: 'سامانه اصلی رقابت و ارزیابی استراتژیک',
    description: 'حل مأموریت‌های هوشمند، رقابت در جدول برترین‌های کشور، دریافت کریستال‌ها و هدایای ویژه ۵۰ میلیارد ریالی.',
    status: 'active',
    badgeText: 'فعال • در حال برگزاری',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    link: '/journey',
    targetAudience: 'all',
    tag: 'بازی اصلی رویداد',
    featured: true
  },
  {
    id: 'galaxy',
    title: 'عملیات کهکشان',
    subtitle: 'نبرد فضایی و تسخیر سیارات دانش‌آموزی',
    description: 'شبیه‌ساز فرماندهی ناوگان فضایی و مدیریت منابع انرژی در قلمروهای دوردست.',
    status: 'coming_soon',
    badgeText: 'به‌زودی • فصل ۲',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    link: 'https://galaxy.warroom.ir',
    targetAudience: 'all',
    tag: 'به‌زودی',
    featured: false
  },
  {
    id: 'cyber',
    title: 'نبرد سایبری',
    subtitle: 'چالش رمزنگاری و نفوذ هوشمند',
    description: 'مسابقه دفاع سایبری، کشف کدهای نفوذ و تحلیل امنیتی داده‌های استراتژیک.',
    status: 'coming_soon',
    badgeText: 'به‌زودی • فصل ۳',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    link: 'https://cyber.warroom.ir',
    targetAudience: 'all',
    tag: 'به‌زودی',
    featured: false
  }
];

const PORTALS_STORAGE_KEY = 'warroom_game_portals_list';

export function getGamePortals(): GamePortal[] {
  try {
    const saved = localStorage.getItem(PORTALS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading game portals', e);
  }
  return DEFAULT_GAME_PORTALS;
}

export function saveGamePortals(portals: GamePortal[]) {
  try {
    localStorage.setItem(PORTALS_STORAGE_KEY, JSON.stringify(portals));
  } catch (e) {
    console.error('Error saving game portals', e);
  }
}
