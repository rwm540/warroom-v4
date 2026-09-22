import React from 'react';
import { Gamepad2, Headphones, Crown, Zap, ChevronLeft } from 'lucide-react';

interface QuickActionsGridProps {
  onNavigate: (tab: string) => void;
  onOpenAbout: () => void;
}

export default function QuickActionsGrid({
  onNavigate,
  onOpenAbout
}: QuickActionsGridProps) {
  return (
    <div className="mx-4 my-4 dir-rtl space-y-3">
      {/* Featured Cyber Card: Game & Stage Selection */}
      <div className="w-full">
        
        {/* Card 1: Leaderboard Preview */}
        <div 
          onClick={() => onNavigate('PortalSelector')}
          className="p-3.5 rounded-2xl cyber-card-3d hover:border-cyan-400/50 transition-all cursor-pointer space-y-2.5 text-right group"
        >
          <div className="flex items-center justify-between text-xs font-black text-white">
            <span className="flex items-center gap-1 group-hover:text-cyan-300 transition-colors">
              انتخاب بازی و مراحل
            </span>
            <ChevronLeft size={14} className="text-cyan-400" />
          </div>

          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-2 pt-1">
            {/* Rank 2 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-200 overflow-hidden">
                  آریا
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-700 text-white text-[8px] font-black flex items-center justify-center border border-slate-900">2</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1">27K</span>
            </div>

            {/* Rank 1 (Center) */}
            <div className="flex flex-col items-center">
              <Crown size={14} className="text-amber-400 animate-bounce mb-0.5 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-200 overflow-hidden shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                  کوروش
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-950">1</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 mt-1">29K</span>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-amber-950/40 border border-amber-800 flex items-center justify-center text-[10px] font-bold text-slate-300 overflow-hidden">
                  سارا
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-800 text-white text-[8px] font-black flex items-center justify-center border border-slate-900">3</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1">25K</span>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Access Action Pills */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onNavigate('PortalSelector')}
          className="p-2.5 rounded-xl bg-[#0c1228]/80 hover:bg-[#101938] border border-amber-500/40 text-right flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400">
              <Gamepad2 size={16} />
            </div>
            <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
              ورود به انتخاب بازی
            </span>
          </div>
          <ChevronLeft size={14} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
        </button>

        <button
          onClick={() => onNavigate('Support')}
          className="p-2.5 rounded-xl bg-[#0c1228]/80 hover:bg-[#101938] border border-cyan-500/30 text-right flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Headphones size={16} />
            </div>
            <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
              ارتباط با ما و پشتیبانی
            </span>
          </div>
          <ChevronLeft size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
        </button>
      </div>
    </div>
  );
}
