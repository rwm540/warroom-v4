import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { formatToPersianDigits, normalizeToEnglishDigits, getTodayJalali } from '../utils/jalali';

interface PersianDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  isGirls?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
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

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value = '',
  onChange,
  isGirls = false,
  required = false,
  placeholder = 'انتخاب تاریخ (مثال: ۱۳۸۸/۰۴/۱۵)',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing value or today
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

  useEffect(() => {
    const parsed = parseValue();
    setSelectedYear(parsed.year);
    setSelectedMonth(parsed.month);
    setSelectedDay(parsed.day);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const maxDaysInMonth = selectedMonth <= 6 ? 31 : selectedMonth <= 11 ? 30 : 29;

  const handleApply = (y = selectedYear, m = selectedMonth, d = selectedDay) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${y}/${pad(m)}/${pad(d)}`;
    onChange(formatted);
    setIsOpen(false);
  };

  // Generate Year options (from 1350 to 1410)
  const currentJalaliYear = today.year;
  const years = Array.from({ length: 60 }, (_, i) => currentJalaliYear - 45 + i);

  return (
    <div className="relative w-full dir-rtl" ref={containerRef}>
      {/* Input Display Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
            : isGirls
            ? 'border-pink-500/30 hover:border-pink-400 bg-slate-950/80 text-white'
            : 'border-cyan-500/30 hover:border-cyan-400 bg-slate-950/80 text-white'
        } ${className}`}
      >
        <span className={value ? 'text-white font-mono font-bold' : 'text-slate-500'}>
          {value ? formatToPersianDigits(value) : placeholder}
        </span>
        <CalendarIcon
          size={16}
          className={isGirls ? 'text-pink-400' : 'text-cyan-400'}
        />
      </div>

      {/* Hidden input for HTML form requirement validation if needed */}
      <input
        type="hidden"
        value={value}
        required={required}
      />

      {/* Dropdown Calendar Popup */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 z-50 w-72 sm:w-80 p-3.5 rounded-2xl bg-[#090d20] border border-cyan-500/40 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 right-0 sm:right-auto sm:left-0">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs font-black">
            <span className={isGirls ? 'text-pink-300' : 'text-cyan-300'}>
              انتخاب تاریخ تولد شمسی
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X size={15} />
            </button>
          </div>

          {/* Quick Selectors: Year & Month */}
          <div className="grid grid-cols-2 gap-2 my-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">ماه:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-1.5 outline-none focus:border-cyan-400"
              >
                {PERSIAN_MONTHS.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m} ({formatToPersianDigits(idx + 1)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">سال:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-1.5 outline-none focus:border-cyan-400 font-mono"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {formatToPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Day Grid */}
          <div className="mb-3">
            <label className="text-[10px] text-slate-400 block mb-1.5">روز:</label>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: maxDaysInMonth }, (_, i) => i + 1).map((d) => {
                const isSelected = selectedDay === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDay(d);
                      handleApply(selectedYear, selectedMonth, d);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      isSelected
                        ? isGirls
                          ? 'bg-pink-600 text-white shadow-lg'
                          : 'bg-cyan-500 text-slate-950 font-black shadow-lg'
                        : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {formatToPersianDigits(d)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300"
            >
              پاک کردن
            </button>
            <button
              type="button"
              onClick={() => handleApply()}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow transition ${
                isGirls
                  ? 'bg-pink-600 hover:bg-pink-500 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              <Check size={13} />
              <span>تأیید تاریخ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersianDatePicker;
