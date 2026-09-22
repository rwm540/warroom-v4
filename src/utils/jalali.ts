// Jalali Solar Hijri and Iranian Validation Helpers

export function normalizeToEnglishDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  let normalized = String(str);
  for (let i = 0; i < 10; i++) {
    normalized = normalized
      .replace(new RegExp(persianDigits[i], 'g'), String(i))
      .replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return normalized.trim();
}

export function validateNationalCode(inputCode: string): boolean {
  const code = normalizeToEnglishDigits(inputCode);
  return /^\d{10}$/.test(code);
}

export function validatePhoneNumber(inputPhone: string): boolean {
  const phone = normalizeToEnglishDigits(inputPhone);
  return /^09\d{9}$/.test(phone);
}

export function validateJalaliDate(inputDateStr: string): boolean {
  const dateStr = normalizeToEnglishDigits(inputDateStr);
  // Format: YYYY/MM/DD or YYYY-MM-DD
  const parts = dateStr.replace(/-/g, '/').split('/');
  if (parts.length !== 3) return false;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1300 || year > 1405) return false;
  if (month < 1 || month > 12) return false;
  if (month <= 6 && (day < 1 || day > 31)) return false;
  if (month > 6 && (day < 1 || day > 30)) return false;

  return true;
}

export function generatePersonalCode(): string {
  // Generates 9-digit unique numerical personal code
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

export function generateRegistrationCode(): string {
  // Generates squad code like WRS-8942
  return `WRS-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function getCurrentJalaliDate(): string {
  const today = new Date();
  const year = 1403; // Static approximate current year for demo consistency
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function getJalaliDate(): string {
  return getCurrentJalaliDate();
}

export function formatToPersianDigits(numStr: string | number): string {
  if (numStr === null || numStr === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(numStr).replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

