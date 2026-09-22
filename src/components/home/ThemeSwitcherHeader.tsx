import React from 'react';
import { Sparkles, UserCheck, Heart, Zap, ArrowLeft, Shield } from 'lucide-react';

interface ThemeSwitcherHeaderProps {
  themeMode: 'girls' | 'boys';
  setThemeMode: (mode: 'girls' | 'boys') => void;
  onOpenRegister: (gender: 'female' | 'male') => void;
}

export default function ThemeSwitcherHeader({
  themeMode,
  setThemeMode,
  onOpenRegister
}: ThemeSwitcherHeaderProps) {
  const isGirls = themeMode === 'girls';

  return (
    <div className="w-full space-y-3">
      {/* Dynamic Theme Banner Widget: 2 Side-by-Side Banners */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        
        {/* 1. Girls Banner Widget (پوسته و بخش دختران) */}
        <div
          onClick={() => setThemeMode('girls')}
          className={`relative cursor-pointer rounded-2xl sm:rounded-3xl p-3 sm:p-5 transition-all duration-300 overflow-hidden flex flex-col justify-between select-none ${
            isGirls
              ? 'bg-gradient-to-br from-[#240532]/95 via-[#0f0117]/95 to-[#020005] border-2 border-fuchsia-500 shadow-[0_0_35px_rgba(255,19,137,0.45)] scale-[1.02]'
              : 'bg-[#0f0216]/70 border border-fuchsia-950/60 hover:border-fuchsia-500/50 opacity-75 hover:opacity-100'
          }`}
        >
          {/* Ambient Dual-Tone Glow matching uploaded artwork */}
          {isGirls && (
            <>
              <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-[#ff1389]/40 blur-xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-[#7c3aed]/40 blur-xl rounded-full pointer-events-none" />
            </>
          )}

          {/* Top Indicator */}
          <div className="flex items-center justify-between z-10">
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isGirls 
                ? 'girls-button-neon text-white shadow-sm' 
                : 'bg-pink-950/60 text-pink-300 border border-pink-800/40'
            }`}>
              <Heart size={12} className="fill-current" />
              <span>بخش دختران</span>
            </span>

            {isGirls && (
              <span className="w-2 h-2 rounded-full bg-[#ff1389] animate-ping" />
            )}
          </div>

          {/* Center Graphic / Text */}
          <div className="my-2.5 z-10 text-right">
            <h3 className="text-sm sm:text-lg font-black text-pink-100 flex items-center gap-1.5">
              <span>ورود دختران</span>
              <Sparkles size={16} className="text-fuchsia-400" />
            </h3>
            <p className="text-[10px] sm:text-xs text-pink-200/80 mt-0.5 line-clamp-1">
              تم اختصاصی، مأموریت‌ها و جوایز ویژه
            </p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-1 border-t border-fuchsia-500/25 z-10">
            <span className="text-[10px] sm:text-xs text-fuchsia-300 font-bold">
              {isGirls ? '✓ پوسته فعال' : 'انتخاب تم دختران'}
            </span>
            <div className={`p-1 sm:p-1.5 rounded-xl ${isGirls ? 'bg-gradient-to-r from-[#ff1389] to-[#7c3aed] text-white shadow-md' : 'bg-pink-950/80 text-pink-400'}`}>
              <ArrowLeft size={13} />
            </div>
          </div>
        </div>

        {/* 2. Boys Banner Widget (پوسته و بخش پسران) */}
        <div
          onClick={() => setThemeMode('boys')}
          className={`relative cursor-pointer rounded-2xl sm:rounded-3xl p-3 sm:p-5 transition-all duration-300 overflow-hidden flex flex-col justify-between select-none ${
            !isGirls
              ? 'bg-gradient-to-br from-[#0c1735]/95 via-[#040816]/95 to-[#1c0816]/95 border-2 border-blue-500 shadow-[0_0_35px_rgba(37,99,235,0.5),0_0_20px_rgba(220,38,38,0.35)] scale-[1.02]'
              : 'bg-[#060c1c]/70 border border-blue-900/40 hover:border-blue-500/50 opacity-75 hover:opacity-100'
          }`}
        >
          {/* Ambient Glows (Electric Cobalt Blue bottom-right + Crimson Red bottom-left with crisp grid) */}
          {!isGirls && (
            <>
              <div className="absolute -bottom-4 -left-4 w-28 h-28 bg-red-600/35 blur-xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-4 -right-4 w-28 h-28 bg-blue-600/40 blur-xl rounded-full pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:22px_22px] opacity-45 pointer-events-none" />
            </>
          )}

          {/* Top Indicator */}
          <div className="flex items-center justify-between z-10">
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              !isGirls 
                ? 'bg-gradient-to-r from-blue-600 to-red-600 text-white shadow-sm' 
                : 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
            }`}>
              <Zap size={12} className="fill-current" />
              <span>بخش پسران</span>
            </span>

            {!isGirls && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            )}
          </div>

          {/* Center Graphic / Text */}
          <div className="my-2.5 z-10 text-right">
            <h3 className="text-sm sm:text-lg font-black text-blue-100 flex items-center gap-1.5">
              <span>ورود پسران</span>
              <Shield size={16} className="text-blue-400" />
            </h3>
            <p className="text-[10px] sm:text-xs text-blue-200/80 mt-0.5 line-clamp-1">
              تم تاکتیکال، جوخه‌بندی و مأموریت‌های استراتژیک
            </p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-1 border-t border-blue-500/25 z-10">
            <span className="text-[10px] sm:text-xs text-blue-300 font-bold">
              {!isGirls ? '✓ پوسته فعال' : 'انتخاب تم پسران'}
            </span>
            <div className={`p-1 sm:p-1.5 rounded-xl ${!isGirls ? 'bg-gradient-to-r from-blue-600 to-red-600 text-white shadow-md' : 'bg-blue-950/80 text-blue-400'}`}>
              <ArrowLeft size={13} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
