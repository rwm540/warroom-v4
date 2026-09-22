import React from 'react';
import { UserCheck, Sparkles, Trophy, ArrowLeft, Users, Shield, Award, Heart, CheckCircle2 } from 'lucide-react';

interface GenderRegistrationBannersProps {
  themeMode: 'girls' | 'boys';
  onOpenRegister: (type: 'individual_female' | 'individual_male') => void;
}

export default function GenderRegistrationBanners({
  themeMode,
  onOpenRegister
}: GenderRegistrationBannersProps) {
  const isGirls = themeMode === 'girls';

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
          <UserCheck size={16} className={isGirls ? 'text-pink-400' : 'text-cyan-400'} />
          <span>درگاه‌های ثبت‌نام تفکیکی دختران و پسران</span>
        </h3>
        <span className="text-[10px] text-slate-400">ثبت‌نام انفرادی یا سرگروه</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        
        {/* Banner 1: Registration for Girls */}
        <div className={`relative rounded-3xl p-4 sm:p-5 transition-all overflow-hidden flex flex-col justify-between border ${
          isGirls 
            ? 'bg-gradient-to-br from-[#240b21] via-[#170818] to-[#0d040e] border-pink-500/60 shadow-[0_0_25px_rgba(244,63,94,0.3)]' 
            : 'bg-[#150a18]/70 border-pink-900/40 hover:border-pink-500/40'
        }`}>
          {/* Top Tag */}
          <div className="flex items-center justify-between mb-3">
            <span className="bg-pink-950/90 text-pink-300 border border-pink-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Heart size={11} className="fill-pink-400 text-pink-400" />
              <span>ویژه دختران ماجراجو</span>
            </span>
            <span className="text-[10px] text-pink-300/80 font-mono">ظرفیت فعال</span>
          </div>

          <div className="space-y-2 mb-4">
            <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>ثبت‌نام دختران</span>
              <span className="text-xs text-pink-400 font-normal">(رده نور)</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              رقابت در مأموریت‌های استراتژیک، کشف راز پرونده‌های تاریخی و دریافت جوایز نفیس دخترانه به همراه کریستال‌های امتیاز.
            </p>
            <div className="flex items-center gap-3 text-[10px] text-pink-200/70 pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-pink-400" />
                <span>داوری اختصاصی</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-pink-400" />
                <span>مدال‌های افتخار</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => onOpenRegister('individual_female')}
            className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:to-rose-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-pink-900/30 flex items-center justify-center gap-2 transition transform active:scale-95"
          >
            <span>ورود و ثبت‌نام دختران</span>
            <ArrowLeft size={15} />
          </button>
        </div>

        {/* Banner 2: Registration for Boys */}
        <div className={`relative rounded-3xl p-4 sm:p-5 transition-all overflow-hidden flex flex-col justify-between border ${
          !isGirls 
            ? 'bg-gradient-to-br from-[#0c1735]/95 via-[#040816]/95 to-[#1c0816]/95 border-blue-500/60 shadow-[0_0_35px_rgba(37,99,235,0.4),0_0_20px_rgba(220,38,38,0.25)]' 
            : 'bg-[#060c1c]/70 border-blue-900/40 hover:border-blue-500/40'
        }`}>
          {/* Subtle Grid + Ambient Glow matching wallpaper */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-60" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-red-600/30 blur-2xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-600/35 blur-2xl rounded-full pointer-events-none" />

          {/* Top Tag */}
          <div className="relative z-10 flex items-center justify-between mb-3">
            <span className="bg-blue-950/90 text-blue-300 border border-blue-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield size={11} className="text-blue-400" />
              <span>ویژه پسران ماجراجو</span>
            </span>
            <span className="text-[10px] text-blue-300/80 font-mono">ظرفیت فعال</span>
          </div>

          <div className="relative z-10 space-y-2 mb-4">
            <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>ثبت‌نام پسران</span>
              <span className="text-xs text-blue-400 font-normal">(رده فاتحان)</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              تشکیل جوخه‌های عملیاتی، حل معماهای رمزآلود، فتح مراحل هفت‌خوان و رقابت بر سر جوایز میلیاردی مسابقات.
            </p>
            <div className="flex items-center gap-3 text-[10px] text-blue-200/70 pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-blue-400" />
                <span>عملیات جوخه‌ای</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-red-400" />
                <span>رده‌بندی استانی</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => onOpenRegister('individual_male')}
            className="relative z-10 w-full py-2.5 sm:py-3 rounded-2xl boys-button-tactical text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition transform active:scale-95"
          >
            <span>ورود و ثبت‌نام پسران</span>
            <ArrowLeft size={15} />
          </button>
        </div>

      </div>
    </div>
  );
}
