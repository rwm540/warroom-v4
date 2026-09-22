import React from 'react';
import { ChevronLeft, Info, Sparkles } from 'lucide-react';

interface AboutSectionProps {
  onOpenMore: () => void;
}

export default function AboutSection({ onOpenMore }: AboutSectionProps) {
  return (
    <div 
      onClick={onOpenMore}
      className="my-4 p-4 rounded-2xl bg-[#0a0f24]/90 backdrop-blur-xl border border-amber-500/30 relative overflow-hidden dir-rtl shadow-[0_4px_20px_rgba(0,0,0,0.5)] group hover:border-amber-400/60 transition-all cursor-pointer"
    >
      {/* Background Subtle Tactical Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      <div className="relative z-10 space-y-2.5 text-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Info size={17} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                درباره ما و پروژه اتاق جنگ
              </h2>
              <span className="text-[10px] text-amber-300/80 font-bold block">معرفی اهداف و رسالت سامانه</span>
            </div>
          </div>
          <ChevronLeft size={18} className="text-amber-400 group-hover:translate-x-[-3px] transition-transform" />
        </div>

        <p className="text-xs text-slate-300 leading-relaxed text-justify">
          پلتفرم اتاق جنگ، سامانه جامع شبیه‌سازی تصمیم‌گیری استراتژیک، ارزیابی هوشمند و رقابت‌های گروهی دانش‌آموزی است که با هدف ارتقای آگاهی و تفکر تفکیکی طراحی گردیده است.
        </p>
      </div>
    </div>
  );
}

