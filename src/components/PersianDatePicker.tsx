import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, X, Check, RotateCcw, Sparkles } from 'lucide-react';
import { 
  formatToPersianDigits, 
  normalizeToEnglishDigits, 
  getTodayJalali, 
  jalaliToGregorian 
} from '../utils/jalali';

interface PersianDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  isGirls?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

const WEEK_DAYS = [
  { label: 'ش', name: 'شنبه' },
  { label: 'ی', name: 'یکشنبه' },
  { label: 'د', name: 'دوشنبه' },
  { label: 'س', name: 'سه‌شنبه' },
  { label: 'چ', name: 'چهارشنبه' },
  { label: 'پ', name: 'پنج‌شنبه' },
  { label: 'ج', name: 'جمعه', isWeekend: true }
];

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value = '',
  onChange,
  isGirls = false,
  required = false,
  placeholder = 'انتخاب تاریخ (مثال: ۱۳۸۸/۰۴/۱۵)',
  className = '',
  disabled = false,
  title = 'انتخاب تاریخ تولد شمسی'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing value or fallback to ~15 years ago (ideal for student registration)
  const today = getTodayJalali();
  const parseValue = () => {
    if (!value) return { year: today.year - 15, month: 1, day: 1 };
    const parts = normalizeToEnglishDigits(value).split(/[/\\-]/);
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10) || today.year - 15;
      const m = parseInt(parts[1], 10) || 1;
      const d = parseInt(parts[2], 10) || 1;
      return { year: y, month: Math.min(12, Math.max(1, m)), day: Math.min(31, Math.max(1, d)) };
    }
    return { year: today.year - 15, month: 1, day: 1 };
  };

  const initial = parseValue();
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);

  // Synchronize internal state when value prop changes
  useEffect(() => {
    const parsed = parseValue();
    setSelectedYear(parsed.year);
    setSelectedMonth(parsed.month);
    setSelectedDay(parsed.day);
  }, [value]);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Calculate days in the selected Jalali month
  const getDaysInMonth = (y: number, m: number) => {
    if (m <= 6) return 31;
    if (m <= 11) return 30;
    // Esfand leap year check (Solar Hijri 33-year cycle)
    const isLeap = [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33);
    return isLeap ? 30 : 29;
  };

  const maxDaysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Compute first day of week: 0 = Shanbeh (Saturday), 6 = Jomeh (Friday)
  const getFirstDayOfWeek = (y: number, m: number): number => {
    try {
      const { gy, gm, gd } = jalaliToGregorian(y, m, 1);
      const gregorianDay = new Date(gy, gm - 1, gd).getDay(); // 0 is Sun, 6 is Sat
      return (gregorianDay + 1) % 7;
    } catch {
      return 0;
    }
  };

  const leadingEmptyDays = getFirstDayOfWeek(selectedYear, selectedMonth);

  const handleApply = (y = selectedYear, m = selectedMonth, d = selectedDay) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const safeDay = Math.min(d, getDaysInMonth(y, m));
    const formatted = `${y}/${pad(m)}/${pad(safeDay)}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(prev => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(prev => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleSelectToday = () => {
    setSelectedYear(today.year);
    setSelectedMonth(today.month);
    setSelectedDay(today.day);
  };

  // Generate Year options (from 1340 to 1405)
  const years = Array.from({ length: 66 }, (_, i) => 1340 + i).reverse();

  // Selected date human preview text (e.g. ۲۰ شهریور ۱۳۸۸)
  const safeCurrentDay = Math.min(selectedDay, maxDaysInMonth);
  const selectedDatePreview = `${formatToPersianDigits(safeCurrentDay)} ${PERSIAN_MONTHS[selectedMonth - 1]} ${formatToPersianDigits(selectedYear)}`;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const selectedNumericDate = `${selectedYear}/${pad(selectedMonth)}/${pad(safeCurrentDay)}`;

  return (
    <div className="relative w-full dir-rtl" ref={containerRef}>
      {/* Input Display Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs cursor-pointer transition select-none outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            : isGirls
            ? 'border-pink-500/30 hover:border-pink-400 focus:border-pink-400 bg-slate-950/80 text-white shadow-sm'
            : 'border-cyan-500/30 hover:border-cyan-400 focus:border-cyan-400 bg-slate-950/80 text-white shadow-sm'
        } ${className}`}
      >
        <span className={value ? 'text-white font-mono font-bold tracking-wider' : 'text-slate-500'}>
          {value ? formatToPersianDigits(value) : placeholder}
        </span>
        <CalendarIcon
          size={16}
          className={`shrink-0 ${isGirls ? 'text-pink-400' : 'text-cyan-400'}`}
        />
      </button>

      {/* Hidden input for HTML form requirement validation */}
      <input
        type="hidden"
        value={value}
        required={required}
      />

      {/* 🧭 Centered Responsive Modal Dialog (Mobile/Android & Web) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 dir-rtl"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
        >
          {/* Calendar Card Container: Always 100% Centered */}
          <div 
            className={`relative w-full max-w-[340px] sm:max-w-[370px] p-4 sm:p-5 rounded-3xl bg-[#080d1e] border ${
              isGirls 
                ? 'border-pink-500/40 shadow-[0_0_50px_rgba(236,72,153,0.3)]' 
                : 'border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.3)]'
            } text-slate-100 flex flex-col space-y-3.5 select-none animate-in zoom-in-95 duration-150 m-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title + Close Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                  isGirls ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}>
                  <CalendarIcon size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">{title}</h3>
                  <span className="text-[10px] text-slate-400 block">تقویم هجری شمسی</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="بستن تقویم"
              >
                <X size={16} />
              </button>
            </div>

            {/* Selected Date Live Display Banner */}
            <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${
              isGirls 
                ? 'bg-pink-950/30 border-pink-500/30 text-pink-200' 
                : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
            }`}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className={isGirls ? 'text-pink-400' : 'text-cyan-400'} />
                <span className="text-xs font-bold">{selectedDatePreview}</span>
              </div>
              <span className="font-mono text-xs font-black tracking-wider text-slate-300">
                {formatToPersianDigits(selectedNumericDate)}
              </span>
            </div>

            {/* Navigation & Month/Year Selectors */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
              {/* Previous Month (Right Arrow in RTL) */}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
                title="ماه قبل"
              >
                <ChevronRight size={18} />
              </button>

              {/* Month Dropdown */}
              <div className="flex-1">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className={`w-full bg-slate-950 border border-slate-700/80 text-white text-xs font-bold rounded-xl py-1.5 px-2 outline-none text-center cursor-pointer transition ${
                    isGirls ? 'focus:border-pink-400' : 'focus:border-cyan-400'
                  }`}
                >
                  {PERSIAN_MONTHS.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div className="flex-1">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className={`w-full bg-slate-950 border border-slate-700/80 text-white text-xs font-mono font-bold rounded-xl py-1.5 px-2 outline-none text-center cursor-pointer transition ${
                    isGirls ? 'focus:border-pink-400' : 'focus:border-cyan-400'
                  }`}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {formatToPersianDigits(y)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Next Month (Left Arrow in RTL) */}
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
                title="ماه بعد"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEK_DAYS.map((day, idx) => (
                <div
                  key={idx}
                  title={day.name}
                  className={`text-[11px] font-bold py-1 ${
                    day.isWeekend ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {day.label}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Empty leading cells */}
              {Array.from({ length: leadingEmptyDays }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-8 w-full" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: maxDaysInMonth }, (_, i) => i + 1).map((d) => {
                const isSelected = selectedDay === d;
                const isToday =
                  today.year === selectedYear &&
                  today.month === selectedMonth &&
                  today.day === d;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDay(d);
                    }}
                    onDoubleClick={() => {
                      setSelectedDay(d);
                      handleApply(selectedYear, selectedMonth, d);
                    }}
                    className={`h-8 sm:h-9 w-full rounded-xl text-xs font-mono font-bold transition flex items-center justify-center relative cursor-pointer ${
                      isSelected
                        ? isGirls
                          ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.7)] font-black scale-105'
                          : 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.7)] font-black scale-105'
                        : 'bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <span>{formatToPersianDigits(d)}</span>

                    {/* Today marker dot */}
                    {isToday && !isSelected && (
                      <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                        isGirls ? 'bg-pink-400' : 'bg-cyan-400'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Bar Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-slate-800/60 cursor-pointer"
                  title="انتخاب تاریخ امروز"
                >
                  <RotateCcw size={12} />
                  <span>امروز</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition px-2 py-1 rounded-lg hover:bg-rose-950/30 cursor-pointer"
                >
                  پاک کردن
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleApply()}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition cursor-pointer ${
                  isGirls
                    ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/30 hover:scale-[1.02]'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30 hover:scale-[1.02]'
                }`}
              >
                <Check size={14} />
                <span>تأیید تاریخ</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PersianDatePicker;
