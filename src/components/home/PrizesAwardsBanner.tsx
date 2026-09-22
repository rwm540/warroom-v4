import React from 'react';
import { motion } from 'motion/react';
import { Gift, Trophy, Sparkles, Gem, ShoppingBag, Smartphone, Gamepad, Camera, Tablet, Award } from 'lucide-react';
import { formatToPersianDigits } from '../../utils/jalali';
import { PrizeItem } from '../../types';

interface PrizesAwardsBannerProps {
  themeMode: 'girls' | 'boys';
  prizes?: PrizeItem[];
  onExplorePrizes?: () => void;
}

export default function PrizesAwardsBanner({
  themeMode,
  prizes = [],
  onExplorePrizes
}: PrizesAwardsBannerProps) {
  const isGirls = themeMode === 'girls';

  // فقط جوایز واقعی ثبت شده توسط ادمین
  const realPrizes = prizes.filter(p => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].includes(p.id));
  const hasPrizes = realPrizes.length > 0;
  const topPrize = realPrizes[0];
  const secondPrize = realPrizes[1];
  const thirdPrize = realPrizes[2];

  const prizeHighlights = hasPrizes 
    ? realPrizes.slice(0, 4).map(p => ({
        title: p.title,
        count: `${formatToPersianDigits(p.requiredPoints)} امتیاز`,
        icon: Gift
      }))
    : [
        { title: 'جوایز دیجیتال و الکترونیک', count: 'تعریف در پنل ادمین', icon: Smartphone },
        { title: 'کنسول بازی و هدایای ویژه', count: 'بر اساس امتیازات', icon: Gamepad },
        { title: 'تبلت‌های دانش‌آموزی و قلم', count: 'برندگان استانی', icon: Tablet },
        { title: 'بسته‌های هدیه و نشان‌ها', count: 'نفرات برتر', icon: Gift },
      ];

  return (
    <div className="w-full space-y-3">
      
      {/* Section Header */}
      <div className="text-center sm:text-right space-y-1">
        <h3 className="text-lg sm:text-xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
          <Trophy size={20} className={isGirls ? 'text-pink-400' : 'text-blue-400'} />
          <span>ویترین جایزه‌ها</span>
        </h3>
        <p className="text-xs text-slate-300 font-medium flex items-center justify-center sm:justify-start gap-1.5">
          <Sparkles size={13} className={isGirls ? 'text-pink-400' : 'text-red-400'} />
          <span>کریستال جمع کن و جوایز ویژه سامانه را بازگشایی کن</span>
        </p>
      </div>

      {/* Main Big Prizes Showcase Card */}
      <div className={`relative rounded-3xl p-5 sm:p-7 overflow-hidden border transition-all ${
        isGirls
          ? 'girls-card-surface border-fuchsia-500/50 shadow-[0_0_25px_rgba(255,19,137,0.2)]'
          : 'boys-card-surface border-blue-500/40 shadow-[0_0_25px_rgba(37,99,235,0.2)]'
      }`}>
        
        {/* Ambient Cosmic Background Lighting */}
        <div className={`absolute -bottom-10 -left-10 w-52 h-52 blur-[40px] rounded-full pointer-events-none ${
          isGirls ? 'bg-[#ff1389]/20' : 'bg-[#dc2626]/15'
        }`} />
        <div className={`absolute -bottom-10 -right-10 w-52 h-52 blur-[40px] rounded-full pointer-events-none ${
          isGirls ? 'bg-[#7c3aed]/20' : 'bg-[#2563eb]/20'
        }`} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column (Visual Showcase: Gadgets & Glowing Crystals) */}
          <div className="lg:col-span-6 flex items-center justify-center relative">
            <div className="relative w-full max-w-sm h-52 sm:h-64 flex items-center justify-center">
              
              {/* Central Glowing Shield / Crystal Art Backdrop */}
              <div className={`absolute w-44 h-44 rounded-full blur-2xl ${
                isGirls ? 'bg-[#ff1389]/30' : 'bg-gradient-to-r from-red-600/30 to-blue-600/35'
              }`} />

              {/* Realistic Gadget Collage Illustration Box */}
              <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                
                {/* 1. Camera / First side prize Card */}
                <div 
                  onClick={onExplorePrizes}
                  className={`w-18 sm:w-22 h-24 sm:h-28 rounded-2xl p-2 shadow-xl flex flex-col items-center justify-center -rotate-12 translate-y-3 border relative overflow-hidden group cursor-pointer transition-transform duration-200 hover:scale-105 hover:-rotate-6 ${
                    isGirls 
                      ? 'bg-gradient-to-b from-[#2d0538] via-[#1a0224] to-[#0d0013] border-fuchsia-500/40 shadow-[0_0_15px_rgba(255,19,137,0.3)]' 
                      : 'bg-gradient-to-b from-[#0f1d3d] via-[#091129] to-[#030614] border-blue-500/40 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                  }`}
                >
                  <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full border border-dashed opacity-20 pointer-events-none" />
                  <div className="relative z-10 p-2 rounded-xl bg-black/60 border border-white/10 mb-1">
                    {secondPrize?.imageUrl ? (
                      <img src={secondPrize.imageUrl} alt="" className="w-5 h-5 object-cover rounded" />
                    ) : (
                      <Gift size={20} className={isGirls ? 'text-pink-300' : 'text-cyan-300'} />
                    )}
                  </div>
                  <span className="relative z-10 text-[9px] font-bold text-slate-200 text-center truncate max-w-full">
                    {secondPrize?.title || 'جایزه ویژه'}
                  </span>
                  <span className="relative z-10 text-[7px] text-amber-300 font-mono">
                    {secondPrize ? `${formatToPersianDigits(secondPrize.requiredPoints)} امتیاز` : 'ویترین'}
                  </span>
                </div>

                {/* 2. Main Centerpiece: Top Prize */}
                <div 
                  onClick={onExplorePrizes}
                  className={`w-32 sm:w-44 h-40 sm:h-48 rounded-3xl p-3 shadow-xl flex flex-col items-center justify-center relative border-2 overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 ${
                    isGirls 
                      ? 'bg-gradient-to-b from-[#3a064f] via-[#20032e] to-[#0b0010] border-fuchsia-400 shadow-[0_0_25px_rgba(255,19,137,0.4)]' 
                      : 'bg-gradient-to-b from-[#14234b] via-[#0b142d] to-[#040816] border-blue-400 shadow-[0_0_25px_rgba(37,99,235,0.4)]'
                  }`}
                >
                  <div className={`absolute top-0 inset-x-0 h-16 bg-gradient-to-b ${
                    isGirls ? 'from-fuchsia-500/30' : 'from-blue-500/30'
                  } to-transparent pointer-events-none`} />

                  <div className="absolute -top-1 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.8)] border border-white/40">
                    <Trophy size={16} />
                  </div>

                  <div className="relative mt-3 p-2 rounded-2xl bg-black/60 border border-white/15 shadow-inner">
                    {topPrize?.imageUrl ? (
                      <img src={topPrize.imageUrl} alt="" className="w-10 h-10 object-cover rounded-xl" />
                    ) : (
                      <Gift size={32} className={isGirls ? 'text-pink-300' : 'text-cyan-300'} />
                    )}
                  </div>

                  <span className="text-[11px] sm:text-xs font-black text-white mt-2 text-center drop-shadow-md truncate max-w-full px-1">
                    {topPrize?.title || 'جوایز ارزنده سامانه'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-amber-300 font-bold font-mono mt-0.5 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40">
                    {topPrize ? `${formatToPersianDigits(topPrize.requiredPoints)} امتیاز` : 'تعریف توسط ادمین'}
                  </span>
                </div>

                {/* 3. Side Prize Card 2 */}
                <div 
                  onClick={onExplorePrizes}
                  className={`w-18 sm:w-22 h-26 sm:h-30 rounded-2xl p-2 shadow-xl flex flex-col items-center justify-center rotate-12 translate-y-1 border relative overflow-hidden group cursor-pointer transition-transform duration-200 hover:scale-105 hover:rotate-6 ${
                    isGirls 
                      ? 'bg-gradient-to-b from-[#2d0538] via-[#1a0224] to-[#0d0013] border-fuchsia-500/40 shadow-[0_0_15px_rgba(255,19,137,0.3)]' 
                      : 'bg-gradient-to-b from-[#0f1d3d] via-[#091129] to-[#030614] border-blue-500/40 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                  }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:6px_6px] pointer-events-none" />
                  <div className="relative z-10 p-2 rounded-xl bg-black/60 border border-white/10 mb-1">
                    {thirdPrize?.imageUrl ? (
                      <img src={thirdPrize.imageUrl} alt="" className="w-5 h-5 object-cover rounded" />
                    ) : (
                      <Award size={20} className="text-amber-300" />
                    )}
                  </div>
                  <span className="relative z-10 text-[9px] font-bold text-slate-200 text-center truncate max-w-full">
                    {thirdPrize?.title || 'هدایای رده‌بندی'}
                  </span>
                  <span className="relative z-10 text-[7px] text-cyan-300 font-mono">
                    {thirdPrize ? `${formatToPersianDigits(thirdPrize.requiredPoints)} امتیاز` : 'برترین‌ها'}
                  </span>
                </div>

              </div>

              {/* Floating Glowing Crystals Badges (Pure CSS - zero JS thread overhead) */}
              <div className="absolute top-2 right-4 transform hover:scale-105 transition-transform duration-300">
                <div className="p-1.5 rounded-xl bg-pink-500/20 border border-pink-400 text-pink-300 shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                  <Gem size={16} />
                </div>
              </div>
              <div className="absolute bottom-3 left-4 transform hover:scale-105 transition-transform duration-300">
                <div className="p-1.5 rounded-xl bg-blue-500/20 border border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.6)]">
                  <Gem size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Text & Value Badges) */}
          <div className="lg:col-span-6 space-y-4 text-right">
            
            {/* Grand Prize Statement 1 */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-sm">
                <Award size={14} className="text-amber-400" />
                <span>جوایز کشوری و استانی</span>
              </div>
              <h4 className="text-base sm:text-xl font-black text-white leading-snug">
                جوایز و هدایای ویژه برای نفرات برتر کشور و استان
              </h4>
            </div>

            {/* Shopping Discount Code Statement 2 */}
            <div className={`p-3.5 rounded-2xl border space-y-1 ${
              isGirls 
                ? 'bg-[#1b0324]/80 border-fuchsia-900/50' 
                : 'bg-[#091126]/80 border-blue-900/50'
            }`}>
              <div className={`flex items-center gap-2 text-xs font-black ${
                isGirls ? 'text-pink-300' : 'text-blue-300'
              }`}>
                <ShoppingBag size={15} className={isGirls ? 'text-pink-400' : 'text-blue-400'} />
                <span>اهدای جوایز اختصاصی بر اساس کریستال‌های کسب‌شده</span>
              </div>
              <p className="text-[11px] text-slate-300">
                تمام جوایز و امتیازات مورد نیاز توسط مدیر سامانه در پنل مدیریت تعیین و به روز می‌شوند.
              </p>
            </div>

            {/* Prize mini tags */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {prizeHighlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div 
                    key={idx} 
                    whileHover={{ scale: 1.02 }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-[10px] border transition-colors ${
                      isGirls 
                        ? 'bg-[#150220]/70 border-fuchsia-900/40 hover:border-pink-500/50' 
                        : 'bg-[#060c1d]/70 border-blue-900/40 hover:border-blue-500/50'
                    }`}
                  >
                    <Icon size={14} className={isGirls ? 'text-pink-400' : 'text-blue-400'} />
                    <div className="text-right">
                      <span className="text-white font-bold block">{item.title}</span>
                      <span className="text-slate-400 font-mono">{item.count}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
