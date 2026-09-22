import React from 'react';
import { Send, MessageSquare, ExternalLink, HelpCircle, Map as MapIcon, BookOpen, Sparkles, CheckCircle } from 'lucide-react';

interface SocialMessengersWidgetsProps {
  themeMode: 'girls' | 'boys';
  onOpenStages?: () => void;
  onOpenGuide?: () => void;
  triggerAlert: (msg: string) => void;
}

export default function SocialMessengersWidgets({
  themeMode,
  onOpenStages,
  onOpenGuide,
  triggerAlert
}: SocialMessengersWidgetsProps) {
  const isGirls = themeMode === 'girls';

  const handleOpenMessenger = (name: string, url: string) => {
    triggerAlert(`هدایت به کانال رسمی در پیام‌رسان ${name}...`);
  };

  return (
    <div className="w-full space-y-4">
      
      {/* 1. Messenger Channels Grid (2 Side-by-Side Widgets Matching Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        
        {/* Messenger 1: ایتا (Eitaa) - کانال هیس */}
        <div 
          className={`rounded-3xl p-4 sm:p-5 border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between ${
            isGirls
              ? 'bg-gradient-to-br from-[#1d091b] to-[#0e040f] border-pink-500/40 shadow-[0_0_15px_rgba(255,19,137,0.12)]'
              : 'bg-gradient-to-br from-[#0c162f] via-[#050b1a] to-[#140612] border-blue-900/50 hover:border-blue-500/60 shadow-[0_0_15px_rgba(37,99,235,0.12)]'
          }`}
        >
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              {/* Eitaa Logo Badge */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-950/80 border border-orange-500/50 text-orange-400 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                <span>پیام‌رسان ایتا</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">@hisstory_official</span>
            </div>

            <h4 className="text-sm font-black text-white">
              روایت‌ها و پشت‌صحنه اتاق جنگ
            </h4>
            <p className="text-[11px] text-slate-300">
              روایت‌های اختصاصی کارآگاهان، سرنخ‌های مخفی مراحل و چالش‌های ویژه روزانه.
            </p>
          </div>

          <button
            onClick={() => handleOpenMessenger('ایتا (Eitaa)', 'https://eitaa.com/warroom')}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform duration-150 active:scale-[0.98] cursor-pointer"
          >
            <span>کانال اتاق جنگ در ایتا</span>
            <ExternalLink size={13} />
          </button>
        </div>

        {/* Messenger 2: بله (Bale) - کانال اتاق جنگ */}
        <div 
          className={`rounded-3xl p-4 sm:p-5 border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between ${
            isGirls
              ? 'bg-gradient-to-br from-[#1d091b] to-[#0e040f] border-pink-500/40 shadow-[0_0_15px_rgba(255,19,137,0.12)]'
              : 'bg-gradient-to-br from-[#0c162f] via-[#050b1a] to-[#140612] border-blue-900/50 hover:border-blue-500/60 shadow-[0_0_15px_rgba(37,99,235,0.12)]'
          }`}
        >
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              {/* Bale Logo Badge */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>پیام‌رسان بله</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">@warroom_app</span>
            </div>

            <h4 className="text-sm font-black text-white">
              اخبار و اطلاعیه‌های رسمی اتاق جنگ
            </h4>
            <p className="text-[11px] text-slate-300">
              اطلاعیه‌های فوری ستاد برگزاری، اعلام برندگان هفتگی و زمان‌بندی جوایز.
            </p>
          </div>

          <button
            onClick={() => handleOpenMessenger('بله (Bale)', 'https://ble.ir/warroom')}
            className={`w-full py-2.5 rounded-2xl text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform duration-150 active:scale-[0.98] cursor-pointer ${
              isGirls 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
            }`}
          >
            <span>کانال اتاق جنگ در بله</span>
            <ExternalLink size={13} />
          </button>
        </div>

      </div>

      {/* 2. Quick Navigation Guides (مراحل مسابقه / راهنمای مسابقه) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        
        {/* Card 1: مراحل مسابقه */}
        <div 
          onClick={onOpenStages}
          className={`cursor-pointer rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-between group ${
            isGirls
              ? 'bg-[#150718] border-pink-900/50 hover:border-pink-500/70 shadow-md'
              : 'bg-[#091228] border-blue-900/50 hover:border-blue-500/70 shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition group-hover:scale-105 ${
              isGirls ? 'bg-pink-950/80 text-pink-400 border border-pink-800' : 'bg-blue-950/80 text-blue-400 border border-blue-800'
            }`}>
              <MapIcon size={20} />
            </div>
            <div className="text-right">
              <h5 className={`text-xs sm:text-sm font-black text-white transition ${isGirls ? 'group-hover:text-pink-300' : 'group-hover:text-blue-300'}`}>
                مراحل مسابقه
              </h5>
              <span className="text-[10px] text-slate-400">نقشه ۷ مرحله ماجراجویی</span>
            </div>
          </div>
          <span className="text-xs text-slate-500 group-hover:text-white transition">←</span>
        </div>

        {/* Card 2: راهنمای مسابقه */}
        <div 
          onClick={onOpenGuide}
          className={`cursor-pointer rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-between group ${
            isGirls
              ? 'bg-[#150718] border-pink-900/50 hover:border-pink-500/70 shadow-md'
              : 'bg-[#091228] border-blue-900/50 hover:border-blue-500/70 shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition group-hover:scale-105 ${
              isGirls ? 'bg-purple-950/80 text-purple-400 border border-purple-800' : 'bg-red-950/80 text-red-400 border border-red-800'
            }`}>
              <BookOpen size={20} />
            </div>
            <div className="text-right">
              <h5 className={`text-xs sm:text-sm font-black text-white transition ${isGirls ? 'group-hover:text-purple-300' : 'group-hover:text-red-300'}`}>
                راهنمای مسابقه
              </h5>
              <span className="text-[10px] text-slate-400">قوانین و نحوه امتیازگیری</span>
            </div>
          </div>
          <span className="text-xs text-slate-500 group-hover:text-white transition">←</span>
        </div>

      </div>

    </div>
  );
}
