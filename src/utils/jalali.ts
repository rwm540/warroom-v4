/**
 * Jalali (Solar Hijri) Date & Persian Utility Functions
 */

export function formatToPersianDigits(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(val).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

export function normalizeToEnglishDigits(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function validateNationalCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const clean = normalizeToEnglishDigits(code).replace(/\D/g, '');
  if (clean.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(clean)) return false;

  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }
  const rem = sum % 11;
  return (rem < 2 && check === rem) || (rem >= 2 && check === 11 - rem);
}

export function validatePhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const clean = normalizeToEnglishDigits(phone).replace(/\D/g, '');
  return /^0?9\d{9}$/.test(clean);
}

export function validateJalaliDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const clean = normalizeToEnglishDigits(dateStr).trim();
  const parts = clean.split(/[/\\-]/);
  if (parts.length !== 3) return false;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1300 || y > 1450) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (m > 6 && d > 30) return false;
  if (m === 12 && d > 29) {
    const isLeap = [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33);
    if (!isLeap && d > 29) return false;
  }
  return true;
}

export function generatePersonalCode(prefix = 'WR'): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}

export function generateRegistrationCode(prefix = 'REG'): string {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${rand}`;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return { gy, gm, gd };
}

export function getTodayJalali(): { year: number; month: number; day: number; formatted: string } {
  const now = new Date();
  const { jy, jm, jd } = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    year: jy,
    month: jm,
    day: jd,
    formatted: `${jy}/${pad(jm)}/${pad(jd)}`
  };
}

export function formatJalaliDate(dateInput?: string | Date): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}
