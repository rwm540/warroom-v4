// نشان‌های تصویری (بج سپر) مراحل سفر — بهینه‌شده به فرمت مدرن و سبک WebP
const stageBadgeStartBoots = '/images/badges/stage_badge_start_boots.webp';
const stageBadgeKnowledgeBook = '/images/badges/stage_badge_knowledge_book.webp';
const stageBadgeTacticalShield = '/images/badges/stage_badge_tactical_shield.webp';
const stageBadgeFirstAid = '/images/badges/stage_badge_first_aid.webp';
const stageBadgeRifleSquad = '/images/badges/stage_badge_rifle_squad.webp';
const stageBadgeCrescentMoon = '/images/badges/stage_badge_crescent_moon.webp';
const stageBadgeStarVictory = '/images/badges/stage_badge_star_victory.webp';

export const STAGE_BADGES: Record<string, string> = {
  // مرحله ۱ — آغاز مسیر: بستن بوت‌های رزمی پیش از حرکت
  flag: stageBadgeStartBoots,
  // مرحله ۲ — معرفت: کتاب و نور معرفت
  heart: stageBadgeKnowledgeBook,
  // مرحله ۳ — آمادگی: سپر تاکتیکی آینده‌نگر
  shield: stageBadgeTacticalShield,
  // مرحله ۴ — خدمت: جعبه کمک‌های اولیه و امدادرسانی
  service: stageBadgeFirstAid,
  // مرحله ۵ — همراهی: نشان رزم میدانی و هم‌افزایی جوخه‌ای
  users: stageBadgeRifleSquad,
  // مرحله ۶ — زیارت: هلال ماه و میثاق معنوی
  shrine: stageBadgeCrescentMoon,
  // مرحله ۷ — سفیر عشق: ستاره زرین پیروزی
  trophy: stageBadgeStarVictory
};

export function getStageBadge(iconName?: string): string {
  if (iconName && STAGE_BADGES[iconName]) return STAGE_BADGES[iconName];
  return stageBadgeStartBoots;
}
