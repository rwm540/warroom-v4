import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, X, Sparkles } from 'lucide-react';
import { formatToPersianDigits, normalizeToEnglishDigits } from '../utils/jalali';

interface PersianDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  isGirls?: boolean;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

const PERSIAN_MONTHS = [
  { id: 1, name: 'فروردین', days: 31 },
  { id: 2, name: 'اردیبهشت', days: 31 },
  { id: 3, name: 'خرداد', days: 31 },
  { id: 4, name: 'تیر', days: 31 },
  { id: 5, name: 'مرداد', days: 31 },
  { id: 6, name: 'شهریور', days: 31 },
  { id: 7, name: 'مهر', days: 30 },
  { id: 8, name: 'آبان', days: 30 },
  { id: 9, name: 'آذر', days: 30 },
  { id: 10, name: 'دی', days: 30 },
  { id: 11, name: 'بهمن', days: 30 },
  { id: 12, name: 'اسفند', days: 29 }
];

export default function PersianDatePicker({
  value,
  onChange,
  isGirls = false,
  placeholder = 'انتخاب تاریخ تولد',
  required = false,
  id,
  className
}: PersianDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or default to a reasonable student birth year (e.g. 1388)
  const parseDate = (dateString: string) => {
    const clean = normalizeToEnglishDigits(dateString).replace(/-/g, '/');
    const parts = clean.split('/');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { year: y, month: m, day: d };
      }
    }
    return { year: 1388, month: 6, day: 15 };
  };

  const initial = parseDate(value);
  const [selectedYear, setSelectedYear] = useState<number>(initial.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initial.month);
  const [selectedDay, setSelectedDay] = useState<number>(initial.day);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Sync state if external value changes
  useEffect(() => {
    if (value) {
      const parsed = parseDate(value);
      setSelectedYear(parsed.year);
      setSelectedMonth(parsed.month);
      setSelectedDay(parsed.day);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  // List of candidate years from 1405 down to 1340
  const MIN_YEAR = 1340;
  const MAX_YEAR = 1405;
  const yearsList = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);

  // Get days in selected month
  const currentMonthInfo = PERSIAN_MONTHS.find(m => m.id === selectedMonth) || PERSIAN_MONTHS[0];
  const maxDays = currentMonthInfo.days;

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const formatted = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickPreset = (year: number) => {
    setSelectedYear(year);
    const formatted = `${year}/${String(selectedMonth).padStart(2, '0')}/${String(selectedDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  const activeThemeColor = isGirls ? 'pink' : 'cyan';

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      
      {/* Input trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-2 px-3 rounded-xl border text-xs font-mono transition flex items-center justify-between shadow-inner focus:outline-none ${
          className || (isGirls
            ? 'bg-pink-950/40 border-pink-500/50 hover:border-pink-400 text-pink-100 focus:border-pink-400 focus:ring-1 focus:ring-pink-500/40'
            : 'bg-slate-950/70 border-slate-700 hover:border-cyan-400 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40')
        } ${isOpen ? (isGirls ? 'border-pink-400 ring-2 ring-pink-500/30' : 'border-cyan-400 ring-2 ring-cyan-500/30') : ''}`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon 
            size={15} 
            className={isGirls ? 'text-pink-400' : 'text-cyan-400'} 
          />
          <span className={value ? 'text-white font-bold' : 'text-slate-500 font-sans'}>
            {value ? formatToPersianDigits(value) : placeholder}
          </span>
        </div>

        {value ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
            isGirls ? 'bg-pink-900/60 text-pink-300' : 'bg-cyan-900/60 text-cyan-300'
          }`}>
            {currentMonthInfo.name} {formatToPersianDigits(selectedYear)}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500 font-sans">انتخاب تقویم</span>
        )}
      </button>

      {/* Hidden input for form requirements if necessary */}
      {required && (
        <input 
          type="text" 
          required 
          value={value} 
          onChange={() => {}} 
          className="sr-only" 
          tabIndex={-1}
        />
      )}

      {/* Calendar Picker Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
            
            {/* Backdrop click to close */}
            <div 
              className="absolute inset-0" 
              onClick={() => setIsOpen(false)} 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`relative z-10 w-full max-w-[340px] sm:max-w-sm rounded-3xl border p-4 sm:p-5 shadow-2xl font-sans text-right select-none my-auto max-h-[85vh] sm:max-h-[88vh] overflow-y-auto ${
                isGirls
                  ? 'bg-[#1a0820] border-pink-500/50 text-pink-100 shadow-[0_0_50px_rgba(244,63,94,0.35)]'
                  : 'bg-[#081226] border-cyan-500/50 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.35)]'
              }`}
            >
              
              {/* Header: Title & Close Button */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl ${isGirls ? 'bg-pink-950 text-pink-400 border border-pink-500/40' : 'bg-cyan-950 text-cyan-400 border border-cyan-500/40'}`}>
                    <CalendarIcon size={16} />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-white">
                    انتخاب تاریخ تولد
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Month & Year Navigation Bar */}
              <div className="flex items-center justify-between mb-3 bg-black/30 p-1.5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      viewMode === 'months'
                        ? (isGirls ? 'bg-pink-500 text-white shadow-md' : 'bg-cyan-500 text-slate-950 shadow-md')
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <span>{currentMonthInfo.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1 ${
                      viewMode === 'years'
                        ? (isGirls ? 'bg-pink-500 text-white shadow-md' : 'bg-cyan-500 text-slate-950 shadow-md')
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <span>{formatToPersianDigits(selectedYear)}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMonth > 1) {
                        setSelectedMonth(selectedMonth - 1);
                      } else if (selectedYear > MIN_YEAR) {
                        setSelectedMonth(12);
                        setSelectedYear(selectedYear - 1);
                      }
                    }}
                    disabled={selectedMonth === 1 && selectedYear <= MIN_YEAR}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="ماه قبل"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMonth < 12) {
                        setSelectedMonth(selectedMonth + 1);
                      } else if (selectedYear < MAX_YEAR) {
                        setSelectedMonth(1);
                        setSelectedYear(selectedYear + 1);
                      }
                    }}
                    disabled={selectedMonth === 12 && selectedYear >= MAX_YEAR}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="ماه بعد"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>

              {/* VIEW 1: DAYS GRID */}
              {viewMode === 'days' && (
                <div className="space-y-2.5">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 pb-1">
                    <span>ش</span>
                    <span>ی</span>
                    <span>د</span>
                    <span>س</span>
                    <span>چ</span>
                    <span>پ</span>
                    <span className="text-rose-400">ج</span>
                  </div>

                  {/* Days buttons */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => {
                      const isSelected = d === selectedDay;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDay(d)}
                          className={`h-9 sm:h-9 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center ${
                            isSelected
                              ? (isGirls
                                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.8)] scale-105'
                                  : 'bg-gradient-to-r from-cyan-400 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-105')
                              : 'hover:bg-white/10 text-slate-200 bg-white/[0.03]'
                          }`}
                        >
                          {formatToPersianDigits(d)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick birth year presets for students */}
                  <div className="pt-2.5 mt-2 border-t border-white/10 flex items-center justify-between gap-1 overflow-x-auto text-[10px]">
                    <span className="text-slate-400 whitespace-nowrap text-[10px] font-bold">سال‌های متداول:</span>
                    {[1386, 1387, 1388, 1389, 1390, 1391].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setSelectedYear(yr)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono transition ${
                          selectedYear === yr
                            ? (isGirls ? 'bg-pink-500 text-white font-bold' : 'bg-cyan-500 text-slate-950 font-bold')
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        {formatToPersianDigits(yr)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 2: MONTHS SELECTOR */}
              {viewMode === 'months' && (
                <div className="grid grid-cols-3 gap-2 py-2">
                  {PERSIAN_MONTHS.map((m) => {
                    const isSelected = m.id === selectedMonth;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(m.id);
                          setViewMode('days');
                        }}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? (isGirls ? 'bg-pink-500 text-white shadow-md' : 'bg-cyan-500 text-slate-950 shadow-md')
                            : 'bg-white/5 hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* VIEW 3: YEARS SELECTOR */}
              {viewMode === 'years' && (
                <div className="max-h-56 overflow-y-auto grid grid-cols-3 gap-2 py-2 pr-1 custom-scrollbar">
                  {yearsList.map((yr) => {
                    const isSelected = yr === selectedYear;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setSelectedYear(yr);
                          setViewMode('days');
                        }}
                        className={`py-2.5 px-2 rounded-xl text-xs font-mono font-bold transition ${
                          isSelected
                            ? (isGirls ? 'bg-pink-500 text-white shadow-md' : 'bg-cyan-500 text-slate-950 shadow-md')
                            : 'bg-white/5 hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        {formatToPersianDigits(yr)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="text-slate-300 flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-slate-400">تاریخ:</span>
                  <span className={isGirls ? 'text-pink-300 font-bold' : 'text-cyan-300 font-bold'}>
                    {formatToPersianDigits(`${selectedYear}/${String(selectedMonth).padStart(2, '0')}/${String(selectedDay).padStart(2, '0')}`)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition"
                  >
                    انصراف
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDay(selectedDay)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg ${
                      isGirls
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white'
                        : 'bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950'
                    }`}
                  >
                    <Check size={14} />
                    <span>تایید تاریخ</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
