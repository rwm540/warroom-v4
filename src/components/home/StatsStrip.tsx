import React from 'react';
import { HomeStats } from '../../data/home';
import { formatToPersianDigits } from '../../utils/jalali';

interface StatsStripProps {
  stats: HomeStats;
}

export default function StatsStrip({ stats }: StatsStripProps) {
  return (
    <div className="mx-4 my-5 dir-rtl">
      <div className="p-3.5 rounded-2xl bg-[#0a0f24]/80 backdrop-blur-xl border border-cyan-500/25 grid grid-cols-3 gap-2 text-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        
        {/* Stat 1 */}
        <div className="space-y-1 py-1">
          <span className="block text-sm md:text-base font-black text-cyan-300 font-mono">
            {formatToPersianDigits(stats.activeMissions)}
          </span>
          <span className="text-[10px] text-slate-300 font-bold block">
            ماموریت‌های فعال
          </span>
        </div>

        {/* Divider & Stat 2 */}
        <div className="space-y-1 py-1 border-x border-cyan-500/20">
          <span className="block text-sm md:text-base font-black text-rose-400 font-mono">
            {formatToPersianDigits(stats.activeParticipants)}
          </span>
          <span className="text-[10px] text-slate-300 font-bold block">
            رزمندگان حاضر
          </span>
        </div>

        {/* Stat 3 */}
        <div className="space-y-1 py-1">
          <span className="block text-sm md:text-base font-black text-amber-400 font-mono">
            {formatToPersianDigits(stats.activeGroups)}
          </span>
          <span className="text-[10px] text-slate-300 font-bold block">
            جوخه‌های فعال
          </span>
        </div>

      </div>
    </div>
  );
}
